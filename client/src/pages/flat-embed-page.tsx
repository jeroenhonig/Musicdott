import { FlatEmbedViewer } from "@/components/music-notation/flat-embed-viewer";
import { ArrowLeft, FileMusic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function FlatEmbedPage() {
  return (
    <div className="container max-w-5xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileMusic className="h-6 w-6" />
            Flat.io Sheet Music
          </h1>
          <p className="text-muted-foreground">
            View and play interactive sheet music from Flat.io
          </p>
        </div>
      </div>

      <FlatEmbedViewer height={500} />

      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        <h3 className="font-semibold">How to Use</h3>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li>
            <strong>Load a score:</strong> Paste a Flat.io score URL or enter a score ID directly
          </li>
          <li>
            <strong>Playback:</strong> Use the built-in controls to play, pause, and navigate the score
          </li>
          <li>
            <strong>Zoom:</strong> Use the zoom controls to adjust the sheet music size
          </li>
          <li>
            <strong>Find scores:</strong> Visit{" "}
            <a 
              href="https://flat.io/community" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Flat.io Community
            </a>{" "}
            to discover public scores
          </li>
        </ul>
      </div>
    </div>
  );
}
