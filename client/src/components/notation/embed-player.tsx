/**
 * Embed Player Component
 *
 * Universal embed player for YouTube, Spotify, and Apple Music
 * Features:
 * - Fallback strategy (no white screens)
 * - CSP-proof iframe sandboxing
 * - No external JS SDKs required
 * - Raw source preservation display
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ExternalLink,
  Play,
  Music,
  Video,
  AlertTriangle,
  Code,
  Eye,
  EyeOff,
} from "lucide-react";

// Types matching the server-side Embed type
interface Embed {
  type: "video" | "audio" | "notation" | "pdf";
  provider: string;
  embed_url: string | null;
  video_id?: string;
  raw: string | null;
  fallback?: string;
}

interface SongEmbeds {
  youtube?: Embed;
  spotify?: Embed;
  apple_music?: Embed;
}

interface EmbedPlayerProps {
  embeds?: SongEmbeds;
  title?: string;
  showRawToggle?: boolean;
  compact?: boolean;
}

// Provider icons and colors
const PROVIDER_CONFIG: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string; label: string }
> = {
  youtube: { icon: Video, color: "bg-red-600", label: "YouTube" },
  spotify: { icon: Music, color: "bg-green-600", label: "Spotify" },
  apple_music: { icon: Music, color: "bg-pink-500", label: "Apple Music" },
};

// Single embed component
function SingleEmbed({
  embed,
  showRaw,
  onToggleRaw,
}: {
  embed: Embed;
  showRaw: boolean;
  onToggleRaw: () => void;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const config = PROVIDER_CONFIG[embed.provider] || {
    icon: Music,
    color: "bg-gray-600",
    label: embed.provider,
  };
  const Icon = config.icon;

  // Handle iframe load error
  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  // Handle successful load
  const handleLoad = () => {
    setIsLoaded(true);
  };

  // Render raw HTML/URL
  if (showRaw && embed.raw) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="flex items-center gap-1">
            <Code className="h-3 w-3" />
            Raw Source
          </Badge>
          <Button variant="ghost" size="sm" onClick={onToggleRaw}>
            <Eye className="h-4 w-4 mr-1" />
            Show Player
          </Button>
        </div>
        <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs font-mono whitespace-pre-wrap max-h-40">
          {embed.raw}
        </pre>
      </div>
    );
  }

  // No embed URL - show fallback
  if (!embed.embed_url) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <span>
              {embed.fallback || "Media unavailable. Raw source preserved."}
            </span>
            {embed.raw && (
              <Button variant="ghost" size="sm" onClick={onToggleRaw}>
                <Code className="h-4 w-4 mr-1" />
                View Raw
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Render based on provider
  const renderEmbed = () => {
    switch (embed.provider) {
      case "youtube":
        return (
          <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
            {!isLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <div className="text-center">
                  <Video className="h-12 w-12 mx-auto mb-2 text-muted-foreground animate-pulse" />
                  <p className="text-sm text-muted-foreground">Loading YouTube...</p>
                </div>
              </div>
            )}
            {hasError ? (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <div className="text-center p-4">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-2 text-yellow-500" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Unable to load video embed
                  </p>
                  <a
                    href={`https://www.youtube.com/watch?v=${embed.video_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center justify-center gap-1"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open on YouTube
                  </a>
                </div>
              </div>
            ) : (
              <iframe
                src={embed.embed_url}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onLoad={handleLoad}
                onError={handleError}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            )}
          </div>
        );

      case "spotify":
        return (
          <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ height: "152px" }}>
            {!isLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <div className="text-center">
                  <Music className="h-12 w-12 mx-auto mb-2 text-green-500 animate-pulse" />
                  <p className="text-sm text-muted-foreground">Loading Spotify...</p>
                </div>
              </div>
            )}
            {hasError ? (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <div className="text-center p-4">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-2 text-yellow-500" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Unable to load Spotify embed
                  </p>
                  <a
                    href={embed.embed_url?.replace("/embed/", "/")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-500 hover:underline flex items-center justify-center gap-1"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open on Spotify
                  </a>
                </div>
              </div>
            ) : (
              <iframe
                src={embed.embed_url}
                className="absolute inset-0 w-full h-full"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                allowFullScreen
                onLoad={handleLoad}
                onError={handleError}
                loading="lazy"
              />
            )}
          </div>
        );

      case "apple_music":
        return (
          <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ height: "150px" }}>
            {!isLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <div className="text-center">
                  <Music className="h-12 w-12 mx-auto mb-2 text-pink-500 animate-pulse" />
                  <p className="text-sm text-muted-foreground">Loading Apple Music...</p>
                </div>
              </div>
            )}
            {hasError ? (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <div className="text-center p-4">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-2 text-yellow-500" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Unable to load Apple Music embed
                  </p>
                  {embed.raw && (
                    <Button variant="ghost" size="sm" onClick={onToggleRaw}>
                      <Code className="h-4 w-4 mr-1" />
                      View Raw
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <iframe
                src={embed.embed_url}
                className="absolute inset-0 w-full h-full"
                allow="autoplay *; encrypted-media *;"
                sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
                onLoad={handleLoad}
                onError={handleError}
                loading="lazy"
              />
            )}
          </div>
        );

      default:
        return (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Unknown provider: {embed.provider}
            </AlertDescription>
          </Alert>
        );
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Badge className={`${config.color} text-white flex items-center gap-1`}>
          <Icon className="h-3 w-3" />
          {config.label}
        </Badge>
        {embed.raw && (
          <Button variant="ghost" size="sm" onClick={onToggleRaw}>
            <Code className="h-4 w-4 mr-1" />
            View Raw
          </Button>
        )}
      </div>
      {renderEmbed()}
    </div>
  );
}

export default function EmbedPlayer({
  embeds,
  title = "Media",
  showRawToggle = true,
  compact = false,
}: EmbedPlayerProps) {
  const [showRaw, setShowRaw] = useState<Record<string, boolean>>({});

  const toggleRaw = (provider: string) => {
    setShowRaw((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  // Get available embeds
  const availableEmbeds = embeds
    ? Object.entries(embeds).filter(([_, embed]) => embed)
    : [];

  if (availableEmbeds.length === 0) {
    return (
      <Card className={compact ? "border-0 shadow-none" : ""}>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Music className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No media embeds available</p>
        </CardContent>
      </Card>
    );
  }

  // Single embed - render directly
  if (availableEmbeds.length === 1) {
    const [provider, embed] = availableEmbeds[0];
    return (
      <Card className={compact ? "border-0 shadow-none" : ""}>
        {!compact && (
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Play className="h-5 w-5" />
              {title}
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <SingleEmbed
            embed={embed!}
            showRaw={showRaw[provider] || false}
            onToggleRaw={() => toggleRaw(provider)}
          />
        </CardContent>
      </Card>
    );
  }

  // Multiple embeds - use tabs
  return (
    <Card className={compact ? "border-0 shadow-none" : ""}>
      {!compact && (
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Play className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <Tabs defaultValue={availableEmbeds[0][0]}>
          <TabsList className="w-full grid" style={{ gridTemplateColumns: `repeat(${availableEmbeds.length}, 1fr)` }}>
            {availableEmbeds.map(([provider, embed]) => {
              const config = PROVIDER_CONFIG[provider] || {
                icon: Music,
                label: provider,
              };
              const Icon = config.icon;
              return (
                <TabsTrigger key={provider} value={provider} className="flex items-center gap-1">
                  <Icon className="h-4 w-4" />
                  {config.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
          {availableEmbeds.map(([provider, embed]) => (
            <TabsContent key={provider} value={provider} className="mt-4">
              <SingleEmbed
                embed={embed!}
                showRaw={showRaw[provider] || false}
                onToggleRaw={() => toggleRaw(provider)}
              />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
