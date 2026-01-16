import React, { useState, lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Link,
  FileText,
  GripVertical,
  Headphones,
  PlayCircle,
  Guitar,
  FileMusic,
  Mic
} from "lucide-react";
import { cn } from "@/lib/utils";
import GrooveEmbed from "@/components/lessons/groove-embed";
import VideoEmbed from "@/components/lessons/video-embed";
import SpotifyEmbed from "@/components/lessons/spotify-embed";
import ExternalLinkEmbed from "@/components/lessons/external-link-embed";
import PdfEmbed from "@/components/lessons/pdf-embed";
import AppleMusicEmbed from "./apple-music-embed";
import { SyncEmbedCard } from "@/components/sync/sync-embed";
import { Skeleton } from "@/components/ui/skeleton";

const MusicNotationContentBlock = lazy(() => import("../music-notation/music-notation-content-block"));

// Define content block types for songs (including legacy compatibility and music notation)
export type SongContentBlockType = 'groove' | 'groovescribe' | 'video' | 'youtube' | 'text' | 'spotify' | 'apple_music' | 'external_link' | 'pdf' | 'sync-embed' | 'sheet_music' | 'tablature' | 'abc_notation' | 'flat_embed' | 'speech_to_note';

export interface SongContentBlock {
  id: string;
  type: SongContentBlockType;
  title?: string;
  description?: string;
  data: {
    groove?: string;       // Groovescribe parameters
    groovescribe?: string; // Legacy groovescribe format
    pattern?: string;      // Legacy pattern field
    video?: string;        // Video embed URL  
    youtube?: string;      // YouTube video ID (legacy)
    videoId?: string;      // Legacy YouTube field
    text?: string;         // Text content
    spotify?: string;      // Spotify embed URL
    apple_music?: {       // Apple Music data
      url: string;
      title?: string;
      artist?: string;
    };
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
    content?: string;     // Music notation content (ABC, AlphaTex)
    scoreId?: string;     // Flat.io score ID
    fileUrl?: string;     // URL to notation file
  };
}

interface SongContentManagerProps {
  blocks: SongContentBlock[];
  onChange: (blocks: SongContentBlock[]) => void;
  editable?: boolean;
}

export default function SongContentManager({
  blocks,
  onChange,
  editable = true
}: SongContentManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const createBlock = (type: SongContentBlockType): SongContentBlock => {
    const block: SongContentBlock = {
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
      case 'abc_notation':
        block.title = 'ABC Notation';
        block.data.content = 'X:1\nT:New Tune\nM:4/4\nL:1/4\nK:C\nC D E F | G A B c |';
        break;
      case 'tablature':
        block.title = 'Guitar Tablature';
        block.data.content = '\\title "New Tab"\n\\tempo 120\n.\n:4 0.1 2.2 3.3 0.4';
        break;
      case 'flat_embed':
        block.title = 'Flat.io Score';
        block.data.scoreId = '';
        break;
      case 'sheet_music':
        block.title = 'Sheet Music';
        block.data.content = '';
        break;
      case 'speech_to_note':
        block.title = 'Voice Transcription';
        block.data.content = '';
        break;
    }
    
    return block;
  };

  const handleAddBlock = (type: SongContentBlockType) => {
    const newBlock = createBlock(type);
    onChange([...blocks, newBlock]);
    setIsAddDialogOpen(false);
  };

  const handleUpdateBlock = (blockId: string, data: Partial<SongContentBlock['data']>) => {
    const updatedBlocks = blocks.map(block =>
      block.id === blockId ? { ...block, data: { ...block.data, ...data } } : block
    );
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

  const getBlockTypeIcon = (type: SongContentBlockType) => {
    switch (type) {
      case 'groove':
      case 'groovescribe': return <Music className="h-4 w-4" />;
      case 'video':
      case 'youtube': return <Video className="h-4 w-4" />;
      case 'text': return <Type className="h-4 w-4" />;
      case 'spotify': return <Headphones className="h-4 w-4" />;
      case 'apple_music': return <Music className="h-4 w-4" />;
      case 'external_link': return <Link className="h-4 w-4" />;
      case 'pdf': return <FileText className="h-4 w-4" />;
      case 'sync-embed': return <PlayCircle className="h-4 w-4" />;
      case 'abc_notation': return <Music className="h-4 w-4" />;
      case 'tablature': return <Guitar className="h-4 w-4" />;
      case 'flat_embed': return <FileMusic className="h-4 w-4" />;
      case 'sheet_music': return <FileMusic className="h-4 w-4" />;
      case 'speech_to_note': return <Mic className="h-4 w-4" />;
      default: return <Type className="h-4 w-4" />;
    }
  };

  const getBlockTypeLabel = (type: SongContentBlockType) => {
    switch (type) {
      case 'groove':
      case 'groovescribe': return 'Rhythm Pattern';
      case 'video':
      case 'youtube': return 'Video';
      case 'text': return 'Text';
      case 'spotify': return 'Spotify';
      case 'apple_music': return 'Apple Music';
      case 'external_link': return 'External Link';
      case 'pdf': return 'Sheet Music (PDF)';
      case 'sync-embed': return 'Musicdott Sync';
      case 'abc_notation': return 'ABC Notation';
      case 'tablature': return 'Tablature';
      case 'flat_embed': return 'Flat.io Score';
      case 'sheet_music': return 'Sheet Music';
      case 'speech_to_note': return 'Speech to Note';
      default: return 'Unknown';
    }
  };

  const renderBlockContent = (block: SongContentBlock, index: number) => {
    switch (block.type) {
      case 'groove':
      case 'groovescribe':
        return (
          <GrooveEmbed
            initialGrooveParams={block.data.groove || block.data.groovescribe || block.data.pattern}
            editable={editable}
            onSave={(params: string) => handleUpdateBlock(block.id, { groove: params, groovescribe: params })}
          />
        );

      case 'video':
      case 'youtube':
        return (
          <VideoEmbed
            initialVideoUrl={block.data.video || block.data.youtube || block.data.videoId || ''}
            editable={editable}
            onSave={(url: string) => handleUpdateBlock(block.id, { video: url, youtube: url })}
          />
        );

      case 'spotify':
        return (
          <SpotifyEmbed
            initialSpotifyUrl={block.data.spotify || ''}
            editable={editable}
            onSave={(url: string) => handleUpdateBlock(block.id, { spotify: url })}
          />
        );

      case 'apple_music':
        return (
          <div className="space-y-4">
            {editable && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Input
                    placeholder="Apple Music URL"
                    value={block.data.apple_music?.url || ''}
                    onChange={(e) => handleUpdateBlock(block.id, {
                      apple_music: { ...block.data.apple_music, url: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Input
                    placeholder="Song Title (optional)"
                    value={block.data.apple_music?.title || ''}
                    onChange={(e) => handleUpdateBlock(block.id, {
                      apple_music: { url: block.data.apple_music?.url || '', title: e.target.value, artist: block.data.apple_music?.artist }
                    })}
                  />
                </div>
                <div className="md:col-span-3">
                  <Input
                    placeholder="Artist (optional)"
                    value={block.data.apple_music?.artist || ''}
                    onChange={(e) => handleUpdateBlock(block.id, {
                      apple_music: { url: block.data.apple_music?.url || '', title: block.data.apple_music?.title, artist: e.target.value }
                    })}
                  />
                </div>
              </div>
            )}
            {block.data.apple_music?.url && (
              <AppleMusicEmbed
                url={block.data.apple_music.url}
                title={block.data.apple_music.title}
                artist={block.data.apple_music.artist}
                editable={editable}
              />
            )}
          </div>
        );

      case 'external_link':
        return (
          <ExternalLinkEmbed
            initialLinkData={block.data.external_link}
            onSave={(data: any) => handleUpdateBlock(block.id, { external_link: data })}
            editable={editable}
          />
        );

      case 'text':
        return (
          <div className="space-y-2">
            {editable ? (
              <Textarea
                placeholder="Enter your text content here..."
                value={block.data.text || ''}
                onChange={(e) => handleUpdateBlock(block.id, { text: e.target.value })}
                className="min-h-[120px]"
              />
            ) : (
              <div className="prose prose-sm max-w-none">
                {block.data.text?.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            )}
          </div>
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

      case 'abc_notation':
      case 'tablature':
        return (
          <div className="space-y-4">
            {editable && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <Input
                    placeholder="Enter title..."
                    value={block.title || ''}
                    onChange={(e) => {
                      const updatedBlocks = blocks.map(b =>
                        b.id === block.id ? { ...b, title: e.target.value } : b
                      );
                      onChange(updatedBlocks);
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {block.type === 'abc_notation' ? 'ABC Notation' : 'AlphaTex Notation'}
                  </label>
                  <Textarea
                    placeholder={block.type === 'abc_notation' 
                      ? 'X:1\nT:Tune Title\nM:4/4\nL:1/4\nK:C\nC D E F | G A B c |'
                      : '\\title "Tab Title"\n\\tempo 120\n.\n:4 0.1 2.2 3.3 0.4'
                    }
                    value={block.data.content || ''}
                    onChange={(e) => handleUpdateBlock(block.id, { content: e.target.value })}
                    className="font-mono min-h-[150px]"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {block.type === 'abc_notation' 
                      ? 'Enter ABC notation - a text-based format for notating music'
                      : 'Enter AlphaTex markup for guitar tablature'
                    }
                  </p>
                </div>
              </div>
            )}
            {block.data.content && (
              <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                <MusicNotationContentBlock
                  type={block.type as 'abc_notation' | 'tablature'}
                  title={block.title}
                  content={block.data.content}
                />
              </Suspense>
            )}
          </div>
        );

      case 'flat_embed':
        return (
          <div className="space-y-4">
            {editable && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <Input
                    placeholder="Enter title..."
                    value={block.title || ''}
                    onChange={(e) => {
                      const updatedBlocks = blocks.map(b =>
                        b.id === block.id ? { ...b, title: e.target.value } : b
                      );
                      onChange(updatedBlocks);
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Flat.io Score ID</label>
                  <Input
                    placeholder="Enter Flat.io score ID (e.g., 5d5f3e21f3a1a0001f3c3c3c)"
                    value={block.data.scoreId || ''}
                    onChange={(e) => handleUpdateBlock(block.id, { scoreId: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Find the score ID in the Flat.io URL or embed code
                  </p>
                </div>
              </div>
            )}
            {block.data.scoreId && (
              <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                <MusicNotationContentBlock
                  type="flat_embed"
                  title={block.title}
                  scoreId={block.data.scoreId}
                />
              </Suspense>
            )}
          </div>
        );

      case 'sheet_music':
      case 'speech_to_note':
        return (
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <MusicNotationContentBlock
              type={block.type as 'sheet_music' | 'speech_to_note'}
              title={block.title}
              description={block.description}
              content={block.data.content}
            />
          </Suspense>
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
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Card className="border-dashed border-2 hover:border-gray-400 transition-colors cursor-pointer">
              <CardContent className="flex items-center justify-center p-8">
                <div className="text-center">
                  <Plus className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 font-medium">Add Content Block</p>
                  <p className="text-sm text-gray-500">Add streaming links, videos, or teaching materials</p>
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
                onClick={() => handleAddBlock('spotify')}
              >
                <Headphones className="h-6 w-6" />
                <span className="text-sm">Spotify</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => handleAddBlock('apple_music')}
              >
                <Music className="h-6 w-6" />
                <span className="text-sm">Apple Music</span>
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
                onClick={() => handleAddBlock('text')}
              >
                <Type className="h-6 w-6" />
                <span className="text-sm">Text</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => handleAddBlock('groove')}
              >
                <Music className="h-6 w-6" />
                <span className="text-sm">Rhythm</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => handleAddBlock('pdf')}
              >
                <FileText className="h-6 w-6" />
                <span className="text-sm">Sheet Music</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => handleAddBlock('external_link')}
              >
                <Link className="h-6 w-6" />
                <span className="text-sm">External Link</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => handleAddBlock('sync-embed')}
              >
                <PlayCircle className="h-6 w-6" />
                <span className="text-sm">Musicdott Sync</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => handleAddBlock('abc_notation')}
              >
                <Music className="h-6 w-6" />
                <span className="text-sm">ABC Notation</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => handleAddBlock('tablature')}
              >
                <Guitar className="h-6 w-6" />
                <span className="text-sm">Tablature</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => handleAddBlock('flat_embed')}
              >
                <FileMusic className="h-6 w-6" />
                <span className="text-sm">Flat.io Score</span>
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
              This song doesn't have any content blocks yet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}