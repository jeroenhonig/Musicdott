import type { NormalizedContentBlock } from '@/utils/content-block-parser';
import { Badge } from '@/components/ui/badge';

// Detects if a line is primarily chord symbols
function isChordLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  // A chord line consists mostly of chord names (letter + optional accidental + optional suffix)
  return /^([A-G][#b]?(?:m|maj|min|dim|aug|sus|add|[0-9]|\/[A-G][#b]?)*\s*)+$/.test(trimmed);
}

export default function ChordChartRenderer({ block }: { block: NormalizedContentBlock }) {
  const content = block.content || block.data?.content;
  const key = block.data?.key;

  if (!content) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center text-sm text-gray-500">
        No chord chart content provided.
      </div>
    );
  }

  const lines = content.split('\n');

  return (
    <div className="space-y-2">
      {key && (
        <div className="mb-3">
          <Badge variant="outline" className="text-amber-700 border-amber-300">
            Key: {key}
          </Badge>
        </div>
      )}
      <div className="font-mono text-sm bg-gray-50 rounded-lg p-4 overflow-x-auto">
        {lines.map((line: string, i: number) => {
          if (!line.trim()) {
            return <div key={i} className="h-3" />;
          }
          if (isChordLine(line)) {
            return (
              <div key={i} className="text-amber-600 font-semibold text-xs leading-5 whitespace-pre">
                {line}
              </div>
            );
          }
          return (
            <div key={i} className="text-gray-800 leading-6 whitespace-pre">
              {line}
            </div>
          );
        })}
      </div>
    </div>
  );
}
