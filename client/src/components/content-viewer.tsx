import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Clock, 
  User, 
  Eye, 
  Star, 
  Video,
  ExternalLink,
  X
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

interface ContentViewerProps {
  content: EducationalContent;
  triggerElement: React.ReactNode;
}

// Simple markdown renderer for basic formatting
const MarkdownRenderer = ({ content }: { content: string }) => {
  const renderContent = () => {
    let html = content;
    
    // Headers
    html = html.replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mb-3 mt-6">$1</h3>');
    html = html.replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mb-4 mt-8">$1</h2>');
    html = html.replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mb-6 mt-8">$1</h1>');
    
    // Bold and italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
    
    // Lists
    html = html.replace(/^- (.*$)/gm, '<li class="ml-4 mb-1">• $1</li>');
    html = html.replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4 mb-1">$1. $2</li>');
    
    // Code blocks
    html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-2 py-1 rounded text-sm font-mono">$1</code>');
    
    // Line breaks
    html = html.replace(/\n\n/g, '</p><p class="mb-4">');
    html = html.replace(/\n/g, '<br>');
    
    // Wrap in paragraph
    html = '<p class="mb-4">' + html + '</p>';
    
    return html;
  };

  return (
    <div 
      className="prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: renderContent() }}
    />
  );
};

export default function ContentViewer({ content, triggerElement }: ContentViewerProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {triggerElement}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">{content.category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</Badge>
                <Badge variant="secondary">{content.difficulty}</Badge>
                <Badge variant={content.targetAudience === 'owners' ? 'default' : content.targetAudience === 'teachers' ? 'secondary' : 'outline'}>
                  {content.targetAudience}
                </Badge>
                {content.isFeatured && (
                  <Badge className="bg-yellow-100 text-yellow-800">
                    <Star className="h-3 w-3 mr-1" />
                    Featured
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-2xl font-bold mb-2">{content.title}</DialogTitle>
              <DialogDescription className="text-base">
                {content.description}
              </DialogDescription>
              
              {/* Content metadata */}
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {content.authorName}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {content.estimatedDuration}
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {content.viewCount} views
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4" />
                  {(content.rating / 100).toFixed(1)} ({content.ratingCount} ratings)
                </div>
              </div>
              
              {/* Tags */}
              {content.tags && content.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {content.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogHeader>
        
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-8">
            {/* Main content */}
            <div>
              <MarkdownRenderer content={content.content} />
            </div>
            
            {/* YouTube videos */}
            {content.contentBlocks && content.contentBlocks.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Related Videos
                </h3>
                <YouTubeContentBlock
                  blocks={content.contentBlocks}
                  onBlocksChange={() => {}} // Read-only view
                  isEditable={false}
                />
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}