import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, ZoomIn, ZoomOut, RotateCcw, Music } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SheetMusicViewerProps {
  musicXml?: string;
  title?: string;
  showUpload?: boolean;
  onMusicXmlLoad?: (xml: string) => void;
}

export function SheetMusicViewer({
  musicXml,
  title = "Sheet Music",
  showUpload = true,
  onMusicXmlLoad
}: SheetMusicViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<any>(null);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!musicXml || !containerRef.current) return;

    const loadOSMD = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const { OpenSheetMusicDisplay } = await import("opensheetmusicdisplay");
        
        if (osmdRef.current) {
          osmdRef.current.clear();
        }
        
        const osmd = new OpenSheetMusicDisplay(containerRef.current!, {
          autoResize: true,
          drawTitle: true,
          drawSubtitle: true,
          drawComposer: true,
          drawCredits: true,
          drawPartNames: true,
          drawingParameters: "default"
        });
        
        osmdRef.current = osmd;
        
        await osmd.load(musicXml);
        osmd.zoom = zoom;
        osmd.render();
        
        setLoading(false);
      } catch (err) {
        console.error("OSMD Error:", err);
        setError("Failed to render sheet music. Please check the MusicXML format.");
        setLoading(false);
      }
    };

    loadOSMD();
  }, [musicXml]);

  useEffect(() => {
    if (osmdRef.current) {
      osmdRef.current.zoom = zoom;
      osmdRef.current.render();
    }
  }, [zoom]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validExtensions = [".xml", ".musicxml", ".mxl"];
    const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    
    if (!validExtensions.includes(extension)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a MusicXML file (.xml, .musicxml, or .mxl)",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      const text = await file.text();
      onMusicXmlLoad?.(text);
    } catch (err) {
      toast({
        title: "Error reading file",
        description: "Could not read the uploaded file",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2.0));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const handleReset = () => setZoom(1.0);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          {title}
        </CardTitle>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            data-testid="button-zoom-out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomIn}
            disabled={zoom >= 2.0}
            data-testid="button-zoom-in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleReset}
            data-testid="button-reset-zoom"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {showUpload && !musicXml && (
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Upload a MusicXML file to view sheet music</p>
            <label>
              <input
                type="file"
                accept=".xml,.musicxml,.mxl"
                onChange={handleFileUpload}
                className="hidden"
                data-testid="input-musicxml-upload"
              />
              <Button asChild>
                <span>Choose File</span>
              </Button>
            </label>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading sheet music...</span>
          </div>
        )}

        {error && (
          <div className="text-center p-8 text-destructive">
            <p>{error}</p>
          </div>
        )}

        <div 
          ref={containerRef} 
          className="w-full overflow-x-auto"
          data-testid="container-sheet-music"
          style={{ minHeight: musicXml ? "400px" : "auto" }}
        />
      </CardContent>
    </Card>
  );
}
