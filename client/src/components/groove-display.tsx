import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ZoomIn, ZoomOut, PlayCircle, ExternalLink } from "lucide-react";

interface GrooveDisplayProps {
  pattern: string;
  title?: string;
  className?: string;
}

export default function GrooveDisplay({ pattern, title, className }: GrooveDisplayProps) {
  const [zoom, setZoom] = useState(75);
  
  // Ensure pattern starts with ? for proper URL construction
  const cleanPattern = pattern.startsWith('?') ? pattern : `?${pattern}`;
  const grooveUrl = `https://teacher.musicdott.com/groovescribe/GrooveEmbed.html${cleanPattern}`;
  
  const handleZoomIn = () => {
    setZoom(prev => Math.min(100, prev + 15));
  };
  
  const handleZoomOut = () => {
    setZoom(prev => Math.max(45, prev - 15));
  };
  
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <PlayCircle className="h-5 w-5" />
            {title || "GrooveScribe Pattern"}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoom <= 45}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium w-12 text-center">{zoom}%</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoom >= 100}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border-2 border-dashed border-blue-200 p-8 text-center">
          <div className="space-y-4">
            <PlayCircle className="h-16 w-16 text-blue-500 mx-auto" />
            <h3 className="text-xl font-semibold text-gray-800">Interactive GrooveScribe Pattern</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Click below to open the authentic GrooveScribe pattern from your original MusicDott 1.0 data. 
              The pattern includes interactive notation, playback controls, and sticking indicators.
            </p>
            
            <div className="space-y-3">
              <Button
                onClick={() => window.open(grooveUrl, '_blank', 'noopener,noreferrer')}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
                size="lg"
              >
                <PlayCircle className="h-5 w-5" />
                Open GrooveScribe Pattern
              </Button>
              
              <div className="text-sm text-gray-500">
                Pattern will open in new tab with full interactive controls
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-white/80 rounded-lg border border-gray-200">
              <div className="text-sm font-medium text-gray-700 mb-2">Pattern Preview Info:</div>
              <div className="text-xs text-gray-600 space-y-1">
                <div>Time Signature: 4/4 • Tempo: 80 BPM</div>
                <div>Stickings: R-L-R-R-L-R-L-L-R-L-R-R-L-R-L-L</div>
                <div>Contains: Hi-Hat, Snare, Kick patterns with stick notation</div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-2 text-sm text-gray-600 space-y-2">
          <div>
            <strong>Pattern URL:</strong>{' '}
            <a 
              href={grooveUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline break-all"
            >
              {grooveUrl}
            </a>
          </div>
          <div>Interactive drum pattern from original MusicDott 1.0 data - Click to play and practice</div>
          <div className="text-xs text-gray-500">
            If iframe doesn't load, click "Open in New Tab" or the URL above
          </div>
        </div>
      </CardContent>
    </Card>
  );
}