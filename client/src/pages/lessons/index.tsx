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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Eye, Edit, Trash2, Plus, Search, Play, Music, Clock, User, BookOpen, X, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/layouts/app-layout";

// Import lesson components directly
import ContentBlockManager, { ContentBlock } from "@/components/lessons/content-block-manager";
import LessonContentViewer from "@/components/lessons/lesson-content-viewer";
import LessonPreview from "@/components/lessons/lesson-preview";
import LessonCategoriesManager from "@/components/lessons/lesson-categories-manager";
import { Lesson, Student, type InsertLesson } from "@shared/schema";

export default function LessonsPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'categories' | 'lessons' | 'preview'>('lessons');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  
  // Assignment dialog state
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  
  // Add lesson dialog state
  const [addTitle, setAddTitle] = useState<string>("");
  const [addDescription, setAddDescription] = useState<string>("");
  const [addContentType, setAddContentType] = useState<string>("standard");
  const [addInstrument, setAddInstrument] = useState<string>("");
  const [addLevel, setAddLevel] = useState<string>("");
  const [addCategoryId, setAddCategoryId] = useState<string>("");
  const [addContentBlocks, setAddContentBlocks] = useState<ContentBlock[]>([]);
  
  // Edit dialog state - all at top level to fix hooks violation
  const [editTitle, setEditTitle] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [editContentType, setEditContentType] = useState<string>("");
  const [editInstrument, setEditInstrument] = useState<string>("");
  const [editLevel, setEditLevel] = useState<string>("");
  const [editCategoryId, setEditCategoryId] = useState<string>("");
  const [editContentBlocks, setEditContentBlocks] = useState<ContentBlock[]>([]);
  
  const { toast } = useToast();
  
  // Handle opening the lesson view dialog
  const handleViewLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setIsViewDialogOpen(true);
  };
  
  // Handle editing a lesson
  const handleEditLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setEditTitle(lesson.title);
    setEditDescription(lesson.description || "");
    setEditContentType(lesson.contentType || "");
    setEditInstrument(lesson.instrument || "");
    setEditLevel(lesson.level || "");
    setEditCategoryId(lesson.categoryId ? lesson.categoryId.toString() : "none");
    // Initialize content blocks for editing
    try {
      const blocks = lesson.contentBlocks ? JSON.parse(lesson.contentBlocks) : [];
      setEditContentBlocks(blocks);
    } catch (error) {
      console.error("Failed to parse content blocks:", error);
      setEditContentBlocks([]);
    }
    setIsEditDialogOpen(true);
  };

  // Fetch lessons
  const { data: lessons, isLoading } = useQuery<Lesson[]>({
    queryKey: ["/api/lessons"],
    enabled: !!user,
  });


  // Fetch lesson categories
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["/api/lesson-categories"],
    enabled: !!user,
  });

  // Fetch students for assignment
  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ["/api/students"],
    enabled: !!user,
  });

  // Create lesson mutation
  const createLessonMutation = useMutation({
    mutationFn: async (data: Partial<InsertLesson>) => {
      const response = await apiRequest("POST", "/api/lessons", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
      setIsAddDialogOpen(false);
      setAddTitle("");
      setAddDescription("");
      setAddContentType("standard");
      setAddInstrument("");
      setAddLevel("");
      setAddCategoryId("");
      setAddContentBlocks([]);
      toast({ title: "Success", description: "Lesson created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete lesson mutation
  const deleteLessonMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/lessons/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
      toast({ title: "Success", description: "Lesson deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update lesson mutation
  const updateLessonMutation = useMutation({
    mutationFn: async (data: { id: number, values: Partial<Omit<Lesson, "id" | "userId">> }) => {
      const response = await apiRequest("PUT", `/api/lessons/${data.id}`, data.values);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
      setIsEditDialogOpen(false);
      toast({ title: "Success", description: "Lesson updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Assign lesson mutation
  const assignMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/assignments", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      setIsAssignDialogOpen(false);
      setSelectedStudentId("");
      setDueDate("");
      setNotes("");
      toast({ title: "Success", description: "Lesson assigned successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleAssignLesson = (lesson: Lesson) => {
    if (!selectedStudentId) {
      toast({ title: "Error", description: "Please select a student", variant: "destructive" });
      return;
    }

    assignMutation.mutate({
      studentId: parseInt(selectedStudentId),
      lessonId: lesson.id,
      dueDate: dueDate || null,
      notes: notes || null,
    });
  };

  // Filter lessons by category if selected
  const filteredLessons = (lessons || []).filter((lesson) => {
    const matchesCategory = selectedCategoryId === null || lesson.categoryId === selectedCategoryId;
    const matchesSearch = lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lesson.description && lesson.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lesson.instrument && lesson.instrument.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lesson.level && lesson.level.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  // Group lessons by category for display
  const lessonsByCategory = (categories || []).reduce((acc, category) => {
    acc[category.id] = {
      ...category,
      lessons: (lessons || []).filter(lesson => lesson.categoryId === category.id)
    };
    return acc;
  }, {} as any);

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
      <AppLayout title="Lessons">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Lessons">
      <div className="max-w-full overflow-x-hidden">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold">Lessons</h1>
              <p className="text-muted-foreground text-sm">
                Browse lessons by category and assign them to students
              </p>
            </div>
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Settings className="h-4 w-4" />
                    Manage Categories
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Manage Lesson Categories</DialogTitle>
                    <DialogDescription>
                      Create and organize categories for your lessons
                    </DialogDescription>
                  </DialogHeader>
                  <LessonCategoriesManager />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Navigation Bar */}
        <div className="mb-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b pb-4">
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'categories' ? 'default' : 'outline'}
                onClick={() => setViewMode('categories')}
              >
                Categories
              </Button>
              <Button
                variant={viewMode === 'lessons' ? 'default' : 'outline'}
                onClick={() => setViewMode('lessons')}
              >
                All Lessons
              </Button>
              <Button
                variant={viewMode === 'preview' ? 'default' : 'outline'}
                onClick={() => setViewMode('preview')}
              >
                <Play className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </div>
            <div className="flex gap-2">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Add Lesson
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Lesson</DialogTitle>
                <DialogDescription>
                  Create a new lesson with content and resources for your students.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="add-title">Title *</Label>
                  <Input 
                    id="add-title" 
                    value={addTitle}
                    onChange={(e) => setAddTitle(e.target.value)}
                    placeholder="Enter lesson title" 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-type">Content Type</Label>
                    <Select 
                      value={addContentType}
                      onValueChange={setAddContentType}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select content type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="technique">Technique</SelectItem>
                        <SelectItem value="theory">Theory</SelectItem>
                        <SelectItem value="song">Song</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="add-level">Skill Level</Label>
                    <Select 
                      value={addLevel}
                      onValueChange={setAddLevel}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select skill level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-category">Category</Label>
                    <Select 
                      value={addCategoryId}
                      onValueChange={setAddCategoryId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Category</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: category.color }}
                              />
                              {category.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="add-instrument">Instrument</Label>
                    <Input 
                      id="add-instrument" 
                      value={addInstrument}
                      onChange={(e) => setAddInstrument(e.target.value)}
                      placeholder="e.g., Piano, Guitar, Drums" 
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="add-description">Description</Label>
                  <Textarea 
                    id="add-description" 
                    value={addDescription}
                    onChange={(e) => setAddDescription(e.target.value)}
                    placeholder="Add notes about the lesson" 
                    rows={3}
                  />
                </div>
                
                {/* Content Blocks Section */}
                <div className="space-y-4">
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-medium mb-4">Content & Resources</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Add videos, external links, text content, and other resources for this lesson.
                    </p>
                    <ContentBlockManager
                      blocks={addContentBlocks}
                      onChange={(blocks) => {
                        console.log('ContentBlockManager onChange called with:', blocks);
                        setAddContentBlocks(blocks);
                      }}
                      editable={true}
                    />
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                      <strong>Debug:</strong> Current blocks count: {addContentBlocks.length}
                      {addContentBlocks.length > 0 && (
                        <div>Types: {addContentBlocks.map(b => b.type).join(', ')}</div>
                      )}
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
                      if (!addTitle.trim()) {
                        toast({
                          title: "Error",
                          description: "Please enter a lesson title",
                          variant: "destructive"
                        });
                        return;
                      }
                      
                      createLessonMutation.mutate({
                        title: addTitle,
                        description: addDescription.trim() || undefined,
                        contentType: addContentType,
                        instrument: addInstrument.trim() || undefined,
                        level: addLevel === "none" ? undefined : addLevel || undefined,
                        categoryId: addCategoryId && addCategoryId !== "none" ? parseInt(addCategoryId) : null,
                        contentBlocks: JSON.stringify(addContentBlocks),
                      });
                    }}
                    disabled={createLessonMutation.isPending || !addTitle.trim()}
                  >
                    {createLessonMutation.isPending ? (
                      <>
                        <span className="mr-2">Creating...</span>
                        <div className="animate-spin h-4 w-4 rounded-full border-2 border-t-transparent border-white" />
                      </>
                    ) : (
                      "Create Lesson"
                    )}
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search lessons..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="space-y-4">
          {/* Categories View */}
          {viewMode === 'categories' && (
            <div className="w-full">
              {categories.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-700 mb-2">No Lesson Categories</h3>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    Create your first lesson category to organize your educational content. 
                    Categories help group related lessons together.
                  </p>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        Create First Category
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Manage Lesson Categories</DialogTitle>
                        <DialogDescription>
                          Create and organize categories for your lessons
                        </DialogDescription>
                      </DialogHeader>
                      <LessonCategoriesManager />
                    </DialogContent>
                  </Dialog>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {categories.map((category) => {
                  const categoryLessons = lessonsByCategory[category.id]?.lessons || [];
                  return (
                    <Card key={category.id} className="liquid-glass hover:shadow-lg transition-shadow w-full">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div 
                              className="w-4 h-4 rounded-full shadow-sm flex-shrink-0"
                              style={{ backgroundColor: category.color }}
                            />
                            <div className="min-w-0 flex-1">
                              <CardTitle className="text-lg truncate">{category.name}</CardTitle>
                              <CardDescription className="text-sm">
                                {categoryLessons.length} lessons
                              </CardDescription>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                  <CardContent className="space-y-2 pt-2">
                    {categoryLessons.length > 0 ? (
                      <>
                        {categoryLessons.slice(0, 3).map((lesson: Lesson) => (
                          <div key={lesson.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{lesson.title?.replace(/"/g, '')}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {lesson.description?.replace(/"/g, '') || "No description"}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewLesson(lesson)}
                              >
                                View
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedLesson(lesson);
                                  setIsAssignDialogOpen(true);
                                }}
                              >
                                <User className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {categoryLessons.length > 3 && (
                          <div className="pt-3 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedCategoryId(category.id);
                                setViewMode('lessons');
                              }}
                            >
                              View all {categoryLessons.length} lessons
                            </Button>
                          </div>
                        )}
                        <div className="pt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              setSelectedCategoryId(category.id);
                              setViewMode('lessons');
                            }}
                          >
                            View Lessons ({categoryLessons.length})
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground">No lessons assigned yet</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => {
                            setAddCategoryId(category.id.toString());
                            setIsAddDialogOpen(true);
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Lesson
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
                  })}
                </div>
              )}
            </div>
          )}

        {/* Lessons Grid View */}
        {viewMode === 'lessons' && (
          <div className="space-y-4">
            {selectedCategoryId && (
              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedCategoryId(null);
                    setViewMode('categories');
                  }}
                >
                  ← Back to Categories
                </Button>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: categories.find(c => c.id === selectedCategoryId)?.color }}
                  />
                  <span className="font-medium">
                    {categories.find(c => c.id === selectedCategoryId)?.name}
                  </span>
                </div>
              </div>
            )}
            
            {filteredLessons.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">No Lessons Found</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  {(lessons?.length || 0) === 0 
                    ? "Create your first lesson to start building your educational content library."
                    : "No lessons match your current filters. Try adjusting your search or category selection."
                  }
                </p>
                {(lessons?.length || 0) === 0 && (
                  <Button 
                    className="gap-2"
                    onClick={() => setIsAddDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Create First Lesson
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredLessons.map((lesson) => (
                <Card key={lesson.id} className="liquid-glass hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{lesson.title}</CardTitle>
                        {lesson.description && (
                          <CardDescription className="text-sm line-clamp-2">
                            {lesson.description}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-2 mb-4">
                      {lesson.level && (
                        <Badge 
                          variant="secondary" 
                          className={getLevelBadgeColor(lesson.level)}
                        >
                          {lesson.level}
                        </Badge>
                      )}
                      {lesson.instrument && (
                        <Badge variant="outline">
                          <Music className="h-3 w-3 mr-1" />
                          {lesson.instrument}
                        </Badge>
                      )}
                      {lesson.contentType && (
                        <Badge variant="outline">
                          <BookOpen className="h-3 w-3 mr-1" />
                          {lesson.contentType}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleViewLesson(lesson)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedLesson(lesson);
                          setIsAssignDialogOpen(true);
                        }}
                      >
                        <User className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditLesson(lesson)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteLessonMutation.mutate(lesson.id)}
                        disabled={deleteLessonMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Preview Mode */}
        {viewMode === 'preview' && (
          <div className="space-y-4">
            {selectedCategoryId && (
              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedCategoryId(null);
                    setViewMode('categories');
                  }}
                >
                  ← Back to Categories
                </Button>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: categories.find(c => c.id === selectedCategoryId)?.color }}
                  />
                  <span className="font-medium">
                    {categories.find(c => c.id === selectedCategoryId)?.name}
                  </span>
                </div>
              </div>
            )}
            
            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
              {filteredLessons.map((lesson) => (
                <LessonPreview
                  key={lesson.id}
                  lesson={lesson}
                  onViewFull={() => handleViewLesson(lesson)}
                />
              ))}
            </div>
          </div>
        )}

        {filteredLessons.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No lessons found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm ? "No lessons match your search." : "Get started by creating your first lesson."}
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Lesson
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Fullscreen Lesson View */}
      {isViewDialogOpen && selectedLesson && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 overflow-auto">
          <div className="max-w-4xl mx-auto p-6">
            <div className="flex justify-between items-center mb-6 pb-4 border-b">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsViewDialogOpen(false)}
                  className="hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold">{selectedLesson.title}</h1>
                  {selectedLesson.description && (
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      {selectedLesson.description}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {selectedLesson.level && (
                  <Badge variant="secondary" className={getLevelBadgeColor(selectedLesson.level)}>
                    {selectedLesson.level}
                  </Badge>
                )}
                {selectedLesson.instrument && (
                  <Badge variant="outline">
                    <Music className="h-3 w-3 mr-1" />
                    {selectedLesson.instrument}
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="lesson-content">
              <LessonContentViewer contentBlocksJson={selectedLesson.contentBlocks} />
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
                <strong>Debug:</strong> Content blocks data: {JSON.stringify(selectedLesson.contentBlocks).substring(0, 200)}...
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Lesson Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedLesson && (
            <>
              <DialogHeader>
                <DialogTitle>Edit Lesson</DialogTitle>
                <DialogDescription>
                  Make changes to this lesson and click save when you're done.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Title *</Label>
                  <Input 
                    id="edit-title" 
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Enter lesson title" 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-type">Content Type</Label>
                    <Select 
                      value={editContentType}
                      onValueChange={setEditContentType}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select content type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="technique">Technique</SelectItem>
                        <SelectItem value="theory">Theory</SelectItem>
                        <SelectItem value="song">Song</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-level">Skill Level</Label>
                    <Select 
                      value={editLevel}
                      onValueChange={setEditLevel}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select skill level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-category">Category</Label>
                    <Select 
                      value={editCategoryId}
                      onValueChange={setEditCategoryId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Category</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: category.color }}
                              />
                              {category.name}
                            </div>
                          </SelectItem>
                        ))}
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
                
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea 
                    id="edit-description" 
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Add notes about the lesson" 
                    rows={3}
                  />
                </div>
                
                {/* Content Blocks Section */}
                <div className="space-y-4">
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-medium mb-4">Content & Resources</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Add videos, external links, text content, and other resources for this lesson.
                    </p>
                    <ContentBlockManager
                      blocks={editContentBlocks}
                      onChange={setEditContentBlocks}
                      editable={true}
                    />
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
                      updateLessonMutation.mutate({
                        id: selectedLesson.id,
                        values: {
                          title: editTitle,
                          description: editDescription.trim() || undefined,
                          contentType: editContentType,
                          instrument: editInstrument.trim() || undefined,
                          level: editLevel === "none" ? undefined : editLevel || undefined,
                          categoryId: editCategoryId && editCategoryId !== "none" ? parseInt(editCategoryId) : null,
                          contentBlocks: JSON.stringify(editContentBlocks),
                        }
                      });
                    }}
                    disabled={updateLessonMutation.isPending}
                  >
                    {updateLessonMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Lesson Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          {selectedLesson && (
            <>
              <DialogHeader>
                <DialogTitle>Assign Lesson to Student</DialogTitle>
                <DialogDescription>
                  Assign "{selectedLesson.title}" to a student with optional due date and notes.
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
                    placeholder="Add any specific instructions or notes for this assignment"
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
                  onClick={() => handleAssignLesson(selectedLesson)}
                  disabled={assignMutation.isPending || !selectedStudentId}
                >
                  {assignMutation.isPending ? (
                    <>
                      <span className="mr-2">Assigning...</span>
                      <div className="animate-spin h-4 w-4 rounded-full border-2 border-t-transparent border-white" />
                    </>
                  ) : (
                    "Assign Lesson"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </AppLayout>
  );
}