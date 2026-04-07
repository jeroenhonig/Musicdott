import React from "react";
import { NormalizedContentBlock } from "@/utils/content-block-parser";

export default function TextRenderer({ block }: { block: NormalizedContentBlock }) {
  const text = block.content || block.data?.text;

  if (!text) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        No text content found.
      </div>
    );
  }

  const lines = text.split("\n");

  return (
    <div className="bg-gray-50 p-6 rounded-lg prose prose-sm max-w-none">
      {lines.map((line: string, index: number) => (
        <p key={index} className="m-0 min-h-[1.25rem]">
          {line || "\u00A0"}
        </p>
      ))}
    </div>
  );
}
