"use client";

import type { EventOption, RegistrationRow } from "@/lib/admin/queries";
import { setTeamPayment, updateRegistration } from "@/lib/admin/actions/registrations";
import { Badge, Pager, SearchBox, Switch, fmtDate, useAction, useQueryState } from "./ui";

type Data = { total: number; page: number; pages: number; rows: RegistrationRow[] };

const STATUSES = [
  ["", "Any status"],
  ["unverified", "Not verified"],
  ["verified", "Verified"],
  ["checked-in", "Checked in"],
  ["not-checked-in", "Not checked in"],
] as const;

export function RegistrationsTable({ data, events, canVerify, canCheckIn }: { data: Data; events: EventOption[]; canVerify: boolean; canCheckIn: boolean }) {
  const { get, set, pending: filtering } = useQueryState();
  const { run, pending } = useAction();

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        <SearchBox placeholder="Name, email, phone, registration ID, team code" />
        <select className="adm-input sm:max-w-[14rem]" value={get("event")} onChange={(e) => set({ event: e.target.value || null })} aria-label="Event">
          <option value="">All events</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <select className="adm-input sm:max-w-[12rem]" value={get("status")} onChange={(e) => set({ status: e.target.value || null })} aria-label="Status">
          {STATUSES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>

      <div className={`adm-panel overflow-x-auto transition-opacity ${filtering ? "opacity-60" : ""}`}>
        <table className="adm-table min-w-[980px]">
          <thead>
            <tr>
              <th>Participant</th>
              <th>Event</th>
              <th>Team</th>
              <th>Verified</th>
              <th>Checked in</th>
              <th>Food</th>
              <th>Registered</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <div className="font-medium">{r.participant.name}</div>
                  <div className="text-[12px] text-parchment/50">
                    {r.participant.email}
                    {r.participant.phone && ` · ${r.participant.phone}`}
                  </div>
                  {r.participant.college && <div className="text-[12px] text-parchment/40">{r.participant.college}</div>}
                  {r.code && <div className="font-mono text-[12px] text-parchment/40">{r.code}</div>}
                </td>
                <td className="text-parchment/75">{r.eventName}</td>
                <td>
                  {r.team ? (
                    <div className="flex flex-col gap-1">
                      <div>
                        {r.team.name || "—"} {r.team.isLeader && <Badge tone="info">leader</Badge>}
                      </div>
                      <div className="font-mono text-[12px] text-parchment/50">
                        {r.team.code} · {r.team.size} member{r.team.size === 1 ? "" : "s"}
                      </div>
                      {r.team.size < r.team.min && <Badge tone="warn">needs {r.team.min - r.team.size} more</Badge>}
                      {r.team.payment && (
                        <select
                          className="adm-input mt-1 w-auto py-1 text-[12px]"
                          value={r.team.payment}
                          disabled={!canVerify || pending}
                          aria-label={`Payment for ${r.team.name || r.team.code}`}
                          onChange={(e) =>
                            run(() => setTeamPayment(r.team!.id, e.target.value as "pending" | "completed" | "failed"), {
                              success: `Payment marked ${e.target.value} for the whole team`,
                            })
                          }
                        >
                          <option value="pending">Payment pending</option>
                          <option value="completed">Paid</option>
                          <option value="failed">Payment failed</option>
                        </select>
                      )}
                    </div>
                  ) : (
                    <span className="text-parchment/40">Solo</span>
                  )}
                </td>
                <td>
                  {r.team?.payment ? (
                    <Badge tone={r.verified ? "ok" : "warn"}>{r.verified ? "via team" : "team unpaid"}</Badge>
                  ) : (
                  <Switch
                    checked={r.verified}
                    disabled={!canVerify || pending}
                    label={`Verified: ${r.participant.name}`}
                    onChange={(v) => run(() => updateRegistration(r.id, { verified: v }), { success: v ? "Verified" : "Marked unverified" })}
                  />
                  )}
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={r.checkedIn}
                      disabled={!canCheckIn || pending || (!r.verified && !r.checkedIn)}
                      label={`Checked in: ${r.participant.name}`}
                      onChange={(v) => run(() => updateRegistration(r.id, { checkedIn: v }), { success: v ? "Checked in" : "Check-in undone" })}
                    />
                    {r.checkedInAt && <span className="text-[11.5px] text-parchment/45">{fmtDate(r.checkedInAt)}</span>}
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="adm-btn"
                      data-size="sm"
                      disabled={!canCheckIn || pending || r.food <= 0}
                      aria-label="One less food packet"
                      onClick={() => run(() => updateRegistration(r.id, { foodServedCount: r.food - 1 }))}
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-mono">{r.food}</span>
                    <button
                      type="button"
                      className="adm-btn"
                      data-size="sm"
                      disabled={!canCheckIn || pending}
                      aria-label="One more food packet"
                      onClick={() => run(() => updateRegistration(r.id, { foodServedCount: r.food + 1 }))}
                    >
                      +
                    </button>
                  </div>
                </td>
                <td className="whitespace-nowrap text-[12.5px] text-parchment/55">{fmtDate(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.rows.length && <p className="px-4 py-10 text-center text-[14px] text-parchment/50">No registrations match.</p>}
      </div>
      <Pager page={data.page} pages={data.pages} total={data.total} noun="registration" />
    </>
  );
}
