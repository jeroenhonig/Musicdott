import React, { useState, useEffect, useCallback } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import { 
  Play, 
  Clock, 
  User, 
  Eye, 
  ExternalLink,
  Video,
  AlertCircle,
  CheckCircle,
  Loader2
} from "lucide-react";

// YouTube video metadata interface
interface VideoMetadata {
  title: string;
  author_name: string;
  author_url?: string;
  thumbnail_url: string;
  thumbnail_width: number;
  thumbnail_height: number;
  html: string;
  width: number;
  height: number;
  duration?: string;
  view_count?: string;
  upload_date?: string;
}

const videoFormSchema = z.object({
  videoUrl: z.string().min(1, "Please enter a URL")
});

type VideoFormValues = z.infer<typeof videoFormSchema>;

interface VideoEmbedProps {
  initialVideoUrl?: string;
  onSave?: (videoUrl: string) => void;
  editable?: boolean;
  height?: number;
}

export default function VideoEmbed({ 
  initialVideoUrl,
  onSave, 
  editable = false,
  height = 315
}: VideoEmbedProps) {
  const [videoUrl, setVideoUrl] = useState<string>(initialVideoUrl || "");
  const [currentInputUrl, setCurrentInputUrl] = useState<string>(initialVideoUrl || "");
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmbed, setShowEmbed] = useState<boolean>(!!initialVideoUrl);
  
  const { toast } = useToast();
  
  const form = useForm<VideoFormValues>({
    resolver: zodResolver(videoFormSchema),
    defaultValues: {
      videoUrl: initialVideoUrl || ""
    }
  });
  
  // Extract video ID from various YouTube URL formats
  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  // Check if URL is a valid video URL
  const isValidVideoUrl = (url: string): boolean => {
    return url.includes('youtube.com') || 
           url.includes('youtu.be') || 
           url.includes('vimeo.com');
  };

  // Get embedded URL for YouTube or Vimeo videos
  const getEmbedUrl = (url: string): string => {
    try {
      // YouTube - convert standard URL to embed URL
      if (url.includes('youtube.com/watch')) {
        const videoId = new URL(url).searchParams.get('v');
        if (videoId) {
          return `https://www.youtube.com/embed/${videoId}`;
        }
      }
      
      // YouTube - shortened URL
      if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1].split('?')[0];
        if (videoId) {
          return `https://www.youtube.com/embed/${videoId}`;
        }
      }
      
      // Vimeo
      if (url.includes('vimeo.com/')) {
        const videoId = url.split('vimeo.com/')[1].split('?')[0];
        if (videoId) {
          return `https://player.vimeo.com/video/${videoId}`;
        }
      }
      
      // If we can't parse it, return the original URL
      return url;
    } catch (error) {
      console.error("Error parsing video URL:", error);
      return url;
    }
  };

  // Fetch video metadata from oEmbed APIs
  const fetchVideoMetadata = useCallback(async (url: string): Promise<VideoMetadata | null> => {
    if (!isValidVideoUrl(url)) {
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      let oEmbedUrl = '';
      
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      } else if (url.includes('vimeo.com')) {
        oEmbedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`;
      }
      
      if (!oEmbedUrl) {
        throw new Error("Unsupported video platform");
      }
      
      const response = await fetch(oEmbedUrl);
      
      if (!response.ok) {
        throw new Error("Video not found or is private");
      }
      
      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error("Error fetching video metadata:", error);
      setError(error.message || "Failed to load video metadata");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Handle URL input changes with automatic preview
  const handleUrlChange = useCallback(async (url: string) => {
    setCurrentInputUrl(url);
    form.setValue('videoUrl', url);
    
    if (!url.trim()) {
      setVideoMetadata(null);
      setVideoUrl("");
      setShowEmbed(false);
      setError(null);
      return;
    }
    
    // Only process if it's a valid video URL
    if (isValidVideoUrl(url)) {
      const metadata = await fetchVideoMetadata(url);
      if (metadata) {
        setVideoMetadata(metadata);
        const embedUrl = getEmbedUrl(url);
        setVideoUrl(embedUrl);
        setShowEmbed(true);
        
        // Auto-save when valid URL is detected
        if (onSave) {
          onSave(embedUrl);
        }
        
        toast({
          title: "Video loaded",
          description: `Successfully loaded: ${metadata.title}`,
        });
      }
    } else if (url.length > 10) {
      // Show error for invalid URLs (but only if they've typed enough)
      setError("Please enter a valid YouTube or Vimeo URL");
      setVideoMetadata(null);
      setVideoUrl("");
      setShowEmbed(false);
    }
  }, [fetchVideoMetadata, onSave, form, toast]);

  // Load initial video if provided
  useEffect(() => {
    if (initialVideoUrl && !videoMetadata) {
      handleUrlChange(initialVideoUrl);
    }
  }, [initialVideoUrl, videoMetadata, handleUrlChange]);
  
  return (
    <div className="w-full space-y-4">
      {editable && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="video-url">Video URL</Label>
            <div className="mt-2">
              <Input
                id="video-url"
                placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                value={currentInputUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                className="w-full"
                disabled={isLoading}
              />
            </div>
            <div className="flex items-center gap-2 mt-2">
              {isLoading && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading video...</span>
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}
              {videoMetadata && !isLoading && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Video loaded successfully</span>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Paste a YouTube or Vimeo URL - preview will appear automatically
            </p>
          </div>
        </div>
      )}
      
      {/* Video Preview Card */}
      {showEmbed && videoMetadata && (
        <Card className="overflow-hidden">
          {/* Video Metadata Header */}
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg leading-tight">
                  {videoMetadata.title}
                </CardTitle>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>{videoMetadata.author_name}</span>
                  </div>
                  {videoMetadata.view_count && (
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      <span>{videoMetadata.view_count} views</span>
                    </div>
                  )}
                  {videoMetadata.duration && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{videoMetadata.duration}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-xs">
                  <Video className="h-3 w-3 mr-1" />
                  Video
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(currentInputUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          {/* Video Embed */}
          <CardContent className="p-0">
            <div className="relative overflow-hidden">
              <iframe 
                width="100%" 
                height={height} 
                src={videoUrl} 
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
                title={videoMetadata.title}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Fallback for existing videos without metadata */}
      {showEmbed && videoUrl && !videoMetadata && (
        <Card>
          <CardContent className="p-0 overflow-hidden rounded-md">
            <iframe 
              width="100%" 
              height={height} 
              src={videoUrl} 
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
              title="Video Embed"
              className="w-full"
            />
          </CardContent>
        </Card>
      )}
      
      {/* Empty state for editable mode */}
      {editable && !showEmbed && !currentInputUrl && (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <Video className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Add Video</h3>
            <p className="text-gray-500 mb-4">
              Paste a YouTube or Vimeo URL above to add a video to your content
            </p>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">
                YouTube
              </Badge>
              <Badge variant="outline" className="text-xs">
                Vimeo
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}