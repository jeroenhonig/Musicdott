import { createContext, useContext, useState, useEffect } from 'react';

// Supported languages
export type Language = 'en' | 'nl';

// Language context
export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string>) => string;
}

// Translation interface
export interface Translations {
  [key: string]: {
    en: string;
    nl: string;
  };
}

// Main translations object
export const translations: Translations = {
  // Authentication & Login
  'auth.login': {
    en: 'Login',
    nl: 'Inloggen'
  },
  'auth.logout': {
    en: 'Logout',
    nl: 'Uitloggen'
  },
  'auth.username': {
    en: 'Username',
    nl: 'Gebruikersnaam'
  },
  'auth.password': {
    en: 'Password',
    nl: 'Wachtwoord'
  },
  'auth.welcome': {
    en: 'Welcome to MusicDott',
    nl: 'Welkom bij MusicDott'
  },
  'auth.loginPrompt': {
    en: 'Please log in to continue',
    nl: 'Log in om door te gaan'
  },
  'auth.invalidCredentials': {
    en: 'Invalid username or password',
    nl: 'Ongeldige gebruikersnaam of wachtwoord'
  },
  'auth.newAccount': {
    en: 'New School? Create Account',
    nl: 'Nieuwe School? Account Aanmaken'
  },

  // Navigation
  'nav.dashboard': {
    en: 'Dashboard',
    nl: 'Dashboard'
  },
  'nav.lessons': {
    en: 'Lessons',
    nl: 'Lessen'
  },
  'nav.students': {
    en: 'Students',
    nl: 'Studenten'
  },
  'nav.messages': {
    en: 'Messages',
    nl: 'Berichten'
  },
  'nav.reports': {
    en: 'Reports',
    nl: 'Rapporten'
  },
  'nav.settings': {
    en: 'Settings',
    nl: 'Instellingen'
  },
  'nav.search': {
    en: 'Songs',
    nl: 'Nummers'
  },
  'nav.assignments': {
    en: 'Assignments',
    nl: 'Opdrachten'
  },
  'nav.achievements': {
    en: 'Achievements',
    nl: 'Prestaties'
  },
  'nav.practice': {
    en: 'Practice',
    nl: 'Oefenen'
  },
  'nav.schedule': {
    en: 'Schedule',
    nl: 'Rooster'
  },

  // Dashboard
  'dashboard.welcomeBack': {
    en: 'Welcome back',
    nl: 'Welkom terug'
  },
  'dashboard.overview': {
    en: 'Overview',
    nl: 'Overzicht'
  },
  'dashboard.totalStudents': {
    en: 'Total Students',
    nl: 'Totaal Studenten'
  },
  'dashboard.totalLessons': {
    en: 'Total Lessons',
    nl: 'Totaal Lessen'
  },
  'dashboard.totalSongs': {
    en: 'Total Songs',
    nl: 'Totaal Nummers'
  },
  'dashboard.thisWeek': {
    en: 'This Week',
    nl: 'Deze Week'
  },
  'dashboard.recentContent': {
    en: 'Recent Content',
    nl: 'Recente Inhoud'
  },
  'dashboard.upcomingLessons': {
    en: 'Upcoming Lessons',
    nl: 'Komende Lessen'
  },
  'dashboard.recentAssignments': {
    en: 'Recent Assignments',
    nl: 'Recente Opdrachten'
  },

  // Lessons
  'lessons.title': {
    en: 'Lessons',
    nl: 'Lessen'
  },
  'lessons.create': {
    en: 'Create New Lesson',
    nl: 'Nieuwe Les Maken'
  },
  'lessons.edit': {
    en: 'Edit Lesson',
    nl: 'Les Bewerken'
  },
  'lessons.delete': {
    en: 'Delete Lesson',
    nl: 'Les Verwijderen'
  },
  'lessons.assign': {
    en: 'Assign to Student',
    nl: 'Toewijzen aan Student'
  },
  'lessons.view': {
    en: 'View Lesson',
    nl: 'Les Bekijken'
  },
  'lessons.category': {
    en: 'Category',
    nl: 'Categorie'
  },
  'lessons.instrument': {
    en: 'Instrument',
    nl: 'Instrument'
  },
  'lessons.level': {
    en: 'Level',
    nl: 'Niveau'
  },
  'lessons.description': {
    en: 'Description',
    nl: 'Beschrijving'
  },
  'lessons.content': {
    en: 'Content',
    nl: 'Inhoud'
  },

  // Students
  'students.title': {
    en: 'Students',
    nl: 'Studenten'
  },
  'students.add': {
    en: 'Add Student',
    nl: 'Student Toevoegen'
  },
  'students.edit': {
    en: 'Edit Student',
    nl: 'Student Bewerken'
  },
  'students.delete': {
    en: 'Delete Student',
    nl: 'Student Verwijderen'
  },
  'students.name': {
    en: 'Name',
    nl: 'Naam'
  },
  'students.email': {
    en: 'Email',
    nl: 'E-mail'
  },
  'students.phone': {
    en: 'Phone',
    nl: 'Telefoon'
  },
  'students.teacher': {
    en: 'Teacher',
    nl: 'Leraar'
  },
  'students.active': {
    en: 'Active',
    nl: 'Actief'
  },

  // Messages
  'messages.title': {
    en: 'Messages',
    nl: 'Berichten'
  },
  'messages.compose': {
    en: 'Compose Message',
    nl: 'Bericht Schrijven'
  },
  'messages.send': {
    en: 'Send',
    nl: 'Verzenden'
  },
  'messages.reply': {
    en: 'Reply',
    nl: 'Antwoorden'
  },
  'messages.from': {
    en: 'From',
    nl: 'Van'
  },
  'messages.to': {
    en: 'To',
    nl: 'Aan'
  },
  'messages.subject': {
    en: 'Subject',
    nl: 'Onderwerp'
  },
  'messages.message': {
    en: 'Message',
    nl: 'Bericht'
  },

  // Common UI
  'common.save': {
    en: 'Save',
    nl: 'Opslaan'
  },
  'common.cancel': {
    en: 'Cancel',
    nl: 'Annuleren'
  },
  'common.delete': {
    en: 'Delete',
    nl: 'Verwijderen'
  },
  'common.edit': {
    en: 'Edit',
    nl: 'Bewerken'
  },
  'common.create': {
    en: 'Create',
    nl: 'Maken'
  },
  'common.close': {
    en: 'Close',
    nl: 'Sluiten'
  },
  'common.loading': {
    en: 'Loading...',
    nl: 'Laden...'
  },
  'common.error': {
    en: 'Error',
    nl: 'Fout'
  },
  'common.success': {
    en: 'Success',
    nl: 'Succesvol'
  },
  'common.search': {
    en: 'Search',
    nl: 'Zoeken'
  },
  'common.filter': {
    en: 'Filter',
    nl: 'Filter'
  },
  'common.all': {
    en: 'All',
    nl: 'Alle'
  },
  'common.none': {
    en: 'None',
    nl: 'Geen'
  },
  'common.select': {
    en: 'Select',
    nl: 'Selecteren'
  },
  'common.submit': {
    en: 'Submit',
    nl: 'Versturen'
  },

  // Settings
  'settings.title': {
    en: 'Settings',
    nl: 'Instellingen'
  },
  'settings.profile': {
    en: 'Profile',
    nl: 'Profiel'
  },
  'settings.language': {
    en: 'Language',
    nl: 'Taal'
  },
  'settings.notifications': {
    en: 'Notifications',
    nl: 'Meldingen'
  },
  'settings.privacy': {
    en: 'Privacy',
    nl: 'Privacy'
  },
  'settings.account': {
    en: 'Account',
    nl: 'Account'
  },

  // Schedule and calendar
  'schedule.title': {
    en: 'Schedule Management',
    nl: 'Rooster Beheer'
  },
  'schedule.subtitle': {
    en: 'Manage your teaching schedule and recurring sessions',
    nl: 'Beheer je lesrooster en terugkerende sessies'
  },
  'schedule.mySchedule': {
    en: 'My Schedule',
    nl: 'Mijn Rooster'
  },
  'schedule.upcomingLessons': {
    en: 'Upcoming Lessons',
    nl: 'Komende Lessen'
  },
  'schedule.recurringSchedule': {
    en: 'Recurring Schedule',
    nl: 'Terugkerend Rooster'
  },
  'schedule.newSession': {
    en: 'New Session',
    nl: 'Nieuwe Sessie'
  },
  'schedule.addSchedule': {
    en: 'Add Schedule',
    nl: 'Rooster Toevoegen'
  },
  'schedule.createSchedule': {
    en: 'Create Schedule',
    nl: 'Rooster Aanmaken'
  },
  'schedule.editSchedule': {
    en: 'Edit Schedule',
    nl: 'Rooster Bewerken'
  },
  'schedule.deleteSchedule': {
    en: 'Delete Schedule',
    nl: 'Rooster Verwijderen'
  },
  'schedule.noSchedule': {
    en: 'No recurring schedule set up yet',
    nl: 'Nog geen terugkerend rooster ingesteld'
  },
  'schedule.clickToAdd': {
    en: 'Click "Add Schedule" to create a recurring lesson schedule',
    nl: 'Klik op "Rooster Toevoegen" om een terugkerend lesrooster aan te maken'
  },
  'schedule.sessionGeneration': {
    en: 'Session Generation',
    nl: 'Sessie Generatie'
  },
  'schedule.generateSessions': {
    en: 'Generate Sessions',
    nl: 'Sessies Genereren'
  },

  // Days of week
  'schedule.days.sunday': {
    en: 'Sunday',
    nl: 'Zondag'
  },
  'schedule.days.monday': {
    en: 'Monday',
    nl: 'Maandag'
  },
  'schedule.days.tuesday': {
    en: 'Tuesday',
    nl: 'Dinsdag'
  },
  'schedule.days.wednesday': {
    en: 'Wednesday',
    nl: 'Woensdag'
  },
  'schedule.days.thursday': {
    en: 'Thursday',
    nl: 'Donderdag'
  },
  'schedule.days.friday': {
    en: 'Friday',
    nl: 'Vrijdag'
  },
  'schedule.days.saturday': {
    en: 'Saturday',
    nl: 'Zaterdag'
  },

  // Recurrence types
  'schedule.recurrence.weekly': {
    en: 'Weekly',
    nl: 'Wekelijks'
  },
  'schedule.recurrence.biweekly': {
    en: 'Biweekly',
    nl: 'Tweewekelijks'
  },
  'schedule.recurrence.monthly': {
    en: 'Monthly',
    nl: 'Maandelijks'
  },
  'schedule.recurrence.evenWeeks': {
    en: 'Even weeks',
    nl: 'Even weken'
  },
  'schedule.recurrence.oddWeeks': {
    en: 'Odd weeks',
    nl: 'Oneven weken'
  },

  // Form labels
  'schedule.form.student': {
    en: 'Student',
    nl: 'Student'
  },
  'schedule.form.day': {
    en: 'Day',
    nl: 'Dag'
  },
  'schedule.form.time': {
    en: 'Time',
    nl: 'Tijd'
  },
  'schedule.form.startTime': {
    en: 'Start time',
    nl: 'Starttijd'
  },
  'schedule.form.endTime': {
    en: 'End time',
    nl: 'Eindtijd'
  },
  'schedule.form.recurrenceType': {
    en: 'Recurrence',
    nl: 'Herhaling'
  },
  'schedule.form.location': {
    en: 'Location',
    nl: 'Locatie'
  },
  'schedule.form.notes': {
    en: 'Notes',
    nl: 'Opmerkingen'
  },
  'schedule.form.selectStudent': {
    en: 'Select a student',
    nl: 'Selecteer een student'
  },
  'schedule.form.selectDay': {
    en: 'Select a day',
    nl: 'Selecteer een dag'
  },
  'schedule.form.selectRecurrence': {
    en: 'Select recurrence type',
    nl: 'Selecteer herhalingstype'
  },
  'schedule.form.enterLocation': {
    en: 'Enter location (optional)',
    nl: 'Voer locatie in (optioneel)'
  },
  'schedule.form.addNotes': {
    en: 'Add notes about this schedule (optional)',
    nl: 'Voeg opmerkingen toe over dit rooster (optioneel)'
  },

  // Status and actions
  'schedule.status.active': {
    en: 'Active',
    nl: 'Actief'
  },
  'schedule.status.inactive': {
    en: 'Inactive',
    nl: 'Inactief'
  },
  'schedule.status.scheduled': {
    en: 'Scheduled',
    nl: 'Gepland'
  },
  'schedule.status.completed': {
    en: 'Completed',
    nl: 'Voltooid'
  },
  'schedule.status.cancelled': {
    en: 'Cancelled',
    nl: 'Geannuleerd'
  },
  'schedule.status.rescheduled': {
    en: 'Rescheduled',
    nl: 'Verplaatst'
  },

  // Reschedule workflow
  'schedule.reschedule.request': {
    en: 'Request Reschedule',
    nl: 'Verzoek Verplaatsing'
  },
  'schedule.reschedule.approve': {
    en: 'Approve Reschedule',
    nl: 'Goedkeuren Verplaatsing'
  },
  'schedule.reschedule.requestSent': {
    en: 'Reschedule requested',
    nl: 'Verplaatsing aangevraagd'
  },
  'schedule.reschedule.approved': {
    en: 'Reschedule approved',
    nl: 'Verplaatsing goedgekeurd'
  },
  'schedule.reschedule.pending': {
    en: 'Reschedule pending',
    nl: 'Verplaatsing in behandeling'
  },

  // Conflicts and validation
  'schedule.conflicts.timeConflict': {
    en: 'Time conflict detected',
    nl: 'Tijdconflict gedetecteerd'
  },
  'schedule.conflicts.overlappingSession': {
    en: 'This time slot conflicts with an existing session',
    nl: 'Dit tijdslot conflicteert met een bestaande sessie'
  },
  'schedule.conflicts.invalidTime': {
    en: 'Invalid time range',
    nl: 'Ongeldig tijdsbereik'
  },
  'schedule.conflicts.endBeforeStart': {
    en: 'End time must be after start time',
    nl: 'Eindtijd moet na starttijd zijn'
  },

  // Language names
  'language.english': {
    en: 'English',
    nl: 'Engels'
  },
  'language.dutch': {
    en: 'Dutch',
    nl: 'Nederlands'
  },

  // Time/Date
  'time.today': {
    en: 'Today',
    nl: 'Vandaag'
  },
  'time.yesterday': {
    en: 'Yesterday',
    nl: 'Gisteren'
  },
  'time.tomorrow': {
    en: 'Tomorrow',
    nl: 'Morgen'
  },
  'time.thisWeek': {
    en: 'This Week',
    nl: 'Deze Week'
  },
  'time.lastWeek': {
    en: 'Last Week',
    nl: 'Vorige Week'
  },
  'time.nextWeek': {
    en: 'Next Week',
    nl: 'Volgende Week'
  },

  // Actions
  'actions.view': {
    en: 'View',
    nl: 'Bekijken'
  },
  'actions.download': {
    en: 'Download',
    nl: 'Downloaden'
  },
  'actions.upload': {
    en: 'Upload',
    nl: 'Uploaden'
  },
  'actions.share': {
    en: 'Share',
    nl: 'Delen'
  },
  'actions.copy': {
    en: 'Copy',
    nl: 'Kopiëren'
  },
  'actions.paste': {
    en: 'Paste',
    nl: 'Plakken'
  },
  'actions.print': {
    en: 'Print',
    nl: 'Afdrukken'
  },

  // Status
  'status.active': {
    en: 'Active',
    nl: 'Actief'
  },
  'status.inactive': {
    en: 'Inactive',
    nl: 'Inactief'
  },
  'status.pending': {
    en: 'Pending',
    nl: 'In Behandeling'
  },
  'status.completed': {
    en: 'Completed',
    nl: 'Voltooid'
  },
  'status.draft': {
    en: 'Draft',
    nl: 'Concept'
  },
  'status.published': {
    en: 'Published',
    nl: 'Gepubliceerd'
  },

  // Notifications
  'notification.saved': {
    en: 'Changes saved successfully',
    nl: 'Wijzigingen succesvol opgeslagen'
  },
  'notification.deleted': {
    en: 'Item deleted successfully',
    nl: 'Item succesvol verwijderd'
  },
  'notification.created': {
    en: 'Item created successfully',
    nl: 'Item succesvol aangemaakt'
  },
  'notification.error': {
    en: 'An error occurred. Please try again.',
    nl: 'Er is een fout opgetreden. Probeer het opnieuw.'
  },

  // Footer
  'footer.proudlyBuilt': {
    en: 'Proudly built in The Netherlands',
    nl: 'Met trots gebouwd in Nederland'
  },
  'footer.learnMore': {
    en: 'Learn More About MusicDott',
    nl: 'Meer Informatie Over MusicDott'
  },

  // Development notice
  'notice.development': {
    en: 'MusicDott 2.0 (this platform) is in development',
    nl: 'MusicDott 2.0 (dit platform) is in ontwikkeling'
  },
  'notice.visitMain': {
    en: 'Visit musicdott.com for MusicDott 1.0',
    nl: 'Bezoek musicdott.com voor MusicDott 1.0'
  }
};

// Translation function
export const translate = (key: string, language: Language, params?: Record<string, string>): string => {
  const translation = translations[key];
  if (!translation) {
    console.warn(`Translation key "${key}" not found`);
    return key;
  }
  
  let text = translation[language] || translation.en;
  
  // Replace parameters if provided
  if (params) {
    Object.entries(params).forEach(([param, value]) => {
      text = text.replace(`{${param}}`, value);
    });
  }
  
  return text;
};

// Language storage utilities
export const getStoredLanguage = (): Language => {
  try {
    const stored = localStorage.getItem('musicdott-language');
    return (stored === 'nl' || stored === 'en') ? stored : 'en';
  } catch {
    return 'en';
  }
};

export const setStoredLanguage = (language: Language): void => {
  try {
    localStorage.setItem('musicdott-language', language);
  } catch (error) {
    console.warn('Failed to store language preference:', error);
  }
};

// Auto-detect language from browser
export const detectBrowserLanguage = (): Language => {
  try {
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('nl')) return 'nl';
    return 'en';
  } catch {
    return 'en';
  }
};

// Language context (will be created in the hook)
export const LanguageContext = createContext<LanguageContextType | null>(null);

// Custom hook for using translations
export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};