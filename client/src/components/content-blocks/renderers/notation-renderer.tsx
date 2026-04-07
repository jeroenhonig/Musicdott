import React, { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { NormalizedContentBlock } from "@/utils/content-block-parser";

const MusicNotationContentBlock = lazy(() =>
  import("@/components/music-notation/music-notation-content-block").then((m) => ({
    default: m.MusicNotationContentBlock,
  }))
);

function LoadingSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function NotationRenderer({ block }: { block: NormalizedContentBlock }) {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <MusicNotationContentBlock
        type={block.type as any}
        title={block.title}
        description={block.description}
        content={block.content || block.data?.content}
        scoreId={block.scoreId || block.data?.scoreId}
      />
    </Suspense>
  );
}
