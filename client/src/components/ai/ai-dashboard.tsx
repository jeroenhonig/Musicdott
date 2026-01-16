/**
 * Comprehensive AI Dashboard for MusicDott 2.0
 * All 4 Phases of AI Implementation
 */

import React, { useState } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Sparkles, 
  Brain, 
  Calendar, 
  Target, 
  Mic,
  Music,
  FileText,
  Zap,
  CheckCircle,
  Clock,
  TrendingUp
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AIDashboardProps {
  userRole: 'teacher' | 'student' | 'school_owner';
  userId: number;
}

export function AIDashboard({ userRole, userId }: AIDashboardProps) {
  const [activeTab, setActiveTab] = useState("recap");
  const { toast } = useToast();

  // Check AI services status
  const { data: aiStatus } = useQuery({
    queryKey: ["/api/ai/status"],
    queryFn: async () => {
      const response = await fetch("/api/ai/status");
      return response.json();
    },
  });

  const features = [
    {
      id: "recap",
      title: "Lesson Recap AI",
      description: "Generate motivating lesson summaries from quick notes",
      icon: FileText,
      phase: "Phase 1",
      available: aiStatus?.services.lessonRecap,
    },
    {
      id: "practice-plan",
      title: "Practice Plans",
      description: "Personalized 7-day practice schedules with AI",
      icon: Calendar,
      phase: "Phase 2", 
      available: aiStatus?.services.lessonRecap,
    },
    {
      id: "challenges",
      title: "Gamified Challenges",
      description: "AI-powered weekly practice challenges",
      icon: Target,
      phase: "Phase 2",
      available: aiStatus?.services.lessonRecap,
    },
    {
      id: "feedback",
      title: "Practice Feedback",
      description: "Instant AI analysis of practice recordings",
      icon: Mic,
      phase: "Phase 3",
      available: aiStatus?.services.practiceFeedback,
    },
    {
      id: "assignments",
      title: "Smart Assignments",
      description: "Generate assignments from plain language",
      icon: Brain,
      phase: "Phase 3",
      available: aiStatus?.services.smartAssignment,
    },
    {
      id: "transcription",
      title: "Auto Transcription",
      description: "Convert audio to notation automatically",
      icon: Music,
      phase: "Phase 4",
      available: aiStatus?.services.transcription,
    },
  ];

  const renderFeatureCard = (feature: any) => (
    <Card key={feature.id} className={`transition-all hover:shadow-md ${
      !feature.available ? 'opacity-60' : ''
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <feature.icon className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-base">{feature.title}</CardTitle>
          </div>
          <Badge variant={feature.available ? "default" : "secondary"} className="text-xs">
            {feature.phase}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-3">{feature.description}</p>
        <div className="flex items-center justify-between">
          <Badge variant={feature.available ? "default" : "outline"} className="text-xs">
            {feature.available ? (
              <>
                <CheckCircle className="w-3 h-3 mr-1" />
                Available
              </>
            ) : (
              <>
                <Clock className="w-3 h-3 mr-1" />
                Config Needed
              </>
            )}
          </Badge>
          <Button 
            size="sm" 
            variant={feature.available ? "default" : "outline"}
            onClick={() => setActiveTab(feature.id)}
            disabled={!feature.available}
          >
            {feature.available ? "Use Now" : "Setup"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold">MusicDott AI</h1>
          <Badge className="px-3 py-1">
            <Zap className="w-3 h-3 mr-1" />
            Powered by OpenAI
          </Badge>
        </div>
        <p className="text-gray-600">
          Comprehensive AI-powered music education tools to enhance learning and teaching
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 lg:grid-cols-6 h-auto p-1">
          {features.map((feature) => (
            <TabsTrigger 
              key={feature.id} 
              value={feature.id}
              className="flex flex-col items-center gap-1 p-3 data-[state=active]:bg-blue-50"
              disabled={!feature.available}
            >
              <feature.icon className="w-4 h-4" />
              <span className="text-xs">{feature.title.split(' ')[0]}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map(renderFeatureCard)}
          </div>
        </TabsContent>

        {/* Lesson Recap Tab */}
        <TabsContent value="recap" className="space-y-6">
          <LessonRecapInterface />
        </TabsContent>

        {/* Practice Plans Tab */}
        <TabsContent value="practice-plan" className="space-y-6">
          <PracticePlanInterface />
        </TabsContent>

        {/* Weekly Challenges Tab */}
        <TabsContent value="challenges" className="space-y-6">
          <WeeklyChallengesInterface />
        </TabsContent>

        {/* Practice Feedback Tab */}
        <TabsContent value="feedback" className="space-y-6">
          <PracticeFeedbackInterface />
        </TabsContent>

        {/* Smart Assignments Tab */}
        <TabsContent value="assignments" className="space-y-6">
          <SmartAssignmentsInterface />
        </TabsContent>

        {/* Transcription Tab */}
        <TabsContent value="transcription" className="space-y-6">
          <TranscriptionInterface />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Individual AI Interface Components
function LessonRecapInterface() {
  const [notes, setNotes] = useState("");
  const [studentName, setStudentName] = useState("");
  const [instrument, setInstrument] = useState("");
  const [level, setLevel] = useState("");
  const { toast } = useToast();

  const generateRecapMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/ai/lesson-recap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Recap Generated",
        description: "AI has created your lesson recap successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          AI Lesson Recap Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            placeholder="Student Name"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
          />
          <Input
            placeholder="Instrument"
            value={instrument}
            onChange={(e) => setInstrument(e.target.value)}
          />
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger>
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Textarea
          placeholder="Enter your lesson notes (e.g., worked on groove @80bpm, introduced ghost notes, student struggled with left hand, homework = 2x per day 10min)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-[120px]"
        />
        
        <Button 
          onClick={() => generateRecapMutation.mutate({
            studentName, instrument, level, lessonNotes: notes, studentLanguage: 'English'
          })}
          disabled={generateRecapMutation.isPending || !notes.trim()}
          className="w-full"
        >
          {generateRecapMutation.isPending ? "Generating..." : "Generate AI Recap"}
        </Button>

        {generateRecapMutation.data?.recap && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium mb-2">Generated Recap:</h4>
            <p className="text-sm leading-relaxed">{generateRecapMutation.data.recap}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Additional interface components would go here...
function PracticePlanInterface() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Practice Plan Generator</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">Generate personalized 7-day practice plans for your students.</p>
        <Button className="mt-4">Coming Soon</Button>
      </CardContent>
    </Card>
  );
}

function WeeklyChallengesInterface() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Weekly Challenges</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">Create engaging weekly challenges to keep students motivated.</p>
        <Button className="mt-4">Coming Soon</Button>
      </CardContent>
    </Card>
  );
}

function PracticeFeedbackInterface() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Practice Feedback</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">Analyze practice recordings and provide instant feedback.</p>
        <Button className="mt-4">Coming Soon</Button>
      </CardContent>
    </Card>
  );
}

function SmartAssignmentsInterface() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Smart Assignment Builder</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">Generate complete assignments from plain language descriptions.</p>
        <Button className="mt-4">Coming Soon</Button>
      </CardContent>
    </Card>
  );
}

function TranscriptionInterface() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Transcription & Notation</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">Convert audio recordings to musical notation automatically.</p>
        <Button className="mt-4">Coming Soon</Button>
      </CardContent>
    </Card>
  );
}