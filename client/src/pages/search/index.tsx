import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import AppLayout from "@/components/layouts/app-layout";
import EnhancedSearch from "@/components/dashboard/enhanced-search";
import LessonContentViewer from "@/components/lessons/lesson-content-viewer";
import SongContentViewer from "@/components/songs/song-content-viewer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Music, User, Clock, Play } from "lucide-react";
import type { Lesson, Song } from "@shared/schema";

export default function SearchPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [isLessonDialogOpen, setIsLessonDialogOpen] = useState(false);
  const [isSongDialogOpen, setIsSongDialogOpen] = useState(false);

  // Fetch recent songs for the bottom section
  const { data: recentSongs = [] } = useQuery({
    queryKey: ['/api/songs'],
    enabled: !!user,
    select: (data: Song[]) => data.slice(-10).reverse() // Get last 10 songs and reverse for newest first
  });

  const handleViewLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setIsLessonDialogOpen(true);
  };

  const handleViewSong = (song: Song) => {
    setSelectedSong(song);
    setIsSongDialogOpen(true);
  };

  const handleAssignLesson = (lesson: Lesson) => {
    setLocation(`/lessons?assign=${lesson.id}`);
  };

  const handleAssignSong = (song: Song) => {
    setLocation(`/songs?assign=${song.id}`);
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Songs</h1>
          <p className="text-gray-600">
            Search and browse songs by artist, title, or genre
          </p>
        </div>

        <EnhancedSearch
          onViewLesson={handleViewLesson}
          onViewSong={handleViewSong}
          onAssignLesson={handleAssignLesson}
          onAssignSong={handleAssignSong}
        />

        {/* Recent Songs Section */}
        {recentSongs.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Music className="h-5 w-5" />
              Recently Imported Songs
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentSongs.map((song) => (
                <Card key={song.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-medium line-clamp-1">
                          {song.title}
                        </CardTitle>
                        {song.composer && (
                          <CardDescription className="flex items-center gap-1 mt-1">
                            <User className="h-3 w-3" />
                            {song.composer}
                          </CardDescription>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewSong(song)}
                        className="shrink-0 ml-2"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {song.difficulty && (
                          <Badge variant="secondary" className={getDifficultyColor(song.difficulty)}>
                            {song.difficulty}
                          </Badge>
                        )}
                        {song.instrument && (
                          <Badge variant="outline" className="text-xs">
                            {song.instrument}
                          </Badge>
                        )}
                      </div>
                      {song.createdAt && (
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(song.createdAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Lesson Viewer Dialog */}
        <Dialog open={isLessonDialogOpen} onOpenChange={setIsLessonDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-xl">
                    {selectedLesson?.title}
                  </DialogTitle>
                  {selectedLesson?.description && (
                    <p className="text-gray-600 mt-1">{selectedLesson.description}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsLessonDialogOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </DialogHeader>
            <div className="flex-1 overflow-auto">
              {selectedLesson && (
                <LessonContentViewer 
                  contentBlocksJson={selectedLesson.contentBlocks} 
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Song Viewer Dialog */}
        <Dialog open={isSongDialogOpen} onOpenChange={setIsSongDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-xl">
                    {selectedSong?.title}
                  </DialogTitle>
                  {selectedSong?.composer && (
                    <p className="text-gray-600 mt-1">by {selectedSong.composer}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSongDialogOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </DialogHeader>
            <div className="flex-1 overflow-auto">
              {selectedSong && (
                <SongContentViewer 
                  contentBlocks={selectedSong.contentBlocks} 
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}