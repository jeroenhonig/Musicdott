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
  'settings.title': {
    en: 'Settings',
    nl: 'Instellingen'
  },
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