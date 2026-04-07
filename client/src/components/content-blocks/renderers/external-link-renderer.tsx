import React from "react";
import ExternalLinkEmbed from "@/components/lessons/external-link-embed";
import { NormalizedContentBlock } from "@/utils/content-block-parser";

export default function ExternalLinkRenderer({ block }: { block: NormalizedContentBlock }) {
  const externalLinkData = block.data?.external_link;

  // Fall back to a minimal link object if no structured data exists
  const initialLinkData = externalLinkData || (block.data?.url
    ? { url: block.data.url, title: block.title || block.data.url }
    : undefined);

  if (!initialLinkData) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        No external link data found.
      </div>
    );
  }

  return (
    <ExternalLinkEmbed
      initialLinkData={initialLinkData}
      onSave={() => {}}
      editable={false}
    />
  );
}
