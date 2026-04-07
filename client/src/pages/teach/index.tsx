/**
 * Teach Page — /teach/:lessonId
 *
 * Full-screen teacher control interface for the "lesscherm" (second screen) feature.
 * No sidebar/AppLayout — the teacher runs this fullscreen on their primary monitor
 * while the display screen runs /lesson-display/:sessionId on the second monitor.
 *
 * Left column: lesson content blocks + special mode controls (timer, pause, metronome).
 * Right column: session status + preview of display screen.
 */

import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useTeachMode } from "@/hooks/use-teach-mode";
import { parseContentBlocks } from "@/utils/content-block-parser";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Monitor,
  MonitorOff,
  ArrowLeft,
  Tv2,
  Eye,
  PlayCircle,
  FileText,
  Music,
  Guitar,
  Maximize2,
  Timer,
  PauseCircle,
  Drum,
  Hand,
  X,
} from "lucide-react";
import DisplayBlockRenderer from "@/components/lesson-display/display-block-renderer";
import { useState, useEffect } from "react";
import type { ContentBlockContract } from "@shared/display-events";

interface Lesson {
  id: number;
  title: string;
  description?: string;
  contentBlocks?: string;
  instrument?: string;
  level?: string;
}

function blockTypeIcon(type: string) {
  if (type === "youtube" || type === "video") return <PlayCircle className="h-4 w-4 text-red-500" />;
  if (type === "groovescribe" || type === "groove") return <Maximize2 className="h-4 w-4 text-blue-500" />;
  if (type === "spotify") return <Music className="h-4 w-4 text-green-500" />;
  if (type === "text") return <FileText className="h-4 w-4 text-gray-500" />;
  return <Guitar className="h-4 w-4 text-purple-500" />;
}

export default function TeachPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const lessonId = parseInt(id ?? "0", 10);

  const [previewBlock, setPreviewBlock] = useState<ContentBlockContract | null>(null);
  const [activeBlockIndex, setActiveBlockIndex] = useState<number | null>(null);

  // Timer controls
  const [timerMinutes, setTimerMinutes] = useState("2");
  const [timerLabel, setTimerLabel] = useState("");

  // Pause controls
  const [pauseMessage, setPauseMessage] = useState("");

  // Metronome controls
  const [bpm, setBpm] = useState("80");
  const [beats, setBeats] = useState("4");
  const [metronomeLabel, setMetronomeLabel] = useState("");

  // Student reaction flash
  const [reactionFlash, setReactionFlash] = useState(false);

  const { data: lesson, isLoading } = useQuery<Lesson>({
    queryKey: [`/api/lessons/${lessonId}`],
    enabled: !!lessonId,
  });

  const {
    sessionId,
    isSessionOpen,
    displayCount,
    studentReactionCount,
    openSession,
    closeSession,
    pushBlock,
    clearScreen,
    pushTimer,
    pushPause,
    pushMetronome,
    emitYtSync,
  } = useTeachMode();

  // Flash the reaction badge when a new reaction arrives
  useEffect(() => {
    if (studentReactionCount === 0) return;
    setReactionFlash(true);
    const t = setTimeout(() => setReactionFlash(false), 1500);
    return () => clearTimeout(t);
  }, [studentReactionCount]);

  const contentBlocks: ContentBlockContract[] = (() => {
    if (!lesson?.contentBlocks) return [];
    try {
      const raw = JSON.parse(lesson.contentBlocks);
      return parseContentBlocks(raw) as ContentBlockContract[];
    } catch {
      return [];
    }
  })();

  const handlePush = (index: number, block: ContentBlockContract) => {
    pushBlock(index, block);
    setActiveBlockIndex(index);
    setPreviewBlock(block);
  };

  const handleClear = () => {
    clearScreen();
    setActiveBlockIndex(null);
    setPreviewBlock(null);
  };

  const handlePushTimer = () => {
    const seconds = Math.max(1, Math.round(parseFloat(timerMinutes) * 60));
    pushTimer(seconds, timerLabel || undefined);
    setActiveBlockIndex(null);
    setPreviewBlock(null);
  };

  const handlePushPause = () => {
    pushPause(pauseMessage || undefined);
    setActiveBlockIndex(null);
    setPreviewBlock(null);
  };

  const handlePushMetronome = () => {
    const bpmVal = Math.max(20, Math.min(300, parseInt(bpm, 10) || 80));
    const beatsVal = Math.max(2, Math.min(12, parseInt(beats, 10) || 4));
    pushMetronome(bpmVal, beatsVal, metronomeLabel || undefined);
    setActiveBlockIndex(null);
    setPreviewBlock(null);
  };

  if (!user || (user.role !== "teacher" && user.role !== "school_owner" && user.role !== "platform_owner")) {
    navigate("/lessons");
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        Laden…
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        Les niet gevonden.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/lessons")}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Terug
          </Button>
          <Separator orientation="vertical" className="h-5 bg-gray-700" />
          <div>
            <h1 className="font-semibold text-sm">{lesson.title}</h1>
            {lesson.instrument && (
              <span className="text-xs text-gray-500">{lesson.instrument}</span>
            )}
          </div>
        </div>

        {/* Session controls + student reaction */}
        <div className="flex items-center gap-3">
          {isSessionOpen && studentReactionCount > 0 && (
            <Badge
              className={`transition-all duration-300 ${
                reactionFlash ? "bg-yellow-500 scale-110" : "bg-yellow-600"
              }`}
            >
              <Hand className="h-3 w-3 mr-1" />
              Klaar! ({studentReactionCount})
            </Badge>
          )}

          {isSessionOpen ? (
            <>
              <Badge
                variant={displayCount > 0 ? "default" : "secondary"}
                className={displayCount > 0 ? "bg-green-600" : "bg-gray-600"}
              >
                <Tv2 className="h-3 w-3 mr-1" />
                {displayCount > 0 ? "Leerling verbonden" : "Wachten op leerling…"}
              </Badge>
              <Button variant="destructive" size="sm" onClick={closeSession}>
                <MonitorOff className="h-4 w-4 mr-1" /> Sluit scherm
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => openSession(lessonId)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Monitor className="h-4 w-4 mr-1" /> Open leerlingscherm
            </Button>
          )}
        </div>
      </header>

      {/* Main two-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left — block list + special modes */}
        <div className="w-80 flex-shrink-0 border-r border-gray-800 overflow-y-auto">
          <div className="p-4 space-y-2">

            {/* Content blocks */}
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
              Lesinhoud — {contentBlocks.length} blokken
            </p>
            {contentBlocks.length === 0 && (
              <p className="text-gray-500 text-sm">Geen content blokken.</p>
            )}
            {contentBlocks.map((block, index) => (
              <div
                key={index}
                className={`rounded-lg border p-3 cursor-pointer transition-colors ${
                  activeBlockIndex === index
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-gray-700 hover:border-gray-500 bg-gray-900"
                }`}
                onClick={() => setPreviewBlock(block)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {blockTypeIcon(block.type)}
                    <span className="text-sm truncate">
                      {block.title || block.type || `Blok ${index + 1}`}
                    </span>
                  </div>
                  {isSessionOpen && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs flex-shrink-0 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePush(index, block);
                      }}
                    >
                      <Eye className="h-3 w-3 mr-1" /> Push
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {isSessionOpen && activeBlockIndex !== null && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2 border-gray-700 text-gray-400 hover:text-white"
                onClick={handleClear}
              >
                <X className="h-3 w-3 mr-1" /> Leeg scherm
              </Button>
            )}

            {/* Special modes — only shown when session is open */}
            {isSessionOpen && (
              <>
                <Separator className="my-4 bg-gray-800" />

                {/* Timer */}
                <Card className="bg-gray-900 border-gray-700">
                  <CardHeader className="py-3 px-3">
                    <CardTitle className="text-sm flex items-center gap-2 text-gray-300">
                      <Timer className="h-4 w-4 text-orange-400" /> Timer
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 space-y-2">
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        min="0.5"
                        max="60"
                        step="0.5"
                        value={timerMinutes}
                        onChange={(e) => setTimerMinutes(e.target.value)}
                        className="h-7 w-20 bg-gray-800 border-gray-700 text-white text-sm"
                      />
                      <Label className="text-gray-400 text-xs">minuten</Label>
                    </div>
                    <Input
                      placeholder="Label (optioneel)"
                      value={timerLabel}
                      onChange={(e) => setTimerLabel(e.target.value)}
                      className="h-7 bg-gray-800 border-gray-700 text-white text-sm placeholder:text-gray-600"
                    />
                    <Button
                      size="sm"
                      className="w-full h-7 bg-orange-600 hover:bg-orange-700 text-xs"
                      onClick={handlePushTimer}
                    >
                      Push timer
                    </Button>
                  </CardContent>
                </Card>

                {/* Pause */}
                <Card className="bg-gray-900 border-gray-700">
                  <CardHeader className="py-3 px-3">
                    <CardTitle className="text-sm flex items-center gap-2 text-gray-300">
                      <PauseCircle className="h-4 w-4 text-yellow-400" /> Pauze
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 space-y-2">
                    <Input
                      placeholder="Bericht (optioneel)"
                      value={pauseMessage}
                      onChange={(e) => setPauseMessage(e.target.value)}
                      className="h-7 bg-gray-800 border-gray-700 text-white text-sm placeholder:text-gray-600"
                    />
                    <Button
                      size="sm"
                      className="w-full h-7 bg-yellow-600 hover:bg-yellow-700 text-xs"
                      onClick={handlePushPause}
                    >
                      Push pauze
                    </Button>
                  </CardContent>
                </Card>

                {/* Metronome */}
                <Card className="bg-gray-900 border-gray-700">
                  <CardHeader className="py-3 px-3">
                    <CardTitle className="text-sm flex items-center gap-2 text-gray-300">
                      <Drum className="h-4 w-4 text-purple-400" /> Metronoom
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label className="text-gray-500 text-xs">BPM</Label>
                        <Input
                          type="number"
                          min="20"
                          max="300"
                          value={bpm}
                          onChange={(e) => setBpm(e.target.value)}
                          className="h-7 bg-gray-800 border-gray-700 text-white text-sm"
                        />
                      </div>
                      <div className="w-16">
                        <Label className="text-gray-500 text-xs">Maat</Label>
                        <Input
                          type="number"
                          min="2"
                          max="12"
                          value={beats}
                          onChange={(e) => setBeats(e.target.value)}
                          className="h-7 bg-gray-800 border-gray-700 text-white text-sm"
                        />
                      </div>
                    </div>
                    <Input
                      placeholder="Label (optioneel)"
                      value={metronomeLabel}
                      onChange={(e) => setMetronomeLabel(e.target.value)}
                      className="h-7 bg-gray-800 border-gray-700 text-white text-sm placeholder:text-gray-600"
                    />
                    <Button
                      size="sm"
                      className="w-full h-7 bg-purple-600 hover:bg-purple-700 text-xs"
                      onClick={handlePushMetronome}
                    >
                      Push metronoom
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>

        {/* Right — preview */}
        <div className="flex-1 flex flex-col bg-gray-900 overflow-hidden">
          {previewBlock ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="w-full max-w-4xl">
                <p className="text-xs text-gray-500 mb-4 text-center uppercase tracking-wider">
                  Voorbeeld leerlingscherm
                </p>
                <DisplayBlockRenderer
                  block={previewBlock}
                  role="teacher"
                  onEmit={emitYtSync}
                  incomingYtEvent={null}
                  onIncomingConsumed={() => {}}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-600">
              <div className="text-center">
                <Tv2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">
                  {isSessionOpen
                    ? "Klik op een blok om het te pushen naar het leerlingscherm"
                    : "Open het leerlingscherm om te beginnen"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
