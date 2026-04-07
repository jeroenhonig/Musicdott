/**
 * DisplayBlockRenderer
 *
 * Renders a single lesson content block on the display screen (student's second monitor).
 * Layout is full-width, minimal, no navigation — optimised for readability at a distance.
 *
 * YouTube blocks use SyncedYouTubePlayer for real-time sync with the teacher.
 * All other block types reuse existing rendering patterns from SimpleLessonViewer.
 */

import React, { lazy, Suspense } from "react";
import { parseYouTubeVideoId } from "@/utils/content-block-parser";
import SyncedYouTubePlayer from "./synced-youtube-player";
import GrooveEmbed from "@/components/lessons/groove-embed";
import type { ContentBlockContract } from "@shared/display-events";
import type { DisplayEventName, DisplayYtSyncPayload } from "@shared/display-events";

const MusicNotationContentBlock = lazy(
  () => import("@/components/music-notation/music-notation-content-block")
);

interface DisplayBlockRendererProps {
  block: ContentBlockContract;
  role: "teacher" | "display";
  onEmit: (eventName: DisplayEventName, payload: Omit<DisplayYtSyncPayload, "sessionId">) => void;
  incomingYtEvent: { eventName: DisplayEventName; payload: DisplayYtSyncPayload } | null;
  onIncomingConsumed: () => void;
}

export default function DisplayBlockRenderer({
  block,
  role,
  onEmit,
  incomingYtEvent,
  onIncomingConsumed,
}: DisplayBlockRendererProps) {
  const type = block.type as string;

  // YouTube / video blocks — synced playback
  if (type === "youtube" || type === "video") {
    const rawVideo =
      (block as any).data?.video ||
      (block as any).data?.youtube ||
      (block as any).data?.videoId ||
      block.url ||
      block.videoId ||
      block.content;

    const videoId = typeof rawVideo === "string" ? parseYouTubeVideoId(rawVideo) : null;
    if (!videoId) {
      return <BlockPlaceholder label={block.title || "Video"} note="No video ID found" />;
    }

    return (
      <div className="w-full">
        {block.title && (
          <h2 className="text-2xl font-semibold mb-4 text-white">{block.title}</h2>
        )}
        <div className="aspect-video w-full rounded-xl overflow-hidden shadow-2xl">
          <SyncedYouTubePlayer
            videoId={videoId}
            role={role}
            onEmit={onEmit}
            incomingEvent={incomingYtEvent}
            onIncomingConsumed={onIncomingConsumed}
            className="w-full h-full"
          />
        </div>
        {block.description && (
          <p className="mt-4 text-gray-300 text-lg">{block.description}</p>
        )}
      </div>
    );
  }

  // Text blocks
  if (type === "text") {
    const text = block.content || (block as any).text || (block as any).data?.text || "";
    return (
      <div className="w-full max-w-4xl mx-auto">
        {block.title && (
          <h2 className="text-3xl font-bold mb-6 text-white">{block.title}</h2>
        )}
        <div className="text-xl text-gray-100 leading-relaxed whitespace-pre-wrap">{text}</div>
      </div>
    );
  }

  // GrooveScribe patterns
  if (type === "groovescribe" || type === "groove") {
    const pattern =
      block.pattern ||
      (block as any).data?.pattern ||
      (block as any).data?.groovescribe ||
      block.content;
    if (!pattern) {
      return <BlockPlaceholder label={block.title || "Groove pattern"} note="No pattern data" />;
    }
    return (
      <div className="w-full">
        {block.title && (
          <h2 className="text-2xl font-semibold mb-4 text-white">{block.title}</h2>
        )}
        <div className="bg-white rounded-xl overflow-hidden shadow-2xl">
          <GrooveEmbed initialGrooveParams={pattern} editable={false} height={360} />
        </div>
      </div>
    );
  }

  // PDF
  if (type === "pdf") {
    const url = block.url || (block as any).data?.url;
    if (!url) return <BlockPlaceholder label={block.title || "PDF"} note="No URL" />;
    return (
      <div className="w-full h-[70vh]">
        {block.title && (
          <h2 className="text-2xl font-semibold mb-4 text-white">{block.title}</h2>
        )}
        <iframe
          src={url}
          title={block.title || "PDF"}
          className="w-full h-full rounded-xl shadow-2xl"
        />
      </div>
    );
  }

  // Spotify
  if (type === "spotify") {
    const rawTrack =
      (block as any).trackId ||
      (block as any).data?.spotify ||
      block.url ||
      block.content;
    if (!rawTrack) return <BlockPlaceholder label={block.title || "Spotify"} note="No track" />;
    const match = String(rawTrack).match(/track\/([A-Za-z0-9]+)/);
    const trackId = match ? match[1] : rawTrack;
    return (
      <div className="w-full">
        {block.title && (
          <h2 className="text-2xl font-semibold mb-4 text-white">{block.title}</h2>
        )}
        <iframe
          src={`https://open.spotify.com/embed/track/${trackId}?utm_source=generator`}
          title={block.title || "Spotify Track"}
          className="w-full rounded-xl shadow-2xl"
          style={{ height: 352 }}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
      </div>
    );
  }

  // Music notation (sheet music, tablature, abc, flat)
  if (
    type === "sheet_music" ||
    type === "tablature" ||
    type === "abc_notation" ||
    type === "flat_embed" ||
    type === "speech_to_note"
  ) {
    return (
      <div className="w-full bg-white rounded-xl p-4 shadow-2xl">
        {block.title && (
          <h2 className="text-xl font-semibold mb-3 text-gray-800">{block.title}</h2>
        )}
        <Suspense fallback={<div className="text-gray-400">Loading notation…</div>}>
          <MusicNotationContentBlock block={block} editable={false} />
        </Suspense>
      </div>
    );
  }

  // Generic fallback
  return (
    <BlockPlaceholder
      label={block.title || type}
      note={`Content type: ${type}`}
    />
  );
}

function BlockPlaceholder({ label, note }: { label: string; note?: string }) {
  return (
    <div className="w-full flex flex-col items-center justify-center py-16 text-center">
      <p className="text-4xl font-bold text-white mb-4">{label}</p>
      {note && <p className="text-gray-400 text-lg">{note}</p>}
    </div>
  );
}
