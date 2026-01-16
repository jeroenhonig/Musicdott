import { useState } from "react";
import { SpeechToNote } from "@/components/music-notation/speech-to-note";
import { ABCNotationViewer } from "@/components/music-notation/abc-notation-viewer";
import { ArrowLeft, Mic, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DetectedNote } from "@/lib/pitch-detection";

export default function SpeechToNotePage() {
  const [transcribedNotes, setTranscribedNotes] = useState<DetectedNote[]>([]);
  const [abcForPreview, setAbcForPreview] = useState("");

  const handleNotesChange = (notes: DetectedNote[]) => {
    setTranscribedNotes(notes);
    
    if (notes.length > 0) {
      const noteToABC = (note: string, octave: number): string => {
        const lowerNote = note.replace('#', '');
        const isSharp = note.includes('#');
        
        if (octave >= 5) {
          const abcNote = lowerNote.toLowerCase();
          const octaveMarker = "'".repeat(Math.max(0, octave - 5));
          return isSharp ? `^${abcNote}${octaveMarker}` : `${abcNote}${octaveMarker}`;
        } else {
          const abcNote = lowerNote.toUpperCase();
          const octaveMarker = ",".repeat(Math.max(0, 4 - octave));
          return isSharp ? `^${abcNote}${octaveMarker}` : `${abcNote}${octaveMarker}`;
        }
      };

      const abcNotes = notes.map(n => noteToABC(n.note, n.octave)).join(" ");
      setAbcForPreview(`X:1
T:Transcribed Melody
M:4/4
L:1/4
K:C
${abcNotes} |`);
    } else {
      setAbcForPreview("");
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mic className="h-6 w-6" />
            Speech-to-Note Transcription
          </h1>
          <p className="text-muted-foreground">
            Convert your voice or instrument into musical notation
          </p>
        </div>
      </div>

      <Tabs defaultValue="transcribe">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transcribe" data-testid="tab-transcribe">
            <Mic className="h-4 w-4 mr-2" />
            Transcribe
          </TabsTrigger>
          <TabsTrigger value="preview" data-testid="tab-preview" disabled={!abcForPreview}>
            <Music className="h-4 w-4 mr-2" />
            Preview & Play
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transcribe" className="mt-6">
          <SpeechToNote onNotesChange={handleNotesChange} />
        </TabsContent>

        <TabsContent value="preview" className="mt-6">
          {abcForPreview ? (
            <ABCNotationViewer 
              initialAbc={abcForPreview} 
              showEditor={true}
              title="Transcribed Melody"
            />
          ) : (
            <div className="text-center p-8 text-muted-foreground">
              <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Transcribe some notes first to see the preview</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-muted/50 rounded-lg p-4">
          <h3 className="font-semibold mb-2">How It Works</h3>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Click "Start Listening" to enable your microphone</li>
            <li>Sing or play notes into your device</li>
            <li>Hold each note steady for detection</li>
            <li>Notes are automatically transcribed to ABC notation</li>
            <li>Switch to "Preview & Play" to hear your melody</li>
          </ol>
        </div>

        <div className="bg-muted/50 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Use Cases</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Capture melody ideas quickly</li>
            <li>• Practice pitch accuracy with visual feedback</li>
            <li>• Transcribe simple tunes by ear</li>
            <li>• Create sheet music from vocal melodies</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
