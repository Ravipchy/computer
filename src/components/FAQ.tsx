"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import SectionWrapper from "@/components/SectionWrapper";
import { faqData } from "@/data/faq";

export default function FAQ() {
  const [activeIndex, setActiveIndex] = useState<number | null>(0);

  return (
    <SectionWrapper
      id="faq"
      title="Frequently Asked Questions"
      subtitle="Find answers to common questions about our training programs."
      className="bg-white"
    >
      <div className="mx-auto max-w-3xl space-y-4">
        {faqData.map((item, index) => {
          const isOpen = activeIndex === index;
          return (
            <div
              key={item.question}
              className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
            >
              <button
                type="button"
                onClick={() => setActiveIndex(isOpen ? null : index)}
                className="flex w-full items-center justify-between px-5 py-4 text-left font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                {item.question}
                <ChevronDown
                  className={`h-5 w-5 text-blue-700 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              <AnimatePresence initial={false}>
                {isOpen ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="px-5"
                  >
                    <p className="pb-4 text-sm leading-relaxed text-slate-600">
                      {item.answer}
                    </p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </SectionWrapper>
  );
}
