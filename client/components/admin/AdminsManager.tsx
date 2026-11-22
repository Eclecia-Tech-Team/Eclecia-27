"use client";

import { useState } from "react";
import type { AdminRow } from "@/lib/admin/queries";
import { ADMIN_AREAS, ADMIN_ROLES, AREA_INFO, ROLE_INFO, type AdminArea, type AdminRole } from "@/lib/admin/access";
import { inviteAdmin, removeAdmin, resetAdminPassword, updateAdmin } from "@/lib/admin/actions/admins";
import { Badge, Button, ConfirmButton, Field, fmtDate, useAction } from "./ui";

function RolePicker({ role, areas, onChange }: { role: AdminRole; areas: AdminArea[]; onChange: (role: AdminRole, areas: AdminArea[]) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {ADMIN_ROLES.map((r) => (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={role === r}
            onClick={() => onChange(r, areas)}
            className={`border p-3 text-left transition-colors ${role === r ? "border-gold bg-gold/10" : "border-white/10 hover:border-white/25"}`}
          >
            <div className={`text-[14px] ${role === r ? "text-gold" : ""}`}>{ROLE_INFO[r].label}</div>
            <div className="mt-0.5 text-[12px] leading-snug text-parchment/50">{ROLE_INFO[r].blurb}</div>
          </button>
        ))}
      </div>
      {role === "custom" && (
        <div className="flex flex-wrap gap-2">
          {ADMIN_AREAS.map((a) => {
            const on = areas.includes(a);
            return (
              <button
                key={a}
                type="button"
                aria-pressed={on}
                onClick={() => onChange(role, on ? areas.filter((x) => x !== a) : [...areas, a])}
                className={`adm-btn ${on ? "border-gold text-gold" : ""}`}
                data-size="sm"
              >
                {on ? "✓ " : ""}
                {AREA_INFO[a]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

type Activity = { id: string; by: string; action: string; target: string; detail: string; at: string };

export function AdminsManager({ admins, meId, activity }: { admins: AdminRow[]; meId: string; activity: Activity[] }) {
  const { run, pending } = useAction();
  const [invite, setInvite] = useState<{ email: string; role: AdminRole; areas: AdminArea[] } | null>(null);
  const [editing, setEditing] = useState<{ id: string; role: AdminRole; areas: AdminArea[] } | null>(null);

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      {invite ? (
        <form
          className="adm-panel flex flex-col gap-4 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => inviteAdmin(invite), { success: `Invite sent to ${invite.email}`, onOk: () => setInvite(null) });
          }}
        >
          <h2 className="adm-label text-gold/80">Invite someone</h2>
          <Field label="Email" hint="They'll get an email with a link; they choose their password on first sign-in.">
            <input className="adm-input" type="email" required value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} />
          </Field>
          <RolePicker role={invite.role} areas={invite.areas} onChange={(role, areas) => setInvite({ ...invite, role, areas })} />
          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Inviting…" : "Send invite"}
            </Button>
            <Button variant="ghost" onClick={() => setInvite(null)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="primary" className="self-start" onClick={() => setInvite({ email: "", role: "volunteer", areas: [] })}>
          + Invite someone
        </Button>
      )}

      <ul className="flex flex-col gap-3">
        {admins.map((a) => (
          <li key={a.id} className="adm-panel p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[15px]">{a.email}</span>
              <Badge tone={a.role === "admin" ? "warn" : "info"}>{ROLE_INFO[a.role].label}</Badge>
              {a.role === "custom" && <span className="text-[12px] text-parchment/50">{a.areas.map((x) => AREA_INFO[x]).join(", ")}</span>}
              {!a.joined && <Badge>invited</Badge>}
              {a.id === meId && <Badge tone="ok">you</Badge>}
            </div>
            <div className="mt-1 text-[12px] text-parchment/45">
              Added by {a.invitedBy}
              {a.lastLoginAt && ` · last in ${fmtDate(a.lastLoginAt)}`}
            </div>

            {editing?.id === a.id ? (
              <div className="mt-4 flex flex-col gap-3">
                <RolePicker role={editing.role} areas={editing.areas} onChange={(role, areas) => setEditing({ ...editing, role, areas })} />
                <div className="flex gap-2">
                  <Button variant="primary" disabled={pending} onClick={() => run(() => updateAdmin(a.id, editing), { success: "Role updated", onOk: () => setEditing(null) })}>
                    Save
                  </Button>
                  <Button variant="ghost" onClick={() => setEditing(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              a.id !== meId && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => setEditing({ id: a.id, role: a.role, areas: a.areas })}>
                    Change role
                  </Button>
                  {a.joined && (
                    <ConfirmButton
                      size="sm"
                      disabled={pending}
                      confirm="Reset? Signs them out too"
                      onConfirm={() => run(() => resetAdminPassword(a.id), { success: "Password reset. They pick a new one at next sign-in." })}
                    >
                      Reset password
                    </ConfirmButton>
                  )}
                  <ConfirmButton size="sm" variant="danger" disabled={pending} confirm="Remove access?" onConfirm={() => run(() => removeAdmin(a.id), { success: `${a.email} removed` })}>
                    Remove
                  </ConfirmButton>
                </div>
              )
            )}
          </li>
        ))}
      </ul>
      {!admins.length && <p className="text-[14px] text-parchment/55">No admins yet. Invite yourself first.</p>}

      <section className="mt-6">
        <h2 className="adm-label">Recent activity</h2>
        {activity.length ? (
          <div className="adm-panel mt-3 overflow-x-auto">
            <table className="adm-table min-w-[640px]">
              <tbody>
                {activity.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap text-[12.5px] text-parchment/50">{fmtDate(r.at)}</td>
                    <td className="text-[13px] text-parchment/70">{r.by}</td>
                    <td className="text-[13px]">
                      {r.action}
                      {r.target && <span className="text-gold/90"> · {r.target}</span>}
                      {r.detail && <span className="text-parchment/50"> · {r.detail}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-[13px] text-parchment/50">Nothing yet. Payments, check-in fixes, role changes and mail sends show up here.</p>
        )}
      </section>
    </div>
  );
}
