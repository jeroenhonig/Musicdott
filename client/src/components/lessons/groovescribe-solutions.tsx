import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, RefreshCw } from 'lucide-react';

interface GrooveScribeSolutionsProps {
  initialGrooveParams?: string;
  onSave?: (grooveParams: string) => void;
  editable?: boolean;
  height?: number;
}

export default function GrooveScribeSolutions({ 
  initialGrooveParams, 
  onSave, 
  editable = false,
  height = 240
}: GrooveScribeSolutionsProps) {
  const [grooveParams, setGrooveParams] = useState<string>(initialGrooveParams || "");
  const [svgEmbedUrl, setSvgEmbedUrl] = useState<string>("");
  const [currentMethod, setCurrentMethod] = useState<'iframe' | 'svg' | 'direct'>('svg');
  const [isLoading, setIsLoading] = useState(false);

  // Convert GrooveScribe pattern to different embed formats
  const convertToEmbedFormats = (params: string) => {
    if (!params) return;
    
    // Method 1: SVG Converter (notion-drum-sheet)
    const originalUrl = `https://www.mikeslessons.com/groove/${params}`;
    const svgConverterUrl = `https://sonpham.me/notion-drum-sheet/render.html${params}&EmbedTempoTimeSig=true`;
    setSvgEmbedUrl(svgConverterUrl);
    
    console.log("🔄 Converting GrooveScribe:", {
      originalPattern: params,
      originalUrl,
      svgConverterUrl
    });
  };

  useEffect(() => {
    if (grooveParams) {
      convertToEmbedFormats(grooveParams);
    }
  }, [grooveParams]);

  useEffect(() => {
    if (initialGrooveParams) {
      setGrooveParams(initialGrooveParams);
    }
  }, [initialGrooveParams]);

  const handlePatternInput = (inputValue: string) => {
    let cleanParams = inputValue;
    
    // Extract pattern from full URL
    if (inputValue.includes('mikeslessons.com/groove') || inputValue.includes('teacher.musicdott.com')) {
      const questionMarkIndex = inputValue.indexOf('?');
      if (questionMarkIndex !== -1) {
        cleanParams = inputValue.substring(questionMarkIndex);
      }
    }
    
    // Ensure starts with ?
    if (!cleanParams.startsWith('?')) {
      cleanParams = '?' + cleanParams;
    }
    
    setGrooveParams(cleanParams);
    if (onSave) {
      onSave(cleanParams);
    }
  };

  const renderSVGEmbed = () => {
    if (!svgEmbedUrl) return null;
    
    return (
      <div className="w-full border rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 flex items-center justify-between">
          <Badge variant="secondary" className="text-xs">
            SVG Embed (Scalable)
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(svgEmbedUrl, '_blank')}
            className="h-6 px-2 text-xs"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Open Full
          </Button>
        </div>
        <iframe
          src={svgEmbedUrl}
          width="100%"
          height={height}
          frameBorder="0"
          title="GrooveScribe SVG Embed"
          className="w-full bg-white"
          onLoad={() => console.log('✅ SVG embed loaded successfully')}
          onError={() => console.error('❌ SVG embed failed to load')}
        />
      </div>
    );
  };

  const renderAlternativeIframe = () => {
    if (!grooveParams) return null;
    
    // Try multiple hosts
    const hosts = [
      'https://sonph.github.io/notion-drum-sheet/render.html',
      'https://montulli.github.io/GrooveScribe/GrooveEmbed.html',
      'https://www.mikeslessons.com/groove/'
    ];
    
    return (
      <div className="space-y-3">
        {hosts.map((host, index) => (
          <div key={index} className="w-full border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 flex items-center justify-between">
              <Badge variant="outline" className="text-xs">
                Host {index + 1}: {new URL(host).hostname}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(host + grooveParams, '_blank')}
                className="h-6 px-2 text-xs"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Test
              </Button>
            </div>
            <iframe
              src={host + grooveParams}
              width="100%"
              height={height}
              frameBorder="0"
              title={`GrooveScribe Embed ${index + 1}`}
              className="w-full bg-white"
              onLoad={() => console.log(`✅ Host ${index + 1} loaded successfully`)}
              onError={() => console.error(`❌ Host ${index + 1} failed to load`)}
            />
          </div>
        ))}
      </div>
    );
  };

  const renderDirectNotation = () => {
    if (!grooveParams) return null;
    
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="text-lg font-semibold">Direct Pattern Display</div>
            <div className="bg-gray-100 p-4 rounded-lg font-mono text-sm">
              {grooveParams}
            </div>
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                onClick={() => window.open(`https://www.mikeslessons.com/groove/${grooveParams}`, '_blank')}
                className="text-xs"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Edit in GrooveScribe
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(`https://sonpham.me/notion-drum-sheet?url=https://www.mikeslessons.com/groove/${grooveParams}`, '_blank')}
                className="text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Convert to SVG
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="w-full space-y-4">
      {editable && (
        <div className="space-y-3">
          <div>
            <Label htmlFor="groove-pattern" className="text-sm font-medium">
              GrooveScribe Pattern
            </Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="groove-pattern"
                placeholder="?TimeSig=4/4&Div=16&Tempo=120&H=|X-X-X-X-|&S=|--X---X-|&K=|X---X-X-|"
                value={grooveParams}
                onChange={(e) => handlePatternInput(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={() => setIsLoading(!isLoading)}
                className="px-3"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Paste a GrooveScribe pattern or full URL from mikeslessons.com/groove
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={currentMethod === 'svg' ? 'default' : 'outline'}
              onClick={() => setCurrentMethod('svg')}
              className="text-xs"
            >
              SVG Embed
            </Button>
            <Button
              variant={currentMethod === 'iframe' ? 'default' : 'outline'}
              onClick={() => setCurrentMethod('iframe')}
              className="text-xs"
            >
              Multiple Hosts
            </Button>
            <Button
              variant={currentMethod === 'direct' ? 'default' : 'outline'}
              onClick={() => setCurrentMethod('direct')}
              className="text-xs"
            >
              Direct Pattern
            </Button>
          </div>
        </div>
      )}

      {grooveParams && (
        <div className="space-y-4">
          {currentMethod === 'svg' && renderSVGEmbed()}
          {currentMethod === 'iframe' && renderAlternativeIframe()}
          {currentMethod === 'direct' && renderDirectNotation()}
        </div>
      )}

      {!grooveParams && !editable && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <div className="text-gray-400 mb-2">No GrooveScribe pattern available</div>
            <p className="text-sm text-gray-500">
              Add a GrooveScribe pattern to display drum notation
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}