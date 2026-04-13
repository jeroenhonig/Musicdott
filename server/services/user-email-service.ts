/**
 * User-facing email notifications for MusicDott — NL · EN · DE · ES.
 * All methods are soft-fail: they log on error but never throw.
 * Sending is silently skipped when SMTP_PASSWORD is not configured.
 *
 * Language is resolved per-user via getUserLanguage(userId).
 * Falls back to 'nl' when the user has no stored preference.
 */
import nodemailer from 'nodemailer';
import { storage } from '../storage-wrapper';

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

type Lang = 'nl' | 'en' | 'de' | 'es';
type T = Record<Lang, string>;

// ─── Language resolution ─────────────────────────────────────────────────────

/** Look up the user's stored language preference; defaults to 'nl'. */
export async function getUserLanguage(userId: number): Promise<Lang> {
  try {
    const prefs = await storage.getUserPreferences(userId);
    const lang = (prefs as any)?.language;
    if (lang === 'nl' || lang === 'en' || lang === 'de' || lang === 'es') return lang as Lang;
  } catch {
    // Ignore — fall back to default
  }
  return 'nl';
}

/** Pick the right string for the given language, falling back through nl → en. */
function t(strings: T, lang: Lang): string {
  return strings[lang] ?? strings.nl ?? strings.en;
}

/** Locale string for date formatting per language. */
const DATE_LOCALE: Record<Lang, string> = {
  nl: 'nl-NL',
  en: 'en-GB',
  de: 'de-DE',
  es: 'es-ES',
};

// ─── Shared HTML wrapper ─────────────────────────────────────────────────────

function htmlWrap(lang: Lang, body: string): string {
  const footer: T = {
    nl: `Je ontvangt deze e-mail als leerling of docent bij een school die MusicDott gebruikt.`,
    en: `You receive this email as a student or teacher at a school using MusicDott.`,
    de: `Sie erhalten diese E-Mail als Schüler oder Lehrer an einer Schule, die MusicDott verwendet.`,
    es: `Recibes este correo como alumno o profesor en una escuela que usa MusicDott.`,
  };

  return `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
        <tr>
          <td style="background:#1B2B6B;padding:24px 40px">
            <span style="color:#F5B800;font-size:22px;font-weight:bold;letter-spacing:-0.5px">MusicDott</span>
          </td>
        </tr>
        <tr><td style="padding:40px">${body}</td></tr>
        <tr>
          <td style="background:#f1f5f9;padding:20px 40px;text-align:center">
            <p style="color:#94a3b8;font-size:12px;margin:0">
              © MusicDott · <a href="${APP_URL}" style="color:#94a3b8">musicdott.app</a><br>
              ${t(footer, lang)}
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Send helper ─────────────────────────────────────────────────────────────

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

// ─── 1. Welcome email for new students ──────────────────────────────────────

export async function sendStudentWelcomeEmail(opts: {
  to: string;
  studentName: string;
  username: string;
  password: string;
  schoolName: string;
  lang?: Lang;
}): Promise<void> {
  const { to, studentName, username, password, schoolName } = opts;
  const lang = opts.lang ?? 'nl';
  const loginUrl = `${APP_URL}/`;

  const subject: T = {
    nl: `Welkom bij MusicDott — je inloggegevens voor ${schoolName}`,
    en: `Welcome to MusicDott — your login details for ${schoolName}`,
    de: `Willkommen bei MusicDott — deine Anmeldedaten für ${schoolName}`,
    es: `Bienvenido a MusicDott — tus datos de acceso para ${schoolName}`,
  };
  const heading: T = {
    nl: `Welkom bij MusicDott, ${studentName}! 🎵`,
    en: `Welcome to MusicDott, ${studentName}! 🎵`,
    de: `Willkommen bei MusicDott, ${studentName}! 🎵`,
    es: `¡Bienvenido a MusicDott, ${studentName}! 🎵`,
  };
  const intro: T = {
    nl: `Je bent aangemeld als leerling bij <strong>${schoolName}</strong>. Hieronder vind je je inloggegevens.`,
    en: `You have been registered as a student at <strong>${schoolName}</strong>. Below are your login details.`,
    de: `Du wurdest als Schüler bei <strong>${schoolName}</strong> registriert. Unten findest du deine Anmeldedaten.`,
    es: `Has sido registrado como alumno en <strong>${schoolName}</strong>. A continuación encontrarás tus datos de acceso.`,
  };
  const credentialsLabel: T = {
    nl: 'Inloggegevens',
    en: 'Login details',
    de: 'Anmeldedaten',
    es: 'Datos de acceso',
  };
  const usernameLabel: T = { nl: 'Gebruikersnaam', en: 'Username', de: 'Benutzername', es: 'Usuario' };
  const passwordLabel: T = { nl: 'Wachtwoord', en: 'Password', de: 'Passwort', es: 'Contraseña' };
  const changeHint: T = {
    nl: 'We raden je aan je wachtwoord te wijzigen na je eerste inlog.',
    en: 'We recommend changing your password after your first login.',
    de: 'Wir empfehlen, dein Passwort nach der ersten Anmeldung zu ändern.',
    es: 'Te recomendamos cambiar tu contraseña después de tu primer inicio de sesión.',
  };
  const loginBtn: T = { nl: 'Inloggen →', en: 'Log in →', de: 'Anmelden →', es: 'Iniciar sesión →' };
  const helpLine: T = {
    nl: `Vragen? Neem contact op met je docent bij ${schoolName}.`,
    en: `Questions? Contact your teacher at ${schoolName}.`,
    de: `Fragen? Wende dich an deinen Lehrer bei ${schoolName}.`,
    es: `¿Preguntas? Contacta con tu profesor en ${schoolName}.`,
  };

  const html = htmlWrap(lang, `
    <h1 style="color:#1B2B6B;font-size:26px;margin:0 0 8px">${t(heading, lang)}</h1>
    <p style="color:#475569;margin:0 0 24px">${t(intro, lang)}</p>
    <div style="background:#f0f3ff;border-radius:8px;padding:24px;margin:0 0 24px">
      <p style="margin:0 0 8px;color:#64748b;font-size:13px;text-transform:uppercase;letter-spacing:0.5px">${t(credentialsLabel, lang)}</p>
      <p style="margin:0 0 4px;font-size:16px"><strong>${t(usernameLabel, lang)}:</strong> ${username}</p>
      <p style="margin:0;font-size:16px"><strong>${t(passwordLabel, lang)}:</strong> <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px">${password}</code></p>
    </div>
    <p style="color:#475569;margin:0 0 24px">${t(changeHint, lang)}</p>
    <a href="${loginUrl}" style="display:inline-block;background:#1B2B6B;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;font-size:15px">${t(loginBtn, lang)}</a>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0">
    <p style="color:#94a3b8;font-size:13px;margin:0">${t(helpLine, lang)}</p>
  `);

  const text = `${t(heading, lang)}

${t(usernameLabel, lang)}: ${username}
${t(passwordLabel, lang)}: ${password}

${loginUrl}`;

  await send(to, t(subject, lang), html, text);
}

// ─── 2. Assignment notification ──────────────────────────────────────────────

export async function sendAssignmentEmail(opts: {
  to: string;
  studentName: string;
  assignmentTitle: string;
  teacherName: string;
  schoolName: string;
  assignmentId: number;
  dueDate?: string | null;
  lang?: Lang;
}): Promise<void> {
  const { to, studentName, assignmentTitle, teacherName, schoolName, dueDate } = opts;
  const lang = opts.lang ?? 'nl';
  const assignmentUrl = `${APP_URL}/assignments`;
  const locale = DATE_LOCALE[lang];

  const subject: T = {
    nl: `Nieuwe opdracht: ${assignmentTitle}`,
    en: `New assignment: ${assignmentTitle}`,
    de: `Neue Aufgabe: ${assignmentTitle}`,
    es: `Nueva tarea: ${assignmentTitle}`,
  };
  const heading: T = {
    nl: 'Nieuwe opdracht voor jou 📋',
    en: 'New assignment for you 📋',
    de: 'Neue Aufgabe für dich 📋',
    es: 'Nueva tarea para ti 📋',
  };
  const intro: T = {
    nl: `Hoi ${studentName}, <strong>${teacherName}</strong> heeft een nieuwe opdracht voor je aangemaakt bij ${schoolName}.`,
    en: `Hi ${studentName}, <strong>${teacherName}</strong> has created a new assignment for you at ${schoolName}.`,
    de: `Hallo ${studentName}, <strong>${teacherName}</strong> hat eine neue Aufgabe für dich bei ${schoolName} erstellt.`,
    es: `Hola ${studentName}, <strong>${teacherName}</strong> ha creado una nueva tarea para ti en ${schoolName}.`,
  };
  const dueDateLabel: T = { nl: 'Inleverdatum', en: 'Due date', de: 'Abgabedatum', es: 'Fecha límite' };
  const viewBtn: T = { nl: 'Opdracht bekijken →', en: 'View assignment →', de: 'Aufgabe ansehen →', es: 'Ver tarea →' };
  const helpLine: T = {
    nl: `Vragen? Stuur een bericht via MusicDott aan ${teacherName}.`,
    en: `Questions? Send a message via MusicDott to ${teacherName}.`,
    de: `Fragen? Schreib ${teacherName} eine Nachricht über MusicDott.`,
    es: `¿Preguntas? Envía un mensaje a ${teacherName} a través de MusicDott.`,
  };

  const dueLine = dueDate
    ? `<p style="color:#475569;margin:0 0 24px">📅 <strong>${t(dueDateLabel, lang)}:</strong> ${new Date(dueDate).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}</p>`
    : '';

  const html = htmlWrap(lang, `
    <h1 style="color:#1B2B6B;font-size:24px;margin:0 0 8px">${t(heading, lang)}</h1>
    <p style="color:#475569;margin:0 0 24px">${t(intro, lang)}</p>
    <div style="background:#f0f3ff;border-left:4px solid #1B2B6B;border-radius:0 8px 8px 0;padding:20px 24px;margin:0 0 24px">
      <p style="margin:0;font-size:18px;font-weight:bold;color:#1B2B6B">${assignmentTitle}</p>
    </div>
    ${dueLine}
    <a href="${assignmentUrl}" style="display:inline-block;background:#1B2B6B;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;font-size:15px">${t(viewBtn, lang)}</a>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0">
    <p style="color:#94a3b8;font-size:13px;margin:0">${t(helpLine, lang)}</p>
  `);

  const text = `${t(heading, lang)}\n\n${assignmentTitle}\n\n${assignmentUrl}`;

  await send(to, t(subject, lang), html, text);
}

// ─── 3. Lesson reminder (day before) ─────────────────────────────────────────

export async function sendLessonReminderEmail(opts: {
  to: string;
  studentName: string;
  teacherName: string;
  lessonDate: Date;
  startTime?: string | null;
  location?: string | null;
  schoolName: string;
  lang?: Lang;
}): Promise<void> {
  const { to, studentName, teacherName, lessonDate, startTime, location, schoolName } = opts;
  const lang = opts.lang ?? 'nl';
  const locale = DATE_LOCALE[lang];

  const dateStr = lessonDate.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });

  const subject: T = {
    nl: `Herinnering: les morgen met ${teacherName}`,
    en: `Reminder: lesson tomorrow with ${teacherName}`,
    de: `Erinnerung: Unterrichtsstunde morgen mit ${teacherName}`,
    es: `Recordatorio: lección mañana con ${teacherName}`,
  };
  const heading: T = {
    nl: 'Herinnering: les morgen 🎸',
    en: 'Reminder: lesson tomorrow 🎸',
    de: 'Erinnerung: Unterricht morgen 🎸',
    es: 'Recordatorio: lección mañana 🎸',
  };
  const intro: T = {
    nl: `Hoi ${studentName}, je hebt morgen les bij <strong>${teacherName}</strong>.`,
    en: `Hi ${studentName}, you have a lesson tomorrow with <strong>${teacherName}</strong>.`,
    de: `Hallo ${studentName}, du hast morgen Unterricht bei <strong>${teacherName}</strong>.`,
    es: `Hola ${studentName}, mañana tienes clase con <strong>${teacherName}</strong>.`,
  };
  const teacherLabel: T = { nl: 'Docent', en: 'Teacher', de: 'Lehrer', es: 'Profesor' };
  const locationLabel: T = { nl: 'Locatie', en: 'Location', de: 'Ort', es: 'Lugar' };
  const timeLabel: T = { nl: 'om', en: 'at', de: 'um', es: 'a las' };
  const openBtn: T = { nl: 'Open MusicDott →', en: 'Open MusicDott →', de: 'MusicDott öffnen →', es: 'Abrir MusicDott →' };

  const timeStr = startTime ? ` ${t(timeLabel, lang)} ${startTime}` : '';
  const locationLine = location
    ? `<p style="color:#475569;margin:0 0 8px">📍 <strong>${t(locationLabel, lang)}:</strong> ${location}</p>`
    : '';

  const html = htmlWrap(lang, `
    <h1 style="color:#1B2B6B;font-size:24px;margin:0 0 8px">${t(heading, lang)}</h1>
    <p style="color:#475569;margin:0 0 24px">${t(intro, lang)}</p>
    <div style="background:#f0f3ff;border-radius:8px;padding:24px;margin:0 0 24px">
      <p style="margin:0 0 8px;color:#475569">📅 <strong>${dateStr}${timeStr}</strong></p>
      <p style="margin:0 0 8px;color:#475569">👨‍🏫 <strong>${t(teacherLabel, lang)}:</strong> ${teacherName}</p>
      ${locationLine}
    </div>
    <a href="${APP_URL}/" style="display:inline-block;background:#1B2B6B;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;font-size:15px">${t(openBtn, lang)}</a>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0">
    <p style="color:#94a3b8;font-size:13px;margin:0">${schoolName} · via MusicDott</p>
  `);

  const text = `${t(heading, lang)}\n\n${dateStr}${timeStr}\n${t(teacherLabel, lang)}: ${teacherName}\n${location ? `${t(locationLabel, lang)}: ${location}\n` : ''}\n${APP_URL}/`;

  await send(to, t(subject, lang), html, text);
}
