"use client";

import { useState, type CSSProperties } from "react";

/** A copyable code (team code or registration ID). */
export default function CopyCode({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);
  // "TEAM-" / "REG-" is dimmed so the part that differs stands out.
  const prefixLength = code.indexOf("-") + 1;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Couldn't copy the code:", error);
    }
  };

  return (
    <button type="button" onClick={copy} className="pf-code" data-copied={copied} title="Copy" aria-label={`Copy ${label}: ${code}`}>
      <span className="pf-code-label">{label}</span>
      <span className="pf-code-line">
        <span className="pf-code-chars">
          {Array.from(code, (char, i) => (
            <span key={i} data-prefix={i < prefixLength} style={{ "--i": i } as CSSProperties}>
              {char}
            </span>
          ))}
        </span>
        <svg aria-hidden viewBox="0 0 24 24" className="pf-code-icon" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          {copied ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M9 9h11v11H9zM15 9V4H4v11h5" />}
        </svg>
        <span className="sr-only" aria-live="polite">
          {copied ? "Copied" : ""}
        </span>
      </span>
    </button>
  );
}
