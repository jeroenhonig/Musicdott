import { createContext, useContext, useState, useEffect } from 'react';

// Supported languages — 'de' and 'es' are architecture-ready (keys fall back to 'en' until translated)
export type Language = 'en' | 'nl' | 'de' | 'es';

export interface LanguageMeta {
  code: Language;
  label: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

// Language context
export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string>) => string;
}

// Translation interface — de and es are optional; missing keys fall back to 'en'
export interface Translations {
  [key: string]: {
    en: string;
    nl: string;
    de?: string;
    es?: string;
  };
}

// Main translations object
export const translations: Translations = {
  // Authentication & Login
  'auth.login': {
    en: 'Login',
    nl: 'Inloggen',
    de: 'Anmelden',
    es: 'Iniciar sesión'
  },
  'auth.logout': {
    en: 'Logout',
    nl: 'Uitloggen',
    de: 'Abmelden',
    es: 'Cerrar sesión'
  },
  'auth.username': {
    en: 'Username',
    nl: 'Gebruikersnaam',
    de: 'Benutzername',
    es: 'Usuario'
  },
  'auth.password': {
    en: 'Password',
    nl: 'Wachtwoord',
    de: 'Passwort',
    es: 'Contraseña'
  },
  'auth.welcome': {
    en: 'Welcome to MusicDott',
    nl: 'Welkom bij MusicDott',
    de: 'Willkommen bei MusicDott',
    es: 'Bienvenido a MusicDott'
  },
  'auth.loginPrompt': {
    en: 'Please log in to continue',
    nl: 'Log in om door te gaan',
    de: 'Bitte melden Sie sich an, um fortzufahren',
    es: 'Inicia sesión para continuar'
  },
  'auth.invalidCredentials': {
    en: 'Invalid username or password',
    nl: 'Ongeldige gebruikersnaam of wachtwoord',
    de: 'Ungültiger Benutzername oder Passwort',
    es: 'Usuario o contraseña incorrectos'
  },
  'auth.newAccount': {
    en: 'New School? Create Account',
    nl: 'Nieuwe School? Account Aanmaken',
    de: 'Neue Schule? Konto erstellen',
    es: '¿Nueva escuela? Crear cuenta'
  },

  // Navigation
  'nav.dashboard': {
    en: 'Dashboard',
    nl: 'Dashboard',
    de: 'Dashboard',
    es: 'Panel'
  },
  'nav.lessons': {
    en: 'Lessons',
    nl: 'Lessen',
    de: 'Stunden',
    es: 'Lecciones'
  },
  'nav.students': {
    en: 'Students',
    nl: 'Studenten',
    de: 'Schüler',
    es: 'Alumnos'
  },
  'nav.messages': {
    en: 'Messages',
    nl: 'Berichten',
    de: 'Nachrichten',
    es: 'Mensajes'
  },
  'nav.reports': {
    en: 'Reports',
    nl: 'Rapporten',
    de: 'Berichte',
    es: 'Informes'
  },
  'nav.settings': {
    en: 'Settings',
    nl: 'Instellingen',
    de: 'Einstellungen',
    es: 'Configuración'
  },
  'nav.search': {
    en: 'Songs',
    nl: 'Nummers',
    de: 'Songs',
    es: 'Canciones'
  },
  'nav.assignments': {
    en: 'Assignments',
    nl: 'Opdrachten',
    de: 'Aufgaben',
    es: 'Tareas'
  },
  'nav.achievements': {
    en: 'Achievements',
    nl: 'Prestaties',
    de: 'Erfolge',
    es: 'Logros'
  },
  'nav.practice': {
    en: 'Practice',
    nl: 'Oefenen',
    de: 'Üben',
    es: 'Práctica'
  },
  'nav.schedule': {
    en: 'Schedule',
    nl: 'Rooster',
    de: 'Stundenplan',
    es: 'Horario'
  },

  // Navigation — additional
  'nav.analytics': {
    en: 'Analytics & Reports',
    nl: 'Analyses & Rapporten',
    de: 'Analysen & Berichte',
    es: 'Análisis e informes'
  },
  'nav.import': {
    en: 'Import Data',
    nl: 'Data Importeren',
    de: 'Daten importieren',
    es: 'Importar datos'
  },
  'nav.resources': {
    en: 'Resources & Guides',
    nl: 'Bronnen & Handleidingen',
    de: 'Ressourcen & Leitfäden',
    es: 'Recursos y guías'
  },
  'nav.schoolManagement': {
    en: 'School Management',
    nl: 'Schoolbeheer',
    de: 'Schulverwaltung',
    es: 'Gestión de escuela'
  },
  'nav.teachers': {
    en: 'Teachers',
    nl: 'Docenten',
    de: 'Lehrer',
    es: 'Profesores'
  },
  'nav.members': {
    en: 'Manage Members',
    nl: 'Leden Beheren',
    de: 'Mitglieder verwalten',
    es: 'Gestionar miembros'
  },
  'nav.billing': {
    en: 'Billing & Plans',
    nl: 'Facturering & Plannen',
    de: 'Abrechnung & Tarife',
    es: 'Facturación y planes'
  },
  'nav.schoolSettings': {
    en: 'School Settings',
    nl: 'Schoolinstellingen',
    de: 'Schuleinstellungen',
    es: 'Configuración de escuela'
  },
  'nav.section.learningHub': {
    en: 'Learning Hub',
    nl: 'Leercentrum',
    de: 'Lernbereich',
    es: 'Centro de aprendizaje'
  },
  'nav.section.schoolManagement': {
    en: 'School Management',
    nl: 'Schoolbeheer',
    de: 'Schulverwaltung',
    es: 'Gestión de escuela'
  },

  // Lesson progress tracker
  'progress.progress': {
    en: 'Progress',
    nl: 'Voortgang'
  },
  'progress.teacherNotes': {
    en: 'Teacher Notes:',
    nl: 'Docent opmerkingen:'
  },
  'progress.studentNotes': {
    en: 'Student Notes:',
    nl: 'Student opmerkingen:'
  },
  'progress.timeSpent': {
    en: 'Time spent:',
    nl: 'Bestede tijd:'
  },
  'progress.noData': {
    en: 'No Progress Data',
    nl: 'Geen Voortgangsdata'
  },
  'progress.noDataDescription': {
    en: 'Progress tracking will be available once students start practicing lessons.',
    nl: 'Voortgangsregistratie is beschikbaar zodra studenten met lessen beginnen.'
  },
  'progress.translated': {
    en: 'Translated',
    nl: 'Vertaald'
  },

  // Accessibility labels
  'aria.toggleMenu': {
    en: 'Toggle navigation menu',
    nl: 'Navigatiemenu in-/uitklappen'
  },
  'aria.userProfile': {
    en: 'User profile',
    nl: 'Gebruikersprofiel'
  },

  // Dashboard
  'dashboard.welcomeBack': {
    en: 'Welcome back',
    nl: 'Welkom terug',
    de: 'Willkommen zurück',
    es: 'Bienvenido de nuevo'
  },
  'dashboard.overview': {
    en: 'Overview',
    nl: 'Overzicht',
    de: 'Übersicht',
    es: 'Resumen'
  },
  'dashboard.totalStudents': {
    en: 'Total Students',
    nl: 'Totaal Studenten',
    de: 'Schüler gesamt',
    es: 'Total de alumnos'
  },
  'dashboard.totalLessons': {
    en: 'Total Lessons',
    nl: 'Totaal Lessen',
    de: 'Stunden gesamt',
    es: 'Total de lecciones'
  },
  'dashboard.totalSongs': {
    en: 'Total Songs',
    nl: 'Totaal Nummers',
    de: 'Songs gesamt',
    es: 'Total de canciones'
  },
  'dashboard.thisWeek': {
    en: 'This Week',
    nl: 'Deze Week',
    de: 'Diese Woche',
    es: 'Esta semana'
  },
  'dashboard.recentContent': {
    en: 'Recent Content',
    nl: 'Recente Inhoud',
    de: 'Aktuelle Inhalte',
    es: 'Contenido reciente'
  },
  'dashboard.upcomingLessons': {
    en: 'Upcoming Lessons',
    nl: 'Komende Lessen',
    de: 'Bevorstehende Stunden',
    es: 'Próximas lecciones'
  },
  'dashboard.recentAssignments': {
    en: 'Recent Assignments',
    nl: 'Recente Opdrachten',
    de: 'Aktuelle Aufgaben',
    es: 'Tareas recientes'
  },
  'dashboard.platformTitle': {
    en: 'Platform Dashboard',
    nl: 'Platform Dashboard',
    de: 'Plattform-Dashboard',
    es: 'Panel de plataforma'
  },
  'dashboard.teacherTitle': {
    en: 'Teacher Dashboard',
    nl: 'Lerarendashboard',
    de: 'Lehrer-Dashboard',
    es: 'Panel del profesor'
  },
  'dashboard.myTitle': {
    en: 'My Dashboard',
    nl: 'Mijn Dashboard',
    de: 'Mein Dashboard',
    es: 'Mi panel'
  },
  'dashboard.loading': {
    en: 'Loading...',
    nl: 'Laden...',
    de: 'Laden...',
    es: 'Cargando...'
  },
  'dashboard.grooveScribeDesc': {
    en: 'Convert drum patterns and create interactive groove embeds',
    nl: 'Converteer drumpatronen en maak interactieve groove-embeds',
    de: 'Schlagzeugmuster konvertieren und interaktive Groove-Embeds erstellen',
    es: 'Convierte patrones de batería y crea incrustaciones de groove interactivas'
  },
  'dashboard.syncDesc': {
    en: 'Synchronize video with sheet music for interactive lessons',
    nl: 'Synchroniseer video met bladmuziek voor interactieve lessen',
    de: 'Video mit Noten für interaktive Unterrichtsstunden synchronisieren',
    es: 'Sincroniza vídeo con partituras para lecciones interactivas'
  },
  'dashboard.recentActivity': {
    en: 'Recent Activity',
    nl: 'Recente activiteit',
    de: 'Letzte Aktivität',
    es: 'Actividad reciente'
  },
  'dashboard.startPracticing': {
    en: 'Start practicing to see your activity here!',
    nl: 'Begin met oefenen om je activiteit hier te zien!',
    de: 'Fang an zu üben, um deine Aktivität hier zu sehen!',
    es: '¡Empieza a practicar para ver tu actividad aquí!'
  },
  'dashboard.totalSchools': {
    en: 'Total Schools',
    nl: 'Totaal Scholen',
    de: 'Schulen gesamt',
    es: 'Total de escuelas'
  },
  'dashboard.totalUsers': {
    en: 'Total Users',
    nl: 'Totaal Gebruikers',
    de: 'Nutzer gesamt',
    es: 'Total de usuarios'
  },
  'dashboard.monthlyRevenue': {
    en: 'Monthly Revenue',
    nl: 'Maandelijkse Omzet',
    de: 'Monatlicher Umsatz',
    es: 'Ingresos mensuales'
  },
  'dashboard.activeSessions': {
    en: 'Active Sessions',
    nl: 'Actieve Sessies',
    de: 'Aktive Sitzungen',
    es: 'Sesiones activas'
  },
  'dashboard.recentSchools': {
    en: 'Recent Schools',
    nl: 'Recente Scholen',
    de: 'Aktuelle Schulen',
    es: 'Escuelas recientes'
  },
  'dashboard.platformAnalyticsSoon': {
    en: 'Platform analytics coming soon',
    nl: 'Platform-analyse komt binnenkort',
    de: 'Plattform-Analysen demnächst verfügbar',
    es: 'Análisis de plataforma próximamente'
  },
  'dashboard.systemHealth': {
    en: 'System Health',
    nl: 'Systeemgezondheid',
    de: 'Systemstatus',
    es: 'Estado del sistema'
  },
  'dashboard.allSystemsOperational': {
    en: 'All systems operational',
    nl: 'Alle systemen operationeel',
    de: 'Alle Systeme betriebsbereit',
    es: 'Todos los sistemas operativos'
  },
  'dashboard.students': {
    en: 'Students',
    nl: 'Leerlingen',
    de: 'Schüler',
    es: 'Alumnos'
  },
  'dashboard.songs': {
    en: 'Songs',
    nl: 'Nummers',
    de: 'Songs',
    es: 'Canciones'
  },
  'dashboard.lessons': {
    en: 'Lessons',
    nl: 'Lessen',
    de: 'Stunden',
    es: 'Lecciones'
  },
  'dashboard.categories': {
    en: 'Categories',
    nl: 'Categorieën',
    de: 'Kategorien',
    es: 'Categorías'
  },
  'dashboard.recentLessons': {
    en: 'Recent Lessons',
    nl: 'Recente Lessen',
    de: 'Aktuelle Stunden',
    es: 'Lecciones recientes'
  },
  'dashboard.allLevels': {
    en: 'All levels',
    nl: 'Alle niveaus',
    de: 'Alle Niveaus',
    es: 'Todos los niveles'
  },
  'dashboard.viewAllLessons': {
    en: 'View All Lessons',
    nl: 'Alle Lessen Bekijken',
    de: 'Alle Stunden anzeigen',
    es: 'Ver todas las lecciones'
  },
  'dashboard.noLessonsYet': {
    en: 'No lessons created yet',
    nl: 'Nog geen lessen aangemaakt',
    de: 'Noch keine Stunden erstellt',
    es: 'Aún no hay lecciones creadas'
  },
  'dashboard.createFirstLesson': {
    en: 'Create First Lesson',
    nl: 'Eerste Les Aanmaken',
    de: 'Erste Stunde erstellen',
    es: 'Crear primera lección'
  },
  'dashboard.recentSongs': {
    en: 'Recent Songs',
    nl: 'Recente Nummers',
    de: 'Aktuelle Songs',
    es: 'Canciones recientes'
  },
  'dashboard.by': {
    en: 'by',
    nl: 'van',
    de: 'von',
    es: 'de'
  },
  'dashboard.viewAllSongs': {
    en: 'View All Songs',
    nl: 'Alle Nummers Bekijken',
    de: 'Alle Songs anzeigen',
    es: 'Ver todas las canciones'
  },
  'dashboard.noSongsYet': {
    en: 'No songs created yet',
    nl: 'Nog geen nummers aangemaakt',
    de: 'Noch keine Songs erstellt',
    es: 'Aún no hay canciones creadas'
  },
  'dashboard.createFirstSong': {
    en: 'Create First Song',
    nl: 'Eerste Nummer Aanmaken',
    de: 'Ersten Song erstellen',
    es: 'Crear primera canción'
  },
  'dashboard.schoolManagement': {
    en: 'School Management',
    nl: 'Schoolbeheer',
    de: 'Schulverwaltung',
    es: 'Gestión de escuela'
  },
  'dashboard.manageMembers': {
    en: 'Manage Members',
    nl: 'Leden Beheren',
    de: 'Mitglieder verwalten',
    es: 'Gestionar miembros'
  },
  'dashboard.schoolSettings': {
    en: 'School Settings',
    nl: 'Schoolinstellingen',
    de: 'Schuleinstellungen',
    es: 'Configuración de escuela'
  },
  'dashboard.billing': {
    en: 'Billing',
    nl: 'Facturering',
    de: 'Abrechnung',
    es: 'Facturación'
  },
  'dashboard.monthlyCharges': {
    en: 'Monthly charges',
    nl: 'Maandelijkse kosten',
    de: 'Monatliche Kosten',
    es: 'Cargos mensuales'
  },
  'dashboard.performance': {
    en: 'Performance',
    nl: 'Prestaties',
    de: 'Leistung',
    es: 'Rendimiento'
  },
  'dashboard.activeThisMonth': {
    en: 'Active this month',
    nl: 'Actief deze maand'
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

  // Lessons page — additional UI strings
  'lessons.subtitle': {
    en: 'Browse lessons by category and assign them to students',
    nl: 'Blader door lessen per categorie en wijs ze toe aan studenten'
  },
  'lessons.manageCategories': {
    en: 'Manage Categories',
    nl: 'Categorieën beheren'
  },
  'lessons.manageLessonCategories': {
    en: 'Manage Lesson Categories',
    nl: 'Lescategorieën beheren'
  },
  'lessons.manageCategoriesDescription': {
    en: 'Create and organize categories for your lessons',
    nl: 'Maak categorieën aan en organiseer ze voor je lessen'
  },
  'lessons.viewCategories': {
    en: 'Categories',
    nl: 'Categorieën'
  },
  'lessons.viewAll': {
    en: 'All Lessons',
    nl: 'Alle lessen'
  },
  'lessons.viewPreview': {
    en: 'Preview',
    nl: 'Voorbeeld'
  },
  'lessons.addLesson': {
    en: 'Add Lesson',
    nl: 'Les toevoegen'
  },
  'lessons.addNewLesson': {
    en: 'Add New Lesson',
    nl: 'Nieuwe les toevoegen'
  },
  'lessons.addNewLessonDescription': {
    en: 'Create a new lesson with content and resources for your students.',
    nl: 'Maak een nieuwe les aan met inhoud en bronnen voor je studenten.'
  },
  'lessons.searchPlaceholder': {
    en: 'Search lessons...',
    nl: 'Lessen zoeken...'
  },
  'lessons.noCategoriesTitle': {
    en: 'No Lesson Categories',
    nl: 'Geen lescategorieën'
  },
  'lessons.noCategoriesDescription': {
    en: 'Create your first lesson category to organize your educational content. Categories help group related lessons together.',
    nl: 'Maak je eerste lescategorie aan om je educatieve inhoud te organiseren. Categorieën helpen gerelateerde lessen te groeperen.'
  },
  'lessons.createFirstCategory': {
    en: 'Create First Category',
    nl: 'Eerste categorie aanmaken'
  },
  'lessons.countLessons': {
    en: 'lessons',
    nl: 'lessen'
  },
  'lessons.noDescription': {
    en: 'No description',
    nl: 'Geen beschrijving'
  },
  'lessons.viewAllCount': {
    en: 'View all',
    nl: 'Bekijk alle'
  },
  'lessons.viewLessonsCount': {
    en: 'View Lessons',
    nl: 'Lessen bekijken'
  },
  'lessons.noLessonsAssigned': {
    en: 'No lessons assigned yet',
    nl: 'Nog geen lessen toegewezen'
  },
  'lessons.backToCategories': {
    en: '← Back to Categories',
    nl: '← Terug naar categorieën'
  },
  'lessons.noLessonsFoundTitle': {
    en: 'No Lessons Found',
    nl: 'Geen lessen gevonden'
  },
  'lessons.noLessonsEmpty': {
    en: 'Create your first lesson to start building your educational content library.',
    nl: 'Maak je eerste les aan om je educatieve inhoudsbibliotheek op te bouwen.'
  },
  'lessons.noLessonsFiltered': {
    en: 'No lessons match your current filters. Try adjusting your search or category selection.',
    nl: 'Geen lessen komen overeen met je huidige filters. Pas je zoekopdracht of categorie-selectie aan.'
  },
  'lessons.createFirstLesson': {
    en: 'Create First Lesson',
    nl: 'Eerste les aanmaken'
  },
  'lessons.noLessonsFound': {
    en: 'No lessons found',
    nl: 'Geen lessen gevonden'
  },
  'lessons.noLessonsSearch': {
    en: 'No lessons match your search.',
    nl: 'Geen lessen komen overeen met je zoekopdracht.'
  },
  'lessons.getStarted': {
    en: 'Get started by creating your first lesson.',
    nl: 'Ga aan de slag door je eerste les aan te maken.'
  },
  'lessons.form.titleLabel': {
    en: 'Title *',
    nl: 'Titel *'
  },
  'lessons.form.titlePlaceholder': {
    en: 'Enter lesson title',
    nl: 'Voer lestitel in'
  },
  'lessons.form.contentTypeLabel': {
    en: 'Content Type',
    nl: 'Inhoudstype'
  },
  'lessons.form.contentTypePlaceholder': {
    en: 'Select content type',
    nl: 'Selecteer inhoudstype'
  },
  'lessons.form.contentTypeStandard': {
    en: 'Standard',
    nl: 'Standaard'
  },
  'lessons.form.contentTypeTechnique': {
    en: 'Technique',
    nl: 'Techniek'
  },
  'lessons.form.contentTypeTheory': {
    en: 'Theory',
    nl: 'Theorie'
  },
  'lessons.form.contentTypeSong': {
    en: 'Song',
    nl: 'Nummer'
  },
  'lessons.form.skillLevelLabel': {
    en: 'Skill Level',
    nl: 'Vaardigheidsniveau'
  },
  'lessons.form.skillLevelPlaceholder': {
    en: 'Select skill level',
    nl: 'Selecteer vaardigheidsniveau'
  },
  'lessons.form.levelNone': {
    en: 'None',
    nl: 'Geen'
  },
  'lessons.form.levelBeginner': {
    en: 'Beginner',
    nl: 'Beginner'
  },
  'lessons.form.levelIntermediate': {
    en: 'Intermediate',
    nl: 'Gemiddeld'
  },
  'lessons.form.levelAdvanced': {
    en: 'Advanced',
    nl: 'Gevorderd'
  },
  'lessons.form.categoryLabel': {
    en: 'Category',
    nl: 'Categorie'
  },
  'lessons.form.categoryPlaceholder': {
    en: 'Select category',
    nl: 'Selecteer categorie'
  },
  'lessons.form.noCategory': {
    en: 'No Category',
    nl: 'Geen categorie'
  },
  'lessons.form.instrumentLabel': {
    en: 'Instrument',
    nl: 'Instrument'
  },
  'lessons.form.instrumentPlaceholder': {
    en: 'e.g., Piano, Guitar, Drums',
    nl: 'bijv., Piano, Gitaar, Drums'
  },
  'lessons.form.descriptionLabel': {
    en: 'Description',
    nl: 'Beschrijving'
  },
  'lessons.form.descriptionPlaceholder': {
    en: 'Add notes about the lesson',
    nl: 'Voeg opmerkingen toe over de les'
  },
  'lessons.form.contentResourcesTitle': {
    en: 'Content & Resources',
    nl: 'Inhoud & bronnen'
  },
  'lessons.form.contentResourcesDescription': {
    en: 'Add videos, external links, text content, and other resources for this lesson.',
    nl: 'Voeg video\'s, externe links, tekstinhoud en andere bronnen toe voor deze les.'
  },
  'lessons.creating': {
    en: 'Creating...',
    nl: 'Aanmaken...'
  },
  'lessons.createLesson': {
    en: 'Create Lesson',
    nl: 'Les aanmaken'
  },
  'lessons.saving': {
    en: 'Saving...',
    nl: 'Opslaan...'
  },
  'lessons.saveChanges': {
    en: 'Save Changes',
    nl: 'Wijzigingen opslaan'
  },
  'lessons.editLesson': {
    en: 'Edit Lesson',
    nl: 'Les bewerken'
  },
  'lessons.editLessonDescription': {
    en: 'Make changes to this lesson and click save when you\'re done.',
    nl: 'Breng wijzigingen aan in deze les en klik op opslaan als je klaar bent.'
  },
  'lessons.form.editInstrumentPlaceholder': {
    en: 'E.g., Guitar, Piano, Drums',
    nl: 'bijv., Gitaar, Piano, Drums'
  },
  'lessons.assignToStudent': {
    en: 'Assign Lesson to Student',
    nl: 'Les toewijzen aan student'
  },
  'lessons.assignDescription': {
    en: 'with optional due date and notes.',
    nl: 'met optionele deadline en opmerkingen.'
  },
  'lessons.assignSelectStudentLabel': {
    en: 'Select Student',
    nl: 'Student selecteren'
  },
  'lessons.assignChooseStudent': {
    en: 'Choose a student',
    nl: 'Kies een student'
  },
  'lessons.assignDueDateLabel': {
    en: 'Due Date (Optional)',
    nl: 'Deadline (optioneel)'
  },
  'lessons.assignNotesLabel': {
    en: 'Notes (Optional)',
    nl: 'Opmerkingen (optioneel)'
  },
  'lessons.assignNotesPlaceholder': {
    en: 'Add any specific instructions or notes for this assignment',
    nl: 'Voeg specifieke instructies of opmerkingen toe voor deze opdracht'
  },
  'lessons.assigning': {
    en: 'Assigning...',
    nl: 'Toewijzen...'
  },
  'lessons.assignLesson': {
    en: 'Assign Lesson',
    nl: 'Les toewijzen'
  },
  'lessons.createdSuccess': {
    en: 'Lesson created successfully',
    nl: 'Les succesvol aangemaakt'
  },
  'lessons.deletedSuccess': {
    en: 'Lesson deleted successfully',
    nl: 'Les succesvol verwijderd'
  },
  'lessons.updatedSuccess': {
    en: 'Lesson updated successfully',
    nl: 'Les succesvol bijgewerkt'
  },
  'lessons.assignedSuccess': {
    en: 'Lesson assigned successfully',
    nl: 'Les succesvol toegewezen'
  },
  'lessons.selectStudentError': {
    en: 'Please select a student',
    nl: 'Selecteer een student'
  },
  'lessons.enterTitleError': {
    en: 'Please enter a lesson title',
    nl: 'Voer een lestitel in'
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
  // Students index page
  'students.searchPlaceholder': {
    en: 'Search students...',
    nl: 'Studenten zoeken...'
  },
  'students.addNew': {
    en: 'Add New Student',
    nl: 'Nieuwe Student Toevoegen'
  },
  'students.noStudents': {
    en: 'No students yet',
    nl: 'Nog geen studenten'
  },
  'students.noStudentsSearchHint': {
    en: 'No students match your search.',
    nl: 'Geen studenten gevonden voor uw zoekopdracht.'
  },
  'students.noStudentsHint': {
    en: 'Add your first student to get started.',
    nl: 'Voeg uw eerste student toe om te beginnen.'
  },
  'students.addFirst': {
    en: 'Add First Student',
    nl: 'Eerste Student Toevoegen'
  },
  'students.viewOnly': {
    en: 'View Only',
    nl: 'Alleen bekijken'
  },
  'students.ageLabel': {
    en: 'Age',
    nl: 'Leeftijd'
  },
  'students.parentLabel': {
    en: 'Parent',
    nl: 'Ouder'
  },
  'students.assignSongBtn': {
    en: 'Assign Song',
    nl: 'Nummer Toewijzen'
  },
  'students.assignLessonBtn': {
    en: 'Assign Lesson',
    nl: 'Les Toewijzen'
  },
  'students.scheduleBtn': {
    en: 'Schedule',
    nl: 'Inplannen'
  },
  'students.recurringBtn': {
    en: 'Recurring',
    nl: 'Terugkerend'
  },
  'students.messageBtn': {
    en: 'Message',
    nl: 'Bericht'
  },

  // Students — Add/Edit dialog
  'students.dialog.addTitle': {
    en: 'Add New Student',
    nl: 'Nieuwe Student Toevoegen'
  },
  'students.dialog.addDescription': {
    en: 'Create a new student profile with contact information and learning details.',
    nl: 'Maak een nieuw studentprofiel aan met contactgegevens en leerdetails.'
  },
  'students.dialog.updateTitle': {
    en: 'Update Student',
    nl: 'Student Bijwerken'
  },
  'students.dialog.updateDescription': {
    en: 'Edit student information and settings.',
    nl: 'Bewerk studentinformatie en instellingen.'
  },
  'students.form.fullName': {
    en: 'Full Name',
    nl: 'Volledige naam'
  },
  'students.form.namePlaceholder': {
    en: "Enter student's name",
    nl: 'Voer de naam van de student in'
  },
  'students.form.agePlaceholder': {
    en: 'Enter age',
    nl: 'Voer leeftijd in'
  },
  'students.form.birthdate': {
    en: 'Birthdate (Optional)',
    nl: 'Geboortedatum (optioneel)'
  },
  'students.form.birthdatePlaceholder': {
    en: 'Select birthdate',
    nl: 'Selecteer geboortedatum'
  },
  'students.form.emailPlaceholder': {
    en: 'Enter email address',
    nl: 'Voer e-mailadres in'
  },
  'students.form.phonePlaceholder': {
    en: 'Enter phone number',
    nl: 'Voer telefoonnummer in'
  },
  'students.form.instrument': {
    en: 'Instrument',
    nl: 'Instrument'
  },
  'students.form.instrumentPlaceholder': {
    en: 'Select instrument',
    nl: 'Selecteer instrument'
  },
  'students.form.level': {
    en: 'Level',
    nl: 'Niveau'
  },
  'students.form.levelPlaceholder': {
    en: 'Select level',
    nl: 'Selecteer niveau'
  },
  'students.form.levelBeginner': {
    en: 'Beginner',
    nl: 'Beginner'
  },
  'students.form.levelIntermediate': {
    en: 'Intermediate',
    nl: 'Gevorderd'
  },
  'students.form.levelAdvanced': {
    en: 'Advanced',
    nl: 'Expert'
  },
  'students.form.parentName': {
    en: 'Parent/Guardian Name',
    nl: 'Naam ouder/voogd'
  },
  'students.form.parentNamePlaceholder': {
    en: 'Enter parent/guardian name',
    nl: 'Voer naam van ouder/voogd in'
  },
  'students.form.parentEmail': {
    en: 'Parent/Guardian Email',
    nl: 'E-mail ouder/voogd'
  },
  'students.form.parentEmailPlaceholder': {
    en: 'Enter parent/guardian email',
    nl: 'Voer e-mail van ouder/voogd in'
  },
  'students.form.parentPhone': {
    en: 'Parent/Guardian Phone',
    nl: 'Telefoon ouder/voogd'
  },
  'students.form.parentPhonePlaceholder': {
    en: 'Enter parent/guardian phone number',
    nl: 'Voer telefoonnummer van ouder/voogd in'
  },
  'students.form.assignedTeacher': {
    en: 'Assigned Teacher',
    nl: 'Toegewezen docent'
  },
  'students.form.teacherPlaceholder': {
    en: 'Select teacher',
    nl: 'Selecteer docent'
  },
  'students.form.noTeacher': {
    en: 'No Teacher Assigned',
    nl: 'Geen docent toegewezen'
  },
  'students.form.username': {
    en: 'Username',
    nl: 'Gebruikersnaam'
  },
  'students.form.usernamePlaceholder': {
    en: 'Enter username for student portal',
    nl: 'Voer gebruikersnaam in voor studentportaal'
  },
  'students.form.password': {
    en: 'Password',
    nl: 'Wachtwoord'
  },
  'students.form.passwordPlaceholder': {
    en: 'Enter password',
    nl: 'Voer wachtwoord in'
  },
  'students.form.passwordUpdate': {
    en: 'Password (leave blank to keep current)',
    nl: 'Wachtwoord (leeg laten om huidig te behouden)'
  },
  'students.form.passwordUpdatePlaceholder': {
    en: 'Enter new password',
    nl: 'Voer nieuw wachtwoord in'
  },
  'students.form.notes': {
    en: 'Notes',
    nl: 'Opmerkingen'
  },
  'students.form.notesPlaceholder': {
    en: 'Additional notes about the student',
    nl: 'Aanvullende opmerkingen over de student'
  },
  'students.form.createButton': {
    en: 'Create Student',
    nl: 'Student Aanmaken'
  },
  'students.form.creating': {
    en: 'Creating...',
    nl: 'Aanmaken...'
  },
  'students.form.updateButton': {
    en: 'Update Student',
    nl: 'Student Bijwerken'
  },
  'students.form.updating': {
    en: 'Updating...',
    nl: 'Bijwerken...'
  },

  // Students — toast messages
  'students.toast.created': {
    en: 'Student created successfully',
    nl: 'Student succesvol aangemaakt'
  },
  'students.toast.updated': {
    en: 'Student updated successfully',
    nl: 'Student succesvol bijgewerkt'
  },
  'students.toast.deleted': {
    en: 'Student deleted successfully',
    nl: 'Student succesvol verwijderd'
  },
  'students.toast.songAssigned': {
    en: 'Song assigned successfully',
    nl: 'Nummer succesvol toegewezen'
  },
  'students.toast.lessonAssigned': {
    en: 'Lesson assigned successfully',
    nl: 'Les succesvol toegewezen'
  },
  'students.toast.sessionScheduled': {
    en: 'Session scheduled successfully',
    nl: 'Sessie succesvol ingepland'
  },
  'students.toast.recurringScheduled': {
    en: 'Recurring lesson scheduled successfully',
    nl: 'Terugkerende les succesvol ingepland'
  },

  // Students — delete confirmation
  'students.delete.title': {
    en: 'Are you absolutely sure?',
    nl: 'Weet u het zeker?'
  },
  'students.delete.description': {
    en: 'This action cannot be undone. This will permanently delete the student and remove all their data from our servers.',
    nl: 'Deze actie kan niet ongedaan worden gemaakt. De student en alle bijbehorende gegevens worden permanent verwijderd.'
  },
  'students.delete.confirm': {
    en: 'Delete Student',
    nl: 'Student Verwijderen'
  },
  'students.delete.deleting': {
    en: 'Deleting...',
    nl: 'Verwijderen...'
  },

  // Students — Assign Song dialog
  'students.assignSong.title': {
    en: 'Assign Song',
    nl: 'Nummer Toewijzen'
  },
  'students.assignSong.selectPlaceholder': {
    en: 'Select a song',
    nl: 'Selecteer een nummer'
  },
  'students.assignSong.notesPlaceholder': {
    en: 'Any specific instructions or notes about this assignment',
    nl: 'Specifieke instructies of opmerkingen over deze opdracht'
  },
  'students.assignSong.button': {
    en: 'Assign Song',
    nl: 'Nummer Toewijzen'
  },
  'students.assignSong.assigning': {
    en: 'Assigning...',
    nl: 'Toewijzen...'
  },

  // Students — Assign Lesson dialog
  'students.assignLesson.title': {
    en: 'Assign Lesson',
    nl: 'Les Toewijzen'
  },
  'students.assignLesson.selectPlaceholder': {
    en: 'Select a lesson',
    nl: 'Selecteer een les'
  },
  'students.assignLesson.notesPlaceholder': {
    en: 'Any specific instructions or notes about this assignment',
    nl: 'Specifieke instructies of opmerkingen over deze opdracht'
  },
  'students.assignLesson.button': {
    en: 'Assign Lesson',
    nl: 'Les Toewijzen'
  },
  'students.assignLesson.assigning': {
    en: 'Assigning...',
    nl: 'Toewijzen...'
  },

  // Students — Schedule Session dialog
  'students.scheduleSession.title': {
    en: 'Schedule Session',
    nl: 'Sessie Inplannen'
  },
  'students.scheduleSession.sessionTitle': {
    en: 'Session Title',
    nl: 'Sessietitel'
  },
  'students.scheduleSession.titlePlaceholder': {
    en: 'Enter session title',
    nl: 'Voer sessietitel in'
  },
  'students.scheduleSession.startTime': {
    en: 'Start Time',
    nl: 'Starttijd'
  },
  'students.scheduleSession.endTime': {
    en: 'End Time',
    nl: 'Eindtijd'
  },
  'students.scheduleSession.notesPlaceholder': {
    en: 'Any notes about this session',
    nl: 'Opmerkingen over deze sessie'
  },
  'students.scheduleSession.button': {
    en: 'Schedule Session',
    nl: 'Sessie Inplannen'
  },
  'students.scheduleSession.scheduling': {
    en: 'Scheduling...',
    nl: 'Inplannen...'
  },

  // Students — Recurring Lesson dialog
  'students.recurringLesson.title': {
    en: 'Schedule Recurring Lessons',
    nl: 'Terugkerende Lessen Inplannen'
  },
  'students.recurringLesson.dayOfWeek': {
    en: 'Day of Week',
    nl: 'Dag van de week'
  },
  'students.recurringLesson.dayPlaceholder': {
    en: 'Select day',
    nl: 'Selecteer dag'
  },
  'students.recurringLesson.startTime': {
    en: 'Start Time',
    nl: 'Starttijd'
  },
  'students.recurringLesson.duration': {
    en: 'Duration (minutes)',
    nl: 'Duur (minuten)'
  },
  'students.recurringLesson.durationPlaceholder': {
    en: 'Select duration',
    nl: 'Selecteer duur'
  },
  'students.recurringLesson.min30': {
    en: '30 minutes',
    nl: '30 minuten'
  },
  'students.recurringLesson.min45': {
    en: '45 minutes',
    nl: '45 minuten'
  },
  'students.recurringLesson.min60': {
    en: '60 minutes',
    nl: '60 minuten'
  },
  'students.recurringLesson.min90': {
    en: '90 minutes',
    nl: '90 minuten'
  },
  'students.recurringLesson.location': {
    en: 'Location (Optional)',
    nl: 'Locatie (optioneel)'
  },
  'students.recurringLesson.locationPlaceholder': {
    en: 'e.g., Room 1, Studio A',
    nl: 'bijv. Kamer 1, Studio A'
  },
  'students.recurringLesson.notesOptional': {
    en: 'Notes (Optional)',
    nl: 'Opmerkingen (optioneel)'
  },
  'students.recurringLesson.notesPlaceholder': {
    en: 'Additional notes...',
    nl: 'Aanvullende opmerkingen...'
  },
  'students.recurringLesson.button': {
    en: 'Create Recurring Lesson',
    nl: 'Terugkerende Les Aanmaken'
  },
  'students.recurringLesson.creating': {
    en: 'Creating...',
    nl: 'Aanmaken...'
  },

  // Student details page
  'studentDetails.invalidId': {
    en: 'Invalid Student ID',
    nl: 'Ongeldig student-ID'
  },
  'studentDetails.notFound': {
    en: 'Student Not Found',
    nl: 'Student niet gevonden'
  },
  'studentDetails.notFoundMessage': {
    en: 'Student not found',
    nl: 'Student niet gevonden'
  },
  'studentDetails.loading': {
    en: 'Loading Student...',
    nl: 'Student laden...'
  },
  'studentDetails.loadingMessage': {
    en: 'Loading student information...',
    nl: 'Studentinformatie laden...'
  },
  'studentDetails.backToStudents': {
    en: 'Back to Students',
    nl: 'Terug naar studenten'
  },
  'studentDetails.tab.assignments': {
    en: 'Assignments',
    nl: 'Opdrachten'
  },
  'studentDetails.tab.sessions': {
    en: 'Sessions',
    nl: 'Sessies'
  },
  'studentDetails.tab.achievements': {
    en: 'Achievements',
    nl: 'Prestaties'
  },
  'studentDetails.tab.notes': {
    en: 'Notes',
    nl: 'Opmerkingen'
  },
  'studentDetails.tab.practiceLog': {
    en: 'Practice Log',
    nl: 'Oefenlog'
  },

  // Student details — Assignments tab
  'studentDetails.assignments.title': {
    en: 'Assignments',
    nl: 'Opdrachten'
  },
  'studentDetails.assignments.description': {
    en: 'Track songs and lessons assigned to {name}',
    nl: 'Bijhouden van nummers en lessen toegewezen aan {name}'
  },
  'studentDetails.assignments.assignMaterial': {
    en: 'Assign Material',
    nl: 'Materiaal Toewijzen'
  },
  'studentDetails.assignments.loading': {
    en: 'Loading assignments...',
    nl: 'Opdrachten laden...'
  },
  'studentDetails.assignments.none': {
    en: 'No assignments found',
    nl: 'Geen opdrachten gevonden'
  },
  'studentDetails.assignments.assignSong': {
    en: 'Assign Song',
    nl: 'Nummer Toewijzen'
  },
  'studentDetails.assignments.assignLesson': {
    en: 'Assign Lesson',
    nl: 'Les Toewijzen'
  },
  'studentDetails.assignments.col.type': {
    en: 'Type',
    nl: 'Type'
  },
  'studentDetails.assignments.col.title': {
    en: 'Title',
    nl: 'Titel'
  },
  'studentDetails.assignments.col.assignedDate': {
    en: 'Assigned Date',
    nl: 'Toegewezen datum'
  },
  'studentDetails.assignments.col.dueDate': {
    en: 'Due Date',
    nl: 'Vervaldatum'
  },
  'studentDetails.assignments.col.status': {
    en: 'Status',
    nl: 'Status'
  },
  'studentDetails.assignments.col.actions': {
    en: 'Actions',
    nl: 'Acties'
  },
  'studentDetails.assignments.typeSong': {
    en: 'Song',
    nl: 'Nummer'
  },
  'studentDetails.assignments.typeLesson': {
    en: 'Lesson',
    nl: 'Les'
  },
  'studentDetails.assignments.notSet': {
    en: 'Not set',
    nl: 'Niet ingesteld'
  },
  'studentDetails.assignments.completed': {
    en: 'Completed',
    nl: 'Voltooid'
  },
  'studentDetails.assignments.inProgress': {
    en: 'In Progress',
    nl: 'In uitvoering'
  },
  'studentDetails.assignments.editAssignment': {
    en: 'Edit assignment',
    nl: 'Opdracht bewerken'
  },
  'studentDetails.assignments.markIncomplete': {
    en: 'Mark as incomplete',
    nl: 'Markeren als onvoltooid'
  },
  'studentDetails.assignments.markComplete': {
    en: 'Mark as complete',
    nl: 'Markeren als voltooid'
  },
  'studentDetails.assignments.deleteAssignment': {
    en: 'Delete assignment',
    nl: 'Opdracht verwijderen'
  },
  'studentDetails.assignments.deleted': {
    en: 'Assignment deleted',
    nl: 'Opdracht verwijderd'
  },
  'studentDetails.assignments.deletedDescription': {
    en: 'The assignment has been successfully removed',
    nl: 'De opdracht is succesvol verwijderd'
  },
  'studentDetails.assignments.deleteFailed': {
    en: 'Failed to delete assignment',
    nl: 'Opdracht verwijderen mislukt'
  },

  // Student details — Sessions tab
  'studentDetails.sessions.title': {
    en: 'Scheduled Sessions',
    nl: 'Geplande sessies'
  },
  'studentDetails.sessions.description': {
    en: 'Upcoming and past lessons with {name}',
    nl: 'Komende en afgelopen lessen met {name}'
  },
  'studentDetails.sessions.scheduleSession': {
    en: 'Schedule Session',
    nl: 'Sessie Inplannen'
  },
  'studentDetails.sessions.loading': {
    en: 'Loading sessions...',
    nl: 'Sessies laden...'
  },
  'studentDetails.sessions.none': {
    en: 'No sessions scheduled',
    nl: 'Geen sessies ingepland'
  },
  'studentDetails.sessions.scheduleFirst': {
    en: 'Schedule First Session',
    nl: 'Eerste sessie inplannen'
  },
  'studentDetails.sessions.col.title': {
    en: 'Title',
    nl: 'Titel'
  },
  'studentDetails.sessions.col.date': {
    en: 'Date',
    nl: 'Datum'
  },
  'studentDetails.sessions.col.time': {
    en: 'Time',
    nl: 'Tijd'
  },
  'studentDetails.sessions.col.duration': {
    en: 'Duration',
    nl: 'Duur'
  },
  'studentDetails.sessions.col.notes': {
    en: 'Notes',
    nl: 'Opmerkingen'
  },
  'studentDetails.sessions.col.actions': {
    en: 'Actions',
    nl: 'Acties'
  },
  'studentDetails.sessions.noNotes': {
    en: 'No notes',
    nl: 'Geen opmerkingen'
  },
  'studentDetails.sessions.editSession': {
    en: 'Edit session',
    nl: 'Sessie bewerken'
  },
  'studentDetails.sessions.cancelSession': {
    en: 'Cancel session',
    nl: 'Sessie annuleren'
  },
  'studentDetails.sessions.deleted': {
    en: 'Session deleted',
    nl: 'Sessie verwijderd'
  },
  'studentDetails.sessions.deletedDescription': {
    en: 'The scheduled session has been successfully removed',
    nl: 'De geplande sessie is succesvol verwijderd'
  },
  'studentDetails.sessions.deleteFailed': {
    en: 'Failed to delete session',
    nl: 'Sessie verwijderen mislukt'
  },
  // Attendance
  'studentDetails.sessions.col.attendance': {
    en: 'Attendance',
    nl: 'Aanwezigheid'
  },
  'studentDetails.sessions.attendance.present': {
    en: 'Present',
    nl: 'Aanwezig'
  },
  'studentDetails.sessions.attendance.noshow': {
    en: 'No-show',
    nl: 'Niet verschenen'
  },
  'studentDetails.sessions.attendance.markPresent': {
    en: 'Mark present',
    nl: 'Aanwezig markeren'
  },
  'studentDetails.sessions.attendance.markNoshow': {
    en: 'Mark no-show',
    nl: 'Niet verschenen markeren'
  },
  'studentDetails.sessions.attendance.saved': {
    en: 'Attendance saved',
    nl: 'Aanwezigheid opgeslagen'
  },
  // Teacher notes
  'studentDetails.sessions.col.teacherNotes': {
    en: 'Teaching Notes',
    nl: 'Lesnotities'
  },
  'studentDetails.sessions.teacherNotes.placeholder': {
    en: 'Notes from this lesson...',
    nl: 'Notities van deze les...'
  },
  'studentDetails.sessions.teacherNotes.saved': {
    en: 'Notes saved',
    nl: 'Notities opgeslagen'
  },
  // Practice log (teacher view on student detail)
  'studentDetails.practiceLog.title': {
    en: 'Practice Log',
    nl: 'Oefenlog'
  },
  'studentDetails.practiceLog.description': {
    en: 'Practice sessions logged by {name}',
    nl: 'Oefensessies geregistreerd door {name}'
  },
  'studentDetails.practiceLog.empty': {
    en: 'No practice sessions logged yet',
    nl: 'Nog geen oefensessies geregistreerd'
  },
  'studentDetails.practiceLog.col.date': {
    en: 'Date',
    nl: 'Datum'
  },
  'studentDetails.practiceLog.col.duration': {
    en: 'Duration',
    nl: 'Duur'
  },
  'studentDetails.practiceLog.col.xp': {
    en: 'XP',
    nl: 'XP'
  },
  'studentDetails.practiceLog.col.notes': {
    en: 'Notes',
    nl: 'Opmerkingen'
  },
  'studentDetails.practiceLog.minutes': {
    en: '{n} min',
    nl: '{n} min'
  },

  // Student portal — Practice log (student self-log form)
  'studentPortal.practice.logManual.title': {
    en: 'Log Practice Time',
    nl: 'Oefentijd registreren'
  },
  'studentPortal.practice.logManual.description': {
    en: 'How long did you practice today?',
    nl: 'Hoe lang heb je vandaag geoefend?'
  },
  'studentPortal.practice.logManual.minutesLabel': {
    en: 'Minutes practiced',
    nl: 'Minuten geoefend'
  },
  'studentPortal.practice.logManual.notesLabel': {
    en: 'What did you practice? (optional)',
    nl: 'Wat heb je geoefend? (optioneel)'
  },
  'studentPortal.practice.logManual.notesPlaceholder': {
    en: 'e.g. scales, the new song...',
    nl: 'bijv. toonladders, het nieuwe nummer...'
  },
  'studentPortal.practice.logManual.submit': {
    en: 'Log practice',
    nl: 'Registreren'
  },
  'studentPortal.practice.logManual.submitting': {
    en: 'Saving...',
    nl: 'Opslaan...'
  },
  'studentPortal.practice.logManual.success': {
    en: 'Practice logged! +{xp} XP',
    nl: 'Oefensessie geregistreerd! +{xp} XP'
  },
  'studentPortal.practice.logManual.error': {
    en: 'Failed to log practice',
    nl: 'Oefensessie registreren mislukt'
  },

  // Student details — Notes tab
  'studentDetails.notes.title': {
    en: 'Notes',
    nl: 'Opmerkingen'
  },
  'studentDetails.notes.description': {
    en: 'Additional information about {name}',
    nl: 'Aanvullende informatie over {name}'
  },
  'studentDetails.notes.none': {
    en: 'No notes available',
    nl: 'Geen opmerkingen beschikbaar'
  },
  'studentDetails.notes.addNotes': {
    en: 'Add Notes',
    nl: 'Opmerkingen Toevoegen'
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
  'messages.pageTitle': {
    en: 'Student Messages',
    nl: 'Studentberichten'
  },
  'messages.pageSubtitle': {
    en: 'View and respond to questions from your students',
    nl: 'Bekijk en beantwoord vragen van je studenten'
  },
  'messages.sendNewMessage': {
    en: 'Send New Message',
    nl: 'Nieuw Bericht Sturen'
  },
  'messages.sendNewMessageDescription': {
    en: 'Send a message to a student or teacher',
    nl: 'Stuur een bericht naar een student of docent'
  },
  'messages.sendTo': {
    en: 'Send to',
    nl: 'Sturen naar'
  },
  'messages.selectRecipientType': {
    en: 'Select recipient type',
    nl: 'Selecteer ontvanger type'
  },
  'messages.recipientStudent': {
    en: 'Student',
    nl: 'Student'
  },
  'messages.recipientTeacher': {
    en: 'Teacher',
    nl: 'Docent'
  },
  'messages.selectStudent': {
    en: 'Select Student',
    nl: 'Student Selecteren'
  },
  'messages.selectTeacher': {
    en: 'Select Teacher',
    nl: 'Docent Selecteren'
  },
  'messages.enterSubject': {
    en: 'Enter message subject...',
    nl: 'Voer het berichtonderwerp in...'
  },
  'messages.typeMessage': {
    en: 'Type your message here...',
    nl: 'Typ hier je bericht...'
  },
  'messages.sending': {
    en: 'Sending...',
    nl: 'Verzenden...'
  },
  'messages.sendMessage': {
    en: 'Send Message',
    nl: 'Bericht Verzenden'
  },
  'messages.tabAll': {
    en: 'All',
    nl: 'Alle'
  },
  'messages.tabPending': {
    en: 'Pending Response',
    nl: 'Wacht op Antwoord'
  },
  'messages.tabAnswered': {
    en: 'Answered',
    nl: 'Beantwoord'
  },
  'messages.noMessages': {
    en: 'No messages yet',
    nl: 'Nog geen berichten'
  },
  'messages.noMessagesDescription': {
    en: "When students send you messages, they'll appear here.",
    nl: 'Wanneer studenten je berichten sturen, verschijnen ze hier.'
  },
  'messages.allCaughtUp': {
    en: 'All caught up!',
    nl: 'Alles bijgewerkt!'
  },
  'messages.noPendingMessages': {
    en: 'No messages waiting for your response.',
    nl: 'Geen berichten die wachten op jouw antwoord.'
  },
  'messages.noAnsweredMessages': {
    en: 'No answered messages',
    nl: 'Geen beantwoorde berichten'
  },
  'messages.noAnsweredMessagesDescription': {
    en: "Messages you've responded to will appear here.",
    nl: 'Berichten waarop je hebt gereageerd, verschijnen hier.'
  },
  'messages.unknownStudent': {
    en: 'Unknown Student',
    nl: 'Onbekende Student'
  },
  'messages.noSubject': {
    en: 'No Subject',
    nl: 'Geen Onderwerp'
  },
  'messages.unknownDate': {
    en: 'Unknown date',
    nl: 'Onbekende datum'
  },
  'messages.noMessageContent': {
    en: 'No message content',
    nl: 'Geen berichtinhoud'
  },
  'messages.yourResponse': {
    en: 'Your Response',
    nl: 'Jouw Antwoord'
  },
  'messages.noResponseDate': {
    en: 'No response date',
    nl: 'Geen antwoorddatum'
  },
  'messages.studentReplies': {
    en: 'Student Replies',
    nl: 'Studentreacties'
  },
  'messages.sendResponse': {
    en: 'Send Response',
    nl: 'Antwoord Verzenden'
  },
  'messages.typeResponse': {
    en: 'Type your response to the student...',
    nl: 'Typ je antwoord aan de student...'
  },
  'messages.respond': {
    en: 'Respond',
    nl: 'Reageren'
  },
  'messages.badgeNew': {
    en: 'New',
    nl: 'Nieuw'
  },
  'messages.badgeAnswered': {
    en: 'Answered',
    nl: 'Beantwoord'
  },
  'messages.toastResponseSentTitle': {
    en: 'Response sent',
    nl: 'Antwoord verstuurd'
  },
  'messages.toastResponseSentDescription': {
    en: 'Your response has been sent to the student.',
    nl: 'Jouw antwoord is naar de student gestuurd.'
  },
  'messages.toastResponseErrorDescription': {
    en: 'Failed to send response. Please try again.',
    nl: 'Antwoord versturen mislukt. Probeer het opnieuw.'
  },
  'messages.toastSentTitle': {
    en: 'Message sent',
    nl: 'Bericht verstuurd'
  },
  'messages.toastSentDescription': {
    en: 'Your message has been sent successfully.',
    nl: 'Jouw bericht is succesvol verstuurd.'
  },
  'messages.toastSendErrorDescription': {
    en: 'Failed to send message. Please try again.',
    nl: 'Bericht versturen mislukt. Probeer het opnieuw.'
  },

  // Songs
  'songs.title': {
    en: 'Songs',
    nl: 'Nummers'
  },
  'songs.subtitle': {
    en: 'Manage your song library and practice materials',
    nl: 'Beheer je nummerbibliotheek en oefenmateriaal'
  },
  'songs.addSong': {
    en: 'Add Song',
    nl: 'Nummer Toevoegen'
  },
  'songs.addNewSong': {
    en: 'Add New Song',
    nl: 'Nieuw Nummer Toevoegen'
  },
  'songs.addNewSongDescription': {
    en: 'Create a new song with practice materials and resources for your students.',
    nl: 'Maak een nieuw nummer met oefenmateriaal en bronnen voor je studenten.'
  },
  'songs.editSong': {
    en: 'Edit Song',
    nl: 'Nummer Bewerken'
  },
  'songs.editSongDescription': {
    en: "Make changes to this song and click save when you're done.",
    nl: 'Breng wijzigingen aan in dit nummer en klik op opslaan als je klaar bent.'
  },
  'songs.assignSong': {
    en: 'Assign Song to Student',
    nl: 'Nummer Toewijzen aan Student'
  },
  'songs.labelTitle': {
    en: 'Title *',
    nl: 'Titel *'
  },
  'songs.labelComposer': {
    en: 'Composer/Artist',
    nl: 'Componist/Artiest'
  },
  'songs.labelGenre': {
    en: 'Genre',
    nl: 'Genre'
  },
  'songs.labelLevel': {
    en: 'Level',
    nl: 'Niveau'
  },
  'songs.labelInstrument': {
    en: 'Instrument',
    nl: 'Instrument'
  },
  'songs.labelKey': {
    en: 'Key',
    nl: 'Toonaard'
  },
  'songs.labelTempo': {
    en: 'Tempo (BPM)',
    nl: 'Tempo (BPM)'
  },
  'songs.labelDuration': {
    en: 'Duration',
    nl: 'Duur'
  },
  'songs.labelDescription': {
    en: 'Description',
    nl: 'Beschrijving'
  },
  'songs.placeholderTitle': {
    en: 'Enter song title',
    nl: 'Voer songtitel in'
  },
  'songs.placeholderComposer': {
    en: 'E.g., Bach, The Beatles',
    nl: 'Bijv. Bach, The Beatles'
  },
  'songs.placeholderGenre': {
    en: 'E.g., Classical, Rock, Jazz',
    nl: 'Bijv. Klassiek, Rock, Jazz'
  },
  'songs.placeholderInstrument': {
    en: 'E.g., Guitar, Piano, Drums',
    nl: 'Bijv. Gitaar, Piano, Drums'
  },
  'songs.placeholderKey': {
    en: 'E.g., C Major, Em',
    nl: 'Bijv. C Majeur, Em'
  },
  'songs.placeholderTempo': {
    en: 'E.g., 120',
    nl: 'Bijv. 120'
  },
  'songs.placeholderDuration': {
    en: 'E.g., 3:45',
    nl: 'Bijv. 3:45'
  },
  'songs.placeholderDescription': {
    en: 'Add notes about the song, practice tips, or learning objectives',
    nl: 'Voeg notities over het nummer, oefentips of leerdoelen toe'
  },
  'songs.selectLevel': {
    en: 'Select level',
    nl: 'Selecteer niveau'
  },
  'songs.levelNone': {
    en: 'None',
    nl: 'Geen'
  },
  'songs.levelBeginner': {
    en: 'Beginner',
    nl: 'Beginner'
  },
  'songs.levelIntermediate': {
    en: 'Intermediate',
    nl: 'Gemiddeld'
  },
  'songs.levelAdvanced': {
    en: 'Advanced',
    nl: 'Gevorderd'
  },
  'songs.contentResources': {
    en: 'Content & Resources',
    nl: 'Inhoud & Bronnen'
  },
  'songs.contentResourcesDescription': {
    en: 'Add sheet music, audio tracks, videos, and other practice resources for this song.',
    nl: "Voeg bladmuziek, audiotracks, video's en ander oefenmateriaal voor dit nummer toe."
  },
  'songs.creating': {
    en: 'Creating...',
    nl: 'Aanmaken...'
  },
  'songs.createSong': {
    en: 'Create Song',
    nl: 'Nummer Aanmaken'
  },
  'songs.saving': {
    en: 'Saving...',
    nl: 'Opslaan...'
  },
  'songs.saveChanges': {
    en: 'Save Changes',
    nl: 'Wijzigingen Opslaan'
  },
  'songs.assigning': {
    en: 'Assigning...',
    nl: 'Toewijzen...'
  },
  'songs.assignSongButton': {
    en: 'Assign Song',
    nl: 'Nummer Toewijzen'
  },
  'songs.tabGridView': {
    en: 'Grid View',
    nl: 'Rasterweergave'
  },
  'songs.tabBrowseByArtist': {
    en: 'Browse by Artist',
    nl: 'Bladeren op Artiest'
  },
  'songs.searchPlaceholder': {
    en: 'Search songs by title, artist, genre...',
    nl: 'Zoek nummers op titel, artiest, genre...'
  },
  'songs.noSongs': {
    en: 'No songs',
    nl: 'Geen nummers'
  },
  'songs.noSongsDescription': {
    en: 'Get started by adding your first song.',
    nl: 'Begin met het toevoegen van je eerste nummer.'
  },
  'songs.practice': {
    en: 'Practice',
    nl: 'Oefenen'
  },
  'songs.assign': {
    en: 'Assign',
    nl: 'Toewijzen'
  },
  'songs.selectStudent': {
    en: 'Select Student',
    nl: 'Student Selecteren'
  },
  'songs.chooseStudent': {
    en: 'Choose a student',
    nl: 'Kies een student'
  },
  'songs.dueDateOptional': {
    en: 'Due Date (Optional)',
    nl: 'Vervaldatum (Optioneel)'
  },
  'songs.notesOptional': {
    en: 'Notes (Optional)',
    nl: 'Notities (Optioneel)'
  },
  'songs.notesPlaceholder': {
    en: 'Add any specific instructions or notes for the student',
    nl: 'Voeg specifieke instructies of notities voor de student toe'
  },
  'songs.toastCreatedDescription': {
    en: 'Song created successfully',
    nl: 'Nummer succesvol aangemaakt'
  },
  'songs.toastDeletedDescription': {
    en: 'Song deleted successfully',
    nl: 'Nummer succesvol verwijderd'
  },
  'songs.toastUpdatedDescription': {
    en: 'Song updated successfully',
    nl: 'Nummer succesvol bijgewerkt'
  },
  'songs.toastAssignedDescription': {
    en: 'Song assigned successfully',
    nl: 'Nummer succesvol toegewezen'
  },
  'songs.toastSelectStudentError': {
    en: 'Please select a student',
    nl: 'Selecteer een student'
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

  // Schedule — loading and error states
  'schedule.loading': {
    en: 'Loading schedules...',
    nl: 'Roosters laden...'
  },
  'schedule.errorTitle': {
    en: 'Error Loading Schedule',
    nl: 'Fout bij laden rooster'
  },
  'schedule.errorDescription': {
    en: 'Unable to load schedule data. Please try again.',
    nl: 'Kan roostergegevens niet laden. Probeer het opnieuw.'
  },
  'schedule.refreshPage': {
    en: 'Refresh Page',
    nl: 'Pagina vernieuwen'
  },
  'schedule.weeklySchedule': {
    en: 'Weekly Schedule',
    nl: 'Wekelijks Rooster'
  },
  'schedule.noLessons': {
    en: 'No lessons',
    nl: 'Geen lessen'
  },
  'schedule.conflictsDetected': {
    en: 'Schedule Conflicts Detected',
    nl: 'Roosterconflicten gedetecteerd'
  },
  'schedule.conflictWith': {
    en: 'Conflict with',
    nl: 'Conflict met'
  },
  'schedule.unknownDay': {
    en: 'Unknown Day',
    nl: 'Onbekende dag'
  },
  'schedule.recurringSchedules': {
    en: 'Recurring Schedules',
    nl: 'Terugkerende roosters'
  },
  'schedule.individualLessons': {
    en: 'Individual Lessons',
    nl: 'Individuele lessen'
  },
  'schedule.upcomingIndividualLessons': {
    en: 'Upcoming Individual Lessons',
    nl: 'Komende individuele lessen'
  },
  'schedule.upcomingIndividualDescription': {
    en: 'Manage individual lessons from recurring schedules. Cancel specific lessons without affecting the recurring schedule.',
    nl: 'Beheer individuele lessen vanuit terugkerende roosters. Annuleer specifieke lessen zonder het terugkerende rooster te beïnvloeden.'
  },
  'schedule.loadingSessions': {
    en: 'Loading sessions...',
    nl: 'Sessies laden...'
  },
  'schedule.noUpcomingLessons': {
    en: 'No upcoming lessons scheduled',
    nl: 'Geen komende lessen gepland'
  },
  'schedule.sessionsFromRecurring': {
    en: 'Individual lessons are generated from recurring schedules',
    nl: 'Individuele lessen worden gegenereerd vanuit terugkerende roosters'
  },
  'schedule.table.student': {
    en: 'Student',
    nl: 'Student'
  },
  'schedule.table.lessonTitle': {
    en: 'Lesson Title',
    nl: 'Lestitel'
  },
  'schedule.table.date': {
    en: 'Date',
    nl: 'Datum'
  },
  'schedule.table.time': {
    en: 'Time',
    nl: 'Tijd'
  },
  'schedule.table.duration': {
    en: 'Duration',
    nl: 'Duur'
  },
  'schedule.table.notes': {
    en: 'Notes',
    nl: 'Opmerkingen'
  },
  'schedule.table.actions': {
    en: 'Actions',
    nl: 'Acties'
  },
  'schedule.table.noNotes': {
    en: 'No notes',
    nl: 'Geen opmerkingen'
  },
  'schedule.table.minutes': {
    en: 'min',
    nl: 'min'
  },
  'schedule.cancelLesson': {
    en: 'Cancel Lesson',
    nl: 'Les annuleren'
  },
  'schedule.cancelIndividualLesson': {
    en: 'Cancel Individual Lesson',
    nl: 'Individuele les annuleren'
  },
  'schedule.cancelLessonDescription': {
    en: 'This will only cancel this specific lesson and will not affect the recurring schedule.',
    nl: 'Dit annuleert alleen deze specifieke les en heeft geen invloed op het terugkerende rooster.'
  },
  'schedule.keepLesson': {
    en: 'Keep Lesson',
    nl: 'Les behouden'
  },
  'schedule.cancelling': {
    en: 'Cancelling...',
    nl: 'Annuleren...'
  },
  'schedule.lessonCancelled': {
    en: 'Lesson cancelled',
    nl: 'Les geannuleerd'
  },
  'schedule.lessonCancelledDescription': {
    en: 'The individual lesson has been cancelled successfully.',
    nl: 'De individuele les is succesvol geannuleerd.'
  },
  'schedule.failedToCancel': {
    en: 'Failed to cancel lesson',
    nl: 'Kon les niet annuleren'
  },
  'schedule.details': {
    en: 'Schedule Details',
    nl: 'Roosterdetails'
  },
  'schedule.recurringInfo': {
    en: 'Recurring lesson schedule information',
    nl: 'Informatie over terugkerend lesrooster'
  },
  'schedule.addRecurring': {
    en: 'Add Recurring Schedule',
    nl: 'Terugkerend rooster toevoegen'
  },
  'schedule.createRecurringDescription': {
    en: 'Create a new recurring lesson schedule',
    nl: 'Maak een nieuw terugkerend lesrooster aan'
  },
  'schedule.form.studentLabel': {
    en: 'Student *',
    nl: 'Student *'
  },
  'schedule.form.teacherLabel': {
    en: 'Teacher *',
    nl: 'Docent *'
  },
  'schedule.form.selectTeacher': {
    en: 'Select a teacher',
    nl: 'Selecteer een docent'
  },
  'schedule.form.dayOfWeek': {
    en: 'Day of Week *',
    nl: 'Dag van de week *'
  },
  'schedule.form.startTimeLabel': {
    en: 'Start Time *',
    nl: 'Starttijd *'
  },
  'schedule.form.endTimeLabel': {
    en: 'End Time *',
    nl: 'Eindtijd *'
  },
  'schedule.form.startPlaceholder': {
    en: 'Start',
    nl: 'Start'
  },
  'schedule.form.endPlaceholder': {
    en: 'End',
    nl: 'Einde'
  },
  'schedule.form.frequencyLabel': {
    en: 'Frequency *',
    nl: 'Frequentie *'
  },
  'schedule.form.selectFrequency': {
    en: 'Select frequency',
    nl: 'Selecteer frequentie'
  },
  'schedule.form.weekly': {
    en: 'Weekly',
    nl: 'Wekelijks'
  },
  'schedule.form.biweekly': {
    en: 'Bi-weekly',
    nl: 'Tweewekelijks'
  },
  'schedule.form.locationLabel': {
    en: 'Location',
    nl: 'Locatie'
  },
  'schedule.form.locationPlaceholder': {
    en: 'e.g., Room 1, Studio A',
    nl: 'bijv., Ruimte 1, Studio A'
  },
  'schedule.form.notesLabel': {
    en: 'Notes',
    nl: 'Opmerkingen'
  },
  'schedule.form.notesPlaceholder': {
    en: 'Additional notes...',
    nl: 'Aanvullende opmerkingen...'
  },
  'schedule.creating': {
    en: 'Creating...',
    nl: 'Aanmaken...'
  },
  'schedule.deleting': {
    en: 'Deleting...',
    nl: 'Verwijderen...'
  },
  'schedule.createdSuccess': {
    en: 'Recurring schedule created successfully.',
    nl: 'Terugkerend rooster succesvol aangemaakt.'
  },
  'schedule.deletedSuccess': {
    en: 'Schedule deleted successfully.',
    nl: 'Rooster succesvol verwijderd.'
  },
  'schedule.createFailed': {
    en: 'Failed to create schedule.',
    nl: 'Kon rooster niet aanmaken.'
  },
  'schedule.deleteFailed': {
    en: 'Failed to delete schedule.',
    nl: 'Kon rooster niet verwijderen.'
  },
  'schedule.conflictDetectedTitle': {
    en: 'Schedule conflict detected',
    nl: 'Roosterconflict gedetecteerd'
  },
  'schedule.subtitleManagement': {
    en: 'Manage recurring lesson schedules and individual sessions',
    nl: 'Beheer terugkerende lesroosters en individuele sessies'
  },
  'schedule.unknownStudent': {
    en: 'Unknown Student',
    nl: 'Onbekende student'
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
    nl: 'Zondag',
    de: 'Sonntag',
    es: 'Domingo'
  },
  'schedule.days.monday': {
    en: 'Monday',
    nl: 'Maandag',
    de: 'Montag',
    es: 'Lunes'
  },
  'schedule.days.tuesday': {
    en: 'Tuesday',
    nl: 'Dinsdag',
    de: 'Dienstag',
    es: 'Martes'
  },
  'schedule.days.wednesday': {
    en: 'Wednesday',
    nl: 'Woensdag',
    de: 'Mittwoch',
    es: 'Miércoles'
  },
  'schedule.days.thursday': {
    en: 'Thursday',
    nl: 'Donderdag',
    de: 'Donnerstag',
    es: 'Jueves'
  },
  'schedule.days.friday': {
    en: 'Friday',
    nl: 'Vrijdag',
    de: 'Freitag',
    es: 'Viernes'
  },
  'schedule.days.saturday': {
    en: 'Saturday',
    nl: 'Zaterdag',
    de: 'Samstag',
    es: 'Sábado'
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
    nl: 'Engels',
    de: 'Englisch',
    es: 'Inglés'
  },
  'language.dutch': {
    en: 'Dutch',
    nl: 'Nederlands',
    de: 'Niederländisch',
    es: 'Neerlandés'
  },
  'language.german': {
    en: 'German',
    nl: 'Duits',
    de: 'Deutsch',
    es: 'Alemán'
  },
  'language.spanish': {
    en: 'Spanish',
    nl: 'Spaans',
    de: 'Spanisch',
    es: 'Español'
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
    en: 'Visit musicdott.app for MusicDott 1.0',
    nl: 'Bezoek musicdott.app voor MusicDott 1.0'
  },

  // 404 page
  'error.404Title': {
    en: '404 Page Not Found',
    nl: '404 Pagina niet gevonden'
  },
  'error.404Description': {
    en: 'The page you are looking for does not exist.',
    nl: 'De pagina die je zoekt bestaat niet.'
  },

  // Signup page — page header
  'signup.pageTitle': {
    en: 'Join MusicDott',
    nl: 'Doe mee met MusicDott'
  },
  'signup.pageSubtitle': {
    en: 'Start managing your music school with the most comprehensive platform for music education',
    nl: 'Begin met het beheren van je muziekschool met het meest uitgebreide platform voor muziekonderwijs'
  },

  // Signup page — card header
  'signup.cardTitle': {
    en: 'Create Your Music School Account',
    nl: 'Maak je muziekschoolaccount aan'
  },
  'signup.cardDescription': {
    en: 'Set up your account and school profile in just a few minutes',
    nl: 'Stel je account en schoolprofiel in slechts een paar minuten in'
  },

  // Signup page — section headings
  'signup.section.accountInfo': {
    en: 'Account Information',
    nl: 'Accountgegevens'
  },
  'signup.section.schoolInfo': {
    en: 'School Information',
    nl: 'Schoolinformatie'
  },
  'signup.section.teachingInfo': {
    en: 'Teaching Information',
    nl: 'Onderwijsinformatie'
  },

  // Signup page — field labels
  'signup.field.fullName': {
    en: 'Your Full Name',
    nl: 'Je volledige naam'
  },
  'signup.field.role': {
    en: 'Your Role',
    nl: 'Je rol'
  },
  'signup.field.username': {
    en: 'Username',
    nl: 'Gebruikersnaam'
  },
  'signup.field.emailAddress': {
    en: 'Email Address',
    nl: 'E-mailadres'
  },
  'signup.field.password': {
    en: 'Password',
    nl: 'Wachtwoord'
  },
  'signup.field.confirmPassword': {
    en: 'Confirm Password',
    nl: 'Wachtwoord bevestigen'
  },
  'signup.field.schoolName': {
    en: 'School/Studio Name',
    nl: 'School-/studionaam'
  },
  'signup.field.address': {
    en: 'Address (Optional)',
    nl: 'Adres (optioneel)'
  },
  'signup.field.phone': {
    en: 'Phone (Optional)',
    nl: 'Telefoon (optioneel)'
  },
  'signup.field.website': {
    en: 'Website (Optional)',
    nl: 'Website (optioneel)'
  },
  'signup.field.primaryInstruments': {
    en: 'Primary Instruments',
    nl: 'Primaire instrumenten'
  },
  'signup.field.yearsTeaching': {
    en: 'Years Teaching',
    nl: 'Jaren leservaring'
  },
  'signup.field.studentCapacity': {
    en: 'Expected Student Capacity',
    nl: 'Verwachte studentcapaciteit'
  },
  'signup.field.bio': {
    en: 'About You/Your School (Optional)',
    nl: 'Over jou/je school (optioneel)'
  },

  // Signup page — placeholders
  'signup.placeholder.fullName': {
    en: 'e.g. Sarah Johnson',
    nl: 'bijv. Sarah Johnson'
  },
  'signup.placeholder.selectRole': {
    en: 'Select your role',
    nl: 'Selecteer je rol'
  },
  'signup.placeholder.username': {
    en: 'musicschool2025',
    nl: 'muziekschool2025'
  },
  'signup.placeholder.email': {
    en: 'hello@musicschool.com',
    nl: 'hallo@muziekschool.nl'
  },
  'signup.placeholder.password': {
    en: 'Minimum 8 characters',
    nl: 'Minimaal 8 tekens'
  },
  'signup.placeholder.confirmPassword': {
    en: 'Repeat your password',
    nl: 'Herhaal je wachtwoord'
  },
  'signup.placeholder.schoolName': {
    en: 'e.g. Harmony Music Academy',
    nl: 'bijv. Harmonie Muziekacademie'
  },
  'signup.placeholder.address': {
    en: '123 Music Street, City, State',
    nl: 'Muziekstraat 123, Stad'
  },
  'signup.placeholder.phone': {
    en: '+1 (555) 123-4567',
    nl: '+31 (0)20 123 4567'
  },
  'signup.placeholder.website': {
    en: 'https://www.yourmusicschool.com',
    nl: 'https://www.jemuziekschool.nl'
  },
  'signup.placeholder.instruments': {
    en: 'e.g. Piano, Guitar, Violin',
    nl: 'bijv. Piano, Gitaar, Viool'
  },
  'signup.placeholder.selectExperience': {
    en: 'Select experience',
    nl: 'Selecteer ervaring'
  },
  'signup.placeholder.studentCapacity': {
    en: 'How many students do you plan to teach?',
    nl: 'Hoeveel studenten wil je lesgeven?'
  },
  'signup.placeholder.bio': {
    en: 'Tell us about your teaching philosophy, specialties, or what makes your school unique...',
    nl: 'Vertel ons over je onderwijsfilosofie, specialiteiten of wat jouw school uniek maakt...'
  },

  // Signup page — role options
  'signup.role.schoolOwner': {
    en: 'School Owner/Director',
    nl: 'Schooleigenaar/directeur'
  },
  'signup.role.teacher': {
    en: 'Independent Teacher',
    nl: 'Zelfstandig docent'
  },

  // Signup page — experience options
  'signup.experience.lessThan1': {
    en: 'Less than 1 year',
    nl: 'Minder dan 1 jaar'
  },
  'signup.experience.1to3': {
    en: '1-3 years',
    nl: '1-3 jaar'
  },
  'signup.experience.3to5': {
    en: '3-5 years',
    nl: '3-5 jaar'
  },
  'signup.experience.5to10': {
    en: '5-10 years',
    nl: '5-10 jaar'
  },
  'signup.experience.10plus': {
    en: '10+ years',
    nl: '10+ jaar'
  },

  // Signup page — student capacity options
  'signup.capacity.1to10': {
    en: '1-10 students',
    nl: '1-10 studenten'
  },
  'signup.capacity.11to25': {
    en: '11-25 students',
    nl: '11-25 studenten'
  },
  'signup.capacity.26to50': {
    en: '26-50 students',
    nl: '26-50 studenten'
  },
  'signup.capacity.51to100': {
    en: '51-100 students',
    nl: '51-100 studenten'
  },
  'signup.capacity.100plus': {
    en: '100+ students',
    nl: '100+ studenten'
  },

  // Signup page — buttons
  'signup.button.createAccount': {
    en: 'Create Account',
    nl: 'Account aanmaken'
  },
  'signup.button.creatingAccount': {
    en: 'Creating Account...',
    nl: 'Account aanmaken...'
  },
  'signup.button.backToLogin': {
    en: 'Back to Login',
    nl: 'Terug naar inloggen'
  },

  // Signup page — toast messages
  'signup.toast.successTitle': {
    en: 'Registration Successful!',
    nl: 'Registratie geslaagd!'
  },
  'signup.toast.successDescription': {
    en: 'Welcome to MusicDott! You can now log in to your account.',
    nl: 'Welkom bij MusicDott! Je kunt nu inloggen op je account.'
  },
  'signup.toast.errorTitle': {
    en: 'Registration Failed',
    nl: 'Registratie mislukt'
  },
  'signup.toast.errorDescription': {
    en: 'An error occurred during registration',
    nl: 'Er is een fout opgetreden tijdens de registratie'
  },

  // Signup page — footer
  'signup.footer.terms': {
    en: 'By creating an account, you agree to our Terms of Service and Privacy Policy.',
    nl: 'Door een account aan te maken, ga je akkoord met onze Servicevoorwaarden en ons Privacybeleid.'
  },

  // Student portal — Practice Sessions page
  'studentPortal.practice.title': {
    en: 'Practice Sessions',
    nl: 'Oefensessies'
  },
  'studentPortal.practice.subtitle': {
    en: 'Track your practice time and build consistency',
    nl: 'Houd je oefentijd bij en bouw consistentie op'
  },
  'studentPortal.practice.liveTracking': {
    en: 'Live tracking',
    nl: 'Live bijhouden'
  },
  'studentPortal.practice.offline': {
    en: 'Offline',
    nl: 'Offline'
  },
  'studentPortal.practice.inProgress': {
    en: 'Practice in progress',
    nl: 'Oefensessie bezig'
  },
  'studentPortal.practice.started': {
    en: 'Started:',
    nl: 'Gestart:'
  },
  'studentPortal.practice.endSession': {
    en: 'End Practice Session',
    nl: 'Oefensessie beëindigen'
  },
  'studentPortal.practice.readyToPractice': {
    en: 'Ready to practice?',
    nl: 'Klaar om te oefenen?'
  },
  'studentPortal.practice.startPrompt': {
    en: 'Start a practice session to track your progress',
    nl: 'Start een oefensessie om je voortgang bij te houden'
  },
  'studentPortal.practice.startSession': {
    en: 'Start Practice Session',
    nl: 'Oefensessie starten'
  },
  'studentPortal.practice.statsTitle': {
    en: 'Practice Stats',
    nl: 'Oefenstatistieken'
  },
  'studentPortal.practice.totalPracticeTime': {
    en: 'Total Practice Time',
    nl: 'Totale oefentijd'
  },
  'studentPortal.practice.sessions': {
    en: 'Sessions',
    nl: 'Sessies'
  },
  'studentPortal.practice.avgSession': {
    en: 'Avg Session',
    nl: 'Gem. sessie'
  },
  'studentPortal.practice.recentSessions': {
    en: 'Recent Sessions',
    nl: 'Recente sessies'
  },
  'studentPortal.practice.noSessions': {
    en: 'No practice sessions yet',
    nl: 'Nog geen oefensessies'
  },
  'studentPortal.practice.activeBadge': {
    en: 'Active',
    nl: 'Actief'
  },
  'studentPortal.practice.toast.startedTitle': {
    en: 'Practice session started',
    nl: 'Oefensessie gestart'
  },
  'studentPortal.practice.toast.startedDescription': {
    en: 'Your practice time is now being tracked.',
    nl: 'Je oefentijd wordt nu bijgehouden.'
  },
  'studentPortal.practice.toast.endedTitle': {
    en: 'Practice session ended',
    nl: 'Oefensessie beëindigd'
  },
  'studentPortal.practice.toast.endedDescription': {
    en: 'Great work! Your practice time has been recorded.',
    nl: 'Goed gedaan! Je oefentijd is opgeslagen.'
  },
  'studentPortal.practice.toast.startError': {
    en: 'Failed to start practice session',
    nl: 'Kon oefensessie niet starten'
  },
  'studentPortal.practice.toast.endError': {
    en: 'Failed to end practice session',
    nl: 'Kon oefensessie niet beëindigen'
  },

  // Student portal — Achievements page
  'studentPortal.achievements.title': {
    en: 'My Achievements',
    nl: 'Mijn prestaties'
  },
  'studentPortal.achievements.subtitle': {
    en: 'Track your musical journey and celebrate your progress',
    nl: 'Volg je muzikale reis en vier je voortgang'
  },
  'studentPortal.achievements.progressTitle': {
    en: 'Achievement Progress',
    nl: 'Prestatiesvoortgang'
  },
  'studentPortal.achievements.overallProgress': {
    en: 'Overall Progress',
    nl: 'Algehele voortgang'
  },
  'studentPortal.achievements.complete': {
    en: 'Complete',
    nl: 'Voltooid'
  },
  'studentPortal.achievements.earnedTitle': {
    en: 'Earned Achievements',
    nl: 'Behaalde prestaties'
  },
  'studentPortal.achievements.newBadge': {
    en: 'New!',
    nl: 'Nieuw!'
  },
  'studentPortal.achievements.earned': {
    en: 'Earned:',
    nl: 'Behaald:'
  },
  'studentPortal.achievements.completed': {
    en: 'Completed',
    nl: 'Voltooid'
  },
  'studentPortal.achievements.markSeen': {
    en: 'Mark as Seen',
    nl: 'Markeren als gezien'
  },
  'studentPortal.achievements.noneTitle': {
    en: 'No achievements yet',
    nl: 'Nog geen prestaties'
  },
  'studentPortal.achievements.noneDescription': {
    en: 'Keep practicing to earn your first achievement!',
    nl: 'Blijf oefenen om je eerste prestatie te behalen!'
  },
  'studentPortal.achievements.availableTitle': {
    en: 'Available Achievements',
    nl: 'Beschikbare prestaties'
  },
  'studentPortal.achievements.notEarned': {
    en: 'Not earned yet',
    nl: 'Nog niet behaald'
  },

  // Student portal — Lesson view page
  'studentPortal.lessonView.notFoundTitle': {
    en: 'Lesson Not Found',
    nl: 'Les niet gevonden'
  },
  'studentPortal.lessonView.goBack': {
    en: 'Go Back',
    nl: 'Terug'
  },

  // Student portal — Song view page
  'studentPortal.songView.notFoundTitle': {
    en: 'Song Not Found',
    nl: 'Nummer niet gevonden'
  },
  'studentPortal.songView.goBack': {
    en: 'Go Back',
    nl: 'Terug'
  },
  'studentPortal.songView.aboutTitle': {
    en: 'About This Song',
    nl: 'Over dit nummer'
  },
  'studentPortal.songView.noMaterials': {
    en: 'No practice materials yet',
    nl: 'Nog geen oefenmateriaal'
  },
  'studentPortal.songView.noMaterialsDescription': {
    en: 'Your teacher will add practice content for this song soon.',
    nl: 'Je docent voegt binnenkort oefeninhoud toe voor dit nummer.'
  },
  'studentPortal.songView.byArtist': {
    en: 'by',
    nl: 'door'
  },
  'studentPortal.songView.keyLabel': {
    en: 'Key:',
    nl: 'Toonaard:'
  },

  // Signup page — validation messages
  'signup.validation.invalidEmail': {
    en: 'Invalid email address',
    nl: 'Ongeldig e-mailadres'
  },
  'signup.validation.schoolNameRequired': {
    en: 'School name is required',
    nl: 'Schoolnaam is vereist'
  },
  'signup.validation.ownerNameRequired': {
    en: 'Your name is required',
    nl: 'Je naam is vereist'
  },
  'signup.validation.roleRequired': {
    en: 'Please select your role',
    nl: 'Selecteer je rol'
  },
  'signup.validation.instrumentsRequired': {
    en: 'Please specify your primary instruments',
    nl: 'Geef je primaire instrumenten op'
  },
  'signup.validation.capacityRequired': {
    en: 'Please estimate your student capacity',
    nl: 'Geef een schatting van je studentcapaciteit'
  },
  'signup.validation.teachingExperienceRequired': {
    en: 'Teaching experience is required',
    nl: 'Leservaring is vereist'
  },
  'signup.validation.bioTooLong': {
    en: 'Bio must be less than 500 characters',
    nl: 'Bio mag maximaal 500 tekens bevatten'
  },
  'signup.validation.passwordsMismatch': {
    en: "Passwords don't match",
    nl: 'Wachtwoorden komen niet overeen'
  },

  // Student Portal — My Lessons
  'studentPortal.myLessons.title': {
    en: 'My Lessons',
    nl: 'Mijn Lessen'
  },
  'studentPortal.myLessons.subtitle': {
    en: 'Access your assigned lessons and practice materials',
    nl: 'Bekijk je toegewezen lessen en oefenmateriaal'
  },
  'studentPortal.myLessons.liveUpdates': {
    en: 'Live updates',
    nl: 'Live updates'
  },
  'studentPortal.myLessons.offline': {
    en: 'Offline',
    nl: 'Offline'
  },
  'studentPortal.myLessons.allAvailableLessons': {
    en: 'All Available Lessons',
    nl: 'Alle Beschikbare Lessen'
  },
  'studentPortal.myLessons.allAvailableSongs': {
    en: 'All Available Songs',
    nl: 'Alle Beschikbare Nummers'
  },
  'studentPortal.myLessons.available': {
    en: 'Available',
    nl: 'Beschikbaar'
  },
  'studentPortal.myLessons.startLesson': {
    en: 'Start Lesson',
    nl: 'Les Starten'
  },
  'studentPortal.myLessons.practiceSong': {
    en: 'Practice Song',
    nl: 'Nummer Oefenen'
  },
  'studentPortal.myLessons.by': {
    en: 'by',
    nl: 'door'
  },
  'studentPortal.myLessons.assignedLessons': {
    en: 'Assigned Lessons',
    nl: 'Toegewezen Lessen'
  },
  'studentPortal.myLessons.lesson': {
    en: 'Lesson',
    nl: 'Les'
  },
  'studentPortal.myLessons.due': {
    en: 'Due:',
    nl: 'Deadline:'
  },
  'studentPortal.myLessons.teacherNotes': {
    en: "Teacher's Notes:",
    nl: 'Opmerkingen docent:'
  },
  'studentPortal.myLessons.startPractice': {
    en: 'Start Practice',
    nl: 'Oefening Starten'
  },
  'studentPortal.myLessons.noLessonsTitle': {
    en: 'No lessons assigned yet',
    nl: 'Nog geen lessen toegewezen'
  },
  'studentPortal.myLessons.noLessonsDesc': {
    en: 'Your teacher will assign lessons for you to practice.',
    nl: 'Je docent zal lessen voor je toewijzen om te oefenen.'
  },
  'studentPortal.myLessons.newLessonTitle': {
    en: 'New lesson available!',
    nl: 'Nieuwe les beschikbaar!'
  },
  'studentPortal.myLessons.newLessonDesc': {
    en: 'has been added by your teacher.',
    nl: 'is toegevoegd door je docent.'
  },
  'studentPortal.myLessons.lessonUpdatedTitle': {
    en: 'Lesson updated',
    nl: 'Les bijgewerkt'
  },
  'studentPortal.myLessons.lessonUpdatedDesc': {
    en: 'has been updated.',
    nl: 'is bijgewerkt.'
  },
  'studentPortal.myLessons.newSongTitle': {
    en: 'New song available!',
    nl: 'Nieuw nummer beschikbaar!'
  },
  'studentPortal.myLessons.newSongDesc': {
    en: 'has been added to practice.',
    nl: 'is toegevoegd om te oefenen.'
  },
  'studentPortal.myLessons.songUpdatedTitle': {
    en: 'Song updated',
    nl: 'Nummer bijgewerkt'
  },
  'studentPortal.myLessons.songUpdatedDesc': {
    en: 'has been updated.',
    nl: 'is bijgewerkt.'
  },

  // Student Portal — My Assignments
  'studentPortal.myAssignments.title': {
    en: 'My Assignments',
    nl: 'Mijn Opdrachten'
  },
  'studentPortal.myAssignments.subtitle': {
    en: 'Practice songs assigned by your teacher',
    nl: 'Oefen nummers die je docent heeft toegewezen'
  },
  'studentPortal.myAssignments.song': {
    en: 'Song',
    nl: 'Nummer'
  },
  'studentPortal.myAssignments.due': {
    en: 'Due:',
    nl: 'Deadline:'
  },
  'studentPortal.myAssignments.key': {
    en: 'Key:',
    nl: 'Toonsoort:'
  },
  'studentPortal.myAssignments.duration': {
    en: 'Duration:',
    nl: 'Duur:'
  },
  'studentPortal.myAssignments.practiceNotes': {
    en: 'Practice Notes:',
    nl: 'Oefennotities:'
  },
  'studentPortal.myAssignments.listen': {
    en: 'Listen',
    nl: 'Luisteren'
  },
  'studentPortal.myAssignments.practice': {
    en: 'Practice',
    nl: 'Oefenen'
  },
  'studentPortal.myAssignments.noAssignmentsTitle': {
    en: 'No song assignments yet',
    nl: 'Nog geen nummeropdrachten'
  },
  'studentPortal.myAssignments.noAssignmentsDesc': {
    en: 'Your teacher will assign songs for you to practice.',
    nl: 'Je docent zal nummers voor je toewijzen om te oefenen.'
  },

  // Student Portal — Ask Teacher
  'studentPortal.askTeacher.title': {
    en: 'Ask My Teacher',
    nl: 'Vraag aan Mijn Docent'
  },
  'studentPortal.askTeacher.subtitle': {
    en: 'Get help and feedback from your music teacher',
    nl: 'Krijg hulp en feedback van je muziekdocent'
  },
  'studentPortal.askTeacher.sendNewMessage': {
    en: 'Send a New Message',
    nl: 'Nieuw Bericht Sturen'
  },
  'studentPortal.askTeacher.sendMessagePrompt': {
    en: 'Have a question? Need help with your music? Send your teacher a message here.',
    nl: 'Heb je een vraag? Hulp nodig bij je muziek? Stuur je docent hier een bericht.'
  },
  'studentPortal.askTeacher.subject': {
    en: 'Subject',
    nl: 'Onderwerp'
  },
  'studentPortal.askTeacher.subjectPlaceholder': {
    en: "What's your question about?",
    nl: 'Waarover gaat je vraag?'
  },
  'studentPortal.askTeacher.message': {
    en: 'Message',
    nl: 'Bericht'
  },
  'studentPortal.askTeacher.messagePlaceholder': {
    en: 'Describe your question or ask for feedback...',
    nl: 'Beschrijf je vraag of vraag om feedback...'
  },
  'studentPortal.askTeacher.practiceVideo': {
    en: 'Practice Video (Optional)',
    nl: 'Oefenvideo (Optioneel)'
  },
  'studentPortal.askTeacher.hideCamera': {
    en: 'Hide Camera',
    nl: 'Camera Verbergen'
  },
  'studentPortal.askTeacher.recordVideo': {
    en: 'Record Video',
    nl: 'Video Opnemen'
  },
  'studentPortal.askTeacher.videoAttached': {
    en: 'Practice video attached',
    nl: 'Oefenvideo bijgevoegd'
  },
  'studentPortal.askTeacher.removeVideo': {
    en: 'Remove',
    nl: 'Verwijderen'
  },
  'studentPortal.askTeacher.sendWithVideo': {
    en: 'Send Message with Video',
    nl: 'Bericht met Video Sturen'
  },
  'studentPortal.askTeacher.sendMessage': {
    en: 'Send Message',
    nl: 'Bericht Sturen'
  },
  'studentPortal.askTeacher.messageHistory': {
    en: 'Message History',
    nl: 'Berichtgeschiedenis'
  },
  'studentPortal.askTeacher.newResponse': {
    en: 'New Response',
    nl: 'Nieuw Antwoord'
  },
  'studentPortal.askTeacher.you': {
    en: 'You',
    nl: 'Jij'
  },
  'studentPortal.askTeacher.videoBrowserUnsupported': {
    en: 'Your browser does not support video playback.',
    nl: 'Je browser ondersteunt geen video afspelen.'
  },
  'studentPortal.askTeacher.practiceVideoLabel': {
    en: 'Practice video',
    nl: 'Oefenvideo'
  },
  'studentPortal.askTeacher.yourTeacher': {
    en: 'Your Teacher',
    nl: 'Jouw Docent'
  },
  'studentPortal.askTeacher.waitingForResponse': {
    en: 'Waiting for response',
    nl: 'Wachten op antwoord'
  },
  'studentPortal.askTeacher.teacherWillRespond': {
    en: 'Your teacher will respond soon.',
    nl: 'Je docent zal snel antwoorden.'
  },
  'studentPortal.askTeacher.continueConversation': {
    en: 'Continue the conversation',
    nl: 'Gesprek voortzetten'
  },
  'studentPortal.askTeacher.replyPlaceholder': {
    en: 'Type your reply...',
    nl: 'Typ je antwoord...'
  },
  'studentPortal.askTeacher.sendReply': {
    en: 'Send Reply',
    nl: 'Antwoord Sturen'
  },
  'studentPortal.askTeacher.cancel': {
    en: 'Cancel',
    nl: 'Annuleren'
  },
  'studentPortal.askTeacher.reply': {
    en: 'Reply',
    nl: 'Antwoorden'
  },
  'studentPortal.askTeacher.noMessagesTitle': {
    en: 'No messages yet',
    nl: 'Nog geen berichten'
  },
  'studentPortal.askTeacher.noMessagesDesc': {
    en: 'Send your first message to get help from your teacher.',
    nl: 'Stuur je eerste bericht om hulp te krijgen van je docent.'
  },
  'studentPortal.askTeacher.messageSentTitle': {
    en: 'Message sent',
    nl: 'Bericht verstuurd'
  },
  'studentPortal.askTeacher.messageSentDesc': {
    en: 'Your teacher will respond soon.',
    nl: 'Je docent zal snel antwoorden.'
  },
  'studentPortal.askTeacher.errorTitle': {
    en: 'Error',
    nl: 'Fout'
  },
  'studentPortal.askTeacher.sendError': {
    en: 'Failed to send message. Please try again.',
    nl: 'Bericht sturen mislukt. Probeer het opnieuw.'
  },
  'studentPortal.askTeacher.replySentTitle': {
    en: 'Reply sent',
    nl: 'Antwoord verstuurd'
  },
  'studentPortal.askTeacher.replySentDesc': {
    en: 'Your teacher will see your response.',
    nl: 'Je docent zal je antwoord zien.'
  },
  'studentPortal.askTeacher.replyError': {
    en: 'Failed to send reply. Please try again.',
    nl: 'Antwoord sturen mislukt. Probeer het opnieuw.'
  },
  'studentPortal.askTeacher.missingInfoTitle': {
    en: 'Missing information',
    nl: 'Ontbrekende informatie'
  },
  'studentPortal.askTeacher.missingInfoDesc': {
    en: 'Please fill in both subject and message.',
    nl: 'Vul zowel onderwerp als bericht in.'
  },
  'studentPortal.askTeacher.missingReplyTitle': {
    en: 'Missing reply',
    nl: 'Antwoord ontbreekt'
  },
  'studentPortal.askTeacher.missingReplyDesc': {
    en: 'Please enter your reply before sending.',
    nl: 'Voer je antwoord in voordat je het verstuurt.'
  },

  // Student Portal — My Schedule
  'studentPortal.mySchedule.title': {
    en: 'My Schedule',
    nl: 'Mijn Rooster'
  },
  'studentPortal.mySchedule.subtitle': {
    en: 'View your upcoming lessons and practice sessions',
    nl: 'Bekijk je komende lessen en oefensessies'
  },
  'studentPortal.mySchedule.upcomingLessons': {
    en: 'Upcoming Lessons',
    nl: 'Komende Lessen'
  },
  'studentPortal.mySchedule.regularSchedule': {
    en: 'Regular Schedule',
    nl: 'Regulier Rooster'
  },
  'studentPortal.mySchedule.thisWeek': {
    en: 'This Week',
    nl: 'Deze Week'
  },
  'studentPortal.mySchedule.noUpcomingLessons': {
    en: 'No upcoming lessons scheduled',
    nl: 'Geen komende lessen gepland'
  },
  'studentPortal.mySchedule.noRegularSchedule': {
    en: 'No regular schedule set',
    nl: 'Geen regulier rooster ingesteld'
  },
  'studentPortal.mySchedule.cancelLesson': {
    en: 'Cancel Lesson',
    nl: 'Les Annuleren'
  },
  'studentPortal.mySchedule.cancelConfirmTitle': {
    en: 'Cancel Lesson',
    nl: 'Les Annuleren'
  },
  'studentPortal.mySchedule.cancelConfirmDesc': {
    en: 'Your teacher will be automatically notified of this cancellation.',
    nl: 'Je docent wordt automatisch op de hoogte gesteld van deze annulering.'
  },
  'studentPortal.mySchedule.keepLesson': {
    en: 'Keep Lesson',
    nl: 'Les Behouden'
  },
  'studentPortal.mySchedule.cancelling': {
    en: 'Cancelling...',
    nl: 'Annuleren...'
  },
  'studentPortal.mySchedule.lessonCancelledTitle': {
    en: 'Lesson cancelled',
    nl: 'Les geannuleerd'
  },
  'studentPortal.mySchedule.lessonCancelledDesc': {
    en: 'Your lesson has been cancelled and your teacher has been notified.',
    nl: 'Je les is geannuleerd en je docent is op de hoogte gesteld.'
  },
  'studentPortal.mySchedule.cancelFailedTitle': {
    en: 'Failed to cancel lesson',
    nl: 'Les annuleren mislukt'
  },

  // Settings page
  'settings.subtitle': {
    en: 'Manage your account, school, and system preferences',
    nl: 'Beheer je account, school en systeemvoorkeuren'
  },
  'settings.tab.profile': {
    en: 'Profile',
    nl: 'Profiel'
  },
  'settings.tab.school': {
    en: 'School',
    nl: 'School'
  },
  'settings.tab.notifications': {
    en: 'Notifications',
    nl: 'Meldingen'
  },
  'settings.tab.preferences': {
    en: 'Preferences',
    nl: 'Voorkeuren'
  },
  'settings.tab.security': {
    en: 'Security',
    nl: 'Beveiliging'
  },
  'settings.tab.studios': {
    en: "Studio's",
    nl: "Studio's"
  },
  'settings.tab.vacations': {
    en: 'Vacations',
    nl: 'Vakanties'
  },
  'settings.tab.integrations': {
    en: 'Integrations',
    nl: 'Integraties'
  },

  // Settings — Profile tab
  'settings.profile.title': {
    en: 'Personal Information',
    nl: 'Persoonlijke gegevens'
  },
  'settings.profile.fullName': {
    en: 'Full Name',
    nl: 'Volledige naam'
  },
  'settings.profile.emailAddress': {
    en: 'Email Address',
    nl: 'E-mailadres'
  },
  'settings.profile.instruments': {
    en: 'Instruments',
    nl: 'Instrumenten'
  },
  'settings.profile.instrumentsPlaceholder': {
    en: 'e.g., Piano, Guitar, Violin',
    nl: 'bijv. Piano, Gitaar, Viool'
  },
  'settings.profile.instrumentsDescription': {
    en: 'List the instruments you teach or play',
    nl: 'Geef een lijst van de instrumenten die je geeft of speelt'
  },
  'settings.profile.bio': {
    en: 'Bio',
    nl: 'Bio'
  },
  'settings.profile.bioPlaceholder': {
    en: 'Tell us about yourself...',
    nl: 'Vertel ons iets over jezelf...'
  },
  'settings.profile.saveProfile': {
    en: 'Save Profile',
    nl: 'Profiel opslaan'
  },
  'settings.profile.saving': {
    en: 'Saving...',
    nl: 'Opslaan...'
  },
  'settings.profile.updated': {
    en: 'Profile updated',
    nl: 'Profiel bijgewerkt'
  },
  'settings.profile.updatedDescription': {
    en: 'Your profile has been successfully updated.',
    nl: 'Je profiel is succesvol bijgewerkt.'
  },

  // Settings — School tab
  'settings.school.title': {
    en: 'School Information',
    nl: 'Schoolinformatie'
  },
  'settings.school.name': {
    en: 'School Name',
    nl: 'Schoolnaam'
  },
  'settings.school.address': {
    en: 'Address',
    nl: 'Adres'
  },
  'settings.school.city': {
    en: 'City',
    nl: 'Stad'
  },
  'settings.school.phone': {
    en: 'Phone Number',
    nl: 'Telefoonnummer'
  },
  'settings.school.website': {
    en: 'Website',
    nl: 'Website'
  },
  'settings.school.websitePlaceholder': {
    en: 'https://...',
    nl: 'https://...'
  },
  'settings.school.instruments': {
    en: 'Available Instruments',
    nl: 'Beschikbare instrumenten'
  },
  'settings.school.instrumentsPlaceholder': {
    en: 'e.g., Piano, Guitar, Violin, Drums',
    nl: 'bijv. Piano, Gitaar, Viool, Drums'
  },
  'settings.school.instrumentsDescription': {
    en: 'List all instruments taught at your school',
    nl: 'Geef alle instrumenten op die op je school worden gegeven'
  },
  'settings.school.description': {
    en: 'School Description',
    nl: 'Schoolomschrijving'
  },
  'settings.school.descriptionPlaceholder': {
    en: 'Describe your music school...',
    nl: 'Beschrijf je muziekschool...'
  },
  'settings.school.save': {
    en: 'Save School Settings',
    nl: 'Schoolinstellingen opslaan'
  },
  'settings.school.saving': {
    en: 'Saving...',
    nl: 'Opslaan...'
  },
  'settings.school.updated': {
    en: 'School settings updated',
    nl: 'Schoolinstellingen bijgewerkt'
  },
  'settings.school.updatedDescription': {
    en: 'School information has been successfully updated.',
    nl: 'Schoolinformatie is succesvol bijgewerkt.'
  },

  // Settings — Notifications tab
  'settings.notifications.title': {
    en: 'Notification Preferences',
    nl: 'Meldingsvoorkeuren'
  },
  'settings.notifications.email': {
    en: 'Email Notifications',
    nl: 'E-mailmeldingen'
  },
  'settings.notifications.emailDescription': {
    en: 'Receive notifications via email',
    nl: 'Ontvang meldingen via e-mail'
  },
  'settings.notifications.lessonReminders': {
    en: 'Lesson Reminders',
    nl: 'Lesherinneringen'
  },
  'settings.notifications.lessonRemindersDescription': {
    en: 'Get reminded about upcoming lessons',
    nl: 'Ontvang herinneringen over aankomende lessen'
  },
  'settings.notifications.assignmentDeadlines': {
    en: 'Assignment Deadlines',
    nl: 'Opdracht deadlines'
  },
  'settings.notifications.assignmentDeadlinesDescription': {
    en: 'Be notified when assignments are due',
    nl: 'Ontvang een melding wanneer opdrachten moeten worden ingeleverd'
  },
  'settings.notifications.achievementAlerts': {
    en: 'Achievement Alerts',
    nl: 'Prestatieberichten'
  },
  'settings.notifications.achievementAlertsDescription': {
    en: 'Get notified when students earn achievements',
    nl: 'Ontvang een melding wanneer studenten prestaties behalen'
  },
  'settings.notifications.weeklyReports': {
    en: 'Weekly Reports',
    nl: 'Wekelijkse rapporten'
  },
  'settings.notifications.weeklyReportsDescription': {
    en: 'Receive weekly progress reports',
    nl: 'Ontvang wekelijkse voortgangsrapporten'
  },
  'settings.notifications.save': {
    en: 'Save Notification Settings',
    nl: 'Meldingsinstellingen opslaan'
  },
  'settings.notifications.saving': {
    en: 'Saving...',
    nl: 'Opslaan...'
  },
  'settings.notifications.updated': {
    en: 'Notification preferences updated',
    nl: 'Meldingsvoorkeuren bijgewerkt'
  },
  'settings.notifications.updatedDescription': {
    en: 'Your notification settings have been saved.',
    nl: 'Je meldingsinstellingen zijn opgeslagen.'
  },

  // Settings — Preferences tab
  'settings.preferences.title': {
    en: 'System Preferences',
    nl: 'Systeemvoorkeuren'
  },
  'settings.preferences.theme': {
    en: 'Theme',
    nl: 'Thema'
  },
  'settings.preferences.themeLight': {
    en: 'Light',
    nl: 'Licht'
  },
  'settings.preferences.themeDark': {
    en: 'Dark',
    nl: 'Donker'
  },
  'settings.preferences.themeSystem': {
    en: 'System',
    nl: 'Systeem'
  },
  'settings.preferences.language': {
    en: 'Language',
    nl: 'Taal'
  },
  'settings.preferences.langEnglish': {
    en: 'English',
    nl: 'Engels'
  },
  'settings.preferences.langSpanish': {
    en: 'Spanish',
    nl: 'Spaans'
  },
  'settings.preferences.langFrench': {
    en: 'French',
    nl: 'Frans'
  },
  'settings.preferences.langGerman': {
    en: 'German',
    nl: 'Duits'
  },
  'settings.preferences.dateFormat': {
    en: 'Date Format',
    nl: 'Datumnotatie'
  },
  'settings.preferences.defaultView': {
    en: 'Default View',
    nl: 'Standaardweergave'
  },
  'settings.preferences.viewDashboard': {
    en: 'Dashboard',
    nl: 'Dashboard'
  },
  'settings.preferences.viewStudents': {
    en: 'Students',
    nl: 'Studenten'
  },
  'settings.preferences.viewLessons': {
    en: 'Lessons',
    nl: 'Lessen'
  },
  'settings.preferences.viewSchedule': {
    en: 'Schedule',
    nl: 'Rooster'
  },
  'settings.preferences.save': {
    en: 'Save Preferences',
    nl: 'Voorkeuren opslaan'
  },
  'settings.preferences.saving': {
    en: 'Saving...',
    nl: 'Opslaan...'
  },
  'settings.preferences.updated': {
    en: 'Preferences updated',
    nl: 'Voorkeuren bijgewerkt'
  },
  'settings.preferences.updatedDescription': {
    en: 'Your system preferences have been saved.',
    nl: 'Je systeemvoorkeuren zijn opgeslagen.'
  },

  // Settings — Security tab
  'settings.security.title': {
    en: 'Security Settings',
    nl: 'Beveiligingsinstellingen'
  },
  'settings.security.changePassword': {
    en: 'Change Password',
    nl: 'Wachtwoord wijzigen'
  },
  'settings.security.changePasswordSubtitle': {
    en: 'Update your account password',
    nl: 'Werk je accountwachtwoord bij'
  },
  'settings.security.cancel': {
    en: 'Cancel',
    nl: 'Annuleren'
  },
  'settings.security.changePasswordBtn': {
    en: 'Change Password',
    nl: 'Wachtwoord wijzigen'
  },
  'settings.security.currentPassword': {
    en: 'Current Password',
    nl: 'Huidig wachtwoord'
  },
  'settings.security.newPassword': {
    en: 'New Password',
    nl: 'Nieuw wachtwoord'
  },
  'settings.security.newPasswordPlaceholder': {
    en: 'Use 8+ characters with upper/lowercase, a number, and a symbol',
    nl: 'Gebruik 8+ tekens met hoofd-/kleine letters, een cijfer en een symbool'
  },
  'settings.security.confirmPassword': {
    en: 'Confirm New Password',
    nl: 'Nieuw wachtwoord bevestigen'
  },
  'settings.security.updatePassword': {
    en: 'Update Password',
    nl: 'Wachtwoord bijwerken'
  },
  'settings.security.updatingPassword': {
    en: 'Changing...',
    nl: 'Wijzigen...'
  },
  'settings.security.passwordChanged': {
    en: 'Password changed',
    nl: 'Wachtwoord gewijzigd'
  },
  'settings.security.passwordChangedDescription': {
    en: 'Your password has been successfully updated.',
    nl: 'Je wachtwoord is succesvol bijgewerkt.'
  },
  'settings.security.passwordChangeFailed': {
    en: 'Failed to change password',
    nl: 'Wachtwoord wijzigen mislukt'
  },
  'settings.security.passwordMismatch': {
    en: 'Password mismatch',
    nl: 'Wachtwoorden komen niet overeen'
  },
  'settings.security.passwordMismatchDescription': {
    en: 'New password and confirmation do not match.',
    nl: 'Het nieuwe wachtwoord en de bevestiging komen niet overeen.'
  },
  'settings.security.weakPassword': {
    en: 'Weak password',
    nl: 'Zwak wachtwoord'
  },
  'settings.security.accountInfo': {
    en: 'Account Information',
    nl: 'Accountinformatie'
  },
  'settings.security.role': {
    en: 'Role',
    nl: 'Rol'
  },
  'settings.security.accountStatus': {
    en: 'Account Status',
    nl: 'Accountstatus'
  },
  'settings.security.accountActive': {
    en: 'Active',
    nl: 'Actief'
  },
  'settings.security.memberSince': {
    en: 'Member Since',
    nl: 'Lid sinds'
  },
  'settings.security.lastLogin': {
    en: 'Last Login',
    nl: 'Laatste login'
  },
  'settings.security.lastLoginValue': {
    en: 'Today',
    nl: 'Vandaag'
  },

  // Settings — Studios tab
  'settings.studios.title': {
    en: "Studio's & Rooms",
    nl: "Studio's & Lokalen"
  },
  'settings.studios.loading': {
    en: 'Loading...',
    nl: 'Laden…'
  },
  'settings.studios.empty': {
    en: "No studio's added yet.",
    nl: "Nog geen studio's toegevoegd."
  },
  'settings.studios.addNew': {
    en: 'Add new studio',
    nl: 'Nieuwe studio toevoegen'
  },
  'settings.studios.namePlaceholder': {
    en: 'Name (e.g. Studio 11)',
    nl: 'Naam (bijv. Studio 11)'
  },
  'settings.studios.locationPlaceholder': {
    en: 'Location (optional)',
    nl: 'Locatie (optioneel)'
  },
  'settings.studios.addButton': {
    en: 'Add',
    nl: 'Toevoegen'
  },
  'settings.studios.created': {
    en: 'Studio created',
    nl: 'Studio aangemaakt'
  },
  'settings.studios.deleted': {
    en: 'Studio deleted',
    nl: 'Studio verwijderd'
  },
  'settings.studios.error': {
    en: 'Error',
    nl: 'Fout'
  },

  // Settings — Vacations tab
  'settings.vacations.title': {
    en: 'Vacations & Days Off',
    nl: 'Vakanties & Vrije dagen'
  },
  'settings.vacations.subtitle': {
    en: 'Vacation periods are automatically excluded from the schedule — no lessons will be planned on those days.',
    nl: 'Vakantieperiodes worden automatisch uitgesloten in de agenda — er worden geen lessen gepland op die dagen.'
  },
  'settings.vacations.loading': {
    en: 'Loading...',
    nl: 'Laden…'
  },
  'settings.vacations.empty': {
    en: 'No vacations configured yet.',
    nl: 'Nog geen vakanties ingesteld.'
  },
  'settings.vacations.blackout': {
    en: '(day off)',
    nl: '(vrije dag)'
  },
  'settings.vacations.addNew': {
    en: 'Add new vacation period',
    nl: 'Nieuwe vakantieperiode toevoegen'
  },
  'settings.vacations.namePlaceholder': {
    en: 'Name (e.g. Spring break)',
    nl: 'Naam (bijv. Meivakantie)'
  },
  'settings.vacations.addButton': {
    en: 'Add vacation',
    nl: 'Vakantie toevoegen'
  },
  'settings.vacations.saved': {
    en: 'Vacation saved',
    nl: 'Vakantie opgeslagen'
  },
  'settings.vacations.deleted': {
    en: 'Vacation deleted',
    nl: 'Vakantie verwijderd'
  },
  'settings.vacations.error': {
    en: 'Error',
    nl: 'Fout'
  },

  // Billing page
  'billing.title': {
    en: 'Billing & Subscription',
    nl: 'Facturering & Abonnement'
  },
  'billing.subtitle': {
    en: 'Manage your MusicDott subscription and billing preferences',
    nl: 'Beheer je MusicDott-abonnement en factuurinstellingen'
  },
  'billing.trialRemaining': {
    en: 'days remaining in your free trial',
    nl: 'dagen resterend in je gratis proefperiode'
  },
  'billing.currentPlan': {
    en: 'Current Plan',
    nl: 'Huidig abonnement'
  },
  'billing.noPlan': {
    en: 'No Plan',
    nl: 'Geen abonnement'
  },
  'billing.monthlyCost': {
    en: 'Monthly Cost',
    nl: 'Maandelijkse kosten'
  },
  'billing.basedOnUsage': {
    en: 'Based on current usage',
    nl: 'Gebaseerd op huidig gebruik'
  },
  'billing.licenseUsage': {
    en: 'License Usage',
    nl: 'Licentiegebruik'
  },
  'billing.teachers': {
    en: 'Teachers:',
    nl: 'Docenten:'
  },
  'billing.students': {
    en: 'Students:',
    nl: 'Studenten:'
  },
  'billing.tab.overview': {
    en: 'Overview',
    nl: 'Overzicht'
  },
  'billing.tab.plans': {
    en: 'Plans',
    nl: 'Abonnementen'
  },
  'billing.tab.history': {
    en: 'Payment History',
    nl: 'Betalingsgeschiedenis'
  },
  'billing.overview.pricingTitle': {
    en: 'Current Month Pricing',
    nl: 'Facturering huidige maand'
  },
  'billing.overview.pricingDescription': {
    en: 'Your billing is automatically calculated based on actual usage',
    nl: 'Je factuur wordt automatisch berekend op basis van het werkelijke gebruik'
  },
  'billing.overview.unlimitedTeachers': {
    en: 'Unlimited teachers',
    nl: 'Onbeperkt docenten'
  },
  'billing.overview.teachers': {
    en: 'teachers',
    nl: 'docenten'
  },
  'billing.overview.studentsLabel': {
    en: 'students',
    nl: 'studenten'
  },
  'billing.overview.totalMonthly': {
    en: 'Total Monthly',
    nl: 'Totaal per maand'
  },
  'billing.overview.studentLimitWarning': {
    en: "You're at your student license limit. Consider adding extra licenses or upgrading your plan.",
    nl: 'Je hebt je studentlicentielimiet bereikt. Overweeg extra licenties toe te voegen of je abonnement te upgraden.'
  },
  'billing.overview.teacherLimitWarning': {
    en: "You've exceeded your teacher license limit. We've automatically upgraded you to the Pro plan.",
    nl: 'Je hebt je docentlicentielimiet overschreden. We hebben je automatisch geüpgraded naar het Pro-abonnement.'
  },
  'billing.plans.currentPlanBadge': {
    en: 'Current Plan',
    nl: 'Huidig abonnement'
  },
  'billing.plans.perMonth': {
    en: 'per month',
    nl: 'per maand'
  },
  'billing.plans.switchTo': {
    en: 'Switch to this plan',
    nl: 'Overstappen naar dit abonnement'
  },
  'billing.plans.updating': {
    en: 'Updating...',
    nl: 'Bijwerken...'
  },
  'billing.plans.extraLicensesTitle': {
    en: 'Extra Student Licenses',
    nl: 'Extra studentlicenties'
  },
  'billing.plans.extraLicensesDescription': {
    en: "Add more student licenses beyond your plan's limit at €4.50 per 5 students per month",
    nl: 'Voeg extra studentlicenties toe boven de limiet van je abonnement voor €4,50 per 5 studenten per maand'
  },
  'billing.plans.add5Licenses': {
    en: 'Add 5 licenses (+€4.50/month)',
    nl: '5 licenties toevoegen (+€4,50/maand)'
  },
  'billing.plans.add10Licenses': {
    en: 'Add 10 licenses (+€9.00/month)',
    nl: '10 licenties toevoegen (+€9,00/maand)'
  },
  'billing.history.title': {
    en: 'Payment History',
    nl: 'Betalingsgeschiedenis'
  },
  'billing.history.description': {
    en: 'Your recent billing and payment records',
    nl: 'Je recente factuur- en betalingsoverzicht'
  },
  'billing.history.colDate': {
    en: 'Date',
    nl: 'Datum'
  },
  'billing.history.colDescription': {
    en: 'Description',
    nl: 'Omschrijving'
  },
  'billing.history.colAmount': {
    en: 'Amount',
    nl: 'Bedrag'
  },
  'billing.history.colStatus': {
    en: 'Status',
    nl: 'Status'
  },
  'billing.history.empty': {
    en: 'No payment history available yet',
    nl: 'Nog geen betalingsgeschiedenis beschikbaar'
  },
  'billing.status.trialActive': {
    en: 'Trial Active',
    nl: 'Proefperiode actief'
  },
  'billing.status.active': {
    en: 'Active',
    nl: 'Actief'
  },
  'billing.status.pastDue': {
    en: 'Past Due',
    nl: 'Achterstallig'
  },
  'billing.status.canceled': {
    en: 'Canceled',
    nl: 'Geannuleerd'
  },
  'billing.toast.planUpdated': {
    en: 'Plan Updated',
    nl: 'Abonnement bijgewerkt'
  },
  'billing.toast.planUpdatedDescription': {
    en: 'Your subscription plan has been updated successfully.',
    nl: 'Je abonnement is succesvol bijgewerkt.'
  },
  'billing.toast.planUpdateFailed': {
    en: 'Update Failed',
    nl: 'Bijwerken mislukt'
  },
  'billing.toast.planUpdateFailedDescription': {
    en: 'Failed to update subscription plan. Please try again.',
    nl: 'Het bijwerken van het abonnement is mislukt. Probeer het opnieuw.'
  },
  'billing.toast.licensesAdded': {
    en: 'Licenses Added',
    nl: 'Licenties toegevoegd'
  },
  'billing.toast.licensesAddedDescription': {
    en: 'Extra student licenses have been added to your subscription.',
    nl: 'Extra studentlicenties zijn aan je abonnement toegevoegd.'
  },
  'billing.toast.licensesAddFailed': {
    en: 'Failed to Add Licenses',
    nl: 'Licenties toevoegen mislukt'
  },
  'billing.toast.licensesAddFailedDescription': {
    en: 'Could not add extra licenses. Please try again.',
    nl: 'Kon geen extra licenties toevoegen. Probeer het opnieuw.'
  },

  // Reports page
  'reports.title': {
    en: 'Reports & Analytics',
    nl: 'Rapporten & Analyses'
  },
  'reports.subtitle': {
    en: 'Track student progress and school performance',
    nl: 'Volg de voortgang van studenten en de schoolprestaties'
  },
  'reports.loading': {
    en: 'Loading reports...',
    nl: 'Rapporten laden...'
  },
  'reports.exportCsv': {
    en: 'Export CSV',
    nl: 'CSV exporteren'
  },
  'reports.dateRange.last7': {
    en: 'Last 7 days',
    nl: 'Afgelopen 7 dagen'
  },
  'reports.dateRange.last30': {
    en: 'Last 30 days',
    nl: 'Afgelopen 30 dagen'
  },
  'reports.dateRange.last3months': {
    en: 'Last 3 months',
    nl: 'Afgelopen 3 maanden'
  },
  'reports.dateRange.lastYear': {
    en: 'Last year',
    nl: 'Afgelopen jaar'
  },
  'reports.type.overview': {
    en: 'Overview',
    nl: 'Overzicht'
  },
  'reports.type.students': {
    en: 'Student Progress',
    nl: 'Studentvoortgang'
  },
  'reports.type.lessons': {
    en: 'Lesson Analytics',
    nl: 'Lesanalyses'
  },
  'reports.type.assignments': {
    en: 'Assignments',
    nl: 'Opdrachten'
  },
  'reports.metric.totalStudents': {
    en: 'Total Students',
    nl: 'Totaal studenten'
  },
  'reports.metric.totalStudentsTrend': {
    en: '+12% from last month',
    nl: '+12% ten opzichte van vorige maand'
  },
  'reports.metric.activeLessons': {
    en: 'Active Lessons',
    nl: 'Actieve lessen'
  },
  'reports.metric.activeLessonsTrend': {
    en: '+8% from last month',
    nl: '+8% ten opzichte van vorige maand'
  },
  'reports.metric.completedAssignments': {
    en: 'Completed Assignments',
    nl: 'Voltooide opdrachten'
  },
  'reports.metric.completedAssignmentsTrend': {
    en: '+15% from last month',
    nl: '+15% ten opzichte van vorige maand'
  },
  'reports.metric.upcomingSessions': {
    en: 'Upcoming Sessions',
    nl: 'Aankomende sessies'
  },
  'reports.metric.upcomingSessionsPeriod': {
    en: 'Next 7 days',
    nl: 'Komende 7 dagen'
  },
  'reports.studentProgress.title': {
    en: 'Student Progress Overview',
    nl: 'Overzicht studentvoortgang'
  },
  'reports.studentProgress.colStudent': {
    en: 'Student Name',
    nl: 'Studentnaam'
  },
  'reports.studentProgress.colCompletedLessons': {
    en: 'Completed Lessons',
    nl: 'Voltooide lessen'
  },
  'reports.studentProgress.colAssignments': {
    en: 'Assignments',
    nl: 'Opdrachten'
  },
  'reports.studentProgress.colXp': {
    en: 'XP Earned',
    nl: 'XP verdiend'
  },
  'reports.studentProgress.colLastActivity': {
    en: 'Last Activity',
    nl: 'Laatste activiteit'
  },
  'reports.studentProgress.colProgress': {
    en: 'Progress',
    nl: 'Voortgang'
  },
  'reports.studentProgress.never': {
    en: 'Never',
    nl: 'Nooit'
  },
  'reports.studentProgress.empty': {
    en: 'No student data available for the selected period',
    nl: 'Geen studentgegevens beschikbaar voor de geselecteerde periode'
  },
  'reports.popularLessons.title': {
    en: 'Popular Lessons',
    nl: 'Populaire lessen'
  },
  'reports.popularLessons.completions': {
    en: 'completions',
    nl: 'voltooiingen'
  },
  'reports.popularLessons.empty': {
    en: 'No lesson data available',
    nl: 'Geen lesgegevens beschikbaar'
  },
  'reports.upcomingDeadlines.title': {
    en: 'Upcoming Deadlines',
    nl: 'Aankomende deadlines'
  },
  'reports.upcomingDeadlines.due': {
    en: 'Due:',
    nl: 'Deadline:'
  },
  'reports.upcomingDeadlines.statusPending': {
    en: 'pending',
    nl: 'in behandeling'
  },
  'reports.upcomingDeadlines.statusOverdue': {
    en: 'overdue',
    nl: 'te laat'
  },
  'reports.upcomingDeadlines.empty': {
    en: 'No upcoming deadlines',
    nl: 'Geen aankomende deadlines'
  },

  // Teachers page
  'teachers.title': {
    en: 'Teachers',
    nl: 'Docenten'
  },
  'teachers.subtitle': {
    en: 'Manage the teachers in your music school',
    nl: 'Beheer de docenten van je muziekschool'
  },
  'teachers.addTeacher': {
    en: 'Add Teacher',
    nl: 'Docent Toevoegen'
  },
  'teachers.searchPlaceholder': {
    en: 'Search teachers...',
    nl: 'Docenten zoeken...'
  },
  'teachers.loading': {
    en: 'Loading teachers...',
    nl: 'Docenten laden...'
  },
  'teachers.noTeachersFound': {
    en: 'No teachers found',
    nl: 'Geen docenten gevonden'
  },
  'teachers.noTeachersSearch': {
    en: 'No teachers match your search criteria.',
    nl: 'Geen docenten komen overeen met je zoekopdracht.'
  },
  'teachers.noTeachersEmpty': {
    en: 'Get started by adding your first teacher.',
    nl: 'Begin door je eerste docent toe te voegen.'
  },
  'teachers.roleBadge': {
    en: 'Teacher',
    nl: 'Docent'
  },
  'teachers.dialog.addTitle': {
    en: 'Add New Teacher',
    nl: 'Nieuwe Docent Toevoegen'
  },
  'teachers.dialog.addDescription': {
    en: 'Create a new teacher account for your music school.',
    nl: 'Maak een nieuw docentaccount aan voor je muziekschool.'
  },
  'teachers.dialog.editTitle': {
    en: 'Edit Teacher',
    nl: 'Docent Bewerken'
  },
  'teachers.dialog.editDescription': {
    en: "Update the teacher's information.",
    nl: 'Werk de informatie van de docent bij.'
  },
  'teachers.dialog.deleteTitle': {
    en: 'Delete Teacher',
    nl: 'Docent Verwijderen'
  },
  'teachers.dialog.deleteDescription': {
    en: 'Are you sure you want to delete {name}? This action cannot be undone. Students assigned to this teacher will need to be reassigned.',
    nl: 'Weet je zeker dat je {name} wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt. Studenten die aan deze docent zijn gekoppeld moeten opnieuw worden toegewezen.'
  },
  'teachers.form.fullName': {
    en: 'Full Name',
    nl: 'Volledige naam'
  },
  'teachers.form.email': {
    en: 'Email',
    nl: 'E-mail'
  },
  'teachers.form.username': {
    en: 'Username',
    nl: 'Gebruikersnaam'
  },
  'teachers.form.password': {
    en: 'Password',
    nl: 'Wachtwoord'
  },
  'teachers.form.instruments': {
    en: 'Instruments',
    nl: 'Instrumenten'
  },
  'teachers.form.instrumentsPlaceholder': {
    en: 'Piano, Guitar, Drums',
    nl: 'Piano, Gitaar, Drums'
  },
  'teachers.form.instrumentsDescription': {
    en: 'List the instruments this teacher specializes in',
    nl: 'Geef de instrumenten op waarin deze docent is gespecialiseerd'
  },
  'teachers.form.bio': {
    en: 'Bio',
    nl: 'Bio'
  },
  'teachers.form.bioPlaceholder': {
    en: "Brief description of the teacher's background and experience...",
    nl: 'Korte beschrijving van de achtergrond en ervaring van de docent...'
  },
  'teachers.form.cancel': {
    en: 'Cancel',
    nl: 'Annuleren'
  },
  'teachers.form.creating': {
    en: 'Creating...',
    nl: 'Aanmaken...'
  },
  'teachers.form.createButton': {
    en: 'Create Teacher',
    nl: 'Docent Aanmaken'
  },
  'teachers.form.saving': {
    en: 'Saving...',
    nl: 'Opslaan...'
  },
  'teachers.form.saveChanges': {
    en: 'Save Changes',
    nl: 'Wijzigingen Opslaan'
  },
  'teachers.form.deleting': {
    en: 'Deleting...',
    nl: 'Verwijderen...'
  },
  'teachers.form.deleteButton': {
    en: 'Delete',
    nl: 'Verwijderen'
  },
  'teachers.toast.created': {
    en: 'Teacher created',
    nl: 'Docent aangemaakt'
  },
  'teachers.toast.createdDescription': {
    en: 'The teacher account has been created successfully.',
    nl: 'Het docentaccount is succesvol aangemaakt.'
  },
  'teachers.toast.createFailed': {
    en: 'Failed to create teacher',
    nl: 'Docent aanmaken mislukt'
  },
  'teachers.toast.updated': {
    en: 'Teacher updated',
    nl: 'Docent bijgewerkt'
  },
  'teachers.toast.updatedDescription': {
    en: 'The teacher information has been updated successfully.',
    nl: 'De docentinformatie is succesvol bijgewerkt.'
  },
  'teachers.toast.updateFailed': {
    en: 'Failed to update teacher',
    nl: 'Docent bijwerken mislukt'
  },
  'teachers.toast.deleted': {
    en: 'Teacher deleted',
    nl: 'Docent verwijderd'
  },
  'teachers.toast.deletedDescription': {
    en: 'The teacher has been removed from your school.',
    nl: 'De docent is verwijderd uit je school.'
  },
  'teachers.toast.deleteFailed': {
    en: 'Failed to delete teacher',
    nl: 'Docent verwijderen mislukt'
  },

  // School Members page
  'schoolMembers.title': {
    en: 'School Members',
    nl: 'Schoolleden'
  },
  'schoolMembers.subtitle': {
    en: 'Manage teachers and staff for {school}',
    nl: 'Beheer docenten en medewerkers voor {school}'
  },
  'schoolMembers.noSchoolSelected': {
    en: 'No school selected. Please select a school first.',
    nl: 'Geen school geselecteerd. Selecteer eerst een school.'
  },
  'schoolMembers.inviteMember': {
    en: 'Invite Member',
    nl: 'Lid Uitnodigen'
  },
  'schoolMembers.teamMembers': {
    en: 'Team Members',
    nl: 'Teamleden'
  },
  'schoolMembers.noMembers': {
    en: 'No team members yet. Invite teachers and staff to join your school.',
    nl: 'Nog geen teamleden. Nodig docenten en medewerkers uit om lid te worden van je school.'
  },
  'schoolMembers.confirmRemove': {
    en: 'Are you sure you want to remove {name} from your school?',
    nl: 'Weet je zeker dat je {name} uit je school wilt verwijderen?'
  },
  'schoolMembers.removeFromSchool': {
    en: 'Remove from school',
    nl: 'Verwijderen uit school'
  },
  'schoolMembers.never': {
    en: 'Never',
    nl: 'Nooit'
  },
  'schoolMembers.dialog.inviteTitle': {
    en: 'Invite New Member',
    nl: 'Nieuw Lid Uitnodigen'
  },
  'schoolMembers.form.firstName': {
    en: 'First Name',
    nl: 'Voornaam'
  },
  'schoolMembers.form.lastName': {
    en: 'Last Name',
    nl: 'Achternaam'
  },
  'schoolMembers.form.email': {
    en: 'Email',
    nl: 'E-mail'
  },
  'schoolMembers.form.role': {
    en: 'Role',
    nl: 'Rol'
  },
  'schoolMembers.form.selectRole': {
    en: 'Select role',
    nl: 'Selecteer rol'
  },
  'schoolMembers.form.cancel': {
    en: 'Cancel',
    nl: 'Annuleren'
  },
  'schoolMembers.form.sending': {
    en: 'Sending...',
    nl: 'Versturen...'
  },
  'schoolMembers.form.sendInvitation': {
    en: 'Send Invitation',
    nl: 'Uitnodiging Versturen'
  },
  'schoolMembers.role.teacher': {
    en: 'Teacher',
    nl: 'Docent'
  },
  'schoolMembers.role.schoolOwner': {
    en: 'School Owner',
    nl: 'Schooleigenaar'
  },
  'schoolMembers.table.member': {
    en: 'Member',
    nl: 'Lid'
  },
  'schoolMembers.table.role': {
    en: 'Role',
    nl: 'Rol'
  },
  'schoolMembers.table.status': {
    en: 'Status',
    nl: 'Status'
  },
  'schoolMembers.table.joined': {
    en: 'Joined',
    nl: 'Lid geworden'
  },
  'schoolMembers.table.lastActive': {
    en: 'Last Active',
    nl: 'Laatst actief'
  },
  'schoolMembers.table.actions': {
    en: 'Actions',
    nl: 'Acties'
  },
  'schoolMembers.status.active': {
    en: 'Active',
    nl: 'Actief'
  },
  'schoolMembers.status.inactive': {
    en: 'Inactive',
    nl: 'Inactief'
  },
  'schoolMembers.stats.totalMembers': {
    en: 'Total Members',
    nl: 'Totaal Leden'
  },
  'schoolMembers.stats.activeMembers': {
    en: 'Active Members',
    nl: 'Actieve Leden'
  },
  'schoolMembers.stats.teachers': {
    en: 'Teachers',
    nl: 'Docenten'
  },
  'schoolMembers.toast.inviteSentTitle': {
    en: 'Invitation sent!',
    nl: 'Uitnodiging verstuurd!'
  },
  'schoolMembers.toast.inviteSentDescription': {
    en: 'The member has been invited to join your school.',
    nl: 'Het lid is uitgenodigd om lid te worden van je school.'
  },
  'schoolMembers.toast.inviteFailedTitle': {
    en: 'Invitation failed',
    nl: 'Uitnodiging mislukt'
  },
  'schoolMembers.toast.removedTitle': {
    en: 'Member removed',
    nl: 'Lid verwijderd'
  },
  'schoolMembers.toast.removedDescription': {
    en: 'The member has been removed from your school.',
    nl: 'Het lid is verwijderd uit je school.'
  },
  'schoolMembers.toast.removeFailedTitle': {
    en: 'Failed to remove member',
    nl: 'Lid verwijderen mislukt'
  },

  // School Dashboard page
  'schoolDashboard.title': {
    en: 'School Dashboard',
    nl: 'School Dashboard'
  },
  'schoolDashboard.subtitle': {
    en: "Overview of your school's performance and student activity",
    nl: 'Overzicht van de prestaties van je school en de activiteit van studenten'
  },
  'schoolDashboard.stats.totalStudents': {
    en: 'Total Students',
    nl: 'Totaal Studenten'
  },
  'schoolDashboard.stats.thisMonth': {
    en: 'this month',
    nl: 'deze maand'
  },
  'schoolDashboard.stats.teachers': {
    en: 'Teachers',
    nl: 'Docenten'
  },
  'schoolDashboard.stats.activeInstructors': {
    en: 'Active instructors',
    nl: 'Actieve instructeurs'
  },
  'schoolDashboard.stats.lessons': {
    en: 'Lessons',
    nl: 'Lessen'
  },
  'schoolDashboard.stats.totalLessonLibrary': {
    en: 'Total lesson library',
    nl: 'Totale lessenbibliotheek'
  },
  'schoolDashboard.stats.songs': {
    en: 'Songs',
    nl: 'Nummers'
  },
  'schoolDashboard.stats.songRepertoire': {
    en: 'Song repertoire',
    nl: 'Nummerrepertoire'
  },
  'schoolDashboard.tab.studentActivity': {
    en: 'Student Activity',
    nl: 'Studentactiviteit'
  },
  'schoolDashboard.tab.performanceTrends': {
    en: 'Performance Trends',
    nl: 'Prestatietrends'
  },
  'schoolDashboard.tab.schoolOverview': {
    en: 'School Overview',
    nl: 'Schooloverzicht'
  },
  'schoolDashboard.activity.title': {
    en: 'Recent Student Activity',
    nl: 'Recente Studentactiviteit'
  },
  'schoolDashboard.activity.description': {
    en: 'Most active students and their practice sessions',
    nl: 'Meest actieve studenten en hun oefensessies'
  },
  'schoolDashboard.activity.sessions': {
    en: 'sessions',
    nl: 'sessies'
  },
  'schoolDashboard.activity.practiced': {
    en: 'practiced',
    nl: 'geoefend'
  },
  'schoolDashboard.activity.noPractice': {
    en: 'No practice yet',
    nl: 'Nog niet geoefend'
  },
  'schoolDashboard.activity.lastSeen': {
    en: 'Last seen',
    nl: 'Laatst gezien'
  },
  'schoolDashboard.activity.neverLoggedIn': {
    en: 'Never logged in',
    nl: 'Nooit ingelogd'
  },
  'schoolDashboard.activity.noData': {
    en: 'No student activity data available yet',
    nl: 'Nog geen studentactiviteitsgegevens beschikbaar'
  },
  'schoolDashboard.performance.title': {
    en: 'Performance Trends',
    nl: 'Prestatietrends'
  },
  'schoolDashboard.performance.description': {
    en: 'Student engagement over the past 6 months',
    nl: 'Studentbetrokkenheid over de afgelopen 6 maanden'
  },
  'schoolDashboard.performance.loadingTrends': {
    en: 'Loading trends...',
    nl: 'Trends laden...'
  },
  'schoolDashboard.performance.activeStudents': {
    en: 'Active Students',
    nl: 'Actieve Studenten'
  },
  'schoolDashboard.performance.totalSessions': {
    en: 'Total Sessions',
    nl: 'Totaal Sessies'
  },
  'schoolDashboard.practiceDuration.title': {
    en: 'Practice Duration Trends',
    nl: 'Oefenduurtrends'
  },
  'schoolDashboard.practiceDuration.description': {
    en: 'Total practice time per month',
    nl: 'Totale oefentijd per maand'
  },
  'schoolDashboard.practiceDuration.loading': {
    en: 'Loading practice data...',
    nl: 'Oefengegevens laden...'
  },
  'schoolDashboard.practiceDuration.practiceTime': {
    en: 'Practice Time',
    nl: 'Oefentijd'
  },
  'schoolDashboard.practiceDuration.practiceDuration': {
    en: 'Practice Duration',
    nl: 'Oefeningsduur'
  },
  'schoolDashboard.overview.thisMonthActivity': {
    en: "This Month's Activity",
    nl: 'Activiteit Deze Maand'
  },
  'schoolDashboard.overview.practiceSessions': {
    en: 'Practice Sessions',
    nl: 'Oefensessies'
  },
  'schoolDashboard.overview.newStudents': {
    en: 'New Students',
    nl: 'Nieuwe Studenten'
  },
  'schoolDashboard.overview.totalSessionsAllTime': {
    en: 'Total Sessions (All Time)',
    nl: 'Totaal Sessies (Altijd)'
  },
  'schoolDashboard.overview.contentLibrary': {
    en: 'Content Library',
    nl: 'Inhoudsbibliotheek'
  },
  'schoolDashboard.overview.totalLessons': {
    en: 'Total Lessons',
    nl: 'Totaal Lessen'
  },
  'schoolDashboard.overview.totalSongs': {
    en: 'Total Songs',
    nl: 'Totaal Nummers'
  },
  'schoolDashboard.overview.activeTeachers': {
    en: 'Active Teachers',
    nl: 'Actieve Docenten'
  },

  // Teach page (teacher control interface)
  'teach.loading': {
    en: 'Loading…',
    nl: 'Laden…'
  },
  'teach.lessonNotFound': {
    en: 'Lesson not found.',
    nl: 'Les niet gevonden.'
  },
  'teach.back': {
    en: 'Back',
    nl: 'Terug'
  },
  'teach.reactionReady': {
    en: 'Ready!',
    nl: 'Klaar!'
  },
  'teach.studentConnected': {
    en: 'Student connected',
    nl: 'Leerling verbonden'
  },
  'teach.waitingForStudent': {
    en: 'Waiting for student…',
    nl: 'Wachten op leerling…'
  },
  'teach.closeScreen': {
    en: 'Close screen',
    nl: 'Sluit scherm'
  },
  'teach.openStudentScreen': {
    en: 'Open student screen',
    nl: 'Open leerlingscherm'
  },
  'teach.lessonContent': {
    en: 'Lesson content',
    nl: 'Lesinhoud'
  },
  'teach.blocks': {
    en: 'blocks',
    nl: 'blokken'
  },
  'teach.block': {
    en: 'Block',
    nl: 'Blok'
  },
  'teach.noContentBlocks': {
    en: 'No content blocks.',
    nl: 'Geen content blokken.'
  },
  'teach.clearScreen': {
    en: 'Clear screen',
    nl: 'Leeg scherm'
  },
  'teach.labelOptional': {
    en: 'Label (optional)',
    nl: 'Label (optioneel)'
  },
  'teach.timer.title': {
    en: 'Timer',
    nl: 'Timer'
  },
  'teach.timer.minutes': {
    en: 'minutes',
    nl: 'minuten'
  },
  'teach.timer.push': {
    en: 'Push timer',
    nl: 'Push timer'
  },
  'teach.pause.title': {
    en: 'Pause',
    nl: 'Pauze'
  },
  'teach.pause.messagePlaceholder': {
    en: 'Message (optional)',
    nl: 'Bericht (optioneel)'
  },
  'teach.pause.push': {
    en: 'Push pause',
    nl: 'Push pauze'
  },
  'teach.metronome.title': {
    en: 'Metronome',
    nl: 'Metronoom'
  },
  'teach.metronome.beats': {
    en: 'Beats',
    nl: 'Maat'
  },
  'teach.metronome.push': {
    en: 'Push metronome',
    nl: 'Push metronoom'
  },
  'teach.previewStudentScreen': {
    en: 'Preview student screen',
    nl: 'Voorbeeld leerlingscherm'
  },
  'teach.clickBlockToPush': {
    en: 'Click a block to push it to the student screen',
    nl: 'Klik op een blok om het te pushen naar het leerlingscherm'
  },
  'teach.openScreenToStart': {
    en: 'Open the student screen to get started',
    nl: 'Open het leerlingscherm om te beginnen'
  },

  // Tools — Metronome
  'tools.metronome.title': {
    en: 'Practice Metronome',
    nl: 'Oefenmetronoom'
  },
  'tools.metronome.subtitle': {
    en: 'Keep perfect time with our full-featured metronome',
    nl: 'Houd de maat perfect met onze volledig uitgeruste metronoom'
  },
  'tools.metronome.tips.title': {
    en: 'Metronome Tips',
    nl: 'Metronomtips'
  },
  'tools.metronome.tips.startSlow.title': {
    en: 'Start Slow',
    nl: 'Begin Langzaam'
  },
  'tools.metronome.tips.startSlow.description': {
    en: 'Begin at a comfortable tempo and gradually increase as you build confidence',
    nl: 'Begin op een comfortabel tempo en verhoog geleidelijk naarmate je zelfvertrouwen groeit'
  },
  'tools.metronome.tips.subdivisions.title': {
    en: 'Use Subdivisions',
    nl: 'Gebruik Onderverdelingen'
  },
  'tools.metronome.tips.subdivisions.description': {
    en: 'Enable subdivisions to practice eighth notes and improve timing accuracy',
    nl: 'Schakel onderverdelingen in om achtste noten te oefenen en de timingnauwkeurigheid te verbeteren'
  },
  'tools.metronome.tips.accent.title': {
    en: 'Accent Practice',
    nl: 'Accentoefening'
  },
  'tools.metronome.tips.accent.description': {
    en: 'The accented first beat helps you feel the downbeat and measure structure',
    nl: 'De geaccentueerde eerste tel helpt je de neertelling en maatstructuur te voelen'
  },
  'tools.metronome.tips.oddTime.title': {
    en: 'Odd Time Signatures',
    nl: 'Onregelmatige Maatsoorten'
  },
  'tools.metronome.tips.oddTime.description': {
    en: 'Practice 5/4 and 7/8 to expand your rhythmic vocabulary',
    nl: 'Oefen 5/4 en 7/8 om je ritmisch vocabulaire uit te breiden'
  },

  // Tools — ABC Notation
  'tools.abcNotation.title': {
    en: 'ABC Notation Editor',
    nl: 'ABC-notatieditor'
  },
  'tools.abcNotation.subtitle': {
    en: 'Write and play music using ABC notation format',
    nl: 'Schrijf en speel muziek met het ABC-notatieformaat'
  },
  'tools.abcNotation.about.title': {
    en: 'About ABC Notation',
    nl: 'Over ABC-notatie'
  },
  'tools.abcNotation.about.description': {
    en: "ABC notation is a simple text-based music notation system widely used for folk and traditional music. It's easy to learn and perfect for sharing tunes online.",
    nl: 'ABC-notatie is een eenvoudig tekstgebaseerd muzieknotatiesysteem dat veel wordt gebruikt voor folk- en traditionele muziek. Het is gemakkelijk te leren en perfect voor het online delen van melodieën.'
  },
  'tools.abcNotation.quickRef.title': {
    en: 'Quick Reference',
    nl: 'Snelle Naslaginformatie'
  },
  'tools.abcNotation.quickRef.tuneNumber': {
    en: 'Tune number',
    nl: 'Melodienummer'
  },
  'tools.abcNotation.quickRef.tuneTitle': {
    en: 'Tune title',
    nl: 'Melodietitel'
  },
  'tools.abcNotation.quickRef.timeSignature': {
    en: 'Time signature',
    nl: 'Maatsoort'
  },
  'tools.abcNotation.quickRef.noteLength': {
    en: 'Default note length',
    nl: 'Standaard nootlengte'
  },
  'tools.abcNotation.quickRef.keySignature': {
    en: 'Key signature',
    nl: 'Toonsoort'
  },
  'tools.abcNotation.quickRef.notes': {
    en: 'Notes (lowercase = octave higher)',
    nl: 'Noten (kleine letters = octaaf hoger)'
  },
  'tools.abcNotation.quickRef.barLine': {
    en: 'Bar line',
    nl: 'Maatstreep'
  },

  // Tools — Collaborative Notation
  'tools.collaborative.title': {
    en: 'Collaborative Notation',
    nl: 'Samenwerkende Notatie'
  },
  'tools.collaborative.subtitle': {
    en: 'Create and edit musical scores in real-time with your team',
    nl: 'Maak en bewerk muziekpartituren in realtime met je team'
  },
  'tools.collaborative.newScore': {
    en: 'New Score',
    nl: 'Nieuwe Partituur'
  },
  'tools.collaborative.searchPlaceholder': {
    en: 'Search notation documents...',
    nl: 'Zoek notatiedocumenten...'
  },
  'tools.collaborative.createTitle': {
    en: 'Create New Notation Document',
    nl: 'Nieuw Notatiedocument Aanmaken'
  },
  'tools.collaborative.labelTitle': {
    en: 'Title',
    nl: 'Titel'
  },
  'tools.collaborative.labelDescription': {
    en: 'Description (Optional)',
    nl: 'Beschrijving (Optioneel)'
  },
  'tools.collaborative.titlePlaceholder': {
    en: 'Enter document title...',
    nl: 'Voer documenttitel in...'
  },
  'tools.collaborative.descriptionPlaceholder': {
    en: 'Enter description...',
    nl: 'Voer beschrijving in...'
  },
  'tools.collaborative.creating': {
    en: 'Creating...',
    nl: 'Aanmaken...'
  },
  'tools.collaborative.createDocument': {
    en: 'Create Document',
    nl: 'Document Aanmaken'
  },
  'tools.collaborative.cancel': {
    en: 'Cancel',
    nl: 'Annuleren'
  },
  'tools.collaborative.backToDocuments': {
    en: '← Back to Documents',
    nl: '← Terug naar Documenten'
  },
  'tools.collaborative.editorTitle': {
    en: 'Collaborative Notation Editor',
    nl: 'Samenwerkende Notatieditor'
  },
  'tools.collaborative.saved': {
    en: 'Saved',
    nl: 'Opgeslagen'
  },
  'tools.collaborative.savedDescription': {
    en: 'Changes saved successfully',
    nl: 'Wijzigingen succesvol opgeslagen'
  },
  'tools.collaborative.validationError': {
    en: 'Validation Error',
    nl: 'Validatiefout'
  },
  'tools.collaborative.validationErrorDescription': {
    en: 'Please enter a document title',
    nl: 'Voer een documenttitel in'
  },
  'tools.collaborative.documentCreated': {
    en: 'Document Created',
    nl: 'Document Aangemaakt'
  },
  'tools.collaborative.documentCreatedDescription': {
    en: 'New notation document created successfully',
    nl: 'Nieuw notatiedocument succesvol aangemaakt'
  },
  'tools.collaborative.creationError': {
    en: 'Creation Error',
    nl: 'Aanmaakfout'
  },
  'tools.collaborative.creationErrorDescription': {
    en: 'Failed to create notation document',
    nl: 'Aanmaken van notatiedocument mislukt'
  },
  'tools.collaborative.owner': {
    en: 'Owner',
    nl: 'Eigenaar'
  },
  'tools.collaborative.edit': {
    en: 'Edit',
    nl: 'Bewerken'
  },
  'tools.collaborative.linkCopied': {
    en: 'Link Copied',
    nl: 'Link Gekopieerd'
  },
  'tools.collaborative.linkCopiedDescription': {
    en: 'Share link copied to clipboard',
    nl: 'Deellink gekopieerd naar klembord'
  },
  'tools.collaborative.noDocumentsFound': {
    en: 'No notation documents found',
    nl: 'Geen notatiedocumenten gevonden'
  },
  'tools.collaborative.noDocumentsSearch': {
    en: 'Try adjusting your search terms',
    nl: 'Probeer je zoektermen aan te passen'
  },
  'tools.collaborative.noDocumentsCreate': {
    en: 'Create your first collaborative score to get started',
    nl: 'Maak je eerste samenwerkende partituur om te beginnen'
  },
  'tools.collaborative.createFirstScore': {
    en: 'Create First Score',
    nl: 'Eerste Partituur Aanmaken'
  },
  'tools.collaborative.unknownUser': {
    en: 'Unknown User',
    nl: 'Onbekende Gebruiker'
  },

  // Tools — Flat Embed
  'tools.flatEmbed.title': {
    en: 'Flat.io Sheet Music',
    nl: 'Flat.io Bladmuziek'
  },
  'tools.flatEmbed.subtitle': {
    en: 'View and play interactive sheet music from Flat.io',
    nl: 'Bekijk en speel interactieve bladmuziek van Flat.io'
  },
  'tools.flatEmbed.howToUse': {
    en: 'How to Use',
    nl: 'Hoe Te Gebruiken'
  },
  'tools.flatEmbed.loadScore': {
    en: 'Load a score:',
    nl: 'Laad een partituur:'
  },
  'tools.flatEmbed.loadScoreDescription': {
    en: 'Paste a Flat.io score URL or enter a score ID directly',
    nl: 'Plak een Flat.io partituur-URL of voer een partituur-ID direct in'
  },
  'tools.flatEmbed.playback': {
    en: 'Playback:',
    nl: 'Afspelen:'
  },
  'tools.flatEmbed.playbackDescription': {
    en: 'Use the built-in controls to play, pause, and navigate the score',
    nl: 'Gebruik de ingebouwde bedieningselementen om de partituur af te spelen, te pauzeren en te navigeren'
  },
  'tools.flatEmbed.zoom': {
    en: 'Zoom:',
    nl: 'Zoomen:'
  },
  'tools.flatEmbed.zoomDescription': {
    en: 'Use the zoom controls to adjust the sheet music size',
    nl: 'Gebruik de zoomfunctie om de grootte van de bladmuziek aan te passen'
  },
  'tools.flatEmbed.findScores': {
    en: 'Find scores:',
    nl: 'Partituren zoeken:'
  },
  'tools.flatEmbed.findScoresDescription': {
    en: 'Visit',
    nl: 'Bezoek'
  },
  'tools.flatEmbed.findScoresCommunity': {
    en: 'Flat.io Community',
    nl: 'Flat.io Community'
  },
  'tools.flatEmbed.findScoresSuffix': {
    en: 'to discover public scores',
    nl: 'om openbare partituren te ontdekken'
  },

  // Tools — Sheet Music
  'tools.sheetMusic.title': {
    en: 'Sheet Music Viewer',
    nl: 'Bladmuziekviewer'
  },
  'tools.sheetMusic.subtitle': {
    en: 'Upload and view MusicXML sheet music files',
    nl: 'Upload en bekijk MusicXML-bladmuziekbestanden'
  },
  'tools.sheetMusic.supportedFormats': {
    en: 'Supported Formats',
    nl: 'Ondersteunde Formaten'
  },
  'tools.sheetMusic.exportNote': {
    en: 'Export MusicXML from notation software like MuseScore, Finale, or Sibelius.',
    nl: 'Exporteer MusicXML vanuit notatiesoftware zoals MuseScore, Finale of Sibelius.'
  },

  // Tools — Speech to Note
  'tools.speechToNote.title': {
    en: 'Speech-to-Note Transcription',
    nl: 'Spraak-naar-noot-transcriptie'
  },
  'tools.speechToNote.subtitle': {
    en: 'Convert your voice or instrument into musical notation',
    nl: 'Converteer je stem of instrument naar muzieknotatie'
  },
  'tools.speechToNote.tabTranscribe': {
    en: 'Transcribe',
    nl: 'Transcriberen'
  },
  'tools.speechToNote.tabPreview': {
    en: 'Preview & Play',
    nl: 'Voorbeeld & Afspelen'
  },
  'tools.speechToNote.noPreview': {
    en: 'Transcribe some notes first to see the preview',
    nl: 'Transcribeer eerst enkele noten om het voorbeeld te zien'
  },
  'tools.speechToNote.howItWorks.title': {
    en: 'How It Works',
    nl: 'Hoe Het Werkt'
  },
  'tools.speechToNote.howItWorks.step1': {
    en: 'Click "Start Listening" to enable your microphone',
    nl: 'Klik op "Beginnen met luisteren" om je microfoon in te schakelen'
  },
  'tools.speechToNote.howItWorks.step2': {
    en: 'Sing or play notes into your device',
    nl: 'Zing of speel noten in je apparaat'
  },
  'tools.speechToNote.howItWorks.step3': {
    en: 'Hold each note steady for detection',
    nl: 'Houd elke noot stabiel voor detectie'
  },
  'tools.speechToNote.howItWorks.step4': {
    en: 'Notes are automatically transcribed to ABC notation',
    nl: 'Noten worden automatisch omgezet naar ABC-notatie'
  },
  'tools.speechToNote.howItWorks.step5': {
    en: 'Switch to "Preview & Play" to hear your melody',
    nl: 'Schakel over naar "Voorbeeld & Afspelen" om je melodie te horen'
  },
  'tools.speechToNote.useCases.title': {
    en: 'Use Cases',
    nl: 'Toepassingen'
  },
  'tools.speechToNote.useCases.item1': {
    en: 'Capture melody ideas quickly',
    nl: 'Melodie-ideeën snel vastleggen'
  },
  'tools.speechToNote.useCases.item2': {
    en: 'Practice pitch accuracy with visual feedback',
    nl: 'Toonhoogtetrefzekerheid oefenen met visuele feedback'
  },
  'tools.speechToNote.useCases.item3': {
    en: 'Transcribe simple tunes by ear',
    nl: 'Eenvoudige melodieën op gehoor transcriberen'
  },
  'tools.speechToNote.useCases.item4': {
    en: 'Create sheet music from vocal melodies',
    nl: 'Bladmuziek maken van vocale melodieën'
  },

  // Tools — Tablature
  'tools.tablature.title': {
    en: 'Tablature Viewer',
    nl: 'Tabulatuurviewer'
  },
  'tools.tablature.subtitle': {
    en: 'View and play guitar tablature with built-in MIDI playback',
    nl: 'Bekijk en speel gitaartabulatuur met ingebouwde MIDI-weergave'
  },
  'tools.tablature.tabUpload': {
    en: 'Upload File',
    nl: 'Bestand Uploaden'
  },
  'tools.tablature.tabWrite': {
    en: 'Write AlphaTex',
    nl: 'AlphaTex Schrijven'
  },
  'tools.tablature.editorTitle': {
    en: 'AlphaTex Editor',
    nl: 'AlphaTex-editor'
  },
  'tools.tablature.editorDescription': {
    en: 'Write tablature using AlphaTex markup language',
    nl: 'Schrijf tabulatuur met de AlphaTex-opmaaktaal'
  },
  'tools.tablature.loadSample': {
    en: 'Load Sample',
    nl: 'Voorbeeld Laden'
  },
  'tools.tablature.preview': {
    en: 'Preview',
    nl: 'Voorbeeld'
  },
  'tools.tablature.supportedFormats': {
    en: 'Supported Formats',
    nl: 'Ondersteunde Formaten'
  },

  // Owner Login page
  'ownerLogin.title': {
    en: 'Platform Administration',
    nl: 'Platformbeheer'
  },
  'ownerLogin.description': {
    en: 'Secure access for MusicDott platform administrators',
    nl: 'Beveiligde toegang voor MusicDott platformbeheerders'
  },
  'ownerLogin.usernameLabel': {
    en: 'Administrator Username',
    nl: 'Beheerder gebruikersnaam'
  },
  'ownerLogin.usernamePlaceholder': {
    en: 'Enter admin username',
    nl: 'Voer beheerdersgebruikersnaam in'
  },
  'ownerLogin.passwordLabel': {
    en: 'Administrator Password',
    nl: 'Beheerder wachtwoord'
  },
  'ownerLogin.passwordPlaceholder': {
    en: 'Enter admin password',
    nl: 'Voer beheerderswachtwoord in'
  },
  'ownerLogin.authenticating': {
    en: 'Authenticating...',
    nl: 'Authenticeren...'
  },
  'ownerLogin.accessButton': {
    en: 'Access Platform Dashboard',
    nl: 'Toegang tot platformdashboard'
  },
  'ownerLogin.loginFailed': {
    en: 'Login failed. Please check your credentials.',
    nl: 'Inloggen mislukt. Controleer uw inloggegevens.'
  },
  'ownerLogin.securityNotice': {
    en: 'Security Notice:',
    nl: 'Beveiligingsmelding:'
  },
  'ownerLogin.securityMessage': {
    en: 'This is a restricted area for platform administrators only. All access attempts are logged and monitored.',
    nl: 'Dit is een beperkt gebied voor platformbeheerders. Alle toegangspogingen worden geregistreerd en bewaakt.'
  },

  // AI Dashboard page
  'aiDashboard.authRequired': {
    en: 'Authentication Required',
    nl: 'Authenticatie vereist'
  },
  'aiDashboard.loginPrompt': {
    en: 'Please log in to access AI features',
    nl: 'Log in om toegang te krijgen tot AI-functies'
  },

  // Real-Time Dashboard page
  'realtimeDashboard.title': {
    en: 'Real-Time Dashboard',
    nl: 'Realtime dashboard'
  },
  'realtimeDashboard.subtitle': {
    en: 'Monitor student activity and manage your teaching schedule',
    nl: 'Bewaak studentactiviteit en beheer uw lesrooster'
  },
  'realtimeDashboard.statusLive': {
    en: 'Live',
    nl: 'Live'
  },
  'realtimeDashboard.statusConnecting': {
    en: 'Connecting...',
    nl: 'Verbinden...'
  },
  'realtimeDashboard.statusOffline': {
    en: 'Offline',
    nl: 'Offline'
  },
  'realtimeDashboard.retry': {
    en: 'Retry',
    nl: 'Opnieuw proberen'
  },
  'realtimeDashboard.tabOverview': {
    en: 'Overview',
    nl: 'Overzicht'
  },
  'realtimeDashboard.tabPractice': {
    en: 'Practice Monitor',
    nl: 'Oefenmonitor'
  },
  'realtimeDashboard.tabScheduling': {
    en: 'Scheduling',
    nl: 'Planning'
  },
  'realtimeDashboard.cardStudents': {
    en: 'Students',
    nl: 'Studenten'
  },
  'realtimeDashboard.cardStudentsSubtitle': {
    en: 'Total enrolled students',
    nl: 'Totaal ingeschreven studenten'
  },
  'realtimeDashboard.cardSongs': {
    en: 'Songs',
    nl: 'Nummers'
  },
  'realtimeDashboard.cardSongsSubtitle': {
    en: 'Songs in your library',
    nl: 'Nummers in uw bibliotheek'
  },
  'realtimeDashboard.cardThisWeek': {
    en: "This Week's Sessions",
    nl: 'Sessies deze week'
  },
  'realtimeDashboard.cardThisWeekSubtitle': {
    en: 'Scheduled lessons this week',
    nl: 'Geplande lessen deze week'
  },
  'realtimeDashboard.cardCurrentlyActive': {
    en: 'Currently Active',
    nl: 'Momenteel actief'
  },
  'realtimeDashboard.cardCurrentlyActiveSubtitle': {
    en: 'Students online now',
    nl: 'Studenten nu online'
  },
  'realtimeDashboard.viewActivity': {
    en: 'View activity →',
    nl: 'Activiteit bekijken →'
  },
  'realtimeDashboard.recentActivity': {
    en: 'Recent Activity',
    nl: 'Recente activiteit'
  },
  'realtimeDashboard.liveBadge': {
    en: 'Live',
    nl: 'Live'
  },
  'realtimeDashboard.waitingActivity': {
    en: 'Waiting for real-time activity...',
    nl: 'Wachten op realtime activiteit...'
  },
  'realtimeDashboard.connectActivity': {
    en: 'Connect to see live activity feed',
    nl: 'Verbinden om live activiteitsfeed te zien'
  },
  'realtimeDashboard.systemUpdate': {
    en: 'System update',
    nl: 'Systeemupdate'
  },
  'realtimeDashboard.eventPracticeStart': {
    en: '🎵 Practice session started',
    nl: '🎵 Oefensessie gestart'
  },
  'realtimeDashboard.eventPracticeEnd': {
    en: '✅ Practice session ended',
    nl: '✅ Oefensessie beëindigd'
  },
  'realtimeDashboard.eventStudentUpdate': {
    en: '👤 Student updated',
    nl: '👤 Student bijgewerkt'
  },
  'realtimeDashboard.eventLessonCreate': {
    en: '📚 New lesson created',
    nl: '📚 Nieuwe les aangemaakt'
  },
  'realtimeDashboard.eventAssignmentCreate': {
    en: '📝 Assignment created',
    nl: '📝 Opdracht aangemaakt'
  },
  'realtimeDashboard.upcomingSchedule': {
    en: 'Upcoming Schedule',
    nl: 'Aankomende planning'
  },
  'realtimeDashboard.upcomingScheduleEmpty': {
    en: 'Your upcoming teaching schedule will appear here.',
    nl: 'Uw aankomende lesrooster verschijnt hier.'
  },
  'realtimeDashboard.manageSchedule': {
    en: 'Manage Schedule',
    nl: 'Planning beheren'
  },
  'realtimeDashboard.practiceMonitor': {
    en: 'Practice Monitor',
    nl: 'Oefenmonitor'
  },
  'realtimeDashboard.liveUpdates': {
    en: 'Live Updates',
    nl: 'Live updates'
  },
  'realtimeDashboard.onlineStudents': {
    en: 'Online Students',
    nl: 'Online studenten'
  },
  'realtimeDashboard.onlineTeachers': {
    en: 'Online Teachers',
    nl: 'Online docenten'
  },
  'realtimeDashboard.recentPractice': {
    en: 'Recent Practice',
    nl: 'Recente oefening'
  },
  'realtimeDashboard.currentlyOnline': {
    en: 'Currently Online:',
    nl: 'Momenteel online:'
  },
  'realtimeDashboard.noUsersOnline': {
    en: 'No users currently online',
    nl: 'Momenteel geen gebruikers online'
  },
  'realtimeDashboard.connectToSeeUsers': {
    en: 'Connect to see online users',
    nl: 'Verbinden om online gebruikers te zien'
  },
  'realtimeDashboard.scheduleManagement': {
    en: 'Schedule Management',
    nl: 'Planningsbeheer'
  },
  'realtimeDashboard.scheduleManagementEmpty': {
    en: 'Schedule management features will be available here.',
    nl: 'Planningsfuncties zijn hier beschikbaar.'
  },
  'realtimeDashboard.goToSchedule': {
    en: 'Go to Schedule Page',
    nl: 'Naar de planningspagina'
  },

  // Performance page
  'performance.title': {
    en: 'Performance Analytics',
    nl: 'Prestatieanalyses'
  },

  // Owners Dashboard page
  'ownersDashboard.tabOverview': {
    en: 'Platform Overview',
    nl: 'Platformoverzicht'
  },
  'ownersDashboard.tabSchools': {
    en: 'School Management',
    nl: 'Schoolbeheer'
  },
  'ownersDashboard.tabUsers': {
    en: 'User Management',
    nl: 'Gebruikersbeheer'
  },
  'ownersDashboard.tabCustomerService': {
    en: 'Customer Service',
    nl: 'Klantenservice'
  },
  'ownersDashboard.tabBilling': {
    en: 'Billing Management',
    nl: 'Facturatiebeheer'
  },
  'ownersDashboard.tabAuditLog': {
    en: 'Audit Log',
    nl: 'Auditlog'
  },
  'ownersDashboard.statTotalSchools': {
    en: 'Total Schools',
    nl: 'Totaal scholen'
  },
  'ownersDashboard.statActiveSubscriptions': {
    en: 'active subscriptions',
    nl: 'actieve abonnementen'
  },
  'ownersDashboard.statTotalUsers': {
    en: 'Total Users',
    nl: 'Totaal gebruikers'
  },
  'ownersDashboard.statMonthlyRevenue': {
    en: 'Monthly Revenue',
    nl: 'Maandelijkse omzet'
  },
  'ownersDashboard.statGrowthRate': {
    en: 'since last month',
    nl: 'ten opzichte van vorige maand'
  },
  'ownersDashboard.statContentCreated': {
    en: 'Content Created',
    nl: 'Inhoud aangemaakt'
  },
  'ownersDashboard.revenueGrowth': {
    en: 'Revenue Growth',
    nl: 'Omzetgroei'
  },
  'ownersDashboard.monthlyRecurringRevenue': {
    en: 'Monthly recurring revenue',
    nl: 'Maandelijks terugkerende omzet'
  },
  'ownersDashboard.revenueTooltip': {
    en: 'Revenue',
    nl: 'Omzet'
  },
  'ownersDashboard.recentSchools': {
    en: 'Recent Schools',
    nl: 'Recente scholen'
  },
  'ownersDashboard.latestRegisteredSchools': {
    en: 'Latest registered schools',
    nl: 'Laatst geregistreerde scholen'
  },
  'ownersDashboard.noSchoolsRegistered': {
    en: 'No schools registered yet',
    nl: 'Nog geen scholen geregistreerd'
  },
  'ownersDashboard.allSchoolsTitle': {
    en: 'All Schools',
    nl: 'Alle scholen'
  },
  'ownersDashboard.allSchoolsDescription': {
    en: 'Manage all registered music schools',
    nl: 'Beheer alle geregistreerde muziekscholen'
  },
  'ownersDashboard.searchSchoolsPlaceholder': {
    en: 'Search schools...',
    nl: 'Scholen zoeken...'
  },
  'ownersDashboard.newSchool': {
    en: 'New School',
    nl: 'Nieuwe school'
  },
  'ownersDashboard.createSchoolTitle': {
    en: 'Create New School',
    nl: 'Nieuwe school aanmaken'
  },
  'ownersDashboard.createSchoolDescription': {
    en: 'Create a new music school. You can optionally assign an owner directly.',
    nl: 'Maak een nieuwe muziekschool aan. Je kunt optioneel direct een eigenaar toewijzen.'
  },
  'ownersDashboard.schoolFieldName': {
    en: 'Name *',
    nl: 'Naam *'
  },
  'ownersDashboard.schoolFieldCity': {
    en: 'City',
    nl: 'Stad'
  },
  'ownersDashboard.schoolFieldPhone': {
    en: 'Phone',
    nl: 'Telefoon'
  },
  'ownersDashboard.schoolFieldAddress': {
    en: 'Address',
    nl: 'Adres'
  },
  'ownersDashboard.schoolFieldWebsite': {
    en: 'Website',
    nl: 'Website'
  },
  'ownersDashboard.schoolFieldOwner': {
    en: 'Owner (optional)',
    nl: 'Eigenaar (optioneel)'
  },
  'ownersDashboard.schoolOwnerPlaceholder': {
    en: 'Select an owner...',
    nl: 'Selecteer een eigenaar...'
  },
  'ownersDashboard.schoolNoOwner': {
    en: 'No owner',
    nl: 'Geen eigenaar'
  },
  'ownersDashboard.cancel': {
    en: 'Cancel',
    nl: 'Annuleren'
  },
  'ownersDashboard.creating': {
    en: 'Creating...',
    nl: 'Aanmaken...'
  },
  'ownersDashboard.create': {
    en: 'Create',
    nl: 'Aanmaken'
  },
  'ownersDashboard.loading': {
    en: 'Loading...',
    nl: 'Laden...'
  },
  'ownersDashboard.tableSchoolName': {
    en: 'School Name',
    nl: 'Schoolnaam'
  },
  'ownersDashboard.tableOwner': {
    en: 'Owner',
    nl: 'Eigenaar'
  },
  'ownersDashboard.tableCity': {
    en: 'City',
    nl: 'Stad'
  },
  'ownersDashboard.tableTeachers': {
    en: 'Teachers',
    nl: 'Docenten'
  },
  'ownersDashboard.tableStudents': {
    en: 'Students',
    nl: 'Leerlingen'
  },
  'ownersDashboard.tableStatus': {
    en: 'Status',
    nl: 'Status'
  },
  'ownersDashboard.tableActions': {
    en: 'Actions',
    nl: 'Acties'
  },
  'ownersDashboard.noName': {
    en: 'No name',
    nl: 'Geen naam'
  },
  'ownersDashboard.notAssigned': {
    en: 'Not assigned',
    nl: 'Niet toegewezen'
  },
  'ownersDashboard.assignOwnerButton': {
    en: 'Owner',
    nl: 'Eigenaar'
  },
  'ownersDashboard.noSchoolsFound': {
    en: 'No schools found',
    nl: 'Geen scholen gevonden'
  },
  'ownersDashboard.assignOwnerTitle': {
    en: 'Assign Owner',
    nl: 'Eigenaar toewijzen'
  },
  'ownersDashboard.selectOwnerLabel': {
    en: 'Select Owner',
    nl: 'Eigenaar selecteren'
  },
  'ownersDashboard.selectOwnerPlaceholder': {
    en: 'Choose a school owner...',
    nl: 'Kies een school-eigenaar...'
  },
  'ownersDashboard.noOwnersAvailable': {
    en: 'No school owners available. Create a school owner first.',
    nl: 'Er zijn geen school-eigenaren beschikbaar. Maak eerst een school-eigenaar aan.'
  },
  'ownersDashboard.allUsersTitle': {
    en: 'All Users by School',
    nl: 'Alle gebruikers per school'
  },
  'ownersDashboard.allUsersDescription': {
    en: 'View users grouped by school',
    nl: 'Bekijk gebruikers gegroepeerd per school'
  },
  'ownersDashboard.searchUsersPlaceholder': {
    en: 'Search users...',
    nl: 'Gebruikers zoeken...'
  },
  'ownersDashboard.newUser': {
    en: 'New User',
    nl: 'Nieuwe gebruiker'
  },
  'ownersDashboard.createUserTitle': {
    en: 'Create New User',
    nl: 'Nieuwe gebruiker aanmaken'
  },
  'ownersDashboard.createUserDescription': {
    en: 'Create a new school owner, teacher or student.',
    nl: 'Maak een nieuwe school-eigenaar, docent of leerling aan.'
  },
  'ownersDashboard.userFieldName': {
    en: 'Name *',
    nl: 'Naam *'
  },
  'ownersDashboard.userFieldUsername': {
    en: 'Username *',
    nl: 'Gebruikersnaam *'
  },
  'ownersDashboard.userFieldEmail': {
    en: 'Email *',
    nl: 'E-mail *'
  },
  'ownersDashboard.userFieldPassword': {
    en: 'Password *',
    nl: 'Wachtwoord *'
  },
  'ownersDashboard.userFieldRole': {
    en: 'Role *',
    nl: 'Rol *'
  },
  'ownersDashboard.userFieldSchool': {
    en: 'School (optional)',
    nl: 'School (optioneel)'
  },
  'ownersDashboard.userRoleTeacher': {
    en: 'Teacher',
    nl: 'Docent'
  },
  'ownersDashboard.userRoleStudent': {
    en: 'Student',
    nl: 'Leerling'
  },
  'ownersDashboard.userNoSchool': {
    en: 'No school',
    nl: 'Geen school'
  },
  'ownersDashboard.platformUsersNoSchool': {
    en: 'Platform Users (No School)',
    nl: 'Platformgebruikers (geen school)'
  },
  'ownersDashboard.tableUserName': {
    en: 'Name',
    nl: 'Naam'
  },
  'ownersDashboard.tableUsername': {
    en: 'Username',
    nl: 'Gebruikersnaam'
  },
  'ownersDashboard.tableEmail': {
    en: 'Email',
    nl: 'E-mail'
  },
  'ownersDashboard.tableRole': {
    en: 'Role',
    nl: 'Rol'
  },
  'ownersDashboard.tableLastLogin': {
    en: 'Last Login',
    nl: 'Laatste login'
  },
  'ownersDashboard.noUserName': {
    en: 'No name',
    nl: 'Geen naam'
  },
  'ownersDashboard.noUsersFound': {
    en: 'No users found',
    nl: 'Geen gebruikers gevonden'
  },
  'ownersDashboard.auditLogTitle': {
    en: 'Admin Audit Log',
    nl: 'Admin auditlog'
  },
  'ownersDashboard.auditLogDescription': {
    en: 'Track all administrative actions on the platform',
    nl: 'Volg alle administratieve acties op het platform'
  },
  'ownersDashboard.auditTableDateTime': {
    en: 'Date/Time',
    nl: 'Datum/tijd'
  },
  'ownersDashboard.auditTableActor': {
    en: 'Actor',
    nl: 'Uitvoerder'
  },
  'ownersDashboard.auditTableAction': {
    en: 'Action',
    nl: 'Actie'
  },
  'ownersDashboard.auditTableTarget': {
    en: 'Target',
    nl: 'Doel'
  },
  'ownersDashboard.auditTableDetails': {
    en: 'Details',
    nl: 'Details'
  },
  'ownersDashboard.noAuditEntries': {
    en: 'No audit log entries yet',
    nl: 'Nog geen auditlog-vermeldingen'
  },
  'ownersDashboard.statusActive': {
    en: 'Active',
    nl: 'Actief'
  },
  'ownersDashboard.statusTrial': {
    en: 'Trial',
    nl: 'Proef'
  },
  'ownersDashboard.statusOverdue': {
    en: 'Overdue',
    nl: 'Achterstallig'
  },
  'ownersDashboard.statusSuspended': {
    en: 'Suspended',
    nl: 'Opgeschort'
  },
  'ownersDashboard.statusUnknown': {
    en: 'Unknown',
    nl: 'Onbekend'
  },
  'ownersDashboard.rolePlatformOwner': {
    en: 'Platform Owner',
    nl: 'Platformeigenaar'
  },
  'ownersDashboard.roleSchoolOwner': {
    en: 'School Owner',
    nl: 'Schooleigenaar'
  },
  'ownersDashboard.roleTeacher': {
    en: 'Teacher',
    nl: 'Docent'
  },
  'ownersDashboard.roleStudent': {
    en: 'Student',
    nl: 'Leerling'
  },
  'ownersDashboard.warningNoOwner': {
    en: 'No owner assigned',
    nl: 'Geen eigenaar toegewezen'
  },
  'ownersDashboard.warningNoName': {
    en: 'No name',
    nl: 'Geen naam'
  },
  'ownersDashboard.warningNoLocation': {
    en: 'No location',
    nl: 'Geen locatie'
  },
  'ownersDashboard.warningNoEmail': {
    en: 'No email',
    nl: 'Geen e-mail'
  },
  'ownersDashboard.warningNoSchool': {
    en: 'No school assigned',
    nl: 'Geen school toegewezen'
  },
  'ownersDashboard.toastSchoolCreated': {
    en: 'School created',
    nl: 'School aangemaakt'
  },
  'ownersDashboard.toastSchoolCreatedDesc': {
    en: 'The school has been successfully created',
    nl: 'De school is succesvol aangemaakt'
  },
  'ownersDashboard.toastUserCreated': {
    en: 'User created',
    nl: 'Gebruiker aangemaakt'
  },
  'ownersDashboard.toastUserCreatedDesc': {
    en: 'The user has been successfully created',
    nl: 'De gebruiker is succesvol aangemaakt'
  },
  'ownersDashboard.toastOwnerAssigned': {
    en: 'Owner assigned',
    nl: 'Eigenaar toegewezen'
  },
  'ownersDashboard.toastOwnerAssignedDesc': {
    en: 'The owner has been successfully assigned to the school',
    nl: 'De eigenaar is succesvol aan de school toegewezen'
  },
  'ownersDashboard.toastUserDeleted': {
    en: 'User deleted',
    nl: 'Gebruiker verwijderd'
  },
  'ownersDashboard.toastUserDeletedDesc': {
    en: 'The user has been successfully deleted',
    nl: 'De gebruiker is succesvol verwijderd'
  },
  'ownersDashboard.toastSchoolDeleted': {
    en: 'School deleted',
    nl: 'School verwijderd'
  },
  'ownersDashboard.toastSchoolDeletedDesc': {
    en: 'The school has been successfully deleted',
    nl: 'De school is succesvol verwijderd'
  },
  'ownersDashboard.toastError': {
    en: 'Error',
    nl: 'Fout'
  },
  'ownersDashboard.never': {
    en: 'Never',
    nl: 'Nooit'
  },
  'ownersDashboard.usersLabel': {
    en: 'users',
    nl: 'gebruikers'
  },
  'ownersDashboard.showingUsersOf': {
    en: 'Showing 20 of {total} users in this school',
    nl: 'Toont 20 van {total} gebruikers in deze school'
  },
  'ownersDashboard.confirmDeleteSchool': {
    en: 'Are you sure you want to delete "{name}"?',
    nl: 'Weet je zeker dat je "{name}" wilt verwijderen?'
  },
  'ownersDashboard.confirmDeleteUser': {
    en: 'Are you sure you want to delete "{name}"?',
    nl: 'Weet je zeker dat je "{name}" wilt verwijderen?'
  },

  // Analytics page
  'analytics.title': {
    en: 'Analytics & Performance',
    nl: 'Analyses & Prestaties'
  },
  'analytics.subtitle': {
    en: 'Comprehensive insights into student progress and system performance',
    nl: 'Uitgebreide inzichten in studentvoortgang en systeemprestaties'
  },
  'analytics.loading': {
    en: 'Loading analytics...',
    nl: 'Analyses laden...'
  },
  'analytics.accessDenied': {
    en: 'Access denied. Teacher privileges required.',
    nl: 'Toegang geweigerd. Docentrechten vereist.'
  },
  'analytics.button.refresh': {
    en: 'Refresh',
    nl: 'Vernieuwen'
  },
  'analytics.button.exportCsv': {
    en: 'Export CSV',
    nl: 'CSV exporteren'
  },
  'analytics.dateRange.last7': {
    en: 'Last 7 days',
    nl: 'Afgelopen 7 dagen'
  },
  'analytics.dateRange.last30': {
    en: 'Last 30 days',
    nl: 'Afgelopen 30 dagen'
  },
  'analytics.dateRange.last3months': {
    en: 'Last 3 months',
    nl: 'Afgelopen 3 maanden'
  },
  'analytics.dateRange.lastYear': {
    en: 'Last year',
    nl: 'Afgelopen jaar'
  },
  'analytics.reportType.overview': {
    en: 'Overview',
    nl: 'Overzicht'
  },
  'analytics.reportType.students': {
    en: 'Student Progress',
    nl: 'Studentvoortgang'
  },
  'analytics.reportType.lessons': {
    en: 'Lesson Analytics',
    nl: 'Lesanalyses'
  },
  'analytics.reportType.performance': {
    en: 'Performance',
    nl: 'Prestaties'
  },
  'analytics.tab.overview': {
    en: 'Overview',
    nl: 'Overzicht'
  },
  'analytics.tab.students': {
    en: 'Students',
    nl: 'Studenten'
  },
  'analytics.tab.performance': {
    en: 'Performance',
    nl: 'Prestaties'
  },
  'analytics.tab.realtime': {
    en: 'Real-time',
    nl: 'Real-time'
  },
  'analytics.metric.totalStudents': {
    en: 'Total Students',
    nl: 'Totaal studenten'
  },
  'analytics.metric.activeStudents': {
    en: 'Active students',
    nl: 'Actieve studenten'
  },
  'analytics.metric.activeLessons': {
    en: 'Active Lessons',
    nl: 'Actieve lessen'
  },
  'analytics.metric.availableContent': {
    en: 'Available content',
    nl: 'Beschikbare inhoud'
  },
  'analytics.metric.completedAssignments': {
    en: 'Completed Assignments',
    nl: 'Voltooide opdrachten'
  },
  'analytics.metric.studentAchievements': {
    en: 'Student achievements',
    nl: 'Prestaties van studenten'
  },
  'analytics.metric.upcomingSessions': {
    en: 'Upcoming Sessions',
    nl: 'Aankomende sessies'
  },
  'analytics.metric.next7days': {
    en: 'Next 7 days',
    nl: 'Komende 7 dagen'
  },
  'analytics.popularLessons.title': {
    en: 'Popular Lessons',
    nl: 'Populaire lessen'
  },
  'analytics.popularLessons.completions': {
    en: 'completions',
    nl: 'voltooiingen'
  },
  'analytics.popularLessons.empty': {
    en: 'No lesson data available',
    nl: 'Geen lesgegevens beschikbaar'
  },
  'analytics.upcomingDeadlines.title': {
    en: 'Upcoming Deadlines',
    nl: 'Aankomende deadlines'
  },
  'analytics.upcomingDeadlines.due': {
    en: 'Due:',
    nl: 'Deadline:'
  },
  'analytics.upcomingDeadlines.empty': {
    en: 'No upcoming deadlines',
    nl: 'Geen aankomende deadlines'
  },
  'analytics.studentProgress.title': {
    en: 'Student Progress Overview',
    nl: 'Overzicht studentvoortgang'
  },
  'analytics.studentProgress.colStudent': {
    en: 'Student Name',
    nl: 'Studentnaam'
  },
  'analytics.studentProgress.colCompletedLessons': {
    en: 'Completed Lessons',
    nl: 'Voltooide lessen'
  },
  'analytics.studentProgress.colAssignments': {
    en: 'Assignments',
    nl: 'Opdrachten'
  },
  'analytics.studentProgress.colXp': {
    en: 'XP Earned',
    nl: 'XP verdiend'
  },
  'analytics.studentProgress.colLastActivity': {
    en: 'Last Activity',
    nl: 'Laatste activiteit'
  },
  'analytics.studentProgress.colProgress': {
    en: 'Progress',
    nl: 'Voortgang'
  },
  'analytics.studentProgress.never': {
    en: 'Never',
    nl: 'Nooit'
  },
  'analytics.studentProgress.empty': {
    en: 'No student data available for the selected period',
    nl: 'Geen studentgegevens beschikbaar voor de geselecteerde periode'
  },
  'analytics.perf.totalLessons': {
    en: 'Total Lessons',
    nl: 'Totaal lessen'
  },
  'analytics.perf.totalLessonsDesc': {
    en: 'All time lesson count',
    nl: 'Totaal aantal lessen aller tijden'
  },
  'analytics.perf.avgCreationTime': {
    en: 'Average Creation Time',
    nl: 'Gemiddelde aanmaaktijd'
  },
  'analytics.perf.perLessonCreation': {
    en: 'Per lesson creation',
    nl: 'Per les aanmaken'
  },
  'analytics.perf.successRate': {
    en: 'Success Rate',
    nl: 'Slagingspercentage'
  },
  'analytics.perf.activeUsers': {
    en: 'Active Users',
    nl: 'Actieve gebruikers'
  },
  'analytics.perf.creatingLessonsThisWeek': {
    en: 'Creating lessons this week',
    nl: 'Lessen aanmaken deze week'
  },
  'analytics.perf.alertSlowTitle': {
    en: 'Performance Alert:',
    nl: 'Prestatiewaarschuwing:'
  },
  'analytics.perf.alertSlowDesc': {
    en: 'Average lesson creation time is {time}s. Consider optimizing content blocks.',
    nl: 'Gemiddelde aanmaaktijd voor lessen is {time}s. Overweeg contentblokken te optimaliseren.'
  },
  'analytics.perf.alertFailureTitle': {
    en: 'High Failure Rate:',
    nl: 'Hoog mislukkingspercentage:'
  },
  'analytics.perf.alertFailureDesc': {
    en: '{rate}% of lesson creations are failing. Check validation rules.',
    nl: '{rate}% van de les-aanmaken mislukt. Controleer de validatieregels.'
  },
  'analytics.perf.statusExcellent': {
    en: 'Excellent',
    nl: 'Uitstekend'
  },
  'analytics.perf.statusGood': {
    en: 'Good',
    nl: 'Goed'
  },
  'analytics.perf.statusFair': {
    en: 'Fair',
    nl: 'Redelijk'
  },
  'analytics.perf.statusPoor': {
    en: 'Poor',
    nl: 'Slecht'
  },
  'analytics.realtime.title': {
    en: 'Real-time Statistics',
    nl: 'Real-time statistieken'
  },
  'analytics.realtime.activeSessions': {
    en: 'Active Sessions',
    nl: 'Actieve sessies'
  },
  'analytics.realtime.lessonsToday': {
    en: 'Lessons Today',
    nl: 'Lessen vandaag'
  },
  'analytics.realtime.avgResponseTime': {
    en: 'Avg Response Time',
    nl: 'Gem. responstijd'
  },
  'analytics.realtime.empty': {
    en: 'Real-time data not available',
    nl: 'Real-time gegevens niet beschikbaar'
  },
  'analytics.csv.colStudentName': {
    en: 'Student Name',
    nl: 'Studentnaam'
  },
  'analytics.csv.colCompletedLessons': {
    en: 'Completed Lessons',
    nl: 'Voltooide lessen'
  },
  'analytics.csv.colTotalAssignments': {
    en: 'Total Assignments',
    nl: 'Totaal opdrachten'
  },
  'analytics.csv.colCompletedAssignments': {
    en: 'Completed Assignments',
    nl: 'Voltooide opdrachten'
  },
  'analytics.csv.colXpEarned': {
    en: 'XP Earned',
    nl: 'XP verdiend'
  },
  'analytics.csv.colLastActivity': {
    en: 'Last Activity',
    nl: 'Laatste activiteit'
  },

  // Import page
  'import.title': {
    en: 'Import from Old MusicDott',
    nl: 'Importeren vanuit oud MusicDott'
  },
  'import.subtitle': {
    en: 'Import your existing content from the old MusicDott system. Convert embedded content and Groovescribe patterns into the new format.',
    nl: 'Importeer je bestaande inhoud vanuit het oude MusicDott-systeem. Converteer ingebedde inhoud en Groovescribe-patronen naar het nieuwe formaat.'
  },
  'import.csv.title': {
    en: 'CSV Import',
    nl: 'CSV Importeren'
  },
  'import.csv.description': {
    en: 'Import directly from MusicDott 1.0 CSV files (POS_Songs.csv and POS_Notatie.csv).',
    nl: 'Importeer rechtstreeks vanuit MusicDott 1.0 CSV-bestanden (POS_Songs.csv en POS_Notatie.csv).'
  },
  'import.csv.songsLabel': {
    en: 'Songs CSV (POS_Songs.csv)',
    nl: 'Nummers CSV (POS_Songs.csv)'
  },
  'import.csv.lessonsLabel': {
    en: 'Lessons CSV (POS_Notatie.csv)',
    nl: 'Lessen CSV (POS_Notatie.csv)'
  },
  'import.csv.fileSelected': {
    en: '{name} selected',
    nl: '{name} geselecteerd'
  },
  'import.csv.buttonImporting': {
    en: 'Converting & Importing...',
    nl: 'Converteren & Importeren...'
  },
  'import.csv.button': {
    en: 'Import CSV Files',
    nl: 'CSV-bestanden importeren'
  },
  'import.csv.autoConversionNote': {
    en: 'Automatic conversion:',
    nl: 'Automatische conversie:'
  },
  'import.csv.autoConversionDesc': {
    en: 'YouTube URLs become video embeds, Groovescribe patterns are preserved, and all content is properly structured.',
    nl: "YouTube-URL's worden video-embeds, Groovescribe-patronen worden bewaard en alle inhoud wordt goed gestructureerd."
  },
  'import.preview.title': {
    en: 'Content Preview',
    nl: 'Inhoudsvoorbeeld'
  },
  'import.preview.description': {
    en: 'Test how your old content will be converted. Paste a sample with embedded content.',
    nl: 'Test hoe je oude inhoud geconverteerd wordt. Plak een voorbeeld met ingebedde inhoud.'
  },
  'import.preview.sampleLabel': {
    en: 'Sample Content',
    nl: 'Voorbeeldinhoud'
  },
  'import.preview.normalizeNote': {
    en: 'Content is automatically normalized when you click outside the editor',
    nl: 'Inhoud wordt automatisch genormaliseerd wanneer je buiten de editor klikt'
  },
  'import.preview.buttonAnalyzing': {
    en: 'Analyzing...',
    nl: 'Analyseren...'
  },
  'import.preview.button': {
    en: 'Preview Conversion',
    nl: 'Conversie bekijken'
  },
  'import.preview.detectedBlocks': {
    en: 'Detected Content Blocks:',
    nl: 'Gedetecteerde inhoudsblokken:'
  },
  'import.preview.noBlocksDetected': {
    en: 'No content blocks detected. Make sure your content includes embedded iframes or Groovescribe patterns.',
    nl: 'Geen inhoudsblokken gedetecteerd. Zorg ervoor dat je inhoud ingebedde iframes of Groovescribe-patronen bevat.'
  },
  'import.json.title': {
    en: 'JSON Import',
    nl: 'JSON Importeren'
  },
  'import.json.description': {
    en: 'Import multiple songs or lessons from your exported JSON data.',
    nl: 'Importeer meerdere nummers of lessen vanuit je geëxporteerde JSON-gegevens.'
  },
  'import.json.importTypeLabel': {
    en: 'Import Type',
    nl: 'Importtype'
  },
  'import.json.songs': {
    en: 'Songs',
    nl: 'Nummers'
  },
  'import.json.lessons': {
    en: 'Lessons',
    nl: 'Lessen'
  },
  'import.json.dataLabel': {
    en: 'JSON Data',
    nl: 'JSON-gegevens'
  },
  'import.json.dataPlaceholderSongs': {
    en: 'Paste your songs data as JSON array here...',
    nl: 'Plak je nummergegevens hier als JSON-array...'
  },
  'import.json.dataPlaceholderLessons': {
    en: 'Paste your lessons data as JSON array here...',
    nl: 'Plak je lesgegevens hier als JSON-array...'
  },
  'import.json.buttonImporting': {
    en: 'Importing...',
    nl: 'Importeren...'
  },
  'import.json.buttonSongs': {
    en: 'Import songs',
    nl: 'Nummers importeren'
  },
  'import.json.buttonLessons': {
    en: 'Import lessons',
    nl: 'Lessen importeren'
  },
  'import.examples.title': {
    en: 'Import Format Examples',
    nl: 'Voorbeelden importformaat'
  },
  'import.examples.description': {
    en: 'Use these examples to format your data correctly for import.',
    nl: 'Gebruik deze voorbeelden om je gegevens correct te formatteren voor import.'
  },
  'import.examples.songsFormat': {
    en: 'Songs Format:',
    nl: 'Nummerformaat:'
  },
  'import.examples.lessonsFormat': {
    en: 'Lessons Format:',
    nl: 'Lesformaat:'
  },
  'import.examples.supportedTypes': {
    en: 'Supported Content Types:',
    nl: 'Ondersteunde inhoudstypen:'
  },
  'import.examples.supportedTypesDesc': {
    en: "YouTube videos, Spotify tracks, Apple Music, Groovescribe patterns, and text content will be automatically detected and converted.",
    nl: "YouTube-video's, Spotify-tracks, Apple Music, Groovescribe-patronen en tekstinhoud worden automatisch gedetecteerd en geconverteerd."
  },
  'import.toast.previewError': {
    en: 'Preview Error',
    nl: 'Voorbeeldfout'
  },
  'import.toast.importComplete': {
    en: 'Import Complete',
    nl: 'Import voltooid'
  },
  'import.toast.importSongsSuccess': {
    en: 'Successfully imported {success} songs. {failed} failed.',
    nl: 'Succesvol {success} nummers geïmporteerd. {failed} mislukt.'
  },
  'import.toast.importLessonsSuccess': {
    en: 'Successfully imported {success} lessons. {failed} failed.',
    nl: 'Succesvol {success} lessen geïmporteerd. {failed} mislukt.'
  },
  'import.toast.importError': {
    en: 'Import Error',
    nl: 'Importfout'
  },
  'import.toast.csvImportComplete': {
    en: 'CSV Import Complete',
    nl: 'CSV-import voltooid'
  },
  'import.toast.csvImportError': {
    en: 'CSV Import Error',
    nl: 'CSV-importfout'
  },
  'import.toast.parseError': {
    en: 'Parse Error',
    nl: 'Parserfout'
  },
  'import.toast.invalidJson': {
    en: 'Invalid JSON format. Please check your data.',
    nl: 'Ongeldig JSON-formaat. Controleer je gegevens.'
  },
  'import.toast.noContent': {
    en: 'Please enter some content to preview',
    nl: 'Voer wat inhoud in om te bekijken'
  },
  'import.toast.noData': {
    en: 'Please enter data to import',
    nl: 'Voer gegevens in om te importeren'
  },
  'import.toast.noFile': {
    en: 'Please select at least one CSV file to import',
    nl: 'Selecteer minimaal één CSV-bestand om te importeren'
  },

  // Search page
  'search.title': {
    en: 'Songs',
    nl: 'Nummers'
  },
  'search.subtitle': {
    en: 'Search and browse songs by artist, title, or genre',
    nl: 'Zoek en blader door nummers op artiest, titel of genre'
  },
  'search.recentSongs': {
    en: 'Recently Imported Songs',
    nl: 'Recent geïmporteerde nummers'
  },

  // Resources page
  'resources.title': {
    en: 'Resources & Learning Hub',
    nl: 'Bronnen & Leercentrum'
  },
  'resources.subtitleOwner': {
    en: 'Comprehensive guides and resources to help you build and grow your music school',
    nl: 'Uitgebreide handleidingen en bronnen om je muziekschool op te bouwen en te laten groeien'
  },
  'resources.subtitleTeacher': {
    en: 'Professional development resources to enhance your teaching practice',
    nl: 'Professionele ontwikkelingsbronnen om je lespraktijk te verbeteren'
  },
  'resources.tab.guides': {
    en: 'Guides & Articles',
    nl: 'Handleidingen & artikelen'
  },
  'resources.tab.videos': {
    en: 'Video Tutorials',
    nl: 'Videotutorials'
  },
  'resources.tab.tools': {
    en: 'Templates & Tools',
    nl: 'Sjablonen & hulpmiddelen'
  },
  'resources.guides.platformResources': {
    en: 'Platform Resources',
    nl: 'Platformbronnen'
  },
  'resources.guides.additionalResources': {
    en: 'Additional Resources',
    nl: 'Aanvullende bronnen'
  },
  'resources.guides.forOwners': {
    en: 'For Owners',
    nl: 'Voor eigenaren'
  },
  'resources.guides.videos': {
    en: 'Videos',
    nl: "Video's"
  },
  'resources.guides.readGuide': {
    en: 'Read Guide',
    nl: 'Handleiding lezen'
  },
  'resources.guides.unavailableTitle': {
    en: 'Platform Resources Unavailable',
    nl: 'Platformbronnen niet beschikbaar'
  },
  'resources.guides.unavailableDesc': {
    en: "We're unable to load platform resources at the moment. You can still access our comprehensive guide library below.",
    nl: 'We kunnen platformbronnen momenteel niet laden. Je hebt nog steeds toegang tot onze uitgebreide handleidingsbibliotheek hieronder.'
  },
  'resources.videos.watchTutorial': {
    en: 'Watch Tutorial',
    nl: 'Tutorial bekijken'
  },
  'resources.tools.openTool': {
    en: 'Open Tool',
    nl: 'Hulpmiddel openen'
  },
  'resources.tools.download': {
    en: 'Download',
    nl: 'Downloaden'
  },
  'resources.help.title': {
    en: 'Need Personal Help?',
    nl: 'Persoonlijke hulp nodig?'
  },
  'resources.help.description': {
    en: 'Schedule a 30-minute consultation with our education specialists',
    nl: 'Plan een 30-minuten consultatie met onze onderwijsspecialisten'
  },
  'resources.help.button': {
    en: 'Book Consultation',
    nl: 'Consultatie boeken'
  }
,

  // Groove Converter page
  'grooveConverter.title': {
    en: 'GrooveScribe Auto-Embed Tool',
    nl: 'GrooveScribe Auto-Insluit Tool'
  },
  'grooveConverter.subtitle': {
    en: 'Convert GrooveScribe links and patterns to safe, embeddable iframes',
    nl: 'Converteer GrooveScribe-links en patronen naar veilige, insluitbare iframes'
  },
  'grooveConverter.howItWorks': {
    en: 'How It Works',
    nl: 'Hoe het werkt'
  },
  'grooveConverter.autoPaste.title': {
    en: 'Automatic Paste Detection',
    nl: 'Automatische plakdetectie'
  },
  'grooveConverter.autoPaste.description': {
    en: 'Paste GrooveScribe links anywhere in MusicDott and they auto-convert to interactive embeds',
    nl: 'Plak GrooveScribe-links overal in MusicDott en ze worden automatisch omgezet naar interactieve insluitingen'
  },
  'grooveConverter.safeUrl.title': {
    en: 'Safe URL Encoding',
    nl: 'Veilige URL-codering'
  },
  'grooveConverter.safeUrl.description': {
    en: 'Automatically encodes pipes (|) and special characters to prevent iframe breaks',
    nl: 'Codeert automatisch pijpen (|) en speciale tekens om iframe-problemen te voorkomen'
  },
  'grooveConverter.multiFormat.title': {
    en: 'Multi-Format Support',
    nl: 'Ondersteuning voor meerdere formaten'
  },
  'grooveConverter.multiFormat.description': {
    en: "Supports full URLs, query strings, and bare parameters from multiple GrooveScribe hosts",
    nl: "Ondersteunt volledige URL's, querystrings en losse parameters van meerdere GrooveScribe-hosts"
  },
  'grooveConverter.responsive.title': {
    en: 'Responsive Design',
    nl: 'Responsief ontwerp'
  },
  'grooveConverter.responsive.description': {
    en: 'Generated embeds work perfectly on desktop, tablet, and mobile devices',
    nl: 'Gegenereerde insluitingen werken perfect op desktop, tablet en mobiele apparaten'
  },

  // Groove Demo page
  'grooveDemo.loading': {
    en: 'Loading lessons...',
    nl: 'Lessen laden...'
  },
  'grooveDemo.backToLessons': {
    en: 'Back to Lessons',
    nl: 'Terug naar lessen'
  },
  'grooveDemo.livePatterns': {
    en: 'Live GrooveScribe Patterns',
    nl: 'Live GrooveScribe Patronen'
  },
  'grooveDemo.lessonLabel': {
    en: 'Lesson',
    nl: 'Les'
  },
  'grooveDemo.categoryLabel': {
    en: 'Category',
    nl: 'Categorie'
  },
  'grooveDemo.uncategorized': {
    en: 'Uncategorized',
    nl: 'Zonder categorie'
  },
  'grooveDemo.levelLabel': {
    en: 'Level',
    nl: 'Niveau'
  },
  'grooveDemo.patternsLabel': {
    en: 'Patterns',
    nl: 'Patronen'
  },
  'grooveDemo.patternLabel': {
    en: 'Pattern',
    nl: 'Patroon'
  },
  'grooveDemo.groovePattern': {
    en: 'Groove Pattern',
    nl: 'Groove Patroon'
  },
  'grooveDemo.statistics': {
    en: 'Stored Lesson Statistics',
    nl: 'Opgeslagen Lesstatistieken'
  },
  'grooveDemo.totalLessons': {
    en: 'Total Lessons',
    nl: 'Totaal Lessen'
  },
  'grooveDemo.withGrooveScribe': {
    en: 'With GrooveScribe',
    nl: 'Met GrooveScribe'
  },
  'grooveDemo.patternsInCurrent': {
    en: 'Patterns in Current',
    nl: 'Patronen in Huidig'
  },

  // Groove Patterns page
  'groovePatterns.title': {
    en: 'Groove Pattern Library',
    nl: 'Groove Patroonbibliotheek'
  },
  'groovePatterns.subtitle': {
    en: 'Create, browse, and share interactive drum patterns with GrooveScribe',
    nl: 'Maak interactieve drumpatronen aan en deel ze via GrooveScribe'
  },
  'groovePatterns.createPattern': {
    en: 'Create Pattern',
    nl: 'Patroon Aanmaken'
  },
  'groovePatterns.searchPlaceholder': {
    en: 'Search patterns...',
    nl: 'Patronen zoeken...'
  },
  'groovePatterns.allDifficulties': {
    en: 'All Difficulties',
    nl: 'Alle moeilijkheden'
  },
  'groovePatterns.allCategories': {
    en: 'All Categories',
    nl: 'Alle categorieën'
  },
  'groovePatterns.totalPatterns': {
    en: 'Total Patterns',
    nl: 'Totaal Patronen'
  },
  'groovePatterns.uniqueTags': {
    en: 'Unique Tags',
    nl: 'Unieke Tags'
  },
  'groovePatterns.beginner': {
    en: 'Beginner',
    nl: 'Beginner'
  },
  'groovePatterns.intermediate': {
    en: 'Intermediate',
    nl: 'Gemiddeld'
  },
  'groovePatterns.advanced': {
    en: 'Advanced',
    nl: 'Gevorderd'
  },
  'groovePatterns.filteredResults': {
    en: 'Filtered Results',
    nl: 'Gefilterde resultaten'
  },
  'groovePatterns.noPatternsAvailable': {
    en: 'No Patterns Available',
    nl: 'Geen patronen beschikbaar'
  },
  'groovePatterns.noPatternsFound': {
    en: 'No Patterns Found',
    nl: 'Geen patronen gevonden'
  },
  'groovePatterns.getStarted': {
    en: 'Get started by creating your first groove pattern',
    nl: 'Begin met het aanmaken van je eerste groove patroon'
  },
  'groovePatterns.adjustSearch': {
    en: 'Try adjusting your search terms or create a new pattern',
    nl: 'Pas je zoektermen aan of maak een nieuw patroon aan'
  },
  'groovePatterns.createFirstPattern': {
    en: 'Create Your First Pattern',
    nl: 'Maak je eerste patroon aan'
  },
  'groovePatterns.errorLoading': {
    en: 'Error Loading Patterns',
    nl: 'Fout bij laden patronen'
  },
  'groovePatterns.tryAgain': {
    en: 'Try Again',
    nl: 'Probeer opnieuw'
  },
  'groovePatterns.patternCreated': {
    en: 'Pattern Created',
    nl: 'Patroon aangemaakt'
  },
  'groovePatterns.patternCreatedDescription': {
    en: 'New groove pattern created successfully',
    nl: 'Nieuw groove patroon succesvol aangemaakt'
  },
  'groovePatterns.createFailed': {
    en: 'Create Failed',
    nl: 'Aanmaken mislukt'
  },
  'groovePatterns.createFailedDescription': {
    en: 'Could not create the groove pattern',
    nl: 'Kon het groove patroon niet aanmaken'
  },
  'groovePatterns.patternUpdated': {
    en: 'Pattern Updated',
    nl: 'Patroon bijgewerkt'
  },
  'groovePatterns.patternUpdatedDescription': {
    en: 'Groove pattern updated successfully',
    nl: 'Groove patroon succesvol bijgewerkt'
  },
  'groovePatterns.updateFailed': {
    en: 'Update Failed',
    nl: 'Bijwerken mislukt'
  },
  'groovePatterns.updateFailedDescription': {
    en: 'Could not update the groove pattern',
    nl: 'Kon het groove patroon niet bijwerken'
  },
  'groovePatterns.patternDeleted': {
    en: 'Pattern Deleted',
    nl: 'Patroon verwijderd'
  },
  'groovePatterns.patternDeletedDescription': {
    en: 'Groove pattern deleted successfully',
    nl: 'Groove patroon succesvol verwijderd'
  },
  'groovePatterns.deleteFailed': {
    en: 'Delete Failed',
    nl: 'Verwijderen mislukt'
  },
  'groovePatterns.deleteFailedDescription': {
    en: 'Could not delete the groove pattern',
    nl: 'Kon het groove patroon niet verwijderen'
  },
  'groovePatterns.deleteConfirm': {
    en: 'Are you sure you want to delete this groove pattern?',
    nl: 'Weet je zeker dat je dit groove patroon wilt verwijderen?'
  },

  // Rewards page
  'rewards.title': {
    en: 'Rewards Store',
    nl: 'Beloningswinkel'
  },
  'rewards.subtitle': {
    en: 'Redeem your practice points for exclusive rewards',
    nl: 'Wissel je oefenpunten in voor exclusieve beloningen'
  },

  // School Branding page
  'branding.pageTitle': {
    en: 'School Branding',
    nl: 'Schoolhuisstijl'
  },
  'branding.pageSubtitle': {
    en: "Customize your school's appearance and branding",
    nl: "Pas het uiterlijk en de huisstijl van je school aan"
  },
  'branding.enabled': {
    en: 'Enabled',
    nl: 'Ingeschakeld'
  },
  'branding.disabled': {
    en: 'Disabled',
    nl: 'Uitgeschakeld'
  },
  'branding.customBranding': {
    en: 'Custom Branding',
    nl: 'Aangepaste huisstijl'
  },
  'branding.customBrandingDescription': {
    en: "Enable custom branding to personalize your school's appearance",
    nl: "Schakel aangepaste huisstijl in om het uiterlijk van je school te personaliseren"
  },
  'branding.tabLogo': {
    en: 'Logo',
    nl: 'Logo'
  },
  'branding.tabColors': {
    en: 'Colors',
    nl: 'Kleuren'
  },
  'branding.tabTypography': {
    en: 'Typography',
    nl: 'Typografie'
  },
  'branding.tabAdvanced': {
    en: 'Advanced',
    nl: 'Geavanceerd'
  },
  'branding.schoolLogo': {
    en: 'School Logo',
    nl: 'Schoollogo'
  },
  'branding.schoolLogoDescription': {
    en: "Upload and manage your school's logo",
    nl: "Upload en beheer het logo van je school"
  },
  'branding.currentLogo': {
    en: 'Current Logo',
    nl: 'Huidig logo'
  },
  'branding.removeLogo': {
    en: 'Remove',
    nl: 'Verwijderen'
  },
  'branding.replaceLogo': {
    en: 'Replace Logo',
    nl: 'Logo vervangen'
  },
  'branding.uploadLogo': {
    en: 'Upload Logo',
    nl: 'Logo uploaden'
  },
  'branding.upload': {
    en: 'Upload',
    nl: 'Uploaden'
  },
  'branding.preview': {
    en: 'Preview',
    nl: 'Voorbeeld'
  },
  'branding.exitPreview': {
    en: 'Exit Preview',
    nl: 'Voorbeeld verlaten'
  },
  'branding.logoFormats': {
    en: 'Supported formats: JPEG, PNG, GIF, WebP',
    nl: 'Ondersteunde formaten: JPEG, PNG, GIF, WebP'
  },
  'branding.logoMaxSize': {
    en: 'Maximum file size: 5MB',
    nl: 'Maximale bestandsgrootte: 5MB'
  },
  'branding.logoDimensions': {
    en: 'Recommended dimensions: 200x200px (square) or 300x100px (horizontal)',
    nl: 'Aanbevolen afmetingen: 200x200px (vierkant) of 300x100px (horizontaal)'
  },
  'branding.colorScheme': {
    en: 'Color Scheme',
    nl: 'Kleurenschema'
  },
  'branding.colorSchemeDescription': {
    en: "Choose colors that represent your school's brand",
    nl: "Kies kleuren die het merk van je school vertegenwoordigen"
  },
  'branding.primaryColor': {
    en: 'Primary Color',
    nl: 'Primaire kleur'
  },
  'branding.secondaryColor': {
    en: 'Secondary Color',
    nl: 'Secundaire kleur'
  },
  'branding.accentColor': {
    en: 'Accent Color',
    nl: 'Accentkleur'
  },
  'branding.typography': {
    en: 'Typography',
    nl: 'Typografie'
  },
  'branding.typographyDescription': {
    en: 'Customize fonts and text appearance',
    nl: 'Pas lettertypen en tekstopmaak aan'
  },
  'branding.fontFamily': {
    en: 'Font Family',
    nl: 'Lettertypefamilie'
  },
  'branding.fontHint': {
    en: "Choose a font that matches your school's personality",
    nl: "Kies een lettertype dat past bij de persoonlijkheid van je school"
  },
  'branding.backgroundImage': {
    en: 'Background Image URL',
    nl: 'Achtergrondafbeelding URL'
  },
  'branding.backgroundImageHint': {
    en: 'Optional: Add a subtle background image for your school',
    nl: 'Optioneel: Voeg een subtiele achtergrondafbeelding toe voor je school'
  },
  'branding.customCss': {
    en: 'Custom CSS',
    nl: 'Aangepaste CSS'
  },
  'branding.customCssDescription': {
    en: 'Add custom CSS for advanced styling (use carefully)',
    nl: 'Voeg aangepaste CSS toe voor geavanceerde opmaak (gebruik voorzichtig)'
  },
  'branding.advancedFeatureTitle': {
    en: 'Advanced Feature',
    nl: 'Geavanceerde functie'
  },
  'branding.advancedFeatureDescription': {
    en: 'Custom CSS allows powerful customization but can break your site if used incorrectly. Test changes carefully and use CSS variables like var(--primary) when possible.',
    nl: 'Aangepaste CSS biedt krachtige aanpassing, maar kan je site beschadigen als het verkeerd wordt gebruikt. Test wijzigingen zorgvuldig en gebruik CSS-variabelen zoals var(--primary) waar mogelijk.'
  },
  'branding.resetToDefaults': {
    en: 'Reset to Defaults',
    nl: 'Terugzetten naar standaard'
  },
  'branding.saveChanges': {
    en: 'Save Changes',
    nl: 'Wijzigingen opslaan'
  },
  'branding.accessDenied': {
    en: 'Access denied. Only school owners can manage branding settings.',
    nl: 'Toegang geweigerd. Alleen schooleigenaren kunnen huisstijlinstellingen beheren.'
  },
  'branding.loadError': {
    en: 'Failed to load branding settings. Please try again.',
    nl: 'Laden van huisstijlinstellingen mislukt. Probeer het opnieuw.'
  },
  'branding.toastUpdatedTitle': {
    en: 'Branding Updated',
    nl: 'Huisstijl bijgewerkt'
  },
  'branding.toastUpdatedDescription': {
    en: 'Your school branding settings have been saved successfully.',
    nl: 'De huisstijlinstellingen van je school zijn succesvol opgeslagen.'
  },
  'branding.toastUpdateFailedTitle': {
    en: 'Update Failed',
    nl: 'Bijwerken mislukt'
  },
  'branding.toastResetTitle': {
    en: 'Branding Reset',
    nl: 'Huisstijl hersteld'
  },
  'branding.toastResetDescription': {
    en: 'Your school branding has been reset to default settings.',
    nl: 'De huisstijl van je school is hersteld naar de standaardinstellingen.'
  },
  'branding.toastResetFailedTitle': {
    en: 'Reset Failed',
    nl: 'Herstel mislukt'
  },
  'branding.toastLogoUploadedTitle': {
    en: 'Logo Uploaded',
    nl: 'Logo geupload'
  },
  'branding.toastLogoUploadedDescription': {
    en: 'Your school logo has been updated successfully.',
    nl: 'Het logo van je school is succesvol bijgewerkt.'
  },
  'branding.toastUploadFailedTitle': {
    en: 'Upload Failed',
    nl: 'Upload mislukt'
  },
  'branding.toastLogoRemovedTitle': {
    en: 'Logo Removed',
    nl: 'Logo verwijderd'
  },
  'branding.toastLogoRemovedDescription': {
    en: 'Your school logo has been removed successfully.',
    nl: 'Het logo van je school is succesvol verwijderd.'
  },
  'branding.toastDeleteFailedTitle': {
    en: 'Delete Failed',
    nl: 'Verwijderen mislukt'
  },
  'branding.toastInvalidFileTitle': {
    en: 'Invalid File Type',
    nl: 'Ongeldig bestandstype'
  },
  'branding.toastInvalidFileDescription': {
    en: 'Please select a JPEG, PNG, GIF, or WebP image file.',
    nl: 'Selecteer een JPEG-, PNG-, GIF- of WebP-afbeeldingsbestand.'
  },
  'branding.toastFileTooLargeTitle': {
    en: 'File Too Large',
    nl: 'Bestand te groot'
  },
  'branding.toastFileTooLargeDescription': {
    en: 'Please select an image smaller than 5MB.',
    nl: 'Selecteer een afbeelding kleiner dan 5MB.'
  },

  // Lesson display page (student screen)
  'display.sessionEnded': {
    en: 'Lesson finished',
    nl: 'Les afgerond'
  },
  'display.sessionEndedDescription': {
    en: 'The teacher has closed the screen.',
    nl: 'De docent heeft het scherm gesloten.'
  },
  'display.connecting': {
    en: 'Connecting to lesson screen...',
    nl: 'Verbinden met lesscherm...'
  },
  'display.waitingForTeacher': {
    en: 'Waiting for the teacher...',
    nl: 'Wachten op de docent...'
  },
  'display.reactionSent': {
    en: 'Sent!',
    nl: 'Verzonden!'
  },
  'display.reactionButton': {
    en: 'Done',
    nl: 'Klaar'
  },

  // Achievements tab
  'achievements.noAchievementsTitle': {
    en: 'No achievements available',
    nl: 'Geen prestaties beschikbaar'
  },
  'achievements.noAchievementsDescription': {
    en: 'Achievements have not been set up yet.',
    nl: 'Er zijn nog geen prestaties ingesteld.'
  },
  'achievements.totalXp': {
    en: 'Total XP',
    nl: 'Totaal XP'
  },
  'achievements.earned': {
    en: 'Earned',
    nl: 'Behaald'
  },
  'achievements.available': {
    en: 'Available',
    nl: 'Beschikbaar'
  },
  'achievements.complete': {
    en: 'Complete',
    nl: 'Compleet'
  },
  'achievements.checkForNew': {
    en: 'Check for New Achievements',
    nl: 'Controleren op nieuwe prestaties'
  },
  'achievements.categoryLessonMastery': {
    en: 'Lesson Mastery',
    nl: 'Lesbeheersing'
  },
  'achievements.categoryPracticeDedication': {
    en: 'Practice Dedication',
    nl: 'Oefentoewijding'
  },
  'achievements.categorySkillDevelopment': {
    en: 'Skill Development',
    nl: 'Vaardigheidsontwikkeling'
  },
  'achievements.categoryAssignmentExcellence': {
    en: 'Assignment Excellence',
    nl: 'Opdrachtuitstekendheid'
  },
  'achievements.categoryAttendanceAwards': {
    en: 'Attendance Awards',
    nl: 'Aanwezigheidsprijzen'
  },
  'achievements.emptyTitle': {
    en: 'Start Your Achievement Journey!',
    nl: 'Begin je prestatiereis!'
  },
  'achievements.emptyDescription': {
    en: 'Complete lessons, practice regularly, and reach milestones to unlock achievement badges and earn XP.',
    nl: 'Voltooi lessen, oefen regelmatig en bereik mijlpalen om prestatiebadges te ontgrendelen en XP te verdienen.'
  },
  'achievements.checkForAchievements': {
    en: 'Check for Achievements',
    nl: 'Controleren op prestaties'
  },
  'achievements.newUnlocked': {
    en: 'New achievements unlocked!',
    nl: 'Nieuwe prestaties ontgrendeld!'
  },
  'achievements.keepGoing': {
    en: 'Keep going!',
    nl: 'Ga zo door!'
  },
  'achievements.noneYet': {
    en: 'No new achievements yet. Continue practicing to unlock more rewards!',
    nl: 'Nog geen nieuwe prestaties. Blijf oefenen om meer beloningen te ontgrendelen!'
  },
  'achievements.checkError': {
    en: 'Error checking achievements',
    nl: 'Fout bij controleren prestaties'
  },
  'achievements.checkErrorDescription': {
    en: 'Failed to check for new achievements.',
    nl: 'Controleren op nieuwe prestaties mislukt.'
  },

  // Student progress page
  'studentProgress.backToStudents': {
    en: 'Back to Students',
    nl: 'Terug naar studenten'
  },
  'studentProgress.scheduleLessons': {
    en: 'Schedule Lessons',
    nl: 'Lessen inplannen'
  },
  'studentProgress.tabOverview': {
    en: 'Overview',
    nl: 'Overzicht'
  },
  'studentProgress.tabPractice': {
    en: 'Practice Analysis',
    nl: 'Oefeningsanalyse'
  },
  'studentProgress.tabSkills': {
    en: 'Skills Mastery',
    nl: 'Vaardigheidsniveau'
  },
  'studentProgress.tabAchievements': {
    en: 'Achievements',
    nl: 'Prestaties'
  },
  'studentProgress.tabSchedule': {
    en: 'Schedule',
    nl: 'Rooster'
  },
  'studentProgress.completionRate': {
    en: 'Completion Rate',
    nl: 'Voltooiingspercentage'
  },
  'studentProgress.totalPracticeTime': {
    en: 'Total Practice Time',
    nl: 'Totale oefentijd'
  },
  'studentProgress.averageSession': {
    en: 'Average Session',
    nl: 'Gemiddelde sessie'
  },
  'studentProgress.averageSessionDescription': {
    en: 'Average time per practice session',
    nl: 'Gemiddelde tijd per oefensessie'
  },
  'studentProgress.scheduledSessions': {
    en: 'Scheduled Sessions',
    nl: 'Geplande sessies'
  },
  'studentProgress.totalScheduledLessons': {
    en: 'Total scheduled lessons',
    nl: 'Totaal geplande lessen'
  },
  'studentProgress.recentActivity': {
    en: 'Recent Activity',
    nl: 'Recente activiteit'
  },
  'studentProgress.recentActivityDescription': {
    en: 'Practice sessions and completed assignments',
    nl: 'Oefensessies en voltooide opdrachten'
  },
  'studentProgress.practiceSession': {
    en: 'Practice Session',
    nl: 'Oefensessie'
  },
  'studentProgress.assignmentCompleted': {
    en: 'Assignment Completed',
    nl: 'Opdracht voltooid'
  },
  'studentProgress.assignmentStatus': {
    en: 'Assignment Status',
    nl: 'Opdrachtsstatus'
  },
  'studentProgress.completedVsPending': {
    en: 'Completed vs. pending assignments',
    nl: 'Voltooide vs. openstaande opdrachten'
  },
  'studentProgress.completed': {
    en: 'Completed',
    nl: 'Voltooid'
  },
  'studentProgress.pending': {
    en: 'Pending',
    nl: 'Openstaand'
  },
  'studentProgress.practiceTimeTrend': {
    en: 'Practice Time Trend',
    nl: 'Oefentijd trend'
  },
  'studentProgress.practiceTimeTrendDescription': {
    en: 'Minutes of practice over the last 14 days',
    nl: 'Minuten oefenen in de afgelopen 14 dagen'
  },
  'studentProgress.practiceTimeMinutes': {
    en: 'Practice Time (minutes)',
    nl: 'Oefentijd (minuten)'
  },
  'studentProgress.practiceStats': {
    en: 'Practice Statistics',
    nl: 'Oefeningsstatistieken'
  },
  'studentProgress.practiceStatsDescription': {
    en: 'Key metrics about practice habits',
    nl: 'Belangrijke statistieken over oefengewoonten'
  },
  'studentProgress.totalPracticeTimeStat': {
    en: 'Total Practice Time:',
    nl: 'Totale oefentijd:'
  },
  'studentProgress.totalPracticeSessionsStat': {
    en: 'Total Practice Sessions:',
    nl: 'Totaal oefensessies:'
  },
  'studentProgress.averageSessionLength': {
    en: 'Average Session Length:',
    nl: 'Gemiddelde sessielengte:'
  },
  'studentProgress.practiceConsistency': {
    en: 'Practice Consistency:',
    nl: 'Oefenconsistentie:'
  },
  'studentProgress.ofDays': {
    en: 'of',
    nl: 'van'
  },
  'studentProgress.days': {
    en: 'days',
    nl: 'dagen'
  },
  'studentProgress.recentPracticeSessions': {
    en: 'Recent Practice Sessions',
    nl: 'Recente oefensessies'
  },
  'studentProgress.latestSessions': {
    en: 'Latest recorded sessions',
    nl: 'Recentst opgenomen sessies'
  },
  'studentProgress.noPracticeSessions': {
    en: 'No practice sessions recorded yet',
    nl: 'Nog geen oefensessies opgenomen'
  },
  'studentProgress.skillsMasteryOverview': {
    en: 'Skills Mastery Overview',
    nl: 'Overzicht vaardigheidsniveau'
  },
  'studentProgress.progressAcrossSkills': {
    en: 'Progress across different skill areas',
    nl: 'Voortgang over verschillende vaardigheidsgebieden'
  },
  'studentProgress.mastery': {
    en: 'Mastery',
    nl: 'Beheersing'
  },
  'studentProgress.skillsBreakdown': {
    en: 'Skills Breakdown',
    nl: 'Vaardigheidsuitsplitsing'
  },
  'studentProgress.detailedProgress': {
    en: 'Detailed progress for each skill area',
    nl: 'Gedetailleerde voortgang per vaardigheidsgebied'
  },
  'studentProgress.masteryLabel': {
    en: 'Mastery',
    nl: 'Beheersing'
  },
  'studentProgress.recommendedFocus': {
    en: 'Recommended Focus Areas',
    nl: 'Aanbevolen aandachtsgebieden'
  },
  'studentProgress.suggestedImprovement': {
    en: 'Suggested areas for improvement',
    nl: 'Voorgestelde verbetergebieden'
  },
  'studentProgress.viewLessons': {
    en: 'View Lessons',
    nl: 'Lessen bekijken'
  },
  'studentProgress.achievementsGallery': {
    en: 'Achievements Gallery',
    nl: 'Prestatiegalerij'
  },
  'studentProgress.badgesEarned': {
    en: 'Badges and milestones earned',
    nl: 'Verdiende badges en mijlpalen'
  },
  'studentProgress.noAchievementsTitle': {
    en: 'No Achievements Yet',
    nl: 'Nog geen prestaties'
  },
  'studentProgress.noAchievementsDescription': {
    en: 'Complete assignments and maintain practice streaks to earn achievements.',
    nl: 'Voltooi opdrachten en onderhoud oefenstreken om prestaties te verdienen.'
  },
  'studentProgress.achievementStatus': {
    en: 'Achievement Status',
    nl: 'Prestatiestatus'
  },
  'studentProgress.overallAchievementProgress': {
    en: 'Overall achievement progress',
    nl: 'Algehele voortgang prestaties'
  },
  'studentProgress.totalAchievements': {
    en: 'Total Achievements',
    nl: 'Totaal prestaties'
  },
  'studentProgress.unlocksRecognition': {
    en: 'Earning achievements unlocks special recognition',
    nl: 'Het behalen van prestaties ontgrendelt speciale erkenning'
  },
  'studentProgress.achievementTypes': {
    en: 'Achievement Types',
    nl: 'Prestatietypen'
  },
  'studentProgress.recentAchievements': {
    en: 'Recent Achievements',
    nl: 'Recente prestaties'
  },
  'studentProgress.latestMilestones': {
    en: 'Latest milestones earned',
    nl: 'Recentst behaalde mijlpalen'
  },
  'studentProgress.noAchievementsEarned': {
    en: 'No achievements earned yet',
    nl: 'Nog geen prestaties behaald'
  },
  'studentProgress.badgeNew': {
    en: 'New',
    nl: 'Nieuw'
  },
  'studentProgress.lessonScheduling': {
    en: 'Lesson Scheduling',
    nl: 'Lesplanning'
  },
  'studentProgress.manageSchedules': {
    en: 'Manage recurring lesson schedules and upcoming sessions',
    nl: 'Beheer terugkerende lesroosters en aankomende sessies'
  },
  'studentProgress.studentNotFoundTitle': {
    en: 'Student Not Found',
    nl: 'Student niet gevonden'
  },
  'studentProgress.studentNotFoundDescription': {
    en: 'Unable to load student information for scheduling.',
    nl: 'Kan studentinformatie voor planning niet laden.'
  },
  'studentProgress.errorTitle': {
    en: 'Error Loading Student',
    nl: 'Fout bij laden student'
  },
  'studentProgress.errorDescription': {
    en: 'There was a problem loading the student information.',
    nl: 'Er was een probleem bij het laden van de studentinformatie.'
  },
  'studentProgress.level': {
    en: 'level',
    nl: 'niveau'
  },
  'studentProgress.songAssignment': {
    en: 'Song assignment',
    nl: 'Liedjes opdracht'
  },
  'studentProgress.lessonAssignment': {
    en: 'Lesson assignment',
    nl: 'Les opdracht'
  },
  'studentProgress.ofLessons': {
    en: 'of',
    nl: 'van'
  },
  'studentProgress.lessonsCompleted': {
    en: 'lessons completed',
    nl: 'lessen voltooid'
  },
  'studentProgress.needsFocusDescription': {
    en: 'This area needs more focus. Consider assigning more lessons in this skill.',
    nl: 'Dit gebied heeft meer aandacht nodig. Overweeg meer lessen toe te wijzen aan deze vaardigheid.'
  },
  'studentProgress.achievementTypeHeader': {
    en: 'Achievements',
    nl: 'Prestaties'
  },
  'studentProgress.masteryPercent': {
    en: 'Mastery',
    nl: 'Beheersing'
  },

  // Test lesson view
  'testLesson.title': {
    en: 'Test Lesson View',
    nl: 'Test Les Weergave'
  },
  'testLesson.description': {
    en: 'This is a test component to verify basic functionality.',
    nl: 'Dit is een testcomponent om basisfunctionaliteit te controleren.'
  },
  'testLesson.button': {
    en: 'Test Button',
    nl: 'Testknop'
  },

  // Admin Categories page
  'categories.pageTitle': {
    en: 'Lesson Categories',
    nl: 'Lescategorieen'
  },
  'categories.subtitle': {
    en: 'Manage lesson categories to organize your educational content',
    nl: 'Beheer lescategorieen om je educatieve inhoud te organiseren'
  },
  'categories.addCategory': {
    en: 'Add Category',
    nl: 'Categorie toevoegen'
  },
  'categories.addDialogTitle': {
    en: 'Add New Category',
    nl: 'Nieuwe categorie toevoegen'
  },
  'categories.addDialogDescription': {
    en: 'Create a new category to organize your lessons.',
    nl: 'Maak een nieuwe categorie aan om je lessen te organiseren.'
  },
  'categories.editDialogTitle': {
    en: 'Edit Category',
    nl: 'Categorie bewerken'
  },
  'categories.editDialogDescription': {
    en: 'Make changes to the category details.',
    nl: 'Breng wijzigingen aan in de categoriedetails.'
  },
  'categories.namePlaceholder': {
    en: 'Enter category name',
    nl: 'Voer categorienaam in'
  },
  'categories.descriptionPlaceholder': {
    en: 'Enter category description',
    nl: 'Voer categoriebeschrijving in'
  },
  'categories.selectColor': {
    en: 'Select color',
    nl: 'Kleur selecteren'
  },
  'categories.selectIcon': {
    en: 'Select icon',
    nl: 'Pictogram selecteren'
  },
  'categories.creating': {
    en: 'Creating...',
    nl: 'Aanmaken...'
  },
  'categories.createCategory': {
    en: 'Create Category',
    nl: 'Categorie aanmaken'
  },
  'categories.updating': {
    en: 'Updating...',
    nl: 'Bijwerken...'
  },
  'categories.updateCategory': {
    en: 'Update Category',
    nl: 'Categorie bijwerken'
  },
  'categories.toastSuccessTitle': {
    en: 'Success',
    nl: 'Succes'
  },
  'categories.toastCreated': {
    en: 'Category created successfully',
    nl: 'Categorie succesvol aangemaakt'
  },
  'categories.toastUpdated': {
    en: 'Category updated successfully',
    nl: 'Categorie succesvol bijgewerkt'
  },
  'categories.toastDeleted': {
    en: 'Category deleted successfully',
    nl: 'Categorie succesvol verwijderd'
  },

  // Admin Debug Panel
  'debugPanel.title': {
    en: 'Admin Debug Panel',
    nl: 'Admin Debug Paneel'
  },
  'debugPanel.subtitle': {
    en: 'System monitoring and development tools for MusicDott platform',
    nl: 'Systeembewaking en ontwikkelingstools voor het MusicDott platform'
  },
  'debugPanel.realtimeOn': {
    en: 'Real-time ON',
    nl: 'Real-time AAN'
  },
  'debugPanel.realtimeOff': {
    en: 'Real-time OFF',
    nl: 'Real-time UIT'
  },
  'debugPanel.refresh': {
    en: 'Refresh',
    nl: 'Vernieuwen'
  },
  'debugPanel.storageStatus': {
    en: 'Storage Status',
    nl: 'Opslagstatus'
  },
  'debugPanel.connected': {
    en: 'CONNECTED',
    nl: 'VERBONDEN'
  },
  'debugPanel.fallback': {
    en: 'FALLBACK',
    nl: 'NOODMODUS'
  },
  'debugPanel.unknown': {
    en: 'UNKNOWN',
    nl: 'ONBEKEND'
  },
  'debugPanel.students': {
    en: 'Students',
    nl: 'Studenten'
  },
  'debugPanel.lessons': {
    en: 'Lessons',
    nl: 'Lessen'
  },
  'debugPanel.songs': {
    en: 'Songs',
    nl: 'Nummers'
  },
  'debugPanel.categories': {
    en: 'Categories',
    nl: 'Categorieen'
  },
  'debugPanel.users': {
    en: 'Users',
    nl: 'Gebruikers'
  },
  'debugPanel.storageInformation': {
    en: 'Storage Information',
    nl: 'Opslaginformatie'
  },
  'debugPanel.currentUserId': {
    en: 'Current User ID:',
    nl: 'Huidig Gebruikers-ID:'
  },
  'debugPanel.storageType': {
    en: 'Storage Type:',
    nl: 'Opslagtype:'
  },
  'debugPanel.connectionStatus': {
    en: 'Connection Status:',
    nl: 'Verbindingsstatus:'
  },
  'debugPanel.disconnected': {
    en: 'DISCONNECTED',
    nl: 'VERBROKEN'
  },
  'debugPanel.performanceMetrics': {
    en: 'Performance Metrics',
    nl: 'Prestatiestatistieken'
  },
  'debugPanel.dataLoad': {
    en: 'Data Load',
    nl: 'Databelasting'
  },
  'debugPanel.items': {
    en: 'items',
    nl: 'items'
  },
  'debugPanel.systemHealth': {
    en: 'System Health',
    nl: 'Systeemgezondheid'
  },
  'debugPanel.loading': {
    en: 'Loading debug information...',
    nl: 'Debug-informatie laden...'
  },
  'debugPanel.developmentStatus': {
    en: 'Development Status',
    nl: 'Ontwikkelingsstatus'
  },
  'debugPanel.developmentStatusDescription': {
    en: 'Current implementation status and development notes',
    nl: 'Huidige implementatiestatus en ontwikkelingsnotities'
  },
  'debugPanel.completedFeatures': {
    en: 'Completed Features',
    nl: 'Voltooide functies'
  },
  'debugPanel.developmentNotes': {
    en: 'Development Notes',
    nl: 'Ontwikkelingsnotities'
  },

  // Avatar page
  'avatar.title': {
    en: 'Customize Your Avatar',
    nl: 'Pas je avatar aan'
  },
  'avatar.subtitle': {
    en: 'Create a unique avatar that represents you',
    nl: 'Maak een unieke avatar die jou vertegenwoordigt'
  },

  // Messaging page (full inbox/sent UI)
  'messaging.communicate': {
    en: 'Communicate with teachers and students',
    nl: 'Communiceer met docenten en studenten'
  },
  'messaging.unread': {
    en: 'unread',
    nl: 'ongelezen'
  },
  'messaging.composeMessage': {
    en: 'Compose Message',
    nl: 'Bericht schrijven'
  },
  'messaging.composeNewMessage': {
    en: 'Compose New Message',
    nl: 'Nieuw bericht schrijven'
  },
  'messaging.composeDescription': {
    en: 'Send a message to a teacher or student.',
    nl: 'Stuur een bericht naar een docent of student.'
  },
  'messaging.recipient': {
    en: 'Recipient',
    nl: 'Ontvanger'
  },
  'messaging.selectRecipient': {
    en: 'Select recipient',
    nl: 'Selecteer ontvanger'
  },
  'messaging.subjectPlaceholder': {
    en: 'Enter message subject',
    nl: 'Voer het berichtonderwerp in'
  },
  'messaging.messagePlaceholder': {
    en: 'Type your message here...',
    nl: 'Typ hier je bericht...'
  },
  'messaging.inbox': {
    en: 'Inbox',
    nl: 'Postvak IN'
  },
  'messaging.inboxDescription': {
    en: 'Messages received from others',
    nl: 'Ontvangen berichten van anderen'
  },
  'messaging.noInboxMessages': {
    en: 'No messages in your inbox',
    nl: 'Geen berichten in je postvak IN'
  },
  'messaging.sentMessages': {
    en: 'Sent Messages',
    nl: 'Verzonden berichten'
  },
  'messaging.sentDescription': {
    en: 'Messages you have sent to others',
    nl: 'Berichten die je naar anderen hebt gestuurd'
  },
  'messaging.noSentMessages': {
    en: 'No sent messages',
    nl: 'Geen verzonden berichten'
  },
  'messaging.toLabel': {
    en: 'To:',
    nl: 'Aan:'
  },
  'messaging.fromLabel': {
    en: 'From:',
    nl: 'Van:'
  },
  'messaging.dateLabel': {
    en: 'Date:',
    nl: 'Datum:'
  },
  'messaging.missingInfo': {
    en: 'Missing information',
    nl: 'Ontbrekende informatie'
  },
  'messaging.fillAllFields': {
    en: 'Please fill in all fields.',
    nl: 'Vul alle velden in.'
  },

  // Admin Categories (additional keys)
  'categories.title': { en: 'Lesson Categories', nl: 'Lescategorieën' },
  'categories.addButton': { en: 'Add Category', nl: 'Categorie toevoegen' },
  'categories.nameLabel': { en: 'Name *', nl: 'Naam *' },
  'categories.descriptionLabel': { en: 'Description', nl: 'Beschrijving' },
  'categories.colorLabel': { en: 'Color', nl: 'Kleur' },
  'categories.colorPlaceholder': { en: 'Select color', nl: 'Kies kleur' },
  'categories.iconLabel': { en: 'Icon', nl: 'Icoon' },
  'categories.iconPlaceholder': { en: 'Select icon', nl: 'Kies icoon' },
  'categories.cancel': { en: 'Cancel', nl: 'Annuleren' },
  'categories.createButton': { en: 'Create Category', nl: 'Categorie aanmaken' },
  'categories.updateButton': { en: 'Update Category', nl: 'Categorie bijwerken' },
  'categories.toastCreateSuccess': { en: 'Category created successfully', nl: 'Categorie succesvol aangemaakt' },
  'categories.toastUpdateSuccess': { en: 'Category updated successfully', nl: 'Categorie succesvol bijgewerkt' },
  'categories.toastDeleteSuccess': { en: 'Category deleted successfully', nl: 'Categorie succesvol verwijderd' },
  'categories.toastSuccess': { en: 'Success', nl: 'Gelukt' },
  'categories.toastError': { en: 'Error', nl: 'Fout' },

  // Admin Debug Panel
  'debug.title': { en: 'Admin Debug Panel', nl: 'Admin Debug Paneel' },
  'debug.subtitle': { en: 'System monitoring and development tools for MusicDott platform', nl: 'Systeemmonitoring en ontwikkeltools voor het MusicDott-platform' },
  'debug.loading': { en: 'Loading debug information...', nl: 'Debug-informatie laden...' },
  'debug.realtimeOn': { en: 'Real-time ON', nl: 'Realtime AAN' },
  'debug.realtimeOff': { en: 'Real-time OFF', nl: 'Realtime UIT' },
  'debug.refresh': { en: 'Refresh', nl: 'Vernieuwen' },
  'debug.storageStatus': { en: 'Storage Status', nl: 'Opslagstatus' },
  'debug.connected': { en: 'CONNECTED', nl: 'VERBONDEN' },
  'debug.fallback': { en: 'FALLBACK', nl: 'TERUGVAL' },
  'debug.students': { en: 'Students', nl: 'Leerlingen' },
  'debug.lessons': { en: 'Lessons', nl: 'Lessen' },
  'debug.songs': { en: 'Songs', nl: 'Nummers' },
  'debug.categories': { en: 'Categories', nl: 'Categorieën' },
  'debug.users': { en: 'Users', nl: 'Gebruikers' },
  'debug.storageInfo': { en: 'Storage Information', nl: 'Opslaginformatie' },
  'debug.currentUserId': { en: 'Current User ID:', nl: 'Huidig Gebruikers-ID:' },
  'debug.storageType': { en: 'Storage Type:', nl: 'Opslagtype:' },
  'debug.connectionStatus': { en: 'Connection Status:', nl: 'Verbindingsstatus:' },
  'debug.disconnected': { en: 'DISCONNECTED', nl: 'VERBROKEN' },
  'debug.performanceMetrics': { en: 'Performance Metrics', nl: 'Prestatiemetrieken' },
  'debug.dataLoad': { en: 'Data Load', nl: 'Databelasting' },
  'debug.items': { en: 'items', nl: 'items' },
  'debug.systemHealth': { en: 'System Health', nl: 'Systeemgezondheid' },
  'debug.memoryFallback': { en: 'Memory fallback system active', nl: 'Geheugen terugvalsysteem actief' },
  'debug.realtimeMonitoring': { en: 'Real-time monitoring:', nl: 'Realtime monitoring:' },
  'debug.enabled': { en: 'ENABLED', nl: 'INGESCHAKELD' },
  'debug.disabled': { en: 'DISABLED', nl: 'UITGESCHAKELD' },
  'debug.refreshInterval': { en: 'Refresh interval:', nl: 'Verversingsinterval:' },
  'debug.devStatus': { en: 'Development Status', nl: 'Ontwikkelingsstatus' },
  'debug.devStatusDesc': { en: 'Current implementation status and development notes', nl: 'Huidige implementatiestatus en ontwikkelnotities' },
  'debug.completedFeatures': { en: 'Completed Features', nl: 'Voltooide functies' },
  'debug.devNotes': { en: 'Development Notes', nl: 'Ontwikkelnotities' },
  'debug.feat1': { en: 'Storage status monitoring', nl: 'Opslagstatus monitoring' },
  'debug.feat2': { en: 'Real-time debug statistics', nl: 'Realtime debug-statistieken' },
  'debug.feat3': { en: 'Memory fallback system', nl: 'Geheugen terugvalsysteem' },
  'debug.feat4': { en: 'Comprehensive data import', nl: 'Uitgebreide data-import' },
  'debug.feat5': { en: 'GrooveScribe pattern rendering', nl: 'GrooveScribe patroonweergave' },
  'debug.feat6': { en: 'Student/lesson management', nl: 'Leerling/les beheer' },
  'debug.note1': { en: 'Database connection pending', nl: 'Databaseverbinding in afwachting' },
  'debug.note2': { en: 'Using memory storage fallback', nl: 'Gebruik geheugenopslag terugval' },
  'debug.note3': { en: 'All data preserved in memory', nl: 'Alle data bewaard in geheugen' },
  'debug.note4': { en: 'Admin monitoring fully operational', nl: 'Admin monitoring volledig operationeel' },
  'debug.note5': { en: 'Platform ready for production', nl: 'Platform klaar voor productie' },

  // Messaging page (additional keys)
  'messaging.pageTitle': { en: 'Messages', nl: 'Berichten' },
  'messaging.subtitle': { en: 'Communicate with teachers and students', nl: 'Communiceer met docenten en leerlingen' },
  'messaging.compose': { en: 'Compose Message', nl: 'Bericht schrijven' },
  'messaging.composeTitle': { en: 'Compose New Message', nl: 'Nieuw bericht schrijven' },
  'messaging.recipientLabel': { en: 'Recipient', nl: 'Ontvanger' },
  'messaging.recipientPlaceholder': { en: 'Select recipient', nl: 'Selecteer ontvanger' },
  'messaging.subjectLabel': { en: 'Subject', nl: 'Onderwerp' },
  'messaging.messageLabel': { en: 'Message', nl: 'Bericht' },
  'messaging.cancel': { en: 'Cancel', nl: 'Annuleren' },
  'messaging.sending': { en: 'Sending...', nl: 'Verzenden...' },
  'messaging.sendButton': { en: 'Send Message', nl: 'Bericht verzenden' },
  'messaging.noInbox': { en: 'No messages in your inbox', nl: 'Geen berichten in je postvak' },
  'messaging.noSent': { en: 'No sent messages', nl: 'Geen verzonden berichten' },
  'messaging.new': { en: 'New', nl: 'Nieuw' },
  'messaging.to': { en: 'To:', nl: 'Aan:' },
  'messaging.from': { en: 'From:', nl: 'Van:' },
  'messaging.date': { en: 'Date:', nl: 'Datum:' },
  'messaging.close': { en: 'Close', nl: 'Sluiten' },
  'messaging.reply': { en: 'Reply', nl: 'Beantwoorden' },
  'messaging.sentSuccess': { en: 'Your message has been sent successfully.', nl: 'Je bericht is succesvol verzonden.' },
  'messaging.sendError': { en: 'Failed to send message. Please try again.', nl: 'Bericht verzenden mislukt. Probeer het opnieuw.' },

  // Landing page
  'landing.hero.badge': { en: '🎵 For music schools and private teachers', nl: '🎵 Voor muziekscholen en privédocenten', de: '🎵 Für Musikschulen und Privatlehrer', es: '🎵 Para escuelas de música y profesores particulares' },
  'landing.hero.h1a': { en: 'Stop teaching', nl: 'Stop met lesgeven', de: 'Schluss mit dem Unterrichten', es: 'Deja de enseñar' },
  'landing.hero.h1b': { en: 'through WhatsApp.', nl: 'in WhatsApp.', de: 'über WhatsApp.', es: 'por WhatsApp.' },
  'landing.hero.hookPre': { en: 'The average music teacher wastes ', nl: 'De gemiddelde muziekdocent verliest ', de: 'Der durchschnittliche Musiklehrer verschwendet ', es: 'El profesor de música promedio pierde ' },
  'landing.hero.hookBold': { en: '4 hours every week', nl: '4 uur per week', de: '4 Stunden pro Woche', es: '4 horas cada semana' },
  'landing.hero.hookPost': { en: ' on scheduling, payments and messages — hours you\'ll never get back.', nl: ' aan planning, betalingen en berichten — uren die je nooit meer terugkrijgt.', de: ' mit Terminplanung, Zahlungen und Nachrichten — Stunden, die unwiederbringlich verloren sind.', es: ' en horarios, pagos y mensajes — horas que nunca recuperarás.' },
  'landing.hero.sub': { en: 'MusicDott bundles everything: scheduling, billing, lesson content and real-time Teaching Screen — in one platform ready in 15 minutes.', nl: 'MusicDott bundelt alles: agenda, facturering, lesinhoud en real-time Lesscherm — in één platform dat in 15 minuten klaar staat.', de: 'MusicDott bündelt alles: Terminplanung, Abrechnung, Unterrichtsinhalte und Live-Unterrichtsbildschirm — in einer Plattform, die in 15 Minuten einsatzbereit ist.', es: 'MusicDott lo reúne todo: horarios, facturación, contenido de lecciones y pantalla de enseñanza en tiempo real — en una plataforma lista en 15 minutos.' },
  'landing.hero.cta': { en: 'Try 14 days free →', nl: 'Probeer 14 dagen gratis →', de: '14 Tage kostenlos testen →', es: 'Prueba 14 días gratis →' },
  'landing.hero.loginBtn': { en: 'Already have an account? Log in', nl: 'Al een account? Log in', de: 'Bereits ein Konto? Anmelden', es: '¿Ya tienes cuenta? Iniciar sesión' },
  'landing.hero.legal': { en: 'No credit card needed · No commitment · Cancel anytime', nl: 'Geen creditcard nodig · Geen installatieverplichting · Opzegging op elk moment', de: 'Keine Kreditkarte · Keine Bindung · Jederzeit kündbar', es: 'Sin tarjeta de crédito · Sin compromiso · Cancela cuando quieras' },
  'landing.hero.social1': { en: '⭐⭐⭐⭐⭐ 4.9/5 by teachers', nl: '⭐⭐⭐⭐⭐ 4.9/5 door docenten', de: '⭐⭐⭐⭐⭐ 4,9/5 von Lehrern', es: '⭐⭐⭐⭐⭐ 4,9/5 por profesores' },
  'landing.hero.social2': { en: '🇳🇱 GDPR compliant', nl: '🇳🇱 AVG-compliant', de: '🇳🇱 DSGVO-konform', es: '🇳🇱 Conforme al RGPD' },
  'landing.hero.social3': { en: '⚡ Ready in 15 min', nl: '⚡ In 15 min operationeel', de: '⚡ In 15 Min. einsatzbereit', es: '⚡ Listo en 15 min' },
  'landing.hero.teachLabel': { en: '🎹 Teach Mode — Jazz chords lesson 3', nl: '🎹 Teach Mode — Jazzakkoorden les 3', de: '🎹 Lehrmodus — Jazzakkorde Lektion 3', es: '🎹 Modo enseñanza — Acordes de jazz lección 3' },
  'landing.hero.live': { en: '● Live', nl: '● Live', de: '● Live', es: '● En vivo' },
  'landing.hero.studentScreen': { en: 'Student Screen', nl: 'Leerlingscherm', de: 'Schülerbild', es: 'Pantalla del alumno' },

  'landing.problem.label': { en: 'Does this sound familiar?', nl: 'Klinkt dit bekend?' },
  'landing.problem.h2a': { en: 'Teaching music is great.', nl: 'Muziekles is geweldig.' },
  'landing.problem.h2b': { en: 'The chaos around it isn\'t.', nl: 'De chaos eromheen niet.' },
  'landing.problem.1.title': { en: '7 apps for one lesson', nl: '7 apps voor één les' },
  'landing.problem.1.body': { en: 'WhatsApp for messages, bank transfers for payment, Google Calendar for scheduling, a notebook for notes. None of them talk to each other.', nl: 'WhatsApp voor berichten, Tikkie voor betaling, Google Calendar voor planning, een schrift voor notities. Elke app weet niks van de andere.' },
  'landing.problem.2.title': { en: 'No idea how your student is doing', nl: 'Geen idee hoe je leerling het doet' },
  'landing.problem.2.body': { en: 'You vaguely remember what you covered last lesson — but what has she practiced since? Where is she stuck? You have no idea.', nl: 'Je herinnert je vaag wat je vorige les besprak — maar wat heeft hij sindsdien geoefend? Waar loopt hij vast? Je weet het niet.' },
  'landing.problem.3.title': { en: 'Chasing payments', nl: 'Betalingen najagen' },
  'landing.problem.3.body': { en: 'Every month you manually send invoices, wait for transfers, and send reminders. You spend more time collecting money than teaching music.', nl: 'Elke maand verstuur je handmatig facturen, wacht je op Tikkie\'s, en stuur je herinneringen. Je besteedt meer tijd aan incasseren dan aan lesgeven.' },

  'landing.statement.h2a': { en: 'One platform.', nl: 'Één platform.' },
  'landing.statement.h2b': { en: 'Built for teachers.', nl: 'Gebouwd voor de docent.' },
  'landing.statement.body': { en: 'MusicDott wasn\'t built for administrators. It was built for you — the teacher who wants to teach, not administrate. Everything you need, nothing that gets in the way.', nl: 'MusicDott is niet gebouwd voor de administrateur. Het is gebouwd voor jou — de docent die wil lesgeven, niet administreren. Alles wat je nodig hebt, niets wat je afleidt.' },

  'landing.teachMode.label': { en: 'Unique feature — found nowhere else', nl: 'Unieke functie — nergens anders' },
  'landing.teachMode.h2a': { en: 'Push your lesson live', nl: 'Stuur je les live' },
  'landing.teachMode.h2b': { en: 'to the student\'s screen.', nl: 'naar het scherm van de leerling.' },
  'landing.teachMode.body': { en: 'With Teach Mode, you control what the student sees. Press a block and it appears on their screen instantly — whether you\'re sitting next to them or teaching online. No other tool does this.', nl: 'Met Teach Mode bepaal jij wat de leerling ziet. Druk op een blok en het verschijnt direct op zijn scherm — of je nu naast hem zit of online lesgeeft. Geen andere tool doet dit.' },
  'landing.teachMode.bullet1': { en: 'Push videos, sheet music and exercises with one click', nl: 'Push video\'s, bladmuziek en oefenpatronen met één klik' },
  'landing.teachMode.bullet2': { en: 'Send a countdown timer straight to the student', nl: 'Stuur een afteltimer rechtstreeks naar de leerling' },
  'landing.teachMode.bullet3': { en: 'Activate the metronome on the student\'s screen', nl: 'Activeer de metronoom op het leerlingscherm' },
  'landing.teachMode.bullet4': { en: 'Students send feedback: raise hand, ask a question', nl: 'Leerlingen sturen feedback: hand opsteken, vraag stellen' },
  'landing.teachMode.bullet5': { en: 'Pause and send a message to the screen', nl: 'Pauzeer en stuur een bericht naar het scherm' },
  'landing.teachMode.mini.label': { en: '🎹 Teach Mode', nl: '🎹 Teach Mode' },

  'landing.features.label': { en: 'Everything included', nl: 'Alles inbegrepen' },
  'landing.features.h2a': { en: 'One subscription.', nl: 'Eén abonnement.' },
  'landing.features.h2b': { en: 'All tools.', nl: 'Alle tools.' },
  'landing.features.sub': { en: 'No add-ons. No hidden costs. No five separate apps.', nl: 'Geen losse add-ons. Geen verborgen kosten. Geen vijf aparte apps.' },
  'landing.features.1.title': { en: 'Never double-booked again', nl: 'Nooit meer dubbel geboekt' },
  'landing.features.1.body': { en: 'Recurring lessons, holidays and conflicts — MusicDott makes it impossible to make mistakes.', nl: 'Terugkerende lessen, vakanties en conflicten — MusicDott maakt het onmogelijk je te vergissen.' },
  'landing.features.2.title': { en: 'Get paid automatically every month', nl: 'Word elke maand automatisch betaald' },
  'landing.features.2.body': { en: 'Connect Stripe, set your price and forget it. Invoices and billing run automatically.', nl: 'Koppel Stripe, stel de prijs in en vergeet het. Facturen en incasso lopen automatisch.' },
  'landing.features.3.title': { en: '19 block types for the perfect lesson', nl: '19 bloktypen voor een perfecte les' },
  'landing.features.3.body': { en: 'Sheet music, video, tabs, drum patterns, text, assignments — everything composed into one lesson.', nl: 'Noten, video, tabs, drumpatronen, tekst, opdrachten — alles in één les samengesteld.' },
  'landing.features.4.title': { en: 'Homework students actually complete', nl: 'Huiswerk dat leerlingen ook maken' },
  'landing.features.4.body': { en: 'Assign tasks with deadlines, track who\'s done what and give feedback right in the app.', nl: 'Wijs opdrachten toe met deadlines, volg wie het heeft gedaan en geef feedback direct in de app.' },
  'landing.features.5.title': { en: 'Students who stay motivated', nl: 'Leerlingen die gemotiveerd blijven' },
  'landing.features.5.body': { en: 'XP points, badges and a leaderboard make practicing more fun than skipping it.', nl: 'XP-punten, badges en een leaderboard maken oefenen leuker dan niet oefenen.' },
  'landing.features.6.title': { en: 'Always know how they\'re doing', nl: 'Altijd weten hoe het gaat' },
  'landing.features.6.body': { en: 'Attendance, progress and practice time per student — without maintaining spreadsheets.', nl: 'Aanwezigheid, voortgang en oefentijd per leerling — zonder spreadsheets bij te houden.' },

  'landing.social.label': { en: 'What teachers say', nl: 'Wat docenten zeggen' },
  'landing.social.h2a': { en: 'Trusted by music teachers', nl: 'Vertrouwd door muziekdocenten' },
  'landing.social.h2b': { en: 'across the Netherlands.', nl: 'door heel Nederland.' },
  'landing.social.t1.quote': { en: 'I save at least 4 hours every week now. No more WhatsApp groups, no more manually sending invoices. My students are more engaged too — the Teaching Screen is a real game-changer.', nl: 'Ik bespaar nu minstens 4 uur per week. Geen WhatsApp-groepen meer, geen facturen handmatig sturen. Mijn leerlingen zijn ook meer betrokken — het Lesscherm is echt een gamechanger.' },
  'landing.social.t1.role': { en: 'Piano teacher', nl: 'Pianodocente' },
  'landing.social.t2.quote': { en: 'The automatic billing alone pays for the subscription. I literally stopped chasing payments.', nl: 'De automatische facturering alleen al betaalt het abonnement terug. Ik heb letterlijk gestopt met betalingen najagen.' },
  'landing.social.t2.role': { en: 'Guitar teacher', nl: 'Gitaarleraar' },
  'landing.social.t3.quote': { en: 'We went from 4 separate tools to MusicDott. Our teachers were skeptical — after one week they didn\'t want to go back.', nl: 'We zijn van 4 losse tools naar MusicDott gegaan. Onze docenten waren sceptisch — na een week wilden ze niet meer terug.' },
  'landing.social.t3.role': { en: 'School director', nl: 'Schooldirecteur' },
  'landing.social.logosLabel': { en: 'Used by schools across the Netherlands', nl: 'Gebruikt door scholen door heel Nederland' },

  'landing.faq.label': { en: 'Frequently asked questions', nl: 'Veelgestelde vragen' },
  'landing.faq.h2': { en: 'Your questions, answered honestly.', nl: 'Je vragen, eerlijk beantwoord.' },
  'landing.faq.1.q': { en: 'Who is MusicDott for?', nl: 'Voor wie is MusicDott?' },
  'landing.faq.1.a': { en: 'Music schools and private teachers alike — from 1 student to a hundred. School owners manage their teachers and students; individual teachers work directly with their own group. The platform scales automatically.', nl: 'Muziekscholen én privédocenten — van 1 leerling tot honderd. Schooleigenaren beheren hun docenten en leerlingen; individuele leraren werken direct met hun eigen groep. Het platform schaalt automatisch mee.' },
  'landing.faq.2.q': { en: 'What does it actually cost?', nl: 'Wat kost het precies?' },
  'landing.faq.2.a': { en: 'Standard: €29.95/month (up to 25 students, 1 teacher). Pro: €49.95/month (up to 50 students, unlimited teachers + Teaching Screen). No hidden fees, no setup costs, no contracts.', nl: 'Standard: €29,95/maand (tot 25 leerlingen, 1 docent). Pro: €49,95/maand (tot 50 leerlingen, onbeperkt docenten + Teach Mode). Geen verborgen kosten, geen opstartkosten, geen contracten.' },
  'landing.faq.3.q': { en: 'Can I try it for free?', nl: 'Kan ik gratis uitproberen?' },
  'landing.faq.3.a': { en: 'Yes — 14 days full access, no credit card required. If you\'re not happy, you pay nothing. And if after the trial you\'re still not convinced, you can get your money back within 30 days.', nl: 'Ja — 14 dagen volledige toegang, geen creditcard nodig. Als je niet tevreden bent, betaal je niks. En als je na de proefperiode toch niet overtuigd bent, kun je binnen 30 dagen je geld terug vragen.' },
  'landing.faq.4.q': { en: 'Does it work for group lessons?', nl: 'Werkt het ook voor groepslessen?' },
  'landing.faq.4.a': { en: 'Absolutely. MusicDott supports individual and group lessons. You can link multiple students to one lesson, push the Teaching Screen to multiple screens at once, and track progress per student.', nl: 'Absoluut. MusicDott ondersteunt individuele lessen én groepslessen. Je kunt meerdere leerlingen koppelen aan één les, het Lesscherm pushen naar meerdere schermen tegelijk, en voortgang per leerling bijhouden.' },
  'landing.faq.5.q': { en: 'How exactly does the Teaching Screen work?', nl: 'Hoe werkt het Lesscherm precies?' },
  'landing.faq.5.a': { en: 'You open Teach Mode on your screen. The student opens the student view on their device (laptop, tablet, phone). You decide what they see — video, sheet music, exercises — and push it live to their screen with one click. Real-time, zero delay.', nl: 'Je opent Teach Mode op jouw scherm. De leerling opent het leerlingscherm op zijn apparaat (laptop, tablet, telefoon). Jij bepaalt wat hij ziet — video, bladmuziek, oefenpatronen — en stuurt dat met één druk live naar zijn scherm. Real-time, geen vertraging.' },
  'landing.faq.6.q': { en: 'Is my data safe?', nl: 'Is mijn data veilig?' },
  'landing.faq.6.a': { en: 'Yes. MusicDott is GDPR compliant. All data is stored on Dutch servers. We never sell data to third parties. You can export or delete everything at any time.', nl: 'Ja. MusicDott voldoet aan de AVG/GDPR. Alle data staat op Nederlandse servers. We verkopen nooit data aan derden. Je kunt alles op elk moment exporteren of verwijderen.' },
  'landing.faq.7.q': { en: 'Can I import my existing calendar?', nl: 'Kan ik mijn agenda importeren?' },
  'landing.faq.7.a': { en: 'Yes — iCal import and export. Google Calendar, Apple Calendar, Outlook — it all works. Your existing schedule transfers in a few clicks.', nl: 'Ja — iCal import én export. Google Calendar, Apple Calendar, Outlook — alles werkt. Je bestaande planning is in een paar klikken overgezet.' },
  'landing.faq.8.q': { en: 'How long does setup take?', nl: 'Hoe lang duurt de installatie?' },
  'landing.faq.8.a': { en: 'No installation needed. MusicDott runs in the browser, on desktop and mobile. Create account, invite students, done. Most schools are up and running within 15 minutes.', nl: 'Geen installatie nodig. MusicDott werkt in de browser, op desktop en mobiel. Account aanmaken, leerlingen uitnodigen, klaar. De meeste scholen zijn binnen 15 minuten operationeel.' },

  'landing.testimonial.quote': { en: '"MusicDott fundamentally changed how I teach. My students are more engaged than ever and I can see exactly where everyone stands — without a single spreadsheet."', nl: '"MusicDott heeft fundamenteel veranderd hoe ik lesgeef. Mijn leerlingen zijn meer betrokken dan ooit en ik zie precies waar iedereen staat — zonder één spreadsheet."' },
  'landing.testimonial.role': { en: 'Drum School Owner · Netherlands', nl: 'Eigenaar Drumschool · Nederland' },

  'landing.pricing.label': { en: 'Fair pricing', nl: 'Eerlijke prijzen', de: 'Faire Preise', es: 'Precios justos' },
  'landing.pricing.h2': { en: 'One price. Everything included.', nl: 'Eén prijs. Alles inbegrepen.', de: 'Ein Preis. Alles inklusive.', es: 'Un precio. Todo incluido.' },
  'landing.pricing.sub': { en: 'No hidden fees. No setup costs. No contracts.', nl: 'Geen verborgen kosten. Geen opstartkosten. Geen contracten.', de: 'Keine versteckten Gebühren. Keine Einrichtungskosten. Keine Verträge.', es: 'Sin tarifas ocultas. Sin costes de instalación. Sin contratos.' },
  'landing.pricing.standard.name': { en: 'Standard', nl: 'Standard', de: 'Standard', es: 'Estándar' },
  'landing.pricing.standard.f1': { en: 'Up to 25 students', nl: 'Tot 25 leerlingen', de: 'Bis zu 25 Schüler', es: 'Hasta 25 alumnos' },
  'landing.pricing.standard.f2': { en: '1 teacher account', nl: '1 docentaccount', de: '1 Lehrerkonto', es: '1 cuenta de profesor' },
  'landing.pricing.standard.f3': { en: 'Unlimited lessons & content', nl: 'Onbeperkte lessen & content', de: 'Unbegrenzte Stunden & Inhalte', es: 'Lecciones y contenido ilimitados' },
  'landing.pricing.standard.f4': { en: 'Progress tracking per student', nl: 'Voortgangsregistratie per leerling', de: 'Fortschrittsverfolgung pro Schüler', es: 'Seguimiento del progreso por alumno' },
  'landing.pricing.standard.f5': { en: 'Basic reports & analytics', nl: 'Basisrapportages & analyses', de: 'Grundlegende Berichte & Analysen', es: 'Informes y análisis básicos' },
  'landing.pricing.standard.f6': { en: 'Scheduling and planning', nl: 'Rooster en planning', de: 'Terminplanung', es: 'Horarios y planificación' },
  'landing.pricing.standard.cta': { en: 'Choose Standard', nl: 'Kies Standard', de: 'Standard wählen', es: 'Elegir Estándar' },
  'landing.pricing.pro.badge': { en: 'Most popular', nl: 'Meest gekozen', de: 'Am beliebtesten', es: 'Más popular' },
  'landing.pricing.pro.f1': { en: 'Up to 50 students', nl: 'Tot 50 leerlingen', de: 'Bis zu 50 Schüler', es: 'Hasta 50 alumnos' },
  'landing.pricing.pro.f2': { en: 'Unlimited teacher accounts', nl: 'Onbeperkte docentaccounts', de: 'Unbegrenzte Lehrerkonten', es: 'Cuentas de profesor ilimitadas' },
  'landing.pricing.pro.f3': { en: 'Teaching Screen — live student display', nl: 'Teach Mode — live leerlingscherm', de: 'Lehrmodus — Live-Schüleranzeige', es: 'Modo enseñanza — pantalla en vivo del alumno' },
  'landing.pricing.pro.f4': { en: 'Advanced analytics & insights', nl: 'Geavanceerde analyses & inzichten', de: 'Erweiterte Analysen & Einblicke', es: 'Análisis e información avanzados' },
  'landing.pricing.pro.f5': { en: 'Priority support', nl: 'Prioriteitsondersteuning', de: 'Prioritäts-Support', es: 'Soporte prioritario' },
  'landing.pricing.pro.f6': { en: 'Custom branding and school colors', nl: 'Eigen branding en schoolkleuren', de: 'Eigenes Branding und Schulfarben', es: 'Marca propia y colores de escuela' },
  'landing.pricing.pro.cta': { en: 'Choose Pro', nl: 'Kies Pro', de: 'Pro wählen', es: 'Elegir Pro' },
  'landing.pricing.perMonth': { en: '/month', nl: '/maand', de: '/Monat', es: '/mes' },
  'landing.pricing.footerNote': { en: 'More students? {extra} per 5 students/month · 30-day money-back guarantee · No setup costs · Cancel anytime', nl: 'Meer leerlingen? {extra} per 5 leerlingen/maand · 30 dagen niet-goed-geld-terug · Geen opstartkosten · Opzeggen wanneer je wilt', de: 'Mehr Schüler? {extra} pro 5 Schüler/Monat · 30 Tage Geld-zurück-Garantie · Keine Einrichtungskosten · Jederzeit kündbar', es: '¿Más alumnos? {extra} por 5 alumnos/mes · Garantía de devolución de 30 días · Sin costes de instalación · Cancela cuando quieras' },

  'landing.footerCta.h2a': { en: 'Stop tonight', nl: 'Stop vanavond', de: 'Schluss heute Abend', es: 'Termina esta noche' },
  'landing.footerCta.h2b': { en: 'with the chaos.', nl: 'met de chaos.', de: 'mit dem Chaos.', es: 'con el caos.' },
  'landing.footerCta.sub': { en: 'Take the first step toward more time for music — and less time for nonsense. Try it free, no commitments.', nl: 'Zet de eerste stap naar meer tijd voor muziek — en minder tijd voor gedoe. Gratis proberen, geen verplichtingen.', de: 'Machen Sie den ersten Schritt zu mehr Zeit für Musik — und weniger Zeit für Verwaltungskram. Kostenlos testen, keine Bindung.', es: 'Da el primer paso hacia más tiempo para la música y menos para el papeleo. Pruébalo gratis, sin compromisos.' },
  'landing.footerCta.cta': { en: 'Start free — no credit card needed', nl: 'Start gratis — geen creditcard nodig', de: 'Kostenlos starten — keine Kreditkarte erforderlich', es: 'Empieza gratis — sin tarjeta de crédito' },
  'landing.footerCta.legal': { en: '14 days free · Full access · Cancel anytime', nl: '14 dagen gratis · Volledige toegang · Opzeggen wanneer je wilt' },
  'landing.footerCta.madeIn': { en: 'Proudly built in The Netherlands 🇳🇱', nl: 'Proudly built in The Netherlands 🇳🇱' },

  'landing.nav.login': { en: 'Log in', nl: 'Inloggen', de: 'Anmelden', es: 'Iniciar sesión' },
  'landing.nav.startFree': { en: 'Start free →', nl: 'Start gratis →', de: 'Kostenlos starten →', es: 'Empezar gratis →' },

  'landing.audience.label': { en: 'For everyone in music education', nl: 'Voor iedereen in de muziekles' },
  'landing.audience.h2': { en: 'Three roles. One platform.', nl: 'Drie mensen. Één platform.' },
  'landing.audience.owner.tag': { en: 'For the school owner', nl: 'Voor de schooleigenaar' },
  'landing.audience.owner.title': { en: 'Your school, under control', nl: 'Jouw school, onder controle' },
  'landing.audience.owner.sub': { en: 'Complete overview of students, teachers and lesson content — without spreadsheets.', nl: 'Compleet overzicht van leerlingen, docenten en lesinhoud — zonder spreadsheets.' },
  'landing.audience.owner.f1': { en: 'Manage multiple teachers and classes', nl: 'Meerdere docenten en klassen beheren' },
  'landing.audience.owner.f2': { en: 'Dashboard with students, lessons and activity', nl: 'Dashboard met leerlingen, lessen en activiteit' },
  'landing.audience.owner.f3': { en: 'Analytics: who\'s behind, what\'s working?', nl: 'Analyses: wie loopt achter, wat werkt?' },
  'landing.audience.owner.f4': { en: 'Holiday periods and schedule management', nl: 'Vakantieperiodes en roosterbeheer' },
  'landing.audience.owner.f5': { en: 'Custom branding: logo, colors, school name', nl: 'Eigen branding: logo, kleuren, schoolnaam' },
  'landing.audience.owner.f6': { en: 'Invite students and link them to teachers', nl: 'Leerlingen uitnodigen en koppelen aan docenten' },
  'landing.audience.owner.f7': { en: 'GDPR compliant without extra effort', nl: 'AVG-compliant zonder extra moeite' },
  'landing.audience.teacher.tag': { en: 'For the teacher', nl: 'Voor de docent' },
  'landing.audience.teacher.title': { en: 'Just teach great lessons', nl: 'Gewoon goede les geven' },
  'landing.audience.teacher.sub': { en: 'Everything you need to build great lessons and truly get to know your students.', nl: 'Alles wat je nodig hebt om geweldige lessen te bouwen en je leerlingen écht te leren kennen.' },
  'landing.audience.teacher.f1': { en: 'Build lessons with 19 block types', nl: 'Lessen bouwen met 19 bloktypen' },
  'landing.audience.teacher.f2': { en: 'Teaching Screen: push content live to the student', nl: 'Teach Mode: stuur content live naar de leerling' },
  'landing.audience.teacher.f3': { en: 'Control timer and metronome from within the lesson', nl: 'Timer en metronoom vanuit de les bedienen' },
  'landing.audience.teacher.f4': { en: 'Track progress and achievements per student', nl: 'Voortgang en prestaties per leerling volgen' },
  'landing.audience.teacher.f5': { en: 'Assign tasks with deadlines', nl: 'Opdrachten met deadlines toewijzen' },
  'landing.audience.teacher.f6': { en: 'Schedule with recurring lessons', nl: 'Rooster met terugkerende lessen' },
  'landing.audience.teacher.f7': { en: 'Students send questions through the app', nl: 'Leerlingen sturen een vraag via de app' },
  'landing.audience.teacher.f8': { en: 'Award achievements and points', nl: 'Achievements en punten uitdelen' },
  'landing.audience.student.tag': { en: 'For the student', nl: 'Voor de leerling' },
  'landing.audience.student.title': { en: 'Learn music your way', nl: 'Muziek leren op jouw manier' },
  'landing.audience.student.sub': { en: 'Your own space with all lessons, assignments and achievements in one place.', nl: 'Een eigen omgeving met alle lessen, opdrachten en behaalde mijlpalen op één plek.' },
  'landing.audience.student.f1': { en: 'All assigned lessons instantly available', nl: 'Alle toegewezen lessen direct beschikbaar' },
  'landing.audience.student.f2': { en: 'Assignments with deadlines and status', nl: 'Opdrachten met deadlines en status' },
  'landing.audience.student.f3': { en: 'Personal schedule and planned lessons', nl: 'Eigen rooster en geplande lessen' },
  'landing.audience.student.f4': { en: 'Earn achievements, badges and points', nl: 'Achievements, badges en punten verdienen' },
  'landing.audience.student.f5': { en: 'Leaderboard: who has the most points?', nl: 'Ranglijst: wie heeft de meeste punten?' },
  'landing.audience.student.f6': { en: 'Rewards store: redeem points', nl: 'Beloningswinkel: punten inwisselen' },
  'landing.audience.student.f7': { en: 'Ask questions to the teacher', nl: 'Vragen stellen aan de docent' },
  'landing.audience.student.f8': { en: 'Track practice sessions', nl: 'Oefensessies bijhouden' },

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
export const isValidLanguage = (lang: unknown): lang is Language =>
  lang === 'en' || lang === 'nl' || lang === 'de' || lang === 'es';

export const getStoredLanguage = (): Language => {
  try {
    const stored = localStorage.getItem('musicdott-language');
    return isValidLanguage(stored) ? stored : 'en';
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
    if (browserLang.startsWith('de')) return 'de';
    if (browserLang.startsWith('es')) return 'es';
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