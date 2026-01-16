import React, { lazy, Suspense } from 'react';
import { SongContentBlock } from './song-content-manager';
import GrooveEmbed from "@/components/lessons/groove-embed";
import VideoEmbed from "@/components/lessons/video-embed";
import SpotifyEmbed from "@/components/lessons/spotify-embed";
import ExternalLinkEmbed from "@/components/lessons/external-link-embed";
import PdfEmbed from "@/components/lessons/pdf-embed";
import AppleMusicEmbed from "./apple-music-embed";
import { SyncEmbedCard } from "@/components/sync/sync-embed";
import { parseContentBlocks, isContentBlockSupported } from "@/utils/content-block-parser";
import { Skeleton } from "@/components/ui/skeleton";
import { Music, Guitar, FileMusic, Mic, FileText } from "lucide-react";

const MusicNotationContentBlock = lazy(() => import("../music-notation/music-notation-content-block"));

interface SongContentViewerProps {
  contentBlocksJson?: string | any[] | any;
  contentBlocks?: any[];
}

export default function SongContentViewer({ contentBlocksJson, contentBlocks }: SongContentViewerProps) {
  // Parse and normalize content blocks from any format
  const normalizedContentBlocks = React.useMemo(() => {
    if (contentBlocks) {
      console.log('🎵 SongContentViewer - Direct contentBlocks provided:', contentBlocks.length);
      return parseContentBlocks(contentBlocks);
    }
    
    if (!contentBlocksJson) return [];
    
    // If it's already an array (direct format from memory storage), use it directly  
    if (Array.isArray(contentBlocksJson)) {
      console.log('🎵 SongContentViewer - Direct array format detected, blocks:', contentBlocksJson.length);
      return parseContentBlocks(contentBlocksJson);
    }
    
    // If it's a string, try to parse it
    if (typeof contentBlocksJson === 'string') {
      try {
        const parsed = JSON.parse(contentBlocksJson);
        console.log('🎵 SongContentViewer - JSON string parsed, blocks:', parsed.length);
        return parseContentBlocks(parsed);
      } catch (error) {
        console.error('Failed to parse content blocks JSON:', error, contentBlocksJson);
        return [];
      }
    }
    
    // If it's an object but not an array, try to extract content
    if (typeof contentBlocksJson === 'object') {
      console.log('🎵 SongContentViewer - Object format detected:', contentBlocksJson);
      return parseContentBlocks([contentBlocksJson]);
    }
    
    console.warn('🎵 SongContentViewer - Unknown content format:', typeof contentBlocksJson);
    return [];
  }, [contentBlocksJson, contentBlocks]);
  
  if (!normalizedContentBlocks.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-gray-500">
          No content available for this song
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 max-w-full">
      {normalizedContentBlocks.map((block, index) => {
        const ContentBlock = ({ children }: { children: React.ReactNode }) => (
          <div 
            key={block.id} 
            className="mb-6 pb-6 border-b last:border-b-0 border-gray-200"
            id={`block-${index}`}
          >
            {children}
          </div>
        );

        // YouTube content (including legacy videoId format)
        if ((block.type === 'youtube' || block.type === 'video') && 
            (block.data.youtube || block.data.videoId || block.data.video)) {
          return (
            <ContentBlock>
              <h3 className="text-lg font-semibold mb-3 text-gray-800">
                {block.title || 'Video Content'}
              </h3>
              {block.description && (
                <p className="text-sm text-gray-600 mb-3">{block.description}</p>
              )}
              <div className="rounded-lg overflow-hidden shadow-lg">
                <iframe
                  width="100%"
                  height="315"
                  src={`https://www.youtube.com/embed/${block.data.youtube || block.data.videoId || block.data.video}`}
                  title={block.title || 'YouTube video'}
                  frameBorder="0"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            </ContentBlock>
          );
        }

        // Spotify content
        if (block.type === 'spotify' && block.data.spotify) {
          return (
            <ContentBlock>
              <h3 className="text-lg font-semibold mb-3 text-gray-800">
                {block.title || 'Listen on Spotify'}
              </h3>
              {block.description && (
                <p className="text-sm text-gray-600 mb-3">{block.description}</p>
              )}
              <div className="rounded-lg overflow-hidden shadow-lg">
                <iframe
                  src={`https://open.spotify.com/embed/track/${block.data.spotify}`}
                  width="100%"
                  height="380"
                  frameBorder="0"
                  allowTransparency={true}
                  allow="encrypted-media"
                />
              </div>
            </ContentBlock>
          );
        }

        // Apple Music content
        if (block.type === 'apple_music' && block.data.apple_music) {
          return (
            <ContentBlock>
              <h3 className="text-lg font-semibold mb-3 text-gray-800">
                {block.title || 'Listen on Apple Music'}
              </h3>
              {block.description && (
                <p className="text-sm text-gray-600 mb-3">{block.description}</p>
              )}
              <div className="rounded-lg overflow-hidden shadow-lg">
                <iframe
                  src={`https://embed.music.apple.com/us/album/${block.data.apple_music}`}
                  width="100%"
                  height="380"
                  frameBorder="0"
                  allowTransparency={true}
                  allow="encrypted-media"
                />
              </div>
            </ContentBlock>
          );
        }

        // GrooveScribe content - support multiple pattern locations (enhanced legacy support)
        if ((block.type === 'groove' || block.type === 'groovescribe') && 
            (block.pattern || block.data?.pattern || block.data?.groovescribe || block.data?.groove)) {
          return (
            <ContentBlock>
              <h3 className="text-lg font-semibold mb-3 text-gray-800">
                {block.title || 'Interactive Drum Pattern'}
              </h3>
              {block.description && (
                <p className="text-sm text-gray-600 mb-3">{block.description}</p>
              )}
              <div className="rounded-lg overflow-hidden shadow-lg">
                {(() => {
                  // Support all legacy pattern formats
                  const pattern = block.pattern || block.data?.pattern || block.data?.groovescribe || block.data?.groove;
                  console.log('🎵 SongContentViewer - GrooveScribe pattern found:', { 
                    blockType: block.type, 
                    blockTitle: block.title,
                    pattern: pattern,
                    fullBlock: block 
                  });
                  return (
                    <GrooveEmbed 
                      initialGrooveParams={pattern} 
                      editable={false}
                      height={300}
                    />
                  );
                })()}
              </div>
            </ContentBlock>
          );
        }

        // Video content
        if (block.type === 'video' && block.data.video) {
          return (
            <ContentBlock>
              <h3 className="text-lg font-semibold mb-3 text-gray-800">
                {block.title || 'Video'}
              </h3>
              {block.description && (
                <p className="text-sm text-gray-600 mb-3">{block.description}</p>
              )}
              <div className="rounded-lg overflow-hidden shadow-lg">
                <VideoEmbed 
                  initialVideoUrl={block.data.video} 
                  editable={false}
                />
              </div>
            </ContentBlock>
          );
        }

        // Text content
        if (block.type === 'text' && block.data.text) {
          return (
            <ContentBlock>
              <h3 className="text-lg font-semibold mb-3 text-gray-800">
                {block.title || 'Notes'}
              </h3>
              <div className="prose prose-sm max-w-none bg-gray-50 p-6 rounded-lg">
                {block.data.text.split('\n').map((line: string, i: number) => (
                  <p key={i} className="mb-2 last:mb-0">{line}</p>
                ))}
              </div>
            </ContentBlock>
          );
        }

        // PDF content
        if (block.type === 'pdf' && block.data.pdf) {
          return (
            <ContentBlock>
              <h3 className="text-lg font-semibold mb-3 text-gray-800">
                {block.title || 'Sheet Music'}
              </h3>
              {block.description && (
                <p className="text-sm text-gray-600 mb-3">{block.description}</p>
              )}
              <div className="rounded-lg overflow-hidden shadow-lg">
                <PdfEmbed
                  pdfData={block.data.pdf}
                  editable={false}
                />
              </div>
            </ContentBlock>
          );
        }

        // Musicdott Sync embed
        if (block.type === 'sync-embed' && block.data.sync) {
          return (
            <ContentBlock>
              <h3 className="text-lg font-semibold mb-3 text-gray-800">
                {block.title || 'Musicdott Sync'}
              </h3>
              {block.description && (
                <p className="text-sm text-gray-600 mb-3">{block.description}</p>
              )}
              <SyncEmbedCard url={block.data.sync} height={600} />
            </ContentBlock>
          );
        }

        // Music Notation content blocks
        if (['sheet_music', 'tablature', 'abc_notation', 'flat_embed', 'speech_to_note'].includes(block.type)) {
          const iconMap: Record<string, any> = {
            sheet_music: FileMusic,
            tablature: Guitar,
            abc_notation: Music,
            flat_embed: FileText,
            speech_to_note: Mic
          };
          const Icon = iconMap[block.type] || Music;
          
          return (
            <ContentBlock>
              <div className="flex items-center gap-2 mb-3">
                <Icon className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-800">
                  {block.title || 'Music Notation'}
                </h3>
              </div>
              {block.description && (
                <p className="text-sm text-gray-600 mb-3">{block.description}</p>
              )}
              <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                <MusicNotationContentBlock
                  type={block.type as 'sheet_music' | 'tablature' | 'abc_notation' | 'flat_embed' | 'speech_to_note'}
                  title={block.title}
                  description={block.description}
                  content={block.content || block.data?.content}
                  scoreId={block.scoreId || block.data?.scoreId}
                />
              </Suspense>
            </ContentBlock>
          );
        }

        // External link content
        if (block.type === 'external_link' && block.data.external_link) {
          return (
            <ContentBlock>
              <h3 className="text-lg font-semibold mb-3 text-gray-800">
                {block.title || 'Additional Resource'}
              </h3>
              <div className="rounded-lg overflow-hidden shadow-lg">
                <ExternalLinkEmbed
                  initialLinkData={block.data.external_link}
                  onSave={() => {}}
                  editable={false}
                />
              </div>
            </ContentBlock>
          );
        }

        // Fallback for unsupported content types
        if (!isContentBlockSupported(block.type)) {
          return (
            <ContentBlock>
              <h3 className="text-lg font-semibold mb-3 text-gray-800">
                {block.title || 'Unsupported Content'}
              </h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  Content type "{block.type}" is not currently supported.
                </p>
                {block.description && (
                  <p className="text-sm text-yellow-600 mt-2">{block.description}</p>
                )}
              </div>
            </ContentBlock>
          );
        }

        return null;
      })}
    </div>
  );
}