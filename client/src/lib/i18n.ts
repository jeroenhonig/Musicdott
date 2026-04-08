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

  // Navigation — additional
  'nav.analytics': {
    en: 'Analytics & Reports',
    nl: 'Analyses & Rapporten'
  },
  'nav.import': {
    en: 'Import Data',
    nl: 'Data Importeren'
  },
  'nav.resources': {
    en: 'Resources & Guides',
    nl: 'Bronnen & Handleidingen'
  },
  'nav.schoolManagement': {
    en: 'School Management',
    nl: 'Schoolbeheer'
  },
  'nav.teachers': {
    en: 'Teachers',
    nl: 'Docenten'
  },
  'nav.members': {
    en: 'Manage Members',
    nl: 'Leden Beheren'
  },
  'nav.billing': {
    en: 'Billing & Plans',
    nl: 'Facturering & Plannen'
  },
  'nav.schoolSettings': {
    en: 'School Settings',
    nl: 'Schoolinstellingen'
  },
  'nav.section.learningHub': {
    en: 'Learning Hub',
    nl: 'Leercentrum'
  },
  'nav.section.schoolManagement': {
    en: 'School Management',
    nl: 'Schoolbeheer'
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
  'lessons.view': {
    en: 'View',
    nl: 'Bekijken'
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