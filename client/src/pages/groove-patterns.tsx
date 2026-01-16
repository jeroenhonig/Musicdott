/**
 * GrooveScribe Pattern Library
 * Browse, create, and manage drum patterns with GrooveScribe integration
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import AppLayout from "@/components/layouts/app-layout";
import { GrooveBuilder } from "@/components/groovescribe/groove-builder";
import { GrooveScribeBlock } from "@/components/content-blocks/groovescribe-block";
import { 
  Plus, 
  Search, 
  Filter,
  Music,
  Folder,
  Tag
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface GroovePattern {
  id: string;
  title: string;
  description: string;
  grooveData: string;
  bpm: number;
  bars: number;
  timeSignature: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  createdBy: number;
  createdAt: string;
  isPublic: boolean;
}

export default function GroovePatternsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingPattern, setEditingPattern] = useState<GroovePattern | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch groove patterns
  const { data: apiResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/groove-patterns'],
    enabled: !!user
  });

  // Extract patterns from API response
  const patterns: GroovePattern[] = apiResponse?.patterns || [];

  // Filter patterns based on search and selections
  const filteredPatterns = patterns.filter(pattern => {
    const matchesSearch = pattern.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pattern.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pattern.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesDifficulty = selectedDifficulty === "all" || pattern.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesDifficulty;
  });

  const handleCreatePattern = () => {
    setEditingPattern(null);
    setShowBuilder(true);
  };

  const handleEditPattern = (pattern: GroovePattern) => {
    setEditingPattern(pattern);
    setShowBuilder(true);
  };

  // Create pattern mutation
  const createPatternMutation = useMutation({
    mutationFn: async (patternData: any) => {
      const response = await apiRequest('POST', '/api/groove-patterns', patternData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/groove-patterns'] });
      toast({
        title: "Pattern Created",
        description: "New groove pattern created successfully",
      });
      setShowBuilder(false);
      setEditingPattern(null);
    },
    onError: (error) => {
      toast({
        title: "Create Failed",
        description: "Could not create the groove pattern",
        variant: "destructive"
      });
    }
  });

  // Update pattern mutation
  const updatePatternMutation = useMutation({
    mutationFn: async (patternData: any) => {
      const response = await apiRequest('PUT', `/api/groove-patterns/${editingPattern?.id}`, patternData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/groove-patterns'] });
      toast({
        title: "Pattern Updated",
        description: "Groove pattern updated successfully",
      });
      setShowBuilder(false);
      setEditingPattern(null);
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Could not update the groove pattern",
        variant: "destructive"
      });
    }
  });

  // Delete pattern mutation
  const deletePatternMutation = useMutation({
    mutationFn: async (patternId: string) => {
      const response = await apiRequest('DELETE', `/api/groove-patterns/${patternId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/groove-patterns'] });
      toast({
        title: "Pattern Deleted",
        description: "Groove pattern deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: "Could not delete the groove pattern",
        variant: "destructive"
      });
    }
  });

  const handleSavePattern = async (patternData: any) => {
    try {
      if (editingPattern) {
        updatePatternMutation.mutate(patternData);
      } else {
        createPatternMutation.mutate(patternData);
      }
    } catch (error) {
      console.error('Error saving pattern:', error);
    }
  };

  const handleDeletePattern = async (patternId: string) => {
    if (confirm('Are you sure you want to delete this groove pattern?')) {
      deletePatternMutation.mutate(patternId);
    }
  };

  const handleCancelBuilder = () => {
    setShowBuilder(false);
    setEditingPattern(null);
  };

  if (showBuilder) {
    return (
      <AppLayout title="Groove Pattern Builder">
        <div className="p-6">
          <GrooveBuilder
            initialPattern={editingPattern}
            onSave={handleSavePattern}
            onCancel={handleCancelBuilder}
            mode={editingPattern ? 'edit' : 'create'}
          />
        </div>
      </AppLayout>
    );
  }

  if (isLoading) {
    return (
      <AppLayout title="Groove Patterns">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-48 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Groove Patterns">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Groove Pattern Library</h1>
            <p className="text-gray-600 mt-1">
              Create, browse, and share interactive drum patterns with GrooveScribe
            </p>
          </div>
          
          <Button onClick={handleCreatePattern}>
            <Plus className="h-4 w-4 mr-2" />
            Create Pattern
          </Button>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search patterns..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              
              {/* Difficulty Filter */}
              <div>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="all">All Difficulties</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              
              {/* Category Filter */}
              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="all">All Categories</option>
                  <option value="rock">Rock</option>
                  <option value="jazz">Jazz</option>
                  <option value="latin">Latin</option>
                  <option value="funk">Funk</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <Music className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold">{patterns.length}</div>
              <div className="text-sm text-gray-600">Total Patterns</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6 text-center">
              <Folder className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold">{new Set(patterns.flatMap(p => p.tags)).size}</div>
              <div className="text-sm text-gray-600">Unique Tags</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6 text-center">
              <Tag className="h-8 w-8 mx-auto mb-2 text-orange-600" />
              <div className="text-2xl font-bold">{patterns.filter(p => p.difficulty === 'beginner').length}</div>
              <div className="text-sm text-gray-600">Beginner</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6 text-center">
              <Filter className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <div className="text-2xl font-bold">{filteredPatterns.length}</div>
              <div className="text-sm text-gray-600">Filtered Results</div>
            </CardContent>
          </Card>
        </div>

        {/* Pattern Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredPatterns.map((pattern) => (
            <GrooveScribeBlock
              key={pattern.id}
              id={pattern.id}
              title={pattern.title}
              description={pattern.description}
              grooveData={pattern.grooveData}
              bpm={pattern.bpm}
              bars={pattern.bars}
              timeSignature={pattern.timeSignature}
              difficulty={pattern.difficulty}
              tags={pattern.tags}
              showControls={true}
              onEdit={() => handleEditPattern(pattern)}
              onDelete={() => handleDeletePattern(pattern.id)}
            />
          ))}
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-48 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && filteredPatterns.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <Music className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                {patterns.length === 0 ? 'No Patterns Available' : 'No Patterns Found'}
              </h3>
              <p className="text-gray-500 mb-4">
                {patterns.length === 0 
                  ? 'Get started by creating your first groove pattern'
                  : 'Try adjusting your search terms or create a new pattern'
                }
              </p>
              <Button onClick={handleCreatePattern}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Pattern
              </Button>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <div className="text-red-500 mb-4">
                <h3 className="text-lg font-semibold mb-2">Error Loading Patterns</h3>
                <p className="text-sm">{error.message}</p>
              </div>
              <Button onClick={() => refetch()}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}