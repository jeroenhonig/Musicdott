import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Music, Clock, Gauge, Tag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SongContentViewer from "@/components/songs/song-content-viewer";
import AppLayout from "@/components/layouts/app-layout";
import StudentContentHeader from "@/components/student/student-content-header";
import StudentViewSkeleton from "@/components/student/student-view-skeleton";
import type { MetadataBadge } from "@/components/student/student-content-header";

export default function StudentSongView() {
  const { id } = useParams<{ id: string }>();
  const songId = parseInt(id || "0");

  const { data: song, isLoading } = useQuery({
    queryKey: ["/api/songs", songId],
    enabled: !isNaN(songId),
  });

  if (isLoading) {
    return <StudentViewSkeleton showMetadataBadges />;
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

  const badges: MetadataBadge[] = [
    ...(song.difficulty ? [{ label: song.difficulty, variant: 'secondary' as const }] : []),
    ...(song.instrument ? [{ icon: Music, label: song.instrument, variant: 'outline' as const }] : []),
    ...(song.duration ? [{ icon: Clock, label: song.duration, variant: 'outline' as const }] : []),
    ...(song.bpm ? [{ icon: Gauge, label: `${song.bpm} BPM`, variant: 'outline' as const }] : []),
    ...(song.key ? [{ label: `Key: ${song.key}`, variant: 'outline' as const }] : []),
    ...(song.genre ? [{ icon: Tag, label: song.genre, variant: 'outline' as const }] : []),
  ];

  const hasContent = song.contentBlocks && (
    Array.isArray(song.contentBlocks)
      ? song.contentBlocks.length > 0
      : song.contentBlocks !== "[]" && song.contentBlocks !== ""
  );

  return (
    <AppLayout title={song.title}>
      <div className="space-y-6">
        <StudentContentHeader
          title={song.title}
          subtitle={song.artist ? `by ${song.artist}` : undefined}
          badges={badges}
        />

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
          {hasContent ? (
            <SongContentViewer contentBlocks={song.contentBlocks} />
          ) : (
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
