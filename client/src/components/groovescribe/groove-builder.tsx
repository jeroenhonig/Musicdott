/**
 * GrooveScribe Pattern Builder
 * Create and edit drum patterns with GrooveScribe integration
 */

import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Save, 
  Music, 
  Play, 
  Edit3, 
  Trash2,
  Copy
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GrooveEmbed } from "./groove-embed";

interface DrumPattern {
  id: string;
  title: string;
  description: string;
  grooveData: string;
  bpm: number;
  bars: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  createdAt: Date;
}

interface GrooveBuilderProps {
  initialPattern?: DrumPattern;
  onSave?: (pattern: DrumPattern) => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit';
}

const DIFFICULTY_COLORS = {
  beginner: 'bg-green-500',
  intermediate: 'bg-yellow-500',
  advanced: 'bg-red-500'
};

// Authentic GrooveScribe patterns from the source code
const PRESET_PATTERNS = [
  {
    title: "8th Note Rock",
    grooveData: "TimeSig=4/4&Div=8&Tempo=80&Measures=1&H=|xxxxxxxx|&S=|--O---O-|&K=|o---o---|",
    bpm: 80,
    bars: 1,
    difficulty: 'beginner' as const,
    description: "Standard 8th note rock beat with kick on 1 and 3, snare on 2 and 4"
  },
  {
    title: "16th Note Rock",
    grooveData: "TimeSig=4/4&Div=16&Tempo=80&Measures=1&H=|xxxxxxxxxxxxxxxx|&S=|----O-------O---|&K=|o-------o-------|",
    bpm: 80,
    bars: 1,
    difficulty: 'beginner' as const,
    description: "Standard 16th note rock beat with steady hi-hats"
  },
  {
    title: "Jazz Shuffle",
    grooveData: "TimeSig=4/4&Div=12&Tempo=100&Measures=1&H=|r--r-rr--r-r|&S=|g-gO-gg-gO-g|&K=|o--X--o--X--|",
    bpm: 100,
    bars: 1,
    difficulty: 'intermediate' as const,
    description: "Jazz shuffle with triplet feel and ride cymbal"
  },
  {
    title: "Train Beat",
    grooveData: "TimeSig=4/4&Div=16&Swing=0&Tempo=95&Measures=1&H=|----------------|&S=|ggOgggOgggOggOOg|&K=|o-x-o-x-o-x-o-x-|",
    bpm: 95,
    bars: 1,
    difficulty: 'advanced' as const,
    description: "Advanced train beat with ghost notes and cross-stick patterns"
  },
  {
    title: "Bossa Nova",
    grooveData: "TimeSig=4/4&Div=8&Tempo=140&Measures=2&H=|xxxxxxxx|xxxxxxxx|&S=|x-x--x-x|-x--x-x-|&K=|o-xoo-xo|o-xoo-xo|",
    bpm: 140,
    bars: 2,
    difficulty: 'intermediate' as const,
    description: "Classic Bossa Nova pattern with cross-stick and subtle kick"
  },
  {
    title: "Songo",
    grooveData: "TimeSig=4/4&Div=16&Tempo=80&Measures=1&H=|x---x---x---x---|&S=|--O--g-O-gg--g-g|&K=|---o--o----o--o-|",
    bpm: 80,
    bars: 1,
    difficulty: 'advanced' as const,
    description: "Cuban Songo pattern with complex snare work and ghost notes"
  }
];

export function GrooveBuilder({
  initialPattern,
  onSave,
  onCancel,
  mode = 'create'
}: GrooveBuilderProps) {
  const [pattern, setPattern] = useState<DrumPattern>(
    initialPattern || {
      id: '',
      title: '',
      description: '',
      grooveData: '',
      bpm: 120,
      bars: 4,
      difficulty: 'beginner',
      tags: [],
      createdAt: new Date()
    }
  );
  
  const [tagInput, setTagInput] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<typeof PRESET_PATTERNS[0] | null>(null);
  const { toast } = useToast();

  // Load preset pattern
  const loadPreset = (preset: typeof PRESET_PATTERNS[0]) => {
    setPattern(prev => ({
      ...prev,
      title: preset.title,
      description: preset.description,
      grooveData: preset.grooveData,
      bpm: preset.bpm,
      bars: preset.bars,
      difficulty: preset.difficulty
    }));
    setSelectedPreset(preset);
  };

  // Add tag
  const addTag = () => {
    if (tagInput.trim() && !pattern.tags.includes(tagInput.trim())) {
      setPattern(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  // Remove tag
  const removeTag = (tagToRemove: string) => {
    setPattern(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // Handle groove data change from GrooveScribe
  const handleGrooveChange = (grooveData: string) => {
    setPattern(prev => ({
      ...prev,
      grooveData
    }));
  };

  // Save pattern
  const handleSave = () => {
    if (!pattern.title.trim()) {
      toast({
        title: "Missing Title",
        description: "Please provide a title for the drum pattern",
        variant: "destructive"
      });
      return;
    }

    if (!pattern.grooveData.trim()) {
      toast({
        title: "No Pattern Data",
        description: "Please create or select a drum pattern",
        variant: "destructive"
      });
      return;
    }

    const savedPattern: DrumPattern = {
      ...pattern,
      id: pattern.id || `pattern_${Date.now()}`,
      createdAt: pattern.createdAt || new Date()
    };

    if (onSave) {
      onSave(savedPattern);
    }

    toast({
      title: "Pattern Saved",
      description: `"${savedPattern.title}" has been saved successfully`,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {mode === 'create' ? 'Create Drum Pattern' : 'Edit Drum Pattern'}
          </CardTitle>
          <p className="text-sm text-gray-600">
            Build interactive drum patterns using GrooveScribe notation
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Basic Pattern Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Pattern Title</Label>
              <Input
                value={pattern.title}
                onChange={(e) => setPattern(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Basic Rock Beat"
              />
            </div>
            
            <div>
              <Label>Difficulty</Label>
              <select
                value={pattern.difficulty}
                onChange={(e) => setPattern(prev => ({ 
                  ...prev, 
                  difficulty: e.target.value as DrumPattern['difficulty'] 
                }))}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={pattern.description}
              onChange={(e) => setPattern(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the pattern, technique, and learning objectives..."
              rows={3}
            />
          </div>

          {/* Tempo and Length */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>BPM</Label>
              <Input
                type="number"
                value={pattern.bpm}
                onChange={(e) => setPattern(prev => ({ 
                  ...prev, 
                  bpm: parseInt(e.target.value) || 120 
                }))}
                min={60}
                max={200}
              />
            </div>
            
            <div>
              <Label>Bars</Label>
              <Input
                type="number"
                value={pattern.bars}
                onChange={(e) => setPattern(prev => ({ 
                  ...prev, 
                  bars: parseInt(e.target.value) || 4 
                }))}
                min={1}
                max={16}
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add tags (rock, funk, beginner, etc.)"
                onKeyPress={(e) => e.key === 'Enter' && addTag()}
              />
              <Button onClick={addTag} variant="outline" size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-1">
              {pattern.tags.map((tag, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-red-100"
                  onClick={() => removeTag(tag)}
                >
                  {tag} ×
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preset Patterns */}
      <Card>
        <CardHeader>
          <CardTitle>Preset Patterns</CardTitle>
          <p className="text-sm text-gray-600">
            Start with a preset pattern and customize it
          </p>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PRESET_PATTERNS.map((preset, index) => (
              <Card 
                key={index} 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedPreset === preset ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => loadPreset(preset)}
              >
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{preset.title}</h4>
                    <Badge className={DIFFICULTY_COLORS[preset.difficulty]}>
                      {preset.difficulty}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{preset.description}</p>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{preset.bpm} BPM</span>
                    <span>{preset.bars} bars</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* GrooveScribe Editor */}
      <GrooveEmbed
        grooveData={pattern.grooveData}
        title={pattern.title || "New Pattern"}
        bpm={pattern.bpm}
        bars={pattern.bars}
        showControls={true}
        onGrooveChange={handleGrooveChange}
      />

      {/* Actions */}
      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={onCancel}
        >
          Cancel
        </Button>
        
        <div className="space-x-2">
          <Button variant="outline">
            <Copy className="h-4 w-4 mr-2" />
            Copy Pattern
          </Button>
          
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Pattern
          </Button>
        </div>
      </div>
    </div>
  );
}