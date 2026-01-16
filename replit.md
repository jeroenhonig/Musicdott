# MusicDott 2.0 - Advanced Music Education Platform

## Overview
MusicDott 2.0 is a cutting-edge music education platform that has successfully modernized from PHP to React with comprehensive gamification, video feedback, and PWA capabilities. The platform now features a complete 8-week development roadmap implementation including points/streaks/badges system, interactive assignments with multimedia tasks, video timeline annotations, and EU data compliance. It serves music schools and teachers with advanced student engagement tools, real-time practice tracking, and mobile-first PWA experience.

## Recent Implementation (December 2025)
✅ **Music Notation Tools Suite - Complete**:
- **Sheet Music Viewer** (`/sheet-music`): MusicXML rendering using OpenSheetMusicDisplay with zoom, pan, and responsive display
- **Tablature Viewer** (`/tablature`, `/tabs`): Guitar Pro/MusicXML tablature with alphaTab integration, MIDI playback, and AlphaTex markup editor
- **ABC Notation Editor** (`/abc-notation`, `/abc`): ABC notation editor using abcjs library with live rendering and MIDI playback support
- **Flat.io Embed** (`/flat`, `/flat-embed`): Interactive sheet music embedding from Flat.io community with playback controls
- **Speech-to-Note Transcription** (`/speech-to-note`, `/transcribe`): Real-time pitch detection via Web Audio API, converts sung/played notes to ABC notation with visual pitch feedback
- **Supporting Libraries**: opensheetmusicdisplay, @coderline/alphatab, abcjs, flat-embed
- **All Routes Protected**: Music notation pages require authentication for access

✅ **Music Notation Content Blocks - Complete**:
- **Embeddable Blocks in Lessons & Songs**: All 5 music notation types (sheet_music, tablature, abc_notation, flat_embed, speech_to_note) are now available as content blocks
- **SongContentManager Integration**: Add ABC Notation, Tablature, or Flat.io Score blocks to songs with inline editing
- **SimpleLessonViewer Integration**: Music notation blocks render in lesson content with lazy loading
- **SongContentViewer Integration**: Music notation blocks display in song view mode with proper fallbacks
- **Content Block Parser**: NormalizedContentBlock interface extended with content/scoreId fields, metadata preservation during normalization
- **Consistent Data Flow**: Blocks work with both legacy (block.data.content) and normalized (block.content) accessors

## Recent Implementation (October 2025)
✅ **Comprehensive Notification System - Complete**:
- **Notification Infrastructure**: Complete notification database schema with userId, schoolId, type, title, message, link, metadata, isRead fields
- **NotificationService**: 8+ storage methods including createNotification, getUserNotifications, getUnreadCount, markAsRead, markAllAsRead, cleanupOldNotifications
- **Birthday Notifications**: Automated cron job scheduler (daily 9 AM UTC) checks student birthdates and creates notifications via NotificationService
- **Message & Assignment Notifications**: Automatic notification creation when teachers send messages or create assignments for students
- **Notification API Endpoints**: Complete REST API with GET /api/notifications, GET /api/notifications/unread-count, PUT /api/notifications/:id/mark-as-read, PUT /api/notifications/mark-all-as-read
- **NotificationBell Component**: Frontend bell icon with dropdown, unread badge, notification list, mark-as-read functionality integrated in mobile-header
- **Student Birthdate Field**: Added birthdate field to student creation/update forms with proper validation
- **Multi-tenant Security**: All notification endpoints enforce requireAuth + school scoping, schoolId properly derived from student records to prevent cross-tenant data leakage
- **Bug Fixes Applied**: Storage wrapper notification delegations, sendNotification alias, schoolId null constraint violations fixed
- **Testing Status**: All API endpoints tested and verified working (login, notifications list, unread count, mark-as-read flows)

✅ **Cron Job Health Monitoring System - Complete**:
- **CronHealthMonitor Service**: Comprehensive monitoring service for all scheduled cron jobs with database persistence in cron_job_health table
- **Health Tracking**: Records job execution start/completion, success/failure status, run duration, error messages, and consecutive failure counts
- **Birthday Scheduler Integration**: Daily birthday check scheduler (9 AM UTC) fully integrated with health monitoring, logs all execution metrics
- **Public Health Endpoint** (`/health/cron`): Unauthenticated endpoint returning basic stats (totalJobs, activeJobs, healthyJobs, failingJobs) for external monitoring
- **Admin Health Endpoints** (`/api/admin/cron-health`, `/api/admin/cron-health/:jobName`): Authenticated school owner/platform owner endpoints with complete job details, execution history, and error logs
- **Security Implementation**: Admin endpoints enforce requireAuth + requireSchoolOwner middleware for proper role-based access control
- **Graceful Shutdown**: Birthday scheduler properly stops on server shutdown, preventing orphaned processes
- **Production Ready**: All endpoints tested and verified (public access works, admin endpoints secured, auth flow functional)
- **Architect Approved**: System confirmed production-ready for beta launch with comprehensive health monitoring infrastructure

✅ **Platform Owner Customer Service System - Complete**:
- **Customer Service Dashboard at /owners-dashboard**: New "Customer Service" tab for MusicDott team to manage all clients
- **Four Core Customer Service Features**:
  - **User Management & Search**: Search users by name/username/email, view complete user profiles with school context
  - **Password Reset Tool**: Secure password reset for any user with audit logging, forces password change on next login
  - **Invoice/Billing Management**: View all school invoices, filter by payment status, update payment statuses (current/overdue/suspended/canceled)
  - **Admin Action Audit Log**: Complete audit trail of all platform owner actions with actor, target, metadata, and timestamps
- **Security Architecture**: 
  - requirePlatformOwner middleware enforces platform_owner/admin roles on all /api/platform/* endpoints
  - All admin actions automatically logged to admin_actions table with actor_id, target details, metadata, IP address, and user agent
  - Role-based access: platform_owner and admin roles have global scope across all schools for customer service
- **API Endpoints**: `/api/platform/users/:id/reset-password`, `/api/platform/users/:id`, `/api/platform/billing`, `/api/platform/billing/:id/status`, `/api/platform/audit-log`
- **Audit Logging**: Every privileged action (password resets, user updates, billing changes) creates immutable audit record

✅ **School Owner Dashboard - Complete**:
- **New School Dashboard at /school-dashboard**: Dedicated analytics dashboard for school owners with school-specific metrics
- **Three API Endpoints for School Analytics**:
  - `/api/school/dashboard-stats`: Total teachers, students, lessons, songs, sessions with month-over-month growth
  - `/api/school/student-activity`: Recent student practice activity with engagement metrics
  - `/api/school/performance-trends`: 6-month performance trends with active students and practice duration
- **Interactive Visualizations**: Line charts for student engagement trends, bar charts for practice duration, comprehensive overview cards
- **Role-Based Access Control**: requireSchoolOwner middleware ensures only school_owner and teacher roles can access school-specific data
- **Multi-tenant Data Scoping**: All queries properly scoped to session.user.schoolId for secure data isolation
- **Loading States & Error Handling**: Conditional rendering prevents crashes, graceful fallbacks for empty data states

✅ **Production Launch Preparation - Phase 4 (Beta Deployment Ready) Complete**:
- **Stability & Performance (Phase 2)**:
  - Production cleanup with comprehensive error handling system
  - Central API error handler with route-level error boundaries
  - Database smart retry logic with constraint violation detection
  - N+1 query optimization for schedule endpoints
  - Storage wrapper enhanced with user-scoped methods
  
- **UX Polish (Phase 3) - COMPLETED**:
  - Scoped dark mode transitions (200ms) optimized for performance
  - Comprehensive micro-interaction utilities (hover-lift, glass-button, interactive, etc.)
  - Skeleton loading components for improved perceived performance
  - Mobile responsiveness verified: MobileNavigation, GestureNavigation, responsive layouts
  - Enhanced empty states with actionable CTAs
  - Smooth visual feedback throughout the app
  - All improvements architect-reviewed and verified

- **Beta Deployment Preparation (Phase 4) - COMPLETED**:
  - Code cleanup: 47+ old test/import scripts archived
  - Security hardening verified: Helmet CSP, CORS, rate limiting, input sanitization
  - Database optimization: Comprehensive indexing on all query paths
  - Health monitoring: /health and /api/health endpoints operational
  - Production logging: Graceful shutdown, error handling, request tracking
  - Deployment guide: BETA_DEPLOYMENT_GUIDE.md with complete setup instructions
  - Final verification: Login flow, API access, database connectivity all tested
  - Architect approved: System confirmed production-ready for beta launch

- **Previous Features (September 2025)**:
  - Advanced gamification system with points, streaks, badges, and leaderboards
  - Video capture integration in teacher chat with timeline feedback
  - Enhanced assignment builder with 6 multimedia task types
  - Full PWA implementation with offline support and push notifications
  - EU data compliance architecture with UUID-based anonymization
  - Comprehensive AI system with OpenAI integration (4 implementation phases)
  - Complete GrooveScribe auto-embed system with paste detection  
  - AI Dashboard and GrooveConverter tools fully integrated
  - Real-time collaborative notation editor with VexFlow, WebSocket sync, and multi-user editing
  - Complete MusicDott 1.0 to 2.0 import system with CSV converter, student/schedule import, and iCal integration (103+ students, 99+ weekly lessons)

## User Preferences
- Username format preference: Descriptive usernames combining school/teacher name
- Testing approach: Create realistic test accounts for drum school context
- Interface consistency: Lessons and songs creation forms should have matching design patterns

## System Architecture
The platform is built with a modern web stack enhanced for mobile-first PWA experience. The **Frontend** uses React.js with TypeScript, Wouter for routing, and shadcn/ui for components, adhering to an Apple-style liquid glass aesthetic with gamification widgets and video integration. The **Backend** is developed with Express.js and TypeScript, handling authentication via Passport.js with extended gamification and video processing APIs. **PostgreSQL** serves as the primary database with advanced UUID-based schema for EU compliance, managed by Drizzle ORM, with an in-memory storage fallback. Real-time features are supported by **WebSockets** and **Service Workers** for offline sync. Core architectural decisions include:
- **UI/UX**: Gamified interface with progress widgets, leaderboards, video capture components, enhanced assignment builders, PWA install prompts, and offline-capable design.
- **Technical Implementations**: Advanced gamification service with point rules, streak tracking, badge system; video capture with WebRTC and timeline annotations; interactive assignment builder with 6 multimedia task types; PWA with service worker, background sync, and push notifications.
- **Feature Specifications**: Complete gamification system (points/badges/leaderboards), video feedback in teacher chat, enhanced assignments with rubric grading, practice timer with automatic point awarding, PWA capabilities with offline support.
- **System Design**: Optimized for mobile performance with service worker caching, background sync for gamification events, UUID-based data architecture for EU compliance, and real-time synchronization between web and mobile experiences.

## External Dependencies
- **PostgreSQL**: Primary database for all persistent data.
- **Drizzle ORM**: ORM for interacting with PostgreSQL.
- **Passport.js**: Authentication middleware.
- **Shadcn/ui**: Frontend component library.
- **Wouter**: Routing library for React.
- **NodeMailer**: For sending automated email notifications (configured with Hostinger SMTP).
- **Stripe**: For automated monthly billing and subscription management.
- **YouTube oEmbed API**: For fetching video titles and thumbnails.
- **GrooveScribe**: For interactive drum pattern embedding (served from teacher.musicdott.com/groovescribe/GrooveEmbed.html).
- **Lucide React**: Icon library.