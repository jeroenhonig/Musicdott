import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import Layout from "@/components/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageCircle, Reply, Clock, User, CheckCircle2, Plus, Send } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface MessageReply {
  id: number;
  messageId: number;
  senderId: number;
  senderType: "student" | "teacher";
  reply: string;
  isRead: boolean;
  createdAt: string;
}

interface StudentMessage {
  id: number;
  studentId: number;
  studentName: string;
  subject: string;
  message: string;
  createdAt: string;
  response?: string;
  respondedAt?: string;
  isRead: boolean;
  replies?: MessageReply[];
}

export default function MessagesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedMessage, setSelectedMessage] = useState<StudentMessage | null>(null);
  const [response, setResponse] = useState("");
  
  // Compose message state
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [recipientType, setRecipientType] = useState<"student" | "teacher">("student");
  const [selectedRecipient, setSelectedRecipient] = useState("");
  const [messageSubject, setMessageSubject] = useState("");
  const [messageContent, setMessageContent] = useState("");

  // Get messages from API
  const { data: messages = [], isLoading } = useQuery<StudentMessage[]>({
    queryKey: ["/api/teacher/messages"],
  });

  // Get students and teachers for compose functionality
  const { data: students = [] } = useQuery({
    queryKey: ["/api/students"],
    enabled: isComposeOpen && recipientType === "student"
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ["/api/teachers"],
    enabled: isComposeOpen && recipientType === "teacher"
  });

  const respondMutation = useMutation({
    mutationFn: async ({ messageId, response }: { messageId: number; response: string }) => {
      return await apiRequest("PATCH", `/api/teacher/respond-message/${messageId}`, {
        response
      });
    },
    onSuccess: () => {
      toast({
        title: "Response sent",
        description: "Your response has been sent to the student."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/messages"] });
      setSelectedMessage(null);
      setResponse("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send response. Please try again.",
        variant: "destructive"
      });
    }
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return await apiRequest("PATCH", `/api/teacher/mark-message-read/${messageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/messages"] });
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ recipientType, recipientId, subject, message }: { 
      recipientType: "student" | "teacher", 
      recipientId: string, 
      subject: string, 
      message: string 
    }) => {
      return await apiRequest("POST", "/api/teacher/send-message", {
        recipientType,
        recipientId: parseInt(recipientId),
        subject,
        message
      });
    },
    onSuccess: () => {
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/messages"] });
      setIsComposeOpen(false);
      setSelectedRecipient("");
      setMessageSubject("");
      setMessageContent("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleSendResponse = () => {
    if (!selectedMessage || !response.trim()) return;
    
    console.log("Sending response to message:", selectedMessage.id);
    respondMutation.mutate({
      messageId: selectedMessage.id,
      response: response.trim()
    }, {
      onSuccess: () => {
        console.log("Response sent successfully");
        setResponse("");
        setSelectedMessage(null);
      },
      onError: (error) => {
        console.error("Error sending response:", error);
      }
    });
  };

  const handleMarkAsRead = (message: StudentMessage) => {
    if (!message.isRead) {
      markAsReadMutation.mutate(message.id);
    }
  };

  const handleSelectMessage = (message: StudentMessage) => {
    console.log("Selecting message:", message);
    setSelectedMessage(message);
    handleMarkAsRead(message);
  };

  const handleSendMessage = () => {
    if (!selectedRecipient || !messageSubject.trim() || !messageContent.trim()) return;
    
    sendMessageMutation.mutate({
      recipientType,
      recipientId: selectedRecipient,
      subject: messageSubject.trim(),
      message: messageContent.trim()
    });
  };

  const resetComposeForm = () => {
    setSelectedRecipient("");
    setMessageSubject("");
    setMessageContent("");
    setRecipientType("student");
  };

  if (isLoading) {
    return (
      <Layout title="Student Messages">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Separate messages by status
  const unreadMessages = Array.isArray(messages) ? messages.filter(m => !m.isRead) : [];
  const pendingMessages = Array.isArray(messages) ? messages.filter(m => m.isRead && !m.response) : [];
  const answeredMessages = Array.isArray(messages) ? messages.filter(m => m.response) : [];

  return (
    <Layout title="Student Messages">
      <div className="p-6">
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Student Messages</h1>
            <p className="text-gray-600">View and respond to questions from your students</p>
          </div>
          
          <Dialog open={isComposeOpen} onOpenChange={(open) => {
            setIsComposeOpen(open);
            if (!open) resetComposeForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Compose Message
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Send New Message</DialogTitle>
                <DialogDescription>
                  Send a message to a student or teacher
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="recipient-type">Send to</Label>
                  <Select value={recipientType} onValueChange={(value: "student" | "teacher") => {
                    setRecipientType(value);
                    setSelectedRecipient("");
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select recipient type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipient">
                    {recipientType === "student" ? "Select Student" : "Select Teacher"}
                  </Label>
                  <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                    <SelectTrigger>
                      <SelectValue placeholder={`Choose a ${recipientType}...`} />
                    </SelectTrigger>
                    <SelectContent>
                      {recipientType === "student" 
                        ? (students as any[]).map((student: any) => (
                            <SelectItem key={student.id} value={student.id.toString()}>
                              {student.name}
                            </SelectItem>
                          ))
                        : (teachers as any[]).map((teacher: any) => (
                            <SelectItem key={teacher.id} value={teacher.id.toString()}>
                              {teacher.name || teacher.username}
                            </SelectItem>
                          ))
                      }
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="Enter message subject..."
                    value={messageSubject}
                    onChange={(e) => setMessageSubject(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Type your message here..."
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsComposeOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSendMessage}
                  disabled={!selectedRecipient || !messageSubject.trim() || !messageContent.trim() || sendMessageMutation.isPending}
                >
                  {sendMessageMutation.isPending ? (
                    <>Sending...</>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">All ({Array.isArray(messages) ? messages.length : 0})</TabsTrigger>
            <TabsTrigger value="pending">Pending Response ({pendingMessages.length})</TabsTrigger>
            <TabsTrigger value="answered">Answered ({answeredMessages.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {!Array.isArray(messages) || messages.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
                  <p className="text-gray-500">
                    When students send you messages, they'll appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <MessageCard
                    key={message.id}
                    message={message}
                    onSelect={() => handleSelectMessage(message)}
                    onRespond={() => handleSelectMessage(message)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            {pendingMessages.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
                  <p className="text-gray-500">
                    No messages waiting for your response.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingMessages.map((message) => (
                  <MessageCard
                    key={message.id}
                    message={message}
                    onSelect={() => handleSelectMessage(message)}
                    onRespond={() => handleSelectMessage(message)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="answered" className="space-y-4">
            {answeredMessages.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No answered messages</h3>
                  <p className="text-gray-500">
                    Messages you've responded to will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {answeredMessages.map((message) => (
                  <MessageCard
                    key={message.id}
                    message={message}
                    onSelect={() => setSelectedMessage(message)}
                    onRespond={() => setSelectedMessage(message)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Message Detail Modal/Panel */}
        {selectedMessage && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedMessage(null);
              }
            }}
          >
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {selectedMessage?.studentName || "Unknown Student"}
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">{selectedMessage?.subject || "No Subject"}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedMessage(null)}
                  >
                    ×
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <Clock className="h-4 w-4" />
                    {selectedMessage?.createdAt ? format(new Date(selectedMessage.createdAt), "PPp") : "Unknown date"}
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-900">{selectedMessage?.message || "No message content"}</p>
                  </div>
                </div>

                {/* Conversation Thread */}
                {selectedMessage?.response && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Your Response</h4>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                      <Clock className="h-4 w-4" />
                      {selectedMessage.respondedAt ? format(new Date(selectedMessage.respondedAt), "PPp") : "No response date"}
                    </div>
                    <div className="liquid-card bg-blue-50 border-l-4 border-blue-500">
                      <p className="text-gray-900">{selectedMessage.response}</p>
                    </div>
                  </div>
                )}

                {/* Student Replies */}
                {selectedMessage?.replies && selectedMessage.replies.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">Student Replies</h4>
                    <div className="space-y-3">
                      {selectedMessage.replies.map((reply) => (
                        <div key={reply.id} className="liquid-card bg-yellow-50 border-l-4 border-yellow-500">
                          <div className="flex items-center gap-2 text-sm text-yellow-600 mb-2">
                            <User className="h-4 w-4" />
                            <span className="font-medium">{selectedMessage.studentName}</span>
                            <Clock className="h-4 w-4 ml-auto" />
                            <span>{format(new Date(reply.createdAt), "MMM d, h:mm a")}</span>
                          </div>
                          <p className="text-gray-900">{reply.reply}</p>
                          {!reply.isRead && (
                            <div className="mt-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                New
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!selectedMessage?.response && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Send Response</h4>
                    <Textarea
                      placeholder="Type your response to the student..."
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      className="min-h-[120px] mb-4"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setSelectedMessage(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSendResponse}
                        disabled={!response.trim() || respondMutation.isPending}
                      >
                        <Reply className="h-4 w-4 mr-2" />
                        {respondMutation.isPending ? "Sending..." : "Send Response"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}

interface MessageCardProps {
  message: StudentMessage;
  onSelect: () => void;
  onRespond: () => void;
}

function MessageCard({ message, onSelect, onRespond }: MessageCardProps) {
  return (
    <Card className={`cursor-pointer transition-colors ${!message.isRead ? 'border-blue-200 bg-blue-50' : 'hover:bg-gray-50'}`} onClick={onSelect}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-gray-900">{message.studentName}</span>
              {!message.isRead && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">New</Badge>
              )}
              {message.response && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">Answered</Badge>
              )}
            </div>
            <h3 className="font-medium text-gray-900 mb-2">{message.subject}</h3>
            <p className="text-gray-600 text-sm line-clamp-2">{message.message}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {message.createdAt ? format(new Date(message.createdAt), "MMM d, yyyy 'at' h:mm a") : "Unknown date"}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2 ml-4">
            {!message.response && (
              <Button size="sm" onClick={(e) => { e.stopPropagation(); onRespond(); }}>
                <Reply className="h-3 w-3 mr-1" />
                Respond
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}