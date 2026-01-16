import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Plus, 
  Trash2, 
  Music, 
  Type, 
  Video, 
  ExternalLink,
  Headphones,
  GripVertical,
  FileText,
  PlayCircle
} from "lucide-react";
import GrooveEmbed from "./groove-embed";
import VideoEmbed from "./video-embed";
import TextContent from "./text-content";
import SpotifyEmbed from "./spotify-embed";
import ExternalLinkEmbed from "./external-link-embed";
import PdfEmbed from "./pdf-embed";
import { SyncEmbedCard } from "@/components/sync/sync-embed";
import { cn } from "@/lib/utils";

// Define content block types
export type ContentBlockType = 'groove' | 'groovescribe' | 'video' | 'youtube' | 'text' | 'spotify' | 'external_link' | 'pdf' | 'sync-embed';

export interface ContentBlock {
  id: string;
  type: ContentBlockType;
  pattern?: string;     // For imported groovescribe blocks
  videoId?: string;     // For imported youtube blocks
  title?: string;       // For imported blocks with titles
  description?: string; // For imported blocks with descriptions
  data: {
    groove?: string;      // Groovescribe parameters
    video?: string;       // Video embed URL
    text?: string;        // Text content
    spotify?: string;     // Spotify embed URL
    external_link?: {     // External link data
      url: string;
      title: string;
      description?: string;
    };
    pdf?: {               // PDF document data
      url: string;
      filename: string;
      title?: string;
    };
    sync?: string;        // Musicdott Sync embed URL
  };
}

interface ContentBlockManagerProps {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
  editable?: boolean;
}

export default function ContentBlockManager({
  blocks,
  onChange,
  editable = true
}: ContentBlockManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const createBlock = (type: ContentBlockType): ContentBlock => {
    const block: ContentBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      data: {}
    };
    
    // Initialize with default empty values for certain types
    switch (type) {
      case 'text':
        block.data.text = '';
        break;
      case 'video':
        block.data.video = '';
        break;
      case 'spotify':
        block.data.spotify = '';
        break;
      case 'groove':
        block.data.groove = '';
        break;
      case 'sync-embed':
        block.data.sync = '';
        break;
    }
    
    return block;
  };

  const handleAddBlock = (type: ContentBlockType) => {
    console.log('Adding block of type:', type);
    const newBlock = createBlock(type);
    console.log('Created new block:', newBlock);
    const updatedBlocks = [...blocks, newBlock];
    console.log('Updated blocks array:', updatedBlocks);
    onChange(updatedBlocks);
    setIsAddDialogOpen(false);
  };

  const handleUpdateBlock = (blockId: string, data: Partial<ContentBlock['data']>) => {
    console.log('Updating block:', blockId, 'with data:', data);
    const updatedBlocks = blocks.map(block =>
      block.id === blockId ? { ...block, data: { ...block.data, ...data } } : block
    );
    console.log('Updated blocks:', updatedBlocks);
    onChange(updatedBlocks);
  };

  const handleDeleteBlock = (blockId: string) => {
    const updatedBlocks = blocks.filter(block => block.id !== blockId);
    onChange(updatedBlocks);
  };

  const handleMoveBlock = (fromIndex: number, toIndex: number) => {
    const newBlocks = [...blocks];
    const [removed] = newBlocks.splice(fromIndex, 1);
    newBlocks.splice(toIndex, 0, removed);
    onChange(newBlocks);
  };

  const getBlockTypeIcon = (type: ContentBlockType | string) => {
    switch (type) {
      case 'groove':
      case 'groovescribe': return <Music className="h-4 w-4" />;
      case 'video':
      case 'youtube': return <Video className="h-4 w-4" />;
      case 'text': return <Type className="h-4 w-4" />;
      case 'spotify': return <Headphones className="h-4 w-4" />;
      case 'external_link': return <ExternalLink className="h-4 w-4" />;
      case 'pdf': return <FileText className="h-4 w-4" />;
      case 'sync-embed': return <PlayCircle className="h-4 w-4" />;
      default: return <Type className="h-4 w-4" />;
    }
  };

  const getBlockTypeLabel = (type: ContentBlockType | string) => {
    switch (type) {
      case 'groove':
      case 'groovescribe': return 'Groove Exercise';
      case 'video':
      case 'youtube': return 'Video';
      case 'text': return 'Text Content';
      case 'spotify': return 'Spotify';
      case 'external_link': return 'External Link';
      case 'pdf': return 'PDF Document';
      case 'sync-embed': return 'Musicdott Sync';
      default: return 'Unknown';
    }
  };

  const renderBlockContent = (block: ContentBlock, index: number) => {
    // Handle imported groovescribe blocks
    if (block.type === 'groovescribe' && block.pattern) {
      return (
        <GrooveEmbed
          initialGrooveParams={block.pattern}
          editable={editable}
          onSave={(params) => handleUpdateBlock(block.id, { groove: params })}
        />
      );
    }

    // Handle imported youtube blocks
    if (block.type === 'youtube' && block.videoId) {
      return (
        <VideoEmbed
          initialVideoUrl={`https://www.youtube.com/watch?v=${block.videoId}`}
          editable={editable}
          onSave={(url) => handleUpdateBlock(block.id, { video: url })}
        />
      );
    }

    switch (block.type) {
      case 'groove':
        return (
          <GrooveEmbed
            initialGrooveParams={block.data.groove}
            editable={editable}
            onSave={(params) => handleUpdateBlock(block.id, { groove: params })}
          />
        );

      case 'video':
        return (
          <VideoEmbed
            initialVideoUrl={block.data.video || ''}
            editable={editable}
            onSave={(url) => handleUpdateBlock(block.id, { video: url })}
          />
        );

      case 'spotify':
        return (
          <SpotifyEmbed
            initialSpotifyUrl={block.data.spotify || ''}
            editable={editable}
            onSave={(url) => handleUpdateBlock(block.id, { spotify: url })}
          />
        );

      case 'external_link':
        return (
          <ExternalLinkEmbed
            initialLinkData={block.data.external_link}
            editable={editable}
            onSave={(data) => handleUpdateBlock(block.id, { external_link: data })}
          />
        );

      case 'text':
        return (
          <TextContent
            initialContent={block.data.text || ''}
            editable={editable}
            onSave={(text) => handleUpdateBlock(block.id, { text })}
          />
        );

      case 'pdf':
        return (
          <PdfEmbed
            pdfData={block.data.pdf}
            editable={editable}
            onPdfChange={(data) => handleUpdateBlock(block.id, { pdf: data })}
          />
        );

      case 'sync-embed':
        return (
          <div className="space-y-3">
            {editable && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Musicdott Sync URL
                </label>
                <input
                  type="text"
                  placeholder="https://sync.musicdott.app/e/abc123"
                  value={block.data.sync || ''}
                  onChange={(e) => handleUpdateBlock(block.id, { sync: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Plak de URL van je Musicdott Sync embed
                </p>
              </div>
            )}
            {block.data.sync && (
              <SyncEmbedCard url={block.data.sync} height={600} />
            )}
          </div>
        );

      default:
        return (
          <div className="text-center text-gray-500 py-8">
            Content type not supported yet
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Content Blocks */}
      {blocks.map((block, index) => (
        <Card key={block.id} className="relative">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {editable && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="cursor-grab active:cursor-grabbing p-1"
                  >
                    <GripVertical className="h-4 w-4 text-gray-400" />
                  </Button>
                )}
                <div className="flex items-center gap-2">
                  {getBlockTypeIcon(block.type)}
                  <span className="font-medium">{getBlockTypeLabel(block.type)}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  Block {index + 1}
                </Badge>
              </div>
              
              {editable && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteBlock(block.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          
          <CardContent>
            {renderBlockContent(block, index)}
          </CardContent>
        </Card>
      ))}

      {/* Add Content Block */}
      {editable && (
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          console.log('Dialog onOpenChange called with:', open);
          setIsAddDialogOpen(open);
        }}>
          <DialogTrigger asChild>
            <Card 
              className="border-dashed border-2 hover:border-gray-400 transition-colors cursor-pointer"
              onClick={() => {
                console.log('Add content card clicked');
                setIsAddDialogOpen(true);
              }}
            >
              <CardContent className="flex items-center justify-center p-8">
                <div className="text-center">
                  <Plus className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 font-medium">Add Content Block</p>
                  <p className="text-sm text-gray-500">Add videos, external links, text content, and other resources for this lesson.</p>
                </div>
              </CardContent>
            </Card>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Content Block</DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => handleAddBlock('text')}
              >
                <Type className="h-6 w-6" />
                <span className="text-sm">Text Content</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => handleAddBlock('groove')}
              >
                <Music className="h-6 w-6" />
                <span className="text-sm">Groove Exercise</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => handleAddBlock('video')}
              >
                <Video className="h-6 w-6" />
                <span className="text-sm">Video</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => handleAddBlock('spotify')}
              >
                <Headphones className="h-6 w-6" />
                <span className="text-sm">Spotify</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => handleAddBlock('external_link')}
              >
                <ExternalLink className="h-6 w-6" />
                <span className="text-sm">External Link</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => handleAddBlock('pdf')}
              >
                <FileText className="h-6 w-6" />
                <span className="text-sm">PDF Document</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => handleAddBlock('sync-embed')}
              >
                <PlayCircle className="h-6 w-6" />
                <span className="text-sm">Musicdott Sync</span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Empty State */}
      {blocks.length === 0 && !editable && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Music className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Content Available</h3>
            <p className="text-gray-500">
              This lesson doesn't have any content blocks yet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}