import React, { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import type { NormalizedContentBlock } from '@/utils/content-block-parser';

export default function ImageRenderer({ block }: { block: NormalizedContentBlock }) {
  const [loaded, setLoaded] = useState(false);
  const url = block.data?.url || block.data?.src;
  const alt = block.data?.alt || block.title || 'Image';

  if (!url) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center text-sm text-gray-500">
        No image URL provided.
      </div>
    );
  }

  return (
    <div className="relative rounded-lg overflow-hidden">
      {!loaded && <Skeleton className="w-full h-64" />}
      <img
        src={url}
        alt={alt}
        className={`w-full h-auto rounded-lg object-contain max-h-[600px] transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0 absolute inset-0'}`}
        loading="lazy"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
