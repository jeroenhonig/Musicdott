import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useTranslation } from "@/lib/i18n";

export function LandingFaq() {
  const { t } = useTranslation();

  const FAQ_ITEMS = [
    {
      id: "faq-1",
      question: t('landing.faq.1.q'),
      answer: t('landing.faq.1.a'),
    },
    {
      id: "faq-2",
      question: t('landing.faq.2.q'),
      answer: t('landing.faq.2.a'),
    },
    {
      id: "faq-3",
      question: t('landing.faq.3.q'),
      answer: t('landing.faq.3.a'),
    },
    {
      id: "faq-4",
      question: t('landing.faq.4.q'),
      answer: t('landing.faq.4.a'),
    },
    {
      id: "faq-5",
      question: t('landing.faq.5.q'),
      answer: t('landing.faq.5.a'),
    },
    {
      id: "faq-6",
      question: t('landing.faq.6.q'),
      answer: t('landing.faq.6.a'),
    },
    {
      id: "faq-7",
      question: t('landing.faq.7.q'),
      answer: t('landing.faq.7.a'),
    },
    {
      id: "faq-8",
      question: t('landing.faq.8.q'),
      answer: t('landing.faq.8.a'),
    },
  ];

  return (
    <section className="bg-gray-50 py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-flex text-xs font-bold tracking-widest uppercase text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full mb-4">
            {t('landing.faq.label')}
          </span>
          <h2 className="text-4xl sm:text-5xl font-black tracking-[-0.03em] text-[#1B2B6B] leading-tight">
            {t('landing.faq.h2')}
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
