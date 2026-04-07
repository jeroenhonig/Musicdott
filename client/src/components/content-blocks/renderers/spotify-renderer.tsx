import React from "react";
import SpotifyEmbed from "@/components/lessons/spotify-embed";
import { NormalizedContentBlock } from "@/utils/content-block-parser";

export default function SpotifyRenderer({ block }: { block: NormalizedContentBlock }) {
  const spotifyData = block.data?.spotify;

  if (!spotifyData) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        No Spotify track data found.
      </div>
    );
  }

  // spotifyData may be a full URL or just a track ID
  const initialSpotifyUrl =
    typeof spotifyData === "string" && spotifyData.includes("spotify.com")
      ? spotifyData
      : `https://open.spotify.com/track/${spotifyData}`;

  return (
    <SpotifyEmbed
      initialSpotifyUrl={initialSpotifyUrl}
      editable={false}
      height={380}
    />
  );
}
