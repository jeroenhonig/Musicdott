import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Play, Pause, Square, Music } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ABCNotationViewerProps {
  initialAbc?: string;
  title?: string;
  showEditor?: boolean;
}

export function ABCNotationViewer({
  initialAbc = "",
  title = "ABC Notation",
  showEditor = true
}: ABCNotationViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const synthRef = useRef<any>(null);
  const visualObjRef = useRef<any>(null);
  const [abcContent, setAbcContent] = useState(initialAbc);
  const [playing, setPlaying] = useState(false);
  const [abcjs, setAbcjs] = useState<any>(null);
  const { toast } = useToast();

  const sampleAbc = `X:1
T:Simple Melody
M:4/4
L:1/4
K:C
C D E F | G A B c | c B A G | F E D C |`;

  useEffect(() => {
    const loadAbcjs = async () => {
      try {
        const abcjsModule = await import("abcjs");
        setAbcjs(abcjsModule.default || abcjsModule);
      } catch (err) {
        console.error("Failed to load abcjs:", err);
        toast({
          title: "Error",
          description: "Failed to load ABC notation library",
          variant: "destructive"
        });
      }
    };
    loadAbcjs();
  }, []);

  useEffect(() => {
    if (!containerRef.current || !abcjs || !abcContent.trim()) return;

    try {
      const visualObjs = abcjs.renderAbc(containerRef.current, abcContent, {
        responsive: "resize",
        add_classes: true,
        staffwidth: 700
      });
      visualObjRef.current = visualObjs[0];
    } catch (err) {
      console.error("ABC render error:", err);
      visualObjRef.current = null;
    }
  }, [abcContent, abcjs]);

  const handlePlay = async () => {
    if (!abcjs || !abcContent.trim() || !visualObjRef.current) return;

    try {
      if (synthRef.current) {
        synthRef.current.stop();
      }

      const synth = new abcjs.synth.CreateSynth();
      
      await synth.init({
        visualObj: visualObjRef.current,
        options: {}
      });
      
      await synth.prime();
      synthRef.current = synth;
      
      synth.start();
      setPlaying(true);
    } catch (err) {
      console.error("Playback error:", err);
      toast({
        title: "Playback Error",
        description: "Could not play the notation. Check the ABC syntax.",
        variant: "destructive"
      });
    }
  };

  const handlePause = () => {
    if (synthRef.current) {
      synthRef.current.pause();
      setPlaying(false);
    }
  };

  const handleStop = () => {
    if (synthRef.current) {
      synthRef.current.stop();
      setPlaying(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          {title}
        </CardTitle>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={playing ? handlePause : handlePlay}
            disabled={!abcContent.trim()}
            data-testid="button-abc-play"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleStop}
            data-testid="button-abc-stop"
          >
            <Square className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {showEditor && (
          <div className="space-y-2">
            <Textarea
              value={abcContent}
              onChange={(e) => setAbcContent(e.target.value)}
              placeholder={sampleAbc}
              className="font-mono min-h-[150px]"
              data-testid="textarea-abc"
            />
            <Button
              variant="outline"
              onClick={() => setAbcContent(sampleAbc)}
              data-testid="button-load-abc-sample"
            >
              Load Sample
            </Button>
          </div>
        )}

        <div 
          ref={containerRef}
          className="w-full overflow-x-auto min-h-[200px] bg-white rounded-lg p-4"
          data-testid="container-abc-notation"
        />
      </CardContent>
    </Card>
  );
}
