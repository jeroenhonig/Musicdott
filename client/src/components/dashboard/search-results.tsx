import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Play, Music, BookOpen, User } from "lucide-react";
import type { Lesson, Song } from "@shared/schema";

interface SearchResultsProps {
  results: {
    lessons: Lesson[];
    songs: Song[];
  };
  onViewLesson: (lesson: Lesson) => void;
  onViewSong: (song: Song) => void;
  onAssignLesson?: (lesson: Lesson) => void;
  onAssignSong?: (song: Song) => void;
}

export default function SearchResults({ 
  results, 
  onViewLesson, 
  onViewSong, 
  onAssignLesson,
  onAssignSong 
}: SearchResultsProps) {
  const { lessons, songs } = results;
  const totalResults = lessons.length + songs.length;

  if (totalResults === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No lessons or songs found matching your search.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Search Results ({totalResults} found)
        </h3>
      </div>

      {/* Lessons Section */}
      {lessons.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-700 flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Lessons ({lessons.length})
          </h4>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {lessons.map((lesson) => (
              <Card key={lesson.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base line-clamp-2">
                        {lesson.title}
                      </CardTitle>
                      {lesson.categoryName && (
                        <Badge 
                          variant="secondary" 
                          className="mt-2"
                          style={{ 
                            backgroundColor: lesson.categoryColor + '20',
                            color: lesson.categoryColor 
                          }}
                        >
                          {lesson.categoryName}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {lesson.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {lesson.description}
                    </p>
                  )}
                  
                  <div className="flex gap-2 text-xs">
                    {lesson.instrument && (
                      <Badge variant="outline">{lesson.instrument}</Badge>
                    )}
                    {lesson.level && (
                      <Badge variant="outline">{lesson.level}</Badge>
                    )}
                    {lesson.contentType && (
                      <Badge variant="outline">{lesson.contentType}</Badge>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => onViewLesson(lesson)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    {onAssignLesson && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAssignLesson(lesson)}
                      >
                        <User className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Songs Section */}
      {songs.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-700 flex items-center gap-2">
            <Music className="h-4 w-4" />
            Songs ({songs.length})
          </h4>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {songs.map((song) => (
              <Card key={song.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base line-clamp-2">
                    {song.title}
                  </CardTitle>
                  {song.composer && (
                    <p className="text-sm text-gray-600">by {song.composer}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {song.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {song.description}
                    </p>
                  )}
                  
                  <div className="flex gap-2 text-xs">
                    {song.genre && (
                      <Badge variant="outline">{song.genre}</Badge>
                    )}
                    {song.difficulty && (
                      <Badge variant="outline">{song.difficulty}</Badge>
                    )}
                    {song.instrument && (
                      <Badge variant="outline">{song.instrument}</Badge>
                    )}
                  </div>

                  {(song.key || song.tempo || song.duration) && (
                    <div className="flex gap-3 text-xs text-gray-500">
                      {song.key && <span>Key: {song.key}</span>}
                      {song.tempo && <span>Tempo: {song.tempo}</span>}
                      {song.duration && <span>Duration: {song.duration}</span>}
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => onViewSong(song)}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Practice
                    </Button>
                    {onAssignSong && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAssignSong(song)}
                      >
                        <User className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}