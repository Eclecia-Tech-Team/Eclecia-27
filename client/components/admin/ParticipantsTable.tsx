"use client";

import Link from "next/link";
import { useState } from "react";
import type { ParticipantRow } from "@/lib/admin/queries";
import { updateParticipant, type ParticipantInput } from "@/lib/admin/actions/participants";
import { Badge, Button, Field, Pager, SearchBox, fmtDate, useAction, useQueryState } from "./ui";

type Data = { total: number; page: number; pages: number; rows: ParticipantRow[] };

export function ParticipantsTable({ data, writable }: { data: Data; writable: boolean }) {
  const { get, set, pending: filtering } = useQueryState();
  const [editing, setEditing] = useState<{ id: string; email: string; form: ParticipantInput } | null>(null);
  const { run, pending } = useAction();

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        <SearchBox placeholder="Name, email, phone, college" />
        <select className="adm-input sm:max-w-[13rem]" value={get("filter")} onChange={(e) => set({ filter: e.target.value || null })} aria-label="Profile">
          <option value="">All accounts</option>
          <option value="complete">Profile complete</option>
          <option value="incomplete">Profile incomplete</option>
        </select>
      </div>

      <div className={`adm-panel overflow-x-auto transition-opacity ${filtering ? "opacity-60" : ""}`}>
        <table className="adm-table min-w-[860px]">
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact</th>
              <th>College</th>
              <th>Profile</th>
              <th className="text-right">Events</th>
              <th>Joined</th>
              {writable && <th />}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="font-medium">{p.fullName || <span className="text-parchment/40">No name</span>}</div>
                  <div className="text-[12px] text-parchment/45">@{p.username}</div>
                </td>
                <td>
                  <div className="text-[13px]">{p.email}</div>
                  <div className="font-mono text-[12px] text-parchment/50">{p.phoneNumber}</div>
                </td>
                <td>
                  <div className="text-[13px] text-parchment/75">{p.college}</div>
                  <div className="text-[12px] text-parchment/45">{p.stream}</div>
                </td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {p.isProfileComplete ? <Badge tone="ok">complete</Badge> : <Badge tone="warn">incomplete</Badge>}
                    {!p.verified && <Badge tone="bad">email unverified</Badge>}
                    {p.provider === "google" && <Badge tone="info">google</Badge>}
                  </div>
                </td>
                <td className="text-right font-mono">
                  {p.events ? (
                    <Link href={`/admin/registrations?q=${encodeURIComponent(p.email)}`} className="hover:text-gold">
                      {p.events}
                    </Link>
                  ) : (
                    <span className="text-parchment/35">0</span>
                  )}
                </td>
                <td className="whitespace-nowrap text-[12.5px] text-parchment/55">{fmtDate(p.createdAt)}</td>
                {writable && (
                  <td>
                    <Button
                      size="sm"
                      onClick={() =>
                        setEditing({
                          id: p.id,
                          email: p.email,
                          form: { username: p.username, fullName: p.fullName, phoneNumber: p.phoneNumber, college: p.college, stream: p.stream },
                        })
                      }
                    >
                      Edit
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {!data.rows.length && <p className="px-4 py-10 text-center text-[14px] text-parchment/50">Nobody matches.</p>}
      </div>
      <Pager page={data.page} pages={data.pages} total={data.total} noun="account" />

      {editing && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 sm:items-center" onClick={() => setEditing(null)}>
          <form
            role="dialog"
            aria-modal="true"
            aria-label="Edit participant"
            className="adm-panel flex w-full max-w-md flex-col gap-4 bg-[#0b0d10] p-5"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              run(() => updateParticipant(editing.id, editing.form), { success: "Profile updated", onOk: () => setEditing(null) });
            }}
          >
            <div>
              <h2 className="adm-label text-gold/80">Edit participant</h2>
              <p className="mt-1 text-[13px] text-parchment/55">{editing.email}</p>
            </div>
            {(
              [
                ["fullName", "Full name"],
                ["username", "Username"],
                ["phoneNumber", "Phone (10 digits)"],
                ["college", "College"],
                ["stream", "Stream"],
              ] as const
            ).map(([k, label]) => (
              <Field key={k} label={label}>
                <input
                  className="adm-input"
                  value={editing.form[k]}
                  inputMode={k === "phoneNumber" ? "numeric" : undefined}
                  onChange={(e) => setEditing({ ...editing, form: { ...editing.form, [k]: e.target.value } })}
                />
              </Field>
            ))}
            <div className="flex gap-2">
              <Button type="submit" variant="primary" disabled={pending}>
                {pending ? "Saving…" : "Save"}
              </Button>
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
