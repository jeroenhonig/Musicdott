import React, { useState, useEffect, useCallback } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  ExternalLink, 
  RefreshCw, 
  Music, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  PlayCircle,
  Settings
} from 'lucide-react';
import { 
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const grooveFormSchema = z.object({
  grooveUrl: z.string().min(1, "Please enter a pattern or URL")
});

type GrooveFormValues = z.infer<typeof grooveFormSchema>;

interface GrooveEmbedProps {
  initialGrooveParams?: string;
  onSave?: (grooveParams: string) => void;
  editable?: boolean;
  height?: number;
}

export default function GrooveEmbed({ 
  initialGrooveParams, 
  onSave, 
  editable = false,
  height = 240
}: GrooveEmbedProps) {
  const [grooveParams, setGrooveParams] = useState<string>(initialGrooveParams || "");
  const [currentInputValue, setCurrentInputValue] = useState<string>(initialGrooveParams || "");
  const [showEmbed, setShowEmbed] = useState<boolean>(!!initialGrooveParams);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patternTitle, setPatternTitle] = useState<string>("");
  
  const { toast } = useToast();
  
  const form = useForm<GrooveFormValues>({
    resolver: zodResolver(grooveFormSchema),
    defaultValues: {
      grooveUrl: ""
    }
  });
  
  // Check if input is a valid groove pattern or URL
  const isValidGrooveInput = useCallback((input: string): boolean => {
    if (!input.trim()) return false;
    
    // Check if it's a URL
    if (input.includes('teacher.musicdott.com/groovescribe') || 
        input.includes('mikeslessons.com/groove') ||
        input.includes('montulli.github.io/GrooveScribe')) {
      return true;
    }
    
    // Check if it's a pattern string
    if (input.startsWith('?') && 
        (input.includes('TimeSig=') || input.includes('Tempo=') || 
         input.includes('&H=|') || input.includes('&S=|') || input.includes('&K=|'))) {
      return true;
    }
    
    return false;
  }, []);
  
  // Extract pattern title from parameters
  const extractPatternTitle = useCallback((params: string): string => {
    try {
      const urlParams = new URLSearchParams(params.startsWith('?') ? params.substring(1) : params);
      const timeSig = urlParams.get('TimeSig') || '4/4';
      const tempo = urlParams.get('Tempo') || '120';
      return `Drum Pattern (${timeSig} @ ${tempo} BPM)`;
    } catch {
      return 'Drum Pattern';
    }
  }, []);
  
  // Clean and format groove pattern parameters
  const cleanGrooveParams = useCallback((input: string): string => {
    let cleaned = input.trim();
    
    // Clean up malformed patterns with duplicate parameters
    if (cleaned.includes('?Mode=view&TimeSig=')) {
      const mainPatternStart = cleaned.indexOf('?Mode=view&TimeSig=');
      cleaned = '?' + cleaned.substring(mainPatternStart + 11); // Skip '?Mode=view&'
    }
    
    // Clean up patterns that have ?TimeSig before another ?TimeSig
    if (cleaned.includes('&H=|?Mode=view&TimeSig=')) {
      const cleanStart = cleaned.indexOf('&H=|?Mode=view&TimeSig=');
      cleaned = '?' + cleaned.substring(cleanStart + 15); // Skip '&H=|?Mode=view&'
    }
    
    // Ensure it starts with ?
    if (!cleaned.startsWith('?')) {
      cleaned = '?' + cleaned;
    }
    
    return cleaned;
  }, []);
  
  // Handle input changes with automatic preview
  const handleInputChange = useCallback(async (input: string) => {
    setCurrentInputValue(input);
    form.setValue('grooveUrl', input);
    
    if (!input.trim()) {
      setGrooveParams("");
      setShowEmbed(false);
      setError(null);
      setPatternTitle("");
      return;
    }
    
    if (isValidGrooveInput(input)) {
      setIsLoading(true);
      setError(null);
      
      try {
        let params = "";
        
        if (input.startsWith('?')) {
          // Direct pattern parameters
          params = cleanGrooveParams(input);
        } else {
          // Extract from URL
          params = extractGrooveParams(input);
        }
        
        if (params) {
          setGrooveParams(params);
          setShowEmbed(true);
          setPatternTitle(extractPatternTitle(params));
          
          // Auto-save when valid pattern is detected
          if (onSave) {
            onSave(params);
          }
          
          toast({
            title: "Pattern loaded",
            description: "GrooveScribe pattern loaded successfully",
          });
        } else {
          throw new Error("Could not extract pattern from input");
        }
      } catch (error: any) {
        setError(error.message || "Invalid pattern format");
        setGrooveParams("");
        setShowEmbed(false);
        setPatternTitle("");
      } finally {
        setIsLoading(false);
      }
    } else if (input.length > 5) {
      setError("Please enter a valid GrooveScribe pattern or URL");
      setGrooveParams("");
      setShowEmbed(false);
      setPatternTitle("");
    }
  }, [isValidGrooveInput, cleanGrooveParams, extractPatternTitle, onSave, form, toast]);
  
  // Load initial pattern if provided
  useEffect(() => {
    if (initialGrooveParams && !grooveParams) {
      handleInputChange(initialGrooveParams);
    }
  }, [initialGrooveParams, grooveParams, handleInputChange]);

  // Extract parameters from a Groovescribe URL
  const extractGrooveParams = useCallback((url: string): string => {
    try {
      // Check if we already have a formatted param string
      if (url.startsWith('?')) {
        return url;
      }
      
      const urlObj = new URL(url);
      // Get everything after the ? mark
      return urlObj.search;
    } catch (error) {
      console.error("Error parsing URL:", error);
      
      // Fallback for when URL parsing fails
      // Extract everything after the '?' mark manually
      const questionMarkIndex = url.indexOf('?');
      if (questionMarkIndex !== -1) {
        return url.substring(questionMarkIndex);
      }
      
      return "";
    }
  }, []);
  
  // Get the correct GrooveScribe URL based on parameters
  const getGrooveScribeUrl = useCallback((params: string): string => {
    if (!params) return '';
    
    // Clean up the parameters
    const cleanParams = params.replace(/%7C/g, '|').replace(/%2D/g, '-').replace(/%20/g, ' ');
    
    // Try teacher.musicdott.com first (current version), fallback to mikeslessons.com
    return `https://teacher.musicdott.com/groovescribe/GrooveEmbed.html${cleanParams}`;
  }, []);
  
  // Multiple embedding methods for maximum compatibility
  const renderMultipleEmbedSolutions = useCallback(() => {
    if (!grooveParams) return null;
    
    const solutions = [
      {
        name: "Primary Embed",
        url: `https://teacher.musicdott.com/groovescribe/GrooveEmbed.html${grooveParams}`,
        description: "MusicDott GrooveScribe host",
        isPrimary: true
      },
      {
        name: "SVG Notation",
        url: `https://sonpham.me/notion-drum-sheet/render.html${grooveParams}&EmbedTempoTimeSig=true`,
        description: "Scalable vector graphics",
        isPrimary: false
      }
    ];
    
    return (
      <div className="space-y-3">
        {solutions.map((solution, index) => (
          <div key={index} className={`border rounded-lg overflow-hidden ${solution.isPrimary ? 'border-orange-200' : 'border-gray-200'}`}>
            <div className={`px-3 py-2 flex items-center justify-between ${
              solution.isPrimary ? 'bg-orange-50' : 'bg-gray-50'
            }`}>
              <div className="flex items-center gap-2">
                <Badge variant={solution.isPrimary ? "default" : "secondary"} className="text-xs">
                  {solution.name}
                </Badge>
                <span className="text-xs text-gray-500">{solution.description}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(solution.url, '_blank')}
                className="h-6 px-2 text-xs"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Open
              </Button>
            </div>
            <div className="relative">
              <iframe
                src={solution.url}
                width="100%"
                height={height}
                frameBorder="0"
                title={`${solution.name} - ${patternTitle}`}
                className="w-full bg-white"
                loading="lazy"
              />
              {/* Overlay for external link */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-2 right-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(solution.url, '_blank')}
                    className="h-6 px-2 text-xs pointer-events-auto bg-black/10 hover:bg-black/20 text-white"
                  >
                    <PlayCircle className="h-3 w-3 mr-1" />
                    Play
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }, [grooveParams, height, patternTitle]);

  return (
    <div className="w-full space-y-4">
      {editable && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="groove-url" className="text-sm font-medium">GrooveScribe Pattern</Label>
            <div className="mt-2">
              <Input
                id="groove-url"
                placeholder="?TimeSig=4/4&Div=16&Tempo=120&H=|X-X-X-X-|&S=|--X---X-|&K=|X---X-X-| or paste URL"
                value={currentInputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                className="w-full"
                disabled={isLoading}
              />
            </div>
            <div className="flex items-center gap-2 mt-2">
              {isLoading && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading pattern...</span>
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}
              {grooveParams && !isLoading && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Pattern loaded successfully</span>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Paste a GrooveScribe pattern or URL - preview will appear automatically
            </p>
          </div>
        </div>
      )}
      
      {/* Pattern Preview Card */}
      {showEmbed && grooveParams && (
        <Card className="overflow-hidden">
          {/* Pattern Header */}
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg leading-tight flex items-center gap-2">
                  <Music className="h-5 w-5 text-orange-600" />
                  {patternTitle || 'GrooveScribe Pattern'}
                </CardTitle>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <PlayCircle className="h-4 w-4" />
                    <span>Interactive drum pattern</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Settings className="h-4 w-4" />
                    <span>Editable notation</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-xs">
                  <Music className="h-3 w-3 mr-1" />
                  GrooveScribe
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(getGrooveScribeUrl(grooveParams), '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          {/* Pattern Embed */}
          <CardContent className="p-0">
            <div className="space-y-4 p-4">
              {renderMultipleEmbedSolutions()}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Empty state for editable mode */}
      {editable && !showEmbed && !currentInputValue && (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <Music className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Add Drum Pattern</h3>
            <p className="text-gray-500 mb-4">
              Paste a GrooveScribe pattern or URL above to add interactive drum notation
            </p>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">
                GrooveScribe
              </Badge>
              <Badge variant="outline" className="text-xs">
                Interactive
              </Badge>
              <Badge variant="outline" className="text-xs">
                Playback
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Loading state for non-editable mode */}
      {!showEmbed && !editable && initialGrooveParams && (
        <div className="p-4 text-center text-gray-500 border rounded-md">
          <div className="flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading groove pattern...</span>
          </div>
        </div>
      )}
    </div>
  );
}