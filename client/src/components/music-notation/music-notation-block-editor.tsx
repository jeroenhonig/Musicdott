import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Music, Guitar, FileMusic, Mic, FileText, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface MusicNotationBlock {
  id: string;
  type: 'sheet_music' | 'tablature' | 'abc_notation' | 'flat_embed' | 'speech_to_note';
  title: string;
  description?: string;
  content?: string;
  fileUrl?: string;
  scoreId?: string;
}

interface MusicNotationBlockEditorProps {
  blocks: MusicNotationBlock[];
  onChange: (blocks: MusicNotationBlock[]) => void;
  maxBlocks?: number;
}

const blockTypes = [
  { value: 'sheet_music', label: 'Sheet Music (MusicXML)', icon: FileMusic, description: 'Upload MusicXML files for sheet music display' },
  { value: 'tablature', label: 'Tablature (Guitar Pro)', icon: Guitar, description: 'Guitar Pro files or AlphaTex notation' },
  { value: 'abc_notation', label: 'ABC Notation', icon: Music, description: 'Text-based music notation for folk tunes' },
  { value: 'flat_embed', label: 'Flat.io Score', icon: FileText, description: 'Embed interactive scores from Flat.io' },
  { value: 'speech_to_note', label: 'Voice Transcription', icon: Mic, description: 'Let students transcribe melodies by singing' }
] as const;

export function MusicNotationBlockEditor({ 
  blocks, 
  onChange, 
  maxBlocks = 10 
}: MusicNotationBlockEditorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<MusicNotationBlock | null>(null);
  const [formData, setFormData] = useState<Partial<MusicNotationBlock>>({});
  const { toast } = useToast();

  const handleAddBlock = () => {
    if (blocks.length >= maxBlocks) {
      toast({
        title: "Maximum blocks reached",
        description: `You can add up to ${maxBlocks} music notation blocks`,
        variant: "destructive"
      });
      return;
    }
    setEditingBlock(null);
    setFormData({});
    setIsDialogOpen(true);
  };

  const handleEditBlock = (block: MusicNotationBlock) => {
    setEditingBlock(block);
    setFormData(block);
    setIsDialogOpen(true);
  };

  const handleRemoveBlock = (blockId: string) => {
    onChange(blocks.filter(b => b.id !== blockId));
  };

  const handleSaveBlock = () => {
    if (!formData.type || !formData.title) {
      toast({
        title: "Missing required fields",
        description: "Please select a type and enter a title",
        variant: "destructive"
      });
      return;
    }

    const block: MusicNotationBlock = {
      id: editingBlock?.id || `music-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: formData.type as MusicNotationBlock['type'],
      title: formData.title,
      description: formData.description,
      content: formData.content,
      fileUrl: formData.fileUrl,
      scoreId: formData.scoreId
    };

    if (editingBlock) {
      onChange(blocks.map(b => b.id === editingBlock.id ? block : b));
    } else {
      onChange([...blocks, block]);
    }

    setIsDialogOpen(false);
    setFormData({});
    setEditingBlock(null);
  };

  const getBlockIcon = (type: string) => {
    const blockType = blockTypes.find(t => t.value === type);
    return blockType?.icon || Music;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Music Notation Elements</Label>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={handleAddBlock}
          disabled={blocks.length >= maxBlocks}
          data-testid="button-add-music-block"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Music Element
        </Button>
      </div>

      {blocks.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground">
          <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No music notation elements added yet</p>
          <p className="text-sm">Add sheet music, tablature, or other music tools to enhance your content</p>
        </div>
      ) : (
        <div className="space-y-2">
          {blocks.map((block, index) => {
            const Icon = getBlockIcon(block.type);
            return (
              <Card key={block.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{block.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {blockTypes.find(t => t.value === block.type)?.label}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditBlock(block)}
                      data-testid={`button-edit-block-${index}`}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveBlock(block.id)}
                      data-testid={`button-remove-block-${index}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingBlock ? 'Edit Music Element' : 'Add Music Element'}
            </DialogTitle>
            <DialogDescription>
              Add interactive music notation to your lesson or song
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="block-type">Type</Label>
              <Select
                value={formData.type || ''}
                onValueChange={(value) => setFormData({ ...formData, type: value as MusicNotationBlock['type'] })}
              >
                <SelectTrigger id="block-type" data-testid="select-block-type">
                  <SelectValue placeholder="Select music notation type" />
                </SelectTrigger>
                <SelectContent>
                  {blockTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.type && (
                <p className="text-sm text-muted-foreground">
                  {blockTypes.find(t => t.value === formData.type)?.description}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="block-title">Title</Label>
              <Input
                id="block-title"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Main Theme Sheet Music"
                data-testid="input-block-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="block-description">Description (optional)</Label>
              <Textarea
                id="block-description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this music element"
                rows={2}
                data-testid="textarea-block-description"
              />
            </div>

            {formData.type === 'abc_notation' && (
              <div className="space-y-2">
                <Label htmlFor="block-content">ABC Notation Content</Label>
                <Textarea
                  id="block-content"
                  value={formData.content || ''}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="X:1&#10;T:Title&#10;M:4/4&#10;K:C&#10;C D E F |"
                  rows={6}
                  className="font-mono"
                  data-testid="textarea-abc-content"
                />
              </div>
            )}

            {formData.type === 'tablature' && (
              <div className="space-y-2">
                <Label htmlFor="block-content">AlphaTex Content (optional)</Label>
                <Textarea
                  id="block-content"
                  value={formData.content || ''}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="\\title &quot;Song Title&quot;&#10;.&#10;:4 0.6 2.5 2.4 0.3 |"
                  rows={4}
                  className="font-mono"
                  data-testid="textarea-tab-content"
                />
                <p className="text-sm text-muted-foreground">
                  Leave empty to allow file upload in the viewer
                </p>
              </div>
            )}

            {formData.type === 'flat_embed' && (
              <div className="space-y-2">
                <Label htmlFor="block-score-id">Flat.io Score ID</Label>
                <Input
                  id="block-score-id"
                  value={formData.scoreId || ''}
                  onChange={(e) => setFormData({ ...formData, scoreId: e.target.value })}
                  placeholder="Enter score ID or paste Flat.io URL"
                  data-testid="input-flat-score-id"
                />
                <p className="text-sm text-muted-foreground">
                  Find scores at flat.io/community
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveBlock} data-testid="button-save-block">
              {editingBlock ? 'Save Changes' : 'Add Element'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MusicNotationBlockEditor;
