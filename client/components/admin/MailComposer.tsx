"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { EventOption } from "@/lib/admin/queries";
import { countAudience, sendMail, type Audience } from "@/lib/admin/actions/mail";
import { MAIL_PLACEHOLDERS, fillVars, textToEmailHtml } from "@/lib/admin/mail-body";
import { Button, ConfirmButton, Field, SwitchRow, toast } from "./ui";

type Kind = Audience["kind"];

export function MailComposer({ events, canSend }: { events: EventOption[]; canSend: boolean }) {
  const [kind, setKind] = useState<Kind>("event");
  const [eventId, setEventId] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [emails, setEmails] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [reach, setReach] = useState<{ key: string; count?: number; error?: string } | null>(null);
  const [sending, start] = useTransition();

  const audience = useMemo<Audience>(() => {
    if (kind === "event") return { kind, eventId, verifiedOnly };
    if (kind === "emails") return { kind, emails };
    return { kind };
  }, [kind, eventId, verifiedOnly, emails]);

  // The count shown always belongs to the audience currently picked.
  const audienceKey = JSON.stringify(audience);
  const complete = !(kind === "event" && !eventId) && !(kind === "emails" && !emails.trim());
  const current = complete && reach?.key === audienceKey ? reach : null;
  const count = current?.count ?? null;
  const countError = current?.error ?? "";
  useEffect(() => {
    if (!complete) return;
    let live = true;
    const t = setTimeout(async () => {
      const r = await countAudience(audience);
      if (live) setReach(r.ok ? { key: audienceKey, count: r.count } : { key: audienceKey, error: r.error });
    }, 400);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [audience, audienceKey, complete]);

  const event = events.find((e) => e.id === eventId);
  const sample = { name: "Aarav Sen", event: event?.name ?? "Rangamancha", team: "Night Owls", teamCode: "ECL-7KQ2" };
  const ready = canSend && subject.trim() && body.trim() && count;

  const send = () =>
    start(async () => {
      const r = await sendMail({ audience, subject, body });
      if (!r.ok) return toast(r.error, "bad");
      toast(`Sent to ${r.sent} ${r.sent === 1 ? "person" : "people"}`);
      setSubject("");
      setBody("");
    });

  const insert = (key: string) => setBody((b) => `${b}${b && !b.endsWith(" ") && !b.endsWith("\n") ? " " : ""}${key}`);

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="flex flex-col gap-5">
        <section className="adm-panel flex flex-col gap-4 p-5">
          <h2 className="adm-label text-gold/80">To</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Audience">
            {(
              [
                ["event", "An event"],
                ["incomplete", "Incomplete profiles"],
                ["everyone", "Every account"],
                ["emails", "Specific emails"],
              ] as const
            ).map(([k, label]) => (
              <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className={`adm-btn text-[12.5px] ${kind === k ? "border-gold bg-gold/10 text-gold" : ""}`}>
                {label}
              </button>
            ))}
          </div>
          {kind === "event" && (
            <>
              <select className="adm-input" value={eventId} onChange={(e) => setEventId(e.target.value)} aria-label="Event">
                <option value="">Pick an event</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
              <SwitchRow label="Verified registrations only" hint="Off: includes unpaid / unverified too." checked={verifiedOnly} onChange={setVerifiedOnly} />
            </>
          )}
          {kind === "emails" && (
            <Field label="Email addresses" hint="Separated by commas, spaces or new lines.">
              <textarea className="adm-input font-mono text-[13px]" rows={4} value={emails} onChange={(e) => setEmails(e.target.value)} />
            </Field>
          )}
          <p className={`text-[13.5px] ${countError ? "text-[#f0a093]" : "text-parchment/65"}`}>
            {countError || (count === null ? " " : `${count.toLocaleString("en-IN")} ${count === 1 ? "person" : "people"} will get this.`)}
          </p>
        </section>

        <section className="adm-panel flex flex-col gap-4 p-5">
          <h2 className="adm-label text-gold/80">Message</h2>
          <Field label="Subject">
            <input className="adm-input" maxLength={150} value={subject} onChange={(e) => setSubject(e.target.value)} />
          </Field>
          <Field label="Body" hint="Blank line = new paragraph. **bold**. Links become clickable.">
            <textarea className="adm-input" rows={12} value={body} onChange={(e) => setBody(e.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-1.5">
            {MAIL_PLACEHOLDERS.filter((p) => kind === "event" || p.key === "{{name}}").map((p) => (
              <button key={p.key} type="button" title={p.desc} className="adm-btn font-mono" data-size="sm" onClick={() => insert(p.key)}>
                {p.key}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <ConfirmButton variant="primary" disabled={!ready || sending} confirm={`Send to ${count ?? 0}?`} onConfirm={send}>
              {sending ? "Sending…" : "Send"}
            </ConfirmButton>
            {!canSend && <span className="text-[13px] text-parchment/50">Your role can draft but not send.</span>}
            {sending && <span className="text-[13px] text-parchment/50">Keep this tab open until it finishes.</span>}
          </div>
        </section>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="adm-label">Preview · sample recipient</h2>
        <div className="adm-panel min-h-[20rem] bg-[#05080b] p-6">
          <div className="text-center font-mono text-[10px] tracking-[0.3em] text-gold/70">ECLECIA&apos;27 DISPATCH</div>
          <div className="mt-3 text-center font-display text-[26px] font-semibold leading-tight text-parchment">{fillVars(subject, sample) || "Subject"}</div>
          <div
            className="mt-6 text-[14.5px] leading-[1.7] text-parchment/90"
            dangerouslySetInnerHTML={{ __html: body ? textToEmailHtml(fillVars(body, sample)) : '<p style="opacity:.4">Your message appears here.</p>' }}
          />
        </div>
        <Button variant="ghost" className="self-start" onClick={() => setBody("")} disabled={!body}>
          Clear message
        </Button>
      </section>
    </div>
  );
}
