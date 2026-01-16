import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Volume2, FileText, Music } from "lucide-react";

interface OriginalLessonViewerProps {
  lesson: {
    id: number;
    title: string;
    description?: string;
    contentBlocks: any[];
    categoryName?: string;
    level?: string;
    instrument?: string;
  };
  isFullScreen?: boolean;
  showProgress?: boolean;
  onLogBook?: () => void;
  onZoom?: () => void;
}

/**
 * Original MusicDott 1.0 lesson viewer pattern
 * Based on lesson_play.php architecture with modern React
 */
export default function OriginalLessonViewer({ 
  lesson, 
  isFullScreen = false, 
  showProgress = false, 
  onLogBook, 
  onZoom 
}: OriginalLessonViewerProps) {
  
  const renderContentBlock = (block: any, index: number) => {
    // Video content (noVideo in original)
    if (block.type === 'video' || block.type === 'youtube') {
      return (
        <div key={index} className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-semibold">
              {index + 1}
            </div>
            <Volume2 className="h-4 w-4 text-blue-500" />
          </div>
          <div className="flex justify-center">
            <div className="max-w-4xl w-full">
              {block.data?.video || block.data?.youtube}
            </div>
          </div>
          {block.description && (
            <div className="text-center mt-3 text-gray-600">
              <p>{block.description}</p>
            </div>
          )}
        </div>
      );
    }

    // Audio content (noMP3 in original)
    if (block.type === 'audio') {
      return (
        <div key={index} className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-semibold">
              {index + 1}
            </div>
            <Volume2 className="h-4 w-4 text-green-500" />
          </div>
          <div className="flex justify-center">
            <audio controls className="max-w-md">
              <source src={block.data?.audio} type="audio/mpeg" />
              <p>Your browser does not support the audio element...</p>
            </audio>
          </div>
        </div>
      );
    }

    // GrooveScribe notation (noNotatie in original)
    if (block.type === 'groove' || block.type === 'groovescribe') {
      const pattern = block.pattern || block.data?.pattern || block.data?.groovescribe || block.data?.groove;
      if (!pattern) return null;
      
      // Clean URL encoding like original PHP code
      const cleanPattern = pattern.replace(/%7C/g, '|').replace(/%2D/g, '-').replace(/%20/g, ' ');
      const iframeUrl = isFullScreen 
        ? `https://teacher.musicdott.com/groove/GrooveEmbed.html${cleanPattern}`
        : `https://teacher.musicdott.com/groove/GrooveEmbedSmall.html${cleanPattern}`;
      
      return (
        <div key={index} className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-semibold">
              {index + 1}
            </div>
            <Music className="h-4 w-4 text-purple-500" />
          </div>
          <div className="flex justify-center">
            <iframe 
              src={iframeUrl}
              width={isFullScreen ? "810" : "400"}
              height={isFullScreen ? "240" : "180"}
              frameBorder="0"
              scrolling="no"
              className="border rounded-lg shadow-sm"
              title={`Groove Pattern ${index + 1}`}
            />
          </div>
        </div>
      );
    }

    // PDF content (noPDFlesson in original)
    if (block.type === 'pdf') {
      return (
        <div key={index} className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-sm font-semibold">
              {index + 1}
            </div>
            <FileText className="h-4 w-4 text-red-500" />
          </div>
          <div className="flex justify-center">
            <object
              data={`data:application/pdf;base64,${block.data?.pdf}`}
              type="application/pdf"
              style={{ width: isFullScreen ? "810px" : "400px", height: "600px", border: "none" }}
              className="rounded-lg shadow-sm"
            >
              <p>PDF cannot be displayed. <a href={`data:application/pdf;base64,${block.data?.pdf}`} download>Download PDF</a></p>
            </object>
          </div>
        </div>
      );
    }

    // Musescore content (noMusescore in original)
    if (block.type === 'musescore') {
      return (
        <div key={index} className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-semibold">
              {index + 1}
            </div>
            <Music className="h-4 w-4 text-orange-500" />
          </div>
          <div className="flex justify-center">
            <div className="max-w-4xl w-full">
              {block.data?.musescore}
            </div>
          </div>
        </div>
      );
    }

    // Text content (noOpmerkingen in original)
    if (block.type === 'text') {
      return (
        <div key={index} className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-gray-500 text-white flex items-center justify-center text-sm font-semibold">
              {index + 1}
            </div>
            <FileText className="h-4 w-4 text-gray-500" />
          </div>
          <div className="text-center">
            <p className="text-gray-700">{block.data?.text || block.description}</p>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Header with category and title like original */}
      <div className="text-center mb-8">
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {lesson.categoryName && (
                  <Badge variant="secondary" className="text-sm">
                    {lesson.categoryName}
                  </Badge>
                )}
                {lesson.level && (
                  <Badge variant="outline" className="text-sm">
                    {lesson.level}
                  </Badge>
                )}
                {lesson.instrument && (
                  <Badge variant="outline" className="text-sm">
                    {lesson.instrument}
                  </Badge>
                )}
              </div>
              
              {/* Action buttons like original */}
              <div className="flex items-center gap-2">
                {onZoom && (
                  <button
                    onClick={onZoom}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    title="Zoom"
                  >
                    🔍
                  </button>
                )}
                {showProgress && onLogBook && (
                  <button
                    onClick={onLogBook}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    title="Logbook"
                  >
                    📖
                  </button>
                )}
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              {lesson.categoryName} - {lesson.title}
            </h1>
            
            {lesson.description && (
              <p className="text-gray-600">{lesson.description}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Content blocks following original order */}
      <div className="space-y-4">
        {lesson.contentBlocks && lesson.contentBlocks.map((block, index) => renderContentBlock(block, index))}
      </div>

      {/* Student progress section (like original POS_NotatieStudent check) */}
      {showProgress && (
        <Card className="mt-8 glass-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-blue-500" />
              <h3 className="font-semibold">Student Progress</h3>
            </div>
            <div className="text-sm text-gray-600">
              <p>Lesson assigned to student • Progress tracking enabled</p>
              <div className="mt-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Last updated: {new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}