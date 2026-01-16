import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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

const spotifyFormSchema = z.object({
  spotifyUrl: z.string()
    .url("Please enter a valid URL")
    .refine(
      (url) => {
        return url.includes('spotify.com');
      }, 
      {
        message: "URL must be from Spotify"
      }
    )
});

type SpotifyFormValues = z.infer<typeof spotifyFormSchema>;

interface SpotifyEmbedProps {
  initialSpotifyUrl?: string;
  onSave?: (spotifyUrl: string) => void;
  editable?: boolean;
  height?: number;
}

export default function SpotifyEmbed({ 
  initialSpotifyUrl,
  onSave, 
  editable = false,
  height = 380
}: SpotifyEmbedProps) {
  const [spotifyUrl, setSpotifyUrl] = useState<string>(initialSpotifyUrl || "");
  const [showEmbed, setShowEmbed] = useState<boolean>(!!initialSpotifyUrl);
  
  const form = useForm<SpotifyFormValues>({
    resolver: zodResolver(spotifyFormSchema),
    defaultValues: {
      spotifyUrl: initialSpotifyUrl || ""
    }
  });
  
  // Get embedded URL for Spotify tracks, albums, or playlists
  const getEmbedUrl = (url: string): string => {
    try {
      // Convert web URL to embed URL
      if (url.includes('spotify.com')) {
        // Extract the type and ID from the URL
        const spotifyUrl = new URL(url);
        const spotifyPath = spotifyUrl.pathname;
        
        // Format: /track/TRACK_ID, /album/ALBUM_ID, /playlist/PLAYLIST_ID, etc.
        if (spotifyPath.startsWith('/track/') || 
            spotifyPath.startsWith('/album/') || 
            spotifyPath.startsWith('/playlist/') ||
            spotifyPath.startsWith('/artist/')) {
          
          // Extract the content type and ID
          const parts = spotifyPath.split('/').filter(part => part);
          if (parts.length >= 2) {
            const contentType = parts[0]; // track, album, playlist, artist
            const contentId = parts[1].split('?')[0].split('#')[0]; // Remove any params
            
            // Format according to Spotify's embed format
            return `https://open.spotify.com/embed/${contentType}/${contentId}`;
          }
        }
      }
      
      // If we can't parse it, return the original URL
      return url;
    } catch (error) {
      console.error("Error parsing Spotify URL:", error);
      return url;
    }
  };
  
  // Handle form submission
  const onSubmit = (values: SpotifyFormValues) => {
    console.log("Spotify form submitted with:", values);
    const embedUrl = getEmbedUrl(values.spotifyUrl);
    setSpotifyUrl(embedUrl);
    setShowEmbed(true);
    if (onSave) {
      console.log("Calling onSave with Spotify URL:", embedUrl);
      onSave(embedUrl);
    }
  };
  
  return (
    <div className="w-full">
      {editable && (
        <div className="space-y-4 mb-4">
          <div>
            <Label htmlFor="spotify-url">Spotify URL</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="spotify-url"
                placeholder="https://open.spotify.com/track/..."
                value={form.watch('spotifyUrl')}
                onChange={(e) => form.setValue('spotifyUrl', e.target.value)}
                className="flex-1"
              />
              <Button 
                type="button" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const values = form.getValues();
                  console.log("Spotify embed clicked with values:", values);
                  onSubmit(values);
                }}
              >
                Embed
              </Button>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Paste a Spotify URL for a track, album, playlist, or artist
            </p>
          </div>
        </div>
      )}
      
      {showEmbed && spotifyUrl && (
        <Card>
          <CardContent className="p-0 overflow-hidden rounded-md">
            <iframe 
              style={{ borderRadius: "12px" }}
              src={`${spotifyUrl}?utm_source=generator`}
              width="100%" 
              height={height} 
              frameBorder="0"
              allowFullScreen={true}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
              loading="lazy"
              title="Spotify Embed"
              className="w-full"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}