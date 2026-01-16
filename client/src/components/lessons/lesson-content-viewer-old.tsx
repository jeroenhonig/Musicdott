import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import GrooveEmbed from './groove-embed';
import VideoEmbed from './video-embed';
import TextContent from './text-content';
import SpotifyEmbed from './spotify-embed';
import ExternalLinkEmbed from './external-link-embed';
import { ContentBlock } from './content-block-manager';
import { parseContentBlocks } from '@/utils/content-block-parser';

interface LessonContentViewerProps {
  contentBlocksJson?: string | any[] | any;
}

export default function LessonContentViewer({ contentBlocksJson }: LessonContentViewerProps) {
  // Parse and normalize content blocks - handle both string and direct array formats
  const normalizedContentBlocks = React.useMemo(() => {
    if (!contentBlocksJson) return [];
    
    // If it's already an array (direct format from memory storage), use it directly
    if (Array.isArray(contentBlocksJson)) {
      return parseContentBlocks(contentBlocksJson);
    }
    
    // If it's a string, try to parse it
    if (typeof contentBlocksJson === 'string') {
      try {
        const parsed = JSON.parse(contentBlocksJson);
        return parseContentBlocks(parsed);
      } catch (error) {
        console.error('Failed to parse content blocks JSON:', error);
        return [];
      }
    }
    
    // If it's an object but not an array, try to extract content
    if (typeof contentBlocksJson === 'object') {
      return parseContentBlocks([contentBlocksJson]);
    }
    
    return [];
  }, [contentBlocksJson]);
  
  if (!normalizedContentBlocks.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-gray-500">
          No content available for this lesson
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-12 max-w-full">
      {normalizedContentBlocks.map((block, index) => (
        <div 
          key={block.id} 
          className="mb-8 pb-8 border-b last:border-b-0"
          id={`block-${index}`}
        >
          {/* Support both old format (groove) and new format (groovescribe) */}
          {(block.type === 'groove' || block.type === 'groovescribe') && (
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-4">
                {block.title || 'Groove Pattern'}
              </h3>
              {block.description && (
                <p className="text-sm text-gray-600 mb-3">{block.description}</p>
              )}
              <div className="rounded-lg overflow-hidden shadow-md">
                {(() => {
                  const pattern = block.pattern || block.data?.pattern || block.data?.groovescribe || block.data?.groove;
                  console.log('🔍 LessonContentViewer - GrooveScribe block debug:', { 
                    blockType: block.type, 
                    blockTitle: block.title,
                    pattern: pattern,
                    patternLength: pattern?.length,
                    patternStartsWith: pattern?.startsWith('?TimeSig='),
                    patternPreview: pattern?.substring(0, 80),
                    fullBlock: block 
                  });
                  
                  // Log the exact iframe URL that will be constructed
                  if (pattern) {
                    const iframeUrl = `https://teacher.musicdott.com/groovescribe/GrooveEmbed.html${pattern}`;
                    console.log('🎯 Expected iframe URL:', iframeUrl);
                    console.log('🎯 URL length:', iframeUrl.length);
                    console.log('🎯 Contains drum data:', pattern.includes('&H=|') || pattern.includes('&S=|') || pattern.includes('&K=|'));
                  } else {
                    console.log('❌ No pattern found for GrooveScribe block');
                  }
                  
                  return (
                    <GrooveEmbed 
                      initialGrooveParams={pattern} 
                      editable={false}
                      height={400} // Larger height for better visibility in fullscreen
                    />
                  );
                })()}
              </div>
            </div>
          )}
          
          {/* Support both old format (video) and new format (youtube) */}
          {(block.type === 'video' || block.type === 'youtube') && (
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-4">
                {block.title || 'Video Demonstration'}
              </h3>
              {block.description && (
                <p className="text-sm text-gray-600 mb-3">{block.description}</p>
              )}
              <div className="rounded-lg overflow-hidden shadow-md">
                <VideoEmbed 
                  initialVideoUrl={block.data.video || block.data.youtube} 
                  editable={false}
                  height={500} // Larger height for better visibility in fullscreen
                />
              </div>
            </div>
          )}
          
          {block.type === 'text' && (
            <div className="mb-4 rounded-lg p-6 bg-gray-50 dark:bg-gray-900">
              <h3 className="text-lg font-medium mb-4">
                {block.title || 'Instruction Text'}
              </h3>
              {block.description && (
                <p className="text-sm text-gray-600 mb-3">{block.description}</p>
              )}
              <TextContent 
                initialContent={block.data.text} 
                editable={false}
              />
            </div>
          )}
          
          {block.type === 'spotify' && block.data.spotify && (
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-4">
                {block.title || 'Music Player'}
              </h3>
              {block.description && (
                <p className="text-sm text-gray-600 mb-3">{block.description}</p>
              )}
              <div className="rounded-lg overflow-hidden shadow-md">
                <SpotifyEmbed 
                  initialSpotifyUrl={block.data.spotify} 
                  editable={false}
                  height={380} // Standard height for Spotify embeds
                />
              </div>
            </div>
          )}
          
          {block.type === 'spotify' && !block.data.spotify && (
            <div className="mb-4 p-4 border border-dashed border-gray-300 rounded-lg text-center">
              <h3 className="text-lg font-medium mb-2">Music Player</h3>
              <p className="text-gray-500">No Spotify content added yet</p>
            </div>
          )}
          
          {block.type === 'external_link' && block.data.external_link && (
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-4">External Resource</h3>
              <ExternalLinkEmbed 
                initialLinkData={block.data.external_link}
                onSave={() => {}} // Read-only in viewer mode
                editable={false}
              />
            </div>
          )}
          
          {block.type === 'external_link' && !block.data.external_link && (
            <div className="mb-4 p-4 border border-dashed border-gray-300 rounded-lg text-center">
              <h3 className="text-lg font-medium mb-2">External Resource</h3>
              <p className="text-gray-500">No external link added yet</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}