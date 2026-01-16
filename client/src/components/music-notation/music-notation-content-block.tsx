import { useState, lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Music, Guitar, FileMusic, Mic, FileText } from "lucide-react";

const SheetMusicViewer = lazy(() => import("./sheet-music-viewer").then(m => ({ default: m.SheetMusicViewer })));
const TablatureViewer = lazy(() => import("./tablature-viewer").then(m => ({ default: m.TablatureViewer })));
const ABCNotationViewer = lazy(() => import("./abc-notation-viewer").then(m => ({ default: m.ABCNotationViewer })));
const FlatEmbedViewer = lazy(() => import("./flat-embed-viewer").then(m => ({ default: m.FlatEmbedViewer })));
const SpeechToNote = lazy(() => import("./speech-to-note").then(m => ({ default: m.SpeechToNote })));

interface MusicNotationContentBlockProps {
  type: 'sheet_music' | 'tablature' | 'abc_notation' | 'flat_embed' | 'speech_to_note';
  title?: string;
  description?: string;
  content?: string;
  fileUrl?: string;
  scoreId?: string;
}

function LoadingSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

const typeIcons = {
  sheet_music: FileMusic,
  tablature: Guitar,
  abc_notation: Music,
  flat_embed: FileText,
  speech_to_note: Mic
};

const typeLabels = {
  sheet_music: 'Sheet Music',
  tablature: 'Tablature',
  abc_notation: 'ABC Notation',
  flat_embed: 'Interactive Score',
  speech_to_note: 'Voice Transcription'
};

export function MusicNotationContentBlock({
  type,
  title,
  description,
  content,
  scoreId
}: MusicNotationContentBlockProps) {
  const [musicXml, setMusicXml] = useState<string | undefined>(content);
  const [tabContent, setTabContent] = useState<string | ArrayBuffer | undefined>(content);
  const label = title || typeLabels[type];

  const renderContent = () => {
    switch (type) {
      case 'sheet_music':
        return (
          <Suspense fallback={<LoadingSkeleton />}>
            <SheetMusicViewer 
              musicXml={musicXml} 
              title={label}
              showUpload={!musicXml}
              onMusicXmlLoad={setMusicXml}
            />
          </Suspense>
        );

      case 'tablature':
        return (
          <Suspense fallback={<LoadingSkeleton />}>
            <TablatureViewer 
              file={tabContent} 
              title={label}
              showUpload={!tabContent}
              onFileLoad={(buffer) => setTabContent(buffer)}
            />
          </Suspense>
        );

      case 'abc_notation':
        return (
          <Suspense fallback={<LoadingSkeleton />}>
            <ABCNotationViewer 
              initialAbc={content || ''} 
              title={label}
              showEditor={!content}
            />
          </Suspense>
        );

      case 'flat_embed':
        return (
          <Suspense fallback={<LoadingSkeleton />}>
            <FlatEmbedViewer 
              scoreId={scoreId} 
              title={label}
            />
          </Suspense>
        );

      case 'speech_to_note':
        return (
          <Suspense fallback={<LoadingSkeleton />}>
            <SpeechToNote />
          </Suspense>
        );

      default:
        return (
          <div className="text-center p-8 text-muted-foreground">
            <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Unknown music notation type: {type}</p>
          </div>
        );
    }
  };

  return (
    <div className="my-4" data-testid={`music-block-${type}`}>
      {description && (
        <p className="text-sm text-muted-foreground mb-2">{description}</p>
      )}
      {renderContent()}
    </div>
  );
}

export default MusicNotationContentBlock;
