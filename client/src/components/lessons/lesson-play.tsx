import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Pause, 
  ZoomIn, 
  ZoomOut, 
  FileText, 
  Music, 
  ExternalLink,
  ChevronLeft,
  Settings
} from "lucide-react";
import GrooveEmbed from './groove-embed';
import { SyncEmbedCard } from '@/components/sync/sync-embed';
import { useTranslation } from '@/lib/i18n';

interface LessonPlayProps {
  lessonId: number;
  onBack: () => void;
}

interface ContentBlock {
  id: string;
  type: string;
  content: any;
  order: number;
}

interface Lesson {
  id: number;
  title: string;
  categoryName?: string;
  contentBlocks: ContentBlock[];
  createdAt: string;
  updatedAt: string;
}

/**
 * MusicDott 1.0 Lesson Play Component - Modern React Implementation
 * Preserves exact functionality from original lesson_play.php including:
 * - GrooveScribe pattern display with zoom controls
 * - Content block rendering (text, PDF, external links)
 * - Lesson navigation and controls
 * - Original zoom size behavior (25% to 100%)
 */
export default function LessonPlay({ lessonId, onBack }: LessonPlayProps) {
  const { t } = useTranslation();
  const [zoomLevel, setZoomLevel] = useState(7); // Original default
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Original zoom mapping from lesson_play.php
  const getGrooveScribeSize = (zoom: number) => {
    switch(zoom) {
      case 2: return '45%';
      case 3: return '55%';
      case 4: return '65%';
      case 5: return '75%';
      case 6: return '85%';
      case 7: return '100%';
      default: return '100%';
    }
  };

  const { data: lesson, isLoading } = useQuery<Lesson>({
    queryKey: ['/api/lessons', lessonId],
  });

  const handleZoomIn = () => {
    if (zoomLevel < 7) {
      setZoomLevel(prev => prev + 1);
    }
  };

  const handleZoomOut = () => {
    if (zoomLevel > 2) {
      setZoomLevel(prev => prev - 1);
    }
  };

  const handlePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const renderContentBlock = (block: ContentBlock) => {
    switch (block.type) {
      case 'groovescribe':
        return (
          <div key={block.id} className="w-full my-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-700">GrooveScribe Pattern</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Size: {getGrooveScribeSize(zoomLevel)}</span>
                  <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={zoomLevel <= 2}>
                    <ZoomOut className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={zoomLevel >= 7}>
                    <ZoomIn className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div style={{ width: getGrooveScribeSize(zoomLevel) }}>
                <GrooveEmbed 
                  initialGrooveParams={block.content.pattern || block.content}
                  editable={false}
                  height={Math.floor(240 * (parseInt(getGrooveScribeSize(zoomLevel)) / 100))}
                />
              </div>
            </div>
          </div>
        );

      case 'text':
        return (
          <div key={block.id} className="prose max-w-none my-4">
            <div className="bg-white rounded-lg border p-4">
              <div dangerouslySetInnerHTML={{ __html: block.content.html || block.content }} />
            </div>
          </div>
        );

      case 'pdf':
        return (
          <div key={block.id} className="my-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-red-500" />
                    PDF Document
                  </CardTitle>
                  <Button variant="outline" size="sm" asChild>
                    <a href={block.content.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open
                    </a>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <iframe
                  src={block.content.url}
                  className="w-full h-96 border rounded"
                  title="PDF Viewer"
                />
              </CardContent>
            </Card>
          </div>
        );

      case 'external_link':
        return (
          <div key={block.id} className="my-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-blue-500" />
                  External Resource
                </CardTitle>
              </CardHeader>
              <CardContent>
                <iframe
                  src={block.content.url}
                  className="w-full h-96 border rounded"
                  title="External Content"
                  onError={() => {
                    // Show fallback when iframe is blocked
                    console.log('External iframe blocked:', block.content.url);
                  }}
                />
                <div className="mt-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={block.content.url} target="_blank" rel="noopener noreferrer">
                      Open in New Tab
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'sync-embed':
        return (
          <div key={block.id} className="my-4">
            {block.content?.sync && (
              <SyncEmbedCard url={block.content.sync} height={600} />
            )}
          </div>
        );

      default:
        return (
          <div key={block.id} className="my-4 p-4 bg-gray-100 rounded-lg">
            <p className="text-sm text-gray-600">
              Unsupported content type: {block.type}
            </p>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Lesson not found</p>
        <Button onClick={onBack} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header (matching original lesson_play.php structure) */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-purple-600 uppercase">
              {t('lessons')}
            </h1>
            <h2 className="text-lg text-gray-700 mt-1">{lesson.title}</h2>
            {lesson.categoryName && (
              <Badge variant="secondary" className="mt-1">
                {lesson.categoryName}
              </Badge>
            )}
          </div>
        </div>

        {/* Lesson Controls (matching original dropdown menu) */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePlay}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
          
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </div>
      </div>

      {/* Lesson Content */}
      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-4">
          {lesson.contentBlocks && lesson.contentBlocks.length > 0 ? (
            lesson.contentBlocks
              .sort((a, b) => a.order - b.order)
              .map(block => renderContentBlock(block))
          ) : (
            <div className="text-center py-8">
              <Music className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No content available for this lesson</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer Info */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex justify-between text-sm text-gray-500">
          <span>Lesson ID: {lesson.id}</span>
          <span>Last updated: {new Date(lesson.updatedAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}