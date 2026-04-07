import React from "react";
import { NormalizedContentBlock } from "@/utils/content-block-parser";

export default function YoutubeRenderer({ block }: { block: NormalizedContentBlock }) {
  const videoId = block.videoId || block.data?.youtube || block.data?.videoId;

  if (!videoId) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        No YouTube video ID found.
      </div>
    );
  }

  const embedUrl = `https://www.youtube.com/embed/${videoId}`;

  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg">
      <iframe
        src={embedUrl}
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title={block.title || "YouTube video"}
      />
    </div>
  );
}
