"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { EventRow } from "@/lib/admin/queries";
import { setEventOpen } from "@/lib/admin/actions/events";
import { Badge, Switch, useAction } from "./ui";

export function EventsTable({ events, writable }: { events: EventRow[]; writable: boolean }) {
  const { run, pending } = useAction();
  const [q, setQ] = useState("");
  const [world, setWorld] = useState("");
  const worlds = useMemo(() => Array.from(new Set(events.map((e) => e.category))), [events]);
  const shown = events.filter(
    (e) => (!world || e.category === world) && (!q || `${e.name} ${e.slug} ${e.kind}`.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        <input type="search" className="adm-input sm:max-w-xs" placeholder="Search events" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="adm-input sm:max-w-[12rem]" value={world} onChange={(e) => setWorld(e.target.value)} aria-label="World">
          <option value="">All worlds</option>
          {worlds.map((w) => (
            <option key={w}>{w}</option>
          ))}
        </select>
      </div>
      <div className="adm-panel overflow-x-auto">
        <table className="adm-table min-w-[760px]">
          <thead>
            <tr>
              <th>Event</th>
              <th>World</th>
              <th>Format</th>
              <th>Entry</th>
              <th className="text-right">Regs</th>
              <th>Rules</th>
              <th>Open</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((e) => (
              <tr key={e.id}>
                <td>
                  <Link href={`/admin/events/${e.id}`} className="font-medium text-parchment hover:text-gold">
                    {e.name}
                  </Link>
                  <div className="text-[12px] text-parchment/45">
                    /{e.slug}
                    {e.kind && ` · ${e.kind}`}
                  </div>
                </td>
                <td className="text-parchment/70">{e.category}</td>
                <td className="text-parchment/70">{e.isTeamEvent ? `Team · ${e.teams} teams` : "Solo"}</td>
                <td className="text-parchment/70">{e.isPaidEvent ? `₹${e.fees}` : "Free"}</td>
                <td className="text-right font-mono">
                  <Link href={`/admin/registrations?event=${e.id}`} className="hover:text-gold">
                    {e.registrations}
                  </Link>
                </td>
                <td>{e.rules ? <span className="text-parchment/70">{e.rules}</span> : <Badge tone="warn">none</Badge>}</td>
                <td>
                  <Switch
                    checked={e.isActive}
                    disabled={!writable || pending}
                    label={`${e.isActive ? "Close" : "Open"} registrations for ${e.name}`}
                    onChange={(v) => run(() => setEventOpen(e.id, v), { success: `${e.name}: registrations ${v ? "open" : "closed"}` })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length && <p className="px-4 py-8 text-center text-[14px] text-parchment/50">Nothing matches.</p>}
      </div>
    </>
  );
}
