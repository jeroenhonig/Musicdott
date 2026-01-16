import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, X, Music, BookOpen, Loader2 } from "lucide-react";
import SearchResults from './search-results';
import AlphabeticalBrowser from '../songs/alphabetical-browser';
import { useDebounce } from '@/hooks/use-debounce';
import type { Lesson, Song } from "@shared/schema";

interface EnhancedSearchProps {
  onViewLesson: (lesson: Lesson) => void;
  onViewSong: (song: Song) => void;
  onAssignLesson?: (lesson: Lesson) => void;
  onAssignSong?: (song: Song) => void;
}

export default function EnhancedSearch({ 
  onViewLesson, 
  onViewSong, 
  onAssignLesson, 
  onAssignSong 
}: EnhancedSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAlphabetical, setShowAlphabetical] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Search query
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['/api/search', debouncedSearchTerm],
    queryFn: async () => {
      if (!debouncedSearchTerm.trim() || debouncedSearchTerm.trim().length < 2) {
        return { lessons: [], songs: [] };
      }
      
      const response = await fetch(`/api/search?q=${encodeURIComponent(debouncedSearchTerm.trim())}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: debouncedSearchTerm.trim().length >= 2
  });

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setShowAlphabetical(false);
  }, []);

  const hasSearchTerm = debouncedSearchTerm.trim().length >= 2;
  const hasResults = searchResults && (searchResults.lessons.length > 0 || searchResults.songs.length > 0);

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Lessons & Songs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search for lessons, songs, artists, or categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                onClick={clearSearch}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant={showAlphabetical ? "default" : "outline"}
              size="sm"
              onClick={() => setShowAlphabetical(!showAlphabetical)}
              className="flex items-center gap-2"
            >
              <Music className="h-4 w-4" />
              Browse Songs A-Z
            </Button>
            {searchTerm && (
              <Button variant="outline" size="sm" onClick={clearSearch}>
                Clear Search
              </Button>
            )}
          </div>

          {/* Search Stats */}
          {hasSearchTerm && searchResults && (
            <div className="text-sm text-gray-600 border-t pt-3">
              Found {searchResults.lessons.length} lessons and {searchResults.songs.length} songs
              {searchTerm && ` matching "${searchTerm}"`}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {showAlphabetical && !hasSearchTerm ? (
        <AlphabeticalBrowser
          onViewSong={onViewSong}
          onAssignSong={onAssignSong}
        />
      ) : hasSearchTerm ? (
        <div>
          {isSearching ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-gray-400" />
                <p className="text-gray-500">Searching...</p>
              </div>
            </div>
          ) : searchResults ? (
            <SearchResults
              results={searchResults}
              onViewLesson={onViewLesson}
              onViewSong={onViewSong}
              onAssignLesson={onAssignLesson}
              onAssignSong={onAssignSong}
            />
          ) : null}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <div className="space-y-4">
              <div className="flex justify-center gap-4">
                <BookOpen className="h-12 w-12 text-gray-300" />
                <Music className="h-12 w-12 text-gray-300" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Find Your Content
                </h3>
                <p className="text-gray-500 max-w-sm mx-auto">
                  Search for lessons and songs by title, artist, category, or instrument. 
                  Or browse songs alphabetically by artist name.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}