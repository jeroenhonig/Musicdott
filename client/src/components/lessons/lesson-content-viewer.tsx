import React from 'react';
import SimpleLessonViewer from './simple-lesson-viewer';

interface LessonContentViewerProps {
  contentBlocksJson?: string | any[] | any;
}

export default function LessonContentViewer({ contentBlocksJson }: LessonContentViewerProps) {
  // Extract raw content blocks without complex parsing
  const contentBlocks = React.useMemo(() => {
    if (!contentBlocksJson) return [];
    
    // If it's already an array, use it directly
    if (Array.isArray(contentBlocksJson)) {
      return contentBlocksJson;
    }
    
    // If it's a string, try to parse it
    if (typeof contentBlocksJson === 'string') {
      try {
        return JSON.parse(contentBlocksJson);
      } catch (error) {
        console.error('Failed to parse content blocks JSON:', error);
        return [];
      }
    }
    
    // If it's an object, wrap in array
    if (typeof contentBlocksJson === 'object') {
      return [contentBlocksJson];
    }
    
    return [];
  }, [contentBlocksJson]);

  return <SimpleLessonViewer contentBlocks={contentBlocks} />;
}