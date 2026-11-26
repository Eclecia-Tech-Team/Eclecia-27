"use client";

import { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: "Who can become a Campus Ambassador?",
    answer:
      "Any undergraduate or postgraduate student from any college or university can apply! If you have an active social media presence, strong networking skills, and the enthusiasm to represent Eclecia'27 on your campus, you're a great fit; no prior experience required.",
  },
  // {
  //   question: "What will be my responsibilities?",
  //   answer:
  //     "Your primary goal is to maximize event registrations from your college. You will act as the official bridge between Eclecia'27 and your campus by sharing event updates, promoting competitions, and guiding fellow students through the registration process.",
  // },
  {
    question: "What will be my responsibilities?",
    answer:
      "Your primary goal is to maximize event registrations from your college. You will act as the official bridge between Eclecia'27 and your campus by sharing event updates, promoting competitions, and guiding fellow students through the registration process.",
  },
  {
    question: "How will I contribute to Eclecia'27?",
    answer:
      "You will drive participation from your institution by circulating posters and registration links across student groups, creating engaging social media buzz, and encouraging peers to sign up and compete in Eclecia'27 events.",
  },
  {
    question: "What incentives do I receive?",
    answer:
      "You can earn certificates of excellence, exclusive hampers and gifts, networking opportunities, campus recognition, and performance-based rewards and perks tied directly to the registrations you bring in.",
  },
];

export function CamFaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (idx: number) => {
    setOpenIndex((curr) => (curr === idx ? null : idx));
  };

  return (
    <section className="w-full max-w-110 md:max-w-240 mt-16 mb-12 px-4 sm:px-6">
      {/* Editorial Typographic Narrative (No cards, no box, no glassmorphism) */}
      <div className="relative mb-20 text-center">
        {/* Subtle top gold accent line */}
        <div className="flex items-center justify-center gap-4 mb-5">
          <span className="h-px w-10 sm:w-16 bg-linear-to-r from-transparent to-gold/50" />
          <p className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.32em] text-gold/90">
            Be the Face of Eclecia at Your Campus
          </p>
          <span className="h-px w-10 sm:w-16 bg-linear-to-l from-transparent to-gold/50" />
        </div>

        {/* Headline */}
        <h2 className="font-display text-[32px] sm:text-[44px] md:text-[50px] font-semibold text-parchment leading-[1.05] tracking-[-0.01em]">
          Join the Campus Ambassador Program
        </h2>

        {/* Narrative */}
        <p className="mt-4 max-w-xl mx-auto font-sans text-[14.5px] sm:text-[16px] leading-relaxed text-parchment/70">
          Think you can make your campus go crazy for Eclecia? Become an Eclecia
          Campus Ambassador and bring Eastern India&apos;s grandest cultural
          festival to your doorstep.
        </p>

        {/* The 4 Pillars (Ruled minimal columns without boxes) */}
        <div className="mt-10 border-t border-b border-gold/20 py-8 grid grid-cols-2 md:grid-cols-4 gap-y-6 divide-y md:divide-y-0 md:divide-x divide-gold/15">
          <div className="px-4 py-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-gold font-semibold block">
              Promote
            </span>
            <p className="mt-1 font-sans text-[13px] text-parchment/65">
              Spread the word across your campus
            </p>
          </div>

          <div className="px-4 py-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-gold font-semibold block">
              Compete
            </span>
            <p className="mt-1 font-sans text-[13px] text-parchment/65">
              Rack up entries and referrals
            </p>
          </div>

          <div className="px-4 py-2 pt-6 md:pt-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-gold font-semibold block">
              Lead
            </span>
            <p className="mt-1 font-sans text-[13px] text-parchment/65">
              Guide your student cohort
            </p>
          </div>

          <div className="px-4 py-2 pt-6 md:pt-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-gold font-semibold block">
              Earn
            </span>
            <p className="mt-1 font-sans text-[13px] text-parchment/65">
              Unlock exclusive hampers and gifts
            </p>
          </div>
        </div>

        {/* Tagline callout */}
        <p className="mt-6 font-mono text-[11px] sm:text-[12px] uppercase tracking-[0.26em] text-gold/85">
          Don&apos;t just attend Eclecia. Make your campus part of it.
        </p>
      </div>

      {/* Accordion FAQ Header */}
      <div className="mb-8 flex items-end justify-between border-b border-gold/25 pb-4">
        <div>
          <span className="font-mono text-[9.5px] uppercase tracking-[0.28em] text-gold/80 block mb-1">
            Guild Inquiries
          </span>
          <h3 className="font-display text-[26px] sm:text-[32px] font-semibold text-parchment leading-tight">
            Frequently Asked Questions
          </h3>
        </div>
        <span className="font-mono text-[11px] uppercase tracking-widest text-parchment/40">
          FAQ
        </span>
      </div>

      {/* Accordion Items with smooth animated expand and collapse */}
      <div className="divide-y divide-gold/15 border-b border-gold/15">
        {FAQS.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="group py-1"
              data-open={isOpen ? "true" : "false"}
            >
              <button
                type="button"
                className="w-full flex items-center justify-between gap-6 py-5 px-2 text-left transition-colors cursor-pointer"
                onClick={() => toggle(idx)}
                aria-expanded={isOpen}
              >
                <span
                  className={`font-display text-[20px] sm:text-[22px] transition-colors ${
                    isOpen
                      ? "text-gold font-medium"
                      : "text-parchment group-hover:text-gold/90"
                  }`}
                >
                  {faq.question}
                </span>

                <span
                  className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                    isOpen
                      ? "rotate-45 border-gold/50"
                      : "border-gold/30 bg-black/40 text-gold/70"
                  }`}
                  aria-hidden
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </span>
              </button>

              <div
                className="overflow-hidden transition-all duration-350 ease-out px-2"
                style={{
                  maxHeight: isOpen ? "200px" : "0px",
                  opacity: isOpen ? 1 : 0,
                  marginBottom: isOpen ? "16px" : "0px",
                }}
              >
                <p className="font-sans text-[14.5px] sm:text-[15px] leading-relaxed text-parchment/70 max-w-3xl text-justify">
                  {faq.answer}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
