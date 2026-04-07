import React, { useEffect, useState } from 'react';
import { ExternalLink, Link } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { NormalizedContentBlock } from '@/utils/content-block-parser';

interface OgMeta {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

export default function RichLinkRenderer({ block }: { block: NormalizedContentBlock }) {
  const url = block.data?.url;
  const [meta, setMeta] = useState<OgMeta>({
    title: block.data?.title || block.title,
    description: block.data?.description || block.description,
    image: block.data?.image,
  });
  const [loading, setLoading] = useState(!meta.title && !!url);

  useEffect(() => {
    if (!url || meta.title) return;

    setLoading(true);
    fetch(`/api/og-meta?url=${encodeURIComponent(url)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) setMeta(data);
      })
      .catch(() => {/* silent fail */})
      .finally(() => setLoading(false));
  }, [url]);

  if (!url) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center text-sm text-gray-500">
        No URL provided.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="border rounded-lg p-4 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block border rounded-lg overflow-hidden hover:border-sky-300 hover:shadow-md transition-all duration-200 group no-underline"
    >
      <div className="flex gap-4 p-4">
        {meta.image && (
          <div className="flex-shrink-0 w-24 h-16 rounded overflow-hidden bg-gray-100">
            <img
              src={meta.image}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 text-sm truncate group-hover:text-sky-600 transition-colors">
            {meta.title || getDomain(url)}
          </div>
          {meta.description && (
            <div className="text-xs text-gray-500 mt-1 line-clamp-2">{meta.description}</div>
          )}
          <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
            <Link className="h-3 w-3" />
            <span>{getDomain(url)}</span>
          </div>
        </div>
        <ExternalLink className="h-4 w-4 text-gray-400 flex-shrink-0 mt-1 group-hover:text-sky-500 transition-colors" />
      </div>
    </a>
  );
}
