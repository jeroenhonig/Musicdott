import type { NormalizedContentBlock } from '@/utils/content-block-parser';

export default function UnknownBlockRenderer({ block }: { block: NormalizedContentBlock }) {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <p className="text-sm text-yellow-800">
        Content type "<strong>{block.type}</strong>" is not currently supported.
      </p>
      {block.description && (
        <p className="text-sm text-yellow-600 mt-2">{block.description}</p>
      )}
    </div>
  );
}
