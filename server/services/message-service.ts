import { DatabaseStorage } from "../database-storage";
import { WebSocketManager } from "../websocket";
import { z } from "zod";

export interface MessageData {
  id: number;
  senderId: number;
  receiverId: number;
  senderType: "student" | "teacher";
  receiverType: "student" | "teacher";
  subject: string;
  content: string;
  isRead: boolean;
  createdAt: Date;
  senderName: string;
  receiverName: string;
}

export interface MessageThreadData {
  originalMessage: MessageData;
  replies: Array<{
    id: number;
    senderId: number;
    senderType: "student" | "teacher";
    content: string;
    isRead: boolean;
    createdAt: Date;
    senderName: string;
  }>;
}

const messageSchema = z.object({
  receiverId: z.number(),
  receiverType: z.enum(["student", "teacher"]),
  subject: z.string().min(1).max(200),
  content: z.string().min(1).max(2000),
});

const replySchema = z.object({
  messageId: z.number(),
  content: z.string().min(1).max(2000),
});

export class MessageService {
  private storage: DatabaseStorage;
  private wsManager: WebSocketManager;
  private messageCache: Map<number, MessageData[]> = new Map();
  private readonly CACHE_DURATION = 2 * 60 * 1000; // 2 minutes cache

  constructor(storage: DatabaseStorage, wsManager: WebSocketManager) {
    this.storage = storage;
    this.wsManager = wsManager;
    
    // Clean expired cache entries every minute
    setInterval(() => {
      this.cleanExpiredCache();
    }, 60000);
  }

  private cleanExpiredCache(): void {
    // Simple cache cleanup - in production, use Redis or similar
    this.messageCache.clear();
  }

  async sendMessage(
    senderId: number,
    senderType: "student" | "teacher",
    messageData: z.infer<typeof messageSchema>
  ): Promise<{ success: boolean; messageId?: number; error?: string }> {
    try {
      // Validate input
      const validatedData = messageSchema.parse(messageData);
      
      // Get sender and receiver details
      const sender = senderType === "student" 
        ? await this.storage.getStudent(senderId)
        : await this.storage.getUser(senderId);
      
      if (!sender) {
        return { success: false, error: "Sender not found" };
      }

      const receiver = validatedData.receiverType === "student"
        ? await this.storage.getStudent(validatedData.receiverId)
        : await this.storage.getUser(validatedData.receiverId);

      if (!receiver) {
        return { success: false, error: "Receiver not found" };
      }

      // Create message in database
      const message = await this.storage.createMessage({
        senderId,
        receiverId: validatedData.receiverId,
        senderType,
        receiverType: validatedData.receiverType,
        subject: validatedData.subject,
        content: validatedData.content,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Clear cache for receiver
      this.messageCache.delete(validatedData.receiverId);

      // Send real-time notification via WebSocket
      this.wsManager.notifyUser(validatedData.receiverId, {
        type: "new_message",
        data: {
          messageId: message.id,
          senderName: sender.name,
          senderType,
          subject: validatedData.subject,
          preview: validatedData.content.substring(0, 100) + "..."
        }
      });

      return { success: true, messageId: message.id };
      
    } catch (error) {
      console.error("Failed to send message:", error);
      return { success: false, error: "Failed to send message" };
    }
  }

  async getMessages(
    userId: number,
    userType: "student" | "teacher",
    page: number = 1,
    limit: number = 20
  ): Promise<MessageData[]> {
    try {
      // Check cache first
      const cacheKey = userId;
      const cached = this.messageCache.get(cacheKey);
      
      if (cached && cached.length > 0) {
        return cached.slice((page - 1) * limit, page * limit);
      }

      // Get messages from database
      const messages = await this.storage.getMessages(userId, userType);
      
      // Cache the results
      this.messageCache.set(cacheKey, messages);
      
      return messages.slice((page - 1) * limit, page * limit);
      
    } catch (error) {
      console.error("Failed to get messages:", error);
      return [];
    }
  }

  async getMessageThread(messageId: number): Promise<MessageThreadData | null> {
    try {
      const message = await this.storage.getMessage(messageId);
      if (!message) return null;

      const replies = await this.storage.getMessageReplies(messageId);
      
      return {
        originalMessage: message,
        replies
      };
      
    } catch (error) {
      console.error("Failed to get message thread:", error);
      return null;
    }
  }

  async replyToMessage(
    senderId: number,
    senderType: "student" | "teacher",
    replyData: z.infer<typeof replySchema>
  ): Promise<{ success: boolean; replyId?: number; error?: string }> {
    try {
      const validatedData = replySchema.parse(replyData);
      
      // Get original message
      const originalMessage = await this.storage.getMessage(validatedData.messageId);
      if (!originalMessage) {
        return { success: false, error: "Original message not found" };
      }

      // Create reply
      const reply = await this.storage.createMessageReply({
        messageId: validatedData.messageId,
        senderId,
        senderType,
        reply: validatedData.content,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Clear cache for both sender and receiver
      this.messageCache.delete(originalMessage.senderId);
      this.messageCache.delete(originalMessage.receiverId);

      // Notify the other party via WebSocket
      const receiverId = originalMessage.senderId === senderId 
        ? originalMessage.receiverId 
        : originalMessage.senderId;
      
      const sender = senderType === "student"
        ? await this.storage.getStudent(senderId)
        : await this.storage.getUser(senderId);

      if (sender) {
        this.wsManager.notifyUser(receiverId, {
          type: "message_reply",
          data: {
            messageId: validatedData.messageId,
            replyId: reply.id,
            senderName: sender.name,
            senderType,
            preview: validatedData.content.substring(0, 100) + "..."
          }
        });
      }

      return { success: true, replyId: reply.id };
      
    } catch (error) {
      console.error("Failed to reply to message:", error);
      return { success: false, error: "Failed to send reply" };
    }
  }

  async markAsRead(messageId: number, userId: number): Promise<boolean> {
    try {
      await this.storage.markMessageAsRead(messageId, userId);
      
      // Clear cache to force refresh
      this.messageCache.delete(userId);
      
      return true;
    } catch (error) {
      console.error("Failed to mark message as read:", error);
      return false;
    }
  }

  async getUnreadCount(userId: number, userType: "student" | "teacher"): Promise<number> {
    try {
      return await this.storage.getUnreadMessageCount(userId, userType);
    } catch (error) {
      console.error("Failed to get unread count:", error);
      return 0;
    }
  }

  async getBulkMessageStats(): Promise<{
    totalMessages: number;
    activeConversations: number;
    messagesLastHour: number;
    averageResponseTime: number;
  }> {
    try {
      return await this.storage.getMessageStats();
    } catch (error) {
      console.error("Failed to get message stats:", error);
      return {
        totalMessages: 0,
        activeConversations: 0,
        messagesLastHour: 0,
        averageResponseTime: 0
      };
    }
  }
}