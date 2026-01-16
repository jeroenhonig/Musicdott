import { Express, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { loadSchoolContext } from "../middleware/authz";
import { notificationService } from "../services/notification-service";

export function registerNotificationRoutes(app: Express) {
  // Get all notifications for current user
  app.get(
    "/api/notifications",
    requireAuth,
    loadSchoolContext,
    async (req: Request, res: Response) => {
      try {
        if (!req.user || !req.school) {
          return res.status(401).json({ message: "Not authenticated" });
        }

        const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
        const notifications = await notificationService.getUserNotifications(
          req.user.id,
          req.school.id,
          limit
        );

        res.json(notifications);
      } catch (error) {
        console.error("Error getting notifications:", error);
        res.status(500).json({ message: "Failed to get notifications" });
      }
    }
  );

  // Get unread notification count
  app.get(
    "/api/notifications/unread-count",
    requireAuth,
    loadSchoolContext,
    async (req: Request, res: Response) => {
      try {
        if (!req.user || !req.school) {
          return res.status(401).json({ message: "Not authenticated" });
        }

        const count = await notificationService.getUnreadCount(
          req.user.id,
          req.school.id
        );

        res.json({ count });
      } catch (error) {
        console.error("Error getting unread count:", error);
        res.status(500).json({ message: "Failed to get unread count" });
      }
    }
  );

  // Mark notification as read
  app.put(
    "/api/notifications/:id/mark-as-read",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        if (!req.user) {
          return res.status(401).json({ message: "Not authenticated" });
        }

        const notificationId = parseInt(req.params.id);
        const success = await notificationService.markAsRead(
          notificationId,
          req.user.id
        );

        if (!success) {
          return res.status(404).json({ message: "Notification not found" });
        }

        res.json({ success: true });
      } catch (error) {
        console.error("Error marking notification as read:", error);
        res.status(500).json({ message: "Failed to mark notification as read" });
      }
    }
  );

  // Mark all notifications as read
  app.put(
    "/api/notifications/mark-all-as-read",
    requireAuth,
    loadSchoolContext,
    async (req: Request, res: Response) => {
      try {
        if (!req.user || !req.school) {
          return res.status(401).json({ message: "Not authenticated" });
        }

        const count = await notificationService.markAllAsRead(
          req.user.id,
          req.school.id
        );

        res.json({ count });
      } catch (error) {
        console.error("Error marking all notifications as read:", error);
        res.status(500).json({ message: "Failed to mark all as read" });
      }
    }
  );
}
