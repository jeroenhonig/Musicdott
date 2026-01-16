/**
 * Real-time Collaborative Notation Editor
 * Built with VexFlow for music notation rendering
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  Play, 
  Pause, 
  Save, 
  Share, 
  MessageSquare,
  Undo,
  Redo,
  Music,
  Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { io, Socket } from "socket.io-client";

// VexFlow will be imported dynamically
let Vex: any = null;

interface Collaborator {
  userId: number;
  username: string;
  permission: string;
  cursorPosition?: {
    measure: number;
    beat: number;
  };
  color?: string;
}

interface NotationOperation {
  type: "insert" | "delete" | "replace" | "cursor";
  position: {
    measure: number;
    beat: number;
    noteIndex?: number;
  };
  data?: any;
  userId: number;
  timestamp: number;
}

interface CollaborativeNotationEditorProps {
  documentId: string;
  userId: number;
  username: string;
  initialData?: any;
  onSave?: (data: any) => void;
  readOnly?: boolean;
}

const COLLABORATOR_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", 
  "#FFEAA7", "#DDA0DD", "#FFB347", "#87CEEB"
];

export function CollaborativeNotationEditor({
  documentId,
  userId,
  username,
  initialData,
  onSave,
  readOnly = false
}: CollaborativeNotationEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const rendererRef = useRef<any>(null);
  const contextRef = useRef<any>(null);
  
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [notationData, setNotationData] = useState(initialData || getDefaultNotation());
  const [isConnected, setIsConnected] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedTool, setSelectedTool] = useState("note");
  const [version, setVersion] = useState(1);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const { toast } = useToast();

  // Initialize VexFlow and WebSocket connection
  useEffect(() => {
    initializeVexFlow();
    initializeWebSocket();
    
    return () => {
      cleanup();
    };
  }, [documentId]);

  const initializeVexFlow = async () => {
    try {
      // Dynamically import VexFlow
      const VexFlowModule = await import('vexflow');
      Vex = VexFlowModule.default;
      
      if (svgRef.current) {
        // Initialize VexFlow renderer
        const { Renderer, Stave, StaveNote, Voice, Formatter } = Vex.Flow;
        
        rendererRef.current = new Renderer(svgRef.current, Renderer.Backends.SVG);
        rendererRef.current.resize(800, 400);
        contextRef.current = rendererRef.current.getContext();
        
        // Initial render
        renderNotation();
      }
    } catch (error) {
      console.error("Failed to initialize VexFlow:", error);
      toast({
        title: "Loading Error",
        description: "Failed to load music notation engine",
        variant: "destructive",
      });
    }
  };

  const initializeWebSocket = () => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    socketRef.current = io(wsUrl, {
      transports: ['websocket'],
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('notation:join', { documentId, userId });
      
      toast({
        title: "Connected",
        description: "Joined collaborative editing session",
      });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      toast({
        title: "Disconnected",
        description: "Lost connection to collaborative session",
        variant: "destructive",
      });
    });

    socket.on('notation:state', (data) => {
      setNotationData(data.document.notationData);
      setCollaborators(data.collaborators.map((collab: any, index: number) => ({
        ...collab,
        color: COLLABORATOR_COLORS[index % COLLABORATOR_COLORS.length]
      })));
      setVersion(data.version);
      renderNotation();
    });

    socket.on('notation:user_joined', (data) => {
      setCollaborators(prev => {
        if (prev.find(c => c.userId === data.userId)) return prev;
        return [...prev, {
          ...data,
          color: COLLABORATOR_COLORS[prev.length % COLLABORATOR_COLORS.length]
        }];
      });
      
      toast({
        title: "User Joined",
        description: `${data.username} joined the session`,
      });
    });

    socket.on('notation:user_left', (data) => {
      setCollaborators(prev => prev.filter(c => c.userId !== data.userId));
      
      toast({
        title: "User Left",
        description: `${data.username} left the session`,
      });
    });

    socket.on('notation:operation_applied', (data) => {
      handleRemoteOperation(data.operation);
      setVersion(data.version);
    });

    socket.on('notation:cursor_update', (data) => {
      updateCollaboratorCursor(data.userId, data.position);
    });

    socket.on('notation:error', (data) => {
      toast({
        title: "Collaboration Error",
        description: data.error,
        variant: "destructive",
      });
    });
  };

  const cleanup = () => {
    if (socketRef.current) {
      socketRef.current.emit('notation:leave', { documentId, userId });
      socketRef.current.disconnect();
    }
  };

  const renderNotation = useCallback(() => {
    if (!contextRef.current || !Vex) return;

    try {
      // Clear previous content
      contextRef.current.clear();
      
      const { Stave, StaveNote, Voice, Formatter } = Vex.Flow;
      
      // Create a basic 4/4 measure
      const stave = new Stave(10, 40, 400);
      stave.addClef("treble").addTimeSignature("4/4");
      stave.setContext(contextRef.current).draw();

      // Convert notation data to VexFlow notes
      const notes = convertToVexFlowNotes(notationData.measures?.[0] || []);
      
      if (notes.length > 0) {
        const voice = new Voice({ num_beats: 4, beat_value: 4 });
        voice.addTickables(notes);
        
        new Formatter().joinVoices([voice]).format([voice], 350);
        voice.draw(contextRef.current, stave);
      }

      // Render collaborator cursors
      renderCollaboratorCursors();
      
    } catch (error) {
      console.error("Error rendering notation:", error);
    }
  }, [notationData, collaborators]);

  const convertToVexFlowNotes = (measureData: any[]): any[] => {
    if (!Vex || !measureData.length) {
      // Default notes if no data
      const { StaveNote } = Vex.Flow;
      return [
        new StaveNote({ keys: ["c/4"], duration: "q" }),
        new StaveNote({ keys: ["d/4"], duration: "q" }),
        new StaveNote({ keys: ["e/4"], duration: "q" }),
        new StaveNote({ keys: ["f/4"], duration: "q" }),
      ];
    }

    return measureData.map((noteData) => {
      const { StaveNote } = Vex.Flow;
      return new StaveNote({
        keys: noteData.keys || ["c/4"],
        duration: noteData.duration || "q",
      });
    });
  };

  const renderCollaboratorCursors = () => {
    // Render colored cursors for each collaborator
    collaborators.forEach((collaborator) => {
      if (collaborator.cursorPosition && collaborator.userId !== userId) {
        // Render cursor at collaborator's position
        // This would involve calculating SVG coordinates from musical position
      }
    });
  };

  const handleNotationClick = (event: React.MouseEvent) => {
    if (readOnly) return;

    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Convert SVG coordinates to musical position
    const musicalPosition = convertSVGToMusicalPosition(x, y);
    
    // Create operation based on selected tool
    const operation: NotationOperation = {
      type: selectedTool as any,
      position: musicalPosition,
      data: getToolData(selectedTool),
      userId,
      timestamp: Date.now(),
    };

    // Apply locally and send to server
    applyOperation(operation);
    sendOperation(operation);
  };

  const convertSVGToMusicalPosition = (x: number, y: number) => {
    // Convert SVG coordinates to measure/beat position
    // This is a simplified calculation
    const measure = Math.floor(x / 400); // Assuming 400px per measure
    const beat = (x % 400) / 100; // Assuming 100px per beat
    
    return {
      measure: Math.max(0, measure),
      beat: Math.max(0, Math.min(4, beat)),
    };
  };

  const getToolData = (tool: string) => {
    switch (tool) {
      case "note":
        return { keys: ["c/4"], duration: "q" };
      case "rest":
        return { duration: "qr" };
      default:
        return {};
    }
  };

  const applyOperation = (operation: NotationOperation) => {
    setNotationData(prev => {
      const newData = { ...prev };
      
      // Apply operation to notation data
      switch (operation.type) {
        case "insert":
          if (!newData.measures) newData.measures = [[]];
          if (!newData.measures[operation.position.measure]) {
            newData.measures[operation.position.measure] = [];
          }
          newData.measures[operation.position.measure].push(operation.data);
          break;
        case "delete":
          // Handle delete operation
          break;
        case "replace":
          // Handle replace operation
          break;
      }
      
      return newData;
    });

    setHasUnsavedChanges(true);
    renderNotation();
  };

  const sendOperation = (operation: NotationOperation) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('notation:operation', {
        documentId,
        operation,
      });
    }
  };

  const handleRemoteOperation = (operation: NotationOperation) => {
    if (operation.userId !== userId) {
      applyOperation(operation);
    }
  };

  const updateCollaboratorCursor = (collaboratorId: number, position: any) => {
    setCollaborators(prev => 
      prev.map(collab => 
        collab.userId === collaboratorId 
          ? { ...collab, cursorPosition: position }
          : collab
      )
    );
  };

  const handleSave = async () => {
    if (onSave) {
      await onSave(notationData);
      setHasUnsavedChanges(false);
      toast({
        title: "Saved",
        description: "Notation document saved successfully",
      });
    }
  };

  const handlePlayback = () => {
    setIsPlaying(!isPlaying);
    // Implement playback using Web Audio API or similar
    toast({
      title: isPlaying ? "Stopped" : "Playing",
      description: isPlaying ? "Playback stopped" : "Starting playback...",
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={selectedTool === "note" ? "default" : "outline"}
                onClick={() => setSelectedTool("note")}
              >
                <Music className="w-4 h-4 mr-1" />
                Note
              </Button>
              <Button
                size="sm"
                variant={selectedTool === "rest" ? "default" : "outline"}
                onClick={() => setSelectedTool("rest")}
              >
                Rest
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <Button size="sm" variant="outline">
                <Undo className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline">
                <Redo className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handlePlayback}>
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Button 
                size="sm" 
                variant={hasUnsavedChanges ? "default" : "outline"}
                onClick={handleSave}
                disabled={readOnly}
              >
                <Save className="w-4 h-4 mr-1" />
                {hasUnsavedChanges ? "Save*" : "Saved"}
              </Button>
              <Button size="sm" variant="outline">
                <Share className="w-4 h-4 mr-1" />
                Share
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Editor */}
      <div className="flex flex-1 gap-4">
        {/* Notation Canvas */}
        <Card className="flex-1">
          <CardContent className="p-4">
            <div 
              className="relative border rounded-lg bg-white overflow-auto"
              style={{ height: "500px" }}
            >
              <svg
                ref={svgRef}
                width="100%"
                height="100%"
                onClick={handleNotationClick}
                className="cursor-crosshair"
              />
            </div>
          </CardContent>
        </Card>

        {/* Collaboration Panel */}
        <Card className="w-80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Collaborators ({collaborators.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              <div 
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className="text-sm text-gray-600">
                {isConnected ? "Connected" : "Disconnected"}
              </span>
              <Badge variant="secondary" className="ml-auto">
                v{version}
              </Badge>
            </div>

            <Separator />

            {/* Collaborators List */}
            <div className="space-y-2">
              {collaborators.map((collaborator) => (
                <div 
                  key={collaborator.userId}
                  className="flex items-center gap-2 p-2 rounded-lg bg-gray-50"
                >
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: collaborator.color }}
                  />
                  <span className="text-sm font-medium">
                    {collaborator.username}
                    {collaborator.userId === userId && " (You)"}
                  </span>
                  <Badge 
                    variant="outline" 
                    className="ml-auto text-xs"
                  >
                    {collaborator.permission}
                  </Badge>
                </div>
              ))}
              
              {collaborators.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No other collaborators</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Comments Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm font-medium">Comments</span>
              </div>
              <Input placeholder="Add a comment..." className="text-sm" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getDefaultNotation() {
  return {
    measures: [
      [
        { keys: ["c/4"], duration: "q" },
        { keys: ["d/4"], duration: "q" },
        { keys: ["e/4"], duration: "q" },
        { keys: ["f/4"], duration: "q" },
      ]
    ]
  };
}

export default CollaborativeNotationEditor;