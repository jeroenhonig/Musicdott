/**
 * Lesson reminder scheduler — sends email reminders the day before a session.
 * Runs daily at 07:00 UTC (= 08:00 or 09:00 Amsterdam time depending on DST).
 * Follows the same pattern as birthday-scheduler.ts.
 */
import { CronJob } from 'cron';
import { storage } from '../storage-wrapper';
import { sendLessonReminderEmail } from './user-email-service';
import { cronHealthMonitor } from './cron-health-monitor';

const JOB_NAME = 'lesson_reminders';
const CRON_SCHEDULE = '0 7 * * *'; // 07:00 UTC daily

class LessonReminderScheduler {
  private job: CronJob | null = null;

  constructor() {
    this.initializeScheduledJobs();
  }

  private initializeScheduledJobs() {
    try {
      cronHealthMonitor.registerJob(JOB_NAME, CRON_SCHEDULE).catch((err) => {
        console.error('Failed to register lesson reminder job with health monitor:', err);
      });

      this.job = new CronJob(
        CRON_SCHEDULE,
        this.runReminderCheck.bind(this),
        null,
        false,
        'UTC',
      );

      this.job.start();
      console.log('✅ Lesson reminder scheduler initialized: daily at 07:00 UTC');
    } catch (error) {
      console.error('❌ Failed to initialize lesson reminder scheduler:', error);
    }
  }

  private async runReminderCheck() {
    const startTime = Date.now();
    console.log('📅 Starting lesson reminder check...');

    try {
      await cronHealthMonitor.recordJobStart({
        jobName: JOB_NAME,
        cronSchedule: CRON_SCHEDULE,
        nextScheduledRun: this.job?.nextDate()?.toJSDate(),
      });

      const sent = await this.sendTomorrowReminders();
      const duration = Date.now() - startTime;

      console.log(`✅ Lesson reminder check done in ${duration}ms — sent: ${sent}`);

      await cronHealthMonitor.recordJobCompletion({
        jobName: JOB_NAME,
        status: 'success',
        duration,
        result: { remindersSent: sent },
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Lesson reminder check failed:', errorMessage);

      await cronHealthMonitor.recordJobCompletion({
        jobName: JOB_NAME,
        status: 'failed',
        duration,
        error: errorMessage,
      });
    }
  }

  /**
   * Core logic: find sessions for tomorrow, look up student emails, send reminders.
   * Returns the number of reminder emails sent (or attempted).
   */
  async sendTomorrowReminders(): Promise<number> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const sessions = await storage.getSessionsForDate(tomorrow);
    if (!sessions.length) return 0;

    let sent = 0;

    await Promise.allSettled(
      sessions.map(async (session) => {
        try {
          if (!session.studentId) return;

          const student = await storage.getStudent(session.studentId);
          if (!student?.email) return;
          // Skip placeholder emails generated for students without a real address
          if (student.email.includes('@student.musicdott.app')) return;

          // Best-effort: get teacher name
          let teacherName = 'Je docent';
          try {
            if (session.userId) {
              const teacher = await storage.getUser(session.userId);
              if (teacher?.name) teacherName = teacher.name;
            }
          } catch {
            // Ignore — teacherName stays as fallback
          }

          // Best-effort: get school name
          let schoolName = 'je muziekschool';
          try {
            if (session.schoolId) {
              const school = await storage.getSchool(session.schoolId);
              if (school?.name) schoolName = school.name;
            }
          } catch {
            // Ignore
          }

          await sendLessonReminderEmail({
            to: student.email,
            studentName: student.name,
            teacherName,
            lessonDate: tomorrow,
            startTime: session.startTime instanceof Date
              ? session.startTime.toTimeString().slice(0, 5)
              : null,
            location: null, // sessions table has no location column
            schoolName,
          });

          sent++;
        } catch (err: any) {
          console.error(`[LessonReminder] Failed for session ${session.id}:`, err.message);
        }
      }),
    );

    return sent;
  }

  public async runImmediately(): Promise<number> {
    console.log('📅 Manual lesson reminder check triggered...');
    return this.sendTomorrowReminders();
  }

  public stop(): void {
    this.job?.stop();
    console.log('Lesson reminder scheduler stopped');
  }

  public getStatus(): { running: boolean; nextRun: Date | null } {
    if (!this.job) return { running: false, nextRun: null };
    return {
      running: this.job.running,
      nextRun: this.job.nextDate().toJSDate(),
    };
  }
}

export const lessonReminderScheduler = new LessonReminderScheduler();
