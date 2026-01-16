/**
 * GrooveScribe Integration Component
 * Embeds interactive drum patterns from GrooveScribe
 */

import { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  Settings, 
  Copy,
  ExternalLink,
  Music
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GrooveEmbedProps {
  grooveData?: string; // Base64 encoded groove data
  title?: string;
  bpm?: number;
  bars?: number;
  width?: number;
  height?: number;
  showControls?: boolean;
  autoPlay?: boolean;
  className?: string;
  onGrooveChange?: (grooveData: string) => void;
}

interface GrooveScribeConfig {
  groove: string;
  bpm: number;
  bars: number;
  showControls: boolean;
  autoPlay: boolean;
}

export function GrooveEmbed({
  grooveData = "",
  title = "Drum Pattern",
  bpm = 120,
  bars = 4,
  width = 800,
  height = 400,
  showControls = true,
  autoPlay = false,
  className = "",
  onGrooveChange
}: GrooveEmbedProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBpm, setCurrentBpm] = useState(bpm);
  const [currentBars, setCurrentBars] = useState(bars);
  const [isLoaded, setIsLoaded] = useState(false);
  const [grooveUrl, setGrooveUrl] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();

  // Generate GrooveScribe embed URL based on authentic GrooveScribe structure
  useEffect(() => {
    // Use the real GrooveScribe endpoint with proper data encoding
    const baseUrl = "https://teacher.musicdott.com/groovescribe/";
    
    // Build authentic GrooveScribe URL parameters based on the source code
    let params = "";
    if (grooveData) {
      // If grooveData is already URL-encoded GrooveScribe data, use it directly
      params = grooveData.startsWith('?') ? grooveData : `?${grooveData}`;
    } else {
      // Create default pattern
      params = `?TimeSig=${encodeURIComponent("4/4")}&Div=16&Tempo=${currentBpm}&Measures=${currentBars}&H=|xxxxxxxxxxxxxxxx|&S=|----O-------O---|&K=|o-------o-------|`;
    }
    
    setGrooveUrl(`${baseUrl}${params}`);
  }, [grooveData, currentBpm, currentBars, showControls, autoPlay]);

  // Handle iframe load
  const handleIframeLoad = () => {
    setIsLoaded(true);
    if (autoPlay) {
      setIsPlaying(true);
    }
  };

  // Send commands to GrooveScribe iframe
  const sendCommand = (command: string, data?: any) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'groovescribe-command',
        command,
        data
      }, '*');
    }
  };

  // Handle play/pause
  const handlePlayPause = () => {
    if (isPlaying) {
      sendCommand('pause');
      setIsPlaying(false);
    } else {
      sendCommand('play');
      setIsPlaying(true);
    }
  };

  // Handle BPM change
  const handleBpmChange = (newBpm: number) => {
    setCurrentBpm(newBpm);
    sendCommand('setBpm', newBpm);
  };

  // Handle bars change
  const handleBarsChange = (newBars: number) => {
    setCurrentBars(newBars);
    sendCommand('setBars', newBars);
  };

  // Reset to beginning
  const handleReset = () => {
    sendCommand('reset');
    setIsPlaying(false);
  };

  // Copy groove data
  const handleCopyGroove = async () => {
    try {
      // Request groove data from iframe
      sendCommand('getGrooveData');
      
      // In real implementation, would receive response via postMessage
      await navigator.clipboard.writeText(grooveData || "");
      
      toast({
        title: "Groove Copied",
        description: "Groove pattern data copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy groove data",
        variant: "destructive"
      });
    }
  };

  // Open in new tab
  const handleOpenExternal = () => {
    window.open(grooveUrl, '_blank');
  };

  // Listen for messages from GrooveScribe iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'groovescribe-event') {
        const { event: eventType, data } = event.data;
        
        switch (eventType) {
          case 'groove-changed':
            if (onGrooveChange && data?.grooveData) {
              onGrooveChange(data.grooveData);
            }
            break;
          case 'playback-started':
            setIsPlaying(true);
            break;
          case 'playback-stopped':
            setIsPlaying(false);
            break;
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onGrooveChange]);

  return (
    <Card className={`groove-embed ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-lg">{title}</CardTitle>
            <Badge variant="secondary" className="text-xs">
              GrooveScribe
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyGroove}
              disabled={!isLoaded}
            >
              <Copy className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenExternal}
              disabled={!isLoaded}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Control Panel */}
        {showControls && (
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePlayPause}
                disabled={!isLoaded}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={!isLoaded}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-8" />

            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">BPM:</Label>
              <Input
                type="number"
                value={currentBpm}
                onChange={(e) => handleBpmChange(parseInt(e.target.value) || 120)}
                min={60}
                max={200}
                className="w-20 h-8"
                disabled={!isLoaded}
              />
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Bars:</Label>
              <Input
                type="number"
                value={currentBars}
                onChange={(e) => handleBarsChange(parseInt(e.target.value) || 4)}
                min={1}
                max={16}
                className="w-20 h-8"
                disabled={!isLoaded}
              />
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {isPlaying && (
                <Badge variant="default" className="animate-pulse">
                  Playing
                </Badge>
              )}
              
              {!isLoaded && (
                <Badge variant="secondary">
                  Loading...
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* GrooveScribe Iframe */}
        <div className="relative overflow-hidden rounded-lg border bg-white">
          <iframe
            ref={iframeRef}
            src={grooveUrl}
            width={width}
            height={height}
            frameBorder="0"
            allowFullScreen
            onLoad={handleIframeLoad}
            className="w-full"
            title={`GrooveScribe: ${title}`}
          />
          
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <Music className="h-12 w-12 mx-auto mb-3 text-gray-400 animate-pulse" />
                <p className="text-sm text-gray-600">Loading GrooveScribe...</p>
              </div>
            </div>
          )}
        </div>

        {/* Pattern Info */}
        <div className="text-sm text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>Tempo:</span>
            <span className="font-medium">{currentBpm} BPM</span>
          </div>
          <div className="flex justify-between">
            <span>Length:</span>
            <span className="font-medium">{currentBars} bars</span>
          </div>
          {grooveData && (
            <div className="flex justify-between">
              <span>Pattern:</span>
              <span className="font-mono text-xs">
                {grooveData.substring(0, 20)}...
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Simplified version for inline use
export function GrooveEmbedSimple({
  grooveData,
  title = "Pattern",
  bpm = 120,
  className = ""
}: {
  grooveData?: string;
  title?: string;
  bpm?: number;
  className?: string;
}) {
  // Use authentic GrooveScribe URL structure
  const baseUrl = "https://teacher.musicdott.com/groovescribe/";
  
  let params = "";
  if (grooveData) {
    params = grooveData.startsWith('?') ? grooveData : `?${grooveData}`;
  } else {
    // Default basic rock pattern from GrooveScribe source
    params = `?TimeSig=4/4&Div=16&Tempo=${bpm}&Measures=1&H=|xxxxxxxxxxxxxxxx|&S=|----O-------O---|&K=|o-------o-------|`;
  }

  return (
    <div className={`groove-embed-simple ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <Music className="h-4 w-4 text-orange-600" />
        <span className="text-sm font-medium">{title}</span>
        <Badge variant="outline" className="text-xs">
          GrooveScribe
        </Badge>
      </div>
      
      <iframe
        src={`${baseUrl}${params}`}
        width="100%"
        height="300"
        frameBorder="0"
        className="rounded border"
        title={`GrooveScribe: ${title}`}
      />
    </div>
  );
}