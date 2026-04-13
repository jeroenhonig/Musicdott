import RouteSeo from "@/components/seo/route-seo";

type PageConfig = {
  path: string;
  title: string;
  description: string;
  eyebrow: string;
  headline: string;
  subhead: string;
  audience: string;
  outcomes: string[];
  featureCards: Array<{ title: string; body: string }>;
  workflow: string[];
  faq: Array<{ q: string; a: string }>;
  lang?: string;
};

const APP_ORIGIN = "https://musicdott.app";

const COMMON_CTA = [
  { label: "Start free trial", href: "/signup" },
  { label: "Open app login", href: "/auth" },
];

const pages: Record<string, PageConfig> = {
  musicSchoolManagement: {
    path: "/music-school-management-software",
    title: "Music School Management Software | Scheduling, Lessons, Billing | MusicDott",
    description:
      "MusicDott helps music schools manage schedules, students, lessons, assignments and billing in one platform built for teachers and school teams.",
    eyebrow: "MusicDott for Schools",
    headline: "Run your music school from one operational workspace",
    subhead:
      "Replace scattered spreadsheets, messages and lesson docs with a shared platform for scheduling, lesson building, student tracking and daily school operations.",
    audience: "School owners, coordinators and multi-teacher music schools",
    outcomes: [
      "Centralize recurring schedules, make-up lessons and teacher planning",
      "Standardize lesson and song libraries with reusable content blocks",
      "Track student progress and assignments without extra admin tools",
      "Reduce import migration risk with preview-first JSON and POS sync workflows",
    ],
    featureCards: [
      {
        title: "Operational Calendar",
        body: "Recurring schedules, drag-and-drop changes and teacher planning flows are built into the same workspace as students and lessons.",
      },
      {
        title: "Structured Lesson Content",
        body: "Build lessons and songs with GrooveScribe, video, Spotify, PDFs and links as reusable blocks that stay editable after import.",
      },
      {
        title: "School-Safe Imports",
        body: "Preview and sync data from legacy exports and POS sources with duplicate detection and block normalization.",
      },
      {
        title: "Teacher + Student Workflows",
        body: "Give teachers editing tools while students get assignments, schedules and learning resources in a single platform.",
      },
    ],
    workflow: [
      "Import or sync your existing songs and lessons",
      "Normalize content into reusable lesson/song blocks",
      "Schedule recurring lessons per teacher or student",
      "Assign content and track progress per student",
    ],
    faq: [
      {
        q: "Can MusicDott handle both private teachers and larger schools?",
        a: "Yes. It supports teacher-level workflows and school-wide organization, including shared content libraries and scheduling.",
      },
      {
        q: "Can we import existing lesson/song content?",
        a: "Yes. JSON imports and POS sync flows can transform legacy content into editable content blocks used by the lesson and song builders.",
      },
      {
        q: "Is this only for drums?",
        a: "No. The platform supports multi-instrument teaching workflows, while also handling drum-specific notation and GrooveScribe use cases.",
      },
    ],
  },
  musicTeacherScheduling: {
    path: "/music-teacher-scheduling-software",
    title: "Music Teacher Scheduling Software | Recurring Lessons & Calendar | MusicDott",
    description:
      "Recurring lesson schedules, drag-and-drop updates and student-linked planning for music teachers who need a practical calendar workflow.",
    eyebrow: "Scheduling for Teachers",
    headline: "Recurring lesson scheduling that matches how teachers actually work",
    subhead:
      "Create recurring schedules, move sessions quickly and keep lessons connected to students, assignments and content instead of managing separate systems.",
    audience: "Private music teachers and school teachers managing weekly lesson calendars",
    outcomes: [
      "Create recurring schedules faster with teacher and student context",
      "Update lesson times with fewer manual edits",
      "Keep schedule data aligned with student records",
      "Reduce missed follow-up after reschedules",
    ],
    featureCards: [
      {
        title: "Recurring Schedule Engine",
        body: "Weekly and biweekly lesson schedules are stored as structured recurring entries, not ad-hoc calendar notes.",
      },
      {
        title: "Calendar Interactions",
        body: "Move and adjust scheduled lessons visually while keeping the underlying schedule record consistent.",
      },
      {
        title: "Student-Centered Scheduling",
        body: "Create recurring schedules directly from student contexts so lessons stay tied to the right records and follow-up workflows.",
      },
      {
        title: "Import-Compatible Data Model",
        body: "Legacy payload aliases are normalized in the API, so older forms and imported data can still work while the platform standardizes on frequency/dayOfWeek.",
      },
    ],
    workflow: [
      "Add recurring schedule with frequency and weekday",
      "Review entries in the calendar and list views",
      "Move or resize sessions when changes happen",
      "Generate or track related lessons and assignments",
    ],
    faq: [
      {
        q: "Does it support recurring weekly lessons?",
        a: "Yes. The scheduling model supports recurring schedules including weekly and biweekly patterns for lesson planning.",
      },
      {
        q: "Can school owners see teacher schedules?",
        a: "The platform supports school-context scheduling visibility while keeping authorization rules in place for protected actions.",
      },
      {
        q: "Can I still use existing schedule forms built with older field names?",
        a: "Yes. The backend normalizes legacy recurrence payloads to the current frequency-based model.",
      },
    ],
  },
  drumTeacher: {
    path: "/drum-teacher-software",
    title: "Drum Teacher Software | GrooveScribe Lessons, Songs & Scheduling | MusicDott",
    description:
      "Build drum lessons and songs with GrooveScribe, video and PDFs, then schedule students and track progress in one drum teaching platform.",
    eyebrow: "Drum Teaching Workflow",
    headline: "From GrooveScribe patterns to complete drum lessons",
    subhead:
      "MusicDott is built to support notation-heavy drum teaching workflows, including GrooveScribe blocks, song content, recurring lessons and student progress tracking.",
    audience: "Drum teachers and drum schools using GrooveScribe, notation and media-rich lessons",
    outcomes: [
      "Create reusable GrooveScribe lesson modules",
      "Combine notation, videos, PDFs and links in one lesson/song builder",
      "Keep imported patterns editable instead of freezing them as plain text",
      "Connect drum content to recurring student lessons",
    ],
    featureCards: [
      {
        title: "GrooveScribe Block Support",
        body: "Groove URLs and legacy embedded shapes are normalized into stable GrooveScribe blocks that render and edit consistently.",
      },
      {
        title: "Song + Lesson Builders",
        body: "Use the same block system across songs and lessons so your notation resources stay reusable.",
      },
      {
        title: "Import Normalization",
        body: "Legacy JSON and POS sync imports are transformed into modern block types like groovescribe, youtube, spotify and pdf.",
      },
      {
        title: "Student Delivery",
        body: "Assign content and keep lesson materials accessible from student-facing workflows.",
      },
    ],
    workflow: [
      "Import existing drum notation resources",
      "Normalize GrooveScribe and media into blocks",
      "Build drum lessons and song references",
      "Schedule and deliver content to students",
    ],
    faq: [
      {
        q: "Does GrooveScribe content remain editable after import?",
        a: "Yes. Groove and GrooveScribe blocks are normalized so they can render and open correctly in editor flows.",
      },
      {
        q: "Can I mix notation with video and PDFs in one lesson?",
        a: "Yes. The content block system supports mixed lesson and song resources in the same record.",
      },
      {
        q: "Can this replace a drum-teaching spreadsheet workflow?",
        a: "That is the intended use case: scheduling, content, assignments and student records live in one workflow.",
      },
    ],
  },
  schoolsNetherlands: {
    path: "/music-school-software/netherlands",
    title: "Music School Software Netherlands | MusicDott",
    description:
      "MusicDott helps Dutch music schools manage teachers, students, recurring lessons and lesson content in one platform.",
    eyebrow: "NL Market",
    headline: "Music school software for teams in the Netherlands",
    subhead:
      "Designed for practical teaching operations: recurring schedules, lesson planning and student organization in one shared workflow for schools and teachers.",
    audience: "Dutch music schools and independent teachers scaling beyond spreadsheets",
    outcomes: [
      "Shared school and teacher workflows",
      "Reusable lesson and song content blocks",
      "Recurring schedule management",
      "Migration support via import tools",
    ],
    featureCards: [
      { title: "School Context", body: "Teachers and school owners can work inside the same school data model with protected access patterns." },
      { title: "Import Tools", body: "JSON import and POS sync flows reduce migration friction for existing content libraries." },
      { title: "Lesson Builders", body: "Create instrument-specific lessons with text, media and notation content blocks." },
      { title: "Planning", body: "Recurring schedules and student-linked planning support day-to-day teaching operations." },
    ],
    workflow: [
      "Set up school and teachers",
      "Import existing resources",
      "Build standardized lesson libraries",
      "Roll out recurring schedules per teacher",
    ],
    faq: [
      { q: "Can we start with one teacher and expand later?", a: "Yes. The workflow supports individual teachers and larger school setups without changing tools." },
      { q: "Do imported lessons work with the editor?", a: "The import pipeline normalizes blocks so imported records open and render in current viewers/editors." },
    ],
  },
  schoolsGermany: {
    path: "/music-school-software/germany",
    title: "Music School Software Germany | MusicDott",
    description:
      "A practical music school platform for German schools and teachers managing schedules, lesson content and student workflows.",
    eyebrow: "DE Market",
    headline: "Operational music school software for German teaching teams",
    subhead:
      "Coordinate teachers, recurring lessons and content libraries with a single system designed around music education workflows instead of generic admin tooling.",
    audience: "Music schools and private teachers in Germany",
    outcomes: [
      "Centralized scheduling and student-linked lesson planning",
      "Structured content blocks for modern music teaching",
      "Import-first migration path",
      "Scalable workflow for multi-teacher schools",
    ],
    featureCards: [
      { title: "Teacher Coordination", body: "School teams can manage recurring lesson schedules and shared content workflows more consistently." },
      { title: "Media-Rich Lessons", body: "Use videos, GrooveScribe, PDFs and links inside structured lesson and song blocks." },
      { title: "Migration Path", body: "Bulk imports and sync previews reduce rollout risk during migration from legacy data." },
      { title: "Protected App Workflows", body: "Public pages can be indexed while the operational app remains protected for staff and students." },
    ],
    workflow: [
      "Create school workspace",
      "Import songs and lessons",
      "Standardize content blocks",
      "Schedule recurring teaching slots",
    ],
    faq: [
      { q: "Is this only a website or a full app?", a: "It is a protected application for school operations, with public pages for discovery and evaluation." },
      { q: "Can drum-focused schools use it?", a: "Yes. GrooveScribe and notation-heavy drum workflows are supported alongside broader music-school use cases." },
    ],
  },
  muziekschoolSoftwareNL: {
    path: "/muziekschool-software",
    title: "Muziekschool Software | Roosters, Lessen & Leerlingbeheer | MusicDott",
    description: "MusicDott is de software voor muziekscholen in Nederland. Plan roosters, bouw lessen, beheer leerlingen en factureer — alles op één plek. Gratis proberen.",
    eyebrow: "Voor Nederlandse muziekscholen",
    headline: "Stop met Excel. Begin met MusicDott.",
    subhead: "Muziekscholen die overstappen besparen gemiddeld 4 uur per week op administratie. Alles wat je nu in WhatsApp, Excel en losse apps doet, zit in één platform.",
    audience: "Muziekschooleigenaren, coördinatoren en privé-muziekleraren in Nederland",
    outcomes: [
      "Nooit meer dubbele boekingen — slim roosterbeheer per leraar en leerling",
      "Lessen bouwen met video, noten, Spotify en PDF in één editor",
      "Leerlingdossiers, aanwezigheid en voortgang op één plek",
      "Facturering per leerling, automatisch berekend op basis van lessen",
    ],
    featureCards: [
      { title: "Slimme Roostering", body: "Wekelijkse en tweewekelijkse roosters, inhaallessen en beschikbaarheidsbeheer — zonder WhatsApp-groepen." },
      { title: "Lessenbuilder", body: "Bouw lessen met GrooveScribe-notatie, YouTube-video, Spotify-fragmenten, PDF en externe links als herbruikbare blokken." },
      { title: "Leerlingdossier", body: "Bijhouden van aanwezigheid, notities per les, oefenlogboek en voortgang per leerling — zichtbaar voor leraar én eigenaar." },
      { title: "Teach Mode", body: "Geef les in real-time via het platform. Stuur noten, video en opdrachten live naar de leerling tijdens de les." },
    ],
    workflow: [
      "Maak je school aan en voeg leraren toe",
      "Importeer bestaande lessen en nummers",
      "Plan herhalende roosters per leraar",
      "Wijs lessen en opdrachten toe aan leerlingen",
    ],
    faq: [
      { q: "Is MusicDott alleen voor drumscholen?", a: "Nee. MusicDott ondersteunt alle muziekinstrumenten. De notatiefuncties zijn extra krachtig voor drumslagen (GrooveScribe), maar het platform werkt voor elke muziekschool." },
      { q: "Kan ik starten met één leraar en later uitbreiden?", a: "Ja. Je begint als privé-leraar en voegt eenvoudig extra leraren, leerlingen en roosters toe naarmate je school groeit." },
      { q: "Hoe lang duurt het om te starten?", a: "De meeste scholen zijn binnen een middag volledig ingericht. Je kunt bestaande lessen importeren of direct beginnen met bouwen." },
    ],
    lang: "nl",
  },
  drumlesSoftwareNL: {
    path: "/drum-les-software",
    title: "Drum Les Software | GrooveScribe, Roosters & Leerlingbeheer | MusicDott",
    description: "Software speciaal voor drumdocenten en drumscholen. Bouw lessen met GrooveScribe, plan herhalende roosters en volg de voortgang van elke leerling.",
    eyebrow: "Voor drumdocenten en drumscholen",
    headline: "Jouw drumschool verdient betere software dan Excel",
    subhead: "MusicDott is gebouwd voor de manier waarop drumdocenten werken: GrooveScribe-patronen, herhalende roosters, en leerlingvoortgang die je écht kunt bijhouden.",
    audience: "Privé-drumdocenten en drumscholen die GrooveScribe en notatie gebruiken",
    outcomes: [
      "GrooveScribe-patronen direct in lessen — geen losse links meer",
      "Herhalende wekelijkse roosters zonder handmatig bijhouden",
      "Leerlingvoortgang en aanwezigheid bijhouden per les",
      "Bestaande patronen en lessen importeren en hergebruiken",
    ],
    featureCards: [
      { title: "GrooveScribe Integratie", body: "Voeg drumpatronen toe als interactieve GrooveScribe-blokken. Leerlingen zien het patroon direct, jij kunt het live aanpassen tijdens de les." },
      { title: "Rooster op maat", body: "Wekelijkse en tweewekelijkse lessen per leerling, met ondersteuning voor inhaallessen en beschikbaarheidsuitzonderingen." },
      { title: "Teach Mode voor Drum", body: "Geef les op afstand of live via het platform. Stuur notatie, video en oefeningen real-time naar de leerling." },
      { title: "Leerlingdossier", body: "Per leerling: aanwezigheid, leraarnotities, oefenlogboek, punten en behaalde mijlpalen." },
    ],
    workflow: [
      "Importeer bestaande drumpatronen en lessen",
      "Bouw herbruikbare lesmodules met GrooveScribe",
      "Plan wekelijkse roosters per leerling",
      "Volg voortgang en geef feedback via Teach Mode",
    ],
    faq: [
      { q: "Werkt het ook met andere notatieprogramma's dan GrooveScribe?", a: "Ja. Naast GrooveScribe ondersteunt MusicDott YouTube-video, Spotify, PDF, bladmuziek (ABC-notatie) en externe links als lesblokken." },
      { q: "Kan ik mijn bestaande GrooveScribe-links importeren?", a: "Ja. De importfunctie normaliseert bestaande GrooveScribe-URL's naar herbruikbare blokken die je daarna kunt bewerken." },
      { q: "Werkt MusicDott voor zowel privélessen als groepslessen?", a: "Ja. Je kunt lessen toewijzen aan individuele leerlingen of aan meerdere leerlingen tegelijk." },
    ],
    lang: "nl",
  },
  muziekschoolPlanningNL: {
    path: "/muziekschool-planning",
    title: "Muziekschool Planning & Roosters | MusicDott",
    description: "Plan herhalende roosters, beheer leraarsbeschikbaarheid en stuur automatische reminders voor je muziekschool. MusicDott vervangt Excel en WhatsApp.",
    eyebrow: "Roosters & Planning",
    headline: "Nooit meer een dubbele boeking in je muziekschool",
    subhead: "MusicDott detecteert conflicten automatisch, beheert herhalende roosters per leraar en houdt leerlingrooster gesynchroniseerd — zonder WhatsApp-berichten.",
    audience: "Muziekscholen met meerdere leraren en drukke roosters",
    outcomes: [
      "Automatische conflictdetectie bij dubbele boekingen",
      "Wekelijkse en tweewekelijkse herhalende roosters",
      "Leerling- en leraaroverzicht in één kalenderweergave",
      "Inhaallessen en uitzonderingen eenvoudig inplannen",
    ],
    featureCards: [
      { title: "Conflictdetectie", body: "Het systeem waarschuwt direct bij dubbele boekingen — voor leraar én leerling — nog voordat je opslaat." },
      { title: "Herhalende Roosters", body: "Stel één keer wekelijkse of tweewekelijkse lessen in. MusicDott herhaalt automatisch en past aan bij uitzonderingen." },
      { title: "Kalenderoverzicht", body: "Zie de hele week per leraar of voor de hele school. Filter op leerling, leraar of instrument." },
      { title: "Leerlingkoppeling", body: "Roosters zijn direct gekoppeld aan leerlingdossiers, zodat aanwezigheid en notities altijd bij de juiste les staan." },
    ],
    workflow: [
      "Voeg leraren en hun beschikbaarheid toe",
      "Plan herhalende lessen per leerling",
      "Bekijk de weekkalender en los conflicten op",
      "Exporteer roosters of stuur reminders",
    ],
    faq: [
      { q: "Kan ik de beschikbaarheid van leraren instellen?", a: "Ja. Per leraar kun je vaste beschikbaarheidstijden instellen en uitzonderingen (vakantie, ziekte) toevoegen." },
      { q: "Werkt het met inhaallessen?", a: "Ja. Je kunt inhaallessen plannen en de reden bijhouden in het leerlingdossier." },
      { q: "Hoeveel leraren kan ik toevoegen?", a: "Er is geen vaste limiet. Het Standard-plan ondersteunt meerdere leraren; het Pro-plan is onbeperkt schaalbaar." },
    ],
    lang: "nl",
  },
  schoolsWorldwide: {
    path: "/music-school-software/international",
    title: "International Music School Platform | MusicDott",
    description:
      "A music education platform for schools and teachers who need scalable scheduling, content and student workflows across teams and markets.",
    eyebrow: "Global Growth",
    headline: "Build one operational system for a growing music education team",
    subhead:
      "MusicDott combines scheduling, lesson/song builders and import tooling to help schools standardize workflows before scaling to more teachers, instruments or regions.",
    audience: "Schools preparing multi-location or multi-market growth",
    outcomes: [
      "Consistent lesson and song structures across teachers",
      "Safer migrations through import previews and normalization",
      "Shared scheduling model for recurring lessons",
      "SEO-ready public discovery pages plus protected app operations",
    ],
    featureCards: [
      { title: "Structured Data Layer", body: "Songs and lessons are built from normalized content blocks, which makes content easier to reuse and migrate." },
      { title: "Team Workflows", body: "School owners and teachers operate in the same platform with role-based access and school context." },
      { title: "Import Reliability", body: "Normalization and duplicate checks reduce common migration errors in older music content datasets." },
      { title: "Growth Foundation", body: "Public SEO pages can target roles, instruments and countries while the app remains a secure workspace." },
    ],
    workflow: [
      "Start with one school workflow",
      "Import and normalize legacy content",
      "Standardize scheduling and lesson building",
      "Expand with public market-specific landing pages",
    ],
    faq: [
      { q: "Can we localize pages by market later?", a: "Yes. The route SEO layer supports route-specific metadata and alternate links for future language/market pages." },
      { q: "Does this require replacing teaching content?", a: "No. Existing content can be imported and normalized into the current block model." },
    ],
  },
};

function getAbsoluteUrl(path: string) {
  return `${APP_ORIGIN}${path}`;
}

function PublicLandingPage({ page }: { page: PageConfig }) {
  const canonical = getAbsoluteUrl(page.path);
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: page.headline,
      description: page.description,
      url: canonical,
      inLanguage: "en",
      isPartOf: {
        "@type": "WebSite",
        name: "MusicDott",
        url: APP_ORIGIN,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faq.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.a,
        },
      })),
    },
  ];

  return (
    <>
      <RouteSeo
        title={page.title}
        description={page.description}
        canonical={canonical}
        robots="index, follow"
        alternates={[
          { hreflang: page.lang ?? "en", href: canonical },
          { hreflang: "x-default", href: canonical },
        ]}
        jsonLd={jsonLd}
      />

      <main className="min-h-screen bg-slate-950 text-slate-100">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_18%,rgba(20,184,166,0.2),transparent_50%),radial-gradient(circle_at_88%_12%,rgba(59,130,246,0.22),transparent_55%),radial-gradient(circle_at_55%_75%,rgba(245,158,11,0.12),transparent_50%)]" />

        <header className="border-b border-white/10 bg-black/20 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
            <a href="/auth" className="text-sm font-semibold tracking-[0.16em] uppercase text-teal-300">
              MusicDott
            </a>
            <nav className="flex items-center gap-2">
              {COMMON_CTA.map((cta) => (
                <a
                  key={cta.href}
                  href={cta.href}
                  className="rounded-full border border-white/15 px-4 py-2 text-sm text-slate-100 transition hover:border-teal-300/60 hover:bg-white/5"
                >
                  {cta.label}
                </a>
              ))}
            </nav>
          </div>
        </header>

        <section className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:py-16">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-teal-300">{page.eyebrow}</p>
            <h1 className="text-balance font-serif text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">
              {page.headline}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">{page.subhead}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="/signup"
                className="rounded-full bg-teal-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-teal-300"
              >
                Start trial workflow
              </a>
              <a
                href="/auth"
                className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-amber-300/70 hover:bg-white/5"
              >
                Open platform
              </a>
            </div>
          </div>

          <aside className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Best fit</p>
            <p className="mt-2 text-lg font-semibold text-white">{page.audience}</p>
            <ul className="mt-5 space-y-3">
              {page.outcomes.map((outcome) => (
                <li key={outcome} className="flex items-start gap-3 text-sm leading-6 text-slate-200">
                  <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" />
                  <span>{outcome}</span>
                </li>
              ))}
            </ul>
          </aside>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
          <div className="grid gap-4 md:grid-cols-2">
            {page.featureCards.map((card) => (
              <article key={card.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h2 className="text-lg font-semibold text-white">{card.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">{card.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-6">
            <h2 className="text-2xl font-semibold text-white">How teams typically roll this out</h2>
            <ol className="mt-5 grid gap-3 sm:grid-cols-2">
              {page.workflow.map((step, index) => (
                <li key={step} className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-slate-200">
                  <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-400/20 text-xs font-bold text-blue-200">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-2xl font-semibold text-white">Built around music teaching operations</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                MusicDott combines protected app workflows with a structured content model for lessons and songs. That makes scheduling, imports and content editing work together instead of becoming separate projects.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Scheduling</p>
                  <p className="mt-2 text-sm text-slate-200">Recurring schedules with API normalization for legacy payload compatibility.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Content</p>
                  <p className="mt-2 text-sm text-slate-200">Reusable blocks for GrooveScribe, YouTube, Spotify, PDFs and external resources.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Migration</p>
                  <p className="mt-2 text-sm text-slate-200">Preview-first JSON import and POS sync workflows with duplicate checks and diagnostics.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Scale</p>
                  <p className="mt-2 text-sm text-slate-200">Public pages for discovery, protected app for operations and school/user authorization.</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-2xl font-semibold text-white">FAQ</h2>
              <div className="mt-4 space-y-4">
                {page.faq.map((item) => (
                  <details key={item.q} className="group rounded-xl border border-white/10 bg-black/20 p-4">
                    <summary className="cursor-pointer list-none text-sm font-medium text-white">
                      <span className="group-open:text-teal-200">{item.q}</span>
                    </summary>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{item.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>

        <footer className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Evaluate MusicDott for your school or teaching studio</p>
              <p className="mt-1 text-sm text-slate-300">Use the public page for discovery, then continue in the protected app workflow.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href="/signup" className="rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-200">Create account</a>
              <a href="/auth" className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/5">Login</a>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}

export function MusicSchoolManagementSeoPage() {
  return <PublicLandingPage page={pages.musicSchoolManagement} />;
}

export function MusicTeacherSchedulingSeoPage() {
  return <PublicLandingPage page={pages.musicTeacherScheduling} />;
}

export function DrumTeacherSeoPage() {
  return <PublicLandingPage page={pages.drumTeacher} />;
}

export function MusicSchoolSoftwareNetherlandsSeoPage() {
  return <PublicLandingPage page={pages.schoolsNetherlands} />;
}

export function MusicSchoolSoftwareGermanySeoPage() {
  return <PublicLandingPage page={pages.schoolsGermany} />;
}

export function MusicSchoolSoftwareInternationalSeoPage() {
  return <PublicLandingPage page={pages.schoolsWorldwide} />;
}

export function MuziekschoolSoftwareNLPage() {
  return <PublicLandingPage page={pages.muziekschoolSoftwareNL} />;
}

export function DrumlesSoftwareNLPage() {
  return <PublicLandingPage page={pages.drumlesSoftwareNL} />;
}

export function MuziekschoolPlanningNLPage() {
  return <PublicLandingPage page={pages.muziekschoolPlanningNL} />;
}
