import React from 'react';
import { parseContentBlocks } from '@/utils/content-block-parser';
import UnifiedContentBlockViewer from '@/components/content-blocks/unified-content-block-viewer';

interface SongContentViewerProps {
  contentBlocksJson?: string | any[] | any;
  contentBlocks?: any[];
}

export default function SongContentViewer({ contentBlocksJson, contentBlocks }: SongContentViewerProps) {
  const normalizedBlocks = React.useMemo(() => {
    if (contentBlocks) {
      return parseContentBlocks(contentBlocks);
    }
    if (!contentBlocksJson) return [];
    if (Array.isArray(contentBlocksJson)) {
      return parseContentBlocks(contentBlocksJson);
    }
    if (typeof contentBlocksJson === 'string') {
      try {
        const parsed = JSON.parse(contentBlocksJson);
        return parseContentBlocks(Array.isArray(parsed) ? parsed : [parsed]);
      } catch {
        return [];
      }
    }
    if (typeof contentBlocksJson === 'object') {
      return parseContentBlocks([contentBlocksJson]);
    }
    return [];
  }, [contentBlocksJson, contentBlocks]);

  return <UnifiedContentBlockViewer blocks={normalizedBlocks} context="song" />;
}
