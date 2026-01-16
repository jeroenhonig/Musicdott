import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Trash2, Download, Play, Square, Music } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { autoCorrelate, frequencyToNote, noteToABC, DetectedNote } from "@/lib/pitch-detection";

interface SpeechToNoteProps {
  onNotesChange?: (notes: DetectedNote[]) => void;
}

export function SpeechToNote({ onNotesChange }: SpeechToNoteProps) {
  const [isListening, setIsListening] = useState(false);
  const [currentNote, setCurrentNote] = useState<DetectedNote | null>(null);
  const [transcribedNotes, setTranscribedNotes] = useState<DetectedNote[]>([]);
  const [abcNotation, setAbcNotation] = useState("");
  const [permissionDenied, setPermissionDenied] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastNoteRef = useRef<string | null>(null);
  const noteHoldCountRef = useRef(0);
  
  const { toast } = useToast();

  const NOTE_HOLD_THRESHOLD = 5;

  const updateABCNotation = useCallback((notes: DetectedNote[]) => {
    if (notes.length === 0) {
      setAbcNotation("");
      return;
    }

    const abcNotes = notes.map(n => noteToABC(n.note, n.octave)).join(" ");
    const abc = `X:1
T:Transcribed Melody
M:4/4
L:1/4
K:C
${abcNotes} |`;
    setAbcNotation(abc);
  }, []);

  const detectPitch = useCallback(() => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.fftSize;
    const buffer = new Float32Array(bufferLength);
    analyserRef.current.getFloatTimeDomainData(buffer);

    const frequency = autoCorrelate(buffer, audioContextRef.current!.sampleRate);

    if (frequency > 0) {
      const note = frequencyToNote(frequency);
      if (note && note.confidence > 0.5) {
        setCurrentNote(note);
        
        const noteKey = `${note.note}${note.octave}`;
        if (noteKey === lastNoteRef.current) {
          noteHoldCountRef.current++;
          
          if (noteHoldCountRef.current === NOTE_HOLD_THRESHOLD) {
            setTranscribedNotes(prev => {
              const newNotes = [...prev, note];
              updateABCNotation(newNotes);
              onNotesChange?.(newNotes);
              return newNotes;
            });
          }
        } else {
          lastNoteRef.current = noteKey;
          noteHoldCountRef.current = 1;
        }
      }
    } else {
      setCurrentNote(null);
      lastNoteRef.current = null;
      noteHoldCountRef.current = 0;
    }

    if (isListening) {
      animationFrameRef.current = requestAnimationFrame(detectPitch);
    }
  }, [isListening, updateABCNotation, onNotesChange]);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      });
      
      mediaStreamRef.current = stream;
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      setIsListening(true);
      setPermissionDenied(false);
      
      toast({
        title: "Listening started",
        description: "Sing or play a note to transcribe"
      });
    } catch (err) {
      console.error("Microphone access error:", err);
      setPermissionDenied(true);
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to use this feature",
        variant: "destructive"
      });
    }
  };

  const stopListening = () => {
    setIsListening(false);
    setCurrentNote(null);
    lastNoteRef.current = null;
    noteHoldCountRef.current = 0;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  const clearNotes = () => {
    setTranscribedNotes([]);
    setAbcNotation("");
    onNotesChange?.([]);
  };

  const downloadABC = () => {
    if (!abcNotation) return;
    
    const blob = new Blob([abcNotation], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transcribed-melody.abc";
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (isListening) {
      animationFrameRef.current = requestAnimationFrame(detectPitch);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isListening, detectPitch]);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  const getCentsColor = (cents: number) => {
    const absCents = Math.abs(cents);
    if (absCents < 10) return "text-green-500";
    if (absCents < 25) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          Speech-to-Note Transcription
        </CardTitle>
        <CardDescription>
          Sing or play notes into your microphone to transcribe them automatically
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={isListening ? stopListening : startListening}
            variant={isListening ? "destructive" : "default"}
            className="gap-2"
            data-testid="button-toggle-listening"
          >
            {isListening ? (
              <>
                <MicOff className="h-4 w-4" />
                Stop Listening
              </>
            ) : (
              <>
                <Mic className="h-4 w-4" />
                Start Listening
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={clearNotes}
            disabled={transcribedNotes.length === 0}
            className="gap-2"
            data-testid="button-clear-notes"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>
          
          <Button
            variant="outline"
            onClick={downloadABC}
            disabled={transcribedNotes.length === 0}
            className="gap-2"
            data-testid="button-download-abc"
          >
            <Download className="h-4 w-4" />
            Download ABC
          </Button>
        </div>

        {permissionDenied && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
            Microphone access is required for this feature. Please enable it in your browser settings.
          </div>
        )}

        <div className="flex flex-col items-center justify-center p-8 bg-muted/50 rounded-lg">
          {isListening ? (
            <>
              <div className="relative">
                <div className={`w-32 h-32 rounded-full flex items-center justify-center ${
                  currentNote ? 'bg-primary/20 animate-pulse' : 'bg-muted'
                }`}>
                  {currentNote ? (
                    <div className="text-center">
                      <div className="text-4xl font-bold">{currentNote.note}{currentNote.octave}</div>
                      <div className={`text-sm ${getCentsColor(currentNote.cents)}`}>
                        {currentNote.cents > 0 ? '+' : ''}{currentNote.cents} cents
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {currentNote.frequency.toFixed(1)} Hz
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted-foreground text-center">
                      <Mic className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                      <span className="text-sm">Listening...</span>
                    </div>
                  )}
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Hold a note steady to add it to the transcription
              </p>
            </>
          ) : (
            <div className="text-center text-muted-foreground">
              <Mic className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Click "Start Listening" to begin transcription</p>
            </div>
          )}
        </div>

        {transcribedNotes.length > 0 && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Transcribed Notes ({transcribedNotes.length})</h4>
              <div className="flex flex-wrap gap-2">
                {transcribedNotes.map((note, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary"
                    className="text-base px-3 py-1"
                  >
                    {note.note}{note.octave}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">ABC Notation</h4>
              <pre className="p-4 bg-muted rounded-lg text-sm font-mono overflow-x-auto">
                {abcNotation}
              </pre>
            </div>
          </div>
        )}

        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-semibold mb-2">Tips for Best Results</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Use a quiet environment with minimal background noise</li>
            <li>• Hold each note for at least half a second for detection</li>
            <li>• Sing or play notes clearly with good pitch</li>
            <li>• Green cents = in tune, Yellow = slightly off, Red = needs adjustment</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
