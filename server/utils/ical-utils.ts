import ical from 'ical-generator';
import moment from 'moment-timezone';
import { RecurringSchedule, Student, User } from '@shared/schema';

// Timezone constants
const DEFAULT_TIMEZONE = 'Europe/Amsterdam';

/**
 * iCal utility functions for import/export of calendar data
 */

// Interface for parsed iCal event
export interface ParsedCalendarEvent {
  uid: string;
  summary: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  recurring?: {
    frequency: 'WEEKLY' | 'DAILY' | 'MONTHLY';
    interval?: number;
    byDay?: string[];
    until?: Date;
  };
  attendees?: Array<{
    email: string;
    name?: string;
    role?: 'REQ-PARTICIPANT' | 'OPT-PARTICIPANT';
  }>;
}

// Interface for iCal generation options
export interface CalendarExportOptions {
  name: string;
  description?: string;
  timezone?: string;
  includeAlarms?: boolean;
}

/**
 * Parse iCal file content and extract calendar events
 */
export function parseICalFile(icsContent: string): ParsedCalendarEvent[] {
  try {
    const events: ParsedCalendarEvent[] = [];
    const lines = icsContent.split('\n').map(line => line.trim());
    
    let currentEvent: any = null;
    let currentProperty = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line === 'BEGIN:VEVENT') {
        currentEvent = {};
      } else if (line === 'END:VEVENT' && currentEvent) {
        // Process completed event
        const parsedEvent: ParsedCalendarEvent = {
          uid: currentEvent.uid || generateUID(),
          summary: currentEvent.summary || 'Untitled Event',
          description: currentEvent.description,
          startTime: parseICalDate(currentEvent.dtstart),
          endTime: parseICalDate(currentEvent.dtend),
          location: currentEvent.location,
        };

        // Parse recurrence rules
        if (currentEvent.rrule) {
          parsedEvent.recurring = parseRecurrenceRule(currentEvent.rrule);
        }

        // Parse attendees
        if (currentEvent.attendees) {
          parsedEvent.attendees = currentEvent.attendees.map((attendee: string) => {
            const emailMatch = attendee.match(/mailto:([^;]+)/);
            const nameMatch = attendee.match(/CN=([^;:]+)/);
            return {
              email: emailMatch ? emailMatch[1] : '',
              name: nameMatch ? nameMatch[1] : undefined,
              role: attendee.includes('ROLE=OPT-PARTICIPANT') ? 'OPT-PARTICIPANT' : 'REQ-PARTICIPANT',
            };
          });
        }

        events.push(parsedEvent);
        currentEvent = null;
      } else if (currentEvent && line.includes(':')) {
        const colonIndex = line.indexOf(':');
        const property = line.substring(0, colonIndex).toLowerCase().split(';')[0];
        const value = line.substring(colonIndex + 1);
        
        if (property === 'attendee') {
          if (!currentEvent.attendees) currentEvent.attendees = [];
          currentEvent.attendees.push(value);
        } else {
          currentEvent[property] = value;
        }
      }
    }

    return events;
  } catch (error) {
    console.error('Error parsing iCal file:', error);
    throw new Error('Invalid iCal file format');
  }
}

/**
 * Parse iCal date string to JavaScript Date
 */
function parseICalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  
  // Remove timezone info and TZID parameter for simplicity
  const cleanDateStr = dateStr.split(';')[0].replace(/TZID=[^:]*:/, '');
  
  // Handle different date formats
  if (cleanDateStr.includes('T')) {
    // Format: 20240101T120000 or 20240101T120000Z
    const year = parseInt(cleanDateStr.substring(0, 4));
    const month = parseInt(cleanDateStr.substring(4, 6)) - 1; // JavaScript months are 0-indexed
    const day = parseInt(cleanDateStr.substring(6, 8));
    const hour = parseInt(cleanDateStr.substring(9, 11));
    const minute = parseInt(cleanDateStr.substring(11, 13));
    const second = parseInt(cleanDateStr.substring(13, 15)) || 0;
    
    return new Date(year, month, day, hour, minute, second);
  } else {
    // All-day event format: 20240101
    const year = parseInt(cleanDateStr.substring(0, 4));
    const month = parseInt(cleanDateStr.substring(4, 6)) - 1;
    const day = parseInt(cleanDateStr.substring(6, 8));
    
    return new Date(year, month, day);
  }
}

/**
 * Convert recurring schedules to iCal format
 */
export function generateICalFromSchedules(
  schedules: RecurringSchedule[],
  students: Student[],
  teachers: User[],
  options: CalendarExportOptions = { name: 'Music Lessons' }
): string {
  const calendar = ical({
    name: options.name,
    description: options.description || 'Music lesson schedule',
    timezone: options.timezone || DEFAULT_TIMEZONE,
    prodId: {
      company: 'MusicDott',
      product: 'Schedule Manager',
      language: 'EN',
    },
  });

  for (const schedule of schedules) {
    const student = students.find(s => s.id === schedule.studentId);
    const teacher = teachers.find(t => t.id === schedule.teacherId);

    if (!student) continue;

    // Create recurring event
    const event = calendar.createEvent({
      uid: `schedule-${schedule.id}@musicdott.com`,
      start: getNextOccurrence(schedule),
      end: getNextOccurrenceEnd(schedule),
      summary: `${schedule.instrument || 'Music'} Lesson - ${student.firstName} ${student.lastName}`,
      description: [
        `Student: ${student.firstName} ${student.lastName}`,
        `Instrument: ${schedule.instrument || 'Not specified'}`,
        `Teacher: ${teacher?.name || 'Not assigned'}`,
        schedule.notes ? `Notes: ${schedule.notes}` : '',
      ].filter(Boolean).join('\n'),
      location: schedule.location || 'Studio',
      organizer: teacher ? {
        name: teacher.name,
        email: teacher.email,
      } : undefined,
    });

    // Add recurrence rule
    if (schedule.recurrenceType !== 'once') {
      const rrule = buildRecurrenceRule(schedule);
      if (rrule) {
        event.repeating(rrule);
      }
    }

    // Add alarm if requested
    if (options.includeAlarms) {
      event.createAlarm({
        type: 'display',
        trigger: 15 * 60, // 15 minutes before
        description: 'Music lesson reminder',
      });
    }
  }

  return calendar.toString();
}

/**
 * Convert parsed iCal events to RecurringSchedule format
 */
export function convertICalToSchedules(
  events: ParsedCalendarEvent[],
  userId: number,
  defaultStudentId?: number
): Partial<RecurringSchedule>[] {
  return events.map(event => {
    const startTime = moment(event.startTime).format('HH:mm');
    const endTime = moment(event.endTime).format('HH:mm');
    const dayOfWeek = event.startTime.getDay();

    const schedule: Partial<RecurringSchedule> = {
      userId,
      studentId: defaultStudentId || 0, // Will need to be mapped manually
      dayOfWeek,
      startTime,
      endTime,
      recurrenceType: event.recurring ? mapRecurrenceType(event.recurring.frequency) : 'once',
      location: event.location || '',
      notes: [
        event.description || '',
        event.attendees?.map(a => `Attendee: ${a.name || a.email}`).join(', ') || '',
      ].filter(Boolean).join('\n'),
      isActive: true,
    };

    // Handle bi-weekly patterns
    if (event.recurring?.frequency === 'WEEKLY' && event.recurring.interval === 2) {
      schedule.recurrenceType = 'biweekly';
      schedule.biWeeklyPattern = 'even'; // Default, may need manual adjustment
    }

    return schedule;
  });
}

// Helper functions

function generateUID(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@musicdott.com`;
}

function parseRecurrenceRule(rrule: string): ParsedCalendarEvent['recurring'] {
  const rules = rrule.split(';').reduce((acc: any, rule) => {
    const [key, value] = rule.split('=');
    acc[key] = value;
    return acc;
  }, {});

  const recurring: ParsedCalendarEvent['recurring'] = {
    frequency: rules.FREQ as 'WEEKLY' | 'DAILY' | 'MONTHLY',
  };

  if (rules.INTERVAL) {
    recurring.interval = parseInt(rules.INTERVAL);
  }

  if (rules.BYDAY) {
    recurring.byDay = rules.BYDAY.split(',');
  }

  if (rules.UNTIL) {
    recurring.until = new Date(rules.UNTIL);
  }

  return recurring;
}

function buildRecurrenceRule(schedule: RecurringSchedule): any {
  switch (schedule.recurrenceType) {
    case 'weekly':
      return {
        freq: 'WEEKLY',
        byDay: [getDayAbbreviation(schedule.dayOfWeek)],
      };
    
    case 'biweekly':
      return {
        freq: 'WEEKLY',
        interval: 2,
        byDay: [getDayAbbreviation(schedule.dayOfWeek)],
      };
    
    case 'monthly':
      return {
        freq: 'MONTHLY',
        byDay: [getDayAbbreviation(schedule.dayOfWeek)],
      };
    
    default:
      return null;
  }
}

function getDayAbbreviation(dayOfWeek: number): string {
  const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  return days[dayOfWeek];
}

function mapRecurrenceType(frequency: string): 'weekly' | 'biweekly' | 'monthly' | 'once' {
  switch (frequency) {
    case 'WEEKLY':
      return 'weekly';
    case 'MONTHLY':
      return 'monthly';
    default:
      return 'once';
  }
}

function getNextOccurrence(schedule: RecurringSchedule): Date {
  const now = moment().tz(DEFAULT_TIMEZONE);
  const dayOfWeek = schedule.dayOfWeek;
  const [hours, minutes] = schedule.startTime.split(':').map(Number);
  
  // Find next occurrence of this day
  let nextOccurrence = now.clone().day(dayOfWeek).hour(hours).minute(minutes).second(0);
  
  // If it's in the past, move to next week
  if (nextOccurrence.isBefore(now)) {
    nextOccurrence.add(1, 'week');
  }
  
  return nextOccurrence.toDate();
}

function getNextOccurrenceEnd(schedule: RecurringSchedule): Date {
  const start = getNextOccurrence(schedule);
  const [hours, minutes] = schedule.endTime.split(':').map(Number);
  const end = moment(start).hour(hours).minute(minutes).second(0);
  return end.toDate();
}

/**
 * Validate iCal file content
 */
export function validateICalFile(icsContent: string): boolean {
  try {
    const lines = icsContent.split('\n');
    
    // Check for required components
    const hasCalendarBegin = lines.some(line => line.trim() === 'BEGIN:VCALENDAR');
    const hasCalendarEnd = lines.some(line => line.trim() === 'END:VCALENDAR');
    const hasVersion = lines.some(line => line.startsWith('VERSION:'));
    
    return hasCalendarBegin && hasCalendarEnd && hasVersion;
  } catch (error) {
    return false;
  }
}

/**
 * Generate sample iCal for testing
 */
export function generateSampleICalendar(): string {
  const calendar = ical({
    name: 'Sample Music Lessons',
    description: 'Sample calendar for testing import functionality',
    timezone: DEFAULT_TIMEZONE,
  });

  // Add sample event
  calendar.createEvent({
    uid: 'sample-1@musicdott.com',
    start: moment().add(1, 'day').hour(14).minute(0).toDate(),
    end: moment().add(1, 'day').hour(15).minute(0).toDate(),
    summary: 'Piano Lesson - John Doe',
    description: 'Weekly piano lesson with beginner student',
    location: 'Studio A',
  }).repeating({
    freq: 'WEEKLY',
    count: 10,
  });

  return calendar.toString();
}

/**
 * Detect conflicts between potential schedules and existing schedules
 */
export function detectImportConflicts(
  potentialSchedules: Partial<RecurringSchedule>[],
  existingSchedules: RecurringSchedule[]
): any[] {
  const conflicts: any[] = [];
  
  for (let i = 0; i < potentialSchedules.length; i++) {
    const potential = potentialSchedules[i];
    const potentialConflicts = detectScheduleConflicts(potential, existingSchedules);
    
    if (potentialConflicts.length > 0) {
      conflicts.push({
        index: i,
        schedule: potential,
        conflicts: potentialConflicts,
      });
    }
  }
  
  return conflicts;
}

/**
 * Detect conflicts between a schedule and existing schedules
 */
export function detectScheduleConflicts(
  schedule: Partial<RecurringSchedule>,
  existingSchedules: RecurringSchedule[]
): RecurringSchedule[] {
  const conflicts: RecurringSchedule[] = [];
  
  if (!schedule.dayOfWeek || !schedule.startTime || !schedule.endTime) {
    return conflicts;
  }
  
  const startTime = parseTimeString(schedule.startTime);
  const endTime = parseTimeString(schedule.endTime);
  
  for (const existing of existingSchedules) {
    // Check if same day of week
    if (existing.dayOfWeek !== schedule.dayOfWeek) continue;
    
    const existingStart = parseTimeString(existing.startTime);
    const existingEnd = parseTimeString(existing.endTime);
    
    // Check for time overlap
    if (timeOverlaps(startTime, endTime, existingStart, existingEnd)) {
      conflicts.push(existing);
    }
  }
  
  return conflicts;
}

/**
 * Parse time string to minutes since midnight
 */
function parseTimeString(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Check if two time ranges overlap
 */
function timeOverlaps(
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean {
  return start1 < end2 && end1 > start2;
}