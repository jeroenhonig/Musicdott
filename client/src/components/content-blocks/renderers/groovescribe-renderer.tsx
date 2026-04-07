import React from "react";
import GrooveEmbed from "@/components/lessons/groove-embed";
import { NormalizedContentBlock } from "@/utils/content-block-parser";

export default function GroovescribeRenderer({ block }: { block: NormalizedContentBlock }) {
  const initialGrooveParams =
    block.pattern ||
    block.data?.pattern ||
    block.data?.groovescribe ||
    block.data?.groove;

  if (!initialGrooveParams) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        No groove pattern data found.
      </div>
    );
  }

  return (
    <GrooveEmbed
      initialGrooveParams={initialGrooveParams}
      editable={false}
      height={300}
    />
  );
}
