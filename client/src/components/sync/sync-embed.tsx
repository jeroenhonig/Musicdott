/**
 * Musicdott Sync Embed Component
 * For embedding synchronized video + sheet music from sync.musicdott.app
 */

import { useEffect } from "react";

// Regex to validate sync.musicdott.app URLs
export const SYNC_URL_RE =
  /^https?:\/\/([a-z0-9-]+\.)?sync\.musicdott\.app\/e\/([a-f0-9-]{8,})\/?$/i;

/**
 * Extract src from iframe HTML
 */
export function extractSrcFromIframe(html: string): string | null {
  const m = html.match(/\ssrc\s*=\s*["']([^"']+)["']/i);
  return m ? m[1] : null;
}

/**
 * Normalize various input formats to a clean sync.musicdott.app URL
 */
export function normalizeToSyncUrl(input: string): string | null {
  const trimmed = input.trim();
  
  // Direct URL
  if (SYNC_URL_RE.test(trimmed)) return trimmed;
  
  // iframe with sync URL
  if (/^<iframe[\s\S]*?>/i.test(trimmed)) {
    const src = extractSrcFromIframe(trimmed);
    if (src && SYNC_URL_RE.test(src)) return src;
  }
  
  return null;
}

/**
 * Sync Embed Card Component
 */
type SyncEmbedCardProps = {
  url: string;
  height?: number;
  rounded?: boolean;
  footer?: boolean;
  className?: string;
};

export function SyncEmbedCard({
  url,
  height = 660,
  rounded = true,
  footer = true,
  className = "",
}: SyncEmbedCardProps) {
  const isValid = SYNC_URL_RE.test(url);

  useEffect(() => {
    // Optional: analytics/logging
  }, [url]);

  if (!isValid) {
    return (
      <div className={`rounded-2xl bg-white border border-slate-200 p-3 text-sm text-red-600 ${className}`}>
        Ongeldige Musicdott Sync URL.
        <div className="mt-1 font-mono text-xs text-slate-600">
          Voorbeeld: https://sync.musicdott.app/e/abc123
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden ${className}`}>
      {footer && (
        <div className="px-3 py-2 text-xs uppercase text-slate-500 border-b bg-purple-50">
          Musicdott Sync
        </div>
      )}
      <div className="p-0">
        <iframe
          src={url}
          title="Musicdott Sync"
          style={{
            width: "100%",
            height,
            border: 0,
            borderRadius: rounded ? 16 : 0,
          }}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="fullscreen; clipboard-read; clipboard-write"
        />
      </div>
      {footer && (
        <div className="px-3 py-2 text-xs text-slate-500 border-t">
          Gesynchroniseerde bladmuziek + video. Dubbelklik voor fullscreen.
        </div>
      )}
    </div>
  );
}

/**
 * Auto-embed paste helper
 */
export function handleSyncPasteAutoEmbed(
  e: ClipboardEvent,
  onEmbed: (url: string) => void
) {
  const text = e.clipboardData?.getData("text/plain")?.trim();
  if (!text) return;
  
  const url = normalizeToSyncUrl(text);
  if (url) {
    e.preventDefault();
    onEmbed(url);
  }
}
