import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Play, Pause, Square, Volume2, VolumeX, Guitar } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";

interface TablatureViewerProps {
  file?: ArrayBuffer | string;
  title?: string;
  showUpload?: boolean;
  onFileLoad?: (file: ArrayBuffer) => void;
}

export function TablatureViewer({
  file,
  title = "Guitar Tablature",
  showUpload = true,
  onFileLoad
}: TablatureViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(100);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!containerRef.current) return;

    const initAlphaTab = async () => {
      try {
        const alphaTab = await import("@coderline/alphatab");
        
        const settings = new alphaTab.Settings();
        settings.core.engine = "svg";
        settings.core.logLevel = alphaTab.LogLevel.Warning;
        settings.player.enablePlayer = true;
        settings.player.enableCursor = true;
        settings.player.enableUserInteraction = true;
        settings.player.soundFont = "https://cdn.jsdelivr.net/npm/@coderline/alphatab@1.3.0/dist/soundfont/sonivox.sf2";
        
        const api = new alphaTab.AlphaTabApi(containerRef.current!, settings);
        apiRef.current = api;

        api.playerStateChanged.on((e: any) => {
          setPlaying(e.state === alphaTab.PlayerState.Playing);
        });

        if (file) {
          if (typeof file === "string") {
            api.tex(file);
          } else {
            api.load(file);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error("AlphaTab Error:", err);
        setError("Failed to initialize tablature viewer");
        setLoading(false);
      }
    };

    setLoading(true);
    initAlphaTab();

    return () => {
      if (apiRef.current) {
        apiRef.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (apiRef.current && file) {
      setLoading(true);
      try {
        if (typeof file === "string") {
          apiRef.current.tex(file);
        } else {
          apiRef.current.load(file);
        }
        setLoading(false);
      } catch (err) {
        setError("Failed to load tablature file");
        setLoading(false);
      }
    }
  }, [file]);

  useEffect(() => {
    if (apiRef.current) {
      apiRef.current.masterVolume = muted ? 0 : volume / 100;
    }
  }, [volume, muted]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validExtensions = [".gp", ".gp3", ".gp4", ".gp5", ".gpx", ".gp6", ".gp7", ".xml", ".musicxml"];
    const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    
    if (!validExtensions.some(ext => extension.includes(ext.replace(".", "")))) {
      toast({
        title: "Invalid file type",
        description: "Please upload a Guitar Pro or MusicXML file",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      const buffer = await file.arrayBuffer();
      onFileLoad?.(buffer);
      
      if (apiRef.current) {
        apiRef.current.load(buffer);
      }
      setLoading(false);
    } catch (err) {
      toast({
        title: "Error reading file",
        description: "Could not read the uploaded file",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const handlePlay = () => {
    if (apiRef.current) {
      apiRef.current.play();
    }
  };

  const handlePause = () => {
    if (apiRef.current) {
      apiRef.current.pause();
    }
  };

  const handleStop = () => {
    if (apiRef.current) {
      apiRef.current.stop();
    }
  };

  const toggleMute = () => setMuted(!muted);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
        <CardTitle className="flex items-center gap-2">
          <Guitar className="h-5 w-5" />
          {title}
        </CardTitle>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="icon"
            onClick={playing ? handlePause : handlePlay}
            data-testid="button-play-pause"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleStop}
            data-testid="button-stop"
          >
            <Square className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2 ml-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              data-testid="button-mute"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Slider
              value={[muted ? 0 : volume]}
              onValueChange={([v]) => {
                setVolume(v);
                setMuted(false);
              }}
              max={100}
              step={1}
              className="w-24"
              data-testid="slider-volume"
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {showUpload && !file && (
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">Upload a Guitar Pro or MusicXML file</p>
            <p className="text-sm text-muted-foreground mb-4">Supports .gp, .gp3, .gp4, .gp5, .gpx, .xml</p>
            <label>
              <input
                type="file"
                accept=".gp,.gp3,.gp4,.gp5,.gpx,.gp6,.gp7,.xml,.musicxml"
                onChange={handleFileUpload}
                className="hidden"
                data-testid="input-tab-upload"
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
            <span className="ml-2">Loading tablature...</span>
          </div>
        )}

        {error && (
          <div className="text-center p-8 text-destructive">
            <p>{error}</p>
          </div>
        )}

        <div 
          ref={containerRef} 
          className="w-full overflow-x-auto at-main"
          data-testid="container-tablature"
          style={{ minHeight: "400px" }}
        />
      </CardContent>
    </Card>
  );
}
