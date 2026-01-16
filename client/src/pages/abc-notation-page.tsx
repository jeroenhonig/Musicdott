import { ABCNotationViewer } from "@/components/music-notation/abc-notation-viewer";
import { ArrowLeft, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function ABCNotationPage() {
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
            <Music className="h-6 w-6" />
            ABC Notation Editor
          </h1>
          <p className="text-muted-foreground">
            Write and play music using ABC notation format
          </p>
        </div>
      </div>

      <ABCNotationViewer showEditor={true} />

      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        <h3 className="font-semibold">About ABC Notation</h3>
        <p className="text-sm text-muted-foreground">
          ABC notation is a simple text-based music notation system widely used for folk and traditional music.
          It's easy to learn and perfect for sharing tunes online.
        </p>
        
        <h4 className="font-medium text-sm mt-4">Quick Reference</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li><code className="bg-muted px-1 rounded">X:1</code> - Tune number</li>
          <li><code className="bg-muted px-1 rounded">T:Title</code> - Tune title</li>
          <li><code className="bg-muted px-1 rounded">M:4/4</code> - Time signature</li>
          <li><code className="bg-muted px-1 rounded">L:1/4</code> - Default note length</li>
          <li><code className="bg-muted px-1 rounded">K:C</code> - Key signature</li>
          <li><code className="bg-muted px-1 rounded">C D E F</code> - Notes (lowercase = octave higher)</li>
          <li><code className="bg-muted px-1 rounded">|</code> - Bar line</li>
        </ul>
      </div>
    </div>
  );
}
