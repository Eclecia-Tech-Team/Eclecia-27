"use client";

import { useState } from "react";
import type { EventOption, NoticeRow } from "@/lib/admin/queries";
import { deleteNotice, saveNotice, type NoticeInput } from "@/lib/admin/actions/notices";
import { Badge, Button, ConfirmButton, Empty, Field, SwitchRow, fmtDate, useAction, useQueryState } from "./ui";

const TONES: { value: NoticeInput["tone"]; label: string; hint: string }[] = [
  { value: "info", label: "Info", hint: "General note" },
  { value: "update", label: "Update", hint: "Timing, venue or rule change" },
  { value: "important", label: "Important", hint: "Highlighted in gold" },
];

const blank = (eventId: string | null): NoticeInput => ({ eventId, title: "", body: "", tone: "info", pinned: false, expiresOn: "" });

export function NoticesManager({ notices, events, writable }: { notices: NoticeRow[]; events: EventOption[]; writable: boolean }) {
  const { get, set } = useQueryState();
  const filter = get("event");
  const [editing, setEditing] = useState<{ id: string | null; data: NoticeInput } | null>(null);
  const { run, pending } = useAction();

  const startNew = () => setEditing({ id: null, data: blank(filter && filter !== "all" ? filter : null) });

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <select className="adm-input sm:max-w-xs" value={filter} onChange={(e) => set({ event: e.target.value || null })} aria-label="Filter by event">
            <option value="">All notices</option>
            <option value="all">Fest-wide only</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
          {writable && !editing && (
            <Button variant="primary" onClick={startNew}>
              + New notice
            </Button>
          )}
        </div>

        {notices.length ? (
          <ul className="flex flex-col gap-3">
            {notices.map((n) => (
              <li key={n.id} className={`adm-panel p-4 ${n.expired ? "opacity-55" : ""} ${editing?.id === n.id ? "border-gold" : ""}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={n.tone === "important" ? "warn" : n.tone === "update" ? "info" : "mute"}>{n.tone}</Badge>
                  {n.pinned && <Badge tone="warn">pinned</Badge>}
                  {n.expired && <Badge tone="bad">expired</Badge>}
                  <span className="text-[12px] text-parchment/50">
                    {n.eventName ?? "Every event"} · {fmtDate(n.createdAt)}
                    {n.expiresOn && !n.expired && ` · until ${n.expiresOn}`}
                  </span>
                </div>
                <div className="mt-2 text-[15px] font-medium">{n.title}</div>
                <p className="mt-1 whitespace-pre-line text-[13.5px] leading-relaxed text-parchment/70">{n.body}</p>
                {writable && (
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        setEditing({ id: n.id, data: { eventId: n.eventId, title: n.title, body: n.body, tone: n.tone, pinned: n.pinned, expiresOn: n.expiresOn } })
                      }
                    >
                      Edit
                    </Button>
                    <ConfirmButton size="sm" variant="danger" disabled={pending} confirm="Delete?" onConfirm={() => run(() => deleteNotice(n.id), { success: "Notice deleted" })}>
                      Delete
                    </ConfirmButton>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No notices here yet.</Empty>
        )}
      </div>

      {editing && (
        <form
          className="adm-panel flex flex-col gap-4 self-start p-5 xl:sticky xl:top-6"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => saveNotice(editing.id, editing.data), { success: editing.id ? "Notice updated" : "Notice posted", onOk: () => setEditing(null) });
          }}
        >
          <h2 className="adm-label text-gold/80">{editing.id ? "Edit notice" : "New notice"}</h2>
          <Field label="Shown on">
            <select
              className="adm-input"
              value={editing.data.eventId ?? ""}
              onChange={(e) => setEditing({ ...editing, data: { ...editing.data, eventId: e.target.value || null } })}
            >
              <option value="">Every event page</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Title" hint={`${editing.data.title.length}/120`}>
            <input className="adm-input" maxLength={120} required value={editing.data.title} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, title: e.target.value } })} />
          </Field>
          <Field label="Message" hint={`${editing.data.body.length}/2000 · line breaks are kept`}>
            <textarea className="adm-input" rows={6} maxLength={2000} required value={editing.data.body} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, body: e.target.value } })} />
          </Field>
          <div>
            <span className="adm-label">Type</span>
            <div className="mt-1.5 grid grid-cols-3 gap-2" role="radiogroup">
              {TONES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={editing.data.tone === t.value}
                  title={t.hint}
                  onClick={() => setEditing({ ...editing, data: { ...editing.data, tone: t.value } })}
                  className={`adm-btn ${editing.data.tone === t.value ? "border-gold text-gold" : ""}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <SwitchRow label="Pin to top" checked={editing.data.pinned} onChange={(v) => setEditing({ ...editing, data: { ...editing.data, pinned: v } })} />
          <Field label="Hide after" hint="Optional. Disappears from the site after this day.">
            <input type="date" className="adm-input [color-scheme:dark]" value={editing.data.expiresOn} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, expiresOn: e.target.value } })} />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Saving…" : editing.id ? "Save" : "Post notice"}
            </Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
