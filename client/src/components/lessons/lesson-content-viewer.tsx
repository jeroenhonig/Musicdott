import React from 'react';
import SimpleLessonViewer from './simple-lesson-viewer';
import { parseContentBlocks } from '@/utils/content-block-parser';

interface LessonContentViewerProps {
  contentBlocksJson?: string | any[] | any;
}

export default function LessonContentViewer({ contentBlocksJson }: LessonContentViewerProps) {
  // Extract and normalize content blocks so legacy/imported and editor formats render consistently
  const contentBlocks = React.useMemo(() => {
    if (!contentBlocksJson) return [];
    
    // If it's already an array, normalize it
    if (Array.isArray(contentBlocksJson)) {
      return parseContentBlocks(contentBlocksJson);
    }
    
    // If it's a string, try to parse it
    if (typeof contentBlocksJson === 'string') {
      try {
        const parsed = JSON.parse(contentBlocksJson);
        return parseContentBlocks(Array.isArray(parsed) ? parsed : [parsed]);
      } catch (error) {
        console.error('Failed to parse content blocks JSON:', error);
        return [];
      }
    }
    
    // If it's an object, wrap in array
    if (typeof contentBlocksJson === 'object') {
      return parseContentBlocks([contentBlocksJson]);
    }
    
    return [];
  }, [contentBlocksJson]);

  return <SimpleLessonViewer contentBlocks={contentBlocks} />;
}
