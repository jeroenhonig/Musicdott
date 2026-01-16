import { storage } from "../storage-wrapper";
import { NotificationCreate } from "@shared/schema";

export class NotificationService {
  /**
   * Create a new notification for a user
   */
  async createNotification(notification: NotificationCreate): Promise<any> {
    return await storage.createNotification(notification);
  }

  /**
   * Alias for createNotification - used by routes for convenience
   */
  async sendNotification(notification: NotificationCreate): Promise<any> {
    return await this.createNotification(notification);
  }

  /**
   * Create notifications for multiple users (broadcast)
   */
  async createBulkNotifications(notifications: NotificationCreate[]): Promise<any[]> {
    const created = [];
    for (const notification of notifications) {
      try {
        const result = await storage.createNotification(notification);
        created.push(result);
      } catch (error) {
        console.error("Failed to create notification:", error);
      }
    }
    return created;
  }

  /**
   * Get all notifications for a user
   */
  async getUserNotifications(userId: number, schoolId: number, limit = 50): Promise<any[]> {
    return await storage.getAllUserNotifications(userId, schoolId, limit);
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: number, schoolId: number): Promise<number> {
    return await storage.getUnreadNotificationCount(userId, schoolId);
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: number, userId: number): Promise<boolean> {
    return await storage.markNotificationAsRead(notificationId, userId);
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: number, schoolId: number): Promise<number> {
    return await storage.markAllNotificationsAsRead(userId, schoolId);
  }

  /**
   * Delete old read notifications (older than 30 days)
   */
  async cleanupOldNotifications(): Promise<number> {
    return await storage.deleteOldNotifications(30);
  }

  /**
   * Create birthday notifications for students
   */
  async createBirthdayNotifications(): Promise<number> {
    console.log("🎂 Checking for birthdays today...");
    
    // Get all students with birthdays today
    const studentsWithBirthdaysToday = await storage.getStudentsWithBirthdayToday();
    
    if (studentsWithBirthdaysToday.length === 0) {
      console.log("No birthdays today");
      return 0;
    }

    console.log(`Found ${studentsWithBirthdaysToday.length} birthday(s) today!`);

    const notifications: NotificationCreate[] = [];

    for (const student of studentsWithBirthdaysToday) {
      // Calculate age if birthdate is available
      const age = student.birthdate 
        ? new Date().getFullYear() - new Date(student.birthdate).getFullYear()
        : null;

      const birthdayMessage = age 
        ? `${student.name} turns ${age} today! 🎂`
        : `It's ${student.name}'s birthday today! 🎂`;

      // Notify assigned teacher if exists
      if (student.assignedTeacherId) {
        notifications.push({
          userId: student.assignedTeacherId,
          schoolId: student.schoolId,
          type: "birthday",
          title: "Student Birthday 🎂",
          message: birthdayMessage,
          link: `/students/${student.id}`,
          metadata: {
            studentId: student.id,
            studentName: student.name,
            age: age,
          },
          isRead: false,
        });
      }

      // Also notify the student creator (usually the school owner or admin)
      if (student.userId && student.userId !== student.assignedTeacherId) {
        notifications.push({
          userId: student.userId,
          schoolId: student.schoolId,
          type: "birthday",
          title: "Student Birthday 🎂",
          message: birthdayMessage,
          link: `/students/${student.id}`,
          metadata: {
            studentId: student.id,
            studentName: student.name,
            age: age,
          },
          isRead: false,
        });
      }

      // Notify all teachers in the school
      const schoolTeachers = await storage.getSchoolTeachers(student.schoolId);
      for (const teacher of schoolTeachers) {
        // Skip if already notified
        if (teacher.id === student.assignedTeacherId || teacher.id === student.userId) {
          continue;
        }

        notifications.push({
          userId: teacher.id,
          schoolId: student.schoolId,
          type: "birthday",
          title: "Student Birthday 🎂",
          message: birthdayMessage,
          link: `/students/${student.id}`,
          metadata: {
            studentId: student.id,
            studentName: student.name,
            age: age,
          },
          isRead: false,
        });
      }
    }

    // Create all notifications
    const created = await this.createBulkNotifications(notifications);
    console.log(`✅ Created ${created.length} birthday notifications`);
    
    return created.length;
  }

  /**
   * Create achievement notification
   */
  async notifyAchievement(userId: number, schoolId: number, achievementTitle: string, achievementId: number): Promise<void> {
    await this.createNotification({
      userId,
      schoolId,
      type: "achievement",
      title: "New Achievement Unlocked! 🏆",
      message: `Congratulations! You've earned: ${achievementTitle}`,
      link: `/achievements`,
      metadata: { achievementId },
      isRead: false,
    });
  }

  /**
   * Create assignment notification
   */
  async notifyAssignment(studentId: number, schoolId: number, assignmentTitle: string, assignmentId: number): Promise<void> {
    await this.createNotification({
      userId: studentId,
      schoolId,
      type: "assignment",
      title: "New Assignment 📝",
      message: `You have a new assignment: ${assignmentTitle}`,
      link: `/assignments/${assignmentId}`,
      metadata: { assignmentId },
      isRead: false,
    });
  }

  /**
   * Create message notification
   */
  async notifyMessage(userId: number, schoolId: number, senderName: string, messageId: number): Promise<void> {
    await this.createNotification({
      userId,
      schoolId,
      type: "message",
      title: "New Message 💬",
      message: `${senderName} sent you a message`,
      link: `/messages/${messageId}`,
      metadata: { messageId, senderName },
      isRead: false,
    });
  }

  /**
   * Create streak milestone notification
   */
  async notifyStreakMilestone(userId: number, schoolId: number, streakDays: number): Promise<void> {
    await this.createNotification({
      userId,
      schoolId,
      type: "streak_milestone",
      title: "Streak Milestone! 🔥",
      message: `Amazing! You've reached a ${streakDays}-day practice streak!`,
      link: `/dashboard`,
      metadata: { streakDays },
      isRead: false,
    });
  }
}

export const notificationService = new NotificationService();
