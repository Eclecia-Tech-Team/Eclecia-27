"use client";

import { useId, useRef, useState } from "react";

/** Rules shown before "Show all": events have 10–12, which is a wall of text on a phone. */
const PREVIEW = 5;

/** Numbered rules; long lists collapse after the first few. */
export function RulesList({ rules }: { rules: string[] }) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const listRef = useRef<HTMLOListElement>(null);
  const collapsible = rules.length > PREVIEW + 1;
  const shown = collapsible && !open ? rules.slice(0, PREVIEW) : rules;

  return (
    <>
      <ol id={listId} ref={listRef} className="flex scroll-mt-28 flex-col gap-3.5">
        {shown.map((rule, i) => (
          <li key={i} className="grid grid-cols-[2rem_1fr] text-[15px] leading-relaxed text-parchment/85">
            <span className="font-mono text-[12px] leading-[1.9] text-gold/80">{String(i + 1).padStart(2, "0")}</span>
            <span>{rule}</span>
          </li>
        ))}
      </ol>
      {collapsible && (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => {
            // Collapsing a long list from its bottom would strand the reader far down the page.
            if (open && (listRef.current?.getBoundingClientRect().top ?? 0) < 0) {
              listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }
            setOpen((o) => !o);
          }}
          className="mt-5 ml-8 block font-mono text-[11px] uppercase tracking-[0.25em] text-gold transition-colors hover:text-parchment"
        >
          {open ? "Show fewer" : `Show all ${rules.length} rules`} <span aria-hidden>{open ? "↑" : "↓"}</span>
        </button>
      )}
    </>
  );
}
