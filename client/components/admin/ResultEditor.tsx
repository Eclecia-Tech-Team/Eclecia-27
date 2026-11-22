"use client";

import Link from "next/link";
import { useState } from "react";
import { PLACE_LABEL, RESULT_PLACES, type ResultPlace } from "@/lib/admin/result-places";
import { saveResult, type ResultInput } from "@/lib/admin/actions/results";
import { Badge, Button, PageHeader, useAction } from "./ui";

type Entry = ResultInput["entries"][number] & { names: string[] };
type Data = {
  event: { id: string; name: string; slug: string; isTeamEvent: boolean };
  isPublished: boolean;
  entries: Entry[];
  teams: { id: string; name: string; code: string; members: string[] }[];
  people: string[];
};

const nextPlace = (entries: Entry[]): ResultPlace => RESULT_PLACES.find((p) => p !== "special_mention" && !entries.some((e) => e.place === p)) ?? "special_mention";

export function ResultEditor({ data, writable }: { data: Data; writable: boolean }) {
  const [entries, setEntries] = useState<Entry[]>(data.entries);
  const { run, pending } = useAction();
  const team = data.event.isTeamEvent;

  const patch = (i: number, p: Partial<Entry>) => setEntries((list) => list.map((e, j) => (j === i ? { ...e, ...p } : e)));
  const save = (isPublished: boolean) =>
    run(() => saveResult(data.event.id, { entries, isPublished }), { success: isPublished ? "Results published" : data.isPublished ? "Results unpublished" : "Draft saved" });

  return (
    <div className="max-w-3xl pb-10">
      <Link href="/admin/results" className="adm-label hover:text-gold">
        ← Results
      </Link>
      <div className="mt-3">
        <PageHeader
          title={data.event.name}
          sub={
            <>
              {data.isPublished ? <Badge tone="ok">published</Badge> : <Badge tone="warn">not published</Badge>}{" "}
              <a href={`/events/${data.event.slug}`} target="_blank" rel="noreferrer" className="ml-2 text-gold hover:underline">
                View event page ↗
              </a>
            </>
          }
        />
      </div>

      <datalist id="result-people">
        {data.people.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>

      <fieldset disabled={!writable} className="flex flex-col gap-4">
        {entries.map((e, i) => (
          <div key={i} className="adm-panel flex flex-col gap-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <select className="adm-input w-auto" value={e.place} onChange={(ev) => patch(i, { place: ev.target.value as ResultPlace })} aria-label="Place">
                {RESULT_PLACES.map((p) => (
                  <option key={p} value={p}>
                    {PLACE_LABEL[p]}
                  </option>
                ))}
              </select>
              {team && (
                <select
                  className="adm-input min-w-0 flex-1"
                  value={e.teamId ?? ""}
                  aria-label="Team"
                  onChange={(ev) => {
                    const t = data.teams.find((x) => x.id === ev.target.value);
                    patch(i, t ? { teamId: t.id, teamName: t.name, names: t.members } : { teamId: null });
                  }}
                >
                  <option value="">Pick a registered team (or type names below)</option>
                  {data.teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} · {t.code}
                    </option>
                  ))}
                </select>
              )}
              <Button variant="ghost" size="sm" className="ml-auto" aria-label="Remove this place" onClick={() => setEntries((l) => l.filter((_, j) => j !== i))}>
                ✕
              </Button>
            </div>
            {team && (
              <input className="adm-input" placeholder="Team name as shown on the site" value={e.teamName ?? ""} onChange={(ev) => patch(i, { teamName: ev.target.value })} />
            )}
            {team ? (
              <textarea
                className="adm-input"
                rows={3}
                placeholder="Member names, one per line"
                value={e.names.join("\n")}
                onChange={(ev) => patch(i, { names: ev.target.value.split("\n") })}
              />
            ) : (
              <input
                className="adm-input"
                placeholder="Winner's name (start typing to pick a registrant)"
                list="result-people"
                value={e.names[0] ?? ""}
                onChange={(ev) => patch(i, { names: [ev.target.value] })}
              />
            )}
            <input className="adm-input" placeholder="Note (optional), e.g. Best Director" maxLength={200} value={e.note ?? ""} onChange={(ev) => patch(i, { note: ev.target.value })} />
          </div>
        ))}
        <Button className="self-start" disabled={entries.length >= 20} onClick={() => setEntries((l) => [...l, { place: nextPlace(l), teamName: "", teamId: null, names: [], note: "" }])}>
          + Add place
        </Button>
      </fieldset>

      {writable && (
        <div className="mt-8 flex flex-wrap gap-2">
          <Button variant="primary" disabled={pending} onClick={() => save(true)}>
            {data.isPublished ? "Save and keep published" : "Publish"}
          </Button>
          <Button disabled={pending} onClick={() => save(false)}>
            {data.isPublished ? "Unpublish" : "Save draft"}
          </Button>
        </div>
      )}
    </div>
  );
}
