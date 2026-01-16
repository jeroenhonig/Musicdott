import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen, 
  PlayCircle, 
  Users, 
  TrendingUp, 
  Settings, 
  DollarSign,
  Clock,
  Star,
  ExternalLink,
  Download,
  Video
} from "lucide-react";
import ContentViewer from "@/components/content-viewer";

// API Educational Content with all fields from database
interface EducationalContent {
  id: number;
  title: string;
  slug: string;
  description: string;
  content: string;
  contentBlocks?: any[]; // YouTube video blocks and other content
  contentType: string;
  category: string;
  targetAudience: string;
  difficulty: string;
  estimatedDuration: string;
  tags: string[];
  isPublished: boolean;
  isFeatured: boolean;
  authorName: string;
  viewCount: number;
  rating: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
}

// Static content interface for compatibility
interface StaticContent {
  id: number;
  title: string;
  description: string;
  category: string;
  targetAudience: string;
  difficulty: string;
  estimatedDuration: string;
  content: string;
  // Provide defaults for missing fields when converting to EducationalContent
}

// Convert static content to full EducationalContent format
const convertToEducationalContent = (staticContent: StaticContent): EducationalContent => ({
  ...staticContent,
  slug: staticContent.title.toLowerCase().replace(/\s+/g, '-'),
  contentBlocks: [],
  contentType: 'guide',
  tags: [],
  isPublished: true,
  isFeatured: false,
  authorName: 'MusicDott Team',
  viewCount: 0,
  rating: 480,
  ratingCount: 10,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

export default function ResourcesPage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'school_owner' || user?.role === 'platform_owner';

  // Fetch educational content from the API
  const { data: guides = [], isLoading: guidesLoading, error: guidesError } = useQuery<EducationalContent[]>({
    queryKey: ["/api/resources"],
    retry: 1,
    retryOnMount: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Sample static content for now (will be replaced by API content)
  const staticGuides: StaticContent[] = [
    {
      id: 1,
      title: "Getting Started: Your First Week with MusicDott",
      description: "Essential setup steps and best practices for new music school owners",
      category: "Getting Started",
      estimatedDuration: "15 min read",
      difficulty: "Beginner",
      targetAudience: "owners",
      content: `
        # Getting Started: Your First Week with MusicDott

        Welcome to MusicDott! This guide will help you set up your music school platform efficiently and start seeing results immediately.

        ## Day 1: Initial Setup
        - Import your existing student data
        - Set up teacher accounts
        - Configure your school settings and branding
        - Set billing preferences and subscription tiers

        ## Day 2-3: Student Management
        - Organize students by instrument and skill level
        - Set up student profiles with goals and preferences
        - Create your first student groups and cohorts
        - Configure parent communication preferences

        ## Day 4-5: Content Creation
        - Create your first interactive lessons
        - Upload existing sheet music and resources
        - Set up achievement milestones for students
        - Organize your song library by difficulty

        ## Day 6-7: Operations
        - Set up your lesson schedule templates
        - Configure automated billing cycles
        - Train your teachers on the platform
        - Launch with a small group of students

        ## Pro Tips
        - Start with your most tech-savvy teachers first
        - Use the import feature to migrate existing content
        - Set up automated reminders to reduce no-shows
        - Take advantage of the achievement system to boost engagement
      `
    },
    {
      id: 2,
      title: "Building Engaging Interactive Lessons",
      description: "Master the art of creating multimedia lessons that keep students motivated",
      category: "Teaching Excellence",
      estimatedDuration: "20 min read",
      difficulty: "Intermediate",
      targetAudience: "teachers",
      content: `
        # Building Engaging Interactive Lessons

        Learn how to create lessons that capture student attention and accelerate learning.

        ## Lesson Structure Framework
        1. **Opening Hook** (2-3 minutes)
           - Use audio or video to grab attention
           - Set clear learning objectives
           - Connect to previous lessons

        2. **Core Content** (15-20 minutes)
           - Break into digestible segments
           - Include interactive elements every 3-5 minutes
           - Use multiple media types

        3. **Practice Application** (10-15 minutes)
           - Guided practice with feedback
           - Progressive difficulty
           - Real-time assessment

        4. **Wrap-up & Next Steps** (5 minutes)
           - Summarize key concepts
           - Assign practice homework
           - Preview next lesson

        ## Content Block Best Practices

        ### Text Blocks
        - Keep paragraphs short (3-4 sentences max)
        - Use bullet points for step-by-step instructions
        - Include clear headings and subheadings

        ### Audio Integration
        - Record clear, high-quality demonstrations
        - Include backing tracks for practice
        - Add metronome tracks for timing practice

        ### Video Elements
        - Show proper technique close-ups
        - Include performance examples
        - Create short technique drills

        ### Interactive Exercises
        - Use the groove pattern builder for rhythm
        - Include listening exercises
        - Create call-and-response activities

        ## Engagement Strategies
        - Start each lesson with a "Quick Win" activity
        - Use the achievement system to celebrate progress
        - Include student choice in repertoire selection
        - Create friendly competition through challenges
      `
    },
    {
      id: 3,
      title: "Optimizing Your Music School Operations",
      description: "Streamline your business processes and increase profitability",
      category: "Business Growth",
      estimatedDuration: "25 min read",
      difficulty: "Advanced",
      targetAudience: "owners",
      content: `
        # Optimizing Your Music School Operations

        Transform your music school into a well-oiled machine with these operational strategies.

        ## Revenue Optimization

        ### Pricing Strategy
        - Analyze local market rates annually
        - Implement tiered pricing (Standard, Premium, Elite)
        - Offer family discounts for multiple students
        - Create annual payment incentives

        ### Schedule Efficiency
        - Use MusicDott's conflict detection to maximize room utilization
        - Implement back-to-back scheduling to reduce downtime
        - Offer popular time slots at premium rates
        - Create waitlists for high-demand teachers

        ### Student Retention Strategies
        - Track engagement metrics through MusicDott analytics
        - Implement regular progress celebrations
        - Use automated reminder systems
        - Create parent engagement programs

        ## Administrative Efficiency

        ### Automated Workflows
        - Set up automated billing cycles
        - Use template lessons for consistent quality
        - Implement standard operating procedures
        - Create automated student progress reports

        ### Teacher Management
        - Use performance analytics to identify top teachers
        - Implement peer teaching and observation programs
        - Create professional development tracks
        - Standardize lesson planning processes

        ### Growth Metrics to Track
        - Student acquisition cost
        - Lifetime value per student
        - Teacher utilization rates
        - Lesson cancellation rates
        - Payment collection efficiency

        ## Scaling Your School

        ### When to Hire New Teachers
        - Teacher schedule at 85%+ capacity
        - Waitlist of 10+ students per instrument
        - Consistent monthly growth for 3+ months
        - Strong cash flow and profit margins

        ### Location Expansion Criteria
        - Current location profitable for 12+ months
        - Market research shows demand
        - Capital available for 6 months operations
        - Management systems proven and documented
      `
    },
    {
      id: 4,
      title: "Student Motivation and Achievement Systems",
      description: "Psychology-backed strategies for keeping students engaged and progressing",
      category: "Student Success",
      estimatedDuration: "18 min read",
      difficulty: "Intermediate",
      targetAudience: "teachers",
      content: `
        # Student Motivation and Achievement Systems

        Understanding the psychology of learning music and implementing effective motivation strategies.

        ## The Achievement Psychology

        ### Intrinsic vs Extrinsic Motivation
        - **Intrinsic**: Love of music, personal satisfaction, creative expression
        - **Extrinsic**: Badges, competitions, recitals, parent praise
        - Best results come from combining both approaches
        - Gradually shift focus from extrinsic to intrinsic over time

        ### The Progress Recognition Framework
        1. **Immediate Feedback** (during lesson)
           - Positive reinforcement for effort
           - Specific technique corrections
           - Celebration of small wins

        2. **Short-term Goals** (weekly/monthly)
           - Learning new songs
           - Mastering specific techniques
           - Earning achievement badges

        3. **Long-term Milestones** (quarterly/annually)
           - Recital performances
           - Grade examinations
           - Personal repertoire goals

        ## Using MusicDott's Achievement System

        ### Setting Up Meaningful Badges
        - **Technique Badges**: Proper posture, hand position, breathing
        - **Repertoire Badges**: First song, classical pieces, contemporary hits
        - **Practice Badges**: Daily practice streaks, total hours practiced
        - **Performance Badges**: First recital, ensemble participation
        - **Theory Badges**: Note reading, rhythm mastery, chord progression

        ### Progress Tracking Strategies
        - Weekly practice logs with goal setting
        - Video submissions for technique review
        - Regular skill assessments using built-in rubrics
        - Student self-reflection journals

        ## Age-Appropriate Motivation Techniques

        ### Young Children (5-8 years)
        - Use game-like elements and storytelling
        - Frequent small rewards and celebrations
        - Visual progress charts and stickers
        - Parent involvement in practice

        ### Pre-teens (9-12 years)
        - Introduce friendly competition
        - Choice in repertoire selection
        - Peer collaboration opportunities
        - Goal-setting workshops

        ### Teenagers (13-18 years)
        - Focus on personal expression and creativity
        - Connect to popular music and trends
        - Performance opportunities and recording
        - Music theory and composition exploration

        ### Adults
        - Flexible scheduling and understanding
        - Personal goal alignment
        - Stress relief and enjoyment focus
        - Progress celebration without pressure

        ## Overcoming Common Motivation Challenges

        ### Practice Resistance
        - Break practice into smaller chunks
        - Use gamification and challenges
        - Provide practice track accompaniments
        - Set specific, achievable daily goals

        ### Plateau Periods
        - Acknowledge that plateaus are normal
        - Introduce new techniques or styles
        - Focus on musical expression over technique
        - Arrange performance opportunities

        ### Competition with Other Activities
        - Highlight unique benefits of music education
        - Show flexibility in scheduling
        - Connect music to student's other interests
        - Demonstrate real-world applications
      `
    }
  ];

  const videos = [
    {
      id: 1,
      title: "Platform Overview: 10-Minute Tour",
      description: "Complete walkthrough of MusicDott's main features",
      estimatedDuration: "10:24",
      category: "Getting Started",
      thumbnail: "/api/placeholder/300/180",
      url: "#"
    },
    {
      id: 2,
      title: "Creating Your First Interactive Lesson",
      description: "Step-by-step tutorial for lesson creation",
      estimatedDuration: "15:33",
      category: "Teaching",
      thumbnail: "/api/placeholder/300/180",
      url: "#"
    },
    {
      id: 3,
      title: "Setting Up Automated Billing",
      description: "Configure subscription management and payment processing",
      estimatedDuration: "8:47",
      category: "Business",
      thumbnail: "/api/placeholder/300/180",
      url: "#"
    }
  ];

  const tools = [
    {
      id: 1,
      name: "Student Progress Template",
      description: "Standardized progress tracking sheets for different instruments",
      category: "Templates",
      format: "PDF",
      size: "2.3 MB"
    },
    {
      id: 2,
      name: "Lesson Planning Worksheet",
      description: "Structured template for creating effective lesson plans",
      category: "Templates",
      format: "PDF",
      size: "1.8 MB"
    },
    {
      id: 3,
      name: "Parent Communication Scripts",
      description: "Email templates for common parent communications",
      category: "Communication",
      format: "DOCX",
      size: "245 KB"
    },
    {
      id: 4,
      name: "Sheet Music Viewer",
      description: "View and display MusicXML sheet music with zoom and pan controls",
      category: "Music Notation",
      format: "Web App",
      size: "Online",
      url: "/sheet-music"
    },
    {
      id: 5,
      name: "Guitar Tablature Editor",
      description: "Create and view guitar tabs with AlphaTex notation and MIDI playback",
      category: "Music Notation",
      format: "Web App",
      size: "Online",
      url: "/tablature"
    },
    {
      id: 6,
      name: "ABC Notation Editor",
      description: "Write and edit music in ABC notation with live preview and audio playback",
      category: "Music Notation",
      format: "Web App",
      size: "Online",
      url: "/abc-notation"
    },
    {
      id: 7,
      name: "Voice-to-Note Transcription",
      description: "Transcribe melodies by singing or playing - converts to ABC notation",
      category: "Music Notation",
      format: "Web App",
      size: "Online",
      url: "/speech-to-note"
    },
    {
      id: 8,
      name: "Flat.io Score Embed",
      description: "Embed interactive sheet music from Flat.io with playback controls",
      category: "Music Notation",
      format: "Web App",
      size: "Online",
      url: "/flat-embed"
    }
  ];

  // Combine API content with static content for seamless experience
  // Ensure guides is always an array, even if API call fails
  const safeGuides = Array.isArray(guides) ? guides : [];
  const allContent = [...safeGuides, ...staticGuides];
  
  const filteredGuides = allContent.filter(guide => {
    if (isOwner) return true; // Owners see everything
    return guide.targetAudience === "teachers" || guide.targetAudience === "both";
  });

  return (
    <div className="p-6 space-y-6">
      <div className="liquid-glass rounded-2xl p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Resources & Learning Hub
        </h1>
        <p className="text-gray-600">
          {isOwner 
            ? "Comprehensive guides and resources to help you build and grow your music school"
            : "Professional development resources to enhance your teaching practice"
          }
        </p>
      </div>

      <div className="liquid-glass rounded-2xl">
        <Tabs defaultValue="guides" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="guides">Guides & Articles</TabsTrigger>
            <TabsTrigger value="videos">Video Tutorials</TabsTrigger>
            <TabsTrigger value="tools">Templates & Tools</TabsTrigger>
          </TabsList>

          <TabsContent value="guides" className="p-6">
          <div className="grid gap-6">
            {/* API Content from CMS */}
            {safeGuides.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Platform Resources</h3>
                <div className="grid gap-4">
                  {safeGuides.filter(guide => {
                    if (isOwner) return true;
                    return guide.targetAudience === "teachers" || guide.targetAudience === "both";
                  }).map((guide) => (
                    <Card key={guide.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="secondary">{guide.category}</Badge>
                              <Badge variant="outline">{guide.difficulty}</Badge>
                              {guide.targetAudience === "owners" && (
                                <Badge variant="default">For Owners</Badge>
                              )}
                              {guide.contentBlocks && guide.contentBlocks.length > 0 && (
                                <Badge variant="outline" className="bg-red-50 text-red-700">
                                  <Video className="h-3 w-3 mr-1" />
                                  Videos
                                </Badge>
                              )}
                            </div>
                            <CardTitle className="text-xl mb-2">{guide.title}</CardTitle>
                            <CardDescription>{guide.description}</CardDescription>
                          </div>
                          <div className="text-right text-sm text-gray-500 ml-4">
                            <div className="flex items-center gap-1">
                              <Clock size={14} />
                              {guide.estimatedDuration}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2">
                          <ContentViewer
                            content={guide}
                            triggerElement={
                              <Button className="flex items-center gap-2">
                                <BookOpen size={16} />
                                Read Guide
                              </Button>
                            }
                          />
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Star size={14} className="fill-yellow-400 text-yellow-400" />
                            <span>{(guide.rating / 100).toFixed(1)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Error Message for API Failure */}
            {guidesError && !guidesLoading && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-yellow-800">
                  <ExternalLink size={16} />
                  <span className="font-medium">Platform Resources Unavailable</span>
                </div>
                <p className="text-yellow-700 text-sm mt-1">
                  We're unable to load platform resources at the moment. You can still access our comprehensive guide library below.
                </p>
              </div>
            )}

            {/* Static Content */}
            {staticGuides.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Additional Resources</h3>
                <div className="grid gap-4">
                  {staticGuides.filter(guide => {
                    if (isOwner) return true;
                    return guide.targetAudience === "teachers" || guide.targetAudience === "both";
                  }).map((guide) => (
                    <Card key={guide.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="secondary">{guide.category}</Badge>
                              <Badge variant="outline">{guide.difficulty}</Badge>
                              {guide.targetAudience === "owners" && (
                                <Badge variant="default">For Owners</Badge>
                              )}
                            </div>
                            <CardTitle className="text-xl mb-2">{guide.title}</CardTitle>
                            <CardDescription>{guide.description}</CardDescription>
                          </div>
                          <div className="text-right text-sm text-gray-500 ml-4">
                            <div className="flex items-center gap-1">
                              <Clock size={14} />
                              {guide.estimatedDuration}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2">
                          <ContentViewer
                            content={convertToEducationalContent(guide)}
                            triggerElement={
                              <Button className="flex items-center gap-2">
                                <BookOpen size={16} />
                                Read Guide
                              </Button>
                            }
                          />
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Star size={14} className="fill-yellow-400 text-yellow-400" />
                            <span>4.8</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

          <TabsContent value="videos" className="p-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <Card key={video.id} className="hover:shadow-md transition-shadow">
                <div className="relative">
                  <div className="w-full h-48 bg-gray-100 rounded-t-lg flex items-center justify-center">
                    <PlayCircle size={48} className="text-primary" />
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                    {video.estimatedDuration}
                  </div>
                </div>
                <CardHeader>
                  <Badge variant="secondary" className="w-fit">{video.category}</Badge>
                  <CardTitle className="text-lg">{video.title}</CardTitle>
                  <CardDescription>{video.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full flex items-center gap-2">
                    <PlayCircle size={16} />
                    Watch Tutorial
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

          <TabsContent value="tools" className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            {tools.map((tool) => (
              <Card key={tool.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge variant="secondary" className="mb-2">{tool.category}</Badge>
                      <CardTitle className="text-lg">{tool.name}</CardTitle>
                      <CardDescription>{tool.description}</CardDescription>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <div>{tool.format}</div>
                      <div>{tool.size}</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {tool.url ? (
                    <Link href={tool.url}>
                      <Button className="flex items-center gap-2 w-full">
                        <ExternalLink size={16} />
                        Open Tool
                      </Button>
                    </Link>
                  ) : (
                    <Button className="flex items-center gap-2">
                      <Download size={16} />
                      Download
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Quick Access Banner */}
      <Card className="mt-12 bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Need Personal Help?
              </h3>
              <p className="text-gray-600">
                Schedule a 30-minute consultation with our education specialists
              </p>
            </div>
            <Button className="flex items-center gap-2">
              <ExternalLink size={16} />
              Book Consultation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}