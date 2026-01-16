import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { IStorage } from './storage';
import { parse } from 'url';

interface Client {
  ws: WebSocket;
  userId?: number;
  username?: string;
  role?: string; // teacher or student
  studentId?: number;
  isAlive: boolean;
}

interface Message {
  type: string;
  data: any;
}

export class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<WebSocket, Client> = new Map();
  private storage: IStorage;
  
  constructor(server: Server, storage: IStorage) {
    // Initialize WebSocket server on a specific path to avoid conflicts with Vite HMR
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });
    
    this.storage = storage;
    this.init();
    
    // Keep track of active clients and perform periodic cleanup
    setInterval(() => {
      this.clients.forEach((client, ws) => {
        if (!client.isAlive) {
          this.clients.delete(ws);
          return ws.terminate();
        }
        
        client.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }
  
  private init() {
    this.wss.on('connection', (ws, req) => {
      const client: Client = {
        ws,
        isAlive: true
      };
      
      this.clients.set(ws, client);
      
      // Parse query parameters for authentication
      const { query } = parse(req.url || '', true);
      if (query.userId && query.username && query.role) {
        client.userId = parseInt(query.userId as string);
        client.username = query.username as string;
        client.role = query.role as string;
        
        if (query.studentId) {
          client.studentId = parseInt(query.studentId as string);
        }
        
        // Notify about connection
        console.log(`WebSocket client connected: ${client.username} (${client.role})`);
        
        // Broadcast teacher online status to students
        if (client.role === 'teacher') {
          this.broadcastTeacherStatus(client.userId, true);
        }
      } else {
        console.log('Unauthenticated WebSocket connection attempt');
      }
      
      ws.on('pong', () => {
        const client = this.clients.get(ws);
        if (client) {
          client.isAlive = true;
        }
      });
      
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString()) as Message;
          await this.handleMessage(message, client);
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
        }
      });
      
      ws.on('close', () => {
        const client = this.clients.get(ws);
        if (client && client.role === 'teacher' && client.userId) {
          this.broadcastTeacherStatus(client.userId, false);
        }
        this.clients.delete(ws);
        console.log('WebSocket client disconnected');
      });
      
      // Send initial connected confirmation
      this.sendToClient(client, {
        type: 'connection_established',
        data: {
          message: 'Connected to musicdott server',
          timestamp: new Date().toISOString()
        }
      });
    });
  }
  
  private async handleMessage(message: Message, sender: Client) {
    switch (message.type) {
      case 'practice_start':
        if (sender.role === 'student' && sender.studentId && sender.userId) {
          // Create a new practice session
          const practiceSession = await this.storage.createPracticeSession({
            studentId: sender.studentId,
            startTime: new Date(),
            isActive: true,
            assignmentId: message.data.assignmentId
          });
          
          // Notify teachers that student is practicing
          this.notifyTeachers({
            type: 'student_practicing',
            data: {
              practiceSessionId: practiceSession.id,
              studentId: sender.studentId,
              studentName: message.data.studentName,
              startTime: practiceSession.startTime,
              assignmentId: message.data.assignmentId,
              assignmentTitle: message.data.assignmentTitle
            }
          });
          
          // Confirm to student
          this.sendToClient(sender, {
            type: 'practice_started',
            data: {
              practiceSessionId: practiceSession.id,
              startTime: practiceSession.startTime
            }
          });
        }
        break;
        
      case 'practice_end':
        if (sender.role === 'student' && sender.studentId && message.data.practiceSessionId) {
          // End the practice session
          const updatedSession = await this.storage.endPracticeSession(message.data.practiceSessionId);
          
          // Notify teachers
          this.notifyTeachers({
            type: 'student_practice_ended',
            data: {
              practiceSessionId: updatedSession.id,
              studentId: sender.studentId,
              studentName: message.data.studentName,
              startTime: updatedSession.startTime,
              endTime: updatedSession.endTime,
              duration: message.data.duration
            }
          });
        }
        break;
        
      case 'chat_message':
        if (message.data.recipientId) {
          // Private message to a specific teacher or student
          this.routeChatMessage(sender, message.data);
        }
        break;
        
      default:
        console.log(`Unknown message type: ${message.type}`);
    }
  }
  
  private broadcastTeacherStatus(teacherId: number, isOnline: boolean) {
    // Notify students about teacher online status
    const statusMessage = {
      type: 'teacher_status',
      data: {
        teacherId,
        isOnline,
        timestamp: new Date().toISOString()
      }
    };
    
    this.clients.forEach((client) => {
      if (client.role === 'student') {
        this.sendToClient(client, statusMessage);
      }
    });
  }
  
  private notifyTeachers(message: any) {
    this.clients.forEach((client) => {
      if (client.role === 'teacher') {
        this.sendToClient(client, message);
      }
    });
  }
  
  private routeChatMessage(sender: Client, messageData: any) {
    const { recipientId, recipientRole, message, timestamp } = messageData;
    
    // Find the recipient
    let recipientFound = false;
    
    this.clients.forEach((client) => {
      if (
        (recipientRole === 'teacher' && client.role === 'teacher' && client.userId === recipientId) ||
        (recipientRole === 'student' && client.role === 'student' && client.studentId === recipientId)
      ) {
        // Send the message to the recipient
        this.sendToClient(client, {
          type: 'chat_message',
          data: {
            senderId: sender.role === 'teacher' ? sender.userId : sender.studentId,
            senderName: sender.username,
            senderRole: sender.role,
            message,
            timestamp: timestamp || new Date().toISOString()
          }
        });
        recipientFound = true;
      }
    });
    
    // Notify sender about delivery status
    this.sendToClient(sender, {
      type: 'message_status',
      data: {
        recipientId,
        delivered: recipientFound,
        message: recipientFound ? 'Message delivered' : 'Recipient offline',
        timestamp: new Date().toISOString()
      }
    });
  }
  
  private sendToClient(client: Client, message: any) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }
  
  // Public methods
  
  // Send a notification to a specific user
  public sendNotification(userId: number, notification: any) {
    this.clients.forEach((client) => {
      if ((client.role === 'teacher' && client.userId === userId) || 
          (client.role === 'student' && client.userId === userId)) {
        this.sendToClient(client, {
          type: 'notification',
          data: notification
        });
      }
    });
  }
  
  // Send a session reschedule request notification
  public sendRescheduleRequest(studentId: number, sessionData: any) {
    this.clients.forEach((client) => {
      if (client.role === 'student' && client.studentId === studentId) {
        this.sendToClient(client, {
          type: 'reschedule_request',
          data: sessionData
        });
      }
    });
  }
  
  // Check if a teacher is online
  public isTeacherOnline(teacherId: number): boolean {
    let online = false;
    this.clients.forEach((client) => {
      if (client.role === 'teacher' && client.userId === teacherId) {
        online = true;
      }
    });
    return online;
  }
  
  // Get count of online students for a teacher
  public getOnlineStudentsForTeacher(teacherId: number): number {
    let count = 0;
    this.clients.forEach((client) => {
      if (client.role === 'student' && client.userId === teacherId) {
        count++;
      }
    });
    return count;
  }
  
  // Notify a specific user - alias for sendNotification for backward compatibility
  public notifyUser(userId: number, data: any): void {
    this.sendNotification(userId, data);
  }
}