import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  FileText, 
  Video, 
  Download,
  Star,
  Users,
  Clock,
  BookOpen,
  Filter
} from "lucide-react";
import YouTubeContentBlock from "./youtube-content-block";

interface YouTubeBlock {
  id: string;
  type: 'youtube';
  url: string;
  videoId: string;
  title: string;
  description: string;
  duration: string;
  thumbnailUrl: string;
  channelName: string;
  publishedAt: string;
  viewCount: string;
}

interface EducationalContent {
  id: number;
  title: string;
  slug: string;
  description: string;
  content: string;
  contentBlocks?: YouTubeBlock[];
  contentType: string;
  category: string;
  targetAudience: string;
  difficulty: string;
  estimatedDuration: string;
  tags: string[];
  isPublished: boolean;
  isFeatured: boolean;
  authorName: string;
  viewCount: number;
  rating: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ContentFormData {
  title: string;
  slug: string;
  description: string;
  content: string;
  contentBlocks?: YouTubeBlock[];
  contentType: string;
  category: string;
  targetAudience: string;
  difficulty: string;
  estimatedDuration: string;
  tags: string[];
  isPublished: boolean;
  isFeatured: boolean;
  authorName: string;
}

const contentCategories = [
  "getting-started",
  "teaching-excellence",
  "business-growth",
  "student-success",
  "technology-tips",
  "marketing",
  "administration"
];

const difficulties = ["beginner", "intermediate", "advanced"];
const targetAudiences = ["owners", "teachers", "both"];
const contentTypes = ["guide", "tutorial", "course", "blog", "video", "template"];

export default function ContentManagement() {
  const [selectedContent, setSelectedContent] = useState<EducationalContent | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterAudience, setFilterAudience] = useState<string>("all");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch educational content
  const { data: content = [], isLoading } = useQuery<EducationalContent[]>({
    queryKey: ["/api/educational-content"],
  });

  // Create content mutation
  const createContentMutation = useMutation({
    mutationFn: (data: ContentFormData) =>
      apiRequest("POST", "/api/educational-content", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/educational-content"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Content Created",
        description: "Educational content has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create content",
        variant: "destructive",
      });
    },
  });

  // Update content mutation
  const updateContentMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ContentFormData> }) =>
      apiRequest("PUT", `/api/educational-content/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/educational-content"] });
      setIsEditDialogOpen(false);
      setSelectedContent(null);
      toast({
        title: "Content Updated",
        description: "Educational content has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update content",
        variant: "destructive",
      });
    },
  });

  // Delete content mutation
  const deleteContentMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/educational-content/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/educational-content"] });
      toast({
        title: "Content Deleted",
        description: "Educational content has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete content",
        variant: "destructive",
      });
    },
  });

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const ContentForm = ({ 
    content, 
    onSubmit, 
    isLoading: submitting 
  }: { 
    content?: EducationalContent; 
    onSubmit: (data: ContentFormData) => void;
    isLoading: boolean;
  }) => {
    const [formData, setFormData] = useState<ContentFormData>({
      title: content?.title || "",
      slug: content?.slug || "",
      description: content?.description || "",
      content: content?.content || "",
      contentBlocks: content?.contentBlocks || [],
      contentType: content?.contentType || "guide",
      category: content?.category || "getting-started",
      targetAudience: content?.targetAudience || "both",
      difficulty: content?.difficulty || "beginner",
      estimatedDuration: content?.estimatedDuration || "",
      tags: content?.tags || [],
      isPublished: content?.isPublished || false,
      isFeatured: content?.isFeatured || false,
      authorName: content?.authorName || "MusicDott Team",
    });

    const [tagInput, setTagInput] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit(formData);
    };

    const handleTitleChange = (title: string) => {
      setFormData({
        ...formData,
        title,
        slug: content ? formData.slug : generateSlug(title)
      });
    };

    const addTag = () => {
      if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
        setFormData({
          ...formData,
          tags: [...formData.tags, tagInput.trim()]
        });
        setTagInput("");
      }
    };

    const removeTag = (tagToRemove: string) => {
      setFormData({
        ...formData,
        tags: formData.tags.filter(tag => tag !== tagToRemove)
      });
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Content title"
              required
            />
          </div>
          <div>
            <Label htmlFor="slug">URL Slug</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="url-friendly-slug"
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description of the content"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="contentType">Content Type</Label>
            <Select value={formData.contentType} onValueChange={(value) => setFormData({ ...formData, contentType: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {contentTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {contentCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="difficulty">Difficulty</Label>
            <Select value={formData.difficulty} onValueChange={(value) => setFormData({ ...formData, difficulty: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {difficulties.map((difficulty) => (
                  <SelectItem key={difficulty} value={difficulty}>
                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="targetAudience">Target Audience</Label>
            <Select value={formData.targetAudience} onValueChange={(value) => setFormData({ ...formData, targetAudience: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {targetAudiences.map((audience) => (
                  <SelectItem key={audience} value={audience}>
                    {audience.charAt(0).toUpperCase() + audience.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="estimatedDuration">Estimated Duration</Label>
            <Input
              id="estimatedDuration"
              value={formData.estimatedDuration}
              onChange={(e) => setFormData({ ...formData, estimatedDuration: e.target.value })}
              placeholder="15 min read"
            />
          </div>
          <div>
            <Label htmlFor="authorName">Author Name</Label>
            <Input
              id="authorName"
              value={formData.authorName}
              onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
              placeholder="Author name"
            />
          </div>
        </div>

        <div>
          <Label>Tags</Label>
          <div className="flex items-center gap-2 mb-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Add a tag"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            />
            <Button type="button" onClick={addTag} size="sm">Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                {tag} ×
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="content">Content (Markdown)</Label>
          <Textarea
            id="content"
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            placeholder="Write your content in Markdown format..."
            rows={15}
            className="font-mono"
            required
          />
        </div>

        <div>
          <Label>YouTube Videos</Label>
          <div className="border rounded-lg p-4 bg-gray-50">
            <YouTubeContentBlock
              blocks={formData.contentBlocks || []}
              onBlocksChange={(blocks) => setFormData({ ...formData, contentBlocks: blocks })}
              isEditable={true}
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center space-x-2">
            <Switch
              id="isPublished"
              checked={formData.isPublished}
              onCheckedChange={(checked) => setFormData({ ...formData, isPublished: checked })}
            />
            <Label htmlFor="isPublished">Published</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="isFeatured"
              checked={formData.isFeatured}
              onCheckedChange={(checked) => setFormData({ ...formData, isFeatured: checked })}
            />
            <Label htmlFor="isFeatured">Featured</Label>
          </div>
        </div>

        <DialogFooter>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : content ? "Update Content" : "Create Content"}
          </Button>
        </DialogFooter>
      </form>
    );
  };

  const filteredContent = content.filter((item) => {
    if (filterCategory !== "all" && item.category !== filterCategory) return false;
    if (filterAudience !== "all" && item.targetAudience !== filterAudience) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Content Management</h2>
          <p className="text-gray-600">Create and manage educational resources for music educators</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Content
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Content</DialogTitle>
              <DialogDescription>
                Create educational content to help music school owners and teachers
              </DialogDescription>
            </DialogHeader>
            <ContentForm
              onSubmit={(data) => createContentMutation.mutate(data)}
              isLoading={createContentMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {contentCategories.map((category) => (
              <SelectItem key={category} value={category}>
                {category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterAudience} onValueChange={setFilterAudience}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Audiences" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Audiences</SelectItem>
            {targetAudiences.map((audience) => (
              <SelectItem key={audience} value={audience}>
                {audience.charAt(0).toUpperCase() + audience.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Content</p>
                <p className="text-2xl font-bold">{content.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Eye className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Published</p>
                <p className="text-2xl font-bold">{content.filter(c => c.isPublished).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Star className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Featured</p>
                <p className="text-2xl font-bold">{content.filter(c => c.isFeatured).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Views</p>
                <p className="text-2xl font-bold">{content.reduce((sum, c) => sum + c.viewCount, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content List */}
      <div className="grid gap-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-8">
              <div className="text-center text-gray-500">Loading content...</div>
            </CardContent>
          </Card>
        ) : filteredContent.length === 0 ? (
          <Card>
            <CardContent className="p-8">
              <div className="text-center text-gray-500">
                No content found. Create your first educational resource!
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredContent.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">{item.category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</Badge>
                      <Badge variant="outline">{item.difficulty}</Badge>
                      <Badge variant={item.targetAudience === 'owners' ? 'default' : item.targetAudience === 'teachers' ? 'secondary' : 'outline'}>
                        {item.targetAudience}
                      </Badge>
                      {item.isPublished && <Badge className="bg-green-100 text-green-800">Published</Badge>}
                      {item.isFeatured && <Badge className="bg-yellow-100 text-yellow-800">Featured</Badge>}
                    </div>
                    <CardTitle className="mb-2">{item.title}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {item.estimatedDuration}
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        {item.viewCount} views
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4" />
                        {(item.rating / 100).toFixed(1)} ({item.ratingCount} ratings)
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedContent(item);
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this content?")) {
                          deleteContentMutation.mutate(item.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Content</DialogTitle>
            <DialogDescription>
              Update the educational content
            </DialogDescription>
          </DialogHeader>
          {selectedContent && (
            <ContentForm
              content={selectedContent}
              onSubmit={(data) => updateContentMutation.mutate({ id: selectedContent.id, data })}
              isLoading={updateContentMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}