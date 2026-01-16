import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Play, Clock, BookOpen } from "lucide-react";
import { parseContentBlocks } from '@/utils/content-block-parser';

interface LessonPreviewProps {
  lesson: any;
  onViewFull: () => void;
}

export default function LessonPreview({ lesson, onViewFull }: LessonPreviewProps) {
  // Parse content blocks to show preview
  const contentBlocks = React.useMemo(() => {
    if (!lesson.contentBlocks) return [];
    
    try {
      const blocks = Array.isArray(lesson.contentBlocks) 
        ? lesson.contentBlocks 
        : JSON.parse(lesson.contentBlocks);
      
      return parseContentBlocks(blocks);
    } catch (error) {
      console.error('Error parsing content blocks for preview:', error);
      return [];
    }
  }, [lesson.contentBlocks]);

  // Get content type counts
  const contentSummary = React.useMemo(() => {
    const summary = {
      groovescribe: 0,
      youtube: 0,
      spotify: 0,
      apple_music: 0,
      text: 0,
      pdf: 0,
      total: contentBlocks.length
    };

    contentBlocks.forEach(block => {
      if (block.type === 'groovescribe' || block.type === 'groove') {
        summary.groovescribe++;
      } else if (block.type === 'youtube' || block.type === 'video') {
        summary.youtube++;
      } else if (block.type === 'spotify') {
        summary.spotify++;
      } else if (block.type === 'apple_music') {
        summary.apple_music++;
      } else if (block.type === 'text') {
        summary.text++;
      } else if (block.type === 'pdf') {
        summary.pdf++;
      }
    });

    return summary;
  }, [contentBlocks]);

  const getLevelBadgeColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2">{lesson.title}</CardTitle>
            {lesson.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {lesson.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4">
            {lesson.level && (
              <Badge variant="secondary" className={getLevelBadgeColor(lesson.level)}>
                {lesson.level}
              </Badge>
            )}
            {lesson.instrument && (
              <Badge variant="outline" className="text-xs">
                {lesson.instrument}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Content Summary */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">Content ({contentSummary.total} blocks)</span>
          </div>
          
          <div className="flex flex-wrap gap-1">
            {contentSummary.groovescribe > 0 && (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                {contentSummary.groovescribe} GrooveScribe
              </Badge>
            )}
            {contentSummary.youtube > 0 && (
              <Badge variant="outline" className="text-xs bg-red-50 text-red-700">
                {contentSummary.youtube} Video
              </Badge>
            )}
            {contentSummary.spotify > 0 && (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                {contentSummary.spotify} Spotify
              </Badge>
            )}
            {contentSummary.apple_music > 0 && (
              <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700">
                {contentSummary.apple_music} Apple Music
              </Badge>
            )}
            {contentSummary.text > 0 && (
              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
                {contentSummary.text} Text
              </Badge>
            )}
            {contentSummary.pdf > 0 && (
              <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700">
                {contentSummary.pdf} PDF
              </Badge>
            )}
          </div>
        </div>

        {/* Content Preview - Show first few blocks */}
        {contentBlocks.length > 0 && (
          <div className="mb-4">
            <div className="text-sm font-medium mb-2">Preview</div>
            <div className="space-y-2">
              {contentBlocks.slice(0, 2).map((block, index) => (
                <div key={block.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-xs font-medium capitalize">{block.type}</span>
                    {block.title && (
                      <span className="text-xs text-gray-600">• {block.title}</span>
                    )}
                  </div>
                  {block.description && (
                    <p className="text-xs text-gray-500 line-clamp-1 ml-4">
                      {block.description}
                    </p>
                  )}
                  {block.type === 'groovescribe' && block.pattern && (
                    <div className="text-xs text-gray-400 ml-4 font-mono">
                      Pattern: {block.pattern.substring(0, 40)}...
                    </div>
                  )}
                  {block.type === 'youtube' && (
                    <div className="text-xs text-gray-400 ml-4">
                      Video ID: {block.data?.videoId || block.data?.youtube}
                    </div>
                  )}
                  {block.type === 'text' && block.data?.text && (
                    <div className="text-xs text-gray-400 ml-4 line-clamp-1">
                      "{block.data.text.substring(0, 60)}..."
                    </div>
                  )}
                </div>
              ))}
              {contentBlocks.length > 2 && (
                <div className="text-xs text-gray-500 text-center py-2">
                  +{contentBlocks.length - 2} more content blocks
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={onViewFull}
            className="flex-1"
            variant="default"
          >
            <Eye className="h-4 w-4 mr-2" />
            View Full Lesson
          </Button>
          <Button 
            onClick={onViewFull}
            variant="outline"
            size="sm"
          >
            <Play className="h-4 w-4" />
          </Button>
        </div>

        {/* Metadata */}
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>
                {lesson.createdAt ? new Date(lesson.createdAt).toLocaleDateString() : 'Unknown date'}
              </span>
            </div>
            <div>
              ID: {lesson.id}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}