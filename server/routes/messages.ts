import type { Express, Response } from "express";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { requireAuth } from "../auth";
import { db } from "../db";
import { loadSchoolContext, requireTeacherOrOwner } from "../middleware/authz";
import { notificationService } from "../services/notification-service";
import { storage } from "../storage-wrapper";
import { canAccessSchoolId, getAccessibleSchoolIds } from "./school-scope";
import {
  messageReplies,
  messages,
  studentMessages,
  students,
  users,
} from "@shared/schema";

export function registerMessageRoutes(app: Express) {
  app.get("/api/messages", requireAuth, loadSchoolContext, async (req: any, res: Response) => {
    try {
      const userMessages = await storage.getMessages(req.user.id, req.user.role);
      res.json(userMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", requireAuth, loadSchoolContext, async (req: any, res: Response) => {
    try {
      const { recipientId, subject, message } = req.body;

      const recipientUser = await storage.getUser(recipientId);
      if (!recipientUser) {
        return res.status(404).json({ message: "Recipient not found" });
      }

      if (!canAccessSchoolId(req, recipientUser.schoolId)) {
        return res.status(403).json({ message: "Recipient is outside your school scope" });
      }

      const newMessage = await storage.createMessage({
        senderId: req.user.id,
        recipientId,
        senderType: req.user.role,
        recipientType: recipientUser.role,
        subject,
        content: message,
        isRead: false,
      });

      res.status(201).json(newMessage);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.patch("/api/messages/:id/read", requireAuth, async (req: any, res: Response) => {
    try {
      const messageId = parseInt(req.params.id, 10);
      const [updatedMessage] = await db
        .update(messages)
        .set({ isRead: true })
        .where(and(eq(messages.id, messageId), eq(messages.recipientId, req.user.id)))
        .returning();

      if (!updatedMessage) {
        return res.status(404).json({ message: "Message not found or unauthorized" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  app.get("/api/messages/unread-count", requireAuth, async (req: any, res: Response) => {
    try {
      const userType = req.user.role === "student" ? "student" : "teacher";
      const count = await storage.getUnreadMessageCount(req.user.id, userType);
      res.json({ unreadCount: count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ unreadCount: 0 });
    }
  });

  app.post("/api/messages/send", requireAuth, loadSchoolContext, async (req: any, res: Response) => {
    try {
      const { receiverId, receiverType, subject, content } = req.body;
      const senderType = req.user.role === "student" ? "student" : "teacher";

      if (!receiverId || !receiverType || !subject || !content) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      if (receiverType === "student") {
        const targetStudent = await storage.getStudent(receiverId);
        if (!targetStudent) {
          return res.status(404).json({ message: "Student not found" });
        }

        if (!canAccessSchoolId(req, targetStudent.schoolId)) {
          return res.status(403).json({ message: "Recipient is outside your school scope" });
        }
      } else {
        const targetUser = await storage.getUser(receiverId);
        if (!targetUser) {
          return res.status(404).json({ message: "Recipient not found" });
        }

        if (!canAccessSchoolId(req, targetUser.schoolId)) {
          return res.status(403).json({ message: "Recipient is outside your school scope" });
        }
      }

      const result = await storage.createMessage({
        senderId: req.user.id,
        receiverId,
        senderType,
        receiverType,
        subject,
        content,
        isRead: false,
      });

      res.json({
        success: true,
        messageId: result.id,
        message: "Message sent successfully",
      });
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.get("/api/users", requireAuth, loadSchoolContext, async (req: any, res: Response) => {
    try {
      const currentUserId = req.user.id;
      const accessibleSchoolIds = getAccessibleSchoolIds(req);

      let scopedUsers;
      if (req.school?.isPlatformOwner()) {
        const [teachers, studentsList, owners] = await Promise.all([
          storage.getUsersByRole("teacher"),
          storage.getUsersByRole("student"),
          storage.getUsersByRole("school_owner"),
        ]);
        scopedUsers = [...teachers, ...studentsList, ...owners];
      } else {
        const schoolUsers = await Promise.all(
          accessibleSchoolIds.map((schoolId: number) => storage.getUsersBySchool(schoolId))
        );
        scopedUsers = schoolUsers.flat();
      }

      const seen = new Set<number>();
      const messagingUsers = scopedUsers
        .filter((user: any) => {
          if (!["teacher", "student", "school_owner"].includes(user.role)) {
            return false;
          }

          if (user.id === currentUserId || seen.has(user.id)) {
            return false;
          }

          seen.add(user.id);
          return true;
        })
        .sort((a: any, b: any) => a.name.localeCompare(b.name))
        .map((user: any) => ({
          id: user.id,
          name: user.name,
          role: user.role,
          username: user.username,
        }));

      res.json(messagingUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/student/ask-teacher", requireAuth, loadSchoolContext, async (req: any, res: Response) => {
    try {
      const { subject, message } = req.body;
      const student = await db
        .select({
          id: students.id,
          userId: students.userId,
          assignedTeacherId: students.assignedTeacherId,
          name: students.name,
          schoolId: students.schoolId,
        })
        .from(students)
        .where(eq(students.userId, req.user.id))
        .limit(1);

      if (!student.length) {
        return res.status(404).json({ message: "Student not found" });
      }

      const studentRecord = student[0];
      let teacherId: number;

      if (studentRecord.assignedTeacherId) {
        const assignedTeacher = await db
          .select({
            id: users.id,
            schoolId: users.schoolId,
          })
          .from(users)
          .where(eq(users.id, studentRecord.assignedTeacherId))
          .limit(1);

        if (
          !assignedTeacher.length ||
          !canAccessSchoolId(req, assignedTeacher[0].schoolId) ||
          assignedTeacher[0].schoolId !== studentRecord.schoolId
        ) {
          return res.status(403).json({ message: "Assigned teacher is outside your school scope" });
        }

        teacherId = assignedTeacher[0].id;
      } else {
        const defaultTeacher = await db
          .select()
          .from(users)
          .where(
            and(
              eq(users.schoolId, studentRecord.schoolId),
              or(eq(users.role, "teacher"), eq(users.role, "school_owner"))
            )
          )
          .limit(1);

        if (!defaultTeacher.length) {
          return res.status(400).json({ message: "No teacher available to receive messages" });
        }

        teacherId = defaultTeacher[0].id;
      }

      const [newMessage] = await db
        .insert(studentMessages)
        .values({
          studentId: studentRecord.id,
          teacherId,
          subject,
          message,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      res.json(newMessage);
    } catch (error) {
      console.error("Error creating student message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.patch("/api/student/mark-response-read/:id", requireAuth, async (req: any, res: Response) => {
    try {
      const messageId = parseInt(req.params.id, 10);
      const student = await db
        .select({
          id: students.id,
          userId: students.userId,
          name: students.name,
        })
        .from(students)
        .where(eq(students.userId, req.user.id))
        .limit(1);

      if (!student.length) {
        return res.status(404).json({ message: "Student not found" });
      }

      const [updatedMessage] = await db
        .update(studentMessages)
        .set({
          responseRead: true,
          updatedAt: new Date(),
        })
        .where(and(eq(studentMessages.id, messageId), eq(studentMessages.studentId, student[0].id)))
        .returning();

      if (!updatedMessage) {
        return res.status(404).json({ message: "Message not found" });
      }

      res.json(updatedMessage);
    } catch (error) {
      console.error("Error marking response as read:", error);
      res.status(500).json({ message: "Failed to mark response as read" });
    }
  });

  app.post("/api/student/reply-message/:messageId", requireAuth, async (req: any, res: Response) => {
    try {
      const messageId = parseInt(req.params.messageId, 10);
      const { reply } = req.body;

      if (!reply || !reply.trim()) {
        return res.status(400).json({ message: "Reply content is required" });
      }

      const student = await db
        .select({
          id: students.id,
          userId: students.userId,
          name: students.name,
        })
        .from(students)
        .where(eq(students.userId, req.user.id))
        .limit(1);

      if (!student.length) {
        return res.status(404).json({ message: "Student not found" });
      }

      const message = await db
        .select()
        .from(studentMessages)
        .where(and(eq(studentMessages.id, messageId), eq(studentMessages.studentId, student[0].id)))
        .limit(1);

      if (!message.length) {
        return res.status(404).json({ message: "Message not found or access denied" });
      }

      const [newReply] = await db
        .insert(messageReplies)
        .values({
          messageId,
          senderId: req.user.id,
          senderType: "student",
          content: reply.trim(),
          isRead: false,
        })
        .returning();

      res.json(newReply);
    } catch (error) {
      console.error("Error creating message reply:", error);
      res.status(500).json({ message: "Failed to send reply" });
    }
  });

  app.get(
    "/api/teacher/messages",
    requireAuth,
    loadSchoolContext,
    requireTeacherOrOwner(),
    async (req: any, res: Response) => {
      try {
        const teacherMessages = await db
          .select({
            id: studentMessages.id,
            studentId: studentMessages.studentId,
            studentName: students.name,
            subject: studentMessages.subject,
            message: studentMessages.message,
            response: studentMessages.response,
            isRead: studentMessages.isRead,
            responseRead: studentMessages.responseRead,
            createdAt: studentMessages.createdAt,
            respondedAt: studentMessages.respondedAt,
          })
          .from(studentMessages)
          .leftJoin(students, eq(studentMessages.studentId, students.id))
          .where(eq(studentMessages.teacherId, req.user.id))
          .orderBy(desc(studentMessages.createdAt))
          .catch((error) => {
            console.error("Teacher messages query failed:", error);
            return [];
          });

        const messageIds = teacherMessages.map((message) => message.id).filter(Boolean);
        const replies =
          messageIds.length > 0
            ? await db
                .select({
                  id: messageReplies.id,
                  messageId: messageReplies.messageId,
                  senderId: messageReplies.senderId,
                  senderType: messageReplies.senderType,
                  content: messageReplies.content,
                  isRead: messageReplies.isRead,
                  createdAt: messageReplies.createdAt,
                })
                .from(messageReplies)
                .where(inArray(messageReplies.messageId, messageIds))
                .orderBy(messageReplies.createdAt)
                .catch((error) => {
                  console.error("Message replies query failed:", error);
                  return [];
                })
            : [];

        const messagesWithReplies = teacherMessages
          .map((row) => ({
            id: row.id,
            studentId: row.studentId,
            studentName: row.studentName || "Unknown",
            subject: row.subject,
            message: row.message,
            response: row.response,
            isRead: row.isRead,
            responseRead: row.responseRead,
            createdAt: row.createdAt,
            respondedAt: row.respondedAt,
            replies: replies.filter((reply) => reply.messageId === row.id),
          }))
          .filter((message) => message.id);

        res.json(messagesWithReplies);
      } catch (error) {
        console.error("Error fetching teacher messages:", error);
        res.status(500).json({ message: "Failed to fetch messages" });
      }
    }
  );

  app.patch(
    "/api/teacher/respond-message/:id",
    requireAuth,
    loadSchoolContext,
    requireTeacherOrOwner(),
    async (req: any, res: Response) => {
      try {
        const messageId = parseInt(req.params.id, 10);
        const { response } = req.body;

        const [updatedMessage] = await db
          .update(studentMessages)
          .set({
            response,
            isRead: true,
            responseRead: false,
            respondedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(and(eq(studentMessages.id, messageId), eq(studentMessages.teacherId, req.user.id)))
          .returning();

        if (!updatedMessage) {
          return res.status(404).json({ message: "Message not found" });
        }

        res.json(updatedMessage);
      } catch (error) {
        console.error("Error responding to message:", error);
        res.status(500).json({ message: "Failed to respond to message" });
      }
    }
  );

  app.patch(
    "/api/teacher/mark-message-read/:id",
    requireAuth,
    loadSchoolContext,
    requireTeacherOrOwner(),
    async (req: any, res: Response) => {
      try {
        const messageId = parseInt(req.params.id, 10);
        const [updatedMessage] = await db
          .update(studentMessages)
          .set({
            isRead: true,
            updatedAt: new Date(),
          })
          .where(and(eq(studentMessages.id, messageId), eq(studentMessages.teacherId, req.user.id)))
          .returning();

        if (!updatedMessage) {
          return res.status(404).json({ message: "Message not found" });
        }

        res.json(updatedMessage);
      } catch (error) {
        console.error("Error marking message as read:", error);
        res.status(500).json({ message: "Failed to mark message as read" });
      }
    }
  );

  app.post(
    "/api/teacher/send-message",
    requireAuth,
    loadSchoolContext,
    requireTeacherOrOwner(),
    async (req: any, res: Response) => {
      try {
        const senderId = req.user.id;
        const { recipientType, recipientId, subject, message } = req.body;

        if (!recipientType || !recipientId || !subject || !message) {
          return res.status(400).json({ message: "Missing required fields" });
        }

        if (recipientType === "student") {
          const student = await db
            .select({
              id: students.id,
              name: students.name,
              userId: students.userId,
              schoolId: students.schoolId,
            })
            .from(students)
            .where(eq(students.id, recipientId))
            .limit(1);

          if (!student.length) {
            return res.status(404).json({ message: "Student not found" });
          }

          if (!canAccessSchoolId(req, student[0].schoolId)) {
            return res.status(403).json({ message: "Student is outside your school scope" });
          }

          const [newMessage] = await db
            .insert(studentMessages)
            .values({
              studentId: recipientId,
              teacherId: senderId,
              subject,
              message,
              isRead: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .returning();

          try {
            if (student[0].userId && student[0].schoolId) {
              await notificationService.sendNotification({
                userId: student[0].userId,
                schoolId: student[0].schoolId,
                type: "message",
                title: "New Message from Teacher",
                message: subject,
                link: `/messages/${newMessage.id}`,
                metadata: { messageId: newMessage.id, senderId },
              });
            }
          } catch (notifError) {
            console.error("Failed to send message notification:", notifError);
          }

          return res.status(201).json(newMessage);
        }

        if (recipientType === "teacher") {
          const teacher = await db
            .select({
              id: users.id,
              role: users.role,
              schoolId: users.schoolId,
            })
            .from(users)
            .where(
              and(eq(users.id, recipientId), or(eq(users.role, "teacher"), eq(users.role, "school_owner")))
            )
            .limit(1);

          if (!teacher.length) {
            return res.status(404).json({ message: "Teacher not found" });
          }

          if (!canAccessSchoolId(req, teacher[0].schoolId)) {
            return res.status(403).json({ message: "Recipient is outside your school scope" });
          }

          const [newMessage] = await db
            .insert(studentMessages)
            .values({
              studentId: 0,
              teacherId: recipientId,
              subject: `From Teacher: ${subject}`,
              message: `Message from ${req.user.name}: ${message}`,
              isRead: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .returning();

          return res.status(201).json(newMessage);
        }

        return res.status(400).json({ message: "Invalid recipient type" });
      } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ message: "Failed to send message" });
      }
    }
  );
}
