import React from "react";
import AppleMusicEmbed from "@/components/songs/apple-music-embed";
import { NormalizedContentBlock } from "@/utils/content-block-parser";

export default function AppleMusicRenderer({ block }: { block: NormalizedContentBlock }) {
  const appleMusicData = block.data?.apple_music;

  // Handle both string and object formats
  const url =
    typeof appleMusicData === "string"
      ? appleMusicData
      : typeof appleMusicData === "object" && appleMusicData !== null
      ? appleMusicData.url
      : undefined;

  if (!url) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        No Apple Music URL found.
      </div>
    );
  }

  const title =
    typeof appleMusicData === "object" && appleMusicData !== null
      ? appleMusicData.title
      : block.title;

  const artist =
    typeof appleMusicData === "object" && appleMusicData !== null
      ? appleMusicData.artist
      : undefined;

  return (
    <AppleMusicEmbed
      url={url}
      title={title}
      artist={artist}
      editable={false}
    />
  );
}
