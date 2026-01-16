import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Play, Search, Music, User } from "lucide-react";
import type { Song } from "@shared/schema";

interface AlphabeticalBrowserProps {
  onViewSong: (song: Song) => void;
  onAssignSong?: (song: Song) => void;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('');

export default function AlphabeticalBrowser({ onViewSong, onAssignSong }: AlphabeticalBrowserProps) {
  const [selectedLetter, setSelectedLetter] = useState('A');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch songs by letter
  const { data: songs = [], isLoading } = useQuery({
    queryKey: ['/api/songs/by-letter', selectedLetter],
    queryFn: async () => {
      const response = await fetch(`/api/songs/by-letter/${selectedLetter}`);
      if (!response.ok) throw new Error('Failed to fetch songs');
      return response.json();
    },
    enabled: !!selectedLetter
  });

  // Filter songs by search term
  const filteredSongs = songs.filter((song: Song) => 
    searchTerm === '' || 
    song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    song.composer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    song.genre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search songs by title, artist, or genre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Alphabet Navigation */}
      <div className="bg-white rounded-lg border p-4">
        <p className="text-sm text-gray-600 mb-3">Click on the first letter of the artist name you're looking for:</p>
        <div className="grid grid-cols-9 sm:grid-cols-13 lg:grid-cols-27 gap-1">
          {ALPHABET.map((letter) => (
            <Button
              key={letter}
              variant={selectedLetter === letter ? "default" : "outline"}
              size="sm"
              className="h-10 w-10 p-0 text-sm font-medium"
              onClick={() => setSelectedLetter(letter)}
            >
              {letter}
            </Button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {searchTerm 
              ? `Search Results (${filteredSongs.length})` 
              : `Artists starting with "${selectedLetter}" (${filteredSongs.length})`
            }
          </h3>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Music className="h-8 w-8 mx-auto mb-2 opacity-50 animate-pulse" />
              <p className="text-gray-500">Loading songs...</p>
            </div>
          </div>
        ) : filteredSongs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>
              {searchTerm 
                ? "No songs found matching your search."
                : `No songs found for artists starting with "${selectedLetter}".`
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSongs.map((song: Song) => (
              <Card key={song.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{song.title}</h4>
                          {song.composer && (
                            <p className="text-sm text-gray-600 truncate">
                              by {song.composer}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex gap-2 flex-shrink-0">
                          {song.genre && (
                            <Badge variant="outline" className="text-xs">
                              {song.genre}
                            </Badge>
                          )}
                          {song.difficulty && (
                            <Badge variant="outline" className="text-xs">
                              {song.difficulty}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {(song.key || song.tempo || song.duration) && (
                        <div className="flex gap-4 text-xs text-gray-500 mt-2">
                          {song.key && <span>Key: {song.key}</span>}
                          {song.tempo && <span>Tempo: {song.tempo}</span>}
                          {song.duration && <span>Duration: {song.duration}</span>}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 flex-shrink-0 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
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
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}