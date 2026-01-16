import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Video, 
  Edit, 
  Trash2, 
  ExternalLink,
  Clock,
  Eye,
  CheckCircle
} from "lucide-react";

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

interface YouTubeContentBlockProps {
  blocks: YouTubeBlock[];
  onBlocksChange: (blocks: YouTubeBlock[]) => void;
  isEditable?: boolean;
}

export default function YouTubeContentBlock({ blocks, onBlocksChange, isEditable = true }: YouTubeContentBlockProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<YouTubeBlock | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [videoData, setVideoData] = useState<Partial<YouTubeBlock> | null>(null);
  
  const { toast } = useToast();

  // Extract video ID from various YouTube URL formats
  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  // Fetch video metadata from YouTube oEmbed API
  const fetchVideoData = async (url: string): Promise<Partial<YouTubeBlock> | null> => {
    const videoId = extractVideoId(url);
    if (!videoId) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid YouTube URL",
        variant: "destructive"
      });
      return null;
    }

    try {
      setIsLoading(true);
      
      // Use YouTube oEmbed API for basic video info
      const oEmbedResponse = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
      );
      
      if (!oEmbedResponse.ok) {
        throw new Error("Video not found or is private");
      }
      
      const oEmbedData = await oEmbedResponse.json();
      
      // Extract additional data from the oEmbed response
      const videoData: Partial<YouTubeBlock> = {
        id: crypto.randomUUID(),
        type: 'youtube',
        url: url,
        videoId: videoId,
        title: oEmbedData.title || "YouTube Video",
        description: "", // Will be filled manually if needed
        duration: "", // Not available in oEmbed, can be filled manually
        thumbnailUrl: oEmbedData.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        channelName: oEmbedData.author_name || "Unknown Channel",
        publishedAt: "",
        viewCount: ""
      };

      return videoData;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch video data",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleUrlInput = async () => {
    if (!urlInput.trim()) return;
    
    const data = await fetchVideoData(urlInput);
    if (data) {
      setVideoData(data);
    }
  };

  const handleAddBlock = () => {
    if (!videoData) return;
    
    const newBlock: YouTubeBlock = {
      ...videoData,
      description: videoData.description || "",
      duration: videoData.duration || "",
      publishedAt: videoData.publishedAt || "",
      viewCount: videoData.viewCount || ""
    } as YouTubeBlock;

    if (editingBlock) {
      // Update existing block
      const updatedBlocks = blocks.map(block => 
        block.id === editingBlock.id ? newBlock : block
      );
      onBlocksChange(updatedBlocks);
    } else {
      // Add new block
      onBlocksChange([...blocks, newBlock]);
    }

    // Reset form
    setUrlInput("");
    setVideoData(null);
    setEditingBlock(null);
    setIsDialogOpen(false);
    
    toast({
      title: "Success",
      description: editingBlock ? "YouTube video updated" : "YouTube video added"
    });
  };

  const handleEditBlock = (block: YouTubeBlock) => {
    setEditingBlock(block);
    setUrlInput(block.url);
    setVideoData(block);
    setIsDialogOpen(true);
  };

  const handleDeleteBlock = (blockId: string) => {
    const updatedBlocks = blocks.filter(block => block.id !== blockId);
    onBlocksChange(updatedBlocks);
    toast({
      title: "Deleted",
      description: "YouTube video removed"
    });
  };

  const updateVideoData = (field: keyof YouTubeBlock, value: string) => {
    if (videoData) {
      setVideoData({
        ...videoData,
        [field]: value
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Add YouTube Video Button */}
      {isEditable && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add YouTube Video
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingBlock ? "Edit YouTube Video" : "Add YouTube Video"}
              </DialogTitle>
              <DialogDescription>
                Add a YouTube video to your content with automatic title and thumbnail fetching
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* URL Input */}
              <div>
                <Label htmlFor="youtube-url">YouTube URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="youtube-url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleUrlInput} 
                    disabled={isLoading || !urlInput.trim()}
                  >
                    {isLoading ? "Loading..." : "Fetch"}
                  </Button>
                </div>
              </div>

              {/* Video Preview */}
              {videoData && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <img 
                        src={videoData.thumbnailUrl} 
                        alt={videoData.title}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <div>
                        <Label htmlFor="video-title">Title</Label>
                        <Input
                          id="video-title"
                          value={videoData.title || ""}
                          onChange={(e) => updateVideoData('title', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="channel-name">Channel</Label>
                        <Input
                          id="channel-name"
                          value={videoData.channelName || ""}
                          onChange={(e) => updateVideoData('channelName', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="video-duration">Duration (optional)</Label>
                      <Input
                        id="video-duration"
                        value={videoData.duration || ""}
                        onChange={(e) => updateVideoData('duration', e.target.value)}
                        placeholder="e.g., 5:24"
                      />
                    </div>
                    <div>
                      <Label htmlFor="view-count">View Count (optional)</Label>
                      <Input
                        id="view-count"
                        value={videoData.viewCount || ""}
                        onChange={(e) => updateVideoData('viewCount', e.target.value)}
                        placeholder="e.g., 1.2M views"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="video-description">Description (optional)</Label>
                    <Textarea
                      id="video-description"
                      value={videoData.description || ""}
                      onChange={(e) => updateVideoData('description', e.target.value)}
                      placeholder="Add a description for this video in your content"
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddBlock}>
                      {editingBlock ? "Update Video" : "Add Video"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* YouTube Video Blocks */}
      <div className="space-y-4">
        {blocks.map((block) => (
          <Card key={block.id} className="overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    <Video className="h-3 w-3 mr-1" />
                    YouTube
                  </Badge>
                  {block.duration && (
                    <Badge variant="secondary" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {block.duration}
                    </Badge>
                  )}
                  {block.viewCount && (
                    <Badge variant="secondary" className="text-xs">
                      <Eye className="h-3 w-3 mr-1" />
                      {block.viewCount}
                    </Badge>
                  )}
                </div>
                {isEditable && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditBlock(block)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteBlock(block.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <a href={block.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                {/* YouTube Embed */}
                <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${block.videoId}`}
                    title={block.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute top-0 left-0 w-full h-full rounded-lg"
                  />
                </div>

                {/* Video Info */}
                <div>
                  <h3 className="font-semibold text-lg mb-1">{block.title}</h3>
                  {block.channelName && (
                    <p className="text-sm text-gray-600 mb-2">by {block.channelName}</p>
                  )}
                  {block.description && (
                    <p className="text-sm text-gray-700">{block.description}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {blocks.length === 0 && !isEditable && (
        <div className="text-center py-8 text-gray-500">
          No YouTube videos added yet
        </div>
      )}
    </div>
  );
}