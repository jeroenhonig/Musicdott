import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./use-auth";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "./use-toast";

// Types based on server RealtimeBus implementation
interface RealtimeEvent {
  type: string;
  entity?: 'student' | 'lesson' | 'assignment' | 'song' | 'session' | 'chat' | 'practice' | 'teacher_status' | 'schedule' | 'message' | 'recurring_schedule' | 'user';
  action?: 'create' | 'update' | 'delete' | 'start' | 'end' | 'online' | 'offline' | 'message' | 'send' | 'receive' | 'read' | 'reply' | 'assign' | 'unassign' | 'schedule' | 'reschedule' | 'cancel';
  data: any;
  meta: {
    schoolId?: number;
    actorId?: number;
    timestamp: string;
    entityId?: number | string;
  };
}

interface ConnectionInfo {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  lastConnected: Date | null;
  reconnectAttempts: number;
}

interface OnlineUser {
  userId: number;
  username: string;
  role: string;
}

interface RealtimeSyncOptions {
  autoConnect?: boolean;
  enableDebugLogs?: boolean;
  maxReconnectAttempts?: number;
  batchInvalidationDelay?: number;
}

export interface UseRealtimeSyncReturn {
  // Connection status
  connectionInfo: ConnectionInfo;
  isConnected: boolean;
  
  // Data
  onlineUsers: OnlineUser[];
  recentActivity: RealtimeEvent[];
  
  // Methods
  connect: () => void;
  disconnect: () => void;
  sendEvent: (event: Partial<RealtimeEvent>) => void;
  refreshCache: (entity?: string) => void;
  
  // Event subscription
  addEventListener: (eventType: string, handler: (event: RealtimeEvent) => void) => () => void;
}

const DEFAULT_OPTIONS: RealtimeSyncOptions = {
  autoConnect: true,
  enableDebugLogs: process.env.NODE_ENV === 'development',
  maxReconnectAttempts: 5,
  batchInvalidationDelay: 100, // ms
};

export function useRealtimeSync(options: RealtimeSyncOptions = {}): UseRealtimeSyncReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { user, currentSchool } = useAuth();
  const { toast } = useToast();
  
  // State
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>({
    connected: false,
    connecting: false,
    error: null,
    lastConnected: null,
    reconnectAttempts: 0,
  });
  
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [recentActivity, setRecentActivity] = useState<RealtimeEvent[]>([]);
  
  // Refs for stable references
  const socketRef = useRef<Socket | null>(null);
  const eventListenersRef = useRef<Map<string, Set<(event: RealtimeEvent) => void>>>(new Map());
  const pendingInvalidationsRef = useRef<Set<string>>(new Set());
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Debug logging
  const debugLog = useCallback((message: string, data?: any) => {
    if (opts.enableDebugLogs) {
      console.log(`[RealtimeSync] ${message}`, data);
    }
  }, [opts.enableDebugLogs]);

  // Event-to-cache mapping system
  const invalidateQueryKeys = useCallback((event: RealtimeEvent) => {
    const keysToInvalidate: string[] = [];
    
    // Always invalidate dashboard stats for any data change
    keysToInvalidate.push('/api/dashboard/stats');
    
    // Entity-specific invalidations
    switch (event.entity) {
      case 'student':
        keysToInvalidate.push('/api/students');
        if (event.meta.entityId) {
          keysToInvalidate.push(`/api/students/${event.meta.entityId}`);
        }
        // Student changes might affect teacher assignments
        keysToInvalidate.push('/api/teachers/assignments');
        break;
        
      case 'lesson':
        keysToInvalidate.push('/api/lessons');
        if (event.meta.entityId) {
          keysToInvalidate.push(`/api/lessons/${event.meta.entityId}`);
        }
        // Lessons might affect recent content and assignments
        keysToInvalidate.push('/api/recent-content');
        keysToInvalidate.push('/api/assignments');
        break;
        
      case 'song':
        keysToInvalidate.push('/api/songs');
        if (event.meta.entityId) {
          keysToInvalidate.push(`/api/songs/${event.meta.entityId}`);
        }
        keysToInvalidate.push('/api/recent-content');
        break;
        
      case 'assignment':
        keysToInvalidate.push('/api/assignments');
        if (event.meta.entityId) {
          keysToInvalidate.push(`/api/assignments/${event.meta.entityId}`);
        }
        keysToInvalidate.push('/api/recent-assignments');
        keysToInvalidate.push('/api/students'); // Assignment changes affect student records
        break;
        
      case 'session':
        keysToInvalidate.push('/api/sessions');
        keysToInvalidate.push('/api/schedules');
        if (event.meta.entityId) {
          keysToInvalidate.push(`/api/sessions/${event.meta.entityId}`);
        }
        break;
        
      case 'schedule':
        keysToInvalidate.push('/api/schedules');
        keysToInvalidate.push('/api/recurring-schedules');
        keysToInvalidate.push('/api/upcoming-lessons');
        break;
        
      case 'practice':
        keysToInvalidate.push('/api/practice-sessions');
        keysToInvalidate.push('/api/dashboard/stats');
        keysToInvalidate.push('/api/student-progress');
        if (event.data?.studentId) {
          keysToInvalidate.push(`/api/students/${event.data.studentId}/progress`);
        }
        break;
        
      case 'teacher_status':
        // Teacher online/offline status doesn't need cache invalidation
        // but we might want to update online users list
        return;
        
      case 'chat':
        keysToInvalidate.push('/api/messages');
        if (event.data?.recipientId) {
          keysToInvalidate.push(`/api/messages/${event.data.recipientId}`);
        }
        break;
        
      case 'message':
        // Comprehensive message system invalidations
        keysToInvalidate.push('/api/messages');
        keysToInvalidate.push('/api/conversations');
        keysToInvalidate.push('/api/unread-messages');
        if (event.data?.recipientId) {
          keysToInvalidate.push(`/api/messages/${event.data.recipientId}`);
          keysToInvalidate.push(`/api/conversations/${event.data.recipientId}`);
        }
        if (event.data?.senderId) {
          keysToInvalidate.push(`/api/messages/${event.data.senderId}`);
          keysToInvalidate.push(`/api/conversations/${event.data.senderId}`);
        }
        break;
        
      case 'recurring_schedule':
        keysToInvalidate.push('/api/recurring-schedules');
        keysToInvalidate.push('/api/schedules');
        keysToInvalidate.push('/api/calendar-events');
        keysToInvalidate.push('/api/upcoming-lessons');
        if (event.meta.entityId) {
          keysToInvalidate.push(`/api/recurring-schedules/${event.meta.entityId}`);
        }
        break;
        
      case 'user':
        // User presence and status changes
        keysToInvalidate.push('/api/online-users');
        keysToInvalidate.push('/api/user-presence');
        if (event.meta.entityId) {
          keysToInvalidate.push(`/api/users/${event.meta.entityId}`);
        }
        break;
        
      default:
        // For unknown entities, invalidate common queries
        keysToInvalidate.push('/api/dashboard/stats');
        break;
    }
    
    // Add to pending invalidations for batching
    keysToInvalidate.forEach(key => pendingInvalidationsRef.current.add(key));
    
    // Clear existing timeout and set new one for batching
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }
    
    batchTimeoutRef.current = setTimeout(() => {
      const keysToProcess = Array.from(pendingInvalidationsRef.current);
      pendingInvalidationsRef.current.clear();
      
      debugLog('Batch invalidating cache keys:', keysToProcess);
      
      // Perform batch invalidations
      keysToProcess.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
      
      // Also invalidate hierarchical queries
      keysToProcess.forEach(key => {
        const parts = key.split('/');
        if (parts.length > 3) {
          const parentKey = parts.slice(0, -1).join('/');
          queryClient.invalidateQueries({ queryKey: [parentKey] });
        }
      });
      
    }, opts.batchInvalidationDelay);
    
  }, [debugLog, opts.batchInvalidationDelay]);

  // Smart cache updates based on action type
  const handleSmartCacheUpdate = useCallback((event: RealtimeEvent) => {
    const { entity, action, data, meta } = event;
    
    try {
      switch (action) {
        case 'create':
          // For create actions, we mainly rely on invalidation
          // but we can optimistically add to list queries if data is complete
          debugLog(`Create action for ${entity}:`, data);
          break;
          
        case 'update':
          // For update actions, try to update specific item cache
          if (meta.entityId && entity) {
            const queryKey = [`/api/${entity}s`, meta.entityId];
            const existingData = queryClient.getQueryData(queryKey);
            
            if (existingData && data) {
              debugLog(`Updating cache for ${entity} ${meta.entityId}`);
              queryClient.setQueryData(queryKey, { ...existingData, ...data });
            }
          }
          break;
          
        case 'delete':
          // For delete actions, remove from cache
          if (meta.entityId && entity) {
            const queryKey = [`/api/${entity}s`, meta.entityId];
            debugLog(`Removing from cache: ${entity} ${meta.entityId}`);
            queryClient.removeQueries({ queryKey });
            
            // Also remove from list queries by invalidating them
            queryClient.invalidateQueries({ queryKey: [`/api/${entity}s`] });
          }
          break;
          
        case 'start':
        case 'end':
          // For session-based actions (practice start/end)
          if (entity === 'practice') {
            // Immediately update dashboard stats without waiting for invalidation
            queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
          }
          break;
          
        case 'send':
        case 'receive':
        case 'read':
        case 'reply':
          // Message-specific actions
          if (entity === 'message') {
            debugLog(`Message ${action} action:`, data);
            // Invalidate message-related queries immediately for responsive messaging
            queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
            queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
            queryClient.invalidateQueries({ queryKey: ['/api/unread-messages'] });
          }
          break;
          
        case 'assign':
        case 'unassign':
          // Student assignment actions
          if (entity === 'student') {
            debugLog(`Student ${action} action:`, data);
            // Invalidate student and teacher assignment queries
            queryClient.invalidateQueries({ queryKey: ['/api/students'] });
            queryClient.invalidateQueries({ queryKey: ['/api/teachers/assignments'] });
            queryClient.invalidateQueries({ queryKey: ['/api/teacher-student-assignments'] });
          }
          break;
          
        case 'schedule':
        case 'reschedule':
        case 'cancel':
          // Session/agenda management actions
          if (entity === 'session') {
            debugLog(`Session ${action} action:`, data);
            // Invalidate schedule-related queries immediately
            queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
            queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
            queryClient.invalidateQueries({ queryKey: ['/api/calendar-events'] });
            queryClient.invalidateQueries({ queryKey: ['/api/upcoming-lessons'] });
          }
          break;
          
        case 'online':
        case 'offline':
          // User presence actions
          if (entity === 'user') {
            debugLog(`User ${action} action:`, data);
            // Update online users list immediately
            queryClient.invalidateQueries({ queryKey: ['/api/online-users'] });
          }
          break;
      }
    } catch (error) {
      console.error('Error in smart cache update:', error);
    }
  }, [debugLog]);

  // Handle realtime events
  const handleRealtimeEvent = useCallback((event: RealtimeEvent) => {
    debugLog('Received realtime event:', event);
    
    // Add to recent activity (keep last 50 events)
    setRecentActivity(prev => {
      const updated = [event, ...prev].slice(0, 50);
      return updated;
    });
    
    // Handle teacher status updates
    if (event.type === 'teacher.status' && event.entity === 'teacher_status') {
      setOnlineUsers(prev => {
        if (event.action === 'online') {
          const exists = prev.some(u => u.userId === event.data.teacherId);
          if (!exists) {
            return [...prev, {
              userId: event.data.teacherId,
              username: event.data.teacherName || `Teacher ${event.data.teacherId}`,
              role: 'teacher'
            }];
          }
        } else if (event.action === 'offline') {
          return prev.filter(u => u.userId !== event.data.teacherId);
        }
        return prev;
      });
    }
    
    // Apply smart cache updates
    handleSmartCacheUpdate(event);
    
    // Invalidate appropriate cache keys
    invalidateQueryKeys(event);
    
    // Notify custom event listeners
    const listeners = eventListenersRef.current.get(event.type);
    if (listeners) {
      listeners.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error('Error in custom event handler:', error);
        }
      });
    }
    
    // Show toast notifications for certain events if user is not the actor
    if (event.meta.actorId !== user?.id) {
      // Practice session notifications
      if (event.type === 'practice.start' && event.entity === 'practice') {
        toast({
          title: "Practice Session Started",
          description: `${event.data.studentName} started practicing`,
        });
      } 
      // Original chat message notifications
      else if (event.type === 'chat.message' && event.entity === 'chat') {
        toast({
          title: "New Message",
          description: `${event.data.senderName}: ${event.data.message.substring(0, 50)}...`,
        });
      }
      // Comprehensive message system notifications
      else if (event.entity === 'message') {
        switch (event.action) {
          case 'send':
            toast({
              title: "New Message",
              description: `${event.data.senderName} sent you a message: "${event.data.subject || event.data.message?.substring(0, 30)}..."`,
            });
            break;
          case 'reply':
            toast({
              title: "Message Reply",
              description: `${event.data.senderName} replied to your message`,
            });
            break;
        }
      }
      // Student management notifications
      else if (event.entity === 'student') {
        switch (event.action) {
          case 'create':
            toast({
              title: "New Student Added",
              description: `${event.data.name} was added to the school`,
            });
            break;
          case 'assign':
            if (user?.role === 'teacher' && (event.data.teacherId === user.id || event.data.previousTeacherId === user.id)) {
              toast({
                title: "Student Assignment",
                description: `${event.data.studentName} has been assigned to ${event.data.teacherName}`,
              });
            }
            break;
          case 'unassign':
            if (user?.role === 'teacher' && event.data.previousTeacherId === user.id) {
              toast({
                title: "Student Unassigned",
                description: `${event.data.studentName} is no longer assigned to you`,
              });
            }
            break;
        }
      }
      // Session/agenda notifications
      else if (event.entity === 'session') {
        switch (event.action) {
          case 'create':
            toast({
              title: "New Session Scheduled",
              description: `${event.data.title} has been scheduled`,
            });
            break;
          case 'reschedule':
            toast({
              title: "Session Rescheduled",
              description: `${event.data.title} has been rescheduled`,
            });
            break;
          case 'cancel':
            toast({
              title: "Session Cancelled",
              description: `${event.data.title} has been cancelled`,
            });
            break;
        }
      }
      // Recurring schedule notifications
      else if (event.entity === 'recurring_schedule') {
        switch (event.action) {
          case 'create':
            toast({
              title: "Recurring Schedule Created",
              description: `New recurring schedule has been set up`,
            });
            break;
          case 'update':
            toast({
              title: "Schedule Updated",
              description: `Recurring schedule has been modified`,
            });
            break;
          case 'delete':
            toast({
              title: "Schedule Removed",
              description: `Recurring schedule has been deleted`,
            });
            break;
        }
      }
      // Assignment notifications
      else if (event.entity === 'assignment') {
        switch (event.action) {
          case 'create':
            if (user?.role === 'student') {
              toast({
                title: "New Assignment",
                description: `You have a new assignment available`,
              });
            }
            break;
          case 'update':
            if (user?.role === 'student') {
              toast({
                title: "Assignment Updated",
                description: `An assignment has been modified`,
              });
            }
            break;
        }
      }
      // User presence notifications (for important users only)
      else if (event.entity === 'user' && event.data.role === 'teacher') {
        switch (event.action) {
          case 'online':
            if (user?.role === 'student') {
              toast({
                title: "Teacher Online",
                description: `${event.data.username} is now available`,
              });
            }
            break;
        }
      }
    }
    
  }, [debugLog, handleSmartCacheUpdate, invalidateQueryKeys, toast, user?.id]);

  // Connection management
  const connect = useCallback(() => {
    if (!user || socketRef.current?.connected) {
      debugLog('Cannot connect - no user or already connected');
      return;
    }

    debugLog('Connecting to Socket.IO server...');
    
    setConnectionInfo(prev => ({ ...prev, connecting: true, error: null }));

    const socket = io({
      path: "/ws",
      transports: ['websocket', 'polling'],
      withCredentials: true,
      forceNew: true,
      timeout: 10000,
    });

    socketRef.current = socket;

    // Connection handlers
    socket.on('connect', () => {
      debugLog('Connected to Socket.IO server');
      setConnectionInfo(prev => ({
        ...prev,
        connected: true,
        connecting: false,
        error: null,
        lastConnected: new Date(),
        reconnectAttempts: 0,
      }));
    });

    socket.on('disconnect', (reason) => {
      debugLog('Disconnected from Socket.IO server:', reason);
      setConnectionInfo(prev => ({
        ...prev,
        connected: false,
        connecting: false,
        error: `Disconnected: ${reason}`,
      }));
      
      // Clear online users when disconnected
      setOnlineUsers([]);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      setConnectionInfo(prev => ({
        ...prev,
        connected: false,
        connecting: false,
        error: error.message,
        reconnectAttempts: prev.reconnectAttempts + 1,
      }));
    });

    // Authentication handlers
    socket.on('auth_error', (data) => {
      console.error('Socket.IO authentication error:', data);
      setConnectionInfo(prev => ({
        ...prev,
        connected: false,
        connecting: false,
        error: 'auth_error', // Use specific error code to prevent auto-reconnect
        reconnectAttempts: opts.maxReconnectAttempts || 5, // Prevent further reconnect attempts
      }));
      // Disconnect cleanly on auth error - user needs to re-authenticate
      socket.disconnect();
    });

    socket.on('connection_established', (data) => {
      debugLog('Connection established:', data);
      toast({
        title: "Real-time connection active",
        description: "You'll receive live updates automatically",
      });
    });

    // Event handlers
    socket.on('realtime_event', handleRealtimeEvent);

    // Heartbeat handlers
    socket.on('ping', () => {
      socket.emit('pong');
    });

    // Store socket reference
    socketRef.current = socket;

  }, [user, debugLog, handleRealtimeEvent, toast]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      debugLog('Disconnecting from Socket.IO server');
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    setConnectionInfo(prev => ({
      ...prev,
      connected: false,
      connecting: false,
    }));
    
    setOnlineUsers([]);
  }, [debugLog]);

  // Send event to server
  const sendEvent = useCallback((event: Partial<RealtimeEvent>) => {
    if (!socketRef.current?.connected) {
      debugLog('Cannot send event - not connected');
      return;
    }

    debugLog('Sending event:', event);
    socketRef.current.emit('relay_event', event);
  }, [debugLog]);

  // Manual cache refresh
  const refreshCache = useCallback((entity?: string) => {
    if (entity) {
      queryClient.invalidateQueries({ queryKey: [`/api/${entity}s`] });
    } else {
      // Refresh common queries
      const commonQueries = [
        '/api/students',
        '/api/lessons', 
        '/api/songs',
        '/api/assignments',
        '/api/sessions',
        '/api/schedules',
        '/api/dashboard/stats',
        '/api/recent-content',
        '/api/recent-assignments',
        '/api/upcoming-lessons'
      ];
      
      commonQueries.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      });
    }
    
    toast({
      title: "Cache refreshed",
      description: "Latest data has been loaded",
    });
  }, [toast]);

  // Event listener management
  const addEventListener = useCallback((eventType: string, handler: (event: RealtimeEvent) => void) => {
    if (!eventListenersRef.current.has(eventType)) {
      eventListenersRef.current.set(eventType, new Set());
    }
    
    const listeners = eventListenersRef.current.get(eventType)!;
    listeners.add(handler);
    
    debugLog(`Added event listener for: ${eventType}`);
    
    // Return cleanup function
    return () => {
      listeners.delete(handler);
      if (listeners.size === 0) {
        eventListenersRef.current.delete(eventType);
      }
      debugLog(`Removed event listener for: ${eventType}`);
    };
  }, [debugLog]);

  // Auto-connect when user is available
  useEffect(() => {
    if (opts.autoConnect && user && !socketRef.current?.connected) {
      const timer = setTimeout(() => {
        connect();
      }, 500); // Small delay to ensure auth is fully settled
      
      return () => clearTimeout(timer);
    }
  }, [user, opts.autoConnect, connect]);

  // Auto-reconnect logic
  useEffect(() => {
    // Don't reconnect on authentication errors - user needs to log in again
    if (connectionInfo.error === 'auth_error') {
      debugLog('Not reconnecting due to authentication error');
      return;
    }

    if (!connectionInfo.connected &&
        !connectionInfo.connecting &&
        connectionInfo.error &&
        connectionInfo.reconnectAttempts < opts.maxReconnectAttempts! &&
        user) {

      const delay = Math.min(1000 * Math.pow(2, connectionInfo.reconnectAttempts), 30000);
      debugLog(`Attempting reconnect in ${delay}ms (attempt ${connectionInfo.reconnectAttempts + 1})`);

      const timer = setTimeout(() => {
        connect();
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [connectionInfo, user, connect, opts.maxReconnectAttempts, debugLog]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debugLog('Cleaning up realtime sync...');
      
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
      
      disconnect();
      eventListenersRef.current.clear();
    };
  }, [disconnect, debugLog]);

  return {
    // Connection status
    connectionInfo,
    isConnected: connectionInfo.connected,
    
    // Data
    onlineUsers,
    recentActivity,
    
    // Methods
    connect,
    disconnect,
    sendEvent,
    refreshCache,
    addEventListener,
  };
}

// Convenience hook for components that just need connection status
export function useRealtimeConnection() {
  const { connectionInfo, isConnected } = useRealtimeSync({ autoConnect: true });
  return { connectionInfo, isConnected };
}

// Hook for specific event types
export function useRealtimeEvents(eventTypes: string[] | string) {
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const { addEventListener } = useRealtimeSync();
  
  useEffect(() => {
    const eventArray = Array.isArray(eventTypes) ? eventTypes : [eventTypes];
    const cleanupFunctions: (() => void)[] = [];
    
    eventArray.forEach(eventType => {
      const cleanup = addEventListener(eventType, (event) => {
        setEvents(prev => [event, ...prev].slice(0, 20)); // Keep last 20 events
      });
      cleanupFunctions.push(cleanup);
    });
    
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [eventTypes, addEventListener]);
  
  return events;
}