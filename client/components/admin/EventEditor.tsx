"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { EVENT_CATEGORIES } from "@/constants/event-categories";
import { slugify, type EventInput } from "@/lib/admin/event-input";
import { deleteEvent, saveEvent } from "@/lib/admin/actions/events";
import { Button, ConfirmButton, Field, PageHeader, SwitchRow, toast, useAction } from "./ui";
import { RulesEditor } from "./RulesEditor";

type Props = { id: string | null; initial: EventInput; registrations: number; writable: boolean };

export function EventEditor({ id, initial, registrations, writable }: Props) {
  const router = useRouter();
  const { run, pending } = useAction();
  const [e, setE] = useState<EventInput>(initial);
  const [saved, setSaved] = useState<EventInput>(initial);
  // New events: the URL name follows the title until someone edits it by hand.
  const [slugTouched, setSlugTouched] = useState(Boolean(id));
  const dirty = JSON.stringify(e) !== JSON.stringify(saved);

  useEffect(() => {
    if (!dirty) return;
    const warn = (ev: BeforeUnloadEvent) => ev.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = <K extends keyof EventInput>(k: K, v: EventInput[K]) => setE((cur) => ({ ...cur, [k]: v }));
  const locked = !writable;
  const hasRegs = registrations > 0;

  const save = () =>
    run(() => saveEvent(id, e), {
      success: id ? "Saved" : "Event created",
      onOk: (r) => {
        setSaved(e);
        if (!id) router.replace(`/admin/events/${r.id}`);
      },
    });

  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        save();
      }}
      className="pb-28"
    >
      <Link href="/admin/events" className="adm-label hover:text-gold">
        ← Events
      </Link>
      <div className="mt-3">
        <PageHeader
          title={id ? saved.eventName || "Event" : "New event"}
          sub={
            id ? (
              <>
                {registrations} registration{registrations === 1 ? "" : "s"} ·{" "}
                <a href={`/events/${saved.slug}`} target="_blank" rel="noreferrer" className="text-gold hover:underline">
                  View on site ↗
                </a>
              </>
            ) : (
              "Fill in what you know. Anything left blank shows as “To be announced”."
            )
          }
        />
      </div>

      <fieldset disabled={locked} className="grid gap-6 xl:grid-cols-2">
        <Card title="Basics">
          <Field label="Name" hint="3–30 characters, shown everywhere.">
            <input
              className="adm-input"
              value={e.eventName}
              maxLength={30}
              required
              onChange={(ev) => {
                const name = ev.target.value;
                setE((cur) => ({ ...cur, eventName: name, slug: slugTouched ? cur.slug : slugify(name) }));
              }}
            />
          </Field>
          <Field label="URL name" hint={<>eclecia-hitk.in/events/<b className="text-parchment/70">{e.slug || "…"}</b>{id && " · changing it breaks old links"}</>}>
            <input
              className="adm-input font-mono"
              value={e.slug}
              required
              onChange={(ev) => {
                setSlugTouched(true);
                set("slug", ev.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
              }}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="World">
              <select className="adm-input" value={e.category} onChange={(ev) => set("category", ev.target.value as EventInput["category"])}>
                {EVENT_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Kind" hint="e.g. Solo Singing, Street Play">
              <input className="adm-input" value={e.kind} maxLength={60} onChange={(ev) => set("kind", ev.target.value)} />
            </Field>
          </div>
          <Field label="Description" hint={`${e.description.length}/2000`}>
            <textarea className="adm-input" rows={5} maxLength={2000} required value={e.description} onChange={(ev) => set("description", ev.target.value)} />
          </Field>
          <Field label="Hosted by" hint="Clubs, separated by commas.">
            <input
              className="adm-input"
              value={e.clubs.join(", ")}
              onChange={(ev) => set("clubs", ev.target.value.split(",").map((s) => s.trimStart()))}
              onBlur={() => set("clubs", e.clubs.map((s) => s.trim()).filter(Boolean))}
            />
          </Field>
        </Card>

        <div className="flex flex-col gap-6">
          <Card title="When and where">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Date" hint="e.g. 16 January 2027">
                <input className="adm-input" value={e.date === "TBA" ? "" : e.date} placeholder="TBA" onChange={(ev) => set("date", ev.target.value)} />
              </Field>
              <Field label="Time" hint="e.g. 11:00 AM">
                <input className="adm-input" value={e.time === "TBA" ? "" : e.time} placeholder="TBA" onChange={(ev) => set("time", ev.target.value)} />
              </Field>
              <Field label="Duration" hint="e.g. 3 hours">
                <input className="adm-input" value={e.duration === "TBA" ? "" : e.duration} placeholder="TBA" onChange={(ev) => set("duration", ev.target.value)} />
              </Field>
              <Field label="Venue">
                <input className="adm-input" value={e.venue === "TBA" ? "" : e.venue} placeholder="TBA" onChange={(ev) => set("venue", ev.target.value)} />
              </Field>
            </div>
          </Card>

          <Card title="Registration">
            <SwitchRow label="Registrations open" hint="Closed events show “Opening soon”." checked={e.isActive} onChange={(v) => set("isActive", v)} />
            <SwitchRow
              label="Team event"
              hint={hasRegs ? "Locked: people have registered." : "People register as teams with a join code."}
              checked={e.isTeamEvent}
              disabled={hasRegs}
              onChange={(v) => setE((cur) => ({ ...cur, isTeamEvent: v, minMembersPerTeam: v ? Math.max(cur.minMembersPerTeam, 2) : 1, maxMembersPerTeam: v ? Math.max(cur.maxMembersPerTeam, 2) : 1 }))}
            />
            {e.isTeamEvent && (
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Min members">
                  <NumberInput value={e.minMembersPerTeam} min={1} max={30} onChange={(v) => set("minMembersPerTeam", v ?? 1)} />
                </Field>
                <Field label="Max members">
                  <NumberInput value={e.maxMembersPerTeam} min={1} max={30} onChange={(v) => set("maxMembersPerTeam", v ?? 1)} />
                </Field>
                <Field label="Max teams" hint="Blank = no cap">
                  <NumberInput value={e.teamLimit} min={1} max={10000} onChange={(v) => set("teamLimit", v)} allowEmpty />
                </Field>
              </div>
            )}
            {!e.isTeamEvent && (
              <Field label="Max participants" hint="Blank = no cap">
                <NumberInput value={e.teamLimit} min={1} max={10000} onChange={(v) => set("teamLimit", v)} allowEmpty />
              </Field>
            )}
            <SwitchRow
              label="Paid entry"
              hint={hasRegs ? "Locked: people have registered." : "Paid registrations stay unverified until payment is marked done."}
              checked={e.isPaidEvent}
              disabled={hasRegs}
              onChange={(v) => set("isPaidEvent", v)}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              {e.isPaidEvent && (
                <Field label={e.isTeamEvent ? "Fee per team (₹)" : "Fee (₹)"}>
                  <NumberInput value={e.fees} min={0} max={100000} onChange={(v) => set("fees", v ?? 0)} />
                </Field>
              )}
              <Field label="Prize pool" hint="e.g. ₹15,000">
                <input className="adm-input" value={e.prizePool === "TBD" ? "" : e.prizePool} placeholder="TBD" onChange={(ev) => set("prizePool", ev.target.value)} />
              </Field>
            </div>
          </Card>
        </div>

        <Card title={`Rules · ${e.rules.filter((r) => r.trim()).length}`} wide>
          <RulesEditor rules={e.rules} onChange={(r) => set("rules", r)} disabled={locked} />
          <Field label="Full rulebook link" hint="PDF or Google Doc, shown under the rules.">
            <input className="adm-input" type="url" placeholder="https://" value={e.doc} onChange={(ev) => set("doc", ev.target.value)} />
          </Field>
        </Card>

        <Card title="Coordinators">
          {e.pocs.map((p, i) => (
            <div key={i} className="grid grid-cols-[1fr_9rem_auto] gap-2">
              <input
                className="adm-input"
                placeholder="Name"
                aria-label={`Coordinator ${i + 1} name`}
                value={p.name}
                onChange={(ev) => set("pocs", e.pocs.map((x, j) => (j === i ? { ...x, name: ev.target.value } : x)))}
              />
              <input
                className="adm-input font-mono"
                placeholder="Mobile"
                inputMode="tel"
                aria-label={`Coordinator ${i + 1} mobile`}
                value={p.mobile}
                onChange={(ev) => set("pocs", e.pocs.map((x, j) => (j === i ? { ...x, mobile: ev.target.value } : x)))}
              />
              <Button variant="ghost" aria-label={`Remove coordinator ${i + 1}`} onClick={() => set("pocs", e.pocs.filter((_, j) => j !== i))}>
                ✕
              </Button>
            </div>
          ))}
          {e.pocs.length < 8 && (
            <Button className="self-start" onClick={() => set("pocs", [...e.pocs, { name: "", mobile: "" }])}>
              + Add coordinator
            </Button>
          )}
        </Card>

        <Card title="Artwork and food">
          <Field label="Artwork image URL" hint="Square image (Cloudinary). Blank = the bundled atlas art for this URL name.">
            <input className="adm-input" type="url" placeholder="https://" value={e.banner} onChange={(ev) => set("banner", ev.target.value)} />
          </Field>
          {/^https?:\/\//.test(e.banner) && <img src={e.banner} alt="" className="h-28 w-28 rounded-full border border-gold/30 object-cover" />}
          <SwitchRow label="Food provided" hint="Enables food scans at the check-in desk." checked={e.isFoodProvided} onChange={(v) => set("isFoodProvided", v)} />
          {e.isFoodProvided && (
            <Field label="Packets per person">
              <NumberInput value={e.maxFoodServingsPerParticipant} min={1} max={10} onChange={(v) => set("maxFoodServingsPerParticipant", v ?? 1)} />
            </Field>
          )}
        </Card>
      </fieldset>

      {id && writable && (
        <div className="mt-10 border-t border-[#e57363]/20 pt-6">
          <div className="adm-label">Danger zone</div>
          <p className="mt-2 max-w-xl text-[13px] text-parchment/55">
            {hasRegs
              ? "This event has registrations, so it can't be deleted. Close registrations instead."
              : saved.isActive
                ? "Close registrations (and save) before deleting."
                : "Deleting removes the event with its notices and results. It can't be undone."}
          </p>
          <ConfirmButton
            className="mt-3"
            variant="danger"
            disabled={hasRegs || saved.isActive || pending}
            confirm="Click again to delete"
            onConfirm={() =>
              run(() => deleteEvent(id), {
                refresh: false,
                onOk: () => {
                  toast("Event deleted");
                  router.replace("/admin/events");
                },
              })
            }
          >
            Delete event
          </ConfirmButton>
        </div>
      )}

      {writable && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gold/20 bg-[#060709]/95 backdrop-blur lg:left-[220px]">
          <div className="flex items-center justify-end gap-3 px-4 py-3 sm:px-6 lg:px-10">
            <span className="mr-auto text-[13px] text-parchment/50">{dirty ? "Unsaved changes" : id ? "All changes saved" : ""}</span>
            {dirty && id && (
              <Button variant="ghost" onClick={() => setE(saved)}>
                Discard
              </Button>
            )}
            <Button type="submit" variant="primary" disabled={pending || (!dirty && Boolean(id))}>
              {pending ? "Saving…" : id ? "Save changes" : "Create event"}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}

function Card({ title, children, wide }: { title: string; children: ReactNode; wide?: boolean }) {
  return (
    <section className={`adm-panel flex flex-col gap-4 p-5 ${wide ? "xl:row-span-2" : ""}`}>
      <h2 className="adm-label text-gold/80">{title}</h2>
      {children}
    </section>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  allowEmpty,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  min: number;
  max: number;
  allowEmpty?: boolean;
}) {
  return (
    <input
      className="adm-input font-mono"
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      value={value ?? ""}
      placeholder={allowEmpty ? "—" : undefined}
      onChange={(ev) => {
        const raw = ev.target.value;
        if (raw === "") return onChange(allowEmpty ? null : min);
        const n = Math.round(Number(raw));
        if (Number.isFinite(n)) onChange(Math.min(max, Math.max(allowEmpty ? 0 : min, n)));
      }}
    />
  );
}
