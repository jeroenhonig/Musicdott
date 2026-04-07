import UnifiedContentBlockViewer from '@/components/content-blocks/unified-content-block-viewer';
import type { NormalizedContentBlock } from '@/utils/content-block-parser';

interface SimpleLessonViewerProps {
  contentBlocks: NormalizedContentBlock[];
}

export default function SimpleLessonViewer({ contentBlocks }: SimpleLessonViewerProps) {
  return <UnifiedContentBlockViewer blocks={contentBlocks} context="lesson" />;
}
