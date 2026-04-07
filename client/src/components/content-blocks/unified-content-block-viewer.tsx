import React, { Suspense, lazy } from 'react';
import { BlockContext, type BlockViewerContext } from './block-context';
import { BLOCK_REGISTRY } from './block-registry';
import BlockShell from './block-shell';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText } from 'lucide-react';
import type { NormalizedContentBlock } from '@/utils/content-block-parser';

const UnknownBlockRenderer = lazy(() => import('./renderers/unknown-block-renderer'));

interface UnifiedContentBlockViewerProps {
  blocks: NormalizedContentBlock[];
  context?: BlockViewerContext;
}

export default function UnifiedContentBlockViewer({
  blocks,
  context = 'lesson',
}: UnifiedContentBlockViewerProps) {
  if (!blocks.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-40" />
        <p className="text-sm">No content available.</p>
      </div>
    );
  }

  return (
    <BlockContext.Provider value={context}>
      <div className="space-y-4 max-w-4xl mx-auto">
        {blocks.map((block) => {
          const registration = BLOCK_REGISTRY[block.type];
          const Renderer = registration?.component ?? UnknownBlockRenderer;
          const icon = registration?.icon ?? FileText;
          const accentColor = registration?.accentColor ?? 'text-gray-600';
          const accentBorder = registration?.accentBorder ?? 'border-gray-200';
          const borderLeft = registration?.borderLeft ?? 'border-l-gray-400';

          return (
            <BlockShell
              key={block.id}
              title={block.title}
              description={block.description}
              icon={icon}
              accentColor={accentColor}
              accentBorder={accentBorder}
              borderLeft={borderLeft}
              id={`block-${block.id}`}
            >
              <Suspense fallback={<Skeleton className="h-32 w-full" />}>
                <Renderer block={block} />
              </Suspense>
            </BlockShell>
          );
        })}
      </div>
    </BlockContext.Provider>
  );
}
