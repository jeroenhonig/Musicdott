/**
 * Standalone Metronome Component
 * Full-featured metronome with tempo, time signature, and accent controls
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Play, Pause, Volume2, VolumeX, Minus, Plus, Clock } from "lucide-react";

interface MetronomeProps {
  initialTempo?: number;
  onTempoChange?: (tempo: number) => void;
}

const TIME_SIGNATURES = [
  { value: "4/4", beats: 4, label: "4/4 (Common)" },
  { value: "3/4", beats: 3, label: "3/4 (Waltz)" },
  { value: "2/4", beats: 2, label: "2/4 (March)" },
  { value: "6/8", beats: 6, label: "6/8 (Compound)" },
  { value: "5/4", beats: 5, label: "5/4 (Odd)" },
  { value: "7/8", beats: 7, label: "7/8 (Odd)" },
];

const TEMPO_MARKINGS = [
  { min: 20, max: 40, label: "Grave" },
  { min: 40, max: 60, label: "Largo" },
  { min: 60, max: 66, label: "Larghetto" },
  { min: 66, max: 76, label: "Adagio" },
  { min: 76, max: 108, label: "Andante" },
  { min: 108, max: 120, label: "Moderato" },
  { min: 120, max: 168, label: "Allegro" },
  { min: 168, max: 200, label: "Presto" },
  { min: 200, max: 300, label: "Prestissimo" },
];

function getTempoMarking(tempo: number): string {
  const marking = TEMPO_MARKINGS.find(m => tempo >= m.min && tempo < m.max);
  return marking?.label || "Tempo";
}

export function Metronome({ initialTempo = 120, onTempoChange }: MetronomeProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [tempo, setTempo] = useState(initialTempo);
  const [timeSignature, setTimeSignature] = useState("4/4");
  const [currentBeat, setCurrentBeat] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [accentFirst, setAccentFirst] = useState(true);
  const [subdivide, setSubdivide] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | null>(null);
  const nextNoteTimeRef = useRef(0);
  const schedulerIntervalRef = useRef<number | null>(null);

  const beats = TIME_SIGNATURES.find(ts => ts.value === timeSignature)?.beats || 4;

  const createClick = useCallback((isAccent: boolean, isSubdivision: boolean = false) => {
    if (!audioContextRef.current || isMuted) return;
    
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    const baseFreq = isSubdivision ? 600 : (isAccent ? 1000 : 800);
    oscillator.frequency.value = baseFreq;
    oscillator.type = "sine";
    
    const effectiveVolume = volume * (isSubdivision ? 0.3 : (isAccent ? 1.0 : 0.7));
    gainNode.gain.setValueAtTime(effectiveVolume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  }, [volume, isMuted]);

  const scheduleNote = useCallback((beatNumber: number) => {
    const isAccent = accentFirst && beatNumber === 0;
    createClick(isAccent);
    setCurrentBeat(beatNumber);
    
    if (subdivide) {
      setTimeout(() => createClick(false, true), (60000 / tempo) / 2);
    }
  }, [tempo, accentFirst, subdivide, createClick]);

  const startMetronome = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }
    
    let beat = 0;
    const intervalMs = 60000 / tempo;
    
    scheduleNote(beat);
    
    intervalRef.current = window.setInterval(() => {
      beat = (beat + 1) % beats;
      scheduleNote(beat);
    }, intervalMs);
    
    setIsPlaying(true);
  }, [tempo, beats, scheduleNote]);

  const stopMetronome = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPlaying(false);
    setCurrentBeat(0);
  }, []);

  const togglePlayPause = () => {
    if (isPlaying) {
      stopMetronome();
    } else {
      startMetronome();
    }
  };

  const adjustTempo = (delta: number) => {
    const newTempo = Math.max(20, Math.min(300, tempo + delta));
    setTempo(newTempo);
    onTempoChange?.(newTempo);
    
    if (isPlaying) {
      stopMetronome();
      setTimeout(() => startMetronome(), 50);
    }
  };

  const handleTempoChange = (value: number[]) => {
    const newTempo = value[0];
    setTempo(newTempo);
    onTempoChange?.(newTempo);
  };

  const handleTempoChangeComplete = () => {
    if (isPlaying) {
      stopMetronome();
      setTimeout(() => startMetronome(), 50);
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (isPlaying) {
      stopMetronome();
      startMetronome();
    }
  }, [timeSignature]);

  return (
    <Card className="w-full max-w-md mx-auto" data-testid="metronome-card">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Clock className="h-5 w-5" />
          Metronome
        </CardTitle>
        <CardDescription>
          {getTempoMarking(tempo)} - {tempo} BPM
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-center">
          <div className="flex gap-2">
            {Array.from({ length: beats }).map((_, i) => (
              <div
                key={i}
                className={`w-6 h-6 rounded-full border-2 transition-all duration-100 ${
                  currentBeat === i && isPlaying
                    ? i === 0 && accentFirst
                      ? "bg-primary border-primary scale-125"
                      : "bg-primary/70 border-primary scale-110"
                    : "bg-muted border-muted-foreground/30"
                }`}
                data-testid={`beat-indicator-${i}`}
              />
            ))}
          </div>
        </div>

        <div className="text-center">
          <div className="text-6xl font-bold tabular-nums mb-2" data-testid="tempo-display">
            {tempo}
          </div>
          <div className="text-sm text-muted-foreground">BPM</div>
        </div>

        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => adjustTempo(-5)}
            data-testid="button-tempo-decrease"
          >
            <Minus className="h-4 w-4" />
          </Button>
          
          <Button
            size="lg"
            className="w-20 h-20 rounded-full"
            onClick={togglePlayPause}
            data-testid="button-play-pause"
          >
            {isPlaying ? (
              <Pause className="h-8 w-8" />
            ) : (
              <Play className="h-8 w-8 ml-1" />
            )}
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => adjustTempo(5)}
            data-testid="button-tempo-increase"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Tempo</Label>
          <Slider
            value={[tempo]}
            onValueChange={handleTempoChange}
            onValueCommit={handleTempoChangeComplete}
            min={20}
            max={300}
            step={1}
            className="w-full"
            data-testid="slider-tempo"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>20</span>
            <span>160</span>
            <span>300</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Time Signature</Label>
            <Select value={timeSignature} onValueChange={setTimeSignature}>
              <SelectTrigger data-testid="select-time-signature">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_SIGNATURES.map((ts) => (
                  <SelectItem key={ts.value} value={ts.value}>
                    {ts.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              Volume
            </Label>
            <div className="flex items-center gap-2">
              <Slider
                value={[isMuted ? 0 : volume * 100]}
                onValueChange={(v) => {
                  setVolume(v[0] / 100);
                  setIsMuted(v[0] === 0);
                }}
                max={100}
                step={1}
                className="flex-1"
                data-testid="slider-volume"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMuted(!isMuted)}
                data-testid="button-mute"
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Switch
              id="accent-first"
              checked={accentFirst}
              onCheckedChange={setAccentFirst}
              data-testid="switch-accent-first"
            />
            <Label htmlFor="accent-first">Accent first beat</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="subdivide"
              checked={subdivide}
              onCheckedChange={setSubdivide}
              data-testid="switch-subdivide"
            />
            <Label htmlFor="subdivide">Subdivide</Label>
          </div>
        </div>

        <div className="flex justify-center gap-2 flex-wrap">
          {[60, 80, 100, 120, 140, 160].map((t) => (
            <Button
              key={t}
              variant={tempo === t ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setTempo(t);
                onTempoChange?.(t);
                if (isPlaying) {
                  stopMetronome();
                  setTimeout(() => startMetronome(), 50);
                }
              }}
              data-testid={`button-preset-${t}`}
            >
              {t}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default Metronome;
