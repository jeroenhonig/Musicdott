/**
 * Avatar Customization Component
 * Allows users to create and customize their avatar
 */

import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { User, Palette, Shirt, Eye, Smile, Save, RotateCcw } from "lucide-react";

interface AvatarOptions {
  skinTone: string;
  hairColor: string;
  hairStyle: string;
  eyeColor: string;
  accessory: string;
  background: string;
}

const SKIN_TONES = [
  { id: "light", color: "#FFDAB9", label: "Light" },
  { id: "fair", color: "#F5D0C5", label: "Fair" },
  { id: "medium", color: "#D4A574", label: "Medium" },
  { id: "tan", color: "#C19A6B", label: "Tan" },
  { id: "brown", color: "#8B6914", label: "Brown" },
  { id: "dark", color: "#5C4033", label: "Dark" },
];

const HAIR_COLORS = [
  { id: "black", color: "#1a1a1a", label: "Black" },
  { id: "brown", color: "#4a3728", label: "Brown" },
  { id: "blonde", color: "#d4a574", label: "Blonde" },
  { id: "red", color: "#8b3a3a", label: "Red" },
  { id: "gray", color: "#808080", label: "Gray" },
  { id: "blue", color: "#4a90d9", label: "Blue" },
  { id: "purple", color: "#9b59b6", label: "Purple" },
  { id: "pink", color: "#ff69b4", label: "Pink" },
];

const HAIR_STYLES = [
  { id: "short", label: "Short" },
  { id: "medium", label: "Medium" },
  { id: "long", label: "Long" },
  { id: "curly", label: "Curly" },
  { id: "mohawk", label: "Mohawk" },
  { id: "bald", label: "Bald" },
];

const EYE_COLORS = [
  { id: "brown", color: "#5c4033", label: "Brown" },
  { id: "blue", color: "#4a90d9", label: "Blue" },
  { id: "green", color: "#2ecc71", label: "Green" },
  { id: "hazel", color: "#8b7355", label: "Hazel" },
  { id: "gray", color: "#708090", label: "Gray" },
];

const ACCESSORIES = [
  { id: "none", label: "None" },
  { id: "glasses", label: "Glasses" },
  { id: "sunglasses", label: "Sunglasses" },
  { id: "headphones", label: "Headphones" },
  { id: "hat", label: "Hat" },
  { id: "bandana", label: "Bandana" },
];

const BACKGROUNDS = [
  { id: "blue", color: "#3b82f6", label: "Blue" },
  { id: "green", color: "#22c55e", label: "Green" },
  { id: "purple", color: "#a855f7", label: "Purple" },
  { id: "orange", color: "#f97316", label: "Orange" },
  { id: "pink", color: "#ec4899", label: "Pink" },
  { id: "gray", color: "#6b7280", label: "Gray" },
];

const DEFAULT_OPTIONS: AvatarOptions = {
  skinTone: "medium",
  hairColor: "brown",
  hairStyle: "short",
  eyeColor: "brown",
  accessory: "none",
  background: "blue",
};

function AvatarPreview({ options }: { options: AvatarOptions }) {
  const skinColor = SKIN_TONES.find(s => s.id === options.skinTone)?.color || "#D4A574";
  const hairColor = HAIR_COLORS.find(h => h.id === options.hairColor)?.color || "#4a3728";
  const eyeColor = EYE_COLORS.find(e => e.id === options.eyeColor)?.color || "#5c4033";
  const bgColor = BACKGROUNDS.find(b => b.id === options.background)?.color || "#3b82f6";

  return (
    <svg viewBox="0 0 200 200" className="w-full h-full max-w-[200px] mx-auto">
      <circle cx="100" cy="100" r="95" fill={bgColor} />
      
      <circle cx="100" cy="110" r="60" fill={skinColor} />
      
      {options.hairStyle !== "bald" && (
        <>
          {options.hairStyle === "short" && (
            <path d="M50 90 Q50 50 100 45 Q150 50 150 90 L145 85 Q100 55 55 85 Z" fill={hairColor} />
          )}
          {options.hairStyle === "medium" && (
            <path d="M45 95 Q45 40 100 35 Q155 40 155 95 L150 90 Q100 50 50 90 Z" fill={hairColor} />
          )}
          {options.hairStyle === "long" && (
            <>
              <path d="M40 100 Q40 35 100 30 Q160 35 160 100 L155 95 Q100 45 45 95 Z" fill={hairColor} />
              <path d="M45 95 Q40 140 50 170 L55 165 Q50 135 55 95 Z" fill={hairColor} />
              <path d="M155 95 Q160 140 150 170 L145 165 Q150 135 145 95 Z" fill={hairColor} />
            </>
          )}
          {options.hairStyle === "curly" && (
            <>
              <circle cx="60" cy="60" r="15" fill={hairColor} />
              <circle cx="80" cy="50" r="15" fill={hairColor} />
              <circle cx="100" cy="45" r="15" fill={hairColor} />
              <circle cx="120" cy="50" r="15" fill={hairColor} />
              <circle cx="140" cy="60" r="15" fill={hairColor} />
              <circle cx="50" cy="80" r="12" fill={hairColor} />
              <circle cx="150" cy="80" r="12" fill={hairColor} />
            </>
          )}
          {options.hairStyle === "mohawk" && (
            <path d="M90 50 L100 20 L110 50 Q100 45 90 50 Z" fill={hairColor} />
          )}
        </>
      )}
      
      <ellipse cx="75" cy="105" rx="10" ry="12" fill="white" />
      <ellipse cx="125" cy="105" rx="10" ry="12" fill="white" />
      <circle cx="77" cy="107" r="6" fill={eyeColor} />
      <circle cx="127" cy="107" r="6" fill={eyeColor} />
      <circle cx="79" cy="105" r="2" fill="white" />
      <circle cx="129" cy="105" r="2" fill="white" />
      
      <ellipse cx="100" cy="125" rx="6" ry="4" fill={`color-mix(in srgb, ${skinColor} 70%, #5c4033)`} />
      
      <path d="M85 140 Q100 150 115 140" stroke="#c0392b" strokeWidth="3" fill="none" strokeLinecap="round" />
      
      {options.accessory === "glasses" && (
        <>
          <circle cx="75" cy="105" r="18" fill="none" stroke="#333" strokeWidth="3" />
          <circle cx="125" cy="105" r="18" fill="none" stroke="#333" strokeWidth="3" />
          <line x1="93" y1="105" x2="107" y2="105" stroke="#333" strokeWidth="3" />
          <line x1="57" y1="105" x2="45" y2="100" stroke="#333" strokeWidth="3" />
          <line x1="143" y1="105" x2="155" y2="100" stroke="#333" strokeWidth="3" />
        </>
      )}
      {options.accessory === "sunglasses" && (
        <>
          <rect x="55" y="95" width="35" height="20" rx="5" fill="#1a1a1a" />
          <rect x="110" y="95" width="35" height="20" rx="5" fill="#1a1a1a" />
          <line x1="90" y1="105" x2="110" y2="105" stroke="#1a1a1a" strokeWidth="3" />
          <line x1="55" y1="105" x2="45" y2="100" stroke="#1a1a1a" strokeWidth="3" />
          <line x1="145" y1="105" x2="155" y2="100" stroke="#1a1a1a" strokeWidth="3" />
        </>
      )}
      {options.accessory === "headphones" && (
        <>
          <path d="M45 100 Q45 60 100 55 Q155 60 155 100" fill="none" stroke="#333" strokeWidth="8" />
          <rect x="35" y="90" width="20" height="30" rx="5" fill="#333" />
          <rect x="145" y="90" width="20" height="30" rx="5" fill="#333" />
        </>
      )}
      {options.accessory === "hat" && (
        <path d="M45 70 L155 70 L150 55 Q100 45 50 55 Z" fill="#2c3e50" />
      )}
      {options.accessory === "bandana" && (
        <path d="M50 85 Q100 70 150 85 L145 80 Q100 65 55 80 Z" fill="#e74c3c" />
      )}
    </svg>
  );
}

function ColorPicker({ 
  options, 
  value, 
  onChange, 
  label 
}: { 
  options: { id: string; color: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => onChange(option.id)}
            className={`w-8 h-8 rounded-full border-2 transition-all ${
              value === option.id 
                ? "border-primary ring-2 ring-primary ring-offset-2" 
                : "border-gray-300 hover:border-gray-400"
            }`}
            style={{ backgroundColor: option.color }}
            title={option.label}
            data-testid={`color-${label.toLowerCase().replace(' ', '-')}-${option.id}`}
          />
        ))}
      </div>
    </div>
  );
}

function StylePicker({
  options,
  value,
  onChange,
  label
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Button
            key={option.id}
            variant={value === option.id ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(option.id)}
            data-testid={`style-${label.toLowerCase().replace(' ', '-')}-${option.id}`}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function AvatarCustomizer({ onSave }: { onSave?: (avatarUrl: string) => void }) {
  const [options, setOptions] = useState<AvatarOptions>(DEFAULT_OPTIONS);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateOption = <K extends keyof AvatarOptions>(key: K, value: AvatarOptions[K]) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const resetOptions = () => {
    setOptions(DEFAULT_OPTIONS);
  };

  const generateAvatarDataUrl = (): string => {
    const skinColor = SKIN_TONES.find(s => s.id === options.skinTone)?.color || "#D4A574";
    const hairColor = HAIR_COLORS.find(h => h.id === options.hairColor)?.color || "#4a3728";
    const eyeColor = EYE_COLORS.find(e => e.id === options.eyeColor)?.color || "#5c4033";
    const bgColor = BACKGROUNDS.find(b => b.id === options.background)?.color || "#3b82f6";
    
    const avatarData = btoa(JSON.stringify({ ...options, skinColor, hairColor, eyeColor, bgColor }));
    return `data:application/json;base64,${avatarData}`;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const avatarUrl = generateAvatarDataUrl();
      await apiRequest("PATCH", "/api/user/profile", { avatar: avatarUrl });
      return avatarUrl;
    },
    onSuccess: (avatarUrl) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Avatar Saved",
        description: "Your avatar has been updated successfully!",
      });
      onSave?.(avatarUrl);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save avatar. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Customize Your Avatar
        </CardTitle>
        <CardDescription>
          Create a unique avatar that represents you
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-lg">
            <AvatarPreview options={options} />
            <p className="text-sm text-muted-foreground mt-4">Your Avatar</p>
          </div>
          
          <Tabs defaultValue="appearance" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="appearance" data-testid="tab-appearance">
                <Smile className="h-4 w-4 mr-1" />
                Face
              </TabsTrigger>
              <TabsTrigger value="hair" data-testid="tab-hair">
                <User className="h-4 w-4 mr-1" />
                Hair
              </TabsTrigger>
              <TabsTrigger value="extras" data-testid="tab-extras">
                <Palette className="h-4 w-4 mr-1" />
                Extras
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="appearance" className="space-y-4 mt-4">
              <ColorPicker
                label="Skin Tone"
                options={SKIN_TONES}
                value={options.skinTone}
                onChange={(id) => updateOption("skinTone", id)}
              />
              <ColorPicker
                label="Eye Color"
                options={EYE_COLORS}
                value={options.eyeColor}
                onChange={(id) => updateOption("eyeColor", id)}
              />
            </TabsContent>
            
            <TabsContent value="hair" className="space-y-4 mt-4">
              <StylePicker
                label="Hair Style"
                options={HAIR_STYLES}
                value={options.hairStyle}
                onChange={(id) => updateOption("hairStyle", id)}
              />
              <ColorPicker
                label="Hair Color"
                options={HAIR_COLORS}
                value={options.hairColor}
                onChange={(id) => updateOption("hairColor", id)}
              />
            </TabsContent>
            
            <TabsContent value="extras" className="space-y-4 mt-4">
              <StylePicker
                label="Accessory"
                options={ACCESSORIES}
                value={options.accessory}
                onChange={(id) => updateOption("accessory", id)}
              />
              <ColorPicker
                label="Background"
                options={BACKGROUNDS}
                value={options.background}
                onChange={(id) => updateOption("background", id)}
              />
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={resetOptions} data-testid="button-reset-avatar">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button 
            onClick={() => saveMutation.mutate()} 
            disabled={saveMutation.isPending}
            data-testid="button-save-avatar"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save Avatar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function AvatarDisplay({ avatarData, size = 40 }: { avatarData?: string; size?: number }) {
  const [options, setOptions] = useState<AvatarOptions | null>(null);

  useEffect(() => {
    if (avatarData?.startsWith("data:application/json;base64,")) {
      try {
        const base64 = avatarData.split(",")[1];
        const decoded = JSON.parse(atob(base64));
        setOptions(decoded);
      } catch {
        setOptions(null);
      }
    }
  }, [avatarData]);

  if (!options) {
    return (
      <div 
        className="rounded-full bg-muted flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <User className="h-1/2 w-1/2 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div style={{ width: size, height: size }}>
      <AvatarPreview options={options} />
    </div>
  );
}
