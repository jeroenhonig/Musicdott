import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, X, Music, Clock, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SongContentViewer from "@/components/songs/song-content-viewer";
import AppLayout from "@/components/layouts/app-layout";

export default function StudentSongView() {
  const { id } = useParams<{ id: string }>();
  const songId = parseInt(id || "0");

  const { data: song, isLoading } = useQuery({
    queryKey: ["/api/songs", songId],
    enabled: !isNaN(songId),
  });

  if (isLoading) {
    return (
      <AppLayout title="Loading Song...">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  if (!song) {
    return (
      <AppLayout title="Song Not Found">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Song Not Found</h1>
            <Button onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const renderContentBlocks = () => {
    if (!song.contentBlocks) return null;
    
    return (
      <SongContentViewer 
        contentBlocks={song.contentBlocks}
      />
    );
  };

  return (
    <AppLayout title={song.title}>
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">{song.title}</h1>
              {song.artist && (
                <p className="text-gray-600 mt-1">by {song.artist}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.history.back()}
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {song.difficulty && (
              <Badge variant="secondary">
                {song.difficulty}
              </Badge>
            )}
            {song.instrument && (
              <Badge variant="outline">
                <Music className="h-3 w-3 mr-1" />
                {song.instrument}
              </Badge>
            )}
            {song.duration && (
              <Badge variant="outline">
                <Clock className="h-3 w-3 mr-1" />
                {song.duration}
              </Badge>
            )}
            {song.genre && (
              <Badge variant="outline">
                {song.genre}
              </Badge>
            )}
          </div>
        </div>

        {song.description && (
          <Card>
            <CardHeader>
              <CardTitle>About This Song</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{song.description}</p>
            </CardContent>
          </Card>
        )}

        <div className="bg-white rounded-lg shadow-sm border p-6">
          {renderContentBlocks()}

          {(!song.contentBlocks || song.contentBlocks === "[]") && (
            <div className="text-center py-8">
              <Music className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No practice materials yet</h3>
              <p className="text-gray-600">Your teacher will add practice content for this song soon.</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}