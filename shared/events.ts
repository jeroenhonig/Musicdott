/**
 * Shared Event Contract for Real-time Communication
 * 
 * Defines standardized event types and formats used between client and server
 * to ensure consistent real-time sync behavior and prevent event mismatches.
 */

// Standardized event entities
export const EVENT_ENTITIES = {
  STUDENT: 'student',
  LESSON: 'lesson', 
  ASSIGNMENT: 'assignment',
  SONG: 'song',
  SESSION: 'session',
  PRACTICE: 'practice',
  SCHEDULE: 'schedule',
  TEACHER_STATUS: 'teacher_status',
  CHAT: 'chat',
  MESSAGE: 'message',
  RECURRING_SCHEDULE: 'recurring_schedule',
  USER: 'user'
} as const;

export type EventEntity = typeof EVENT_ENTITIES[keyof typeof EVENT_ENTITIES];

// Standardized event actions
export const EVENT_ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update', 
  DELETE: 'delete',
  START: 'start',
  END: 'end',
  PROGRESS: 'progress',
  COMPLETE: 'complete',
  ONLINE: 'online',
  OFFLINE: 'offline',
  MESSAGE: 'message',
  PRACTICE: 'practice',
  SEND: 'send',
  RECEIVE: 'receive',
  READ: 'read',
  REPLY: 'reply',
  ASSIGN: 'assign',
  UNASSIGN: 'unassign',
  SCHEDULE: 'schedule',
  RESCHEDULE: 'reschedule',
  CANCEL: 'cancel'
} as const;

export type EventAction = typeof EVENT_ACTIONS[keyof typeof EVENT_ACTIONS];

// Complete list of standardized event types using dotted notation
export const EVENT_TYPES = {
  // Student events
  STUDENT_CREATE: 'student.create',
  STUDENT_UPDATE: 'student.update', 
  STUDENT_DELETE: 'student.delete',
  STUDENT_ONLINE: 'student.online',
  STUDENT_OFFLINE: 'student.offline',
  STUDENT_ASSIGN: 'student.assign',
  STUDENT_UNASSIGN: 'student.unassign',
  
  // Lesson events
  LESSON_CREATE: 'lesson.create',
  LESSON_UPDATE: 'lesson.update',
  LESSON_DELETE: 'lesson.delete',
  LESSON_START: 'lesson.start',
  LESSON_PROGRESS: 'lesson.progress',
  LESSON_COMPLETE: 'lesson.complete',
  
  // Assignment events
  ASSIGNMENT_CREATE: 'assignment.create',
  ASSIGNMENT_UPDATE: 'assignment.update',
  ASSIGNMENT_DELETE: 'assignment.delete',
  
  // Song events
  SONG_CREATE: 'song.create',
  SONG_UPDATE: 'song.update',
  SONG_DELETE: 'song.delete',
  SONG_PRACTICE: 'song.practice',
  SONG_FAVORITE: 'song.favorite',
  SONG_PROGRESS: 'song.progress',
  
  // Practice events
  PRACTICE_START: 'practice.start',
  PRACTICE_END: 'practice.end',
  PRACTICE_PROGRESS: 'practice.progress',
  
  // Schedule events
  SCHEDULE_CREATE: 'schedule.create',
  SCHEDULE_UPDATE: 'schedule.update',
  SCHEDULE_DELETE: 'schedule.delete',
  
  // Recurring Schedule events
  RECURRING_SCHEDULE_CREATE: 'recurring_schedule.create',
  RECURRING_SCHEDULE_UPDATE: 'recurring_schedule.update',
  RECURRING_SCHEDULE_DELETE: 'recurring_schedule.delete',
  
  // Teacher status events
  TEACHER_STATUS_ONLINE: 'teacher_status.online',
  TEACHER_STATUS_OFFLINE: 'teacher_status.offline',
  
  // Session events
  SESSION_START: 'session.start',
  SESSION_END: 'session.end',
  SESSION_CREATE: 'session.create',
  SESSION_UPDATE: 'session.update',
  SESSION_DELETE: 'session.delete',
  SESSION_SCHEDULE: 'session.schedule',
  SESSION_RESCHEDULE: 'session.reschedule',
  SESSION_CANCEL: 'session.cancel',
  
  // Chat events
  CHAT_MESSAGE: 'chat.message',
  
  // Message events
  MESSAGE_SEND: 'message.send',
  MESSAGE_RECEIVE: 'message.receive',
  MESSAGE_READ: 'message.read',
  MESSAGE_REPLY: 'message.reply',
  MESSAGE_CREATE: 'message.create',
  MESSAGE_UPDATE: 'message.update',
  MESSAGE_DELETE: 'message.delete',
  
  // User events
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  USER_ONLINE: 'user.online',
  USER_OFFLINE: 'user.offline'
} as const;

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];

// Standardized real-time event interface
export interface RealtimeEvent {
  type: EventType;
  entity: EventEntity;
  action: EventAction;
  data: any;
  meta: {
    schoolId: number; // REQUIRED - no fallbacks allowed for security
    actorId?: number;
    timestamp: string;
    entityId?: number | string;
  };
}

// Event broadcast audience types
export const BROADCAST_AUDIENCES = {
  SCHOOL_WIDE: 'school_wide',      // All members (teachers + students)
  TEACHERS_ONLY: 'teachers_only',   // Only teachers in school
  STUDENTS_ONLY: 'students_only',   // Only students in school
  SPECIFIC_USER: 'specific_user'    // Target specific user
} as const;

export type BroadcastAudience = typeof BROADCAST_AUDIENCES[keyof typeof BROADCAST_AUDIENCES];

// Event routing configuration
export interface EventRoute {
  eventType: EventType;
  audience: BroadcastAudience;
  description: string;
}

// Standardized event routing rules
export const EVENT_ROUTES: EventRoute[] = [
  // School-wide events (visible to all members)
  { eventType: EVENT_TYPES.LESSON_CREATE, audience: BROADCAST_AUDIENCES.SCHOOL_WIDE, description: 'New lesson available' },
  { eventType: EVENT_TYPES.LESSON_UPDATE, audience: BROADCAST_AUDIENCES.SCHOOL_WIDE, description: 'Lesson updated' },
  { eventType: EVENT_TYPES.LESSON_DELETE, audience: BROADCAST_AUDIENCES.SCHOOL_WIDE, description: 'Lesson removed' },
  { eventType: EVENT_TYPES.SONG_CREATE, audience: BROADCAST_AUDIENCES.SCHOOL_WIDE, description: 'New song available' },
  { eventType: EVENT_TYPES.SONG_UPDATE, audience: BROADCAST_AUDIENCES.SCHOOL_WIDE, description: 'Song updated' },
  { eventType: EVENT_TYPES.SONG_DELETE, audience: BROADCAST_AUDIENCES.SCHOOL_WIDE, description: 'Song removed' },
  { eventType: EVENT_TYPES.SCHEDULE_CREATE, audience: BROADCAST_AUDIENCES.SCHOOL_WIDE, description: 'Schedule updated' },
  { eventType: EVENT_TYPES.SCHEDULE_UPDATE, audience: BROADCAST_AUDIENCES.SCHOOL_WIDE, description: 'Schedule changed' },
  { eventType: EVENT_TYPES.SCHEDULE_DELETE, audience: BROADCAST_AUDIENCES.SCHOOL_WIDE, description: 'Schedule removed' },
  { eventType: EVENT_TYPES.RECURRING_SCHEDULE_CREATE, audience: BROADCAST_AUDIENCES.SCHOOL_WIDE, description: 'Recurring schedule created' },
  { eventType: EVENT_TYPES.RECURRING_SCHEDULE_UPDATE, audience: BROADCAST_AUDIENCES.SCHOOL_WIDE, description: 'Recurring schedule updated' },
  { eventType: EVENT_TYPES.RECURRING_SCHEDULE_DELETE, audience: BROADCAST_AUDIENCES.SCHOOL_WIDE, description: 'Recurring schedule removed' },
  { eventType: EVENT_TYPES.SESSION_CREATE, audience: BROADCAST_AUDIENCES.SCHOOL_WIDE, description: 'New session scheduled' },
  { eventType: EVENT_TYPES.SESSION_UPDATE, audience: BROADCAST_AUDIENCES.SCHOOL_WIDE, description: 'Session updated' },
  { eventType: EVENT_TYPES.SESSION_DELETE, audience: BROADCAST_AUDIENCES.SCHOOL_WIDE, description: 'Session cancelled' },
  { eventType: EVENT_TYPES.SESSION_SCHEDULE, audience: BROADCAST_AUDIENCES.SCHOOL_WIDE, description: 'Session scheduled' },
  { eventType: EVENT_TYPES.SESSION_RESCHEDULE, audience: BROADCAST_AUDIENCES.SCHOOL_WIDE, description: 'Session rescheduled' },
  { eventType: EVENT_TYPES.SESSION_CANCEL, audience: BROADCAST_AUDIENCES.SCHOOL_WIDE, description: 'Session cancelled' },
  
  // Teacher-only events (student activity monitoring and management)
  { eventType: EVENT_TYPES.STUDENT_CREATE, audience: BROADCAST_AUDIENCES.TEACHERS_ONLY, description: 'New student enrolled' },
  { eventType: EVENT_TYPES.STUDENT_UPDATE, audience: BROADCAST_AUDIENCES.TEACHERS_ONLY, description: 'Student info updated' },
  { eventType: EVENT_TYPES.STUDENT_DELETE, audience: BROADCAST_AUDIENCES.TEACHERS_ONLY, description: 'Student removed' },
  { eventType: EVENT_TYPES.STUDENT_ASSIGN, audience: BROADCAST_AUDIENCES.TEACHERS_ONLY, description: 'Student assigned to teacher' },
  { eventType: EVENT_TYPES.STUDENT_UNASSIGN, audience: BROADCAST_AUDIENCES.TEACHERS_ONLY, description: 'Student unassigned from teacher' },
  { eventType: EVENT_TYPES.STUDENT_ONLINE, audience: BROADCAST_AUDIENCES.TEACHERS_ONLY, description: 'Student came online' },
  { eventType: EVENT_TYPES.STUDENT_OFFLINE, audience: BROADCAST_AUDIENCES.TEACHERS_ONLY, description: 'Student went offline' },
  { eventType: EVENT_TYPES.LESSON_START, audience: BROADCAST_AUDIENCES.TEACHERS_ONLY, description: 'Student started lesson' },
  { eventType: EVENT_TYPES.LESSON_PROGRESS, audience: BROADCAST_AUDIENCES.TEACHERS_ONLY, description: 'Student lesson progress' },
  { eventType: EVENT_TYPES.LESSON_COMPLETE, audience: BROADCAST_AUDIENCES.TEACHERS_ONLY, description: 'Student completed lesson' },
  { eventType: EVENT_TYPES.SONG_PRACTICE, audience: BROADCAST_AUDIENCES.TEACHERS_ONLY, description: 'Student practicing song' },
  { eventType: EVENT_TYPES.SONG_FAVORITE, audience: BROADCAST_AUDIENCES.TEACHERS_ONLY, description: 'Student favorited song' },
  { eventType: EVENT_TYPES.SONG_PROGRESS, audience: BROADCAST_AUDIENCES.TEACHERS_ONLY, description: 'Student song progress update' },
  { eventType: EVENT_TYPES.PRACTICE_START, audience: BROADCAST_AUDIENCES.TEACHERS_ONLY, description: 'Student started practice' },
  { eventType: EVENT_TYPES.PRACTICE_END, audience: BROADCAST_AUDIENCES.TEACHERS_ONLY, description: 'Student ended practice' },
  { eventType: EVENT_TYPES.PRACTICE_PROGRESS, audience: BROADCAST_AUDIENCES.TEACHERS_ONLY, description: 'Student practice progress' },
  { eventType: EVENT_TYPES.MESSAGE_RECEIVE, audience: BROADCAST_AUDIENCES.TEACHERS_ONLY, description: 'Message received from student' },
  { eventType: EVENT_TYPES.SESSION_START, audience: BROADCAST_AUDIENCES.TEACHERS_ONLY, description: 'Student started session' },
  { eventType: EVENT_TYPES.SESSION_END, audience: BROADCAST_AUDIENCES.TEACHERS_ONLY, description: 'Student ended session' },
  
  // Student-only events
  { eventType: EVENT_TYPES.ASSIGNMENT_CREATE, audience: BROADCAST_AUDIENCES.STUDENTS_ONLY, description: 'New assignment' },
  { eventType: EVENT_TYPES.ASSIGNMENT_UPDATE, audience: BROADCAST_AUDIENCES.STUDENTS_ONLY, description: 'Assignment updated' },
  { eventType: EVENT_TYPES.TEACHER_STATUS_ONLINE, audience: BROADCAST_AUDIENCES.STUDENTS_ONLY, description: 'Teacher came online' },
  { eventType: EVENT_TYPES.TEACHER_STATUS_OFFLINE, audience: BROADCAST_AUDIENCES.STUDENTS_ONLY, description: 'Teacher went offline' },
  { eventType: EVENT_TYPES.MESSAGE_SEND, audience: BROADCAST_AUDIENCES.STUDENTS_ONLY, description: 'Message from teacher' },
  { eventType: EVENT_TYPES.MESSAGE_REPLY, audience: BROADCAST_AUDIENCES.STUDENTS_ONLY, description: 'Teacher replied to message' },
  
  // Bidirectional message events (school-wide visibility for transparency)
  { eventType: EVENT_TYPES.MESSAGE_CREATE, audience: BROADCAST_AUDIENCES.SCHOOL_WIDE, description: 'New message created' },
  { eventType: EVENT_TYPES.MESSAGE_READ, audience: BROADCAST_AUDIENCES.SCHOOL_WIDE, description: 'Message read' },
  
  // User management events (teacher-only for security)
  { eventType: EVENT_TYPES.USER_CREATE, audience: BROADCAST_AUDIENCES.TEACHERS_ONLY, description: 'New user created' },
  { eventType: EVENT_TYPES.USER_UPDATE, audience: BROADCAST_AUDIENCES.TEACHERS_ONLY, description: 'User updated' },
  { eventType: EVENT_TYPES.USER_DELETE, audience: BROADCAST_AUDIENCES.TEACHERS_ONLY, description: 'User deleted' },
  { eventType: EVENT_TYPES.USER_ONLINE, audience: BROADCAST_AUDIENCES.SCHOOL_WIDE, description: 'User came online' },
  { eventType: EVENT_TYPES.USER_OFFLINE, audience: BROADCAST_AUDIENCES.SCHOOL_WIDE, description: 'User went offline' }
];

// Helper function to get event route
export function getEventRoute(eventType: EventType): EventRoute | undefined {
  return EVENT_ROUTES.find(route => route.eventType === eventType);
}

// Helper function to create standardized event
export function createRealtimeEvent(
  entity: EventEntity,
  action: EventAction,
  data: any,
  schoolId: number,
  actorId?: number,
  entityId?: number | string
): RealtimeEvent {
  const type = `${entity}.${action}` as EventType;
  
  return {
    type,
    entity,
    action,
    data,
    meta: {
      schoolId,
      actorId,
      timestamp: new Date().toISOString(),
      entityId
    }
  };
}

// Validation function
export function validateRealtimeEvent(event: any): event is RealtimeEvent {
  return (
    typeof event === 'object' &&
    typeof event.type === 'string' &&
    typeof event.entity === 'string' &&
    typeof event.action === 'string' &&
    event.data !== undefined &&
    typeof event.meta === 'object' &&
    typeof event.meta.schoolId === 'number' &&
    typeof event.meta.timestamp === 'string'
  );
}