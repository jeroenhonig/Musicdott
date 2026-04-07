import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { detectBlockType, type DetectionResult } from '@/utils/url-block-detector';
import {
  PlayCircle, Video, Music, FileText, ExternalLink,
  Headphones, Link, CheckCircle, AlertCircle, HelpCircle,
  RotateCcw, ArrowRight
} from 'lucide-react';

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  youtube: Video,
  spotify: Music,
  apple_music: Music,
  groovescribe: PlayCircle,
  'sync-embed': PlayCircle,
  flat_embed: FileText,
  pdf: FileText,
  image: FileText,
  audio: Headphones,
  external_link: Link,
};

const CONFIDENCE_CONFIG = {
  certain: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 border-green-200', label: 'Auto-detected' },
  likely: { icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200', label: 'Likely match' },
  unknown: { icon: HelpCircle, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', label: 'Will be added as External Link' },
};

interface SmartPasteInputProps {
  onBlockDetected: (type: string, data: Record<string, unknown>) => void;
  onCancel: () => void;
}

export default function SmartPasteInput({ onBlockDetected, onCancel }: SmartPasteInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [result, setResult] = useState<DetectionResult | null>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setResult(detectBlockType(value));
  }, []);

  const handleConfirm = () => {
    if (!result) return;
    onBlockDetected(result.type, result.prefilledData);
  };

  const handleReset = () => {
    setInputValue('');
    setResult(null);
  };

  const TypeIcon = result ? (TYPE_ICONS[result.type] ?? Link) : null;
  const confidenceConfig = result ? CONFIDENCE_CONFIG[result.confidence] : null;
  const ConfidenceIcon = confidenceConfig?.icon;

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1.5">
          Paste any URL to auto-detect block type
        </label>
        <Textarea
          placeholder="https://www.youtube.com/watch?v=... or https://open.spotify.com/track/..."
          value={inputValue}
          onChange={handleChange}
          className="resize-none"
          rows={3}
          autoFocus
        />
      </div>

      {result && (
        <div className={`rounded-lg border p-4 ${confidenceConfig?.bg}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {TypeIcon && <TypeIcon className={`h-5 w-5 ${confidenceConfig?.color}`} />}
              <span className="font-semibold text-gray-900">{result.displayLabel}</span>
            </div>
            {ConfidenceIcon && (
              <Badge
                variant="outline"
                className={`text-xs ${confidenceConfig?.color} border-current`}
              >
                <ConfidenceIcon className="h-3 w-3 mr-1" />
                {confidenceConfig?.label}
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-500 truncate">{inputValue}</p>
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={handleReset} disabled={!inputValue}>
          <RotateCcw className="h-3 w-3 mr-1" />
          Clear
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleConfirm}
          disabled={!result}
          className="gap-1"
        >
          Add Block
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
