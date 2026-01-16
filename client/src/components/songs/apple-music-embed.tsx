import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Music } from "lucide-react";

interface AppleMusicEmbedProps {
  url: string;
  title?: string;
  artist?: string;
  editable?: boolean;
}

export default function AppleMusicEmbed({ 
  url, 
  title, 
  artist, 
  editable = false 
}: AppleMusicEmbedProps) {
  // Extract Apple Music ID from various URL formats
  const getAppleMusicId = (url: string) => {
    try {
      // Handle different Apple Music URL formats
      if (url.includes('music.apple.com')) {
        const match = url.match(/album\/[^/]+\/(\d+)/) || url.match(/song\/[^/]+\/(\d+)/);
        return match ? match[1] : null;
      }
      return null;
    } catch {
      return null;
    }
  };

  const appleMusicId = getAppleMusicId(url);

  // Apple Music doesn't provide embeddable widgets like Spotify
  // So we'll create a stylized link card that opens in Apple Music
  const handleOpenAppleMusic = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!appleMusicId && !url.includes('music.apple.com')) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-red-600">
            <Music className="h-4 w-4" />
            <span className="text-sm">Invalid Apple Music URL</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gray-200 hover:border-gray-300 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Apple Music Icon */}
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Music className="h-6 w-6 text-white" />
            </div>
            
            {/* Song Info */}
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-1">
                {title || "Apple Music Track"}
              </h4>
              {artist && (
                <p className="text-sm text-gray-600">{artist}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Listen on Apple Music
              </p>
            </div>
          </div>
          
          {/* Open Button */}
          <Button
            onClick={handleOpenAppleMusic}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Open
          </Button>
        </div>

        {/* Preview message */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            Click "Open" to listen to this track in Apple Music. 
            {editable && " Students will be able to access this song if they have an Apple Music subscription."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}