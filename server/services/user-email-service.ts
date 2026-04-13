/**
 * User-facing email notifications for MusicDott.
 * All methods are soft-fail: they log on error but never throw.
 * Sending is silently skipped when SMTP_PASSWORD is not configured.
 */
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true,
  auth: {
    user: process.env.SMTP_USER || 'mail@musicdott.app',
    pass: process.env.SMTP_PASSWORD || '',
  },
});

const FROM = '"MusicDott" <mail@musicdott.app>';
const APP_URL = process.env.APP_URL || 'https://musicdott.app';

// ─── Shared HTML wrapper ────────────────────────────────────────────────────

function htmlWrap(body: string): string {
  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
        <!-- Header -->
        <tr>
          <td style="background:#1B2B6B;padding:24px 40px">
            <span style="color:#F5B800;font-size:22px;font-weight:bold;letter-spacing:-0.5px">MusicDott</span>
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding:40px">${body}</td></tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f1f5f9;padding:20px 40px;text-align:center">
            <p style="color:#94a3b8;font-size:12px;margin:0">
              © MusicDott · <a href="${APP_URL}" style="color:#94a3b8">musicdott.app</a><br>
              Je ontvangt deze e-mail als leerling of docent bij een school die MusicDott gebruikt.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Send helper ────────────────────────────────────────────────────────────

async function send(to: string, subject: string, html: string, text: string): Promise<void> {
  if (!process.env.SMTP_PASSWORD) {
    console.log(`[UserEmail] Skipped (no SMTP_PASSWORD): "${subject}" → ${to}`);
    return;
  }
  try {
    await transporter.sendMail({ from: FROM, to, subject, html, text });
    console.log(`[UserEmail] Sent: "${subject}" → ${to}`);
  } catch (err: any) {
    console.error(`[UserEmail] Failed: "${subject}" → ${to}:`, err.message);
  }
}

// ─── 1. Welcome email for new students ─────────────────────────────────────

export async function sendStudentWelcomeEmail(opts: {
  to: string;
  studentName: string;
  username: string;
  password: string;
  schoolName: string;
}): Promise<void> {
  const { to, studentName, username, password, schoolName } = opts;
  const loginUrl = `${APP_URL}/`;

  const html = htmlWrap(`
    <h1 style="color:#1B2B6B;font-size:26px;margin:0 0 8px">Welkom bij MusicDott, ${studentName}! 🎵</h1>
    <p style="color:#475569;margin:0 0 24px">Je bent aangemeld als leerling bij <strong>${schoolName}</strong>. Hieronder vind je je inloggegevens.</p>

    <div style="background:#f0f3ff;border-radius:8px;padding:24px;margin:0 0 24px">
      <p style="margin:0 0 8px;color:#64748b;font-size:13px;text-transform:uppercase;letter-spacing:0.5px">Inloggegevens</p>
      <p style="margin:0 0 4px;font-size:16px"><strong>Gebruikersnaam:</strong> ${username}</p>
      <p style="margin:0;font-size:16px"><strong>Wachtwoord:</strong> <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px">${password}</code></p>
    </div>

    <p style="color:#475569;margin:0 0 24px">We raden je aan je wachtwoord te wijzigen na je eerste inlog.</p>

    <a href="${loginUrl}" style="display:inline-block;background:#1B2B6B;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;font-size:15px">
      Inloggen →
    </a>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0">
    <p style="color:#94a3b8;font-size:13px;margin:0">Vragen? Neem contact op met je docent bij ${schoolName}.</p>
  `);

  const text = `Welkom bij MusicDott, ${studentName}!

Je bent aangemeld als leerling bij ${schoolName}.

Gebruikersnaam: ${username}
Wachtwoord: ${password}

Log in via: ${loginUrl}

Vragen? Neem contact op met je docent bij ${schoolName}.`;

  await send(to, `Welkom bij MusicDott — je inloggegevens voor ${schoolName}`, html, text);
}

// ─── 2. Assignment notification for students ────────────────────────────────

export async function sendAssignmentEmail(opts: {
  to: string;
  studentName: string;
  assignmentTitle: string;
  teacherName: string;
  schoolName: string;
  assignmentId: number;
  dueDate?: string | null;
}): Promise<void> {
  const { to, studentName, assignmentTitle, teacherName, schoolName, assignmentId, dueDate } = opts;
  const assignmentUrl = `${APP_URL}/assignments`;

  const dueLine = dueDate
    ? `<p style="color:#475569;margin:0 0 24px">📅 <strong>Inleverdatum:</strong> ${new Date(dueDate).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>`
    : '';

  const html = htmlWrap(`
    <h1 style="color:#1B2B6B;font-size:24px;margin:0 0 8px">Nieuwe opdracht voor jou 📋</h1>
    <p style="color:#475569;margin:0 0 24px">Hoi ${studentName}, <strong>${teacherName}</strong> heeft een nieuwe opdracht voor je aangemaakt bij ${schoolName}.</p>

    <div style="background:#f0f3ff;border-left:4px solid #1B2B6B;border-radius:0 8px 8px 0;padding:20px 24px;margin:0 0 24px">
      <p style="margin:0;font-size:18px;font-weight:bold;color:#1B2B6B">${assignmentTitle}</p>
    </div>

    ${dueLine}

    <a href="${assignmentUrl}" style="display:inline-block;background:#1B2B6B;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;font-size:15px">
      Opdracht bekijken →
    </a>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0">
    <p style="color:#94a3b8;font-size:13px;margin:0">Vragen? Stuur een bericht via MusicDott aan ${teacherName}.</p>
  `);

  const text = `Nieuwe opdracht: ${assignmentTitle}

Hoi ${studentName},

${teacherName} heeft een nieuwe opdracht voor je aangemaakt bij ${schoolName}.

Opdracht: ${assignmentTitle}
${dueDate ? `Inleverdatum: ${new Date(dueDate).toLocaleDateString('nl-NL')}` : ''}

Bekijk je opdracht: ${assignmentUrl}`;

  await send(to, `Nieuwe opdracht: ${assignmentTitle}`, html, text);
}

// ─── 3. Lesson reminder (day before) ───────────────────────────────────────

export async function sendLessonReminderEmail(opts: {
  to: string;
  studentName: string;
  teacherName: string;
  lessonDate: Date;
  startTime?: string | null;
  location?: string | null;
  schoolName: string;
}): Promise<void> {
  const { to, studentName, teacherName, lessonDate, startTime, location, schoolName } = opts;

  const dateStr = lessonDate.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
  const timeStr = startTime ? ` om ${startTime}` : '';
  const locationLine = location
    ? `<p style="color:#475569;margin:0 0 8px">📍 <strong>Locatie:</strong> ${location}</p>`
    : '';

  const html = htmlWrap(`
    <h1 style="color:#1B2B6B;font-size:24px;margin:0 0 8px">Herinnering: les morgen 🎸</h1>
    <p style="color:#475569;margin:0 0 24px">Hoi ${studentName}, je hebt morgen les bij <strong>${teacherName}</strong>.</p>

    <div style="background:#f0f3ff;border-radius:8px;padding:24px;margin:0 0 24px">
      <p style="margin:0 0 8px;color:#475569">📅 <strong>${dateStr}${timeStr}</strong></p>
      <p style="margin:0 0 8px;color:#475569">👨‍🏫 <strong>Docent:</strong> ${teacherName}</p>
      ${locationLine}
    </div>

    <a href="${APP_URL}/" style="display:inline-block;background:#1B2B6B;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;font-size:15px">
      Open MusicDott →
    </a>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0">
    <p style="color:#94a3b8;font-size:13px;margin:0">${schoolName} · via MusicDott</p>
  `);

  const text = `Herinnering: les morgen

Hoi ${studentName},

Je hebt morgen les bij ${teacherName} bij ${schoolName}.

📅 ${dateStr}${timeStr}
${location ? `📍 Locatie: ${location}` : ''}

Open MusicDott: ${APP_URL}/`;

  await send(to, `Herinnering: les morgen met ${teacherName}`, html, text);
}
