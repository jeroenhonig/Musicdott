import { useState } from "react";
import { SheetMusicViewer } from "@/components/music-notation/sheet-music-viewer";
import { ArrowLeft, FileMusic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function SheetMusicPage() {
  const [musicXml, setMusicXml] = useState<string | undefined>();

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileMusic className="h-6 w-6" />
            Sheet Music Viewer
          </h1>
          <p className="text-muted-foreground">
            Upload and view MusicXML sheet music files
          </p>
        </div>
      </div>

      <SheetMusicViewer
        musicXml={musicXml}
        onMusicXmlLoad={setMusicXml}
        showUpload={true}
        title="MusicXML Viewer"
      />

      <div className="bg-muted/50 rounded-lg p-4">
        <h3 className="font-semibold mb-2">Supported Formats</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• MusicXML (.xml, .musicxml)</li>
          <li>• Compressed MusicXML (.mxl)</li>
        </ul>
        <p className="text-sm text-muted-foreground mt-3">
          Export MusicXML from notation software like MuseScore, Finale, or Sibelius.
        </p>
      </div>
    </div>
  );
}
