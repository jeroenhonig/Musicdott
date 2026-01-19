/**
 * RealtimeBus - Comprehensive Real-time Event System with Socket.IO
 * 
 * Provides multi-tenant, school-scoped real-time communication for MusicDott
 * Consolidates all WebSocket functionality with proper authentication and authorization
 */

import { Server as SocketIOServer, Socket } from "socket.io";
import type { Server as HTTPServer } from "http";
import { parse } from "url";
import { storage } from "../storage-wrapper";
import passport from "passport";
import { IStorage } from "../storage";
import {
  EVENT_TYPES,
  validateRealtimeEvent,
  createRealtimeEvent,
  type RealtimeEvent
} from "@shared/events";
import type { RequestHandler } from "express";

// Interface for authenticated socket clients
interface AuthenticatedSocket extends Socket {
  user?: {
    id: number;
    username: string;
    role: string;
    schoolId?: number;
  };
  school?: {
    id: number;
    role: string;
    memberships: Array<{schoolId: number, role: string}>;
    canAccessSchool: (schoolId: number) => boolean;
  };
}

// Using standardized RealtimeEvent interface from shared/events.ts

// Interface for connected client tracking
interface ClientInfo {
  socket: AuthenticatedSocket;
  userId: number;
  username: string;
  role: string;
  schoolId?: number;
  studentId?: number;
  isAlive: boolean;
  connectedAt: Date;
}

export class RealtimeBus {
  private io: SocketIOServer;
  private clients: Map<string, ClientInfo> = new Map();
  private storage: IStorage;
  private eventHandlers = new Map<string, Function[]>();
  private sessionMiddlewareConfigured = false;

  constructor(server: HTTPServer, storage: IStorage) {
    this.storage = storage;

    // Initialize Socket.IO server with proper CORS and path configuration
    this.io = new SocketIOServer(server, {
      path: "/ws",
      cors: {
        origin: process.env.NODE_ENV === 'production' ? ['https://musicdott.app'] : true,
        credentials: true
      },
      transports: ['websocket', 'polling'],
      allowEIO3: true
    });

    // Setup periodic health checks for connected clients
    this.setupHealthChecks();

    console.log('🚀 RealtimeBus initialized - waiting for session middleware configuration');
  }

  /**
   * Configure session middleware for Socket.IO authentication
   * Must be called after Express session middleware is set up
   */
  public configureSessionMiddleware(sessionMiddleware: RequestHandler): void {
    if (this.sessionMiddlewareConfigured) {
      console.log('⚠️ Session middleware already configured for Socket.IO');
      return;
    }

    // Wrap Express session middleware for Socket.IO
    this.io.use((socket, next) => {
      sessionMiddleware(socket.request as any, {} as any, next as any);
    });

    // Wrap passport middleware for Socket.IO
    this.io.use((socket, next) => {
      passport.initialize()(socket.request as any, {} as any, () => {
        passport.session()(socket.request as any, {} as any, next as any);
      });
    });

    // Now set up connection handlers (after middleware is configured)
    this.setupConnectionHandlers();

    this.sessionMiddlewareConfigured = true;
    console.log('✅ Socket.IO session middleware configured successfully');
  }

  /**
   * Setup Socket.IO connection handlers with authentication and room management
   */
  private setupConnectionHandlers() {
    this.io.on('connection', async (socket: AuthenticatedSocket) => {
      try {
        // Authenticate the connection using session data
        const isAuthenticated = await this.authenticateSocket(socket);
        
        if (!isAuthenticated) {
          console.log('❌ Unauthenticated WebSocket connection attempt');
          socket.emit('auth_error', { message: 'Authentication required' });
          socket.disconnect();
          return;
        }

        console.log(`🔌 WebSocket client connected: ${socket.user!.username} (${socket.user!.role}) from school ${socket.user!.schoolId}`);
        
        // Register client and setup rooms
        await this.registerClient(socket);
        
        // Setup message handlers
        this.setupMessageHandlers(socket);
        
        // Setup disconnect handler
        this.setupDisconnectHandler(socket);
        
        // Send connection confirmation
        socket.emit('connection_established', {
          type: 'connection_established',
          data: {
            message: 'Connected to MusicDott real-time server',
            timestamp: new Date().toISOString(),
            user: {
              id: socket.user!.id,
              username: socket.user!.username,
              role: socket.user!.role,
              schoolId: socket.user!.schoolId
            }
          }
        });

        // Broadcast teacher online status if applicable
        if (socket.user!.role === 'teacher' && socket.user!.schoolId) {
          this.broadcastTeacherStatus(socket.user!.id, socket.user!.schoolId, true);
        }

      } catch (error) {
        console.error('Error handling WebSocket connection:', error);
        socket.disconnect();
      }
    });
  }

  /**
   * Authenticate socket connection using session data
   */
  private async authenticateSocket(socket: AuthenticatedSocket): Promise<boolean> {
    try {
      const req = socket.request as any;
      
      // Check if user is authenticated via session
      if (!req.user || !req.user.id) {
        return false;
      }

      // Set user data from session
      socket.user = {
        id: req.user.id,
        username: req.user.username,
        role: req.user.role,
        schoolId: req.user.schoolId
      };

      // Load school context for authorization
      if (socket.user.schoolId) {
        try {
          const memberships = await this.storage.getUserSchoolMemberships(socket.user.id);
          
          socket.school = {
            id: socket.user.schoolId,
            role: this.mapUserRoleToSchoolRole(socket.user.role),
            memberships,
            canAccessSchool: (schoolId: number) => {
              return socket.user!.role === 'platform_owner' || 
                     socket.user!.schoolId === schoolId ||
                     memberships.some(m => m.schoolId === schoolId);
            }
          };
        } catch (error) {
          console.warn('Failed to load school context for socket:', error);
        }
      }

      return true;
    } catch (error) {
      console.error('Socket authentication error:', error);
      return false;
    }
  }

  /**
   * Map user roles to school roles
   */
  private mapUserRoleToSchoolRole(userRole: string): string {
    const roleMapping: Record<string, string> = {
      'platform_owner': 'platform_owner',
      'school_owner': 'owner',
      'teacher': 'teacher',
      'student': 'student'
    };
    return roleMapping[userRole] || 'student';
  }

  /**
   * Register client and join appropriate rooms
   */
  private async registerClient(socket: AuthenticatedSocket) {
    const clientInfo: ClientInfo = {
      socket,
      userId: socket.user!.id,
      username: socket.user!.username,
      role: socket.user!.role,
      schoolId: socket.user!.schoolId,
      isAlive: true,
      connectedAt: new Date()
    };

    // Handle student-specific setup
    if (socket.user!.role === 'student') {
      try {
        // Get student record to find studentId
        const student = await this.storage.getStudentByUserId(socket.user!.id);
        if (student) {
          clientInfo.studentId = student.id;
        }
      } catch (error) {
        console.warn('Failed to get student record for user:', socket.user!.id);
      }
    }

    this.clients.set(socket.id, clientInfo);

    // Join appropriate rooms
    const rooms = this.getSocketRooms(socket);
    for (const room of rooms) {
      await socket.join(room);
      console.log(`📍 User ${socket.user!.username} joined room: ${room}`);
    }
  }

  /**
   * Determine which rooms a socket should join
   */
  private getSocketRooms(socket: AuthenticatedSocket): string[] {
    const rooms: string[] = [];
    
    // Global user room
    rooms.push(`user:${socket.user!.id}`);
    
    // School-based rooms
    if (socket.user!.schoolId) {
      rooms.push(`school:${socket.user!.schoolId}`);
      
      // Role-specific rooms within school
      rooms.push(`school:${socket.user!.schoolId}:${socket.user!.role}`);
      
      // Teacher/Student specific rooms
      if (socket.user!.role === 'teacher') {
        rooms.push(`teacher:${socket.user!.id}`);
      } else if (socket.user!.role === 'student') {
        rooms.push(`student:${socket.user!.id}`);
      }
    }

    return rooms;
  }

  /**
   * Setup message handlers for various event types
   */
  private setupMessageHandlers(socket: AuthenticatedSocket) {
    // Practice session events (using standardized dotted format)
    socket.on(EVENT_TYPES.PRACTICE_START, async (data) => {
      await this.handlePracticeStart(socket, data);
    });

    socket.on(EVENT_TYPES.PRACTICE_END, async (data) => {
      await this.handlePracticeEnd(socket, data);
    });

    // Student-specific lesson interaction events
    socket.on(EVENT_TYPES.LESSON_START, async (data) => {
      await this.handleLessonStart(socket, data);
    });

    socket.on(EVENT_TYPES.LESSON_PROGRESS, async (data) => {
      await this.handleLessonProgress(socket, data);
    });

    socket.on(EVENT_TYPES.LESSON_COMPLETE, async (data) => {
      await this.handleLessonComplete(socket, data);
    });

    // Student-specific song interaction events
    socket.on(EVENT_TYPES.SONG_PRACTICE, async (data) => {
      await this.handleSongPractice(socket, data);
    });

    socket.on(EVENT_TYPES.SONG_FAVORITE, async (data) => {
      await this.handleSongFavorite(socket, data);
    });

    socket.on(EVENT_TYPES.SONG_PROGRESS, async (data) => {
      await this.handleSongProgress(socket, data);
    });

    // Student activity events
    socket.on(EVENT_TYPES.STUDENT_ONLINE, async (data) => {
      await this.handleStudentActive(socket, data);
    });

    socket.on(EVENT_TYPES.STUDENT_OFFLINE, async (data) => {
      await this.handleStudentIdle(socket, data);
    });

    // Chat message events
    socket.on(EVENT_TYPES.CHAT_MESSAGE, async (data) => {
      await this.handleChatMessage(socket, data);
    });

    // Message events (comprehensive messaging system)
    socket.on(EVENT_TYPES.MESSAGE_SEND, async (data) => {
      await this.handleMessageSend(socket, data);
    });

    socket.on(EVENT_TYPES.MESSAGE_RECEIVE, async (data) => {
      await this.handleMessageReceive(socket, data);
    });

    socket.on(EVENT_TYPES.MESSAGE_READ, async (data) => {
      await this.handleMessageRead(socket, data);
    });

    socket.on(EVENT_TYPES.MESSAGE_REPLY, async (data) => {
      await this.handleMessageReply(socket, data);
    });

    // Student management events
    socket.on(EVENT_TYPES.STUDENT_CREATE, async (data) => {
      await this.handleStudentCreate(socket, data);
    });

    socket.on(EVENT_TYPES.STUDENT_UPDATE, async (data) => {
      await this.handleStudentUpdate(socket, data);
    });

    socket.on(EVENT_TYPES.STUDENT_DELETE, async (data) => {
      await this.handleStudentDelete(socket, data);
    });

    socket.on(EVENT_TYPES.STUDENT_ASSIGN, async (data) => {
      await this.handleStudentAssign(socket, data);
    });

    socket.on(EVENT_TYPES.STUDENT_UNASSIGN, async (data) => {
      await this.handleStudentUnassign(socket, data);
    });

    // Session/Schedule management events
    socket.on(EVENT_TYPES.SESSION_CREATE, async (data) => {
      await this.handleSessionCreate(socket, data);
    });

    socket.on(EVENT_TYPES.SESSION_UPDATE, async (data) => {
      await this.handleSessionUpdate(socket, data);
    });

    socket.on(EVENT_TYPES.SESSION_DELETE, async (data) => {
      await this.handleSessionDelete(socket, data);
    });

    socket.on(EVENT_TYPES.SESSION_SCHEDULE, async (data) => {
      await this.handleSessionSchedule(socket, data);
    });

    socket.on(EVENT_TYPES.SESSION_RESCHEDULE, async (data) => {
      await this.handleSessionReschedule(socket, data);
    });

    socket.on(EVENT_TYPES.SESSION_CANCEL, async (data) => {
      await this.handleSessionCancel(socket, data);
    });

    // Recurring schedule events
    socket.on(EVENT_TYPES.RECURRING_SCHEDULE_CREATE, async (data) => {
      await this.handleRecurringScheduleCreate(socket, data);
    });

    socket.on(EVENT_TYPES.RECURRING_SCHEDULE_UPDATE, async (data) => {
      await this.handleRecurringScheduleUpdate(socket, data);
    });

    socket.on(EVENT_TYPES.RECURRING_SCHEDULE_DELETE, async (data) => {
      await this.handleRecurringScheduleDelete(socket, data);
    });

    // Assignment events
    socket.on(EVENT_TYPES.ASSIGNMENT_CREATE, async (data) => {
      await this.handleAssignmentCreate(socket, data);
    });

    socket.on(EVENT_TYPES.ASSIGNMENT_UPDATE, async (data) => {
      await this.handleAssignmentUpdate(socket, data);
    });

    socket.on(EVENT_TYPES.ASSIGNMENT_DELETE, async (data) => {
      await this.handleAssignmentDelete(socket, data);
    });

    // User management events
    socket.on(EVENT_TYPES.USER_ONLINE, async (data) => {
      await this.handleUserOnline(socket, data);
    });

    socket.on(EVENT_TYPES.USER_OFFLINE, async (data) => {
      await this.handleUserOffline(socket, data);
    });

    // Heartbeat/ping events (keep as-is, not part of realtime events)
    socket.on('ping', () => {
      const client = this.clients.get(socket.id);
      if (client) {
        client.isAlive = true;
        socket.emit('pong');
      }
    });

    // Generic event relay with validation
    socket.on('relay_event', async (data) => {
      await this.handleEventRelay(socket, data);
    });
    
    // Enhanced catch-all for unknown events with detailed logging
    socket.onAny((eventName, ...args) => {
      // Skip system events
      if (eventName.startsWith('connect') || eventName === 'ping' || eventName === 'disconnect') {
        return;
      }
      
      const validEventTypes = Object.values(EVENT_TYPES);
      if (!validEventTypes.includes(eventName as any)) {
        console.warn(
          `⚠️ Unknown event from ${socket.user?.username || 'anonymous'} ` +
          `(school: ${socket.user?.schoolId}): ${eventName}. ` +
          `Args: ${JSON.stringify(args.slice(0, 1))}... ` +
          `Valid events include: ${validEventTypes.slice(0, 3).join(', ')}...`
        );
        
        // Send feedback to client about unknown event
        socket.emit('event_warning', {
          message: `Unknown event type: ${eventName}`,
          validTypes: validEventTypes.slice(0, 10) // Send first 10 valid types
        });
      } else {
        // Log valid events for debugging
        console.log(`📬 Valid event: ${eventName} from ${socket.user?.username}`);
      }
    });
  }

  /**
   * Handle practice session start
   */
  private async handlePracticeStart(socket: AuthenticatedSocket, data: any) {
    try {
      if (socket.user!.role !== 'student') {
        socket.emit('error', { message: 'Only students can start practice sessions' });
        return;
      }

      const client = this.clients.get(socket.id);
      if (!client || !client.studentId) {
        socket.emit('error', { message: 'Student record not found' });
        return;
      }

      // Create practice session
      const practiceSession = await this.storage.createPracticeSession({
        studentId: client.studentId,
        startTime: new Date(),
        isActive: true,
        assignmentId: data.assignmentId
      });

      // Emit to teachers in the school
      if (socket.user!.schoolId) {
        this.emitToRoom(`school:${socket.user!.schoolId}:teacher`, {
          type: 'practice.start',
          entity: 'practice',
          action: 'start',
          data: {
            practiceSessionId: practiceSession.id,
            studentId: client.studentId,
            studentName: `${data.studentName || socket.user!.username}`,
            startTime: practiceSession.startTime,
            assignmentId: data.assignmentId,
            assignmentTitle: data.assignmentTitle
          },
          meta: {
            schoolId: socket.user!.schoolId,
            actorId: socket.user!.id,
            timestamp: new Date().toISOString(),
            entityId: practiceSession.id
          }
        });
      }

      // Confirm to student
      socket.emit('practice_started', {
        type: 'practice.started',
        data: {
          practiceSessionId: practiceSession.id,
          startTime: practiceSession.startTime
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error handling practice start:', error);
      socket.emit('error', { message: 'Failed to start practice session' });
    }
  }

  /**
   * Handle practice session end
   */
  private async handlePracticeEnd(socket: AuthenticatedSocket, data: any) {
    try {
      if (socket.user!.role !== 'student' || !data.practiceSessionId) {
        socket.emit('error', { message: 'Invalid practice session end request' });
        return;
      }

      const client = this.clients.get(socket.id);
      if (!client || !client.studentId) {
        socket.emit('error', { message: 'Student record not found' });
        return;
      }

      // End practice session
      const updatedSession = await this.storage.endPracticeSession(data.practiceSessionId);

      // Emit to teachers in the school
      if (socket.user!.schoolId) {
        this.emitToRoom(`school:${socket.user!.schoolId}:teacher`, {
          type: 'practice.end',
          entity: 'practice',
          action: 'end',
          data: {
            practiceSessionId: updatedSession.id,
            studentId: client.studentId,
            studentName: data.studentName || socket.user!.username,
            startTime: updatedSession.startTime,
            endTime: updatedSession.endTime,
            duration: data.duration
          },
          meta: {
            schoolId: socket.user!.schoolId,
            actorId: socket.user!.id,
            timestamp: new Date().toISOString(),
            entityId: updatedSession.id
          }
        });
      }

      socket.emit('practice_ended', {
        type: 'practice.ended',
        data: { practiceSessionId: updatedSession.id },
        meta: { timestamp: new Date().toISOString() }
      });

    } catch (error) {
      console.error('Error handling practice end:', error);
      socket.emit('error', { message: 'Failed to end practice session' });
    }
  }

  /**
   * Handle lesson start event from student
   */
  private async handleLessonStart(socket: AuthenticatedSocket, data: any) {
    try {
      if (socket.user!.role !== 'student') {
        socket.emit('error', { message: 'Only students can start lessons' });
        return;
      }

      const client = this.clients.get(socket.id);
      if (!client || !client.studentId) {
        socket.emit('error', { message: 'Student record not found' });
        return;
      }

      // Broadcast to teachers that student started a lesson
      if (socket.user!.schoolId) {
        this.emitToTeachers(socket.user!.schoolId, {
          type: 'lesson.started',
          entity: 'lesson',
          action: 'start',
          data: {
            studentId: client.studentId,
            studentName: socket.user!.username,
            lessonId: data.lessonId,
            lessonTitle: data.lessonTitle,
            startTime: new Date().toISOString()
          },
          meta: {
            schoolId: socket.user!.schoolId,
            actorId: socket.user!.id,
            timestamp: new Date().toISOString(),
            entityId: data.lessonId
          }
        });
      }

      // Confirm to student
      socket.emit('lesson_started', {
        type: 'lesson.started',
        data: { lessonId: data.lessonId, startTime: new Date().toISOString() }
      });

    } catch (error) {
      console.error('Error handling lesson start:', error);
      socket.emit('error', { message: 'Failed to start lesson' });
    }
  }

  /**
   * Handle lesson progress event from student
   */
  private async handleLessonProgress(socket: AuthenticatedSocket, data: any) {
    try {
      if (socket.user!.role !== 'student') {
        socket.emit('error', { message: 'Only students can update lesson progress' });
        return;
      }

      const client = this.clients.get(socket.id);
      if (!client || !client.studentId) {
        socket.emit('error', { message: 'Student record not found' });
        return;
      }

      // Broadcast progress to teachers
      if (socket.user!.schoolId) {
        this.emitToTeachers(socket.user!.schoolId, {
          type: 'lesson.progress',
          entity: 'lesson',
          action: 'update',
          data: {
            studentId: client.studentId,
            studentName: socket.user!.username,
            lessonId: data.lessonId,
            lessonTitle: data.lessonTitle,
            progress: data.progress,
            currentSection: data.currentSection,
            timeSpent: data.timeSpent
          },
          meta: {
            schoolId: socket.user!.schoolId,
            actorId: socket.user!.id,
            timestamp: new Date().toISOString(),
            entityId: data.lessonId
          }
        });
      }

    } catch (error) {
      console.error('Error handling lesson progress:', error);
      socket.emit('error', { message: 'Failed to update lesson progress' });
    }
  }

  /**
   * Handle lesson completion event from student
   */
  private async handleLessonComplete(socket: AuthenticatedSocket, data: any) {
    try {
      if (socket.user!.role !== 'student') {
        socket.emit('error', { message: 'Only students can complete lessons' });
        return;
      }

      const client = this.clients.get(socket.id);
      if (!client || !client.studentId) {
        socket.emit('error', { message: 'Student record not found' });
        return;
      }

      // Broadcast completion to teachers
      if (socket.user!.schoolId) {
        this.emitToTeachers(socket.user!.schoolId, {
          type: 'lesson.completed',
          entity: 'lesson',
          action: 'complete',
          data: {
            studentId: client.studentId,
            studentName: socket.user!.username,
            lessonId: data.lessonId,
            lessonTitle: data.lessonTitle,
            completedAt: new Date().toISOString(),
            totalTimeSpent: data.totalTimeSpent,
            score: data.score
          },
          meta: {
            schoolId: socket.user!.schoolId,
            actorId: socket.user!.id,
            timestamp: new Date().toISOString(),
            entityId: data.lessonId
          }
        });
      }

      // Confirm to student
      socket.emit('lesson_completed', {
        type: 'lesson.completed',
        data: { lessonId: data.lessonId, completedAt: new Date().toISOString() }
      });

    } catch (error) {
      console.error('Error handling lesson completion:', error);
      socket.emit('error', { message: 'Failed to complete lesson' });
    }
  }

  /**
   * Handle song practice event from student
   */
  private async handleSongPractice(socket: AuthenticatedSocket, data: any) {
    try {
      if (socket.user!.role !== 'student') {
        socket.emit('error', { message: 'Only students can practice songs' });
        return;
      }

      const client = this.clients.get(socket.id);
      if (!client || !client.studentId) {
        socket.emit('error', { message: 'Student record not found' });
        return;
      }

      // Broadcast to teachers that student is practicing a song
      if (socket.user!.schoolId) {
        this.emitToTeachers(socket.user!.schoolId, {
          type: 'song.practiced',
          entity: 'song',
          action: 'practice',
          data: {
            studentId: client.studentId,
            studentName: socket.user!.username,
            songId: data.songId,
            songTitle: data.songTitle,
            practiceTime: data.practiceTime,
            difficulty: data.difficulty
          },
          meta: {
            schoolId: socket.user!.schoolId,
            actorId: socket.user!.id,
            timestamp: new Date().toISOString(),
            entityId: data.songId
          }
        });
      }

    } catch (error) {
      console.error('Error handling song practice:', error);
      socket.emit('error', { message: 'Failed to record song practice' });
    }
  }

  /**
   * Handle song favorite event from student
   */
  private async handleSongFavorite(socket: AuthenticatedSocket, data: any) {
    try {
      if (socket.user!.role !== 'student') {
        socket.emit('error', { message: 'Only students can favorite songs' });
        return;
      }

      const client = this.clients.get(socket.id);
      if (!client || !client.studentId) {
        socket.emit('error', { message: 'Student record not found' });
        return;
      }

      // Broadcast to teachers (optional, less critical event)
      if (socket.user!.schoolId) {
        this.emitToTeachers(socket.user!.schoolId, {
          type: 'song.favorited',
          entity: 'song',
          action: 'favorite',
          data: {
            studentId: client.studentId,
            studentName: socket.user!.username,
            songId: data.songId,
            songTitle: data.songTitle,
            isFavorite: data.isFavorite
          },
          meta: {
            schoolId: socket.user!.schoolId,
            actorId: socket.user!.id,
            timestamp: new Date().toISOString(),
            entityId: data.songId
          }
        });
      }

    } catch (error) {
      console.error('Error handling song favorite:', error);
      socket.emit('error', { message: 'Failed to update song favorite' });
    }
  }

  /**
   * Handle song progress event from student
   */
  private async handleSongProgress(socket: AuthenticatedSocket, data: any) {
    try {
      if (socket.user!.role !== 'student') {
        socket.emit('error', { message: 'Only students can update song progress' });
        return;
      }

      const client = this.clients.get(socket.id);
      if (!client || !client.studentId) {
        socket.emit('error', { message: 'Student record not found' });
        return;
      }

      // Broadcast progress to teachers
      if (socket.user!.schoolId) {
        this.emitToTeachers(socket.user!.schoolId, {
          type: 'song.progress',
          entity: 'song',
          action: 'update',
          data: {
            studentId: client.studentId,
            studentName: socket.user!.username,
            songId: data.songId,
            songTitle: data.songTitle,
            progress: data.progress,
            mastery: data.mastery,
            timeSpent: data.timeSpent
          },
          meta: {
            schoolId: socket.user!.schoolId,
            actorId: socket.user!.id,
            timestamp: new Date().toISOString(),
            entityId: data.songId
          }
        });
      }

    } catch (error) {
      console.error('Error handling song progress:', error);
      socket.emit('error', { message: 'Failed to update song progress' });
    }
  }

  /**
   * Handle student active status
   */
  private async handleStudentActive(socket: AuthenticatedSocket, data: any) {
    try {
      if (socket.user!.role !== 'student') {
        return;
      }

      const client = this.clients.get(socket.id);
      if (!client || !client.studentId) {
        return;
      }

      // Update client activity status
      client.isAlive = true;

      // Optionally broadcast student activity to teachers
      if (socket.user!.schoolId && data.activity) {
        this.emitToTeachers(socket.user!.schoolId, {
          type: 'student.active',
          entity: 'student',
          action: 'activity',
          data: {
            studentId: client.studentId,
            studentName: socket.user!.username,
            activity: data.activity,
            currentPage: data.currentPage
          },
          meta: {
            schoolId: socket.user!.schoolId,
            actorId: socket.user!.id,
            timestamp: new Date().toISOString(),
            entityId: client.studentId
          }
        });
      }

    } catch (error) {
      console.error('Error handling student active:', error);
    }
  }

  /**
   * Handle student idle status
   */
  private async handleStudentIdle(socket: AuthenticatedSocket, data: any) {
    try {
      if (socket.user!.role !== 'student') {
        return;
      }

      const client = this.clients.get(socket.id);
      if (!client || !client.studentId) {
        return;
      }

      // Optionally broadcast student idle status to teachers
      if (socket.user!.schoolId) {
        this.emitToTeachers(socket.user!.schoolId, {
          type: 'student.idle',
          entity: 'student', 
          action: 'idle',
          data: {
            studentId: client.studentId,
            studentName: socket.user!.username,
            idleDuration: data.idleDuration
          },
          meta: {
            schoolId: socket.user!.schoolId,
            actorId: socket.user!.id,
            timestamp: new Date().toISOString(),
            entityId: client.studentId
          }
        });
      }

    } catch (error) {
      console.error('Error handling student idle:', error);
    }
  }

  /**
   * Handle chat messages
   */
  private async handleChatMessage(socket: AuthenticatedSocket, data: any) {
    try {
      const { recipientId, recipientRole, message, timestamp } = data;

      if (!recipientId || !recipientRole || !message) {
        socket.emit('error', { message: 'Invalid chat message format' });
        return;
      }

      // Determine recipient room
      let recipientRoom: string;
      if (recipientRole === 'teacher') {
        recipientRoom = `teacher:${recipientId}`;
      } else if (recipientRole === 'student') {
        recipientRoom = `student:${recipientId}`;
      } else {
        recipientRoom = `user:${recipientId}`;
      }

      // Create chat event
      const chatEvent: RealtimeEvent = {
        type: 'chat.message',
        entity: 'chat',
        action: 'message',
        data: {
          senderId: socket.user!.role === 'teacher' ? socket.user!.id : (this.clients.get(socket.id)?.studentId || socket.user!.id),
          senderName: socket.user!.username,
          senderRole: socket.user!.role,
          recipientId,
          recipientRole,
          message,
          timestamp: timestamp || new Date().toISOString()
        },
        meta: {
          schoolId: socket.user!.schoolId,
          actorId: socket.user!.id,
          timestamp: new Date().toISOString(),
          entityId: `${socket.user!.id}-${recipientId}-${Date.now()}`
        }
      };

      // Send to recipient
      const delivered = this.emitToRoom(recipientRoom, chatEvent);

      // Send delivery confirmation to sender
      socket.emit('message_status', {
        type: 'chat.status',
        data: {
          recipientId,
          delivered: delivered > 0,
          message: delivered > 0 ? 'Message delivered' : 'Recipient offline',
          timestamp: new Date().toISOString()
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error handling chat message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  /**
   * Handle generic event relay
   */
  private async handleEventRelay(socket: AuthenticatedSocket, data: any) {
    try {
      // Enhanced validation: Check school context
      if (!socket.user!.schoolId) {
        console.error(`❌ Event relay blocked: No school context for user ${socket.user!.username} (${socket.user!.id})`);
        socket.emit('error', { message: 'School context required for event relay' });
        return;
      }

      // Validate event structure before processing
      if (!data || typeof data !== 'object') {
        console.error(`❌ Invalid event data from ${socket.user!.username}: not an object`);
        socket.emit('error', { message: 'Invalid event data structure' });
        return;
      }

      // Add metadata with security validation
      const event: RealtimeEvent = {
        ...data,
        meta: {
          ...data.meta,
          schoolId: socket.user!.schoolId, // Always use authenticated user's schoolId
          actorId: socket.user!.id,
          timestamp: new Date().toISOString()
        }
      };

      // Validate the complete event using shared contract
      if (!validateRealtimeEvent(event)) {
        console.error(`❌ Invalid event structure from ${socket.user!.username}:`, {
          type: event.type,
          entity: event.entity,
          action: event.action,
          schoolId: event.meta?.schoolId,
          error: 'Failed validateRealtimeEvent check'
        });
        socket.emit('error', { message: 'Invalid event format' });
        return;
      }

      // Check if event type is valid
      const validEventTypes = Object.values(EVENT_TYPES);
      if (!validEventTypes.includes(event.type as any)) {
        console.warn(`⚠️ Unknown event type from ${socket.user!.username}: ${event.type}. Valid types: ${validEventTypes.slice(0, 5).join(', ')}...`);
        // Don't block - might be a new event type
      }

      // Security: Ensure event schoolId matches user's schoolId
      if (event.meta.schoolId !== socket.user!.schoolId) {
        console.error(`❌ SECURITY: Event schoolId mismatch from ${socket.user!.username}. User school: ${socket.user!.schoolId}, Event school: ${event.meta.schoolId}`);
        socket.emit('error', { message: 'School context mismatch' });
        return;
      }

      // Log valid event for debugging
      console.log(`📡 Relaying event: ${event.type} from ${socket.user!.username} in school ${event.meta.schoolId}`);

      // Determine target rooms based on event type
      const targetRooms = this.determineTargetRooms(event, socket);

      // Emit to target rooms
      for (const room of targetRooms) {
        this.emitToRoom(room, event);
      }

    } catch (error) {
      console.error(`❌ Error handling event relay from ${socket.user?.username}:`, error);
      socket.emit('error', { message: 'Failed to relay event' });
    }
  }

  /**
   * Determine target rooms for an event
   */
  private determineTargetRooms(event: RealtimeEvent, socket: AuthenticatedSocket): string[] {
    const rooms: string[] = [];
    const schoolId = socket.user!.schoolId;

    if (!schoolId) return rooms;

    // Default to school-wide broadcast
    rooms.push(`school:${schoolId}`);

    // Add role-specific targeting based on event type
    if (event.type.startsWith('teacher.') || event.entity === 'student' || event.entity === 'assignment') {
      rooms.push(`school:${schoolId}:teacher`);
    }

    if (event.type.startsWith('student.') || event.entity === 'lesson' || event.entity === 'practice') {
      rooms.push(`school:${schoolId}:student`);
    }

    return rooms;
  }

  /**
   * Setup disconnect handler
   */
  private setupDisconnectHandler(socket: AuthenticatedSocket) {
    socket.on('disconnect', () => {
      try {
        const client = this.clients.get(socket.id);
        
        if (client) {
          console.log(`🔌 WebSocket client disconnected: ${client.username} (${client.role})`);
          
          // Broadcast teacher offline status if applicable
          if (client.role === 'teacher' && client.schoolId) {
            this.broadcastTeacherStatus(client.userId, client.schoolId, false);
          }
          
          this.clients.delete(socket.id);
        }
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });
  }

  /**
   * Setup periodic health checks
   */
  private setupHealthChecks() {
    setInterval(() => {
      this.clients.forEach((client, socketId) => {
        if (!client.isAlive) {
          console.log(`🔥 Removing stale connection: ${client.username}`);
          client.socket.disconnect();
          this.clients.delete(socketId);
          return;
        }
        
        client.isAlive = false;
        client.socket.emit('ping');
      });
    }, 30000); // Check every 30 seconds
  }

  /**
   * Broadcast teacher online/offline status
   */
  private broadcastTeacherStatus(teacherId: number, schoolId: number, isOnline: boolean) {
    const statusEvent: RealtimeEvent = {
      type: 'teacher.status',
      entity: 'teacher_status',
      action: isOnline ? 'online' : 'offline',
      data: {
        teacherId,
        isOnline,
        timestamp: new Date().toISOString()
      },
      meta: {
        schoolId,
        actorId: teacherId,
        timestamp: new Date().toISOString(),
        entityId: teacherId.toString()
      }
    };

    // Broadcast to all students in the school
    this.emitToRoom(`school:${schoolId}:student`, statusEvent);
  }

  /**
   * Comprehensive Event Handlers for Students, Messages, and Agenda
   */

  /**
   * Message Event Handlers
   */
  private async handleMessageSend(socket: AuthenticatedSocket, data: any) {
    try {
      const { recipientId, recipientType, subject, message } = data;
      
      console.log(`📤 Message send: ${socket.user!.username} (${socket.user!.role}) sending to ${recipientType} ${recipientId}`);
      
      // Create standardized event
      const messageEvent = createRealtimeEvent(
        'message',
        'send',
        {
          senderId: socket.user!.id,
          senderName: socket.user!.username,
          senderRole: socket.user!.role,
          recipientId,
          recipientType,
          subject,
          message,
          timestamp: new Date().toISOString()
        },
        socket.user!.schoolId!,
        socket.user!.id
      );

      // Broadcast to appropriate audience based on recipient type
      if (recipientType === 'student') {
        this.emitToStudents(socket.user!.schoolId!, messageEvent);
        this.emitToRoom(`user:${recipientId}`, messageEvent);
      } else if (recipientType === 'teacher') {
        this.emitToTeachers(socket.user!.schoolId!, messageEvent);
        this.emitToRoom(`user:${recipientId}`, messageEvent);
      }

      socket.emit('message_sent', { success: true, messageId: messageEvent.meta.entityId });

    } catch (error) {
      console.error('Error handling message send:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  private async handleMessageReceive(socket: AuthenticatedSocket, data: any) {
    try {
      console.log(`📥 Message receive: ${socket.user!.username} receiving message`);
      
      const messageEvent = createRealtimeEvent(
        'message',
        'receive',
        data,
        socket.user!.schoolId!,
        socket.user!.id
      );

      // Notify teachers that student has received the message
      this.emitToTeachers(socket.user!.schoolId!, messageEvent);

    } catch (error) {
      console.error('Error handling message receive:', error);
    }
  }

  private async handleMessageRead(socket: AuthenticatedSocket, data: any) {
    try {
      const { messageId } = data;
      
      console.log(`👁️ Message read: ${socket.user!.username} read message ${messageId}`);
      
      const messageEvent = createRealtimeEvent(
        'message',
        'read',
        {
          messageId,
          readerId: socket.user!.id,
          readerName: socket.user!.username,
          readerRole: socket.user!.role,
          timestamp: new Date().toISOString()
        },
        socket.user!.schoolId!,
        socket.user!.id,
        messageId
      );

      // Broadcast to school-wide for transparency
      this.emitToSchool(socket.user!.schoolId!, messageEvent);

    } catch (error) {
      console.error('Error handling message read:', error);
    }
  }

  private async handleMessageReply(socket: AuthenticatedSocket, data: any) {
    try {
      const { originalMessageId, reply } = data;
      
      console.log(`💬 Message reply: ${socket.user!.username} replying to message ${originalMessageId}`);
      
      const replyEvent = createRealtimeEvent(
        'message',
        'reply',
        {
          originalMessageId,
          reply,
          senderId: socket.user!.id,
          senderName: socket.user!.username,
          senderRole: socket.user!.role,
          timestamp: new Date().toISOString()
        },
        socket.user!.schoolId!,
        socket.user!.id,
        originalMessageId
      );

      // Broadcast based on sender role
      if (socket.user!.role === 'teacher') {
        this.emitToStudents(socket.user!.schoolId!, replyEvent);
      } else {
        this.emitToTeachers(socket.user!.schoolId!, replyEvent);
      }

    } catch (error) {
      console.error('Error handling message reply:', error);
    }
  }

  /**
   * Student Management Event Handlers
   */
  private async handleStudentCreate(socket: AuthenticatedSocket, data: any) {
    try {
      console.log(`🎓 Student create: ${socket.user!.username} created student ${data.name}`);
      
      const studentEvent = createRealtimeEvent(
        'student',
        'create',
        data,
        socket.user!.schoolId!,
        socket.user!.id,
        data.id
      );

      // Broadcast to all teachers in school
      this.emitToTeachers(socket.user!.schoolId!, studentEvent);

    } catch (error) {
      console.error('Error handling student create:', error);
    }
  }

  private async handleStudentUpdate(socket: AuthenticatedSocket, data: any) {
    try {
      console.log(`🎓 Student update: ${socket.user!.username} updated student ${data.id}`);
      
      const studentEvent = createRealtimeEvent(
        'student',
        'update',
        data,
        socket.user!.schoolId!,
        socket.user!.id,
        data.id
      );

      // Broadcast to all teachers in school
      this.emitToTeachers(socket.user!.schoolId!, studentEvent);

    } catch (error) {
      console.error('Error handling student update:', error);
    }
  }

  private async handleStudentDelete(socket: AuthenticatedSocket, data: any) {
    try {
      console.log(`🎓 Student delete: ${socket.user!.username} deleted student ${data.id}`);
      
      const studentEvent = createRealtimeEvent(
        'student',
        'delete',
        data,
        socket.user!.schoolId!,
        socket.user!.id,
        data.id
      );

      // Broadcast to all teachers in school
      this.emitToTeachers(socket.user!.schoolId!, studentEvent);

    } catch (error) {
      console.error('Error handling student delete:', error);
    }
  }

  private async handleStudentAssign(socket: AuthenticatedSocket, data: any) {
    try {
      const { studentId, teacherId } = data;
      console.log(`🎓 Student assign: ${socket.user!.username} assigned student ${studentId} to teacher ${teacherId}`);
      
      const assignEvent = createRealtimeEvent(
        'student',
        'assign',
        data,
        socket.user!.schoolId!,
        socket.user!.id,
        studentId
      );

      // Broadcast to all teachers in school
      this.emitToTeachers(socket.user!.schoolId!, assignEvent);

    } catch (error) {
      console.error('Error handling student assign:', error);
    }
  }

  private async handleStudentUnassign(socket: AuthenticatedSocket, data: any) {
    try {
      const { studentId, previousTeacherId } = data;
      console.log(`🎓 Student unassign: ${socket.user!.username} unassigned student ${studentId} from teacher ${previousTeacherId}`);
      
      const unassignEvent = createRealtimeEvent(
        'student',
        'unassign',
        data,
        socket.user!.schoolId!,
        socket.user!.id,
        studentId
      );

      // Broadcast to all teachers in school
      this.emitToTeachers(socket.user!.schoolId!, unassignEvent);

    } catch (error) {
      console.error('Error handling student unassign:', error);
    }
  }

  /**
   * Session/Agenda Event Handlers
   */
  private async handleSessionCreate(socket: AuthenticatedSocket, data: any) {
    try {
      console.log(`📅 Session create: ${socket.user!.username} created session ${data.title}`);
      
      const sessionEvent = createRealtimeEvent(
        'session',
        'create',
        data,
        socket.user!.schoolId!,
        socket.user!.id,
        data.id
      );

      // Broadcast to entire school (teachers and students)
      this.emitToSchool(socket.user!.schoolId!, sessionEvent);

    } catch (error) {
      console.error('Error handling session create:', error);
    }
  }

  private async handleSessionUpdate(socket: AuthenticatedSocket, data: any) {
    try {
      console.log(`📅 Session update: ${socket.user!.username} updated session ${data.id}`);
      
      const sessionEvent = createRealtimeEvent(
        'session',
        'update',
        data,
        socket.user!.schoolId!,
        socket.user!.id,
        data.id
      );

      // Broadcast to entire school
      this.emitToSchool(socket.user!.schoolId!, sessionEvent);

    } catch (error) {
      console.error('Error handling session update:', error);
    }
  }

  private async handleSessionDelete(socket: AuthenticatedSocket, data: any) {
    try {
      console.log(`📅 Session delete: ${socket.user!.username} deleted session ${data.id}`);
      
      const sessionEvent = createRealtimeEvent(
        'session',
        'delete',
        data,
        socket.user!.schoolId!,
        socket.user!.id,
        data.id
      );

      // Broadcast to entire school
      this.emitToSchool(socket.user!.schoolId!, sessionEvent);

    } catch (error) {
      console.error('Error handling session delete:', error);
    }
  }

  private async handleSessionSchedule(socket: AuthenticatedSocket, data: any) {
    try {
      console.log(`📅 Session schedule: ${socket.user!.username} scheduled session`);
      
      const scheduleEvent = createRealtimeEvent(
        'session',
        'schedule',
        data,
        socket.user!.schoolId!,
        socket.user!.id,
        data.sessionId
      );

      // Broadcast to entire school
      this.emitToSchool(socket.user!.schoolId!, scheduleEvent);

    } catch (error) {
      console.error('Error handling session schedule:', error);
    }
  }

  private async handleSessionReschedule(socket: AuthenticatedSocket, data: any) {
    try {
      console.log(`📅 Session reschedule: ${socket.user!.username} rescheduled session ${data.sessionId}`);
      
      const rescheduleEvent = createRealtimeEvent(
        'session',
        'reschedule',
        data,
        socket.user!.schoolId!,
        socket.user!.id,
        data.sessionId
      );

      // Broadcast to entire school
      this.emitToSchool(socket.user!.schoolId!, rescheduleEvent);

    } catch (error) {
      console.error('Error handling session reschedule:', error);
    }
  }

  private async handleSessionCancel(socket: AuthenticatedSocket, data: any) {
    try {
      console.log(`📅 Session cancel: ${socket.user!.username} cancelled session ${data.sessionId}`);
      
      const cancelEvent = createRealtimeEvent(
        'session',
        'cancel',
        data,
        socket.user!.schoolId!,
        socket.user!.id,
        data.sessionId
      );

      // Broadcast to entire school
      this.emitToSchool(socket.user!.schoolId!, cancelEvent);

    } catch (error) {
      console.error('Error handling session cancel:', error);
    }
  }

  /**
   * Recurring Schedule Event Handlers
   */
  private async handleRecurringScheduleCreate(socket: AuthenticatedSocket, data: any) {
    try {
      console.log(`🔄 Recurring schedule create: ${socket.user!.username} created recurring schedule`);
      
      const scheduleEvent = createRealtimeEvent(
        'recurring_schedule',
        'create',
        data,
        socket.user!.schoolId!,
        socket.user!.id,
        data.id
      );

      // Broadcast to entire school
      this.emitToSchool(socket.user!.schoolId!, scheduleEvent);

    } catch (error) {
      console.error('Error handling recurring schedule create:', error);
    }
  }

  private async handleRecurringScheduleUpdate(socket: AuthenticatedSocket, data: any) {
    try {
      console.log(`🔄 Recurring schedule update: ${socket.user!.username} updated recurring schedule ${data.id}`);
      
      const scheduleEvent = createRealtimeEvent(
        'recurring_schedule',
        'update',
        data,
        socket.user!.schoolId!,
        socket.user!.id,
        data.id
      );

      // Broadcast to entire school
      this.emitToSchool(socket.user!.schoolId!, scheduleEvent);

    } catch (error) {
      console.error('Error handling recurring schedule update:', error);
    }
  }

  private async handleRecurringScheduleDelete(socket: AuthenticatedSocket, data: any) {
    try {
      console.log(`🔄 Recurring schedule delete: ${socket.user!.username} deleted recurring schedule ${data.id}`);
      
      const scheduleEvent = createRealtimeEvent(
        'recurring_schedule',
        'delete',
        data,
        socket.user!.schoolId!,
        socket.user!.id,
        data.id
      );

      // Broadcast to entire school
      this.emitToSchool(socket.user!.schoolId!, scheduleEvent);

    } catch (error) {
      console.error('Error handling recurring schedule delete:', error);
    }
  }

  /**
   * Assignment Event Handlers
   */
  private async handleAssignmentCreate(socket: AuthenticatedSocket, data: any) {
    try {
      console.log(`📋 Assignment create: ${socket.user!.username} created assignment`);
      
      const assignmentEvent = createRealtimeEvent(
        'assignment',
        'create',
        data,
        socket.user!.schoolId!,
        socket.user!.id,
        data.id
      );

      // Broadcast to students only (they need to see new assignments)
      this.emitToStudents(socket.user!.schoolId!, assignmentEvent);

    } catch (error) {
      console.error('Error handling assignment create:', error);
    }
  }

  private async handleAssignmentUpdate(socket: AuthenticatedSocket, data: any) {
    try {
      console.log(`📋 Assignment update: ${socket.user!.username} updated assignment ${data.id}`);
      
      const assignmentEvent = createRealtimeEvent(
        'assignment',
        'update',
        data,
        socket.user!.schoolId!,
        socket.user!.id,
        data.id
      );

      // Broadcast to students only
      this.emitToStudents(socket.user!.schoolId!, assignmentEvent);

    } catch (error) {
      console.error('Error handling assignment update:', error);
    }
  }

  private async handleAssignmentDelete(socket: AuthenticatedSocket, data: any) {
    try {
      console.log(`📋 Assignment delete: ${socket.user!.username} deleted assignment ${data.id}`);
      
      const assignmentEvent = createRealtimeEvent(
        'assignment',
        'delete',
        data,
        socket.user!.schoolId!,
        socket.user!.id,
        data.id
      );

      // Broadcast to students only
      this.emitToStudents(socket.user!.schoolId!, assignmentEvent);

    } catch (error) {
      console.error('Error handling assignment delete:', error);
    }
  }

  /**
   * User Management Event Handlers
   */
  private async handleUserOnline(socket: AuthenticatedSocket, data: any) {
    try {
      console.log(`🟢 User online: ${socket.user!.username} came online`);
      
      const userEvent = createRealtimeEvent(
        'user',
        'online',
        {
          userId: socket.user!.id,
          username: socket.user!.username,
          role: socket.user!.role,
          timestamp: new Date().toISOString()
        },
        socket.user!.schoolId!,
        socket.user!.id
      );

      // Broadcast to entire school for presence awareness
      this.emitToSchool(socket.user!.schoolId!, userEvent);

    } catch (error) {
      console.error('Error handling user online:', error);
    }
  }

  private async handleUserOffline(socket: AuthenticatedSocket, data: any) {
    try {
      console.log(`🔴 User offline: ${socket.user!.username} went offline`);
      
      const userEvent = createRealtimeEvent(
        'user',
        'offline',
        {
          userId: socket.user!.id,
          username: socket.user!.username,
          role: socket.user!.role,
          timestamp: new Date().toISOString()
        },
        socket.user!.schoolId!,
        socket.user!.id
      );

      // Broadcast to entire school for presence awareness
      this.emitToSchool(socket.user!.schoolId!, userEvent);

    } catch (error) {
      console.error('Error handling user offline:', error);
    }
  }

  // PUBLIC API METHODS

  /**
   * Emit event to a specific school
   */
  public emitToSchool(schoolId: number, event: Partial<RealtimeEvent>): number {
    const fullEvent: RealtimeEvent = {
      type: event.type || 'school.update',
      entity: event.entity,
      action: event.action,
      data: event.data,
      meta: {
        schoolId,
        timestamp: new Date().toISOString(),
        ...event.meta
      }
    };

    return this.emitToRoom(`school:${schoolId}`, fullEvent);
  }

  /**
   * Emit event to all teachers in a school
   */
  public emitToTeachers(schoolId: number, event: Partial<RealtimeEvent>): number {
    const fullEvent: RealtimeEvent = {
      type: event.type || 'teacher.update',
      entity: event.entity,
      action: event.action,
      data: event.data,
      meta: {
        schoolId,
        timestamp: new Date().toISOString(),
        ...event.meta
      }
    };

    return this.emitToRoom(`school:${schoolId}:teacher`, fullEvent);
  }

  /**
   * Emit event to all students in a school
   */
  public emitToStudents(schoolId: number, event: Partial<RealtimeEvent>): number {
    const fullEvent: RealtimeEvent = {
      type: event.type || 'student.update',
      entity: event.entity,
      action: event.action,
      data: event.data,
      meta: {
        schoolId,
        timestamp: new Date().toISOString(),
        ...event.meta
      }
    };

    return this.emitToRoom(`school:${schoolId}:student`, fullEvent);
  }

  /**
   * Emit event to a specific user
   */
  public emitToUser(userId: number, event: Partial<RealtimeEvent>): number {
    const fullEvent: RealtimeEvent = {
      type: event.type || 'user.update',
      entity: event.entity,
      action: event.action,
      data: event.data,
      meta: {
        timestamp: new Date().toISOString(),
        ...event.meta
      }
    };

    return this.emitToRoom(`user:${userId}`, fullEvent);
  }

  /**
   * Emit event to a specific room
   */
  private emitToRoom(room: string, event: RealtimeEvent): number {
    const sockets = this.io.sockets.adapter.rooms.get(room);
    if (sockets) {
      this.io.to(room).emit('realtime_event', event);
      return sockets.size;
    }
    return 0;
  }

  /**
   * Get online users in a school
   */
  public getOnlineUsersInSchool(schoolId: number): Array<{userId: number, username: string, role: string}> {
    const onlineUsers: Array<{userId: number, username: string, role: string}> = [];
    
    this.clients.forEach((client) => {
      if (client.schoolId === schoolId) {
        onlineUsers.push({
          userId: client.userId,
          username: client.username,
          role: client.role
        });
      }
    });

    return onlineUsers;
  }

  /**
   * Check if a teacher is online
   */
  public isTeacherOnline(teacherId: number): boolean {
    for (const [, client] of this.clients) {
      if (client.role === 'teacher' && client.userId === teacherId) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get count of online students for a teacher
   */
  public getOnlineStudentsForTeacher(teacherId: number): number {
    let count = 0;
    
    this.clients.forEach((client) => {
      if (client.role === 'student') {
        // This is a simplified check - in a real system, you'd check if the teacher
        // is assigned to this student or if they're in the same school
        count++;
      }
    });

    return count;
  }

  /**
   * Send notification to a specific user (backward compatibility)
   */
  public sendNotification(userId: number, notification: any): number {
    return this.emitToUser(userId, {
      type: 'notification',
      data: notification
    });
  }

  /**
   * Send reschedule request to a student (backward compatibility)
   */
  public sendRescheduleRequest(studentId: number, sessionData: any): number {
    return this.emitToUser(studentId, {
      type: 'reschedule_request',
      entity: 'session',
      action: 'reschedule',
      data: sessionData
    });
  }

  /**
   * Notify a specific user (alias for backward compatibility)
   */
  public notifyUser(userId: number, data: any): void {
    this.sendNotification(userId, data);
  }

  /**
   * Close the RealtimeBus
   */
  public close(): void {
    console.log('🔌 Closing RealtimeBus...');
    
    // Disconnect all clients
    this.clients.forEach((client) => {
      client.socket.disconnect();
    });
    
    // Close Socket.IO server
    this.io.close();
    
    console.log('✅ RealtimeBus closed successfully');
  }

  /**
   * Get real-time bus statistics
   */
  public getStats(): {
    connectedClients: number;
    schoolDistribution: Record<number, number>;
    roleDistribution: Record<string, number>;
  } {
    const stats = {
      connectedClients: this.clients.size,
      schoolDistribution: {} as Record<number, number>,
      roleDistribution: {} as Record<string, number>
    };

    this.clients.forEach((client) => {
      // Count by school
      if (client.schoolId) {
        stats.schoolDistribution[client.schoolId] = (stats.schoolDistribution[client.schoolId] || 0) + 1;
      }
      
      // Count by role
      stats.roleDistribution[client.role] = (stats.roleDistribution[client.role] || 0) + 1;
    });

    return stats;
  }

  // COMPATIBILITY METHODS FOR EXISTING SERVICES

  /**
   * Add event handler (compatibility with old WebSocket manager)
   */
  public on(eventName: string, handler: (socket: any, data: any) => void): void {
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, []);
    }
    this.eventHandlers.get(eventName)!.push(handler);
    
    // Set up Socket.IO listeners for these events
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      socket.on(eventName, (data: any) => {
        handler(socket, data);
      });
    });
  }

  /**
   * Emit event to all connected clients (compatibility method)
   */
  public emit(eventName: string, data: any): void {
    this.io.emit(eventName, data);
  }

  /**
   * Get Socket.IO server instance for direct access
   */
  public get socketIO(): SocketIOServer {
    return this.io;
  }

  /**
   * Send to specific room (compatibility method)
   */
  public to(room: string) {
    return this.io.to(room);
  }
}