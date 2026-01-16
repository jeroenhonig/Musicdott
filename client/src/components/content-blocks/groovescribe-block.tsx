/**
 * GrooveScribe Content Block - Embeds interactive drum patterns
 * Used in lessons, songs, and assignments
 */

import { useState } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GrooveEmbed, GrooveEmbedSimple } from "@/components/groovescribe/groove-embed";
import { 
  Music, 
  Edit, 
  Copy, 
  ExternalLink,
  Play,
  Pause
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GrooveScribeBlockProps {
  id: string;
  title?: string;
  description?: string;
  grooveData: string;
  bpm?: number;
  bars?: number;
  timeSignature?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  tags?: string[];
  showControls?: boolean;
  embedded?: boolean; // If true, use simple embed
  onEdit?: () => void;
  onDelete?: () => void;
}

const DIFFICULTY_COLORS = {
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-yellow-100 text-yellow-800', 
  advanced: 'bg-red-100 text-red-800'
};

export function GrooveScribeBlock({
  id,
  title = "Drum Pattern",
  description,
  grooveData,
  bpm = 120,
  bars = 4,
  timeSignature = "4/4",
  difficulty = "beginner",
  tags = [],
  showControls = true,
  embedded = false,
  onEdit,
  onDelete
}: GrooveScribeBlockProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const { toast } = useToast();

  const handleCopyGroove = async () => {
    try {
      const grooveUrl = `https://teacher.musicdott.com/groovescribe/?${grooveData}`;
      await navigator.clipboard.writeText(grooveUrl);
      
      toast({
        title: "Groove URL Copied",
        description: "GrooveScribe URL copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy groove URL",
        variant: "destructive"
      });
    }
  };

  const handleOpenInGrooveScribe = () => {
    const grooveUrl = `https://teacher.musicdott.com/groovescribe/?${grooveData}`;
    window.open(grooveUrl, '_blank');
  };

  const handlePlayToggle = () => {
    setIsPlaying(!isPlaying);
    // This would integrate with the GrooveScribe player
    const iframe = document.querySelector(`iframe[title*="${title}"]`) as HTMLIFrameElement | null;
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'groovescribe-command',
        command: isPlaying ? 'pause' : 'play'
      }, '*');
    }
  };

  // Simple embedded version for inline use
  if (embedded) {
    return (
      <div className="groove-block-embedded">
        <GrooveEmbedSimple
          grooveData={grooveData}
          title={title}
          bpm={bpm}
          className="mb-4"
        />
        {description && (
          <p className="text-sm text-gray-600 mt-2">{description}</p>
        )}
      </div>
    );
  }

  // Full content block version
  return (
    <Card className="groove-scribe-block">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Music className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-lg">{title}</CardTitle>
              <Badge variant="outline" className="text-xs">
                GrooveScribe
              </Badge>
            </div>
            
            {description && (
              <p className="text-sm text-gray-600 mb-3">{description}</p>
            )}
            
            {/* Pattern Metadata */}
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span>{timeSignature} time</span>
              <span>•</span>
              <span>{bpm} BPM</span>
              <span>•</span>
              <span>{bars} bars</span>
              <span>•</span>
              <Badge className={DIFFICULTY_COLORS[difficulty]} variant="outline">
                {difficulty}
              </Badge>
            </div>
            
            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePlayToggle}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyGroove}
            >
              <Copy className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenInGrooveScribe}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <GrooveEmbed
          grooveData={grooveData}
          title={title}
          bpm={bpm}
          bars={bars}
          showControls={showControls}
        />
      </CardContent>
    </Card>
  );
}