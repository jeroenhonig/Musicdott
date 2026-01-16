import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, User, Clock, CheckCircle, Reply, Video, Play } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/layouts/app-layout";
import { VideoCapture } from "@/components/video/video-capture";

interface Message {
  id: number;
  subject: string;
  message: string;
  createdAt: string;
  response?: string;
  respondedAt?: string;
  responseRead: boolean;
  videoId?: string;
  videoUrl?: string;
}

export default function AskTeacherPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [replyToMessageId, setReplyToMessageId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [showVideoCapture, setShowVideoCapture] = useState(false);
  const [attachedVideoId, setAttachedVideoId] = useState<string | null>(null);
  
  // Fetch actual student messages and responses
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["/api/student/message-responses"],
    enabled: !!user
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ subject, message, videoId }: { subject: string; message: string; videoId?: string }) => {
      return apiRequest("POST", "/api/student/ask-teacher", { subject, message, videoId });
    },
    onSuccess: () => {
      setSubject("");
      setMessage("");
      setAttachedVideoId(null);
      setShowVideoCapture(false);
      queryClient.invalidateQueries({ queryKey: ["/api/student/message-responses"] });
      toast({
        title: "Message sent",
        description: "Your teacher will respond soon.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const sendReplyMutation = useMutation({
    mutationFn: async ({ messageId, reply }: { messageId: number; reply: string }) => {
      return apiRequest("POST", `/api/student/reply-message/${messageId}`, { reply });
    },
    onSuccess: () => {
      setReplyText("");
      setReplyToMessageId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/student/message-responses"] });
      toast({
        title: "Reply sent",
        description: "Your teacher will see your response.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send reply. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mark responses as read when viewing
  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return apiRequest("PATCH", `/api/student/mark-response-read/${messageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/message-responses"] });
    },
  });

  // Auto-mark unread responses as read when the component loads
  useEffect(() => {
    if (messages && Array.isArray(messages)) {
      const unreadResponses = messages.filter(m => m.response && !m.responseRead);
      unreadResponses.forEach(message => {
        markAsReadMutation.mutate(message.id);
      });
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in both subject and message.",
        variant: "destructive",
      });
      return;
    }
    sendMessageMutation.mutate({ subject, message, videoId: attachedVideoId || undefined });
  };

  const handleReply = (messageId: number) => {
    if (!replyText.trim()) {
      toast({
        title: "Missing reply",
        description: "Please enter your reply before sending.",
        variant: "destructive",
      });
      return;
    }
    sendReplyMutation.mutate({ messageId, reply: replyText });
  };

  if (isLoading) {
    return (
      <AppLayout title="Ask Teacher">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Ask Teacher">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ask My Teacher</h1>
          <p className="text-gray-600 mt-2">Get help and feedback from your music teacher</p>
        </div>

        {/* Send Message Form */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5 text-blue-600" />
              <span>Send a New Message</span>
            </CardTitle>
            <p className="text-sm text-gray-600">Have a question? Need help with your music? Send your teacher a message here.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="What's your question about?"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your question or ask for feedback..."
                  rows={4}
                  className="mt-1"
                />
              </div>

              {/* Video Attachment */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium">Practice Video (Optional)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowVideoCapture(!showVideoCapture)}
                  >
                    <Video className="h-4 w-4 mr-2" />
                    {showVideoCapture ? 'Hide Camera' : 'Record Video'}
                  </Button>
                </div>
                
                {showVideoCapture && (
                  <div className="mb-4">
                    <VideoCapture 
                      maxDuration={180} // 3 minutes
                      onVideoUploaded={(videoId) => {
                        setAttachedVideoId(videoId);
                        setShowVideoCapture(false);
                      }}
                    />
                  </div>
                )}
                
                {attachedVideoId && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">
                          Practice video attached
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setAttachedVideoId(null)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <Button 
                type="submit" 
                disabled={sendMessageMutation.isPending}
                className="w-full sm:w-auto"
              >
                <Send className="h-4 w-4 mr-2" />
                {attachedVideoId ? 'Send Message with Video' : 'Send Message'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Message History */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Message History</h2>
          {Array.isArray(messages) && messages.length > 0 ? (
            <div className="space-y-4">
              {messages.map((msg: any) => (
                <Card key={msg.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CardTitle className="text-lg">{msg.subject}</CardTitle>
                        {msg.response && !msg.responseRead && (
                          <Badge variant="destructive" className="text-xs">
                            New Response
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-1 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        <span>{format(new Date(msg.createdAt), "MMM d, h:mm a")}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Student Message */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <User className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-900">You</span>
                      </div>
                      <p className="text-blue-800">{msg.message}</p>
                      
                      {/* Video attachment display */}
                      {msg.videoUrl && (
                        <div className="mt-3">
                          <video 
                            controls 
                            className="w-full max-w-md rounded-lg"
                            poster="/api/videos/thumbnail/${msg.videoId}"
                          >
                            <source src={msg.videoUrl} type="video/webm" />
                            <source src={msg.videoUrl} type="video/mp4" />
                            Your browser does not support video playback.
                          </video>
                          <p className="text-xs text-blue-600 mt-1">Practice video</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Teacher Response */}
                    {msg.response ? (
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-green-900">Your Teacher</span>
                          </div>
                          {msg.respondedAt && (
                            <span className="text-sm text-green-600">
                              {format(new Date(msg.respondedAt), "MMM d, h:mm a")}
                            </span>
                          )}
                        </div>
                        <p className="text-green-800">{msg.response}</p>
                      </div>
                    ) : (
                      <div className="bg-yellow-50 p-4 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-yellow-600" />
                          <span className="font-medium text-yellow-900">Waiting for response</span>
                        </div>
                        <p className="text-yellow-800 text-sm mt-1">Your teacher will respond soon.</p>
                      </div>
                    )}

                    {/* Reply Section */}
                    {msg.response && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        {replyToMessageId === msg.id ? (
                          <div className="space-y-3">
                            <Label htmlFor={`reply-${msg.id}`} className="text-sm font-medium text-gray-700">
                              Continue the conversation
                            </Label>
                            <Textarea
                              id={`reply-${msg.id}`}
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Type your reply..."
                              rows={3}
                              className="resize-none"
                            />
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={() => handleReply(msg.id)}
                                disabled={sendReplyMutation.isPending}
                              >
                                <Send className="h-3 w-3 mr-1" />
                                Send Reply
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setReplyToMessageId(null);
                                  setReplyText("");
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setReplyToMessageId(msg.id)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Reply className="h-3 w-3 mr-1" />
                            Reply
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
                <p className="text-gray-600">Send your first message to get help from your teacher.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}