/**
 * Block Generator Component
 *
 * Generate random or constrained drum patterns from drumblocks.
 * Features:
 * - Random generation with constraints
 * - Visual pattern preview
 * - Pattern analysis display
 * - Progressive practice mode
 */

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import NotationGridViewer from "@/components/notation/notation-grid-viewer";
import {
  Shuffle,
  Settings2,
  Play,
  ChevronDown,
  ChevronUp,
  Drum,
  BarChart3,
  Layers,
  RefreshCw,
  Zap,
  Target,
} from "lucide-react";

// Types
interface NotationEvent {
  step: number;
  limb: "R" | "L" | "K" | "F";
  instrument: string;
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
  };
}

interface GeneratedPattern {
  blocks: string[];
  total_steps: number;
  renderable_notation: ParsedNotation;
  playable: boolean;
  constraints_applied: GeneratorConstraints;
  analysis?: PatternAnalysis;
}

interface PatternAnalysis {
  totalEvents: number;
  eventsByLimb: Record<string, number>;
  eventsByInstrument: Record<string, number>;
  density: number;
  hasAccents: boolean;
  averageVelocity: number;
}

interface GeneratorConstraints {
  maxDifficulty?: number;
  limbBalance?: "even" | "right-lead" | "left-lead";
  density?: "sparse" | "medium" | "dense";
  tempoRange?: { min: number; max: number };
  tags?: string[];
  excludeTags?: string[];
}

export default function BlockGenerator() {
  const [activeTab, setActiveTab] = useState<"random" | "progressive">("random");
  const [showConstraints, setShowConstraints] = useState(false);
  const [generatedPattern, setGeneratedPattern] = useState<GeneratedPattern | null>(null);
  const [progressivePatterns, setProgressivePatterns] = useState<GeneratedPattern[]>([]);

  // Constraints state
  const [blockCount, setBlockCount] = useState(4);
  const [maxDifficulty, setMaxDifficulty] = useState(5);
  const [limbBalance, setLimbBalance] = useState<string>("any");
  const [density, setDensity] = useState<string>("any");
  const [tempoMin, setTempoMin] = useState(80);
  const [tempoMax, setTempoMax] = useState(140);

  // Progressive mode state
  const [startDifficulty, setStartDifficulty] = useState(1);
  const [endDifficulty, setEndDifficulty] = useState(3);
  const [blocksPerLevel, setBlocksPerLevel] = useState(2);

  const { toast } = useToast();

  // Generate random pattern mutation
  const generateRandomMutation = useMutation({
    mutationFn: async () => {
      const constraints: GeneratorConstraints = {};

      if (maxDifficulty < 5) {
        constraints.maxDifficulty = maxDifficulty;
      }
      if (limbBalance !== "any") {
        constraints.limbBalance = limbBalance as "even" | "right-lead" | "left-lead";
      }
      if (density !== "any") {
        constraints.density = density as "sparse" | "medium" | "dense";
      }
      constraints.tempoRange = { min: tempoMin, max: tempoMax };

      const response = await fetch("/api/generator/random", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockCount, ...constraints }),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Generation failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedPattern(data);
      if (!data.playable) {
        toast({
          title: "No Matching Blocks",
          description: "Try adjusting your constraints or import more drumblocks.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate pattern",
        variant: "destructive",
      });
    },
  });

  // Generate progressive patterns mutation
  const generateProgressiveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/generator/progressive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDifficulty, endDifficulty, blocksPerLevel }),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Generation failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setProgressivePatterns(data.patterns || []);
      if (data.patterns?.length === 0) {
        toast({
          title: "No Patterns Generated",
          description: "Try adjusting difficulty range or import more drumblocks.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate patterns",
        variant: "destructive",
      });
    },
  });

  // Pattern analysis display
  const AnalysisCard = ({ analysis }: { analysis: PatternAnalysis }) => (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Pattern Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-2xl font-bold">{analysis.totalEvents}</p>
          <p className="text-xs text-muted-foreground">Total Events</p>
        </div>
        <div>
          <p className="text-2xl font-bold">{(analysis.density * 100).toFixed(0)}%</p>
          <p className="text-xs text-muted-foreground">Density</p>
        </div>
        <div>
          <p className="text-2xl font-bold">{(analysis.averageVelocity * 100).toFixed(0)}%</p>
          <p className="text-xs text-muted-foreground">Avg Velocity</p>
        </div>
        <div>
          <p className="text-2xl font-bold">{analysis.hasAccents ? "Yes" : "No"}</p>
          <p className="text-xs text-muted-foreground">Has Accents</p>
        </div>
        <div className="col-span-2">
          <p className="text-xs text-muted-foreground mb-1">Limb Distribution</p>
          <div className="flex gap-2">
            <Badge variant="outline" className="border-blue-500">
              R: {analysis.eventsByLimb.R || 0}
            </Badge>
            <Badge variant="outline" className="border-red-500">
              L: {analysis.eventsByLimb.L || 0}
            </Badge>
            <Badge variant="outline" className="border-green-500">
              K: {analysis.eventsByLimb.K || 0}
            </Badge>
            <Badge variant="outline" className="border-yellow-500">
              F: {analysis.eventsByLimb.F || 0}
            </Badge>
          </div>
        </div>
        <div className="col-span-2">
          <p className="text-xs text-muted-foreground mb-1">Instruments Used</p>
          <div className="flex flex-wrap gap-1">
            {Object.entries(analysis.eventsByInstrument).map(([instrument, count]) => (
              <Badge key={instrument} variant="secondary" className="text-xs">
                {instrument}: {count}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shuffle className="h-5 w-5" />
            Pattern Generator
          </CardTitle>
          <CardDescription>
            Generate random drum patterns from your imported drumblocks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="random" className="flex items-center gap-2">
                <Shuffle className="h-4 w-4" />
                Random
              </TabsTrigger>
              <TabsTrigger value="progressive" className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Progressive
              </TabsTrigger>
            </TabsList>

            <TabsContent value="random" className="mt-4 space-y-4">
              {/* Block count slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Number of Blocks</Label>
                  <span className="text-sm font-mono">{blockCount}</span>
                </div>
                <Slider
                  value={[blockCount]}
                  onValueChange={([v]) => setBlockCount(v)}
                  min={1}
                  max={8}
                  step={1}
                />
              </div>

              {/* Constraints collapsible */}
              <Collapsible open={showConstraints} onOpenChange={setShowConstraints}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Settings2 className="h-4 w-4" />
                      Advanced Constraints
                    </span>
                    {showConstraints ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4 space-y-4">
                  {/* Max difficulty */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Max Difficulty</Label>
                      <span className="text-sm font-mono">{maxDifficulty}</span>
                    </div>
                    <Slider
                      value={[maxDifficulty]}
                      onValueChange={([v]) => setMaxDifficulty(v)}
                      min={1}
                      max={5}
                      step={1}
                    />
                  </div>

                  {/* Limb balance */}
                  <div className="space-y-2">
                    <Label>Limb Balance</Label>
                    <Select value={limbBalance} onValueChange={setLimbBalance}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="even">Even (balanced)</SelectItem>
                        <SelectItem value="right-lead">Right-hand lead</SelectItem>
                        <SelectItem value="left-lead">Left-hand lead</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Density */}
                  <div className="space-y-2">
                    <Label>Density</Label>
                    <Select value={density} onValueChange={setDensity}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="sparse">Sparse</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="dense">Dense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tempo range */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Tempo Range</Label>
                      <span className="text-sm font-mono">
                        {tempoMin} - {tempoMax} BPM
                      </span>
                    </div>
                    <div className="flex gap-4">
                      <Slider
                        value={[tempoMin]}
                        onValueChange={([v]) => setTempoMin(Math.min(v, tempoMax - 10))}
                        min={40}
                        max={200}
                        step={5}
                        className="flex-1"
                      />
                      <Slider
                        value={[tempoMax]}
                        onValueChange={([v]) => setTempoMax(Math.max(v, tempoMin + 10))}
                        min={40}
                        max={200}
                        step={5}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Generate button */}
              <Button
                onClick={() => generateRandomMutation.mutate()}
                disabled={generateRandomMutation.isPending}
                className="w-full"
                size="lg"
              >
                {generateRandomMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Generate Pattern
                  </>
                )}
              </Button>
            </TabsContent>

            <TabsContent value="progressive" className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Generate a series of patterns that progressively increase in difficulty.
                Great for practice sessions!
              </p>

              {/* Difficulty range */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Difficulty</Label>
                  <Select
                    value={String(startDifficulty)}
                    onValueChange={(v) => setStartDifficulty(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          Level {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>End Difficulty</Label>
                  <Select
                    value={String(endDifficulty)}
                    onValueChange={(v) => setEndDifficulty(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          Level {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Blocks per level */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Blocks per Level</Label>
                  <span className="text-sm font-mono">{blocksPerLevel}</span>
                </div>
                <Slider
                  value={[blocksPerLevel]}
                  onValueChange={([v]) => setBlocksPerLevel(v)}
                  min={1}
                  max={4}
                  step={1}
                />
              </div>

              {/* Generate button */}
              <Button
                onClick={() => generateProgressiveMutation.mutate()}
                disabled={generateProgressiveMutation.isPending}
                className="w-full"
                size="lg"
              >
                {generateProgressiveMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4 mr-2" />
                    Generate Practice Series
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Results - Random Pattern */}
      {activeTab === "random" && generatedPattern && (
        <div className="space-y-4">
          {generatedPattern.playable ? (
            <>
              {/* Pattern info */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  <Drum className="h-3 w-3 mr-1" />
                  {generatedPattern.blocks.length} blocks
                </Badge>
                <Badge variant="outline">{generatedPattern.total_steps} steps</Badge>
                <Badge variant="outline">
                  {generatedPattern.renderable_notation.tempo} BPM
                </Badge>
                {generatedPattern.blocks.map((blockId) => (
                  <Badge key={blockId} variant="secondary">
                    {blockId}
                  </Badge>
                ))}
              </div>

              {/* Notation viewer */}
              <NotationGridViewer
                notation={generatedPattern.renderable_notation}
                title="Generated Pattern"
                showControls={true}
                showRawToggle={false}
              />

              {/* Analysis */}
              {generatedPattern.analysis && (
                <AnalysisCard analysis={generatedPattern.analysis} />
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Drum className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No matching drumblocks found</p>
                <p className="text-sm">Try adjusting constraints or import more blocks</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Results - Progressive Patterns */}
      {activeTab === "progressive" && progressivePatterns.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Practice Series ({progressivePatterns.length} patterns)
          </h3>

          {progressivePatterns.map((pattern, index) => (
            <Card key={index}>
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center justify-between">
                  <span>
                    Level {index + startDifficulty}: Pattern {index + 1}
                  </span>
                  <div className="flex gap-2">
                    {pattern.blocks.map((blockId) => (
                      <Badge key={blockId} variant="secondary" className="text-xs">
                        {blockId}
                      </Badge>
                    ))}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pattern.playable ? (
                  <NotationGridViewer
                    notation={pattern.renderable_notation}
                    showControls={true}
                    showRawToggle={false}
                    compact={true}
                  />
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    No pattern available for this level
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
