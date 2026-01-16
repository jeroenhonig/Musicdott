/**
 * Enhanced Assignment Builder with Multimedia Tasks
 * Supports video recording, practice tracking, and rubric-based grading
 */

import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  Trash2, 
  Play, 
  Video, 
  Upload, 
  Eye, 
  MessageSquare, 
  Timer,
  GripVertical,
  Calendar
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { VideoCapture } from "@/components/video/video-capture";

interface AssignmentTask {
  id: string;
  kind: 'view' | 'play' | 'record' | 'upload' | 'reflect' | 'timer';
  payload: {
    title?: string;
    description?: string;
    bpm?: number;
    bars?: number;
    link?: string;
    prompt?: string;
    duration?: number; // for timer tasks
    attachments?: string[];
  };
  position: number;
}

interface AssignmentRubric {
  criterion: string;
  weight: number; // 0-100%
  scale: { score: number; description: string }[];
}

interface AssignmentV2 {
  id?: string;
  title: string;
  description: string;
  dueAt?: Date;
  tasks: AssignmentTask[];
  rubric: AssignmentRubric[];
  targets: {
    classIds?: string[];
    studentIds?: string[];
  };
  visibility: 'assigned' | 'library';
}

const TASK_TYPES = [
  { 
    kind: 'view' as const, 
    label: 'Watch/Listen', 
    icon: Eye, 
    description: 'Watch a video or listen to audio content',
    color: 'bg-blue-500'
  },
  { 
    kind: 'play' as const, 
    label: 'Practice Play', 
    icon: Play, 
    description: 'Practice playing at specific BPM/bars',
    color: 'bg-green-500'
  },
  { 
    kind: 'record' as const, 
    label: 'Record Video', 
    icon: Video, 
    description: 'Record practice session video',
    color: 'bg-red-500'
  },
  { 
    kind: 'upload' as const, 
    label: 'Upload File', 
    icon: Upload, 
    description: 'Upload practice recording or document',
    color: 'bg-purple-500'
  },
  { 
    kind: 'reflect' as const, 
    label: 'Written Reflection', 
    icon: MessageSquare, 
    description: 'Write reflection or answer questions',
    color: 'bg-orange-500'
  },
  { 
    kind: 'timer' as const, 
    label: 'Timed Practice', 
    icon: Timer, 
    description: 'Practice for specific duration',
    color: 'bg-indigo-500'
  },
];

export function AssignmentBuilderV2() {
  const [assignment, setAssignment] = useState<AssignmentV2>({
    title: '',
    description: '',
    tasks: [],
    rubric: [],
    targets: {},
    visibility: 'assigned'
  });
  
  const [showVideoCapture, setShowVideoCapture] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const { toast } = useToast();

  const generateId = () => `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const addTask = (kind: AssignmentTask['kind']) => {
    const newTask: AssignmentTask = {
      id: generateId(),
      kind,
      payload: {
        title: `${TASK_TYPES.find(t => t.kind === kind)?.label} Task`,
        description: '',
      },
      position: assignment.tasks.length
    };

    setAssignment(prev => ({
      ...prev,
      tasks: [...prev.tasks, newTask]
    }));
  };

  const updateTask = (taskId: string, updates: Partial<AssignmentTask>) => {
    setAssignment(prev => ({
      ...prev,
      tasks: prev.tasks.map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      )
    }));
  };

  const deleteTask = (taskId: string) => {
    setAssignment(prev => ({
      ...prev,
      tasks: prev.tasks.filter(task => task.id !== taskId)
        .map((task, index) => ({ ...task, position: index }))
    }));
  };

  const moveTask = (taskId: string, direction: 'up' | 'down') => {
    const tasks = [...assignment.tasks];
    const index = tasks.findIndex(t => t.id === taskId);
    
    if (direction === 'up' && index > 0) {
      [tasks[index], tasks[index - 1]] = [tasks[index - 1], tasks[index]];
    } else if (direction === 'down' && index < tasks.length - 1) {
      [tasks[index], tasks[index + 1]] = [tasks[index + 1], tasks[index]];
    }
    
    // Update positions
    tasks.forEach((task, i) => task.position = i);
    
    setAssignment(prev => ({ ...prev, tasks }));
  };

  const addRubricCriterion = () => {
    const newCriterion: AssignmentRubric = {
      criterion: 'New Criterion',
      weight: 25,
      scale: [
        { score: 0, description: 'Not demonstrated' },
        { score: 1, description: 'Developing' },
        { score: 2, description: 'Proficient' },
        { score: 3, description: 'Advanced' }
      ]
    };

    setAssignment(prev => ({
      ...prev,
      rubric: [...prev.rubric, newCriterion]
    }));
  };

  const saveAssignment = async () => {
    try {
      // Validate assignment
      if (!assignment.title.trim()) {
        toast({
          title: "Missing Title",
          description: "Please provide a title for the assignment.",
          variant: "destructive"
        });
        return;
      }

      if (assignment.tasks.length === 0) {
        toast({
          title: "No Tasks",
          description: "Please add at least one task to the assignment.",
          variant: "destructive"
        });
        return;
      }

      // Submit to API
      const response = await fetch('/api/assignments/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(assignment)
      });

      if (response.ok) {
        toast({
          title: "Assignment Created",
          description: "Your assignment has been saved successfully!",
        });
        
        // Reset form
        setAssignment({
          title: '',
          description: '',
          tasks: [],
          rubric: [],
          targets: {},
          visibility: 'assigned'
        });
      } else {
        throw new Error('Failed to save assignment');
      }
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Could not save assignment. Please try again.",
        variant: "destructive"
      });
    }
  };

  const renderTaskEditor = (task: AssignmentTask) => {
    const taskType = TASK_TYPES.find(t => t.kind === task.kind);
    const IconComponent = taskType?.icon || Play;

    return (
      <Card key={task.id} className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded ${taskType?.color} text-white`}>
                <IconComponent className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm">{taskType?.label}</CardTitle>
                <p className="text-xs text-gray-500">{taskType?.description}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => moveTask(task.id, 'up')}
                disabled={task.position === 0}
              >
                ↑
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => moveTask(task.id, 'down')}
                disabled={task.position === assignment.tasks.length - 1}
              >
                ↓
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteTask(task.id)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          <div>
            <Label className="text-sm">Task Title</Label>
            <Input
              value={task.payload.title || ''}
              onChange={(e) => updateTask(task.id, {
                payload: { ...task.payload, title: e.target.value }
              })}
              placeholder="Enter task title..."
            />
          </div>
          
          <div>
            <Label className="text-sm">Instructions</Label>
            <Textarea
              value={task.payload.description || ''}
              onChange={(e) => updateTask(task.id, {
                payload: { ...task.payload, description: e.target.value }
              })}
              placeholder="Provide clear instructions for this task..."
              rows={2}
            />
          </div>

          {/* Task-specific fields */}
          {task.kind === 'play' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">BPM</Label>
                <Input
                  type="number"
                  value={task.payload.bpm || ''}
                  onChange={(e) => updateTask(task.id, {
                    payload: { ...task.payload, bpm: parseInt(e.target.value) || undefined }
                  })}
                  placeholder="120"
                />
              </div>
              <div>
                <Label className="text-sm">Bars</Label>
                <Input
                  type="number"
                  value={task.payload.bars || ''}
                  onChange={(e) => updateTask(task.id, {
                    payload: { ...task.payload, bars: parseInt(e.target.value) || undefined }
                  })}
                  placeholder="8"
                />
              </div>
            </div>
          )}

          {(task.kind === 'view') && (
            <div>
              <Label className="text-sm">Content Link</Label>
              <Input
                type="url"
                value={task.payload.link || ''}
                onChange={(e) => updateTask(task.id, {
                  payload: { ...task.payload, link: e.target.value }
                })}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
          )}

          {task.kind === 'reflect' && (
            <div>
              <Label className="text-sm">Reflection Prompt</Label>
              <Textarea
                value={task.payload.prompt || ''}
                onChange={(e) => updateTask(task.id, {
                  payload: { ...task.payload, prompt: e.target.value }
                })}
                placeholder="What did you learn? What was challenging?"
                rows={3}
              />
            </div>
          )}

          {task.kind === 'timer' && (
            <div>
              <Label className="text-sm">Practice Duration (minutes)</Label>
              <Input
                type="number"
                value={task.payload.duration || ''}
                onChange={(e) => updateTask(task.id, {
                  payload: { ...task.payload, duration: parseInt(e.target.value) || undefined }
                })}
                placeholder="15"
              />
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Interactive Assignment</CardTitle>
          <p className="text-sm text-gray-600">
            Build engaging assignments with multimedia tasks, rubrics, and automatic progress tracking.
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Basic Assignment Info */}
          <div className="space-y-4">
            <div>
              <Label>Assignment Title</Label>
              <Input
                value={assignment.title}
                onChange={(e) => setAssignment(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Week 3 - Basic Rock Beats Practice"
              />
            </div>
            
            <div>
              <Label>Description</Label>
              <Textarea
                value={assignment.description}
                onChange={(e) => setAssignment(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the assignment objectives and what students will learn..."
                rows={3}
              />
            </div>
            
            <div>
              <Label>Due Date (Optional)</Label>
              <Input
                type="datetime-local"
                onChange={(e) => setAssignment(prev => ({ 
                  ...prev, 
                  dueAt: e.target.value ? new Date(e.target.value) : undefined 
                }))}
              />
            </div>
          </div>

          <Separator />

          {/* Tasks Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">Assignment Tasks</h3>
                <p className="text-sm text-gray-600">Add multimedia tasks for students to complete</p>
              </div>
            </div>

            {/* Add Task Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              {TASK_TYPES.map((taskType) => {
                const IconComponent = taskType.icon;
                return (
                  <Button
                    key={taskType.kind}
                    variant="outline"
                    onClick={() => addTask(taskType.kind)}
                    className="h-auto p-3 flex flex-col items-center gap-2"
                  >
                    <div className={`p-2 rounded ${taskType.color} text-white`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium">{taskType.label}</span>
                  </Button>
                );
              })}
            </div>

            {/* Task List */}
            <div className="space-y-3">
              {assignment.tasks
                .sort((a, b) => a.position - b.position)
                .map(renderTaskEditor)}
              
              {assignment.tasks.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Video className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No tasks added yet. Click a task type above to get started.</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Rubric Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">Grading Rubric (Optional)</h3>
                <p className="text-sm text-gray-600">Define criteria for consistent grading</p>
              </div>
              <Button variant="outline" onClick={addRubricCriterion}>
                <Plus className="h-4 w-4 mr-2" />
                Add Criterion
              </Button>
            </div>

            {assignment.rubric.map((criterion, index) => (
              <Card key={index} className="mb-3">
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <Input
                        value={criterion.criterion}
                        onChange={(e) => {
                          const newRubric = [...assignment.rubric];
                          newRubric[index].criterion = e.target.value;
                          setAssignment(prev => ({ ...prev, rubric: newRubric }));
                        }}
                        placeholder="e.g., Timing & Rhythm"
                      />
                      <Input
                        type="number"
                        value={criterion.weight}
                        onChange={(e) => {
                          const newRubric = [...assignment.rubric];
                          newRubric[index].weight = parseInt(e.target.value) || 0;
                          setAssignment(prev => ({ ...prev, rubric: newRubric }));
                        }}
                        placeholder="Weight %"
                        className="w-24"
                      />
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      {criterion.scale.map((level, levelIndex) => (
                        <div key={levelIndex} className="space-y-1">
                          <div className="font-medium">Level {level.score}</div>
                          <Input
                            value={level.description}
                            onChange={(e) => {
                              const newRubric = [...assignment.rubric];
                              newRubric[index].scale[levelIndex].description = e.target.value;
                              setAssignment(prev => ({ ...prev, rubric: newRubric }));
                            }}
                            className="text-xs h-8"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Separator />

          {/* Assignment Actions */}
          <div className="flex justify-between">
            <Button variant="outline">
              Save as Draft
            </Button>
            
            <div className="space-x-2">
              <Button variant="outline">
                Preview
              </Button>
              <Button onClick={saveAssignment}>
                <Calendar className="h-4 w-4 mr-2" />
                Create Assignment
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}