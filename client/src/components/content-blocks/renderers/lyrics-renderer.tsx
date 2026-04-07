import type { NormalizedContentBlock } from '@/utils/content-block-parser';

function isChordLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return /^([A-G][#b]?(?:m|maj|min|dim|aug|sus|add|[0-9]|\/[A-G][#b]?)*\s*)+$/.test(trimmed);
}

export default function LyricsRenderer({ block }: { block: NormalizedContentBlock }) {
  const content = block.content || block.data?.content;

  if (!content) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center text-sm text-gray-500">
        No lyrics content provided.
      </div>
    );
  }

  const lines = content.split('\n');

  return (
    <div className="bg-gray-50 rounded-lg p-6 space-y-0">
      <div className="font-sans text-sm leading-7">
        {lines.map((line: string, i: number) => {
          if (!line.trim()) {
            return <div key={i} className="h-4" />;
          }
          if (isChordLine(line)) {
            return (
              <div key={i} className="text-rose-500 font-semibold text-xs leading-4 tracking-wide whitespace-pre">
                {line}
              </div>
            );
          }
          return (
            <div key={i} className="text-gray-800 whitespace-pre">
              {line}
            </div>
          );
        })}
      </div>
    </div>
  );
}
