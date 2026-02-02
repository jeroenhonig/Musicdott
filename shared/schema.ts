import { pgTable, serial, integer, text, timestamp, boolean, jsonb, uuid, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Constants
export const USER_ROLES = {
  STUDENT: 'student',
  TEACHER: 'teacher',
  SCHOOL_OWNER: 'school_owner',
  PLATFORM_OWNER: 'platform_owner'
} as const;

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id"),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  role: text("role", { enum: ["student", "teacher", "school_owner", "platform_owner"] }).notNull(),
  instruments: text("instruments"),
  avatar: text("avatar"),
  bio: text("bio"),
  mustChangePassword: boolean("must_change_password").default(false),
  lastLoginAt: timestamp("last_login_at"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export const insertUserSchema = createInsertSchema(users);

// Student account creation schema
export const studentAccountCreateSchema = insertUserSchema.extend({
  mustChangePassword: z.boolean().default(true),
  role: z.literal("student"),
}).omit({
  id: true,
  lastLoginAt: true,
});

export type StudentAccountCreate = z.infer<typeof studentAccountCreateSchema>;

// Students table - aligned with actual database columns
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  userId: integer("user_id"),
  accountId: integer("account_id"), // Legacy field from MusicDott 1.0 import
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  birthdate: date("birthdate"), // Birthday for notification system
  instrument: text("instrument"),
  level: text("level"),
  assignedTeacherId: integer("assigned_teacher_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isActive: boolean("is_active").default(true),
});

export type Student = typeof students.$inferSelect;
export type InsertStudent = typeof students.$inferInsert;

// Lessons table - aligned with actual database columns  
export const lessons = pgTable("lessons", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id"), // Add missing schoolId field for multi-tenant support
  title: text("title").notNull(),
  description: text("description"),
  contentType: text("content_type"),
  instrument: text("instrument"),
  level: text("level"),
  category: text("category"),
  categoryId: integer("category_id"),
  userId: integer("user_id"),
  contentBlocks: text("content_blocks"),
  orderNumber: integer("order_number"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Lesson = typeof lessons.$inferSelect;
export type InsertLesson = typeof lessons.$inferInsert;

// Songs table - aligned with actual database columns
export const songs = pgTable("songs", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id"),
  title: text("title").notNull(),
  artist: text("artist"),
  composer: text("composer"),
  genre: text("genre"),
  bpm: integer("bpm"),
  duration: text("duration"),
  description: text("description"),
  difficulty: text("difficulty"),
  instrument: text("instrument"),
  level: text("level"),
  userId: integer("user_id"),
  contentBlocks: text("content_blocks"),
  groovePatterns: text("groove_patterns").array(),
  isActive: boolean("is_active").default(true),
  key: text("key"),
  tempo: text("tempo"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// GrooveScribe patterns table - stores drum patterns with GrooveScribe notation
export const groovePatterns = pgTable("groove_patterns", {
  id: text("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  grooveData: text("groove_data").notNull(), // GrooveScribe URL-encoded data
  bpm: integer("bpm").default(120),
  bars: integer("bars").default(4),
  timeSignature: text("time_signature").default("4/4"),
  difficulty: text("difficulty", { enum: ["beginner", "intermediate", "advanced"] }).default("beginner"),
  tags: text("tags").array(),
  categoryId: integer("category_id"),
  createdBy: integer("created_by"),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Groove patterns schema types
export const insertGroovePatternSchema = createInsertSchema(groovePatterns).omit({
  createdAt: true,
  updatedAt: true,
});

export type GroovePattern = typeof groovePatterns.$inferSelect;
export type InsertGroovePattern = z.infer<typeof insertGroovePatternSchema>;

export type Song = typeof songs.$inferSelect;
export type InsertSong = typeof songs.$inferInsert;

// AI-powered lesson recaps table
export const lessonRecaps = pgTable("lesson_recaps", {
  id: uuid("id").primaryKey(),
  lessonId: integer("lesson_id").notNull(),
  studentId: integer("student_id").notNull().references(() => users.id),
  rawNotes: text("raw_notes").notNull(),
  recapText: text("recap_text").notNull(),
  generatedByAi: boolean("generated_by_ai").default(true),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

export type LessonRecap = typeof lessonRecaps.$inferSelect;
export type InsertLessonRecap = typeof lessonRecaps.$inferInsert;

// Media transcripts for AI video/audio processing
export const mediaTranscripts = pgTable("media_transcripts", {
  id: uuid("id").primaryKey(),
  mediaId: uuid("media_id").notNull(),
  langCode: text("lang_code").notNull(),
  transcript: jsonb("transcript").notNull(),
  vtt: text("vtt").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type MediaTranscript = typeof mediaTranscripts.$inferSelect;
export type InsertMediaTranscript = typeof mediaTranscripts.$inferInsert;

// Practice plans for AI-powered personalized scheduling
export const practicePlans = pgTable("practice_plans", {
  id: uuid("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => users.id),
  weekStart: date("week_start").notNull(),
  plan: jsonb("plan").notNull(), // [{day, text, est_minutes}]
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  approved: boolean("approved").default(false),
  approvedBy: integer("approved_by"),
});

export type PracticePlan = typeof practicePlans.$inferSelect;
export type InsertPracticePlan = typeof practicePlans.$inferInsert;

// Weekly challenges for AI gamification engine
export const weeklyChallenges = pgTable("weekly_challenges", {
  id: uuid("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => users.id),
  weekStart: date("week_start").notNull(),
  challenges: jsonb("challenges").notNull(), // [{title, description, reward_points}]
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type WeeklyChallenge = typeof weeklyChallenges.$inferSelect;
export type InsertWeeklyChallenge = typeof weeklyChallenges.$inferInsert;

// Practice feedback for AI analysis
export const practiceFeedback = pgTable("practice_feedback", {
  id: uuid("id").primaryKey(),
  videoId: uuid("video_id").notNull(),
  studentId: integer("student_id").notNull().references(() => users.id),
  feedbackText: text("feedback_text").notNull(),
  audioMetrics: jsonb("audio_metrics"),
  videoMetrics: jsonb("video_metrics"),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

export type PracticeFeedback = typeof practiceFeedback.$inferSelect;
export type InsertPracticeFeedback = typeof practiceFeedback.$inferInsert;

// Transcriptions for AI music notation
export const transcriptions = pgTable("transcriptions", {
  id: uuid("id").primaryKey(),
  mediaId: uuid("media_id").notNull(),
  studentId: integer("student_id"),
  teacherId: integer("teacher_id"),
  midi: text("midi"), // Base64 encoded MIDI data
  musicxml: text("musicxml"),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  reviewed: boolean("reviewed").default(false),
});

export type Transcription = typeof transcriptions.$inferSelect;
export type InsertTranscription = typeof transcriptions.$inferInsert;

// Teacher Copilot sessions
export const copilotSessions = pgTable("copilot_sessions", {
  id: uuid("id").primaryKey(),
  teacherId: integer("teacher_id").notNull().references(() => users.id),
  studentId: integer("student_id"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
});

export type CopilotSession = typeof copilotSessions.$inferSelect;
export type InsertCopilotSession = typeof copilotSessions.$inferInsert;

// Teacher Copilot queries
export const copilotQueries = pgTable("copilot_queries", {
  id: uuid("id").primaryKey(),
  sessionId: uuid("session_id").notNull().references(() => copilotSessions.id),
  queryText: text("query_text").notNull(),
  response: jsonb("response").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CopilotQuery = typeof copilotQueries.$inferSelect;
export type InsertCopilotQuery = typeof copilotQueries.$inferInsert;

// Lesson progress tracking schema
export const lessonProgress = pgTable("lesson_progress", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  lessonId: integer("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["not_started", "in_progress", "completed", "mastered"] })
    .notNull()
    .default("not_started"),
  progress: integer("progress").default(0), // 0-100 percentage
  notes: text("notes"),
  timeSpent: integer("time_spent").default(0), // in minutes
  lastPracticed: timestamp("last_practiced"),
  teacherNotes: text("teacher_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export type LessonProgress = typeof lessonProgress.$inferSelect;
export type InsertLessonProgress = typeof lessonProgress.$inferInsert;

// Student achievement tracking
export const studentAchievements = pgTable("student_achievements", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  achievementType: text("achievement_type").notNull(), // "lesson_completed", "streak", "skill_mastered"
  title: text("title").notNull(),
  description: text("description"),
  pointsEarned: integer("points_earned").default(0),
  badgeIcon: text("badge_icon"),
  isVisible: boolean("is_visible").default(true),
  earnedAt: timestamp("earned_at").defaultNow().notNull()
});

export type StudentAchievement = typeof studentAchievements.$inferSelect;
export type InsertStudentAchievement = typeof studentAchievements.$inferInsert;

// Teacher assignment tracking
export const teacherAssignments = pgTable("teacher_assignments", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacher_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  dayOfWeek: text("day_of_week").notNull(), // Monday, Tuesday, etc.
  startTime: text("start_time").notNull(), // HH:MM format
  endTime: text("end_time").notNull(),
  location: text("location"),
  instrument: text("instrument").default("drums"),
  isActive: boolean("is_active").default(true),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export type TeacherAssignment = typeof teacherAssignments.$inferSelect;
export type InsertTeacherAssignment = typeof teacherAssignments.$inferInsert;

// Enhanced Schools table for multi-tenant architecture
export const schools = pgTable("schools", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: integer("owner_id").references(() => users.id), // School owner reference (nullable - can assign later)
  address: text("address"),
  city: text("city"),
  phone: text("phone"),
  website: text("website"),
  instruments: text("instruments"),
  description: text("description"),
  logo: text("logo"),
  // Branding customization fields
  primaryColor: text("primary_color").default("#3b82f6"), // Blue
  secondaryColor: text("secondary_color").default("#64748b"), // Slate
  accentColor: text("accent_color").default("#10b981"), // Emerald
  backgroundImage: text("background_image"), // Custom background image
  fontFamily: text("font_family").default("Inter"), // Default font
  customCss: text("custom_css"), // Custom CSS overrides
  brandingEnabled: boolean("branding_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// School aliases for slug -> school_id mapping (import support)
export const schoolAliases = pgTable("school_aliases", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// School memberships for user-school role associations
export const schoolMemberships = pgTable("school_memberships", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["owner", "teacher"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type School = typeof schools.$inferSelect;
export type InsertSchool = typeof schools.$inferInsert;
export type SchoolAlias = typeof schoolAliases.$inferSelect;
export type InsertSchoolAlias = typeof schoolAliases.$inferInsert;

// School branding schema for updates
export const schoolBrandingSchema = createInsertSchema(schools).pick({
  primaryColor: true,
  secondaryColor: true,
  accentColor: true,
  backgroundImage: true,
  fontFamily: true,
  customCss: true,
  brandingEnabled: true,
}).extend({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color").optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color").optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color").optional(),
  fontFamily: z.string().min(1).max(100).optional(),
  customCss: z.string().max(10000).optional(), // Limit custom CSS size
});

export type SchoolBranding = z.infer<typeof schoolBrandingSchema>;

// School memberships types
export type SchoolMembership = typeof schoolMemberships.$inferSelect;
export type InsertSchoolMembership = typeof schoolMemberships.$inferInsert;

export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull(),
  studentId: integer("student_id").notNull(),
  lessonId: integer("lesson_id"),
  songId: integer("song_id"),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  status: text("status").default("pending"),
});

export type Assignment = typeof assignments.$inferSelect;
export type InsertAssignment = typeof assignments.$inferInsert;

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull(),
  studentId: integer("student_id").notNull(),
  title: text("title").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  durationMin: integer("duration_min").default(30),
  notes: text("notes"),
});

export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;

export const achievementDefinitions = pgTable("achievement_definitions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  criteria: text("criteria").notNull(), // Achievement criteria as text
  badgeImage: text("badge_image"), // Badge image
  points: integer("points").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  type: text("type").notNull().default("general"), // Achievement type
  iconName: text("icon_name").notNull().default("award"), // Icon name
  badgeColor: text("badge_color").notNull().default("blue"), // Badge color  
  xpValue: integer("xp_value").notNull().default(10), // XP value for this achievement
});

export type AchievementDefinition = typeof achievementDefinitions.$inferSelect;
export type InsertAchievementDefinition = typeof achievementDefinitions.$inferInsert;

export const recurringSchedules = pgTable("recurring_schedules", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  studentId: integer("student_id").notNull(),
  dayOfWeek: text("day_of_week").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  location: text("location"),
  notes: text("notes"),
  timezone: text("timezone").default("Europe/Amsterdam"),
  frequency: text("frequency").default("WEEKLY"),
  isActive: boolean("is_active").default(true),
  // iCal integration fields
  iCalDtStart: text("ical_dtstart"), // Format: "20250915T194500"
  iCalRrule: text("ical_rrule"), // Format: "FREQ=WEEKLY;BYDAY=MO;BYHOUR=19;BYMINUTE=45;BYSECOND=0"
  iCalTzid: text("ical_tzid"), // Format: "Europe/Amsterdam"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type RecurringSchedule = typeof recurringSchedules.$inferSelect;
export type InsertRecurringSchedule = typeof recurringSchedules.$inferInsert;

export const practiceSessions = pgTable("practice_sessions", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  lessonId: integer("lesson_id"),
  songId: integer("song_id"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  duration: integer("duration"),
  notes: text("notes"),
});

export type PracticeSession = typeof practiceSessions.$inferSelect;
export type InsertPracticeSession = typeof practiceSessions.$inferInsert;

export const lessonCategories = pgTable("lesson_categories", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#3B82F6"),
  icon: text("icon").default("BookOpen"),
  userId: integer("user_id").notNull(),
});

export type LessonCategory = typeof lessonCategories.$inferSelect;
export type InsertLessonCategory = typeof lessonCategories.$inferInsert;

// Insert schemas for validation
export const insertSchoolSchema = createInsertSchema(schools);
export const insertSchoolMembershipSchema = createInsertSchema(schoolMemberships);
export const insertAssignmentSchema = createInsertSchema(assignments);
export const insertSessionSchema = createInsertSchema(sessions);
export const insertAchievementDefinitionSchema = createInsertSchema(achievementDefinitions);
export const insertStudentAchievementSchema = createInsertSchema(studentAchievements);
export const insertRecurringScheduleSchema = createInsertSchema(recurringSchedules);
export const insertPracticeSessionSchema = createInsertSchema(practiceSessions);
export const insertLessonCategorySchema = createInsertSchema(lessonCategories);
// Secure update schema that prevents manipulation of immutable fields (schoolId, userId)
export const updateLessonCategorySchema = createInsertSchema(lessonCategories).omit({
  id: true,
  schoolId: true, // Immutable - prevents cross-tenant attacks
  userId: true,   // Immutable - prevents ownership reassignment
});
export const insertLessonSchema = createInsertSchema(lessons).omit({
  id: true,
  userId: true,   // Will be set automatically from authenticated user
  createdAt: true,
  updatedAt: true,
});
export const insertSongSchema = createInsertSchema(songs).omit({
  id: true,
  schoolId: true, // Will be set automatically from user context
  userId: true,   // Will be set automatically from authenticated user
  createdAt: true,
  updatedAt: true,
});
export const insertStudentSchema = createInsertSchema(students);

// Extended schema for student creation with account credentials and parent info
export const createStudentWithAccountSchema = z.object({
  // User account fields
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  
  // Student profile fields
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required").optional().or(z.literal("")),
  phone: z.string().optional(),
  birthdate: z.string().optional(), // Birth date for birthday notifications
  instrument: z.string().min(1, "Instrument is required"),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  assignedTeacherId: z.union([z.string(), z.number()]).optional().transform(val => {
    if (!val || val === "unassigned" || val === "") return null;
    const parsed = typeof val === "string" ? parseInt(val) : val;
    return isNaN(parsed) ? null : parsed;
  }),
  
  // Additional fields
  age: z.string().optional(),
  parentName: z.string().optional(),
  parentEmail: z.string().email("Valid parent email is required").optional().or(z.literal("")),
  parentPhone: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateStudentWithAccount = z.infer<typeof createStudentWithAccountSchema>;

export const insertLessonProgressSchema = createInsertSchema(lessonProgress);
export const insertTeacherAssignmentSchema = createInsertSchema(teacherAssignments);

// Payment and billing schemas
export const paymentHistory = pgTable("payment_history", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull(),
  amount: integer("amount").notNull(), // in cents
  currency: text("currency").default("EUR"),
  status: text("status").notNull(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PaymentHistory = typeof paymentHistory.$inferSelect;
export type InsertPaymentHistory = typeof paymentHistory.$inferInsert;

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull(),
  planType: text("plan_type").notNull().default("standard"),
  status: text("status").notNull().default("active"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeCustomerId: text("stripe_customer_id"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

export const schoolBillingSummary = pgTable("school_billing_summary", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull(),
  currentPlan: text("current_plan").default("standard"),
  teacherCount: integer("teacher_count").default(1),
  studentCount: integer("student_count").default(0),
  lastBillingAmount: integer("last_billing_amount").default(0),
  nextBillingAmount: integer("next_billing_amount").default(0),
  lastBillingDate: timestamp("last_billing_date"),
  nextBillingDate: timestamp("next_billing_date"),
  paymentStatus: text("payment_status").default("current"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type SchoolBillingSummary = typeof schoolBillingSummary.$inferSelect;
export type InsertSchoolBillingSummary = typeof schoolBillingSummary.$inferInsert;

export const billingAuditLog = pgTable("billing_audit_log", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull(),
  eventType: text("event_type").notNull(),
  description: text("description"),
  amount: integer("amount"),
  oldValues: text("old_values"),
  newValues: text("new_values"),
  processingTime: integer("processing_time"),
  errorMessage: text("error_message"),
  performedBy: integer("performed_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type BillingAuditLog = typeof billingAuditLog.$inferSelect;
export type InsertBillingAuditLog = typeof billingAuditLog.$inferInsert;

// ========================================
// MUSICDOTT 2.0 ADVANCED FEATURES SCHEMA
// ========================================

// 1. GAMIFICATION SYSTEM
// Point rules configuration
export const pointRules = pgTable("point_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").unique().notNull(), // e.g. "timer.minute_logged"
  points: integer("points").notNull(),
  maxPerDay: integer("max_per_day"), // null = unlimited
  requiresProof: boolean("requires_proof").default(false),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PointRule = typeof pointRules.$inferSelect;
export type InsertPointRule = typeof pointRules.$inferInsert;

// Point events (audit log)
export const pointEvents = pgTable("point_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  studioId: uuid("studio_id").notNull(),
  ruleKey: text("rule_key").notNull(),
  points: integer("points").notNull(),
  occurredAt: timestamp("occurred_at").defaultNow().notNull(),
  idempotencyKey: text("idempotency_key").unique(),
  proofAssetId: uuid("proof_asset_id"),
  createdBy: uuid("created_by"), // teacher-id for manual awards
  metadata: jsonb("metadata"),
});

export type PointEvent = typeof pointEvents.$inferSelect;
export type InsertPointEvent = typeof pointEvents.$inferInsert;

// Student streaks
export const streaks = pgTable("streaks", {
  userId: uuid("user_id").primaryKey(),
  current: integer("current").notNull().default(0),
  longest: integer("longest").notNull().default(0),
  lastActivityDate: date("last_activity_date"),
  graceTokens: integer("grace_tokens").notNull().default(1), // reset monthly
});

export type Streak = typeof streaks.$inferSelect;
export type InsertStreak = typeof streaks.$inferInsert;

// Badge definitions
export const badges = pgTable("badges", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").unique().notNull(), // "first_7_day_streak"
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  condition: jsonb("condition").notNull(), // rule engine JSON
});

export type Badge = typeof badges.$inferSelect;
export type InsertBadge = typeof badges.$inferInsert;

// User badges (earned)
export const userBadges = pgTable("user_badges", {
  userId: uuid("user_id").notNull(),
  badgeKey: text("badge_key").notNull(),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
});

export type UserBadge = typeof userBadges.$inferSelect;
export type InsertUserBadge = typeof userBadges.$inferInsert;

// 2. INTERACTIVE ASSIGNMENTS SYSTEM
// Enhanced assignments with multimedia tasks
export const assignmentsV2 = pgTable("assignments_v2", {
  id: uuid("id").primaryKey().defaultRandom(),
  studioId: uuid("studio_id").notNull(),
  authorId: uuid("author_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  dueAt: timestamp("due_at"),
  rubric: jsonb("rubric"), // [{criterion, weight, scale:[0..3]}]
  visibility: text("visibility").notNull().default("assigned"), // or 'library'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type AssignmentV2 = typeof assignmentsV2.$inferSelect;
export type InsertAssignmentV2 = typeof assignmentsV2.$inferInsert;

// Assignment targets (classes or individuals)
export const assignmentTargets = pgTable("assignment_targets", {
  assignmentId: uuid("assignment_id").notNull(),
  classId: uuid("class_id"),
  studentId: uuid("student_id"),
});

export type AssignmentTarget = typeof assignmentTargets.$inferSelect;
export type InsertAssignmentTarget = typeof assignmentTargets.$inferInsert;

// Assignment tasks (subtasks within assignment)
export const assignmentTasks = pgTable("assignment_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  assignmentId: uuid("assignment_id").notNull(),
  kind: text("kind").notNull(), // 'view','play','record','upload','reflect'
  payload: jsonb("payload"), // e.g. bpm, bars, link, prompt
  position: integer("position").notNull(),
});

export type AssignmentTask = typeof assignmentTasks.$inferSelect;
export type InsertAssignmentTask = typeof assignmentTasks.$inferInsert;

// Assignment assets (attachments)
export const assignmentAssets = pgTable("assignment_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  assignmentId: uuid("assignment_id").notNull(),
  assetId: uuid("asset_id").notNull(),
});

export type AssignmentAsset = typeof assignmentAssets.$inferSelect;
export type InsertAssignmentAsset = typeof assignmentAssets.$inferInsert;

// Assignment submissions
export const assignmentSubmissions = pgTable("assignment_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  assignmentId: uuid("assignment_id").notNull(),
  studentId: uuid("student_id").notNull(),
  status: text("status").notNull().default("in_progress"), // 'submitted','graded'
  reflection: text("reflection"),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AssignmentSubmission = typeof assignmentSubmissions.$inferSelect;
export type InsertAssignmentSubmission = typeof assignmentSubmissions.$inferInsert;

// Submission items (evidence per task)
export const submissionItems = pgTable("submission_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  submissionId: uuid("submission_id").notNull(),
  taskId: uuid("task_id").notNull(),
  assetId: uuid("asset_id"),
  note: text("note"),
});

export type SubmissionItem = typeof submissionItems.$inferSelect;
export type InsertSubmissionItem = typeof submissionItems.$inferInsert;

// 3. VIDEO FEEDBACK SYSTEM
// Practice videos with processing status
export const practiceVideos = pgTable("practice_videos", {
  id: uuid("id").primaryKey().defaultRandom(),
  studioId: uuid("studio_id").notNull(),
  studentId: uuid("student_id").notNull(),
  assignmentId: uuid("assignment_id"), // optional
  assetId: uuid("asset_id").notNull(),
  durationSec: integer("duration_sec"),
  status: text("status").notNull().default("processing"), // 'ready','failed'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PracticeVideo = typeof practiceVideos.$inferSelect;
export type InsertPracticeVideo = typeof practiceVideos.$inferInsert;

// Video timeline comments
export const videoComments = pgTable("video_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  videoId: uuid("video_id").notNull(),
  authorId: uuid("author_id").notNull(), // teacher or student (self-note)
  atMs: integer("at_ms").notNull(),
  body: text("body").notNull(),
  kind: text("kind").default("comment"), // 'comment','marker'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type VideoComment = typeof videoComments.$inferSelect;
export type InsertVideoComment = typeof videoComments.$inferInsert;

// 4. ASSETS & MULTIMEDIA SYSTEM
// Universal assets table for S3 storage
export const assets = pgTable("assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  studioId: uuid("studio_id").notNull(),
  uploaderId: uuid("uploader_id").notNull(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  s3Key: text("s3_key").notNull(),
  s3Bucket: text("s3_bucket").notNull(),
  processingStatus: text("processing_status").default("pending"), // 'ready','failed','processing'
  metadata: jsonb("metadata"), // thumbnails, duration, waveform, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Asset = typeof assets.$inferSelect;
export type InsertAsset = typeof assets.$inferInsert;

// 5. ENHANCED PRACTICE TRACKING
// Enhanced practice sessions with gamification events
export const practiceSessionsV2 = pgTable("practice_sessions_v2", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").notNull(),
  lessonId: uuid("lesson_id"),
  songId: uuid("song_id"),
  assignmentId: uuid("assignment_id"), // optional
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  durationMinutes: integer("duration_minutes"),
  notes: text("notes"),
  pointsEarned: integer("points_earned").default(0),
  idempotencyKey: text("idempotency_key").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PracticeSessionV2 = typeof practiceSessionsV2.$inferSelect;
export type InsertPracticeSessionV2 = typeof practiceSessionsV2.$inferInsert;

// 6. CLASSES/GROUPS SYSTEM
export const classes = pgTable("classes", {
  id: uuid("id").primaryKey().defaultRandom(),
  studioId: uuid("studio_id").notNull(),
  teacherId: uuid("teacher_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  instrument: text("instrument"),
  level: text("level"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Class = typeof classes.$inferSelect;
export type InsertClass = typeof classes.$inferInsert;

// Class enrollments
export const classEnrollments = pgTable("class_enrollments", {
  classId: uuid("class_id").notNull(),
  studentId: uuid("student_id").notNull(),
  enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
});

export type ClassEnrollment = typeof classEnrollments.$inferSelect;
export type InsertClassEnrollment = typeof classEnrollments.$inferInsert;

// Insert schemas for all new tables
export const insertPointRuleSchema = createInsertSchema(pointRules);
export const insertPointEventSchema = createInsertSchema(pointEvents);
export const insertStreakSchema = createInsertSchema(streaks);
export const insertBadgeSchema = createInsertSchema(badges);
export const insertUserBadgeSchema = createInsertSchema(userBadges);
export const insertAssignmentV2Schema = createInsertSchema(assignmentsV2);
export const insertAssignmentTargetSchema = createInsertSchema(assignmentTargets);
export const insertAssignmentTaskSchema = createInsertSchema(assignmentTasks);
export const insertAssignmentAssetSchema = createInsertSchema(assignmentAssets);
export const insertAssignmentSubmissionSchema = createInsertSchema(assignmentSubmissions);
export const insertSubmissionItemSchema = createInsertSchema(submissionItems);
export const insertPracticeVideoSchema = createInsertSchema(practiceVideos);
export const insertVideoCommentSchema = createInsertSchema(videoComments);
export const insertAssetSchema = createInsertSchema(assets);
export const insertPracticeSessionV2Schema = createInsertSchema(practiceSessionsV2);
export const insertClassSchema = createInsertSchema(classes);
export const insertClassEnrollmentSchema = createInsertSchema(classEnrollments);

// Legacy aliases for compatibility
export const schoolSubscriptions = subscriptions;
export const teacherSubscriptions = subscriptions;

// Subscription plans constant
export const subscriptionPlans = {
  standard: {
    id: 'standard',
    name: 'Standard',
    price: 2995, // €29.95 in cents
    features: ['Up to 25 students', 'Basic lesson management', 'Student progress tracking']
  },
  pro: {
    id: 'pro', 
    name: 'Pro',
    price: 4995, // €49.95 in cents
    features: ['Unlimited students', 'Advanced analytics', 'Custom branding', 'Priority support']
  }
} as const;

// Messages and communication
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull(),
  recipientId: integer("recipient_id").notNull(),
  senderType: text("sender_type").notNull(),
  recipientType: text("recipient_type").notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messageReplies = pgTable("message_replies", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull(),
  senderId: integer("sender_id").notNull(),
  senderType: text("sender_type"),
  content: text("reply").notNull(), // Map to actual DB column name 'reply'
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;
export type MessageReply = typeof messageReplies.$inferSelect;
export type InsertMessageReply = typeof messageReplies.$inferInsert;

export const insertPaymentHistorySchema = createInsertSchema(paymentHistory);
export const insertSubscriptionSchema = createInsertSchema(subscriptions);
export const insertSchoolBillingSummarySchema = createInsertSchema(schoolBillingSummary);
export const insertBillingAuditLogSchema = createInsertSchema(billingAuditLog);
// Billing alerts for admin notifications
export const billingAlerts = pgTable("billing_alerts", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull(),
  alertType: text("alert_type").notNull(),
  message: text("message").notNull(),
  severity: text("severity").default("info"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type BillingAlert = typeof billingAlerts.$inferSelect;
export type InsertBillingAlert = typeof billingAlerts.$inferInsert;

// Student-specific messages table with proper camelCase to snake_case mapping
export const studentMessages = pgTable("student_messages", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  teacherId: integer("teacher_id").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  response: text("response"),
  isRead: boolean("is_read").default(false),
  responseRead: boolean("response_read").default(false),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type StudentMessage = typeof studentMessages.$inferSelect;
export type InsertStudentMessage = typeof studentMessages.$inferInsert;

export const insertMessageSchema = createInsertSchema(messages);
export const insertMessageReplySchema = createInsertSchema(messageReplies);

// ========================================
// NOTIFICATIONS SYSTEM
// ========================================

// Actual notifications table for user notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  type: text("type", { 
    enum: ["birthday", "achievement", "assignment", "message", "practice_reminder", "lesson_reminder", "streak_milestone", "badge_earned", "general"] 
  }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link"), // Optional link to related resource (e.g., /students/123, /assignments/456)
  metadata: jsonb("metadata"), // Additional data (e.g., { studentId, achievementId, etc. })
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type NotificationCreate = z.infer<typeof insertNotificationSchema>;

// ========================================
// SETTINGS API TABLES - CRITICAL PRODUCTION FIX
// ========================================

// User notification preferences table
export const userNotifications = pgTable("user_notifications", {
  userId: integer("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  settings: jsonb("settings").notNull().default('{}'), // Notification preferences as JSON
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type UserNotifications = typeof userNotifications.$inferSelect;
export type InsertUserNotifications = typeof userNotifications.$inferInsert;

// User system preferences table
export const userPreferences = pgTable("user_preferences", {
  userId: integer("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  settings: jsonb("settings").notNull().default('{}'), // System preferences as JSON
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = typeof userPreferences.$inferInsert;

// ========================================
// SETTINGS VALIDATION SCHEMAS - CRITICAL PRODUCTION FIX
// ========================================

// Profile update validation schema
export const profileUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address").max(255),
  bio: z.string().max(500).optional(),
  instruments: z.string().max(255).optional(),
  avatar: z.string().url().optional().nullable(),
});

export type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;

// School settings update validation schema
export const schoolSettingsUpdateSchema = z.object({
  name: z.string().min(1, "School name is required").max(100),
  address: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  website: z.string().url().optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  instruments: z.string().max(255).optional().nullable(),
});

export type SchoolSettingsUpdateData = z.infer<typeof schoolSettingsUpdateSchema>;

// Notification settings validation schema
export const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean().default(true),
  pushNotifications: z.boolean().default(true),
  lessonReminders: z.boolean().default(true),
  assignmentNotifications: z.boolean().default(true),
  practiceReminders: z.boolean().default(true),
  scheduleUpdates: z.boolean().default(true),
  marketingEmails: z.boolean().default(false),
});

export type NotificationSettingsData = z.infer<typeof notificationSettingsSchema>;

// User preferences validation schema
export const preferenceSettingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).default("system"),
  language: z.string().max(10).default("en"),
  timezone: z.string().max(50).default("Europe/Amsterdam"),
  dateFormat: z.enum(["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"]).default("DD/MM/YYYY"),
  timeFormat: z.enum(["12h", "24h"]).default("24h"),
  autoSave: z.boolean().default(true),
});

export type PreferenceSettingsData = z.infer<typeof preferenceSettingsSchema>;

// Password change validation schema
export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one lowercase letter, one uppercase letter, and one number"),
});

export type PasswordChangeData = z.infer<typeof passwordChangeSchema>;

// Insert schemas for the new tables
export const insertUserNotificationsSchema = createInsertSchema(userNotifications).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  createdAt: true,
  updatedAt: true,
});

// Platform Admin Audit Log
export const adminActions = pgTable("admin_actions", {
  id: serial("id").primaryKey(),
  actorId: integer("actor_id").notNull(), // Platform owner who performed the action
  targetType: text("target_type").notNull(), // 'user', 'school', 'subscription', 'payment', etc.
  targetId: integer("target_id"), // ID of the affected entity
  action: text("action").notNull(), // 'password_reset', 'user_update', 'subscription_change', etc.
  metadata: jsonb("metadata"), // Additional context (old values, new values, reason, etc.)
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AdminAction = typeof adminActions.$inferSelect;
export type InsertAdminAction = typeof adminActions.$inferInsert;
export const insertAdminActionSchema = createInsertSchema(adminActions).omit({
  id: true,
  createdAt: true,
});

// Cron Job Health Monitoring
export const cronJobHealth = pgTable("cron_job_health", {
  id: serial("id").primaryKey(),
  jobName: text("job_name").notNull().unique(), // e.g. 'birthday_check', 'monthly_billing'
  lastRunAt: timestamp("last_run_at"),
  lastRunStatus: text("last_run_status"), // 'success', 'failed', 'running'
  lastRunDuration: integer("last_run_duration"), // milliseconds
  lastRunResult: jsonb("last_run_result"), // stores run metadata
  lastError: text("last_error"),
  nextScheduledRun: timestamp("next_scheduled_run"),
  successCount: integer("success_count").default(0),
  failureCount: integer("failure_count").default(0),
  isActive: boolean("is_active").default(true),
  cronSchedule: text("cron_schedule"), // e.g. '0 9 * * *'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type CronJobHealth = typeof cronJobHealth.$inferSelect;
export type InsertCronJobHealth = typeof cronJobHealth.$inferInsert;

// Re-export notation tables
export * from "./notation-schema";

// Re-export POS import tables
export * from "./pos-schema";
