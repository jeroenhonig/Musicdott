import React, { lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import GrooveEmbed from "@/components/lessons/groove-embed";
import VideoEmbed from "@/components/lessons/video-embed";
import { SyncEmbedCard } from "@/components/sync/sync-embed";
import { PlayCircle, FileText, Video, Music, Guitar, FileMusic, Mic } from "lucide-react";
import { parseSpotifyTrackId, parsePdfData, parseYouTubeVideoId } from "@/utils/content-block-parser";

const MusicNotationContentBlock = lazy(() => import("../music-notation/music-notation-content-block"));

interface SimpleLessonViewerProps {
  contentBlocks: any[];
}

export default function SimpleLessonViewer({ contentBlocks }: SimpleLessonViewerProps) {
  if (!contentBlocks || !Array.isArray(contentBlocks) || contentBlocks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FileText className="h-12 w-12 mx-auto mb-4" />
        <p>No content blocks available for this lesson.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {contentBlocks.map((block, index) => {
        // Handle GrooveScribe patterns
        const groovePattern = block.pattern || block.data?.pattern || block.data?.groovescribe || block.data?.groove || block.content;
        if ((block.type === 'groovescribe' || block.type === 'groove') && groovePattern) {
          
          return (
            <Card key={index} className="border-2 border-blue-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <PlayCircle className="h-5 w-5 text-blue-600" />
                  {block.title || 'GrooveScribe Pattern'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <GrooveEmbed
                  initialGrooveParams={groovePattern}
                  editable={false}
                  height={300}
                />
              </CardContent>
            </Card>
          );
        }

        // Handle YouTube videos
        const rawVideo = block.data?.video || block.data?.youtube || block.data?.videoId || block.url || block.content || block.videoId;
        const parsedVideoId = typeof rawVideo === 'string' ? parseYouTubeVideoId(rawVideo) : null;
        if ((block.type === 'youtube' || block.type === 'video') && rawVideo) {
          const embedUrl = parsedVideoId ? `https://www.youtube.com/embed/${parsedVideoId}` : undefined;
          const normalizedVideoUrl = typeof rawVideo === 'string'
            ? (rawVideo.includes('http') ? rawVideo : (parsedVideoId ? `https://www.youtube.com/watch?v=${parsedVideoId}` : rawVideo))
            : '';
          return (
            <Card key={index} className="border-2 border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-red-600" />
                  {block.title || 'Video Content'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {embedUrl ? (
                  <div className="aspect-video">
                    <iframe
                      src={embedUrl}
                      title={block.title || 'Lesson Video'}
                      className="w-full h-full rounded-lg"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <VideoEmbed initialVideoUrl={normalizedVideoUrl} editable={false} />
                )}
              </CardContent>
            </Card>
          );
        }

        // Handle text content
        if (block.type === 'text' && (block.content || block.text || block.data?.text)) {
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
                    {block.content || block.text || block.data?.text}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        }

        // Handle Spotify content (with robust track ID parsing)
        if (block.type === 'spotify' && (block.trackId || block.id || block.data?.spotify || block.url || block.content)) {
          const rawTrackId = block.trackId || block.id || block.data?.spotify || block.url || block.content;
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

        // Handle Musicdott Sync content
        if (block.type === 'sync-embed' && block.data?.sync) {
          return (
            <Card key={index} className="border-2 border-violet-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlayCircle className="h-5 w-5 text-violet-600" />
                  {block.title || 'Musicdott Sync'}
                </CardTitle>
                {block.description && (
                  <p className="text-sm text-gray-600">{block.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <SyncEmbedCard url={block.data.sync} height={600} />
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
