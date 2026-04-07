import type { NormalizedContentBlock } from '@/utils/content-block-parser';
import { Headphones } from 'lucide-react';

export default function AudioRenderer({ block }: { block: NormalizedContentBlock }) {
  const url = block.data?.url || block.data?.src;
  const title = block.data?.title || block.title || 'Audio';

  if (!url) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center text-sm text-gray-500">
        No audio URL provided.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-teal-700 bg-teal-50 rounded-lg px-4 py-2">
        <Headphones className="h-4 w-4 flex-shrink-0" />
        <span className="text-sm font-medium truncate">{title}</span>
      </div>
      <audio
        controls
        className="w-full rounded-lg"
        preload="metadata"
      >
        <source src={url} />
        <p className="text-sm text-gray-500">
          Your browser doesn't support audio.{' '}
          <a href={url} target="_blank" rel="noopener noreferrer" className="underline">
            Download the file
          </a>
        </p>
      </audio>
    </div>
  );
}
