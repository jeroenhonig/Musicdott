import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ_ITEMS = [
  {
    id: "faq-1",
    question: "Voor wie is MusicDott?",
    answer:
      "MusicDott is gebouwd voor muziekscholen én privéleraren. Of je nu één leerling hebt of honderd — het platform schaalt mee. Schooleigenaren beheren docenten en leerlingen; individuele leraren werken direct met hun eigen groep.",
  },
  {
    id: "faq-2",
    question: "Wat kost MusicDott?",
    answer:
      "We bieden twee plannen: Standard (€29,95/maand) voor tot 25 leerlingen en Professional (€49,95/maand) voor onbeperkte leerlingen en extra docenten. Beide plannen hebben geen verborgen kosten. Bekijk de volledige prijzen in de sectie hieronder.",
  },
  {
    id: "faq-3",
    question: "Kan ik gratis proberen?",
    answer:
      "Ja! Je krijgt 14 dagen gratis toegang tot alle functies, zonder creditcard. Na de proefperiode kies je een plan — of je stopt zonder kosten.",
  },
  {
    id: "faq-4",
    question: "Werkt het ook voor groepslessen?",
    answer:
      "Absoluut. MusicDott ondersteunt zowel individuele lessen als groepslessen. Je kunt leerlingen groeperen, gezamenlijke lesmaterialen delen en voortgang per leerling bijhouden, ook binnen een groepsles.",
  },
  {
    id: "faq-5",
    question: "Hoe werkt het Lesscherm?",
    answer:
      "Het Lesscherm (Teach Mode) is een real-time tweede scherm dat je tijdens de les gebruikt. Jij stuurt de inhoud — noten, video's, opdrachten — naar het scherm van de leerling. Alles is gesynchroniseerd, zodat je leerling exact ziet wat jij bedoelt.",
  },
  {
    id: "faq-6",
    question: "Is mijn data veilig?",
    answer:
      "Ja. MusicDott voldoet aan de AVG/GDPR-regelgeving. Alle data wordt opgeslagen op Nederlandse servers. We delen nooit data met derden en je kunt je data op elk moment exporteren of verwijderen.",
  },
  {
    id: "faq-7",
    question: "Kan ik mijn bestaande agenda importeren?",
    answer:
      "Ja, MusicDott ondersteunt iCal import en export. Je kunt je bestaande Google Calendar, Apple Calendar of Outlook agenda synchroniseren, zodat al je afspraken op één plek staan.",
  },
  {
    id: "faq-8",
    question: "Hoe lang duurt de installatie?",
    answer:
      "Er is geen installatie nodig. MusicDott werkt volledig in de browser — op desktop, tablet en mobiel. Je account is direct na aanmelden klaar voor gebruik. Gemiddeld zijn scholen binnen 15 minuten operationeel.",
  },
];

export function LandingFaq() {
  return (
    <section className="bg-gray-50 py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-flex text-xs font-bold tracking-widest uppercase text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full mb-4">
            Veelgestelde vragen
          </span>
          <h2 className="text-4xl sm:text-5xl font-black tracking-[-0.03em] text-[#1B2B6B] leading-tight">
            Alles wat je wilt weten
          </h2>
        </div>
        <Accordion type="single" collapsible className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {FAQ_ITEMS.map((item) => (
            <AccordionItem key={item.id} value={item.id} className="border-none px-6">
              <AccordionTrigger className="text-left font-semibold text-[#1B2B6B] hover:no-underline py-5">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-gray-500 leading-relaxed pb-5">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
