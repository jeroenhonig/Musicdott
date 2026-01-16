import nodemailer from 'nodemailer';

// Configure SMTP transporter for Hostinger email server
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true, // SSL encryption for port 465
  auth: {
    user: process.env.SMTP_USER || 'mail@musicdott.app',
    pass: process.env.SMTP_PASSWORD || ''
  }
});

// Test the connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.warn('SMTP connection failed:', error.message);
  } else {
    console.log('✅ SMTP server ready for email notifications');
  }
});

const NOTIFICATION_EMAIL = 'mail@musicdott.app';
const FROM_EMAIL = 'mail@musicdott.app';

interface EmailNotificationData {
  type: 'new_school' | 'new_teacher' | 'subscription_change' | 'billing_event' | 'platform_alert';
  subject: string;
  data: any;
}

export class EmailNotificationService {
  
  async sendNewSchoolRegistration(data: any): Promise<boolean> {
    return EmailNotificationService.sendNotification({
      type: 'new_school',
      subject: `New School Registration: ${data.schoolName}`,
      data
    });
  }

  static async sendNotification(notification: EmailNotificationData): Promise<boolean> {
    if (!process.env.SMTP_PASSWORD) {
      console.log(`[EMAIL] Would send notification: ${notification.subject} (SMTP password not configured)`);
      return false;
    }

    try {
      const emailContent = this.generateEmailContent(notification);
      
      await transporter.sendMail({
        from: FROM_EMAIL,
        to: NOTIFICATION_EMAIL,
        subject: `[MusicDott Platform] ${notification.subject}`,
        html: emailContent.html,
        text: emailContent.text,
      });

      console.log(`[EMAIL] Notification sent: ${notification.subject}`);
      return true;
    } catch (error: any) {
      console.error('Failed to send email notification:', error);
      console.error('SMTP error details:', error.message);
      return false;
    }
  }

  static async notifyNewSchoolRegistration(schoolData: any): Promise<void> {
    await this.sendNotification({
      type: 'new_school',
      subject: `New School Registration: ${schoolData.name}`,
      data: schoolData
    });
  }

  static async notifyNewTeacherSubscription(teacherData: any, schoolData?: any): Promise<void> {
    await this.sendNotification({
      type: 'new_teacher',
      subject: `New Teacher Subscription: ${teacherData.name}${schoolData ? ` (${schoolData.name})` : ''}`,
      data: { teacher: teacherData, school: schoolData }
    });
  }

  static async notifySubscriptionChange(changeData: any): Promise<void> {
    await this.sendNotification({
      type: 'subscription_change',
      subject: `Subscription ${changeData.action}: ${changeData.entity}`,
      data: changeData
    });
  }

  static async notifyBillingEvent(billingData: any): Promise<void> {
    await this.sendNotification({
      type: 'billing_event',
      subject: `Billing Event: ${billingData.type}`,
      data: billingData
    });
  }

  static async notifyPlatformAlert(alertData: any): Promise<void> {
    await this.sendNotification({
      type: 'platform_alert',
      subject: `Platform Alert: ${alertData.message}`,
      data: alertData
    });
  }

  private static generateEmailContent(notification: EmailNotificationData): { html: string; text: string } {
    const timestamp = new Date().toLocaleString('en-US', { 
      timeZone: 'Europe/Amsterdam',
      dateStyle: 'full',
      timeStyle: 'medium'
    });

    switch (notification.type) {
      case 'new_school':
        return {
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">🏫 New School Registration</h2>
              <p><strong>School Name:</strong> ${notification.data.name}</p>
              <p><strong>Location:</strong> ${notification.data.address || 'Not provided'}</p>
              <p><strong>Contact Email:</strong> ${notification.data.email || 'Not provided'}</p>
              <p><strong>Contact Phone:</strong> ${notification.data.phone || 'Not provided'}</p>
              <p><strong>Registration Time:</strong> ${timestamp}</p>
              <hr style="margin: 20px 0;">
              <p style="color: #666; font-size: 14px;">This notification was sent automatically by the MusicDott platform.</p>
            </div>
          `,
          text: `
New School Registration

School Name: ${notification.data.name}
Location: ${notification.data.address || 'Not provided'}
Contact Email: ${notification.data.email || 'Not provided'}
Contact Phone: ${notification.data.phone || 'Not provided'}
Registration Time: ${timestamp}

This notification was sent automatically by the MusicDott platform.
          `
        };

      case 'new_teacher':
        return {
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #16a34a;">👨‍🏫 New Teacher Subscription</h2>
              <p><strong>Teacher Name:</strong> ${notification.data.teacher.name}</p>
              <p><strong>Username:</strong> ${notification.data.teacher.username}</p>
              <p><strong>Email:</strong> ${notification.data.teacher.email || 'Not provided'}</p>
              <p><strong>Instruments:</strong> ${notification.data.teacher.instruments || 'Not specified'}</p>
              ${notification.data.school ? `<p><strong>School:</strong> ${notification.data.school.name}</p>` : ''}
              <p><strong>Registration Time:</strong> ${timestamp}</p>
              <hr style="margin: 20px 0;">
              <p style="color: #666; font-size: 14px;">This notification was sent automatically by the MusicDott platform.</p>
            </div>
          `,
          text: `
New Teacher Subscription

Teacher Name: ${notification.data.teacher.name}
Username: ${notification.data.teacher.username}
Email: ${notification.data.teacher.email || 'Not provided'}
Instruments: ${notification.data.teacher.instruments || 'Not specified'}
${notification.data.school ? `School: ${notification.data.school.name}` : ''}
Registration Time: ${timestamp}

This notification was sent automatically by the MusicDott platform.
          `
        };

      case 'subscription_change':
        return {
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc2626;">📋 Subscription Change</h2>
              <p><strong>Action:</strong> ${notification.data.action}</p>
              <p><strong>Entity:</strong> ${notification.data.entity}</p>
              <p><strong>Previous Plan:</strong> ${notification.data.previousPlan || 'N/A'}</p>
              <p><strong>New Plan:</strong> ${notification.data.newPlan || 'N/A'}</p>
              <p><strong>Change Time:</strong> ${timestamp}</p>
              <hr style="margin: 20px 0;">
              <p style="color: #666; font-size: 14px;">This notification was sent automatically by the MusicDott platform.</p>
            </div>
          `,
          text: `
Subscription Change

Action: ${notification.data.action}
Entity: ${notification.data.entity}
Previous Plan: ${notification.data.previousPlan || 'N/A'}
New Plan: ${notification.data.newPlan || 'N/A'}
Change Time: ${timestamp}

This notification was sent automatically by the MusicDott platform.
          `
        };

      case 'billing_event':
        return {
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #7c3aed;">💰 Billing Event</h2>
              <p><strong>Event Type:</strong> ${notification.data.type}</p>
              <p><strong>Amount:</strong> €${notification.data.amount || '0.00'}</p>
              <p><strong>Entity:</strong> ${notification.data.entity || 'Platform'}</p>
              <p><strong>Status:</strong> ${notification.data.status || 'Unknown'}</p>
              <p><strong>Event Time:</strong> ${timestamp}</p>
              <hr style="margin: 20px 0;">
              <p style="color: #666; font-size: 14px;">This notification was sent automatically by the MusicDott platform.</p>
            </div>
          `,
          text: `
Billing Event

Event Type: ${notification.data.type}
Amount: €${notification.data.amount || '0.00'}
Entity: ${notification.data.entity || 'Platform'}
Status: ${notification.data.status || 'Unknown'}
Event Time: ${timestamp}

This notification was sent automatically by the MusicDott platform.
          `
        };

      case 'platform_alert':
        return {
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc2626;">⚠️ Platform Alert</h2>
              <p><strong>Alert:</strong> ${notification.data.message}</p>
              <p><strong>Severity:</strong> ${notification.data.severity || 'Medium'}</p>
              <p><strong>Component:</strong> ${notification.data.component || 'Unknown'}</p>
              <p><strong>Alert Time:</strong> ${timestamp}</p>
              <hr style="margin: 20px 0;">
              <p style="color: #666; font-size: 14px;">This notification was sent automatically by the MusicDott platform.</p>
            </div>
          `,
          text: `
Platform Alert

Alert: ${notification.data.message}
Severity: ${notification.data.severity || 'Medium'}
Component: ${notification.data.component || 'Unknown'}
Alert Time: ${timestamp}

This notification was sent automatically by the MusicDott platform.
          `
        };

      default:
        return {
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Platform Notification</h2>
              <p>${notification.subject}</p>
              <p><strong>Time:</strong> ${timestamp}</p>
              <hr style="margin: 20px 0;">
              <p style="color: #666; font-size: 14px;">This notification was sent automatically by the MusicDott platform.</p>
            </div>
          `,
          text: `
Platform Notification

${notification.subject}
Time: ${timestamp}

This notification was sent automatically by the MusicDott platform.
          `
        };
    }
  }

  // Send welcome email to new school
  static async notifySchoolWelcome(data: {
    schoolName: string;
    ownerName: string;
    email: string;
    username: string;
  }) {
    const timestamp = new Date().toLocaleString('en-US', { 
      timeZone: 'Europe/Amsterdam',
      dateStyle: 'full',
      timeStyle: 'medium'
    });

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb; text-align: center;">🎵 Welcome to MusicDott!</h1>
        <p>Dear ${data.ownerName},</p>
        <p>Congratulations! Your MusicDott account has been successfully created.</p>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1e40af; margin-top: 0;">Account Details:</h3>
          <p><strong>School:</strong> ${data.schoolName}</p>
          <p><strong>Username:</strong> ${data.username}</p>
          <p><strong>Login URL:</strong> <a href="https://musicdott.app">https://musicdott.app</a></p>
        </div>

        <h3 style="color: #1e40af;">Next Steps:</h3>
        <ol>
          <li>Log in to your dashboard to explore the platform</li>
          <li>Add your first students and teachers</li>
          <li>Create lessons and song content</li>
          <li>Set up your billing preferences</li>
        </ol>

        <p>If you need any assistance, please don't hesitate to contact our support team.</p>
        
        <p>Welcome to the MusicDott community!</p>
        <p>The MusicDott Team</p>
        
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px; text-align: center;">
          Registration completed on ${timestamp}
        </p>
      </div>
    `;

    const textContent = `
Welcome to MusicDott!

Dear ${data.ownerName},

Congratulations! Your MusicDott account has been successfully created.

Account Details:
- School: ${data.schoolName}
- Username: ${data.username}
- Login URL: https://musicdott.app

Next Steps:
1. Log in to your dashboard to explore the platform
2. Add your first students and teachers
3. Create lessons and song content
4. Set up your billing preferences

If you need any assistance, please don't hesitate to contact our support team.

Welcome to the MusicDott community!
The MusicDott Team

Registration completed on ${timestamp}
    `;

    // Send to both school and platform owner
    await Promise.all([
      mailService.send({
        to: data.email,
        from: 'info@musicdott.com',
        subject: 'Welcome to MusicDott - Your Account is Ready!',
        html: htmlContent,
        text: textContent
      }),
      this.sendNotification({
        type: 'new_school',
        subject: `New School Registration - ${data.schoolName}`,
        data: {
          name: data.schoolName,
          owner: data.ownerName,
          email: data.email,
          username: data.username
        }
      })
    ]);
  }

  // Send payment due notification to school
  static async notifySchoolPaymentDue(data: {
    schoolName: string;
    ownerName: string;
    email: string;
    amount: number;
    dueDate: string;
    invoiceId?: string;
  }) {
    const timestamp = new Date().toLocaleString('en-US', { 
      timeZone: 'Europe/Amsterdam',
      dateStyle: 'full',
      timeStyle: 'medium'
    });

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #dc2626; text-align: center;">💳 Payment Due - MusicDott</h1>
        <p>Dear ${data.ownerName},</p>
        <p>This is a friendly reminder that your MusicDott subscription payment is due.</p>
        
        <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #dc2626; margin-top: 0;">Payment Details:</h3>
          <p><strong>School:</strong> ${data.schoolName}</p>
          <p><strong>Amount Due:</strong> €${data.amount.toFixed(2)}</p>
          <p><strong>Due Date:</strong> ${data.dueDate}</p>
          ${data.invoiceId ? `<p><strong>Invoice ID:</strong> ${data.invoiceId}</p>` : ''}
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://musicdott.app/billing" style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">
            Pay Now
          </a>
        </div>

        <p>To avoid any interruption to your service, please ensure payment is completed by the due date.</p>
        
        <p>If you have any questions about your bill or need assistance, please contact our support team.</p>
        
        <p>Thank you for choosing MusicDott!</p>
        <p>The MusicDott Team</p>
        
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px; text-align: center;">
          Payment reminder sent on ${timestamp}
        </p>
      </div>
    `;

    const textContent = `
Payment Due - MusicDott

Dear ${data.ownerName},

This is a friendly reminder that your MusicDott subscription payment is due.

Payment Details:
- School: ${data.schoolName}
- Amount Due: €${data.amount.toFixed(2)}
- Due Date: ${data.dueDate}
${data.invoiceId ? `- Invoice ID: ${data.invoiceId}` : ''}

To avoid any interruption to your service, please ensure payment is completed by the due date.

Please log in to https://musicdott.app/billing to complete your payment.

If you have any questions about your bill or need assistance, please contact our support team.

Thank you for choosing MusicDott!
The MusicDott Team

Payment reminder sent on ${timestamp}
    `;

    return await mailService.send({
      to: data.email,
      from: 'info@musicdott.com',
      subject: `Payment Due - ${data.schoolName} - €${data.amount.toFixed(2)}`,
      html: htmlContent,
      text: textContent
    });
  }
}