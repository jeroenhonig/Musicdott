import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Upload, 
  FileText, 
  Music, 
  Video, 
  ExternalLink, 
  Headphones,
  CheckCircle,
  AlertCircle,
  Info,
  FileUp,
  Database
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import ContentEditor from "@/components/ContentEditor";
import AppLayout from "@/components/layouts/app-layout";
import { useTranslation } from "@/lib/i18n";

interface ContentPreview {
  type: string;
  preview: string;
}

interface ImportPreview {
  originalContent: string;
  detectedBlocks: ContentPreview[];
}

interface ImportResult {
  success: number;
  failed: number;
}

interface CSVImportResult {
  message: string;
  results: {
    songs: ImportResult;
    lessons: ImportResult;
  };
  converted: {
    songs: number;
    lessons: number;
  };
}

export default function ImportPage() {
  const { t } = useTranslation();
  const [contentToPreview, setContentToPreview] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importData, setImportData] = useState("");
  const [importType, setImportType] = useState<"songs" | "lessons">("songs");
  const [csvFiles, setCsvFiles] = useState<{ songs?: File; lessons?: File }>({});
  const songsFileRef = useRef<HTMLInputElement>(null);
  const lessonsFileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Preview content conversion
  const previewMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", "/api/import/preview", { content });
      return response.json();
    },
    onSuccess: (data: ImportPreview) => {
      setPreview(data);
    },
    onError: (error: Error) => {
      toast({
        title: t('import.toast.previewError'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Import songs
  const importSongsMutation = useMutation({
    mutationFn: async (songs: any[]) => {
      const response = await apiRequest("POST", "/api/import/songs", { songs });
      return response.json();
    },
    onSuccess: (result: ImportResult) => {
      toast({
        title: t('import.toast.importComplete'),
        description: t('import.toast.importSongsSuccess', { success: String(result.success), failed: String(result.failed) }),
      });
      setImportData("");
    },
    onError: (error: Error) => {
      toast({
        title: t('import.toast.importError'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Import lessons
  const importLessonsMutation = useMutation({
    mutationFn: async (lessons: any[]) => {
      const response = await apiRequest("POST", "/api/import/lessons", { lessons });
      return response.json();
    },
    onSuccess: (result: ImportResult) => {
      toast({
        title: t('import.toast.importComplete'),
        description: t('import.toast.importLessonsSuccess', { success: String(result.success), failed: String(result.failed) }),
      });
      setImportData("");
    },
    onError: (error: Error) => {
      toast({
        title: t('import.toast.importError'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // CSV Import
  const csvImportMutation = useMutation({
    mutationFn: async (files: { songs?: File; lessons?: File }) => {
      const formData = new FormData();
      if (files.songs) formData.append('songs', files.songs);
      if (files.lessons) formData.append('lessons', files.lessons);

      const response = await fetch('/api/import/csv-convert', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json() as Promise<CSVImportResult>;
    },
    onSuccess: (result: CSVImportResult) => {
      const totalImported = result.results.songs.success + result.results.lessons.success;
      const totalFailed = result.results.songs.failed + result.results.lessons.failed;
      
      toast({
        title: t('import.toast.csvImportComplete'),
        description: `Successfully imported ${totalImported} items. ${totalFailed} failed. Converted ${result.converted.songs} songs and ${result.converted.lessons} lessons from CSV.`,
      });
      
      // Clear file inputs
      setCsvFiles({});
      if (songsFileRef.current) songsFileRef.current.value = '';
      if (lessonsFileRef.current) lessonsFileRef.current.value = '';
    },
    onError: (error: Error) => {
      toast({
        title: t('import.toast.csvImportError'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePreview = () => {
    if (!contentToPreview.trim()) {
      toast({
        title: t('common.error'),
        description: t('import.toast.noContent'),
        variant: "destructive",
      });
      return;
    }

    previewMutation.mutate(contentToPreview);
  };

  const handleImport = () => {
    if (!importData.trim()) {
      toast({
        title: t('common.error'),
        description: t('import.toast.noData'),
        variant: "destructive",
      });
      return;
    }

    try {
      const parsedData = JSON.parse(importData);
      
      if (!Array.isArray(parsedData)) {
        throw new Error("Data must be an array");
      }

      if (importType === "songs") {
        importSongsMutation.mutate(parsedData);
      } else {
        importLessonsMutation.mutate(parsedData);
      }
    } catch (error) {
      toast({
        title: t('import.toast.parseError'),
        description: t('import.toast.invalidJson'),
        variant: "destructive",
      });
    }
  };

  const handleCsvFileChange = (type: 'songs' | 'lessons', file: File | null) => {
    setCsvFiles(prev => ({
      ...prev,
      [type]: file || undefined
    }));
  };

  const handleCsvImport = () => {
    if (!csvFiles.songs && !csvFiles.lessons) {
      toast({
        title: t('common.error'),
        description: t('import.toast.noFile'),
        variant: "destructive",
      });
      return;
    }

    csvImportMutation.mutate(csvFiles);
  };

  const getBlockIcon = (type: string) => {
    switch (type) {
      case 'groove':
        return <Music className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'spotify':
        return <Headphones className="h-4 w-4" />;
      case 'text':
        return <FileText className="h-4 w-4" />;
      case 'external_link':
        return <ExternalLink className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getBlockColor = (type: string) => {
    switch (type) {
      case 'groove':
        return 'bg-blue-100 text-blue-800';
      case 'video':
        return 'bg-red-100 text-red-800';
      case 'spotify':
        return 'bg-green-100 text-green-800';
      case 'text':
        return 'bg-gray-100 text-gray-800';
      case 'external_link':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <AppLayout title={t('import.title')}>
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('import.title')}</h1>
          <p className="text-gray-600">
            {t('import.subtitle')}
          </p>
        </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* CSV Import Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              {t('import.csv.title')}
            </CardTitle>
            <CardDescription>
              {t('import.csv.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="songs-csv">{t('import.csv.songsLabel')}</Label>
              <Input
                id="songs-csv"
                type="file"
                accept=".csv"
                ref={songsFileRef}
                onChange={(e) => handleCsvFileChange('songs', e.target.files?.[0] || null)}
                className="mt-1"
                data-testid="input-songs-csv"
              />
              {csvFiles.songs && (
                <p className="text-sm text-green-600 mt-1">
                  ✓ {t('import.csv.fileSelected', { name: csvFiles.songs.name })}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="lessons-csv">{t('import.csv.lessonsLabel')}</Label>
              <Input
                id="lessons-csv"
                type="file"
                accept=".csv"
                ref={lessonsFileRef}
                onChange={(e) => handleCsvFileChange('lessons', e.target.files?.[0] || null)}
                className="mt-1"
                data-testid="input-lessons-csv"
              />
              {csvFiles.lessons && (
                <p className="text-sm text-green-600 mt-1">
                  ✓ {t('import.csv.fileSelected', { name: csvFiles.lessons.name })}
                </p>
              )}
            </div>

            <Button 
              onClick={handleCsvImport}
              disabled={csvImportMutation.isPending || (!csvFiles.songs && !csvFiles.lessons)}
              className="w-full"
              data-testid="button-csv-import"
            >
              <FileUp className="h-4 w-4 mr-2" />
              {csvImportMutation.isPending ? t('import.csv.buttonImporting') : t('import.csv.button')}
            </Button>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>{t('import.csv.autoConversionNote')}</strong> {t('import.csv.autoConversionDesc')}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Content Preview Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              {t('import.preview.title')}
            </CardTitle>
            <CardDescription>
              {t('import.preview.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="preview-content">{t('import.preview.sampleLabel')}</Label>
              <ContentEditor
                initial={contentToPreview}
                onChange={(value) => setContentToPreview(value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('import.preview.normalizeNote')}
              </p>
            </div>
            
            <Button 
              onClick={handlePreview}
              disabled={previewMutation.isPending}
              className="w-full"
            >
              {previewMutation.isPending ? t('import.preview.buttonAnalyzing') : t('import.preview.button')}
            </Button>

            {preview && (
              <div className="mt-4 space-y-3">
                <h4 className="font-semibold">{t('import.preview.detectedBlocks')}</h4>
                {preview.detectedBlocks.length > 0 ? (
                  preview.detectedBlocks.map((block, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      {getBlockIcon(block.type)}
                      <Badge variant="outline" className={getBlockColor(block.type)}>
                        {block.type}
                      </Badge>
                      <span className="text-sm text-gray-600 flex-1 truncate">
                        {block.preview}
                      </span>
                    </div>
                  ))
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {t('import.preview.noBlocksDetected')}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Batch Import Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {t('import.json.title')}
            </CardTitle>
            <CardDescription>
              {t('import.json.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="import-type">{t('import.json.importTypeLabel')}</Label>
              <div className="flex gap-2 mt-1">
                <Button
                  variant={importType === "songs" ? "default" : "outline"}
                  onClick={() => setImportType("songs")}
                  size="sm"
                >
                  {t('import.json.songs')}
                </Button>
                <Button
                  variant={importType === "lessons" ? "default" : "outline"}
                  onClick={() => setImportType("lessons")}
                  size="sm"
                >
                  {t('import.json.lessons')}
                </Button>
              </div>
            </div>
            
            <div>
              <Label htmlFor="import-data">{t('import.json.dataLabel')}</Label>
              <Textarea
                id="import-data"
                placeholder={importType === "songs" ? t('import.json.dataPlaceholderSongs') : t('import.json.dataPlaceholderLessons')}
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                rows={8}
                className="mt-1 font-mono text-sm"
              />
            </div>

            <Button 
              onClick={handleImport}
              disabled={importSongsMutation.isPending || importLessonsMutation.isPending}
              className="w-full"
              data-testid="button-json-import"
            >
              {(importSongsMutation.isPending || importLessonsMutation.isPending)
                ? t('import.json.buttonImporting')
                : importType === "songs" ? t('import.json.buttonSongs') : t('import.json.buttonLessons')}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Separator className="my-8" />

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t('import.examples.title')}</CardTitle>
          <CardDescription>
            {t('import.examples.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-semibold mb-2">{t('import.examples.songsFormat')}</h4>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
{`[
  {
    "title": "Song Title",
    "artist": "Artist Name",
    "instrument": "drums",
    "level": "beginner",
    "description": "Song description",
    "content": "<iframe width='560' height='315' src='https://www.youtube.com/embed/VIDEO_ID'>...</iframe>?TimeSig=4/4&Div=16&H=|XxXxXxXx|"
  }
]`}
            </pre>
          </div>

          <div>
            <h4 className="font-semibold mb-2">{t('import.examples.lessonsFormat')}</h4>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
{`[
  {
    "title": "Lesson Title",
    "description": "Lesson description",
    "contentType": "standard",
    "instrument": "drums",
    "level": "beginner",
    "content": "Mixed content with iframes and Groovescribe patterns..."
  }
]`}
            </pre>
          </div>

          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>{t('import.examples.supportedTypes')}</strong> {t('import.examples.supportedTypesDesc')}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
      </div>
    </AppLayout>
  );
}