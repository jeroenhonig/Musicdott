/**
 * Notation Grid Viewer Component
 *
 * Displays parsed drum notation in a visual grid format
 * Features:
 * - Visual grid showing beats and instruments
 * - Raw/Parsed toggle for teachers
 * - Playback controls (play, loop, tempo)
 * - ADD-friendly design with clear visual cues
 */

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Repeat,
  Eye,
  Code,
  Drum,
  Music,
  Zap,
} from "lucide-react";

// Types
interface NotationEvent {
  step: number;
  limb: "R" | "L" | "K" | "F";
  instrument:
    | "snare"
    | "kick"
    | "hihat"
    | "tom"
    | "cymbal"
    | "ride"
    | "crash"
    | "floor_tom"
    | "high_tom";
  velocity: number;
  accent: boolean;
}

interface ParsedNotation {
  status: "ok" | "partial" | "failed";
  time_signature: { beats: number; unit: number };
  tempo: number;
  division: number;
  measures: number;
  grid: {
    steps_per_measure: number;
    total_steps: number;
  };
  events: NotationEvent[];
  meta: {
    parser_version: string;
    errors: string[];
    warnings: string[];
    raw_notation?: string;
  };
}

interface NotationGridViewerProps {
  notation?: ParsedNotation;
  rawNotation?: string;
  title?: string;
  showControls?: boolean;
  showRawToggle?: boolean;
  compact?: boolean;
  onReparse?: () => void;
}

// Instrument display configuration
const INSTRUMENTS = [
  { key: "crash", label: "CC", color: "bg-yellow-400", row: 0 },
  { key: "ride", label: "RD", color: "bg-orange-400", row: 1 },
  { key: "hihat", label: "HH", color: "bg-blue-400", row: 2 },
  { key: "high_tom", label: "T1", color: "bg-purple-400", row: 3 },
  { key: "tom", label: "T2", color: "bg-purple-500", row: 4 },
  { key: "floor_tom", label: "FT", color: "bg-purple-600", row: 5 },
  { key: "snare", label: "SN", color: "bg-red-400", row: 6 },
  { key: "kick", label: "BD", color: "bg-green-500", row: 7 },
] as const;

// Limb colors
const LIMB_COLORS: Record<string, string> = {
  R: "border-blue-500",
  L: "border-red-500",
  K: "border-green-500",
  F: "border-yellow-500",
};

export default function NotationGridViewer({
  notation,
  rawNotation,
  title = "Groove / Fill Viewer",
  showControls = true,
  showRawToggle = true,
  compact = false,
  onReparse,
}: NotationGridViewerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [tempo, setTempo] = useState(notation?.tempo || 120);
  const [currentStep, setCurrentStep] = useState(-1);
  const [showRaw, setShowRaw] = useState(false);

  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate grid dimensions
  const totalSteps = notation?.grid?.total_steps || 16;
  const stepsPerMeasure = notation?.grid?.steps_per_measure || 16;
  const measures = notation?.measures || 1;

  // Group events by step and instrument for efficient rendering
  const eventGrid = useMemo(() => {
    if (!notation?.events) return new Map<string, NotationEvent>();

    const grid = new Map<string, NotationEvent>();
    for (const event of notation.events) {
      const key = `${event.instrument}-${event.step}`;
      grid.set(key, event);
    }
    return grid;
  }, [notation?.events]);

  // Playback logic
  const stepDurationMs = useMemo(() => {
    // Calculate step duration based on tempo and division
    // tempo = BPM, division = steps per beat
    const beatsPerSecond = tempo / 60;
    const stepsPerSecond = beatsPerSecond * 4; // Assuming 16th notes = 4 steps per beat
    return 1000 / stepsPerSecond;
  }, [tempo]);

  const startPlayback = useCallback(() => {
    setIsPlaying(true);
    setCurrentStep(0);

    playIntervalRef.current = setInterval(() => {
      setCurrentStep((prev) => {
        const next = prev + 1;
        if (next >= totalSteps) {
          if (isLooping) {
            return 0;
          } else {
            setIsPlaying(false);
            return -1;
          }
        }
        return next;
      });
    }, stepDurationMs);
  }, [totalSteps, isLooping, stepDurationMs]);

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep(-1);
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }
  }, []);

  const togglePlayback = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, []);

  // Reset playback when tempo changes
  useEffect(() => {
    if (isPlaying) {
      stopPlayback();
      startPlayback();
    }
  }, [tempo]);

  // Render a single cell in the grid
  const renderCell = (instrument: string, step: number) => {
    const key = `${instrument}-${step}`;
    const event = eventGrid.get(key);
    const isCurrentStep = currentStep === step;
    const isBeatStart = step % 4 === 0;
    const isMeasureStart = step % stepsPerMeasure === 0;

    return (
      <TooltipProvider key={key}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`
                w-6 h-6 rounded-sm border transition-all duration-75
                ${isMeasureStart ? "border-l-2 border-l-muted-foreground" : "border-transparent"}
                ${isBeatStart ? "bg-muted/30" : ""}
                ${isCurrentStep ? "ring-2 ring-primary ring-offset-1" : ""}
                ${event ? "cursor-pointer" : "cursor-default"}
                flex items-center justify-center
              `}
            >
              {event && (
                <div
                  className={`
                    w-4 h-4 rounded-full transition-all
                    ${INSTRUMENTS.find((i) => i.key === instrument)?.color || "bg-gray-400"}
                    ${event.accent ? "scale-110 ring-2 ring-white" : ""}
                    ${event.limb ? `border-2 ${LIMB_COLORS[event.limb]}` : ""}
                    ${isCurrentStep && !isMuted ? "animate-pulse" : ""}
                  `}
                  style={{ opacity: event.velocity }}
                />
              )}
            </div>
          </TooltipTrigger>
          {event && (
            <TooltipContent>
              <p>
                {event.instrument} - {event.limb} hand
                {event.accent && " (accent)"}
              </p>
              <p className="text-xs text-muted-foreground">
                Step {step + 1}, Velocity {(event.velocity * 100).toFixed(0)}%
              </p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Status badge
  const StatusBadge = () => {
    if (!notation) return null;

    const statusConfig = {
      ok: { variant: "default" as const, icon: Zap, label: "Parsed" },
      partial: { variant: "secondary" as const, icon: Eye, label: "Partial" },
      failed: { variant: "destructive" as const, icon: Code, label: "Failed" },
    };

    const config = statusConfig[notation.status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <Card className={compact ? "border-0 shadow-none" : ""}>
      <CardHeader className={compact ? "pb-2" : ""}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Drum className="h-5 w-5" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <StatusBadge />
            {showRawToggle && (
              <div className="flex items-center gap-2">
                <Label htmlFor="show-raw" className="text-xs">
                  Raw
                </Label>
                <Switch
                  id="show-raw"
                  checked={showRaw}
                  onCheckedChange={setShowRaw}
                  className="scale-75"
                />
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {showRaw && rawNotation ? (
          <div className="space-y-2">
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs font-mono whitespace-pre-wrap">
              {rawNotation}
            </pre>
            {onReparse && (
              <Button variant="outline" size="sm" onClick={onReparse}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Re-parse
              </Button>
            )}
          </div>
        ) : notation ? (
          <div className="space-y-4">
            {/* Grid */}
            <div className="overflow-x-auto">
              <div className="min-w-fit">
                {/* Beat numbers header */}
                <div className="flex items-center mb-1">
                  <div className="w-10" /> {/* Spacer for instrument labels */}
                  {Array.from({ length: totalSteps }).map((_, step) => (
                    <div
                      key={step}
                      className={`
                        w-6 text-center text-xs text-muted-foreground
                        ${step % 4 === 0 ? "font-bold" : ""}
                      `}
                    >
                      {step % 4 === 0 ? Math.floor(step / 4) + 1 : ""}
                    </div>
                  ))}
                </div>

                {/* Instrument rows */}
                {INSTRUMENTS.map((instrument) => (
                  <div key={instrument.key} className="flex items-center">
                    <div className="w-10 text-xs font-mono text-muted-foreground pr-2">
                      {instrument.label}
                    </div>
                    <div className="flex">
                      {Array.from({ length: totalSteps }).map((_, step) =>
                        renderCell(instrument.key, step)
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Playback Controls */}
            {showControls && (
              <div className="flex items-center gap-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={togglePlayback}
                    className="h-10 w-10"
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={stopPlayback}
                    className="h-10 w-10"
                  >
                    <RotateCcw className="h-5 w-5" />
                  </Button>
                  <Button
                    variant={isLooping ? "default" : "outline"}
                    size="icon"
                    onClick={() => setIsLooping(!isLooping)}
                    className="h-10 w-10"
                  >
                    <Repeat className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsMuted(!isMuted)}
                    className="h-10 w-10"
                  >
                    {isMuted ? (
                      <VolumeX className="h-5 w-5" />
                    ) : (
                      <Volume2 className="h-5 w-5" />
                    )}
                  </Button>
                </div>

                {/* Tempo slider */}
                <div className="flex items-center gap-2 flex-1 max-w-xs">
                  <Music className="h-4 w-4 text-muted-foreground" />
                  <Slider
                    value={[tempo]}
                    onValueChange={([value]) => setTempo(value)}
                    min={40}
                    max={200}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm font-mono w-16">{tempo} BPM</span>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">
                {notation.time_signature.beats}/{notation.time_signature.unit}
              </Badge>
              <Badge variant="outline">{measures} measure(s)</Badge>
              <Badge variant="outline">{notation.events.length} events</Badge>
              {notation.meta.parser_version && (
                <Badge variant="outline">Parser v{notation.meta.parser_version}</Badge>
              )}
            </div>

            {/* Warnings/Errors */}
            {(notation.meta.warnings?.length > 0 || notation.meta.errors?.length > 0) && (
              <div className="text-xs space-y-1">
                {notation.meta.errors?.map((error, i) => (
                  <div key={i} className="text-red-500">
                    Error: {error}
                  </div>
                ))}
                {notation.meta.warnings?.map((warning, i) => (
                  <div key={i} className="text-yellow-600">
                    Warning: {warning}
                  </div>
                ))}
              </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs border-t pt-4">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 border-2 border-blue-500 rounded-full" />
                <span>Right hand</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 border-2 border-red-500 rounded-full" />
                <span>Left hand</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 border-2 border-green-500 rounded-full" />
                <span>Kick</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 border-2 border-yellow-500 rounded-full" />
                <span>Hi-hat foot</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 ring-2 ring-white rounded-full bg-gray-400" />
                <span>Accent</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Drum className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No notation data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
