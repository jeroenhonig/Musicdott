import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Plus, User, Calendar, Reply, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import AppLayout from "@/components/layouts/app-layout";
import { format } from "date-fns";

interface Message {
  id: number;
  sender_type: string;
  sender_id: number;
  recipient_type: string;
  recipient_id: number;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
  sender_name: string;
  recipient_name: string;
}

interface User {
  id: number;
  name: string;
  role: string;
  username: string;
}

export default function MessagingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isComposeDialogOpen, setIsComposeDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  
  // Compose form state
  const [recipientId, setRecipientId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [messageText, setMessageText] = useState("");

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
    enabled: !!user
  });

  // Fetch available users for messaging
  const { data: availableUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: !!user && isComposeDialogOpen
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ recipientId, subject, message }: { recipientId: number; subject: string; message: string }) => {
      return apiRequest("POST", "/api/messages", { recipientId, subject, message });
    },
    onSuccess: () => {
      setSubject("");
      setMessageText("");
      setRecipientId("");
      setIsComposeDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully.",
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

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return apiRequest("PATCH", `/api/messages/${messageId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
  });

  // Handle viewing a message
  const handleViewMessage = (message: Message) => {
    setSelectedMessage(message);
    setIsViewDialogOpen(true);
    
    // Mark as read if user is the recipient
    if (message.recipient_id === user?.id && !message.is_read) {
      markAsReadMutation.mutate(message.id);
    }
  };

  // Handle compose message
  const handleSendMessage = () => {
    if (!recipientId || !subject.trim() || !messageText.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    sendMessageMutation.mutate({
      recipientId: parseInt(recipientId),
      subject: subject.trim(),
      message: messageText.trim()
    });
  };

  // Separate messages by type
  const inboxMessages = messages.filter(m => m.recipient_id === user?.id);
  const sentMessages = messages.filter(m => m.sender_id === user?.id);
  const unreadCount = inboxMessages.filter(m => !m.is_read).length;

  if (isLoading) {
    return (
      <AppLayout title="Messages">
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
      </AppLayout>
    );
  }

  // Filter users for messaging (exclude self)
  const messagingUsers = availableUsers.filter(u => u.id !== user?.id);

  return (
    <AppLayout title="Messages">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Messages</h1>
            <p className="text-muted-foreground">
              Communicate with teachers and students
              {unreadCount > 0 && (
                <Badge className="ml-2" variant="destructive">
                  {unreadCount} unread
                </Badge>
              )}
            </p>
          </div>
          <Dialog open={isComposeDialogOpen} onOpenChange={setIsComposeDialogOpen}>
            <DialogTrigger asChild>
              <Button className="apple-button">
                <Plus className="h-4 w-4 mr-2" />
                Compose Message
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Compose New Message</DialogTitle>
                <DialogDescription>
                  Send a message to a teacher or student.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="recipient">Recipient</Label>
                  <Select value={recipientId} onValueChange={setRecipientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select recipient" />
                    </SelectTrigger>
                    <SelectContent>
                      {messagingUsers.map((availableUser) => (
                        <SelectItem key={availableUser.id} value={availableUser.id.toString()}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>{availableUser.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {availableUser.role}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input 
                    id="subject" 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter message subject" 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea 
                    id="message" 
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type your message here..."
                    className="min-h-[120px]"
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  variant="outline"
                  onClick={() => setIsComposeDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSendMessage}
                  disabled={sendMessageMutation.isPending}
                  className="apple-button"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Messages Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Inbox */}
          <Card className="apple-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Inbox
                {unreadCount > 0 && (
                  <Badge variant="destructive">{unreadCount}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Messages received from others
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {inboxMessages.length > 0 ? (
                  inboxMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:apple-card ${
                        !message.is_read ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleViewMessage(message)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${!message.is_read ? 'font-bold' : ''}`}>
                              {message.sender_name}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {message.sender_type}
                            </Badge>
                            {!message.is_read && (
                              <Badge variant="destructive" className="text-xs">New</Badge>
                            )}
                          </div>
                          <p className={`text-sm mt-1 ${!message.is_read ? 'font-semibold' : 'text-gray-600'}`}>
                            {message.subject}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {message.message}
                          </p>
                        </div>
                        <div className="text-xs text-gray-400 ml-2">
                          {format(new Date(message.created_at), "MMM d, h:mm a")}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <MessageCircle className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p>No messages in your inbox</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sent Messages */}
          <Card className="apple-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Sent Messages
              </CardTitle>
              <CardDescription>
                Messages you have sent to others
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sentMessages.length > 0 ? (
                  sentMessages.map((message) => (
                    <div
                      key={message.id}
                      className="p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:apple-card hover:bg-gray-50"
                      onClick={() => handleViewMessage(message)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">To: {message.recipient_name}</span>
                            <Badge variant="outline" className="text-xs">
                              {message.recipient_type}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {message.subject}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {message.message}
                          </p>
                        </div>
                        <div className="text-xs text-gray-400 ml-2">
                          {format(new Date(message.created_at), "MMM d, h:mm a")}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Send className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p>No sent messages</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Message View Dialog */}
      {selectedMessage && (
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                {selectedMessage.subject}
              </DialogTitle>
              <DialogDescription>
                <div className="flex items-center gap-4 text-sm">
                  <span>
                    <strong>From:</strong> {selectedMessage.sender_name} ({selectedMessage.sender_type})
                  </span>
                  <span>
                    <strong>To:</strong> {selectedMessage.recipient_name} ({selectedMessage.recipient_type})
                  </span>
                  <span>
                    <strong>Date:</strong> {format(new Date(selectedMessage.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                </div>
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="whitespace-pre-wrap">{selectedMessage.message}</p>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline"
                onClick={() => setIsViewDialogOpen(false)}
              >
                Close
              </Button>
              {selectedMessage.recipient_id === user?.id && (
                <Button 
                  onClick={() => {
                    setRecipientId(selectedMessage.sender_id.toString());
                    setSubject(`Re: ${selectedMessage.subject}`);
                    setIsViewDialogOpen(false);
                    setIsComposeDialogOpen(true);
                  }}
                  className="apple-button"
                >
                  <Reply className="h-4 w-4 mr-2" />
                  Reply
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
}