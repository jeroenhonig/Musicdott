import React, { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Eye, Edit, Trash2, Plus, Search, Play, Music, Clock, User, X, Grid, List } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/layouts/app-layout";

// Import song components
import SongContentManager, { SongContentBlock } from "@/components/songs/song-content-manager";
import SongContentViewer from "@/components/songs/song-content-viewer";
import AlphabeticalBrowser from "@/components/songs/alphabetical-browser";

import { Song, Student, type InsertSong } from "@shared/schema";

export default function SongsPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  
  // Assignment dialog state
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  
  // Add song dialog state
  const [addTitle, setAddTitle] = useState<string>("");
  const [addDescription, setAddDescription] = useState<string>("");
  const [addComposer, setAddComposer] = useState<string>("");
  const [addGenre, setAddGenre] = useState<string>("");
  const [addLevel, setAddLevel] = useState<string>("");
  const [addInstrument, setAddInstrument] = useState<string>("");
  const [addKey, setAddKey] = useState<string>("");
  const [addTempo, setAddTempo] = useState<string>("");
  const [addDuration, setAddDuration] = useState<string>("");
  const [addContentBlocks, setAddContentBlocks] = useState<SongContentBlock[]>([]);
  
  // Edit dialog state
  const [editTitle, setEditTitle] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [editComposer, setEditComposer] = useState<string>("");
  const [editGenre, setEditGenre] = useState<string>("");
  const [editLevel, setEditLevel] = useState<string>("");
  const [editInstrument, setEditInstrument] = useState<string>("");
  const [editKey, setEditKey] = useState<string>("");
  const [editTempo, setEditTempo] = useState<string>("");
  const [editDuration, setEditDuration] = useState<string>("");
  const [editContentBlocks, setEditContentBlocks] = useState<SongContentBlock[]>([]);
  
  const { toast } = useToast();
  
  // Handle opening the song view dialog
  const handleViewSong = (song: Song) => {
    setSelectedSong(song);
    setIsViewDialogOpen(true);
  };
  
  // Handle editing a song
  const handleEditSong = (song: Song) => {
    setSelectedSong(song);
    setEditTitle(song.title);
    setEditDescription(song.description || "");
    setEditComposer(song.composer || "");
    setEditGenre(song.genre || "");
    setEditLevel(song.level || "");
    setEditInstrument(song.instrument || "");
    setEditKey(song.key || "");
    setEditTempo(song.tempo || "");
    setEditDuration(song.duration || "");
    // Initialize content blocks for editing
    try {
      const blocks = song.contentBlocks ? JSON.parse(song.contentBlocks) : [];
      setEditContentBlocks(blocks);
    } catch (error) {
      console.error("Failed to parse content blocks:", error);
      setEditContentBlocks([]);
    }
    setIsEditDialogOpen(true);
  };

  // Fetch songs
  const { data: songs, isLoading } = useQuery<Song[]>({
    queryKey: ["/api/songs"],
    enabled: !!user,
  });


  // Fetch students for assignment
  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ["/api/students"],
    enabled: !!user,
  });

  // Create song mutation
  const createSongMutation = useMutation({
    mutationFn: async (data: Partial<InsertSong>) => {
      const response = await apiRequest("POST", "/api/songs", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs"] });
      setIsAddDialogOpen(false);
      setAddTitle("");
      setAddDescription("");
      setAddComposer("");
      setAddGenre("");
      setAddLevel("");
      setAddInstrument("");
      setAddKey("");
      setAddTempo("");
      setAddDuration("");
      setAddContentBlocks([]);
      toast({ title: "Success", description: "Song created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete song mutation
  const deleteSongMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/songs/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs"] });
      toast({ title: "Success", description: "Song deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update song mutation
  const updateSongMutation = useMutation({
    mutationFn: async (data: { id: number, values: Partial<Omit<Song, "id" | "userId">> }) => {
      const response = await apiRequest("PUT", `/api/songs/${data.id}`, data.values);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs"] });
      setIsEditDialogOpen(false);
      toast({ title: "Success", description: "Song updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Assign song mutation
  const assignMutation = useMutation({
    mutationFn: async (data: { studentId: number; songId: number; dueDate?: string | null; notes?: string | null }) => {
      const response = await apiRequest("POST", "/api/assignments", {
        studentId: data.studentId,
        songId: data.songId,
        dueDate: data.dueDate,
        notes: data.notes,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      setIsAssignDialogOpen(false);
      setSelectedStudentId("");
      setDueDate("");
      setNotes("");
      toast({ title: "Success", description: "Song assigned successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleAssignSong = (song: Song) => {
    if (!selectedStudentId) {
      toast({ title: "Error", description: "Please select a student", variant: "destructive" });
      return;
    }

    assignMutation.mutate({
      studentId: parseInt(selectedStudentId),
      songId: song.id,
      dueDate: dueDate || null,
      notes: notes || null,
    });
  };

  const filteredSongs = (songs || []).filter((song) =>
    song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (song.description && song.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (song.composer && song.composer.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (song.genre && song.genre.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (song.instrument && song.instrument.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getLevelBadgeColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'advanced': return 'bg-red-100 text-red-800 hover:bg-red-200';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  if (isLoading) {
    return (
      <AppLayout title="Songs">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Songs">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Songs</h1>
            <p className="text-muted-foreground">
              Manage your song library and practice materials
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Add Song
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Song</DialogTitle>
                <DialogDescription>
                  Create a new song with practice materials and resources for your students.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="add-title">Title *</Label>
                  <Input 
                    id="add-title" 
                    value={addTitle}
                    onChange={(e) => setAddTitle(e.target.value)}
                    placeholder="Enter song title" 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-composer">Composer/Artist</Label>
                    <Input 
                      id="add-composer" 
                      value={addComposer}
                      onChange={(e) => setAddComposer(e.target.value)}
                      placeholder="E.g., Bach, The Beatles" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="add-genre">Genre</Label>
                    <Input 
                      id="add-genre" 
                      value={addGenre}
                      onChange={(e) => setAddGenre(e.target.value)}
                      placeholder="E.g., Classical, Rock, Jazz" 
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-level">Level</Label>
                    <Select 
                      value={addLevel}
                      onValueChange={setAddLevel}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="add-instrument">Instrument</Label>
                    <Input 
                      id="add-instrument" 
                      value={addInstrument}
                      onChange={(e) => setAddInstrument(e.target.value)}
                      placeholder="E.g., Guitar, Piano, Drums" 
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-key">Key</Label>
                    <Input 
                      id="add-key" 
                      value={addKey}
                      onChange={(e) => setAddKey(e.target.value)}
                      placeholder="E.g., C Major, Em" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="add-tempo">Tempo (BPM)</Label>
                    <Input 
                      id="add-tempo" 
                      value={addTempo}
                      onChange={(e) => setAddTempo(e.target.value)}
                      placeholder="E.g., 120" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="add-duration">Duration</Label>
                    <Input 
                      id="add-duration" 
                      value={addDuration}
                      onChange={(e) => setAddDuration(e.target.value)}
                      placeholder="E.g., 3:45" 
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="add-description">Description</Label>
                  <Textarea 
                    id="add-description" 
                    value={addDescription}
                    onChange={(e) => setAddDescription(e.target.value)}
                    placeholder="Add notes about the song, practice tips, or learning objectives" 
                    rows={3}
                  />
                </div>
                
                {/* Content Blocks Section */}
                <div className="space-y-4">
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-medium mb-4">Content & Resources</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Add sheet music, audio tracks, videos, and other practice resources for this song.
                    </p>
                    <SongContentManager
                      blocks={addContentBlocks}
                      onChange={setAddContentBlocks}
                      editable={true}
                    />
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    createSongMutation.mutate({
                      title: addTitle,
                      description: addDescription.trim() || undefined,
                      composer: addComposer.trim() || undefined,
                      genre: addGenre.trim() || undefined,
                      level: addLevel === "none" ? undefined : addLevel || undefined,
                      instrument: addInstrument.trim() || undefined,
                      key: addKey.trim() || undefined,
                      tempo: addTempo.trim() || undefined,
                      duration: addDuration.trim() || undefined,
                      contentBlocks: JSON.stringify(addContentBlocks),
                    });
                  }}
                  disabled={createSongMutation.isPending || !addTitle}
                >
                  {createSongMutation.isPending ? "Creating..." : "Create Song"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="grid" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="grid" className="flex items-center gap-2">
              <Grid className="h-4 w-4" />
              Grid View
            </TabsTrigger>
            <TabsTrigger value="artist" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Browse by Artist
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="grid" className="space-y-6">
            {/* Search Bar */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search songs by title, artist, genre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-songs"
              />
            </div>

            {/* Songs Grid */}
            {filteredSongs.length === 0 ? (
              <div className="text-center py-12">
                <Music className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No songs</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Get started by adding your first song.
                </p>
                <div className="mt-6">
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Song
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSongs.map((song) => (
              <Card key={song.id} className="group hover:shadow-lg transition-all duration-200 glass-card">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-base leading-tight line-clamp-2">
                        {song.title}
                      </CardTitle>
                      {song.composer && (
                        <CardDescription className="text-sm">
                          by {song.composer}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleViewSong(song)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleEditSong(song)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        onClick={() => deleteSongMutation.mutate(song.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  {song.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {song.description}
                    </p>
                  )}
                  
                  <div className="flex flex-wrap gap-2">
                    {song.genre && (
                      <Badge variant="secondary" className="text-xs">
                        {song.genre}
                      </Badge>
                    )}
                    {song.level && (
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getLevelBadgeColor(song.level)}`}
                      >
                        {song.level}
                      </Badge>
                    )}
                    {song.instrument && (
                      <Badge variant="outline" className="text-xs">
                        <Music className="h-3 w-3 mr-1" />
                        {song.instrument}
                      </Badge>
                    )}
                  </div>
                  
                  {(song.key || song.tempo || song.duration) && (
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      {song.key && <span>Key: {song.key}</span>}
                      {song.tempo && <span>Tempo: {song.tempo}</span>}
                      {song.duration && <span>Duration: {song.duration}</span>}
                    </div>
                  )}
                  
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleViewSong(song)}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Practice
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        setSelectedSong(song);
                        setIsAssignDialogOpen(true);
                      }}
                    >
                      <User className="h-4 w-4 mr-1" />
                      Assign
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
          </TabsContent>
          
          <TabsContent value="artist" className="space-y-6">
            <AlphabeticalBrowser 
              onViewSong={handleViewSong}
              onAssignSong={(song) => {
                setSelectedSong(song);
                setIsAssignDialogOpen(true);
              }}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* View Song Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl">
                  {selectedSong?.title}
                </DialogTitle>
                {selectedSong?.composer && (
                  <p className="text-muted-foreground mt-1">by {selectedSong.composer}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsViewDialogOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {selectedSong && (
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedSong.genre && (
                  <Badge variant="secondary">{selectedSong.genre}</Badge>
                )}
                {selectedSong.difficulty && (
                  <Badge className={getLevelBadgeColor(selectedSong.difficulty || 'beginner')}>
                    {selectedSong.difficulty}
                  </Badge>
                )}
                {selectedSong.instrument && (
                  <Badge variant="outline">
                    <Music className="h-3 w-3 mr-1" />
                    {selectedSong.instrument}
                  </Badge>
                )}
              </div>
            )}
          </DialogHeader>
          
          <div className="flex-1 overflow-auto mt-4">
            <div className="song-content">
              <SongContentViewer contentBlocksJson={selectedSong?.contentBlocks} />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Song Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedSong && (
            <>
              <DialogHeader>
                <DialogTitle>Edit Song</DialogTitle>
                <DialogDescription>
                  Make changes to this song and click save when you're done.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Title *</Label>
                  <Input 
                    id="edit-title" 
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Enter song title" 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-composer">Composer/Artist</Label>
                    <Input 
                      id="edit-composer" 
                      value={editComposer}
                      onChange={(e) => setEditComposer(e.target.value)}
                      placeholder="E.g., Bach, The Beatles" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-genre">Genre</Label>
                    <Input 
                      id="edit-genre" 
                      value={editGenre}
                      onChange={(e) => setEditGenre(e.target.value)}
                      placeholder="E.g., Classical, Rock, Jazz" 
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-level">Level</Label>
                    <Select 
                      value={editLevel}
                      onValueChange={setEditLevel}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-instrument">Instrument</Label>
                    <Input 
                      id="edit-instrument" 
                      value={editInstrument}
                      onChange={(e) => setEditInstrument(e.target.value)}
                      placeholder="E.g., Guitar, Piano, Drums" 
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-key">Key</Label>
                    <Input 
                      id="edit-key" 
                      value={editKey}
                      onChange={(e) => setEditKey(e.target.value)}
                      placeholder="E.g., C Major, Em" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-tempo">Tempo (BPM)</Label>
                    <Input 
                      id="edit-tempo" 
                      value={editTempo}
                      onChange={(e) => setEditTempo(e.target.value)}
                      placeholder="E.g., 120" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-duration">Duration</Label>
                    <Input 
                      id="edit-duration" 
                      value={editDuration}
                      onChange={(e) => setEditDuration(e.target.value)}
                      placeholder="E.g., 3:45" 
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea 
                    id="edit-description" 
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Add notes about the song, practice tips, or learning objectives" 
                    rows={3}
                  />
                </div>
                
                {/* Content Blocks Section */}
                <div className="space-y-4">
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-medium mb-4">Content & Resources</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Add sheet music, audio tracks, videos, and other practice resources for this song.
                    </p>
                    <SongContentManager
                      blocks={editContentBlocks}
                      onChange={setEditContentBlocks}
                      editable={true}
                    />
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    updateSongMutation.mutate({
                      id: selectedSong.id,
                      values: {
                        title: editTitle,
                        description: editDescription.trim() || undefined,
                        composer: editComposer.trim() || undefined,
                        genre: editGenre.trim() || undefined,
                        level: editLevel === "none" ? undefined : editLevel || undefined,
                        instrument: editInstrument.trim() || undefined,
                        key: editKey.trim() || undefined,
                        tempo: editTempo.trim() || undefined,
                        duration: editDuration.trim() || undefined,
                        contentBlocks: JSON.stringify(editContentBlocks),
                      }
                    });
                  }}
                  disabled={updateSongMutation.isPending}
                >
                  {updateSongMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Song Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          {selectedSong && (
            <>
              <DialogHeader>
                <DialogTitle>Assign Song to Student</DialogTitle>
                <DialogDescription>
                  Assign "{selectedSong.title}" to a student for practice.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="student-select">Select Student</Label>
                  <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id.toString()}>
                          {student.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="due-date">Due Date (Optional)</Label>
                  <Input 
                    id="due-date"
                    type="date" 
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="assignment-notes">Notes (Optional)</Label>
                  <Textarea 
                    id="assignment-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any specific instructions or notes for the student"
                    rows={3}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  variant="outline"
                  onClick={() => setIsAssignDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => handleAssignSong(selectedSong)}
                  disabled={assignMutation.isPending || !selectedStudentId}
                >
                  {assignMutation.isPending ? "Assigning..." : "Assign Song"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}