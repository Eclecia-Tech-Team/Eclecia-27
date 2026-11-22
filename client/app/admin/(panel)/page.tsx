import Link from "next/link";
import { requireArea } from "@/lib/admin/page-guard";
import { getOverview } from "@/lib/admin/queries";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  await requireArea("overview");
  const o = await getOverview();
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "–");
  const maxDay = Math.max(1, ...o.days.map((d) => Math.max(d.signups, d.registrations)));
  const maxEvent = Math.max(1, ...o.byEvent.map((e) => e.count));

  const tiles: [string, number, string][] = [
    ["Accounts", o.users, `${pct(o.complete, o.users)} profiles complete`],
    ["Registrations", o.regs, `${pct(o.verified, o.regs)} verified`],
    ["Checked in", o.checkedIn, `${pct(o.checkedIn, o.verified)} of verified`],
    ["Teams", o.teams, `${o.open} of ${o.events} events open`],
  ];

  return (
    <>
      <PageHeader title="Overview" sub="Live numbers from the database." />

      <div className="grid grid-cols-2 gap-px border border-gold/20 bg-gold/20 lg:grid-cols-4">
        {tiles.map(([label, n, sub]) => (
          <div key={label} className="bg-[#0b0d10] p-5">
            <div className="adm-label">{label}</div>
            <div className="mt-2 font-display text-[40px] font-semibold leading-none text-parchment">{n.toLocaleString("en-IN")}</div>
            <div className="mt-2 text-[12.5px] text-parchment/50">{sub}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section className="adm-panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="adm-label">Last 14 days</h2>
            <div className="flex gap-4 text-[12px] text-parchment/55">
              <span className="flex items-center gap-1.5"><i className="h-2 w-2 bg-gold" /> Sign-ups</span>
              <span className="flex items-center gap-1.5"><i className="h-2 w-2 bg-[#8fb7c9]" /> Registrations</span>
            </div>
          </div>
          <div className="mt-5 flex h-44 items-end gap-1.5" role="img" aria-label="Sign-ups and registrations per day">
            {o.days.map((d) => (
              <div key={d.date} className="group relative flex h-full flex-1 items-end gap-px" title={`${d.date}: ${d.signups} sign-ups, ${d.registrations} registrations`}>
                <div className="flex-1 bg-gold/85" style={{ height: `${(d.signups / maxDay) * 100}%`, minHeight: d.signups ? 2 : 0 }} />
                <div className="flex-1 bg-[#8fb7c9]/85" style={{ height: `${(d.registrations / maxDay) * 100}%`, minHeight: d.registrations ? 2 : 0 }} />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between font-mono text-[10.5px] text-parchment/40">
            <span>{o.days[0]?.date.slice(5)}</span>
            <span>today</span>
          </div>
        </section>

        <section className="adm-panel p-5">
          <h2 className="adm-label">Registrations by event</h2>
          {o.byEvent.length ? (
            <ul className="mt-4 flex max-h-[19rem] flex-col gap-2 overflow-y-auto pr-1">
              {o.byEvent.map((e) => (
                <li key={e.id}>
                  <Link href={`/admin/registrations?event=${e.id}`} className="group grid grid-cols-[minmax(0,10rem)_1fr_2.5rem] items-center gap-3 text-[13px]">
                    <span className="truncate text-parchment/80 group-hover:text-gold">{e.name}</span>
                    <span className="h-2 bg-white/5">
                      <span className="block h-full bg-gold/80" style={{ width: `${(e.count / maxEvent) * 100}%` }} />
                    </span>
                    <span className="text-right font-mono text-parchment/60">{e.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-[14px] text-parchment/50">No events yet.</p>
          )}
        </section>
      </div>
    </>
  );
}
