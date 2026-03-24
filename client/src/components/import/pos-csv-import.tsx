/**
 * POS CSV Import Component
 *
 * Upload and import POS_Notatie.csv and POS_Songs.csv files
 * Features:
 * - File upload with drag & drop
 * - Preview before import
 * - Progress tracking
 * - Import history
 */

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import NotationGridViewer from "@/components/notation/notation-grid-viewer";
import EmbedPlayer from "@/components/notation/embed-player";
import { GrooveEmbedSimple } from "@/components/groovescribe/groove-embed";
import {
  Upload,
  FileSpreadsheet,
  Music,
  Drum,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  History,
  RefreshCw,
  Download,
  Loader2,
  ExternalLink,
} from "lucide-react";

interface PreviewData {
  totalRows: number;
  previewRows: Record<string, any>[];
  detectedDelimiter: string;
  columns: string[];
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
}

interface ImportResult {
  success: boolean;
  batchId: string;
  imported: number;
  skipped: number;
  errors: number;
  errorDetails: Array<{ row: number; error: string }>;
  warnings: string[];
  drumblocks?: number;
}

interface ImportLog {
  id: number;
  batchId: string;
  fileType: string;
  fileName: string;
  totalRows: number | null;
  imported: number | null;
  skipped: number | null;
  errors: number | null;
  status: string;
  startedAt: string;
  completedAt: string | null;
}

type FileType = "notations" | "songs";

interface PosNotationListItem {
  id: number;
  title: string;
  category?: string | null;
  parserStatus?: string | null;
  posHoofdstuk?: string | null;
  displaySummary?: {
    hasNotationModule?: boolean;
    mediaCount?: number;
    attachmentCount?: number;
  };
}

interface PosSongListItem {
  id: number;
  posTitel?: string | null;
  posArtiest?: string | null;
  posGenre?: string | null;
  posBpm?: number | null;
  displaySummary?: {
    notationCount?: number;
    mediaCount?: number;
    attachmentCount?: number;
    hasLyrics?: boolean;
  };
}

interface PosModule {
  type?: string;
  provider?: string;
  status?: string;
  embed?: {
    embed_url?: string | null;
    raw?: string | null;
  };
  fallback?: {
    label?: string;
    url?: string;
  };
  meta?: Record<string, any>;
}

interface SyncToPlatformResult {
  success: boolean;
  target: "songs" | "lessons";
  schoolId: number;
  dryRun?: boolean;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors?: Array<Record<string, any>>;
  preview?: Array<Record<string, any>>;
  previewTruncated?: boolean;
}

interface StudentCsvImportResult {
  success: boolean;
  dryRun?: boolean;
  fileName?: string;
  encodingDetected?: string;
  processed: number;
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  accountStats?: {
    successful: number;
    failed: number;
    defaultPassword: string;
    mustChangePassword: boolean;
    usernameRule: string;
  };
  preview?: Array<Record<string, any>>;
  previewTruncated?: boolean;
  accountSamples?: Array<{
    studentId: number;
    email: string;
    username: string;
  }>;
  errors?: Array<{
    row: number;
    error: string;
    email?: string | null;
  }>;
}

export default function POSCSVImport() {
  const [activeTab, setActiveTab] = useState<FileType>("notations");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [libraryTab, setLibraryTab] = useState<FileType>("notations");
  const [selectedNotationId, setSelectedNotationId] = useState<number | null>(null);
  const [selectedSongId, setSelectedSongId] = useState<number | null>(null);
  const [showNotationDetailDialog, setShowNotationDetailDialog] = useState(false);
  const [showSongDetailDialog, setShowSongDetailDialog] = useState(false);
  const [lastSongSyncResult, setLastSongSyncResult] = useState<SyncToPlatformResult | null>(null);
  const [lastLessonSyncResult, setLastLessonSyncResult] = useState<SyncToPlatformResult | null>(null);
  const [lastSongSyncPreview, setLastSongSyncPreview] = useState<SyncToPlatformResult | null>(null);
  const [lastLessonSyncPreview, setLastLessonSyncPreview] = useState<SyncToPlatformResult | null>(null);
  const [selectedStudentFile, setSelectedStudentFile] = useState<File | null>(null);
  const [studentImportResult, setStudentImportResult] = useState<StudentCsvImportResult | null>(null);
  const [studentImportPreview, setStudentImportPreview] = useState<StudentCsvImportResult | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch import history
  const { data: importHistory, isLoading: historyLoading } = useQuery<ImportLog[]>({
    queryKey: ["pos-import-history"],
    queryFn: async () => {
      const response = await fetch("/api/pos-import/history", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch import history");
      return response.json();
    },
  });

  const { data: notationItems, isLoading: notationItemsLoading } = useQuery<PosNotationListItem[]>({
    queryKey: ["notations"],
    queryFn: async () => {
      const response = await fetch("/api/pos-import/notations", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch POS notations");
      return response.json();
    },
  });

  const { data: posSongItems, isLoading: posSongItemsLoading } = useQuery<PosSongListItem[]>({
    queryKey: ["pos-songs"],
    queryFn: async () => {
      const response = await fetch("/api/pos-import/pos-songs", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch POS songs");
      return response.json();
    },
  });

  const { data: notationDetail, isLoading: notationDetailLoading } = useQuery<any>({
    queryKey: ["pos-notation-detail", selectedNotationId],
    enabled: !!selectedNotationId && showNotationDetailDialog,
    queryFn: async () => {
      const response = await fetch(`/api/pos-import/notations/${selectedNotationId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch notation details");
      return response.json();
    },
  });

  const { data: notationBlocks, isLoading: notationBlocksLoading } = useQuery<any[]>({
    queryKey: ["pos-notation-blocks", selectedNotationId],
    enabled: !!selectedNotationId && showNotationDetailDialog,
    queryFn: async () => {
      const response = await fetch(`/api/pos-import/notations/${selectedNotationId}/blocks`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch notation drumblocks");
      return response.json();
    },
  });

  const { data: songDetail, isLoading: songDetailLoading } = useQuery<any>({
    queryKey: ["pos-song-detail", selectedSongId],
    enabled: !!selectedSongId && showSongDetailDialog,
    queryFn: async () => {
      const response = await fetch(`/api/pos-import/pos-songs/${selectedSongId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch song details");
      return response.json();
    },
  });

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: async ({ file, fileType }: { file: File; fileType: FileType }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileType", fileType);

      const response = await fetch("/api/pos-import/preview", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Preview failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setPreviewData(data);
      setShowPreviewDialog(true);
    },
    onError: (error) => {
      toast({
        title: "Preview Failed",
        description: error instanceof Error ? error.message : "Failed to preview file",
        variant: "destructive",
      });
    },
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async ({ file, fileType }: { file: File; fileType: FileType }) => {
      const formData = new FormData();
      formData.append("file", file);

      const endpoint = fileType === "notations" ? "/api/pos-import/notations" : "/api/pos-import/songs";

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Import failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setImportResult(data);
      setShowPreviewDialog(false);
      setShowResultDialog(true);
      setSelectedFile(null);
      setPreviewData(null);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["pos-import-history"] });
      queryClient.invalidateQueries({ queryKey: ["notations"] });
      queryClient.invalidateQueries({ queryKey: ["pos-songs"] });
      queryClient.invalidateQueries({ queryKey: ["drumblocks"] });

      toast({
        title: "Import Complete",
        description: `Successfully imported ${data.imported} records`,
      });
    },
    onError: (error) => {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Import failed",
        variant: "destructive",
      });
    },
  });

  const syncSongsToPlatformMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/pos-import/sync/songs-to-platform", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json().catch(async () => ({ message: await response.text() }));
        throw new Error(error.message || "Sync failed");
      }
      return response.json() as Promise<SyncToPlatformResult>;
    },
    onSuccess: (result) => {
      setLastSongSyncResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/songs"] });
      queryClient.invalidateQueries({ queryKey: ["pos-songs"] });
      toast({
        title: "POS Songs synced",
        description: `Songs: ${result.created} created, ${result.updated} updated, ${result.failed} failed (school ${result.schoolId})`,
      });
    },
    onError: (error) => {
      toast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Failed to sync POS songs to Songs",
        variant: "destructive",
      });
    },
  });

  const previewSongsToPlatformMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/pos-import/sync/songs-to-platform?dryRun=1", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json().catch(async () => ({ message: await response.text() }));
        throw new Error(error.message || "Preview sync failed");
      }
      return response.json() as Promise<SyncToPlatformResult>;
    },
    onSuccess: (result) => {
      setLastSongSyncPreview(result);
      toast({
        title: "Songs sync preview ready",
        description: `${result.created} to create, ${result.updated} to update, ${result.skipped} unchanged (school ${result.schoolId})`,
      });
    },
    onError: (error) => {
      toast({
        title: "Preview failed",
        description: error instanceof Error ? error.message : "Failed to preview POS songs sync",
        variant: "destructive",
      });
    },
  });

  const syncNotationsToLessonsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/pos-import/sync/notations-to-lessons", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json().catch(async () => ({ message: await response.text() }));
        throw new Error(error.message || "Sync failed");
      }
      return response.json() as Promise<SyncToPlatformResult>;
    },
    onSuccess: (result) => {
      setLastLessonSyncResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
      queryClient.invalidateQueries({ queryKey: ["notations"] });
      toast({
        title: "POS Notations synced",
        description: `Lessons: ${result.created} created, ${result.updated} updated, ${result.failed} failed (school ${result.schoolId})`,
      });
    },
    onError: (error) => {
      toast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Failed to sync POS notations to Lessons",
        variant: "destructive",
      });
    },
  });

  const previewNotationsToLessonsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/pos-import/sync/notations-to-lessons?dryRun=1", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json().catch(async () => ({ message: await response.text() }));
        throw new Error(error.message || "Preview sync failed");
      }
      return response.json() as Promise<SyncToPlatformResult>;
    },
    onSuccess: (result) => {
      setLastLessonSyncPreview(result);
      toast({
        title: "Lessons sync preview ready",
        description: `${result.created} to create, ${result.updated} to update, ${result.skipped} unchanged (school ${result.schoolId})`,
      });
    },
    onError: (error) => {
      toast({
        title: "Preview failed",
        description: error instanceof Error ? error.message : "Failed to preview POS notations sync",
        variant: "destructive",
      });
    },
  });

  const importStudentsCsvMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/pos-import/students", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json().catch(async () => ({ message: await response.text() }));
        throw new Error(error.message || "Student import failed");
      }

      return response.json() as Promise<StudentCsvImportResult>;
    },
    onSuccess: (result) => {
      setStudentImportResult(result);
      setStudentImportPreview(null);
      setSelectedStudentFile(null);
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      toast({
        title: "Student import complete",
        description: `${result.imported} created, ${result.updated} updated, ${result.accountStats?.successful ?? 0} accounts ready`,
      });
    },
    onError: (error) => {
      toast({
        title: "Student import failed",
        description: error instanceof Error ? error.message : "Failed to import student CSV",
        variant: "destructive",
      });
    },
  });

  const previewStudentsCsvMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/pos-import/students?dryRun=1", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json().catch(async () => ({ message: await response.text() }));
        throw new Error(error.message || "Student preview failed");
      }

      return response.json() as Promise<StudentCsvImportResult>;
    },
    onSuccess: (result) => {
      setStudentImportPreview(result);
      toast({
        title: "Student preview ready",
        description: `${result.imported} create · ${result.updated} update · ${result.skipped} skip (${result.processed} rows)`,
      });
    },
    onError: (error) => {
      toast({
        title: "Student preview failed",
        description: error instanceof Error ? error.message : "Failed to preview student CSV",
        variant: "destructive",
      });
    },
  });

  // Handle file selection
  const handleFileSelect = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".csv")) {
        toast({
          title: "Invalid File",
          description: "Please select a CSV file",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      setPreviewData(null);
      setImportResult(null);
    },
    [toast]
  );

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  // Handle preview
  const handlePreview = () => {
    if (selectedFile) {
      previewMutation.mutate({ file: selectedFile, fileType: activeTab });
    }
  };

  // Handle import
  const handleImport = () => {
    if (selectedFile) {
      importMutation.mutate({ file: selectedFile, fileType: activeTab });
    }
  };

  const openNotationDetail = (id: number) => {
    setSelectedNotationId(id);
    setShowNotationDetailDialog(true);
  };

  const openSongDetail = (id: number) => {
    setSelectedSongId(id);
    setShowSongDetailDialog(true);
  };

  const handleStudentFileSelect = (file?: File | null) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast({
        title: "Invalid file",
        description: "Please select a CSV file",
        variant: "destructive",
      });
      return;
    }
    setSelectedStudentFile(file);
    setStudentImportPreview(null);
  };

  const isHttpLike = (value?: string | null) => {
    if (!value) return false;
    return /^(https?:)?\/\//i.test(value);
  };

  const isGroovescribeLike = (value?: string | null) => {
    if (!value) return false;
    return /groovescribe|mikeslessons\.com\/groove|(?:^|[?&#])(?:TimeSig|Div|Tempo|H|S|K|T|C|Measures)=/i.test(
      value
    );
  };

  const renderPosModule = (module: PosModule | null | undefined, title: string, key: string) => {
    if (!module) return null;

    const raw = module.embed?.raw ?? null;
    const embedUrl = module.embed?.embed_url ?? null;
    const fallbackUrl = module.fallback?.url ?? null;

    return (
      <Card key={key}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between gap-2">
            <span>{title}</span>
            <Badge variant="outline">
              {module.provider || module.type || "module"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {typeof raw === "string" && isGroovescribeLike(raw) ? (
            <GrooveEmbedSimple grooveData={raw} title={title} className="mb-0" />
          ) : embedUrl ? (
            <iframe
              src={embedUrl}
              className="w-full rounded border"
              style={{ height: module.type === "video" ? 320 : module.type === "pdf" ? 420 : 180 }}
              title={`${title} (${module.provider || module.type || "embed"})`}
              loading="lazy"
            />
          ) : null}

          {isHttpLike(fallbackUrl) && (
            <a
              href={fallbackUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              {module.fallback?.label || "Open"}
            </a>
          )}

          {!embedUrl && raw && !isGroovescribeLike(raw) && (
            <pre className="text-xs bg-muted rounded p-2 whitespace-pre-wrap break-all max-h-40 overflow-auto">
              {raw}
            </pre>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderSyncPreviewPanel = (
    label: string,
    result: SyncToPlatformResult | null,
    colorClass: string = "border-blue-200"
  ) => {
    if (!result) return null;

    const previewRows = (result.preview || []).slice(0, 12);

    return (
      <Card className={colorClass}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between gap-2">
            <span>{label} Preview (School {result.schoolId})</span>
            <Badge variant="outline">{result.dryRun ? "dry-run" : "sync"}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-xs text-muted-foreground">
            {result.processed} processed · {result.created} create · {result.updated} update · {result.skipped} skip · {result.failed} fail
          </div>

          {previewRows.length > 0 ? (
            <div className="space-y-2 max-h-72 overflow-auto">
              {previewRows.map((row, idx) => (
                <div key={`${label}-${idx}`} className="rounded border p-2 text-xs space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={row.action === "create" ? "default" : row.action === "update" ? "secondary" : "outline"}>
                      {row.action || "item"}
                    </Badge>
                    <span className="font-medium">{row.title || row.posTitel || row.posHoofdstuk || row.posSoid || row.posNoid || `Item ${idx + 1}`}</span>
                    {row.matchReason && <span className="text-muted-foreground">match: {row.matchReason}</span>}
                    {row.reason && <span className="text-muted-foreground">reason: {row.reason}</span>}
                  </div>

                  {Array.isArray(row.changedFields) && row.changedFields.length > 0 && (
                    <div className="space-y-1">
                      {row.changedFields.slice(0, 6).map((diff: any, diffIdx: number) => (
                        <div key={diffIdx} className="font-mono">
                          <span className="text-muted-foreground">{diff.field}</span>
                          {" "}
                          <span>→</span>
                          {" "}
                          <span>{JSON.stringify(diff.to)}</span>
                        </div>
                      ))}
                      {row.changedFields.length > 6 && (
                        <div className="text-muted-foreground">+{row.changedFields.length - 6} more fields</div>
                      )}
                    </div>
                  )}

                  {row.payloadSummary && (
                    <pre className="bg-muted rounded p-2 whitespace-pre-wrap break-all">
                      {JSON.stringify(row.payloadSummary, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No preview rows returned.</p>
          )}

          {result.previewTruncated && (
            <p className="text-xs text-muted-foreground">Preview list truncated to first items.</p>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderStudentImportPreviewPanel = (result: StudentCsvImportResult | null) => {
    if (!result) return null;

    const previewRows = (result.preview || []).slice(0, 12);

    return (
      <Card className="border-amber-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between gap-2">
            <span>Student Import Preview</span>
            <Badge variant="outline">{result.dryRun ? "dry-run" : "result"}</Badge>
          </CardTitle>
          <CardDescription>
            {result.processed} processed · {result.imported} create · {result.updated} update · {result.skipped} skip · {result.failed} fail
            {result.accountStats ? ` · ${result.accountStats.successful} accounts to create/link` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {previewRows.length > 0 ? (
            <div className="space-y-2 max-h-80 overflow-auto">
              {previewRows.map((row, idx) => (
                <div key={`student-preview-${idx}`} className="rounded border p-2 text-xs space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        row.action === "create"
                          ? "default"
                          : row.action === "update" || row.action === "account_only"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {row.action || "item"}
                    </Badge>
                    <span className="font-medium">{row.name || row.email || `Row ${row.row || idx + 1}`}</span>
                    {row.email && <span className="font-mono text-muted-foreground">{row.email}</span>}
                    {row.reason && <span className="text-muted-foreground">reason: {row.reason}</span>}
                  </div>

                  {(row.accountAction || row.usernameCandidate) && (
                    <div className="font-mono">
                      <span className="text-muted-foreground">account</span>: {row.accountAction || "n/a"}
                      {row.usernameCandidate ? ` · username => ${row.usernameCandidate}` : ""}
                    </div>
                  )}

                  {Array.isArray(row.changedFields) && row.changedFields.length > 0 && (
                    <div className="space-y-1">
                      {row.changedFields.slice(0, 6).map((diff: any, diffIdx: number) => (
                        <div key={diffIdx} className="font-mono">
                          <span className="text-muted-foreground">{diff.field}</span> → {JSON.stringify(diff.to)}
                        </div>
                      ))}
                      {row.changedFields.length > 6 && (
                        <div className="text-muted-foreground">+{row.changedFields.length - 6} more fields</div>
                      )}
                    </div>
                  )}

                  {row.payloadSummary && (
                    <pre className="bg-muted rounded p-2 whitespace-pre-wrap break-all">
                      {JSON.stringify(row.payloadSummary, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No preview rows returned.</p>
          )}

          {result.previewTruncated && (
            <p className="text-xs text-muted-foreground">Preview list truncated to first items.</p>
          )}

          {result.errors && result.errors.length > 0 && (
            <div className="rounded border p-2">
              <p className="text-xs font-medium mb-1">Validation/issues (first {Math.min(result.errors.length, 8)})</p>
              <div className="space-y-1 max-h-32 overflow-auto">
                {result.errors.slice(0, 8).map((issue, idx) => (
                  <div key={`student-preview-err-${idx}`} className="font-mono text-xs">
                    row {issue.row}: {issue.email ? `${issue.email} - ` : ""}{issue.error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            POS Data Import
          </CardTitle>
          <CardDescription>
            Import notations and songs from POS CSV files. Original data is preserved losslessly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FileType)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="notations" className="flex items-center gap-2">
                <Drum className="h-4 w-4" />
                Notations
              </TabsTrigger>
              <TabsTrigger value="songs" className="flex items-center gap-2">
                <Music className="h-4 w-4" />
                Songs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="notations" className="mt-4">
              <p className="text-sm text-muted-foreground mb-4">
                Upload POS_Notatie.csv to import drum notations. The parser will extract events and
                create drumblocks automatically.
              </p>
            </TabsContent>

            <TabsContent value="songs" className="mt-4">
              <p className="text-sm text-muted-foreground mb-4">
                Upload POS_Songs.csv to import song data with embedded media (YouTube, Spotify, Apple
                Music).
              </p>
            </TabsContent>
          </Tabs>

          {/* File Drop Zone */}
          <div
            className={`
              mt-4 border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"}
              ${selectedFile ? "bg-muted/50" : ""}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".csv"
              className="hidden"
              id="file-upload"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />

            {selectedFile ? (
              <div className="space-y-2">
                <FileSpreadsheet className="h-12 w-12 mx-auto text-primary" />
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewData(null);
                    }}
                  >
                    Remove
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handlePreview}
                    disabled={previewMutation.isPending}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button onClick={handleImport} disabled={importMutation.isPending}>
                    <Upload className="h-4 w-4 mr-2" />
                    {importMutation.isPending ? "Importing..." : "Import"}
                  </Button>
                </div>
              </div>
            ) : (
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="mt-2 font-medium">Drop your CSV file here</p>
                <p className="text-sm text-muted-foreground">or click to browse</p>
              </label>
            )}
          </div>

          {/* Progress indicator */}
          {(previewMutation.isPending || importMutation.isPending) && (
            <div className="mt-4">
              <Progress value={undefined} className="w-full" />
              <p className="text-sm text-muted-foreground mt-2 text-center">
                {previewMutation.isPending ? "Analyzing file..." : "Importing data..."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Student CSV Import
          </CardTitle>
          <CardDescription>
            Import `Musicdott_fullexport_students*.csv` and create student accounts immediately for the current school only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Account creation rules</AlertTitle>
            <AlertDescription>
              Username = voornaam + achternaam in lowercase, without spaces (automatic numeric suffix on conflicts). Standard password: <code>Drumles2025!</code> and must be changed on first login.
            </AlertDescription>
          </Alert>

          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => handleStudentFileSelect(e.target.files?.[0])}
              className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium"
            />
            <Button
              variant="outline"
              onClick={() => {
                setSelectedStudentFile(null);
                setStudentImportResult(null);
                setStudentImportPreview(null);
              }}
              disabled={!selectedStudentFile && !studentImportResult && !studentImportPreview}
            >
              Clear
            </Button>
            <Button
              variant="secondary"
              onClick={() => selectedStudentFile && previewStudentsCsvMutation.mutate(selectedStudentFile)}
              disabled={!selectedStudentFile || previewStudentsCsvMutation.isPending || importStudentsCsvMutation.isPending}
            >
              {previewStudentsCsvMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Previewing...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview Students
                </>
              )}
            </Button>
            <Button
              onClick={() => selectedStudentFile && importStudentsCsvMutation.mutate(selectedStudentFile)}
              disabled={!selectedStudentFile || importStudentsCsvMutation.isPending || previewStudentsCsvMutation.isPending}
            >
              {importStudentsCsvMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing Students...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Students
                </>
              )}
            </Button>
          </div>

          {selectedStudentFile && (
            <div className="text-sm text-muted-foreground">
              Selected: <span className="font-medium text-foreground">{selectedStudentFile.name}</span> ({(selectedStudentFile.size / 1024).toFixed(1)} KB)
            </div>
          )}

          {renderStudentImportPreviewPanel(studentImportPreview)}

          {studentImportResult && (
            <div className="space-y-3">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Student import summary</AlertTitle>
                <AlertDescription>
                  {studentImportResult.processed} processed · {studentImportResult.imported} created · {studentImportResult.updated} updated · {studentImportResult.skipped} skipped · {studentImportResult.failed} failed
                  {studentImportResult.accountStats && (
                    <>
                      {" "}· Accounts: {studentImportResult.accountStats.successful} ok / {studentImportResult.accountStats.failed} failed
                    </>
                  )}
                  {studentImportResult.encodingDetected ? ` · Encoding: ${studentImportResult.encodingDetected}` : ""}
                </AlertDescription>
              </Alert>

              {studentImportResult.accountSamples && studentImportResult.accountSamples.length > 0 && (
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Username</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentImportResult.accountSamples.slice(0, 10).map((sample) => (
                        <TableRow key={`${sample.studentId}-${sample.username}`}>
                          <TableCell>{sample.studentId}</TableCell>
                          <TableCell className="font-mono text-xs">{sample.email}</TableCell>
                          <TableCell className="font-mono text-xs">{sample.username}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {studentImportResult.errors && studentImportResult.errors.length > 0 && (
                <div className="rounded-lg border p-3">
                  <p className="text-sm font-medium mb-2">Import issues (first {Math.min(studentImportResult.errors.length, 10)})</p>
                  <div className="space-y-1 text-xs max-h-40 overflow-auto">
                    {studentImportResult.errors.slice(0, 10).map((issue, idx) => (
                      <div key={`student-import-issue-${idx}`} className="font-mono">
                        row {issue.row}: {issue.email ? `${issue.email} - ` : ""}{issue.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Import History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">Loading history...</p>
            </div>
          ) : importHistory && importHistory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Results</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importHistory.slice(0, 10).map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {new Date(log.startedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {log.fileType === "notations" ? (
                          <><Drum className="h-3 w-3 mr-1" /> Notations</>
                        ) : (
                          <><Music className="h-3 w-3 mr-1" /> Songs</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{log.fileName}</TableCell>
                    <TableCell>
                      {log.status === "completed" ? (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Completed
                        </Badge>
                      ) : log.status === "failed" ? (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          Failed
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                          Processing
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {log.imported !== null && (
                        <span className="text-green-600">{log.imported} imported</span>
                      )}
                      {log.skipped !== null && log.skipped > 0 && (
                        <span className="text-muted-foreground ml-2">{log.skipped} skipped</span>
                      )}
                      {log.errors !== null && log.errors > 0 && (
                        <span className="text-red-600 ml-2">{log.errors} errors</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-muted-foreground">No imports yet</p>
          )}
        </CardContent>
      </Card>

      {/* Imported POS Data Browser */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Imported POS Data
          </CardTitle>
          <CardDescription>
            Browse imported POS notations and songs, including parsed notation, drumblocks, and embeds.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => previewNotationsToLessonsMutation.mutate()}
                disabled={previewNotationsToLessonsMutation.isPending}
              >
                {previewNotationsToLessonsMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Previewing Lessons Sync...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Preview Notations → Lessons
                  </>
                )}
              </Button>
              <Button
                onClick={() => syncNotationsToLessonsMutation.mutate()}
                disabled={syncNotationsToLessonsMutation.isPending}
              >
                {syncNotationsToLessonsMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Syncing to Lessons...
                  </>
                ) : (
                  <>
                    <Drum className="h-4 w-4 mr-2" />
                    Sync POS Notations to Lessons
                  </>
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={() => previewSongsToPlatformMutation.mutate()}
                disabled={previewSongsToPlatformMutation.isPending}
              >
                {previewSongsToPlatformMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Previewing Songs Sync...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Preview Songs → Songs
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => syncSongsToPlatformMutation.mutate()}
                disabled={syncSongsToPlatformMutation.isPending}
              >
                {syncSongsToPlatformMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Syncing to Songs...
                  </>
                ) : (
                  <>
                    <Music className="h-4 w-4 mr-2" />
                    Sync POS Songs to Songs
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Sync is school-scoped: only POS data from the current school is synced, and created items are written to the same school.
            </p>

            {(lastLessonSyncResult || lastSongSyncResult) && (
              <div className="grid md:grid-cols-2 gap-3">
                {lastLessonSyncResult && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Lessons Sync (School {lastLessonSyncResult.schoolId})</AlertTitle>
                    <AlertDescription>
                      {lastLessonSyncResult.processed} processed · {lastLessonSyncResult.created} created · {lastLessonSyncResult.updated} updated · {lastLessonSyncResult.skipped} skipped · {lastLessonSyncResult.failed} failed
                    </AlertDescription>
                  </Alert>
                )}
                {lastSongSyncResult && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Songs Sync (School {lastSongSyncResult.schoolId})</AlertTitle>
                    <AlertDescription>
                      {lastSongSyncResult.processed} processed · {lastSongSyncResult.created} created · {lastSongSyncResult.updated} updated · {lastSongSyncResult.skipped} skipped · {lastSongSyncResult.failed} failed
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {(lastLessonSyncPreview || lastSongSyncPreview) && (
              <div className="grid md:grid-cols-2 gap-3">
                {renderSyncPreviewPanel("Lessons", lastLessonSyncPreview, "border-blue-200")}
                {renderSyncPreviewPanel("Songs", lastSongSyncPreview, "border-indigo-200")}
              </div>
            )}
          </div>

          <Tabs value={libraryTab} onValueChange={(v) => setLibraryTab(v as FileType)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="notations" className="flex items-center gap-2">
                <Drum className="h-4 w-4" />
                POS Notations
              </TabsTrigger>
              <TabsTrigger value="songs" className="flex items-center gap-2">
                <Music className="h-4 w-4" />
                POS Songs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="notations" className="mt-4">
              {notationItemsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 mx-auto animate-spin mb-2" />
                  Loading POS notations...
                </div>
              ) : notationItems && notationItems.length > 0 ? (
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Media</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notationItems.slice(0, 30).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.title || `Notation #${item.id}`}</TableCell>
                          <TableCell>{item.category || item.posHoofdstuk || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.parserStatus || "unknown"}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {(item.displaySummary?.mediaCount || 0)} media · {(item.displaySummary?.attachmentCount || 0)} files
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => openNotationDetail(item.id)}>
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">No POS notations imported yet</p>
              )}
            </TabsContent>

            <TabsContent value="songs" className="mt-4">
              {posSongItemsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 mx-auto animate-spin mb-2" />
                  Loading POS songs...
                </div>
              ) : posSongItems && posSongItems.length > 0 ? (
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Artist</TableHead>
                        <TableHead>BPM</TableHead>
                        <TableHead>Embeds</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {posSongItems.slice(0, 30).map((song) => (
                        <TableRow key={song.id}>
                          <TableCell className="font-medium">{song.posTitel || `Song #${song.id}`}</TableCell>
                          <TableCell>{song.posArtiest || "-"}</TableCell>
                          <TableCell>{song.posBpm || "-"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {(song.displaySummary?.notationCount || 0)} notations · {(song.displaySummary?.mediaCount || 0)} media · {(song.displaySummary?.attachmentCount || 0)} files
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => openSongDetail(song.id)}>
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">No POS songs imported yet</p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* POS Notation Detail Dialog */}
      <Dialog
        open={showNotationDetailDialog}
        onOpenChange={(open) => {
          setShowNotationDetailDialog(open);
          if (!open) setSelectedNotationId(null);
        }}
      >
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>POS Notation Details</DialogTitle>
            <DialogDescription>
              Parsed notation, GrooveScribe embed, drumblocks, and original POS media for the selected notation.
            </DialogDescription>
          </DialogHeader>

          {notationDetailLoading ? (
            <div className="py-10 text-center text-muted-foreground">
              <Loader2 className="h-6 w-6 mx-auto animate-spin mb-2" />
              Loading notation...
            </div>
          ) : notationDetail ? (
            <div className="space-y-4">
              <div className="grid md:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground">Title</div>
                    <div className="font-medium">{notationDetail.title || "-"}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground">Category</div>
                    <div className="font-medium">{notationDetail.category || notationDetail.posCategorie || "-"}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground">Parser</div>
                    <div className="font-medium">{notationDetail.parserStatus || "unknown"}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground">Drumblocks</div>
                    <div className="font-medium">
                      {notationBlocksLoading ? "Loading..." : (notationBlocks?.length ?? 0)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <NotationGridViewer
                notation={notationDetail.parsedNotation || undefined}
                rawNotation={notationDetail.posNotatie || undefined}
                title={notationDetail.title || "POS Notation"}
                showControls={true}
                showRawToggle={true}
              />

              {notationDetail.posNotatie && isGroovescribeLike(notationDetail.posNotatie) && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Original GrooveScribe Embed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <GrooveEmbedSimple
                      grooveData={notationDetail.posNotatie}
                      title={notationDetail.title || "Groove Notation"}
                    />
                  </CardContent>
                </Card>
              )}

              {notationDetail.posOpmerkingen && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Opmerkingen</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="whitespace-pre-wrap text-sm">{notationDetail.posOpmerkingen}</div>
                  </CardContent>
                </Card>
              )}

              {Object.keys(notationDetail.mediaModules || {}).length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Notation Media</h4>
                  <div className="grid md:grid-cols-2 gap-3">
                    {Object.entries(notationDetail.mediaModules || {}).map(([key, module]) =>
                      renderPosModule(module as PosModule, String(key), `notation-media-${key}`)
                    )}
                  </div>
                </div>
              )}

              {(notationDetail.attachments || []).length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Attachments</h4>
                  <div className="grid md:grid-cols-2 gap-3">
                    {(notationDetail.attachments || []).map((item: any, idx: number) =>
                      renderPosModule(item.module as PosModule, item.label || item.key || `Attachment ${idx + 1}`, `notation-attachment-${idx}`)
                    )}
                  </div>
                </div>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Extracted Drumblocks</CardTitle>
                </CardHeader>
                <CardContent>
                  {notationBlocksLoading ? (
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading drumblocks...
                    </div>
                  ) : notationBlocks && notationBlocks.length > 0 ? (
                    <div className="border rounded-lg overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Block ID</TableHead>
                            <TableHead>Length</TableHead>
                            <TableHead>Source</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {notationBlocks.slice(0, 20).map((block: any) => (
                            <TableRow key={block.id}>
                              <TableCell className="font-mono text-xs">{block.blockId}</TableCell>
                              <TableCell>{block.lengthSteps}</TableCell>
                              <TableCell>{block.sourceNotationId}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No drumblocks extracted for this notation.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No notation selected.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* POS Song Detail Dialog */}
      <Dialog
        open={showSongDetailDialog}
        onOpenChange={(open) => {
          setShowSongDetailDialog(open);
          if (!open) setSelectedSongId(null);
        }}
      >
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>POS Song Details</DialogTitle>
            <DialogDescription>
              Imported song metadata, embedded media, notation slots, and attachments from POS_Songs.csv.
            </DialogDescription>
          </DialogHeader>

          {songDetailLoading ? (
            <div className="py-10 text-center text-muted-foreground">
              <Loader2 className="h-6 w-6 mx-auto animate-spin mb-2" />
              Loading song...
            </div>
          ) : songDetail ? (
            <div className="space-y-4">
              <div className="grid md:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground">Title</div>
                    <div className="font-medium">{songDetail.posTitel || "-"}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground">Artist</div>
                    <div className="font-medium">{songDetail.posArtiest || "-"}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground">BPM</div>
                    <div className="font-medium">{songDetail.posBpm || "-"}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground">Notations</div>
                    <div className="font-medium">{songDetail.displaySummary?.notationCount || 0}</div>
                  </CardContent>
                </Card>
              </div>

              <EmbedPlayer embeds={songDetail.embeds} title="Core Media Embeds" />

              {(songDetail.notationSlots || []).length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium">Song Notation Slots</h4>
                  {(songDetail.notationSlots || []).map((slot: any) => (
                    <Card key={`slot-${slot.index}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center justify-between">
                          <span>Notation {slot.index.toString().padStart(2, "0")}</span>
                          <div className="flex items-center gap-2">
                            {slot.parsedStatus && <Badge variant="outline">parser: {slot.parsedStatus}</Badge>}
                            {slot.opmerkingen && <Badge variant="secondary">{slot.opmerkingen}</Badge>}
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {renderPosModule(
                          slot.notationModule as PosModule,
                          slot.opmerkingen || `Song notation ${slot.index}`,
                          `song-slot-${slot.index}`
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {Object.keys(songDetail.mediaModules || {}).length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Additional Media</h4>
                  <div className="grid md:grid-cols-2 gap-3">
                    {Object.entries(songDetail.mediaModules || {}).map(([key, module]) =>
                      renderPosModule(module as PosModule, String(key), `song-media-${key}`)
                    )}
                  </div>
                </div>
              )}

              {(songDetail.attachments || []).length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Attachments / Links</h4>
                  <div className="grid md:grid-cols-2 gap-3">
                    {(songDetail.attachments || []).map((item: any, idx: number) =>
                      renderPosModule(item.module as PosModule, item.label || item.key || `Attachment ${idx + 1}`, `song-attachment-${idx}`)
                    )}
                  </div>
                </div>
              )}

              {songDetail.posLyrics && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Lyrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-64 overflow-auto whitespace-pre-wrap text-sm">
                      {songDetail.posLyrics}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No song selected.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview Import</DialogTitle>
            <DialogDescription>
              Review the data before importing. {previewData?.totalRows} total rows detected.
            </DialogDescription>
          </DialogHeader>

          {previewData && (
            <div className="space-y-4">
              {/* Validation alerts */}
              {previewData.validation.errors.length > 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Validation Errors</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside">
                      {previewData.validation.errors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {previewData.validation.warnings.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Warnings</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside">
                      {previewData.validation.warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Preview table */}
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(previewData.previewRows[0] || {}).map((key) => (
                        <TableHead key={key}>{key}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.previewRows.map((row, i) => (
                      <TableRow key={i}>
                        {Object.values(row).map((value, j) => (
                          <TableCell key={j} className="max-w-[200px] truncate">
                            {String(value)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <p className="text-sm text-muted-foreground">
                Showing {previewData.previewRows.length} of {previewData.totalRows} rows.
                Delimiter: "{previewData.detectedDelimiter}"
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={importMutation.isPending || !previewData?.validation.valid}
            >
              {importMutation.isPending ? "Importing..." : "Import All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Result Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {importResult?.success ? (
                <span className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  Import Complete
                </span>
              ) : (
                <span className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  Import Failed
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {importResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-600">{importResult.imported}</div>
                    <p className="text-sm text-muted-foreground">Imported</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-yellow-600">{importResult.skipped}</div>
                    <p className="text-sm text-muted-foreground">Skipped</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-red-600">{importResult.errors}</div>
                    <p className="text-sm text-muted-foreground">Errors</p>
                  </CardContent>
                </Card>
              </div>

              {importResult.drumblocks !== undefined && importResult.drumblocks > 0 && (
                <Alert>
                  <Drum className="h-4 w-4" />
                  <AlertTitle>Drumblocks Created</AlertTitle>
                  <AlertDescription>
                    {importResult.drumblocks} drumblocks were extracted from parsed notations.
                  </AlertDescription>
                </Alert>
              )}

              {importResult.errorDetails && importResult.errorDetails.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Error Details:</h4>
                  <div className="max-h-40 overflow-y-auto border rounded p-2 text-sm">
                    {importResult.errorDetails.map((err, i) => (
                      <div key={i} className="text-red-600">
                        Row {err.row}: {err.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowResultDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
