import { useState } from "react";
import { TablatureViewer } from "@/components/music-notation/tablature-viewer";
import { ArrowLeft, Guitar, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function TablaturePage() {
  const [file, setFile] = useState<ArrayBuffer | undefined>();
  const [texContent, setTexContent] = useState<string>("");
  const [activeTab, setActiveTab] = useState("upload");

  const sampleTex = `\\title "Simple Tab Example"
\\tempo 120
.
:4 0.6 2.5 2.4 0.3 |
:4 0.6 2.5 2.4 0.3 |
:4 3.6 5.5 5.4 3.3 |
:4 3.6 5.5 5.4 3.3`;

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
            <Guitar className="h-6 w-6" />
            Tablature Viewer
          </h1>
          <p className="text-muted-foreground">
            View and play guitar tablature with built-in MIDI playback
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload" data-testid="tab-upload">
            <Music className="h-4 w-4 mr-2" />
            Upload File
          </TabsTrigger>
          <TabsTrigger value="write" data-testid="tab-write">
            <Guitar className="h-4 w-4 mr-2" />
            Write AlphaTex
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-6">
          <TablatureViewer
            file={file}
            onFileLoad={setFile}
            showUpload={true}
            title="Guitar Pro / MusicXML Viewer"
          />
        </TabsContent>

        <TabsContent value="write" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AlphaTex Editor</CardTitle>
              <CardDescription>
                Write tablature using AlphaTex markup language
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={texContent}
                onChange={(e) => setTexContent(e.target.value)}
                placeholder={sampleTex}
                className="font-mono min-h-[200px]"
                data-testid="textarea-alphatex"
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => setTexContent(sampleTex)}
                  variant="outline"
                  data-testid="button-load-sample"
                >
                  Load Sample
                </Button>
                <Button
                  onClick={() => {
                    if (texContent.trim()) {
                      const previewElement = document.querySelector('[data-testid="container-tablature"]');
                      previewElement?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  disabled={!texContent.trim()}
                  data-testid="button-preview"
                >
                  Preview
                </Button>
              </div>
            </CardContent>
          </Card>

          {texContent && (
            <TablatureViewer
              file={texContent}
              showUpload={false}
              title="AlphaTex Preview"
            />
          )}
        </TabsContent>
      </Tabs>

      <div className="bg-muted/50 rounded-lg p-4">
        <h3 className="font-semibold mb-2">Supported Formats</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Guitar Pro 3-7 (.gp, .gp3, .gp4, .gp5, .gpx)</li>
          <li>• MusicXML (.xml, .musicxml)</li>
          <li>• AlphaTex markup (text-based tablature)</li>
        </ul>
      </div>
    </div>
  );
}
