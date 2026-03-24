import type { Express, Request, Response } from "express";
import bcrypt from "bcrypt";
import { executeQuery } from "../db";
import { loadSchoolContext, requirePlatformOwner } from "../middleware/authz";
import { EmailNotificationService } from "../services/email-notifications";
import { storage } from "../storage-wrapper";

const platformAdminHandlers = [loadSchoolContext, requirePlatformOwner()] as const;

async function logAdminAction(
  req: any,
  action: string,
  targetType: string,
  targetId: number | null,
  metadata: any = {}
) {
  try {
    const user = req.user || req.session?.user;
    if (!user?.id) {
      console.warn("No user found for audit log");
      return;
    }

    await storage.executeQuery(
      `
        INSERT INTO admin_actions (actor_id, target_type, target_id, action, metadata, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        user.id,
        targetType,
        targetId,
        action,
        JSON.stringify(metadata),
        req.ip || req.connection?.remoteAddress,
        req.get("user-agent"),
      ]
    );
  } catch (error) {
    console.error("Failed to log admin action:", error);
  }
}

export function registerPlatformAdminRoutes(app: Express) {
  app.get("/api/admin/debug/stats", ...platformAdminHandlers, async (req: any, res: Response) => {
    try {
      const currentUserId = req.user?.id || req.session?.user?.id;
      const students = await storage.getStudents(currentUserId);
      const lessons = await storage.getLessons(currentUserId);
      const songs = await storage.getSongs(currentUserId);
      const categories = await storage.getLessonCategories(currentUserId);

      res.json({
        currentUserId,
        storageType: "memory",
        connected: false,
        counts: {
          students: students.length,
          lessons: lessons.length,
          songs: songs.length,
          categories: categories.length,
          users: 1,
        },
      });
    } catch (error) {
      console.error("Debug stats error:", error);
      res.status(500).json({ error: "Failed to get debug stats" });
    }
  });

  app.post("/api/admin/debug/reset-demo-data", ...platformAdminHandlers, async (_req: any, res: Response) => {
    try {
      res.json({ message: "Demo data reset functionality ready for implementation" });
    } catch (error) {
      console.error("Reset demo data error:", error);
      res.status(500).json({ error: "Failed to reset demo data" });
    }
  });

  app.get("/api/admin/billing/status", ...platformAdminHandlers, async (_req: Request, res: Response) => {
    try {
      const { billingScheduler } = require("../services/billing-scheduler");
      const nextRun = billingScheduler.getNextScheduledRun();

      res.json({
        automatedBilling: {
          isActive: true,
          nextScheduledRun: nextRun ? nextRun.toISOString() : null,
          schedule: "Monthly on 1st day at 2:00 AM UTC",
          status: "running",
        },
      });
    } catch (error) {
      console.error("Error checking billing status:", error);
      res.status(500).json({ message: "Failed to get billing status" });
    }
  });

  app.post("/api/admin/billing/trigger", ...platformAdminHandlers, async (_req: Request, res: Response) => {
    try {
      const { billingScheduler } = require("../services/billing-scheduler");
      await billingScheduler.triggerManualBilling();

      res.json({
        message: "Manual billing process completed successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error triggering manual billing:", error);
      res.status(500).json({ message: "Failed to trigger billing process" });
    }
  });

  app.get("/api/owners/platform-stats", ...platformAdminHandlers, async (_req: Request, res: Response) => {
    try {
      const [
        totalUsers,
        totalSchools,
        totalStudents,
        totalTeachers,
        totalLessons,
        totalSongs,
        totalSessions,
        activeSubscriptions,
        monthlyRevenue,
      ] = await Promise.all([
        storage.executeQuery("SELECT COUNT(*) as count FROM users"),
        storage.executeQuery("SELECT COUNT(*) as count FROM schools"),
        storage.executeQuery("SELECT COUNT(*) as count FROM students"),
        storage.executeQuery("SELECT COUNT(*) as count FROM users WHERE role IN ('teacher', 'school_owner')"),
        storage.executeQuery("SELECT COUNT(*) as count FROM lessons"),
        storage.executeQuery("SELECT COUNT(*) as count FROM songs"),
        storage.executeQuery("SELECT COUNT(*) as count FROM sessions"),
        storage.executeQuery("SELECT COUNT(*) as count FROM school_subscriptions WHERE status = 'active'"),
        storage.executeQuery(
          "SELECT COALESCE(SUM(amount), 0) as total FROM payment_history WHERE status = 'paid' AND billing_month = date_trunc('month', CURRENT_DATE)"
        ),
      ]);

      const newUsersThisMonth = await storage.executeQuery(
        "SELECT COUNT(*) as count FROM users WHERE created_at >= date_trunc('month', CURRENT_DATE)"
      );
      const lastMonthRevenue = await storage.executeQuery(
        "SELECT COALESCE(SUM(amount), 0) as total FROM payment_history WHERE status = 'paid' AND billing_month = date_trunc('month', CURRENT_DATE - interval '1 month')"
      );

      const currentRevenue = monthlyRevenue.rows[0]?.total || 0;
      const previousRevenue = lastMonthRevenue.rows[0]?.total || 1;
      const growthRate = Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100);

      res.json({
        totalUsers: parseInt(totalUsers.rows[0]?.count || 0),
        totalSchools: parseInt(totalSchools.rows[0]?.count || 0),
        totalStudents: parseInt(totalStudents.rows[0]?.count || 0),
        totalTeachers: parseInt(totalTeachers.rows[0]?.count || 0),
        totalLessons: parseInt(totalLessons.rows[0]?.count || 0),
        totalSongs: parseInt(totalSongs.rows[0]?.count || 0),
        totalSessions: parseInt(totalSessions.rows[0]?.count || 0),
        monthlyRecurringRevenue: parseInt(currentRevenue),
        activeSubscriptions: parseInt(activeSubscriptions.rows[0]?.count || 0),
        newUsersThisMonth: parseInt(newUsersThisMonth.rows[0]?.count || 0),
        growthRate: growthRate || 0,
        churnRate: 5,
      });
    } catch (error) {
      console.error("Error fetching platform stats:", error);
      res.status(500).json({ message: "Failed to fetch platform statistics" });
    }
  });

  app.get("/api/owners/revenue-analytics", ...platformAdminHandlers, async (_req: Request, res: Response) => {
    try {
      const revenueData = await storage.executeQuery(`
        SELECT 
          TO_CHAR(billing_month, 'Mon YYYY') as month,
          COALESCE(SUM(amount), 0) as revenue,
          COUNT(DISTINCT school_id) as subscriptions
        FROM payment_history 
        WHERE status = 'paid' 
          AND billing_month >= CURRENT_DATE - interval '12 months'
        GROUP BY billing_month
        ORDER BY billing_month ASC
      `);

      res.json(revenueData.rows);
    } catch (error) {
      console.error("Error fetching revenue analytics:", error);
      res.status(500).json({ message: "Failed to fetch revenue analytics" });
    }
  });

  app.get("/api/owners/user-growth", ...platformAdminHandlers, async (_req: Request, res: Response) => {
    try {
      const userGrowthData = await storage.executeQuery(`
        WITH monthly_users AS (
          SELECT 
            DATE_TRUNC('month', created_at) as month,
            COUNT(*) as new_users
          FROM users 
          WHERE created_at >= CURRENT_DATE - interval '12 months'
          GROUP BY DATE_TRUNC('month', created_at)
        ),
        monthly_schools AS (
          SELECT 
            DATE_TRUNC('month', created_at) as month,
            COUNT(*) as new_schools
          FROM schools 
          WHERE created_at >= CURRENT_DATE - interval '12 months'
          GROUP BY DATE_TRUNC('month', created_at)
        ),
        running_totals AS (
          SELECT 
            generate_series(
              DATE_TRUNC('month', CURRENT_DATE - interval '12 months'), 
              DATE_TRUNC('month', CURRENT_DATE), 
              interval '1 month'
            ) as month
        )
        SELECT 
          TO_CHAR(rt.month, 'Mon YYYY') as month,
          (SELECT COUNT(*) FROM users WHERE created_at <= rt.month + interval '1 month' - interval '1 day') as totalUsers,
          COALESCE(mu.new_users, 0) as newUsers,
          (SELECT COUNT(*) FROM schools WHERE created_at <= rt.month + interval '1 month' - interval '1 day') as schools
        FROM running_totals rt
        LEFT JOIN monthly_users mu ON rt.month = mu.month
        LEFT JOIN monthly_schools ms ON rt.month = ms.month
        ORDER BY rt.month ASC
      `);

      res.json(userGrowthData.rows);
    } catch (error) {
      console.error("Error fetching user growth analytics:", error);
      res.status(500).json({ message: "Failed to fetch user growth analytics" });
    }
  });

  app.get("/api/owners/top-schools", ...platformAdminHandlers, async (_req: Request, res: Response) => {
    try {
      const topSchools = await storage.executeQuery(`
        SELECT 
          s.id,
          s.name,
          s.city,
          COUNT(DISTINCT u.id) as teacher_count,
          COUNT(DISTINCT st.id) as student_count,
          COUNT(DISTINCT l.id) as lessons_count,
          COALESCE(ss.status, 'inactive') as subscription_status,
          COALESCE(ph.total_revenue, 0) as monthly_revenue,
          COALESCE(TO_CHAR(MAX(u.last_login_at), 'DD Mon YYYY'), 'Never') as last_activity
        FROM schools s
        LEFT JOIN users u ON s.id = u.school_id
        LEFT JOIN students st ON u.id = st.user_id
        LEFT JOIN lessons l ON u.id = l.user_id
        LEFT JOIN school_subscriptions ss ON s.id = ss.school_id AND ss.status = 'active'
        LEFT JOIN (
          SELECT 
            school_id, 
            SUM(amount) as total_revenue
          FROM payment_history 
          WHERE billing_month = DATE_TRUNC('month', CURRENT_DATE)
            AND status = 'paid'
          GROUP BY school_id
        ) ph ON s.id = ph.school_id
        GROUP BY s.id, s.name, s.city, ss.status, ph.total_revenue
        ORDER BY monthly_revenue DESC, student_count DESC
        LIMIT 10
      `);

      res.json(
        topSchools.rows.map((school) => ({
          id: school.id,
          name: school.name,
          city: school.city,
          teacherCount: parseInt(school.teacher_count) || 0,
          studentCount: parseInt(school.student_count) || 0,
          lessonsCount: parseInt(school.lessons_count) || 0,
          subscriptionStatus: school.subscription_status,
          monthlyRevenue: parseInt(school.monthly_revenue) || 0,
          lastActivity: school.last_activity,
        }))
      );
    } catch (error) {
      console.error("Error fetching top schools:", error);
      res.status(500).json({ message: "Failed to fetch top schools" });
    }
  });

  app.get("/api/owners/recent-activities", ...platformAdminHandlers, async (_req: Request, res: Response) => {
    try {
      const activities = await storage.executeQuery(`
        SELECT 
          'user_registration' as type,
          users.name || ' (' || users.role || ')' as description,
          COALESCE(schools.name, 'No School') as school,
          users.created_at as timestamp
        FROM users 
        LEFT JOIN schools ON users.school_id = schools.id
        WHERE users.created_at >= NOW() - INTERVAL '30 days'
        ORDER BY users.created_at DESC
        LIMIT 20
      `);

      res.json(
        activities.rows.map((activity) => ({
          description: `New registration: ${activity.description}`,
          school: activity.school,
          timestamp: new Date(activity.timestamp).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
        }))
      );
    } catch (error) {
      console.error("Error fetching recent activities:", error);
      res.status(500).json({ message: "Failed to fetch recent activities" });
    }
  });

  app.get("/api/owners/schools", ...platformAdminHandlers, async (_req: Request, res: Response) => {
    try {
      const schoolsData = await storage.executeQuery(`
        SELECT 
          s.*,
          COUNT(DISTINCT u.id) as total_users,
          COUNT(DISTINCT CASE WHEN u.role = 'teacher' THEN u.id END) as total_teachers,
          COUNT(DISTINCT st.id) as total_students,
          COUNT(DISTINCT l.id) as total_lessons,
          COUNT(DISTINCT sg.id) as total_songs,
          COALESCE(ss.status, 'inactive') as subscription_status,
          ss.plan_type,
          ss.monthly_price,
          ss.created_at as subscription_start
        FROM schools s
        LEFT JOIN users u ON s.id = u.school_id
        LEFT JOIN students st ON u.id = st.user_id
        LEFT JOIN lessons l ON u.id = l.user_id
        LEFT JOIN songs sg ON u.id = sg.user_id
        LEFT JOIN school_subscriptions ss ON s.id = ss.school_id
        GROUP BY s.id, ss.status, ss.plan_type, ss.monthly_price, ss.created_at
        ORDER BY s.created_at DESC
      `);

      res.json({ schools: schoolsData.rows });
    } catch (error) {
      console.error("Error fetching schools data:", error);
      res.status(500).json({ message: "Failed to fetch schools data" });
    }
  });

  app.get("/api/owners/schools/:id", ...platformAdminHandlers, async (req: Request, res: Response) => {
    try {
      const schoolId = parseInt(req.params.id, 10);
      const schoolData = await storage.getSchool(schoolId);
      if (!schoolData) {
        return res.status(404).json({ message: "School not found" });
      }

      const [schoolUsers, schoolStudents, subscription, stats] = await Promise.all([
        storage.executeQuery(
          `
            SELECT id, username, name, email, role, instruments, created_at, last_login_at
            FROM users 
            WHERE school_id = $1
            ORDER BY role, name
          `,
          [schoolId]
        ),
        storage.executeQuery(
          `
            SELECT s.*, u.username, u.email, u.last_login_at
            FROM students s
            LEFT JOIN users u ON s.user_id = u.id
            WHERE u.school_id = $1
            ORDER BY s.name
          `,
          [schoolId]
        ),
        storage.executeQuery(
          `
            SELECT * FROM school_subscriptions 
            WHERE school_id = $1 
            ORDER BY created_at DESC 
            LIMIT 1
          `,
          [schoolId]
        ),
        storage.executeQuery(
          `
            SELECT 
              COUNT(DISTINCT l.id) as total_lessons,
              COUNT(DISTINCT sg.id) as total_songs,
              COUNT(DISTINCT sess.id) as total_sessions,
              COUNT(DISTINCT CASE WHEN sess.start_time >= NOW() - INTERVAL '30 days' THEN sess.id END) as sessions_last_month
            FROM users u
            LEFT JOIN lessons l ON u.id = l.user_id
            LEFT JOIN songs sg ON u.id = sg.user_id
            LEFT JOIN sessions sess ON u.id = sess.user_id
            WHERE u.school_id = $1
          `,
          [schoolId]
        ),
      ]);

      res.json({
        school: schoolData,
        users: schoolUsers.rows,
        students: schoolStudents.rows,
        subscription: subscription.rows[0] || null,
        statistics: stats.rows[0],
      });
    } catch (error) {
      console.error("Error fetching school details:", error);
      res.status(500).json({ message: "Failed to fetch school details" });
    }
  });

  app.put("/api/owners/schools/:id", ...platformAdminHandlers, async (req: Request, res: Response) => {
    try {
      const schoolId = parseInt(req.params.id, 10);
      const updatedSchool = await storage.updateSchool(schoolId, req.body);

      await EmailNotificationService.notifyPlatformAlert({
        message: `School information updated: ${updatedSchool.name}`,
        severity: "Low",
        component: "School Management",
        details: req.body,
      });

      res.json(updatedSchool);
    } catch (error) {
      console.error("Error updating school:", error);
      res.status(500).json({ message: "Failed to update school" });
    }
  });

  app.get("/api/owners/users", ...platformAdminHandlers, async (req: Request, res: Response) => {
    try {
      const { role, school_id, search } = req.query;
      const whereConditions: string[] = [];
      const params: any[] = [];
      let paramCount = 0;

      if (role) {
        paramCount++;
        whereConditions.push(`u.role = $${paramCount}`);
        params.push(role);
      }

      if (school_id) {
        paramCount++;
        whereConditions.push(`u.school_id = $${paramCount}`);
        params.push(school_id);
      }

      if (search) {
        paramCount++;
        whereConditions.push(
          `(u.name ILIKE $${paramCount} OR u.username ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`
        );
        params.push(`%${search}%`);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";
      const usersData = await storage.executeQuery(
        `
          SELECT 
            u.*,
            s.name as school_name,
            COUNT(DISTINCT st.id) as student_count,
            COUNT(DISTINCT l.id) as lesson_count,
            COUNT(DISTINCT sg.id) as song_count
          FROM users u
          LEFT JOIN schools s ON u.school_id = s.id
          LEFT JOIN students st ON u.id = st.user_id
          LEFT JOIN lessons l ON u.id = l.user_id
          LEFT JOIN songs sg ON u.id = sg.user_id
          ${whereClause}
          GROUP BY u.id, s.name
          ORDER BY u.created_at DESC
        `,
        params
      );

      res.json({
        users: usersData.rows.map((user) => {
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword;
        }),
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/owners/all-schools", ...platformAdminHandlers, async (_req: Request, res: Response) => {
    try {
      const schoolsData = await executeQuery(`
        SELECT
          s.id,
          s.name,
          s.city,
          s.address,
          s.phone,
          s.website,
          s.owner_id,
          owner.name as owner_name,
          s.created_at,
          COUNT(DISTINCT CASE WHEN u.role IN ('teacher', 'school_owner') THEN u.id END) as total_teachers,
          COUNT(DISTINCT CASE WHEN u.role = 'student' THEN u.id END) as total_students,
          COUNT(DISTINCT l.id) as total_lessons,
          COUNT(DISTINCT sg.id) as total_songs,
          COALESCE(ss.status, 'inactive') as subscription_status
        FROM schools s
        LEFT JOIN users owner ON s.owner_id = owner.id
        LEFT JOIN users u ON s.id = u.school_id
        LEFT JOIN lessons l ON u.id = l.user_id
        LEFT JOIN songs sg ON u.id = sg.user_id
        LEFT JOIN school_subscriptions ss ON s.id = ss.school_id
        GROUP BY s.id, owner.name, ss.status
        ORDER BY s.created_at DESC
      `);

      res.json(schoolsData.rows);
    } catch (error) {
      console.error("Error fetching all schools:", error);
      res.status(500).json({ message: "Failed to fetch schools" });
    }
  });

  app.get("/api/owners/all-users", ...platformAdminHandlers, async (_req: Request, res: Response) => {
    try {
      const usersData = await executeQuery(`
        SELECT 
          u.id,
          u.username,
          u.name,
          u.email,
          u.role,
          u.school_id,
          u.created_at,
          u.last_login_at,
          s.name as school_name
        FROM users u
        LEFT JOIN schools s ON u.school_id = s.id
        ORDER BY u.created_at DESC
        LIMIT 500
      `);

      res.json(usersData.rows);
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/platform/users/:id/reset-password", ...platformAdminHandlers, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id, 10);
      const { newPassword, reason } = req.body;

      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      const userResult = await storage.executeQuery(
        `SELECT id, username, email, role FROM users WHERE id = $1`,
        [userId]
      );

      if (!userResult.rows.length) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = userResult.rows[0];
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await storage.executeQuery(
        `
          UPDATE users 
          SET password = $1, must_change_password = true, updated_at = NOW()
          WHERE id = $2
        `,
        [hashedPassword, userId]
      );

      await logAdminAction(req, "password_reset", "user", userId, {
        username: user.username,
        email: user.email,
        role: user.role,
        reason: reason || "Customer service password reset",
      });

      res.json({
        message: "Password reset successfully. User must change password on next login.",
        userId,
        username: user.username,
      });
    } catch (error) {
      console.error("Error resetting user password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  app.put("/api/platform/users/:id", ...platformAdminHandlers, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id, 10);
      const updates = req.body;
      const currentUserResult = await storage.executeQuery(`SELECT * FROM users WHERE id = $1`, [userId]);

      if (!currentUserResult.rows.length) {
        return res.status(404).json({ message: "User not found" });
      }

      const currentUser = currentUserResult.rows[0];
      const allowedFields = ["name", "email", "username", "role", "school_id", "instruments", "bio"];
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramCount = 0;

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          paramCount++;
          updateFields.push(`${key} = $${paramCount}`);
          updateValues.push(value);
        }
      }

      if (!updateFields.length) {
        return res.status(400).json({ message: "No valid fields to update" });
      }

      paramCount++;
      updateValues.push(userId);

      await storage.executeQuery(
        `
          UPDATE users 
          SET ${updateFields.join(", ")}, updated_at = NOW()
          WHERE id = $${paramCount}
        `,
        updateValues
      );

      await logAdminAction(req, "user_update", "user", userId, {
        username: currentUser.username,
        updates,
        oldValues: Object.keys(updates).reduce((acc, key) => {
          acc[key] = currentUser[key];
          return acc;
        }, {} as any),
      });

      res.json({ message: "User updated successfully" });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.post("/api/platform/users", ...platformAdminHandlers, async (req: Request, res: Response) => {
    try {
      const { username, email, name, password, role, schoolId } = req.body;

      if (!username || !email || !name || !password) {
        return res.status(400).json({ message: "Username, email, name, and password are required" });
      }

      const validRoles = ["school_owner", "teacher", "student"];
      if (role && !validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be one of: school_owner, teacher, student" });
      }

      const [existingUserByUsername, existingUserByEmail] = await Promise.all([
        storage.executeQuery("SELECT id FROM users WHERE username = $1", [username]),
        storage.executeQuery("SELECT id FROM users WHERE email = $1", [email]),
      ]);

      if (existingUserByUsername.rows.length > 0) {
        return res.status(400).json({ message: "Username already exists" });
      }

      if (existingUserByEmail.rows.length > 0) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await storage.executeQuery(
        `
          INSERT INTO users (username, email, name, password, role, school_id, must_change_password)
          VALUES ($1, $2, $3, $4, $5, $6, true)
          RETURNING id, username, email, name, role, school_id
        `,
        [username, email, name, hashedPassword, role || "school_owner", schoolId || null]
      );

      const newUser = result.rows[0];
      if (schoolId && (role === "school_owner" || role === "teacher")) {
        await storage.executeQuery(
          `
            INSERT INTO school_memberships (school_id, user_id, role)
            VALUES ($1, $2, $3)
            ON CONFLICT DO NOTHING
          `,
          [schoolId, newUser.id, role === "school_owner" ? "owner" : "teacher"]
        );
      }

      await logAdminAction(req, "user_create", "user", newUser.id, {
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        schoolId: newUser.school_id,
      });

      res.status(201).json({
        message: "User created successfully",
        user: newUser,
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.post("/api/platform/schools", ...platformAdminHandlers, async (req: Request, res: Response) => {
    try {
      const { name, ownerId, city, address, phone, website, instruments, description } = req.body;

      if (!name) {
        return res.status(400).json({ message: "School name is required" });
      }

      if (ownerId) {
        const ownerResult = await storage.executeQuery("SELECT id, role FROM users WHERE id = $1", [ownerId]);
        if (!ownerResult.rows.length) {
          return res.status(400).json({ message: "Owner user not found" });
        }
        if (ownerResult.rows[0].role !== "school_owner") {
          return res.status(400).json({ message: "Assigned owner must have school_owner role" });
        }
      }

      const result = await storage.executeQuery(
        `
          INSERT INTO schools (name, owner_id, city, address, phone, website, instruments, description, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
          RETURNING *
        `,
        [name, ownerId || null, city || null, address || null, phone || null, website || null, instruments || null, description || null]
      );

      const newSchool = result.rows[0];
      if (ownerId) {
        await storage.executeQuery(
          `
            INSERT INTO school_memberships (school_id, user_id, role)
            VALUES ($1, $2, 'owner')
            ON CONFLICT DO NOTHING
          `,
          [newSchool.id, ownerId]
        );
        await storage.executeQuery(`UPDATE users SET school_id = $1 WHERE id = $2 AND school_id IS NULL`, [
          newSchool.id,
          ownerId,
        ]);
      }

      await logAdminAction(req, "school_create", "school", newSchool.id, {
        name: newSchool.name,
        ownerId: newSchool.owner_id,
        city: newSchool.city,
      });

      res.status(201).json({
        message: "School created successfully",
        school: newSchool,
      });
    } catch (error) {
      console.error("Error creating school:", error);
      res.status(500).json({ message: "Failed to create school" });
    }
  });

  app.post("/api/platform/schools/:id/assign-owner", ...platformAdminHandlers, async (req: Request, res: Response) => {
    try {
      const schoolId = parseInt(req.params.id, 10);
      const { ownerId } = req.body;

      if (Number.isNaN(schoolId)) {
        return res.status(400).json({ message: "Invalid school ID" });
      }
      if (!ownerId) {
        return res.status(400).json({ message: "Owner ID is required" });
      }

      const [schoolResult, ownerResult] = await Promise.all([
        storage.executeQuery("SELECT * FROM schools WHERE id = $1", [schoolId]),
        storage.executeQuery("SELECT id, role, name FROM users WHERE id = $1", [ownerId]),
      ]);

      if (!schoolResult.rows.length) {
        return res.status(404).json({ message: "School not found" });
      }
      if (!ownerResult.rows.length) {
        return res.status(400).json({ message: "Owner user not found" });
      }
      if (ownerResult.rows[0].role !== "school_owner") {
        return res.status(400).json({ message: "Assigned user must have school_owner role" });
      }

      await Promise.all([
        storage.executeQuery(`UPDATE schools SET owner_id = $1, updated_at = NOW() WHERE id = $2`, [ownerId, schoolId]),
        storage.executeQuery(
          `
            INSERT INTO school_memberships (school_id, user_id, role)
            VALUES ($1, $2, 'owner')
            ON CONFLICT DO NOTHING
          `,
          [schoolId, ownerId]
        ),
        storage.executeQuery(`UPDATE users SET school_id = $1 WHERE id = $2 AND school_id IS NULL`, [schoolId, ownerId]),
      ]);

      await logAdminAction(req, "school_assign_owner", "school", schoolId, {
        schoolName: schoolResult.rows[0].name,
        newOwnerId: ownerId,
        newOwnerName: ownerResult.rows[0].name,
      });

      res.json({
        message: "Owner assigned to school successfully",
        schoolId,
        ownerId,
        ownerName: ownerResult.rows[0].name,
      });
    } catch (error) {
      console.error("Error assigning owner to school:", error);
      res.status(500).json({ message: "Failed to assign owner" });
    }
  });

  app.delete("/api/platform/users/:id", ...platformAdminHandlers, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id, 10);
      if (Number.isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const userResult = await storage.executeQuery(
        "SELECT id, username, email, role FROM users WHERE id = $1",
        [userId]
      );
      if (!userResult.rows.length) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = userResult.rows[0];
      if (user.role === "platform_owner") {
        return res.status(403).json({ message: "Cannot delete platform owner accounts" });
      }

      await storage.executeQuery("DELETE FROM users WHERE id = $1", [userId]);
      await logAdminAction(req, "user_delete", "user", userId, {
        username: user.username,
        email: user.email,
        role: user.role,
      });

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.delete("/api/platform/schools/:id", ...platformAdminHandlers, async (req: Request, res: Response) => {
    try {
      const schoolId = parseInt(req.params.id, 10);
      if (Number.isNaN(schoolId)) {
        return res.status(400).json({ message: "Invalid school ID" });
      }

      const schoolResult = await storage.executeQuery("SELECT id, name FROM schools WHERE id = $1", [schoolId]);
      if (!schoolResult.rows.length) {
        return res.status(404).json({ message: "School not found" });
      }

      const school = schoolResult.rows[0];
      await storage.executeQuery("DELETE FROM schools WHERE id = $1", [schoolId]);
      await logAdminAction(req, "school_delete", "school", schoolId, { schoolName: school.name });

      res.json({ message: "School deleted successfully" });
    } catch (error) {
      console.error("Error deleting school:", error);
      res.status(500).json({ message: "Failed to delete school" });
    }
  });

  app.get("/api/platform/billing", ...platformAdminHandlers, async (req: Request, res: Response) => {
    try {
      const { status, school_id } = req.query;
      const whereConditions: string[] = [];
      const params: any[] = [];
      let paramCount = 0;

      if (status) {
        paramCount++;
        whereConditions.push(`sbs.payment_status = $${paramCount}`);
        params.push(status);
      }

      if (school_id) {
        paramCount++;
        whereConditions.push(`sbs.school_id = $${paramCount}`);
        params.push(school_id);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";
      const billingData = await storage.executeQuery(
        `
          SELECT 
            sbs.*,
            s.name as school_name,
            s.city,
            s.email as school_email,
            COUNT(DISTINCT u.id) as user_count
          FROM school_billing_summary sbs
          LEFT JOIN schools s ON sbs.school_id = s.id
          LEFT JOIN users u ON s.id = u.school_id
          ${whereClause}
          GROUP BY sbs.id, s.name, s.city, s.email
          ORDER BY sbs.next_billing_date ASC
        `,
        params
      );

      res.json({ invoices: billingData.rows });
    } catch (error) {
      console.error("Error fetching billing data:", error);
      res.status(500).json({ message: "Failed to fetch billing data" });
    }
  });

  app.put("/api/platform/billing/:id/status", ...platformAdminHandlers, async (req: Request, res: Response) => {
    try {
      const billingId = parseInt(req.params.id, 10);
      const { status, notes } = req.body;
      const validStatuses = ["current", "overdue", "suspended", "canceled"];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid payment status" });
      }

      const currentBilling = await storage.executeQuery(`SELECT * FROM school_billing_summary WHERE id = $1`, [
        billingId,
      ]);

      if (!currentBilling.rows.length) {
        return res.status(404).json({ message: "Billing record not found" });
      }

      await storage.executeQuery(
        `
          UPDATE school_billing_summary 
          SET payment_status = $1, updated_at = NOW()
          WHERE id = $2
        `,
        [status, billingId]
      );

      await logAdminAction(req, "billing_status_update", "billing", billingId, {
        schoolId: currentBilling.rows[0].school_id,
        oldStatus: currentBilling.rows[0].payment_status,
        newStatus: status,
        notes: notes || "Status updated by platform admin",
      });

      res.json({ message: "Billing status updated successfully" });
    } catch (error) {
      console.error("Error updating billing status:", error);
      res.status(500).json({ message: "Failed to update billing status" });
    }
  });

  app.get("/api/platform/audit-log", ...platformAdminHandlers, async (req: Request, res: Response) => {
    try {
      const { target_type, limit = 100 } = req.query;
      const params: any[] = [];
      let whereClause = "";

      if (target_type) {
        whereClause = "WHERE aa.target_type = $1";
        params.push(target_type);
      }

      const auditLog = await storage.executeQuery(
        `
          SELECT 
            aa.*,
            u.username as actor_username,
            u.name as actor_name
          FROM admin_actions aa
          LEFT JOIN users u ON aa.actor_id = u.id
          ${whereClause}
          ORDER BY aa.created_at DESC
          LIMIT $${params.length + 1}
        `,
        [...params, limit]
      );

      res.json({ auditLog: auditLog.rows });
    } catch (error) {
      console.error("Error fetching audit log:", error);
      res.status(500).json({ message: "Failed to fetch audit log" });
    }
  });

  app.get("/api/admin/billing/health", ...platformAdminHandlers, async (_req: Request, res: Response) => {
    try {
      const { enhancedStripeService } = require("../services/enhanced-stripe-service");
      const health = await enhancedStripeService.getBillingHealthStatus();
      res.json(health);
    } catch (error) {
      console.error("Error getting billing health:", error);
      res.status(500).json({ message: "Failed to get billing health status" });
    }
  });

  app.get("/api/admin/billing/alerts", ...platformAdminHandlers, async (req: Request, res: Response) => {
    try {
      const { BillingAuditService } = require("../services/billing-audit-service");
      const limit = parseInt(req.query.limit as string, 10) || 50;
      const unreadOnly = req.query.unread === "true";
      const alerts = await BillingAuditService.getBillingAlerts(limit, unreadOnly);
      res.json(alerts);
    } catch (error) {
      console.error("Error getting billing alerts:", error);
      res.status(500).json({ message: "Failed to get billing alerts" });
    }
  });

  app.post(
    "/api/admin/billing/alerts/:id/resolve",
    ...platformAdminHandlers,
    async (req: any, res: Response) => {
      try {
        const { BillingAuditService } = require("../services/billing-audit-service");
        const alertId = parseInt(req.params.id, 10);
        const actorId = req.user?.id || req.session?.user?.id;
        await BillingAuditService.resolveBillingAlert(alertId, actorId);
        res.json({ success: true });
      } catch (error) {
        console.error("Error resolving billing alert:", error);
        res.status(500).json({ message: "Failed to resolve billing alert" });
      }
    }
  );

  app.get(
    "/api/admin/billing/audit/:schoolId",
    ...platformAdminHandlers,
    async (req: Request, res: Response) => {
      try {
        const { BillingAuditService } = require("../services/billing-audit-service");
        const schoolId = parseInt(req.params.schoolId, 10);
        const limit = parseInt(req.query.limit as string, 10) || 100;
        const audit = await BillingAuditService.getSchoolBillingAudit(schoolId, limit);
        res.json(audit);
      } catch (error) {
        console.error("Error getting billing audit:", error);
        res.status(500).json({ message: "Failed to get billing audit trail" });
      }
    }
  );

  app.post(
    "/api/admin/billing/manual-trigger/:schoolId",
    ...platformAdminHandlers,
    async (req: any, res: Response) => {
      try {
        const { enhancedStripeService } = require("../services/enhanced-stripe-service");
        const schoolId = parseInt(req.params.schoolId, 10);
        const actorId = req.user?.id || req.session?.user?.id;
        const result = await enhancedStripeService.triggerSchoolBilling(schoolId, actorId);
        res.json(result);
      } catch (error) {
        console.error("Error triggering manual billing:", error);
        res.status(500).json({ message: "Failed to trigger manual billing" });
      }
    }
  );

  app.post("/api/admin/billing/process-monthly", ...platformAdminHandlers, async (_req: Request, res: Response) => {
    try {
      const { enhancedStripeService } = require("../services/enhanced-stripe-service");
      const result = await enhancedStripeService.processMonthlyBilling();
      res.json(result);
    } catch (error) {
      console.error("Error processing monthly billing:", error);
      res.status(500).json({ message: "Failed to process monthly billing" });
    }
  });

  app.get(
    "/api/admin/billing/usage-summary/:schoolId",
    ...platformAdminHandlers,
    async (req: Request, res: Response) => {
      try {
        const { enhancedStripeService } = require("../services/enhanced-stripe-service");
        const schoolId = parseInt(req.params.schoolId, 10);
        const summary = await enhancedStripeService.getSchoolUsageSummary(schoolId);
        res.json(summary);
      } catch (error) {
        console.error("Error getting usage summary:", error);
        res.status(500).json({ message: "Failed to get usage summary" });
      }
    }
  );

  app.get("/api/admin/billing/usage-summary", ...platformAdminHandlers, async (_req: Request, res: Response) => {
    try {
      const { enhancedStripeService } = require("../services/enhanced-stripe-service");
      const summaries = [];
      for (let schoolId = 1; schoolId <= 3; schoolId++) {
        try {
          const summary = await enhancedStripeService.getSchoolUsageSummary(schoolId);
          summaries.push(summary);
        } catch (error) {
          console.error(`Failed to get summary for school ${schoolId}:`, error);
        }
      }

      res.json(summaries);
    } catch (error) {
      console.error("Error getting usage summaries:", error);
      res.status(500).json({ message: "Failed to get usage summaries" });
    }
  });

  app.post("/api/admin/billing/check-warnings", ...platformAdminHandlers, async (_req: Request, res: Response) => {
    try {
      const { enhancedStripeService } = require("../services/enhanced-stripe-service");
      const warnings = await enhancedStripeService.checkPreBillingWarnings();
      res.json({ warnings, count: warnings.length, checkedAt: new Date().toISOString() });
    } catch (error) {
      console.error("Error checking pre-billing warnings:", error);
      res.status(500).json({ message: "Failed to check pre-billing warnings" });
    }
  });

  app.get("/api/admin/billing/invoices", ...platformAdminHandlers, async (req: Request, res: Response) => {
    try {
      const { enhancedStripeService } = require("../services/enhanced-stripe-service");
      const schoolId = req.query.schoolId ? parseInt(req.query.schoolId as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const invoices = await enhancedStripeService.listInvoices(schoolId, limit);
      res.json({ invoices });
    } catch (error: any) {
      console.error("Error listing invoices:", error);
      res.status(500).json({ message: error.message || "Failed to list invoices" });
    }
  });

  app.post("/api/admin/billing/invoices", ...platformAdminHandlers, async (req: Request, res: Response) => {
    try {
      const { enhancedStripeService } = require("../services/enhanced-stripe-service");
      const { schoolId, items, dueDate } = req.body;

      if (!schoolId || !items || !Array.isArray(items)) {
        return res.status(400).json({ message: "schoolId and items array required" });
      }

      const invoice = await enhancedStripeService.createInvoice(
        schoolId,
        items,
        dueDate ? new Date(dueDate) : undefined
      );
      res.json({ success: true, invoice });
    } catch (error: any) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: error.message || "Failed to create invoice" });
    }
  });

  app.get(
    "/api/admin/billing/invoices/:invoiceId/pdf",
    ...platformAdminHandlers,
    async (req: Request, res: Response) => {
      try {
        const { enhancedStripeService } = require("../services/enhanced-stripe-service");
        const pdfUrl = await enhancedStripeService.getInvoicePdfUrl(req.params.invoiceId);
        res.json({ pdfUrl });
      } catch (error: any) {
        console.error("Error getting invoice PDF:", error);
        res.status(500).json({ message: error.message || "Failed to get invoice PDF" });
      }
    }
  );

  app.post(
    "/api/admin/billing/invoices/:invoiceId/send",
    ...platformAdminHandlers,
    async (req: Request, res: Response) => {
      try {
        const { enhancedStripeService } = require("../services/enhanced-stripe-service");
        const invoice = await enhancedStripeService.sendInvoice(req.params.invoiceId);
        res.json({ success: true, invoice });
      } catch (error: any) {
        console.error("Error sending invoice:", error);
        res.status(500).json({ message: error.message || "Failed to send invoice" });
      }
    }
  );

  app.post(
    "/api/admin/billing/invoices/:invoiceId/finalize",
    ...platformAdminHandlers,
    async (req: Request, res: Response) => {
      try {
        const { enhancedStripeService } = require("../services/enhanced-stripe-service");
        const invoice = await enhancedStripeService.finalizeInvoice(req.params.invoiceId);
        res.json({ success: true, invoice });
      } catch (error: any) {
        console.error("Error finalizing invoice:", error);
        res.status(500).json({ message: error.message || "Failed to finalize invoice" });
      }
    }
  );

  app.post(
    "/api/admin/billing/invoices/:invoiceId/void",
    ...platformAdminHandlers,
    async (req: Request, res: Response) => {
      try {
        const { enhancedStripeService } = require("../services/enhanced-stripe-service");
        const { reason } = req.body;
        const invoice = await enhancedStripeService.voidInvoice(req.params.invoiceId, reason || "No reason provided");
        res.json({ success: true, invoice });
      } catch (error: any) {
        console.error("Error voiding invoice:", error);
        res.status(500).json({ message: error.message || "Failed to void invoice" });
      }
    }
  );

  app.get("/api/admin/billing/pricing", ...platformAdminHandlers, async (_req: Request, res: Response) => {
    try {
      const { enhancedStripeService } = require("../services/enhanced-stripe-service");
      const pricing = await enhancedStripeService.listAllSchoolPricing();
      res.json({ pricing });
    } catch (error: any) {
      console.error("Error listing pricing:", error);
      res.status(500).json({ message: error.message || "Failed to list pricing" });
    }
  });

  app.get(
    "/api/admin/billing/pricing/:schoolId",
    ...platformAdminHandlers,
    async (req: Request, res: Response) => {
      try {
        const { enhancedStripeService } = require("../services/enhanced-stripe-service");
        const schoolId = parseInt(req.params.schoolId, 10);
        const pricing = await enhancedStripeService.getSchoolPricing(schoolId);
        if (!pricing) {
          return res.status(404).json({ message: "School pricing not found" });
        }
        res.json(pricing);
      } catch (error: any) {
        console.error("Error getting school pricing:", error);
        res.status(500).json({ message: error.message || "Failed to get school pricing" });
      }
    }
  );

  app.put(
    "/api/admin/billing/pricing/:schoolId",
    ...platformAdminHandlers,
    async (req: Request, res: Response) => {
      try {
        const { enhancedStripeService } = require("../services/enhanced-stripe-service");
        const schoolId = parseInt(req.params.schoolId, 10);
        const { monthlyPrice, reason } = req.body;

        if (typeof monthlyPrice !== "number" || monthlyPrice < 0) {
          return res.status(400).json({ message: "Valid monthlyPrice required" });
        }

        const result = await enhancedStripeService.updateSchoolPrice(
          schoolId,
          monthlyPrice,
          reason || "Price update"
        );
        res.json(result);
      } catch (error: any) {
        console.error("Error updating school pricing:", error);
        res.status(500).json({ message: error.message || "Failed to update school pricing" });
      }
    }
  );

  app.post(
    "/api/admin/billing/pricing/:schoolId/credit",
    ...platformAdminHandlers,
    async (req: Request, res: Response) => {
      try {
        const { enhancedStripeService } = require("../services/enhanced-stripe-service");
        const schoolId = parseInt(req.params.schoolId, 10);
        const { amount, reason } = req.body;

        if (typeof amount !== "number" || amount <= 0) {
          return res.status(400).json({ message: "Valid positive amount required" });
        }

        const result = await enhancedStripeService.applyCredit(schoolId, amount, reason || "Credit applied");
        res.json(result);
      } catch (error: any) {
        console.error("Error applying credit:", error);
        res.status(500).json({ message: error.message || "Failed to apply credit" });
      }
    }
  );

  app.get("/api/admin/billing/payments", ...platformAdminHandlers, async (req: Request, res: Response) => {
    try {
      const { enhancedStripeService } = require("../services/enhanced-stripe-service");
      const schoolId = req.query.schoolId ? parseInt(req.query.schoolId as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const payments = await enhancedStripeService.listPayments(schoolId, limit);
      res.json({ payments });
    } catch (error: any) {
      console.error("Error listing payments:", error);
      res.status(500).json({ message: error.message || "Failed to list payments" });
    }
  });

  app.get(
    "/api/admin/billing/payments/:paymentIntentId",
    ...platformAdminHandlers,
    async (req: Request, res: Response) => {
      try {
        const { enhancedStripeService } = require("../services/enhanced-stripe-service");
        const payment = await enhancedStripeService.getPaymentDetails(req.params.paymentIntentId);
        res.json(payment);
      } catch (error: any) {
        console.error("Error getting payment details:", error);
        res.status(500).json({ message: error.message || "Failed to get payment details" });
      }
    }
  );

  app.get("/api/admin/billing/refunds", ...platformAdminHandlers, async (req: Request, res: Response) => {
    try {
      const { enhancedStripeService } = require("../services/enhanced-stripe-service");
      const schoolId = req.query.schoolId ? parseInt(req.query.schoolId as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const refunds = await enhancedStripeService.getRefundHistory(schoolId, limit);
      res.json({ refunds });
    } catch (error: any) {
      console.error("Error listing refunds:", error);
      res.status(500).json({ message: error.message || "Failed to list refunds" });
    }
  });

  app.post("/api/admin/billing/refunds", ...platformAdminHandlers, async (req: Request, res: Response) => {
    try {
      const { enhancedStripeService } = require("../services/enhanced-stripe-service");
      const { paymentIntentId, amount, reason, schoolId } = req.body;

      if (!paymentIntentId) {
        return res.status(400).json({ message: "paymentIntentId required" });
      }

      if (!reason) {
        return res.status(400).json({ message: "reason required" });
      }

      const result = await enhancedStripeService.issueRefund(paymentIntentId, amount || null, reason, schoolId);
      res.json(result);
    } catch (error: any) {
      console.error("Error issuing refund:", error);
      res.status(500).json({ message: error.message || "Failed to issue refund" });
    }
  });

  app.get("/api/admin/platform-stats", ...platformAdminHandlers, async (_req: Request, res: Response) => {
    try {
      const messageStats = await storage.getMessageStats();
      const practiceStats = await storage.getStudentPracticeStats("1h");

      res.json({
        messaging: messageStats,
        practice: {
          activeStudentsLastHour: Number(practiceStats.active_students) || 0,
          sessionsLastHour: Number(practiceStats.total_sessions) || 0,
          avgSessionMinutes: Math.round(Number(practiceStats.avg_session_minutes) || 0),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error fetching platform stats:", error);
      res.status(500).json({ message: "Failed to fetch platform statistics" });
    }
  });
}
