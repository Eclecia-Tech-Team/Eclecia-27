"use client";

import { useState } from "react";
import { Button } from "./ui";

/** Strip list markers people paste in: "1.", "2)", "-", "•", "(a)". */
const clean = (line: string) => line.replace(/^\s*(?:\(?\d{1,2}[.)]|\(?[a-z][.)]|[-•*–])\s+/i, "").trim();

/**
 * Ordered rule list. Events carry 10–12 rules, often several lines each, so
 * every rule gets its own growing box, reordering, and a bulk paste mode.
 */
export function RulesEditor({ rules, onChange, disabled }: { rules: string[]; onChange: (r: string[]) => void; disabled?: boolean }) {
  const [pasting, setPasting] = useState(false);
  const [paste, setPaste] = useState("");

  const move = (i: number, d: -1 | 1) => {
    const next = rules.slice();
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };

  if (pasting) {
    const parsed = paste.split("\n").map(clean).filter(Boolean);
    return (
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-parchment/60">One rule per line. Numbers and bullets at the start are removed.</p>
        <textarea className="adm-input font-mono text-[13px]" rows={12} value={paste} onChange={(e) => setPaste(e.target.value)} autoFocus />
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" disabled={!parsed.length} onClick={() => { onChange(parsed); setPasting(false); }}>
            Replace with {parsed.length} rule{parsed.length === 1 ? "" : "s"}
          </Button>
          <Button disabled={!parsed.length} onClick={() => { onChange([...rules.filter((r) => r.trim()), ...parsed]); setPasting(false); }}>
            Add to the end
          </Button>
          <Button variant="ghost" onClick={() => setPasting(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {rules.length === 0 && <p className="text-[13px] text-parchment/50">No rules yet. The page will say they&apos;ll be published soon.</p>}
      {rules.map((rule, i) => (
        <div key={i} className="grid grid-cols-[1.75rem_1fr_auto] items-start gap-2">
          <span className="pt-2.5 text-right font-mono text-[12px] text-gold/70">{String(i + 1).padStart(2, "0")}</span>
          <textarea
            className="adm-input [field-sizing:content] min-h-[2.6rem] text-[13.5px]"
            rows={Math.min(8, Math.max(1, Math.ceil(rule.length / 70)))}
            maxLength={800}
            value={rule}
            aria-label={`Rule ${i + 1}`}
            onChange={(e) => onChange(rules.map((r, j) => (j === i ? e.target.value : r)))}
          />
          <div className="flex gap-0.5 pt-1">
            <Button size="sm" variant="ghost" disabled={disabled || i === 0} aria-label={`Move rule ${i + 1} up`} onClick={() => move(i, -1)}>
              ↑
            </Button>
            <Button size="sm" variant="ghost" disabled={disabled || i === rules.length - 1} aria-label={`Move rule ${i + 1} down`} onClick={() => move(i, 1)}>
              ↓
            </Button>
            <Button size="sm" variant="ghost" disabled={disabled} aria-label={`Remove rule ${i + 1}`} onClick={() => onChange(rules.filter((_, j) => j !== i))}>
              ✕
            </Button>
          </div>
        </div>
      ))}
      <div className="mt-1 flex flex-wrap gap-2 pl-[2.25rem]">
        <Button disabled={disabled || rules.length >= 40} onClick={() => onChange([...rules, ""])}>
          + Add rule
        </Button>
        <Button variant="ghost" disabled={disabled} onClick={() => { setPaste(rules.join("\n")); setPasting(true); }}>
          Paste a list
        </Button>
      </div>
      {rules.length > 6 && <p className="pl-[2.25rem] text-[12px] text-parchment/40">The event page shows the first 5, then “Show all {rules.length} rules”.</p>}
    </div>
  );
}
