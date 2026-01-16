import React, { lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PlayCircle, FileText, Video, Music, Guitar, FileMusic, Mic } from "lucide-react";
import { parseSpotifyTrackId, parsePdfData, parseYouTubeVideoId } from "@/utils/content-block-parser";

const MusicNotationContentBlock = lazy(() => import("../music-notation/music-notation-content-block"));

interface SimpleLessonViewerProps {
  contentBlocks: any[];
}

export default function SimpleLessonViewer({ contentBlocks }: SimpleLessonViewerProps) {
  // Debug logging to see what we're receiving
  console.log('SimpleLessonViewer received contentBlocks:', contentBlocks);
  console.log('contentBlocks type:', typeof contentBlocks);
  console.log('contentBlocks length:', Array.isArray(contentBlocks) ? contentBlocks.length : 'not array');
  
  if (!contentBlocks || !Array.isArray(contentBlocks) || contentBlocks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FileText className="h-12 w-12 mx-auto mb-4" />
        <p>No content blocks available for this lesson.</p>
        <div className="mt-4 text-xs">
          <p>Debug info:</p>
          <p>Type: {typeof contentBlocks}</p>
          <p>Is Array: {Array.isArray(contentBlocks) ? 'Yes' : 'No'}</p>
          <p>Length: {Array.isArray(contentBlocks) ? contentBlocks.length : 'N/A'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
        <strong>Debug:</strong> Found {contentBlocks.length} content blocks
      </div>
      {contentBlocks.map((block, index) => {
        console.log(`Processing block ${index}:`, block);
        // Handle GrooveScribe patterns
        if (block.type === 'groovescribe' && block.pattern) {
          const cleanPattern = block.pattern.startsWith('?') ? block.pattern : `?${block.pattern}`;
          const grooveUrl = `https://teacher.musicdott.com/groovescribe/GrooveEmbed.html${cleanPattern}`;
          
          return (
            <Card key={index} className="border-2 border-blue-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <PlayCircle className="h-5 w-5 text-blue-600" />
                  {block.title || 'GrooveScribe Pattern'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 text-center">
                  <PlayCircle className="h-12 w-12 text-blue-500 mx-auto mb-3" />
                  <h3 className="text-base font-semibold mb-2">Interactive Drum Pattern</h3>
                  <p className="text-gray-600 text-sm mb-3">
                    Click to open the authentic GrooveScribe pattern with playback controls.
                  </p>
                  <Button
                    onClick={() => window.open(grooveUrl, '_blank', 'noopener,noreferrer')}
                    className="bg-blue-600 hover:bg-blue-700"
                    size="sm"
                  >
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Open Pattern
                  </Button>
                  <div className="mt-3 text-xs text-gray-500 font-mono break-all">
                    {block.pattern.substring(0, 60)}...
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        }

        // Handle YouTube videos
        if (block.type === 'youtube' && (block.videoId || block.id)) {
          const videoId = block.videoId || block.id;
          return (
            <Card key={index} className="border-2 border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-red-600" />
                  {block.title || 'Video Content'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video">
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}`}
                    title={block.title || 'Lesson Video'}
                    className="w-full h-full rounded-lg"
                    allowFullScreen
                  />
                </div>
              </CardContent>
            </Card>
          );
        }

        // Handle text content
        if (block.type === 'text' && (block.content || block.text)) {
          return (
            <Card key={index} className="border-l-4 border-l-green-500 border-gray-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-5 w-5 text-green-600" />
                  {block.title || 'Lesson Notes'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <p className="text-gray-700 leading-relaxed text-sm">
                    {block.content || block.text}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        }

        // Handle Spotify content (with robust track ID parsing)
        if (block.type === 'spotify' && (block.trackId || block.id || block.data?.spotify)) {
          const rawTrackId = block.trackId || block.id || block.data?.spotify;
          const trackId = parseSpotifyTrackId(rawTrackId);
          
          if (!trackId) {
            console.warn('Could not parse Spotify track ID from:', rawTrackId);
            return null;
          }
          return (
            <Card key={index} className="border-2 border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="h-5 w-5 text-green-600" />
                  {block.title || 'Spotify Track'}
                </CardTitle>
                {block.description && (
                  <p className="text-sm text-gray-600">{block.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="aspect-video h-80">
                  <iframe
                    src={`https://open.spotify.com/embed/track/${trackId}?utm_source=generator`}
                    title={block.title || 'Spotify Track'}
                    className="w-full h-full rounded-lg"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                  />
                </div>
              </CardContent>
            </Card>
          );
        }

        // Handle PDF content (with robust PDF data parsing)
        if (block.type === 'pdf' && (block.url || block.filename || block.data?.pdf)) {
          const pdfData = parsePdfData(block);
          if (!pdfData?.url) {
            console.warn('Could not parse PDF data from:', block);
            return null;
          }
          const pdfUrl = pdfData.url;
          return (
            <Card key={index} className="border-2 border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  {block.title || 'PDF Document'}
                </CardTitle>
                {block.description && (
                  <p className="text-sm text-gray-600">{block.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button
                    onClick={() => window.open(pdfUrl, '_blank', 'noopener,noreferrer')}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Open PDF Document
                  </Button>
                  <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                    <iframe
                      src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                      title={block.title || 'PDF Document'}
                      className="w-full h-full rounded-lg"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        }

        // Handle Music Notation blocks
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
            <Card key={index} className="border-2 border-indigo-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-indigo-600" />
                  {block.title || 'Music Notation'}
                </CardTitle>
                {block.description && (
                  <p className="text-sm text-gray-600">{block.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                  <MusicNotationContentBlock
                    type={block.type}
                    title={block.title}
                    description={block.description}
                    content={block.content || block.data?.content}
                    scoreId={block.scoreId || block.data?.scoreId}
                  />
                </Suspense>
              </CardContent>
            </Card>
          );
        }

        // Handle External Link content
        if (block.type === 'external_link' && (block.url || block.data?.external_link?.url)) {
          const linkData = block.data?.external_link || block;
          const linkUrl = linkData.url || block.url;
          return (
            <Card key={index} className="border-2 border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-orange-600" />
                  {linkData.title || block.title || 'External Resource'}
                </CardTitle>
                {(linkData.description || block.description) && (
                  <p className="text-sm text-gray-600">{linkData.description || block.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button
                    onClick={() => window.open(linkUrl, '_blank', 'noopener,noreferrer')}
                    className="w-full bg-orange-600 hover:bg-orange-700"
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Open External Link
                  </Button>
                  {linkData.embedInViewer && (
                    <div className="aspect-video bg-gray-100 rounded-lg">
                      <iframe
                        src={linkUrl}
                        title={linkData.title || block.title || 'External Resource'}
                        className="w-full h-full rounded-lg"
                        allowFullScreen
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        }

        // Handle any other content type
        return (
          <Card key={index} className="border-2 border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="h-5 w-5 text-gray-600" />
                {block.title || `${block.type} Content`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded">
                <p className="text-sm text-gray-600 mb-2">
                  Content Type: <strong>{block.type}</strong>
                </p>
                <pre className="text-xs bg-white p-2 rounded overflow-auto">
                  {JSON.stringify(block, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}