"use client";

import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/LocaleProvider";
import { SECTION_GUTTER, SECTION_SPACING } from "./section";

// Module scope cannot call a hook, so each entry carries the dictionary KEYS
// for its copy and the component resolves them at render.
const FAQS = [
  {
    questionKey: "faqVsAggregatorsQuestion",
    answerKey: "faqVsAggregatorsAnswer",
  },
  {
    questionKey: "faqPetpoojaIntegrationQuestion",
    answerKey: "faqPetpoojaIntegrationAnswer",
  },
  {
    questionKey: "faqDeliveryZonesQuestion",
    answerKey: "faqDeliveryZonesAnswer",
  },
  {
    questionKey: "faqPickupOrdersQuestion",
    answerKey: "faqPickupOrdersAnswer",
  },
  {
    questionKey: "faqRushHourOrdersQuestion",
    answerKey: "faqRushHourOrdersAnswer",
  },
  {
    questionKey: "faqTechnicalSkillsQuestion",
    answerKey: "faqTechnicalSkillsAnswer",
  },
  {
    questionKey: "faqOffersDiscountsQuestion",
    answerKey: "faqOffersDiscountsAnswer",
  },
  {
    questionKey: "faqCustomerDiscoveryQuestion",
    answerKey: "faqCustomerDiscoveryAnswer",
  },
  {
    questionKey: "faqPauseOrderingQuestion",
    answerKey: "faqPauseOrderingAnswer",
  },
  {
    questionKey: "faqCancelSubscriptionQuestion",
    answerKey: "faqCancelSubscriptionAnswer",
  },
] as const;

export default function FAQ() {
  const { t } = useT();

  return (
    <section className="relative bg-white overflow-hidden">
      <div className={cn("mx-auto w-full max-w-7xl", SECTION_SPACING, SECTION_GUTTER)}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="geist-font text-3xl md:text-4xl font-semibold text-gray-900 tracking-tight">
              {t.landing.faqHeadingLead}{" "}
              <span className="text-gray-400 italic">{t.landing.faqHeadingAccent}</span>
            </h2>
          </div>

          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border-b border-gray-200 last:border-b-0 py-1"
              >
                <AccordionTrigger className="text-left text-base font-medium text-gray-900 hover:no-underline py-5">
                  {t.landing[faq.questionKey]}
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 text-sm leading-relaxed pb-5">
                  {t.landing[faq.answerKey]}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
