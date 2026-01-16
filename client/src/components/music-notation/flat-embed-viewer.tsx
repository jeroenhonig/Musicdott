import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Music, ExternalLink, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FlatEmbedViewerProps {
  scoreId?: string;
  title?: string;
  height?: number;
}

export function FlatEmbedViewer({
  scoreId: initialScoreId,
  title = "Sheet Music Viewer",
  height = 450
}: FlatEmbedViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const embedRef = useRef<any>(null);
  const [scoreId, setScoreId] = useState(initialScoreId || "");
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const sampleScores = [
    { id: "56ae21579a127715a02c5f42", name: "Für Elise - Beethoven" },
    { id: "5682d6cb34015214103f0d22", name: "Canon in D - Pachelbel" }
  ];

  useEffect(() => {
    if (!containerRef.current || !scoreId) return;

    const loadEmbed = async () => {
      setLoading(true);
      setError(null);

      try {
        const FlatEmbed = await import("flat-embed");
        const Embed = FlatEmbed.default || FlatEmbed;
        
        if (embedRef.current) {
          embedRef.current.off("ready");
          embedRef.current = null;
          if (containerRef.current) {
            containerRef.current.innerHTML = "";
          }
        }

        const embed = new Embed(containerRef.current!, {
          score: scoreId,
          embedParams: {
            appId: "musicdott",
            layout: "responsive",
            branding: false,
            controlsPlay: true,
            controlsPrint: false,
            controlsZoom: true,
            controlsFullscreen: true,
            displayFirstLinePartsNames: true
          }
        });

        embed.on("ready", () => {
          setLoading(false);
        });

        embedRef.current = embed;
      } catch (err) {
        console.error("Flat embed initialization error:", err);
        setError("Failed to initialize sheet music viewer");
        setLoading(false);
      }
    };

    loadEmbed();

    return () => {
      if (embedRef.current) {
        embedRef.current.off("ready");
      }
    };
  }, [scoreId]);

  const handleLoadScore = () => {
    const id = extractScoreId(inputValue);
    if (id) {
      setScoreId(id);
      setInputValue("");
    } else {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid Flat.io score ID or URL",
        variant: "destructive"
      });
    }
  };

  const extractScoreId = (input: string): string | null => {
    const trimmed = input.trim();
    if (/^[a-f0-9]{24}$/i.test(trimmed)) {
      return trimmed;
    }
    const urlMatch = trimmed.match(/flat\.io\/score\/([a-f0-9]{24})/i);
    if (urlMatch) {
      return urlMatch[1];
    }
    return null;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="score-input">Flat.io Score ID or URL</Label>
          <div className="flex gap-2">
            <Input
              id="score-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter score ID or paste Flat.io URL"
              data-testid="input-flat-score"
            />
            <Button 
              onClick={handleLoadScore}
              disabled={!inputValue.trim()}
              data-testid="button-load-flat"
            >
              Load
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">Try samples:</span>
          {sampleScores.map((sample) => (
            <Button
              key={sample.id}
              variant="outline"
              size="sm"
              onClick={() => setScoreId(sample.id)}
              data-testid={`button-sample-${sample.id}`}
            >
              {sample.name}
            </Button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading sheet music...</span>
          </div>
        )}

        {error && (
          <div className="text-center p-4 text-destructive bg-destructive/10 rounded-lg">
            <p>{error}</p>
          </div>
        )}

        <div 
          ref={containerRef}
          className="w-full rounded-lg overflow-hidden"
          style={{ height: `${height}px` }}
          data-testid="container-flat-embed"
        />

        {scoreId && (
          <div className="flex justify-end">
            <a
              href={`https://flat.io/score/${scoreId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
            >
              View on Flat.io <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
