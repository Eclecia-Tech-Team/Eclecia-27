import { getAdmin } from "@/lib/admin/session";
import { can } from "@/lib/admin/access";
import { exportRegistrations } from "@/lib/admin/queries";

const cell = (v: unknown) => {
  const s = String(v ?? "");
  // Quote everything; neutralise spreadsheet formulas.
  return `"${(/^[=+\-@\t\r|]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

/** CSV of the registrations matching the current filters. */
export async function GET(request: Request) {
  const admin = await getAdmin();
  if (!admin || !can(admin, "registrations")) return new Response("Unauthorized", { status: 401 });

  const sp = new URL(request.url).searchParams;
  const rows = await exportRegistrations({ eventId: sp.get("event") ?? "", status: sp.get("status") ?? "", q: sp.get("q") ?? "" });
  const header = ["Registration ID", "Event", "Name", "Username", "Email", "Phone", "College", "Stream", "Team", "Team code", "Leader", "Payment", "Verified", "Checked in", "Checked in at", "Food", "Registered at"];
  const lines = rows.map((r) =>
    [
      r.code,
      r.eventName,
      r.participant.name,
      r.participant.username,
      r.participant.email,
      r.participant.phone,
      r.participant.college,
      r.participant.stream,
      r.team?.name ?? "",
      r.team?.code ?? "",
      r.team ? (r.team.isLeader ? "yes" : "no") : "",
      r.team?.payment ?? "",
      r.verified ? "yes" : "no",
      r.checkedIn ? "yes" : "no",
      r.checkedInAt ?? "",
      r.food,
      r.createdAt,
    ]
      .map(cell)
      .join(","),
  );
  const csv = "﻿" + [header.map(cell).join(","), ...lines].join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="eclecia-registrations-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
