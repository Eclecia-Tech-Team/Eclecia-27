"use client";

import { useId, useRef, useState } from "react";

/** Rules shown before "Read all": events carry up to 15, which is a wall of text on a phone. */
const PREVIEW = 5;

/**
 * Many rules open with a short label ("Film Duration: Maximum 10 minutes…").
 * Pulling it out lets people scan for the rule they need. Needs a space after
 * the colon (so "10:30" and links never match) and at most four words before it.
 */
const LABELLED = /^([A-Za-z][A-Za-z0-9 &/'()+-]{0,38}):\s+([\s\S]+)$/;

function split(rule: string): { label: string | null; text: string } {
  const match = rule.match(LABELLED);
  if (!match || match[1].trim().split(/\s+/).length > 4) return { label: null, text: rule };
  return { label: match[1].trim(), text: match[2] };
}

/** Numbered rules with labels picked out; long lists collapse after the first few. */
export function RulesList({ rules }: { rules: string[] }) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const listRef = useRef<HTMLOListElement>(null);
  const collapsible = rules.length > PREVIEW + 1;
  const collapsed = collapsible && !open;
  const shown = collapsed ? rules.slice(0, PREVIEW) : rules;

  return (
    <>
      {/* role="list": Safari drops list semantics when list-style is none. */}
      <ol
        id={listId}
        ref={listRef}
        role="list"
        className="ev-rules scroll-mt-28"
        data-collapsed={collapsed ? "" : undefined}
      >
        {shown.map((rule, i) => {
          const { label, text } = split(rule);
          return (
            <li key={i} className="ev-rule">
              <span aria-hidden className="ev-rule-num">
                {i + 1}
              </span>
              <p className="max-w-[68ch] whitespace-pre-line text-[16px] leading-[1.7] text-parchment/85">
                {label && <strong className="font-semibold text-parchment">{label}: </strong>}
                {text}
              </p>
            </li>
          );
        })}
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
          className="relative mt-2 ml-[2.6rem] inline-flex min-h-11 items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-gold transition-colors hover:text-parchment"
        >
          {open ? "Show fewer" : `Read all ${rules.length} rules`} <span aria-hidden>{open ? "↑" : "↓"}</span>
        </button>
      )}
    </>
  );
}
