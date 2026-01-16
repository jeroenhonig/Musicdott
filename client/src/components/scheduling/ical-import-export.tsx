import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Upload, 
  Download, 
  FileText, 
  Calendar, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  MapPin
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { Student } from "@shared/schema";

// Types for import preview
interface ImportPreviewEvent {
  uid: string;
  summary: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  recurring?: {
    frequency: string;
    interval?: number;
  };
  dayOfWeek: number;
  duration: number;
}

interface ImportPreviewData {
  totalEvents: number;
  events: ImportPreviewEvent[];
  potentialSchedules: any[];
  conflicts: any[];
  requiresStudentMapping: boolean;
}

// Component props
interface ICalImportExportProps {
  onImportComplete?: () => void;
}

export default function ICalImportExport({ onImportComplete }: ICalImportExportProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State management
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [importPreviewData, setImportPreviewData] = useState<ImportPreviewData | null>(null);
  const [studentMappings, setStudentMappings] = useState<{ [key: number]: number }>({});
  const [exportOptions, setExportOptions] = useState({
    name: 'Music Lessons',
    description: 'Music lesson schedule export',
    timezone: 'Europe/Amsterdam',
    includeAlarms: false,
  });

  // Fetch students for mapping
  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async (options: typeof exportOptions) => {
      const params = new URLSearchParams({
        name: options.name,
        description: options.description || '',
        timezone: options.timezone,
        includeAlarms: options.includeAlarms.toString(),
      });
      
      const response = await fetch(`/api/ical/export?${params}`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to export calendar');
      }
      
      return response;
    },
    onSuccess: async (response) => {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportOptions.name.replace(/[^a-z0-9]/gi, '_')}.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      setIsExportDialogOpen(false);
      toast({
        title: "Calendar exported",
        description: "Your schedule has been exported as an iCal file.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Import preview mutation
  const importPreviewMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('icsFile', file);
      
      const response = await fetch('/api/ical/import/preview', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to preview import');
      }
      
      return await response.json();
    },
    onSuccess: (data: ImportPreviewData) => {
      setImportPreviewData(data);
      setStudentMappings({});
    },
    onError: (error: Error) => {
      toast({
        title: "Import preview failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Import confirm mutation
  const importConfirmMutation = useMutation({
    mutationFn: async (data: { schedules: any[]; studentMappings: typeof studentMappings }) => {
      return await apiRequest("POST", "/api/ical/import/confirm", data);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/recurring-schedules"] });
      setIsImportDialogOpen(false);
      setImportPreviewData(null);
      onImportComplete?.();
      
      toast({
        title: "Import completed",
        description: `Successfully imported ${result.created} schedules with ${result.errors} errors.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handlers
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importPreviewMutation.mutate(file);
    }
  };

  const handleExport = () => {
    exportMutation.mutate(exportOptions);
  };

  const handleImportConfirm = () => {
    if (!importPreviewData) return;
    
    importConfirmMutation.mutate({
      schedules: importPreviewData.potentialSchedules,
      studentMappings,
    });
  };

  const getDayName = (dayOfWeek: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek];
  };

  return (
    <>
      {/* Action Buttons */}
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsImportDialogOpen(true)}
          data-testid="button-import-ical"
        >
          <Upload className="h-4 w-4 mr-1" />
          Import iCal
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExportDialogOpen(true)}
          data-testid="button-export-ical"
        >
          <Download className="h-4 w-4 mr-1" />
          Export iCal
        </Button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".ics,text/calendar"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        data-testid="input-ical-file"
      />

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Upload className="h-5 w-5 mr-2" />
              Import iCal Calendar
            </DialogTitle>
            <DialogDescription>
              Upload an .ics file to import lesson schedules from external calendar applications.
            </DialogDescription>
          </DialogHeader>

          {!importPreviewData ? (
            <div className="space-y-4">
              <Card
                className="border-dashed border-2 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={handleFileSelect}
              >
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Upload iCal File</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Click here or drag and drop your .ics file to preview the import
                  </p>
                  <Badge variant="outline">Supported: .ics files</Badge>
                </CardContent>
              </Card>
              
              {importPreviewMutation.isLoading && (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">Processing calendar file...</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Import Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Import Preview</span>
                    <div className="flex items-center space-x-2">
                      <Badge variant="default">{importPreviewData.totalEvents} events</Badge>
                      {importPreviewData.conflicts.length > 0 && (
                        <Badge variant="destructive">{importPreviewData.conflicts.length} conflicts</Badge>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="flex flex-col items-center">
                      <Calendar className="h-6 w-6 text-blue-600 mb-2" />
                      <span className="text-2xl font-bold">{importPreviewData.totalEvents}</span>
                      <span className="text-sm text-muted-foreground">Events Found</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <CheckCircle className="h-6 w-6 text-green-600 mb-2" />
                      <span className="text-2xl font-bold">{importPreviewData.potentialSchedules.length}</span>
                      <span className="text-sm text-muted-foreground">Importable</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <AlertTriangle className="h-6 w-6 text-red-600 mb-2" />
                      <span className="text-2xl font-bold">{importPreviewData.conflicts.length}</span>
                      <span className="text-sm text-muted-foreground">Conflicts</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Student Mapping (if required) */}
              {importPreviewData.requiresStudentMapping && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      Map Events to Students
                    </CardTitle>
                    <CardDescription>
                      Assign each imported event to an existing student in your system.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {importPreviewData.events.map((event, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium">{event.summary}</div>
                            <div className="text-sm text-muted-foreground flex items-center space-x-4">
                              <span className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {getDayName(event.dayOfWeek)}
                              </span>
                              <span className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {format(event.startTime, 'HH:mm')} - {format(event.endTime, 'HH:mm')}
                              </span>
                              {event.location && (
                                <span className="flex items-center">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {event.location}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="w-48">
                            <Select
                              value={studentMappings[index]?.toString() || ""}
                              onValueChange={(value) => {
                                setStudentMappings(prev => ({
                                  ...prev,
                                  [index]: parseInt(value)
                                }));
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select student" />
                              </SelectTrigger>
                              <SelectContent>
                                {students.map((student) => (
                                  <SelectItem key={student.id} value={student.id.toString()}>
                                    {student.firstName} {student.lastName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Conflicts Warning */}
              {importPreviewData.conflicts.length > 0 && (
                <Card className="border-red-200">
                  <CardHeader>
                    <CardTitle className="flex items-center text-red-600">
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      Schedule Conflicts Detected
                    </CardTitle>
                    <CardDescription>
                      The following events conflict with existing schedules and may need adjustment.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {importPreviewData.conflicts.map((conflict, index) => (
                        <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="font-medium text-red-800">{conflict.message}</div>
                          <div className="text-sm text-red-600 mt-1">
                            New: {conflict.potential.summary} vs Existing: {conflict.existing.summary}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Events Preview Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Events to Import</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event</TableHead>
                        <TableHead>Day & Time</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Recurrence</TableHead>
                        <TableHead>Location</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importPreviewData.events.map((event, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{event.summary}</div>
                              {event.description && (
                                <div className="text-sm text-muted-foreground truncate max-w-40">
                                  {event.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{getDayName(event.dayOfWeek)}</div>
                              <div className="text-muted-foreground">
                                {format(event.startTime, 'HH:mm')} - {format(event.endTime, 'HH:mm')}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{event.duration} min</TableCell>
                          <TableCell>
                            {event.recurring ? (
                              <Badge variant="outline">
                                {event.recurring.frequency}
                                {event.recurring.interval && event.recurring.interval > 1 && 
                                  ` (${event.recurring.interval}x)`
                                }
                              </Badge>
                            ) : (
                              <Badge variant="secondary">One-time</Badge>
                            )}
                          </TableCell>
                          <TableCell>{event.location || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsImportDialogOpen(false);
                setImportPreviewData(null);
              }}
            >
              Cancel
            </Button>
            {importPreviewData && (
              <Button
                onClick={handleImportConfirm}
                disabled={
                  importConfirmMutation.isLoading ||
                  (importPreviewData.requiresStudentMapping && 
                   Object.keys(studentMappings).length !== importPreviewData.events.length)
                }
                data-testid="button-confirm-import"
              >
                {importConfirmMutation.isLoading ? "Importing..." : "Import Schedules"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Download className="h-5 w-5 mr-2" />
              Export Calendar
            </DialogTitle>
            <DialogDescription>
              Export your lesson schedule as an iCal (.ics) file for use in external calendar applications.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="export-name">Calendar Name</Label>
              <Input
                id="export-name"
                value={exportOptions.name}
                onChange={(e) => setExportOptions(prev => ({ ...prev, name: e.target.value }))}
                data-testid="input-export-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="export-description">Description (optional)</Label>
              <Input
                id="export-description"
                value={exportOptions.description}
                onChange={(e) => setExportOptions(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Music lesson schedule export"
                data-testid="input-export-description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="export-timezone">Timezone</Label>
              <Select
                value={exportOptions.timezone}
                onValueChange={(value) => setExportOptions(prev => ({ ...prev, timezone: value }))}
              >
                <SelectTrigger data-testid="select-export-timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Europe/Amsterdam">Europe/Amsterdam</SelectItem>
                  <SelectItem value="Europe/London">Europe/London</SelectItem>
                  <SelectItem value="America/New_York">America/New_York</SelectItem>
                  <SelectItem value="America/Los_Angeles">America/Los_Angeles</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-alarms"
                checked={exportOptions.includeAlarms}
                onCheckedChange={(checked) => 
                  setExportOptions(prev => ({ ...prev, includeAlarms: !!checked }))
                }
                data-testid="checkbox-include-alarms"
              />
              <Label htmlFor="include-alarms">Include 15-minute reminders</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExportDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={exportMutation.isLoading}
              data-testid="button-confirm-export"
            >
              {exportMutation.isLoading ? "Exporting..." : "Export Calendar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}