/**
 * DrumSchool Manager Integration Settings
 *
 * UI for connecting drumschoolstefanvandebrug.nl/manager
 * to a Musicdott school account and syncing students + agenda.
 */

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  Plug,
  PlugZap,
  Users,
  Calendar,
  Info,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SyncStatus = "success" | "error" | "partial" | null;

type IntegrationSettings = {
  baseUrl: string;
  apiKey?: string;
  icalUrl?: string;
  autoSync: boolean;
  syncIntervalHours: number;
  syncStudents: boolean;
  syncSchedule: boolean;
  lastSyncAt?: string;
  lastSyncStatus?: SyncStatus;
  lastSyncMessage?: string;
};

type PreviewData = {
  studentsToAdd: { id: string; name: string; email?: string }[];
  studentsToUpdate: { id: string; name: string; email?: string }[];
  schedulesToAdd: { dayOfWeek: string; startTime: string; endTime: string }[];
  warnings: string[];
};

type SyncResult = {
  success: boolean;
  studentsAdded: number;
  studentsUpdated: number;
  schedulesAdded: number;
  schedulesUpdated: number;
  errors: string[];
  warnings: string[];
};

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const settingsSchema = z.object({
  baseUrl: z
    .string()
    .url("Voer een geldige URL in")
    .default("https://drumschoolstefanvandebrug.nl/manager"),
  apiKey: z.string().optional(),
  icalUrl: z
    .string()
    .url("Voer een geldige iCal URL in")
    .optional()
    .or(z.literal("")),
  autoSync: z.boolean().default(false),
  syncIntervalHours: z.coerce.number().int().min(1).max(168).default(24),
  syncStudents: z.boolean().default(true),
  syncSchedule: z.boolean().default(true),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function SyncStatusBadge({ status }: { status: SyncStatus }) {
  if (!status) return null;
  const map = {
    success: { label: "Geslaagd", variant: "default" as const, icon: CheckCircle },
    partial: { label: "Gedeeltelijk", variant: "outline" as const, icon: AlertCircle },
    error: { label: "Fout", variant: "destructive" as const, icon: XCircle },
  };
  const { label, variant, icon: Icon } = map[status];
  return (
    <Badge variant={variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function DrumSchoolIntegration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    error?: string;
    mode?: string;
  } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // ---- Fetch current settings ----
  const { data: settingsData, isLoading } = useQuery<{
    configured: boolean;
    settings?: IntegrationSettings;
  }>({
    queryKey: ["/api/drumschool-integration/settings"],
    queryFn: () =>
      apiRequest("GET", "/api/drumschool-integration/settings").then((r) =>
        r.json()
      ),
  });

  // ---- Fetch preview (lazy) ----
  const { data: preview, isFetching: previewLoading } = useQuery<PreviewData>({
    queryKey: ["/api/drumschool-integration/preview"],
    queryFn: () =>
      apiRequest("GET", "/api/drumschool-integration/preview").then((r) =>
        r.json()
      ),
    enabled: previewOpen && settingsData?.configured === true,
  });

  // ---- Form ----
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      baseUrl: settingsData?.settings?.baseUrl ?? "https://drumschoolstefanvandebrug.nl/manager",
      apiKey: settingsData?.settings?.apiKey ?? "",
      icalUrl: settingsData?.settings?.icalUrl ?? "",
      autoSync: settingsData?.settings?.autoSync ?? false,
      syncIntervalHours: settingsData?.settings?.syncIntervalHours ?? 24,
      syncStudents: settingsData?.settings?.syncStudents ?? true,
      syncSchedule: settingsData?.settings?.syncSchedule ?? true,
    },
    values: settingsData?.settings
      ? {
          baseUrl: settingsData.settings.baseUrl,
          apiKey: settingsData.settings.apiKey ?? "",
          icalUrl: settingsData.settings.icalUrl ?? "",
          autoSync: settingsData.settings.autoSync,
          syncIntervalHours: settingsData.settings.syncIntervalHours,
          syncStudents: settingsData.settings.syncStudents,
          syncSchedule: settingsData.settings.syncSchedule,
        }
      : undefined,
  });

  // ---- Save settings mutation ----
  const saveMutation = useMutation({
    mutationFn: (data: SettingsFormValues) =>
      apiRequest("POST", "/api/drumschool-integration/settings", data).then(
        (r) => r.json()
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/drumschool-integration/settings"],
      });
      toast({
        title: "Instellingen opgeslagen",
        description: "De integratie-instellingen zijn bijgewerkt.",
      });
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Opslaan mislukt",
        description: err.message ?? "Probeer het opnieuw.",
      });
    },
  });

  // ---- Test connection mutation ----
  const testMutation = useMutation({
    mutationFn: (data: SettingsFormValues) =>
      apiRequest("POST", "/api/drumschool-integration/test", data).then((r) =>
        r.json()
      ),
    onSuccess: (result) => {
      setTestResult(result);
    },
    onError: (err: any) => {
      setTestResult({ ok: false, error: err.message });
    },
  });

  // ---- Sync now mutation ----
  const syncMutation = useMutation<SyncResult>({
    mutationFn: () =>
      apiRequest("POST", "/api/drumschool-integration/sync").then((r) =>
        r.json()
      ),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/drumschool-integration/settings"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/recurring-schedules"],
      });
      const added =
        result.studentsAdded +
        result.studentsUpdated +
        result.schedulesAdded +
        result.schedulesUpdated;
      toast({
        title: result.success ? "Synchronisatie geslaagd" : "Synchronisatie gedeeltelijk geslaagd",
        description: `${result.studentsAdded} leerlingen toegevoegd, ${result.studentsUpdated} bijgewerkt, ${result.schedulesAdded} lesroosteritems toegevoegd.`,
        variant: result.success ? "default" : "destructive",
      });
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Synchronisatie mislukt",
        description: err.message ?? "Probeer het opnieuw.",
      });
    },
  });

  // ---- Disconnect mutation ----
  const disconnectMutation = useMutation({
    mutationFn: () =>
      apiRequest("DELETE", "/api/drumschool-integration/settings").then((r) =>
        r.json()
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/drumschool-integration/settings"],
      });
      form.reset();
      setTestResult(null);
      toast({ title: "Integratie verwijderd" });
    },
  });

  const onSubmit = (data: SettingsFormValues) => saveMutation.mutate(data);
  const onTest = () => testMutation.mutate(form.getValues());

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          Instellingen laden…
        </CardContent>
      </Card>
    );
  }

  const configured = settingsData?.configured;
  const lastSync = settingsData?.settings;

  return (
    <div className="space-y-6">
      {/* Header card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {configured ? (
                <PlugZap className="h-6 w-6 text-green-500" />
              ) : (
                <Plug className="h-6 w-6 text-muted-foreground" />
              )}
              <div>
                <CardTitle>DrumSchool Manager</CardTitle>
                <CardDescription>
                  Synchroniseer leerlingen en lesrooster van{" "}
                  <span className="font-medium">drumschoolstefanvandebrug.nl/manager</span>{" "}
                  naar je Musicdott profiel.
                </CardDescription>
              </div>
            </div>
            {configured && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-green-600 border-green-400">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Verbonden
                </Badge>
                {lastSync?.lastSyncStatus && (
                  <SyncStatusBadge status={lastSync.lastSyncStatus} />
                )}
              </div>
            )}
          </div>
        </CardHeader>

        {configured && lastSync?.lastSyncAt && (
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">
              Laatste sync:{" "}
              {new Date(lastSync.lastSyncAt).toLocaleString("nl-NL")}
              {lastSync.lastSyncMessage && (
                <span className="ml-2 text-xs">— {lastSync.lastSyncMessage}</span>
              )}
            </p>
          </CardContent>
        )}
      </Card>

      {/* Info alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Hoe werkt de integratie?</AlertTitle>
        <AlertDescription className="space-y-1 text-sm">
          <p>
            Musicdott kan gegevens ophalen via twee methodes:
          </p>
          <ul className="list-disc ml-4 space-y-1">
            <li>
              <strong>API-sleutel</strong> – Als de DrumSchool Manager een REST API
              aanbiedt, vul dan de API-sleutel in om leerlingen én het rooster te
              synchroniseren.
            </li>
            <li>
              <strong>iCal feed URL</strong> – Als de manager een kalenderlink
              (*.ics) aanbiedt, kun je alleen het agenda-gedeelte synchroniseren
              zonder API-sleutel.
            </li>
          </ul>
          <p>Je kunt ook beide methodes tegelijk gebruiken.</p>
        </AlertDescription>
      </Alert>

      {/* Settings form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Verbindingsinstellingen</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Base URL */}
              <FormField
                control={form.control}
                name="baseUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manager URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://drumschoolstefanvandebrug.nl/manager"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Het adres van de DrumSchool Manager omgeving.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* API Key */}
              <FormField
                control={form.control}
                name="apiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API-sleutel (optioneel)</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Voer de API-sleutel in…"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Vereist voor het synchroniseren van leerlingendata. Te vinden in
                      de instellingen van de DrumSchool Manager.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* iCal URL */}
              <FormField
                control={form.control}
                name="icalUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>iCal-feed URL (optioneel)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://drumschoolstefanvandebrug.nl/manager/calendar.ics"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Kalenderlink (.ics) uit de DrumSchool Manager voor het
                      importeren van het lesrooster.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Sync options */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="syncStudents"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <FormLabel className="flex items-center gap-1">
                          <Users className="h-4 w-4" /> Leerlingen
                        </FormLabel>
                        <FormDescription className="text-xs">
                          Leerlingen synchroniseren
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="syncSchedule"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <FormLabel className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" /> Rooster
                        </FormLabel>
                        <FormDescription className="text-xs">
                          Agenda synchroniseren
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Auto sync */}
              <FormField
                control={form.control}
                name="autoSync"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>Automatisch synchroniseren</FormLabel>
                      <FormDescription className="text-xs">
                        Gegevens periodiek ophalen op de achtergrond
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {form.watch("autoSync") && (
                <FormField
                  control={form.control}
                  name="syncIntervalHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Synchronisatie-interval (uren)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={168}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Hoe vaak (in uren) de gegevens automatisch worden
                        opgehaald (1–168).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Test connection result */}
              {testResult && (
                <Alert variant={testResult.ok ? "default" : "destructive"}>
                  {testResult.ok ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>
                    {testResult.ok ? "Verbinding geslaagd" : "Verbinding mislukt"}
                  </AlertTitle>
                  {testResult.ok ? (
                    <AlertDescription>
                      Modus:{" "}
                      {testResult.mode === "api"
                        ? "REST API"
                        : testResult.mode === "ical"
                        ? "iCal feed"
                        : "Onbekend"}
                    </AlertDescription>
                  ) : (
                    <AlertDescription>{testResult.error}</AlertDescription>
                  )}
                </Alert>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onTest}
                  disabled={testMutation.isPending}
                >
                  {testMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <PlugZap className="h-4 w-4 mr-2" />
                  )}
                  Verbinding testen
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Instellingen opslaan
                </Button>
                {configured && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => disconnectMutation.mutate()}
                    disabled={disconnectMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Verbinding verwijderen
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Sync panel – only shown when configured */}
      {configured && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Nu synchroniseren</CardTitle>
                <CardDescription>
                  Haal direct de laatste gegevens op uit de DrumSchool Manager.
                </CardDescription>
              </div>
              <Button
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
              >
                {syncMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {syncMutation.isPending ? "Bezig…" : "Nu synchroniseren"}
              </Button>
            </div>
          </CardHeader>

          {syncMutation.data && (
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {[
                  {
                    label: "Leerlingen toegevoegd",
                    value: syncMutation.data.studentsAdded,
                  },
                  {
                    label: "Leerlingen bijgewerkt",
                    value: syncMutation.data.studentsUpdated,
                  },
                  {
                    label: "Roosteritems toegevoegd",
                    value: syncMutation.data.schedulesAdded,
                  },
                  {
                    label: "Roosteritems bijgewerkt",
                    value: syncMutation.data.schedulesUpdated,
                  },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="rounded-lg border p-3 text-center"
                  >
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>

              {syncMutation.data.errors.length > 0 && (
                <Alert variant="destructive" className="mb-3">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Fouten tijdens synchronisatie</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc ml-4 text-sm space-y-1 mt-1">
                      {syncMutation.data.errors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {syncMutation.data.warnings.length > 0 && (
                <Alert className="mb-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Waarschuwingen</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc ml-4 text-sm space-y-1 mt-1">
                      {syncMutation.data.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Preview panel */}
      {configured && (
        <Collapsible open={previewOpen} onOpenChange={setPreviewOpen}>
          <Card>
            <CardHeader>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer select-none">
                  <div>
                    <CardTitle className="text-base">
                      Voorbeeld (droog draaien)
                    </CardTitle>
                    <CardDescription>
                      Bekijk wat er zou worden gesynchroniseerd zonder wijzigingen door te
                      voeren.
                    </CardDescription>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${previewOpen ? "rotate-180" : ""}`}
                  />
                </div>
              </CollapsibleTrigger>
            </CardHeader>

            <CollapsibleContent>
              <CardContent>
                {previewLoading ? (
                  <p className="text-muted-foreground text-sm">Laden…</p>
                ) : preview ? (
                  <div className="space-y-4">
                    {preview.studentsToAdd.length > 0 && (
                      <div>
                        <p className="font-medium text-sm mb-2">
                          Toe te voegen leerlingen ({preview.studentsToAdd.length})
                        </p>
                        <ul className="text-sm space-y-1">
                          {preview.studentsToAdd.map((s) => (
                            <li key={s.id} className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              {s.name}
                              {s.email && (
                                <span className="text-muted-foreground">
                                  — {s.email}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {preview.studentsToUpdate.length > 0 && (
                      <div>
                        <p className="font-medium text-sm mb-2">
                          Bij te werken leerlingen ({preview.studentsToUpdate.length})
                        </p>
                        <ul className="text-sm space-y-1">
                          {preview.studentsToUpdate.map((s) => (
                            <li key={s.id} className="flex items-center gap-2">
                              <RefreshCw className="h-3 w-3 text-blue-500" />
                              {s.name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {preview.schedulesToAdd.length > 0 && (
                      <div>
                        <p className="font-medium text-sm mb-2">
                          Agenda-items ({preview.schedulesToAdd.length})
                        </p>
                        <ul className="text-sm space-y-1">
                          {preview.schedulesToAdd.map((s, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <Calendar className="h-3 w-3 text-purple-500" />
                              {s.dayOfWeek} {s.startTime}–{s.endTime}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {preview.warnings.length > 0 && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Opmerkingen</AlertTitle>
                        <AlertDescription>
                          <ul className="list-disc ml-4 text-sm space-y-1 mt-1">
                            {preview.warnings.map((w, i) => (
                              <li key={i}>{w}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    {preview.studentsToAdd.length === 0 &&
                      preview.studentsToUpdate.length === 0 &&
                      preview.schedulesToAdd.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          Er zijn geen wijzigingen om door te voeren — alles is al
                          up-to-date.
                        </p>
                      )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Klik om de preview te laden.
                  </p>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
}
