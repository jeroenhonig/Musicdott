import React from "react";
import { SyncEmbedCard } from "@/components/sync/sync-embed";
import { NormalizedContentBlock } from "@/utils/content-block-parser";

export default function SyncEmbedRenderer({ block }: { block: NormalizedContentBlock }) {
  const url = block.data?.sync;

  if (!url) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        No sync embed URL found.
      </div>
    );
  }

  return <SyncEmbedCard url={url} height={600} />;
}
