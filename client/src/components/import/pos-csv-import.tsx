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
import {
  Upload,
  FileSpreadsheet,
  Music,
  Drum,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  History,
  RefreshCw,
  Download,
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

export default function POSCSVImport() {
  const [activeTab, setActiveTab] = useState<FileType>("notations");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

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
