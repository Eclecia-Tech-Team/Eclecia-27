"use client";

import { useState, useEffect, type FormEvent, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GoldActionButton, GoldButton } from "@/components/common/GoldButton";
import type { EventPageData } from "@/lib/event-page";

type Props = Pick<EventPageData, "event" | "viewer">;
type Message = { tone: "error" | "success"; text: string } | null;

/** Registration panel: every state from "sign in" to "you're in, here's your team". */
export function RegistrationCard({ event, viewer }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [refCode, setRefCode] = useState<string>(() => {
    const queryRef = searchParams.get("ref") || searchParams.get("refCode");
    if (queryRef) {
      const code = queryRef.trim().toUpperCase();
      try {
        sessionStorage.setItem("eclecia_ambassador_ref", code);
        localStorage.setItem("eclecia_ambassador_ref", code);
      } catch {}
      return code;
    }
    try {
      const stored =
        sessionStorage.getItem("eclecia_ambassador_ref") ||
        localStorage.getItem("eclecia_ambassador_ref");
      return stored ? stored.trim().toUpperCase() : "";
    } catch {
      return "";
    }
  });
  const here = `/events/${event.slug}`;

  // Keep storage in sync if query param changes later
  useEffect(() => {
    const queryRef = searchParams.get("ref") || searchParams.get("refCode");
    if (queryRef) {
      const code = queryRef.trim().toUpperCase();
      const timer = setTimeout(() => {
        setRefCode(code);
      }, 0);
      try {
        sessionStorage.setItem("eclecia_ambassador_ref", code);
        localStorage.setItem("eclecia_ambassador_ref", code);
      } catch {}
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  /** Calls a registration route; routes the visitor to sign-in / profile when the API says so. */
  const call = async (url: string, method: "POST" | "PATCH", body?: object) => {
    setBusy(true);
    setMessage(null);
    try {
      const payload = body ? { ...body, ...(refCode ? { refCode } : {}) } : (refCode ? { refCode } : undefined);
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: payload ? JSON.stringify(payload) : undefined,
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string; code?: string };
      if (data.code === "UNAUTHENTICATED") return router.push(`/login?callbackUrl=${encodeURIComponent(here)}`);
      if (data.code === "PROFILE_INCOMPLETE") return router.push(`/profile?returnTo=${encodeURIComponent(here)}`);
      if (!res.ok) {
        setMessage({ tone: "error", text: data.error ?? "Something went wrong. Please try again." });
        return false;
      }
      setMessage({ tone: "success", text: data.message ?? "Done." });
      router.refresh();
      return true;
    } catch {
      setMessage({ tone: "error", text: "Network hiccup. Please try again." });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const { registration, team } = viewer;
  const feeLine = event.isPaidEvent && event.fees > 0 ? `Entry fee ₹${event.fees}` : "Free entry";

  let body: ReactNode;
  if (registration) {
    body = team ? (
      <TeamPanel event={event} team={team} busy={busy} onLeave={() => call(`/api/registration/team/leave/${team.id}`, "POST")} />
    ) : (
      <SoloRegistered
        event={event}
        verified={registration.verified}
        busy={busy}
        onWithdraw={() => call(`/api/registration/my-events/de-register/${registration.id}`, "PATCH")}
      />
    );
  } else if (!event.isActive) {
    body = (
      <Status title="Registrations open soon">
        Keep an eye on the notices on this page: the opening date, fee and slots are posted there first.
      </Status>
    );
  } else if (!viewer.signedIn) {
    body = (
      <div className="flex flex-col items-center gap-5 text-center">
        <p className="text-[15px] leading-relaxed text-parchment/75">Sign in to register for {event.name}.</p>
        <GoldButton href={`/login?callbackUrl=${encodeURIComponent(here)}`}>Sign in to register</GoldButton>
      </div>
    );
  } else if (!viewer.profileComplete) {
    body = (
      <div className="flex flex-col items-center gap-5 text-center">
        <p className="text-[15px] leading-relaxed text-parchment/75">
          Coordinators need your full name, phone and college. Finish your profile, then come back here.
        </p>
        <GoldButton href={`/profile?returnTo=${encodeURIComponent(here)}`}>Complete profile</GoldButton>
      </div>
    );
  } else if (event.isTeamEvent) {
    body = (
      <TeamForms
        event={event}
        busy={busy}
        onCreate={(teamName) => call(`/api/registration/team/create/${event.slug}`, "POST", { teamName })}
        onJoin={(teamCode) => call(`/api/registration/team/join/${event.slug}`, "POST", { teamCode })}
      />
    );
  } else {
    body = <SoloRegister event={event} busy={busy} onRegister={() => call(`/api/registration/solo/${event.slug}`, "POST")} />;
  }

  return (
    <section className="ev-card p-6 sm:p-7" aria-labelledby="register-heading">
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h2 id="register-heading" className="ev-eyebrow">
          Registration
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-parchment/55">{feeLine}</span>
      </div>
      {message && (
        <p
          role={message.tone === "error" ? "alert" : "status"}
          className={`mb-5 border-l-2 py-1 pl-3 text-[14px] leading-snug ${
            message.tone === "error" ? "border-red-400 text-red-200" : "border-gold text-parchment/90"
          }`}
        >
          {message.text}
        </p>
      )}
      {!viewer.registration && refCode && (
        <div className="mb-4 flex items-center justify-between border border-gold/30 bg-gold/5 px-3 py-1.5 font-mono text-[11px] text-gold">
          <span className="text-parchment/60">Ambassador Referral</span>
          <span className="font-semibold tracking-wider">{refCode}</span>
        </div>
      )}
      {body}
    </section>
  );
}

function Status({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="text-center">
      <p className="font-display text-[26px] leading-tight text-parchment">{title}</p>
      <p className="mt-3 text-[14px] leading-relaxed text-parchment/65">{children}</p>
    </div>
  );
}

/** Two-step: the first press asks, the second registers. */
function SoloRegister({ event, busy, onRegister }: { event: Props["event"]; busy: boolean; onRegister: () => void }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <p className="text-[15px] leading-relaxed text-parchment/75">
        {confirming
          ? `Register for ${event.name}? You can withdraw later from this page${event.isPaidEvent ? " until your fee is verified" : ""}.`
          : "Solo event: one press and your seat is booked."}
      </p>
      <div className="flex items-center gap-6">
        <GoldActionButton onClick={confirming ? onRegister : () => setConfirming(true)} disabled={busy} className="disabled:pointer-events-none disabled:opacity-50">
          {busy ? "One moment…" : confirming ? "Confirm" : "Register"}
        </GoldActionButton>
        {confirming && !busy && (
          <button type="button" onClick={() => setConfirming(false)} className="text-[13px] text-parchment/60 underline-offset-4 hover:text-gold hover:underline">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

function SoloRegistered({ event, verified, busy, onWithdraw }: { event: Props["event"]; verified: boolean; busy: boolean; onWithdraw: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const pending = event.isPaidEvent && !verified;
  const canWithdraw = !(event.isPaidEvent && verified);
  return (
    <div className="text-center">
      <p className="font-display text-[28px] leading-tight text-gold">You&apos;re registered</p>
      <p className="mt-2 text-[14px] leading-relaxed text-parchment/70">
        {pending
          ? `Payment pending: your seat is confirmed once the ₹${event.fees} fee is verified. Payment details are posted in the notices.`
          : "See you at the event. Updates will appear in the notices on this page."}
      </p>
      {canWithdraw && (
        <div className="mt-5 flex items-center justify-center gap-5 text-[13px]">
          {confirming ? (
            <>
              <button type="button" disabled={busy} onClick={onWithdraw} className="text-red-200 underline underline-offset-4 disabled:opacity-50">
                {busy ? "Withdrawing…" : "Yes, withdraw"}
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="text-parchment/60 hover:text-gold">
                Keep my seat
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className="text-parchment/55 underline-offset-4 hover:text-gold hover:underline">
              Withdraw registration
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function TeamForms({
  event,
  busy,
  onCreate,
  onJoin,
}: {
  event: Props["event"];
  busy: boolean;
  onCreate: (teamName: string) => void;
  onJoin: (teamCode: string) => void;
}) {
  const [tab, setTab] = useState<"create" | "join">("create");
  const [teamName, setTeamName] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (tab === "create") onCreate(teamName.trim());
    else onJoin(teamCode.trim().toUpperCase());
  };

  return (
    <div>
      <p className="mb-5 text-[14px] leading-relaxed text-parchment/70">
        Teams of {event.minMembers === event.maxMembers ? event.maxMembers : `${event.minMembers}–${event.maxMembers}`}. One
        person creates the team and shares its code; everyone else joins with it.
      </p>
      <div role="tablist" className="mb-5 grid grid-cols-2 border-b border-gold/20">
        {(["create", "join"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className="ev-tab -mb-px border-b-2 border-transparent pb-2.5 font-mono text-[11px] uppercase tracking-[0.25em] text-parchment/55 transition-colors hover:text-parchment"
          >
            {t === "create" ? "Create team" : "Join team"}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="flex flex-col gap-5">
        {tab === "create" ? (
          <label className="flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-parchment/55">Team name</span>
            <input className="ev-input" value={teamName} onChange={(e) => setTeamName(e.target.value)} maxLength={40} placeholder="e.g. Midnight Raga" />
          </label>
        ) : (
          <label className="flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-parchment/55">Team code</span>
            <input
              className="ev-input font-mono uppercase tracking-[0.2em]"
              value={teamCode}
              onChange={(e) => setTeamCode(e.target.value)}
              placeholder="ECL-XXXXXXXX"
              autoCapitalize="characters"
              spellCheck={false}
            />
          </label>
        )}
        <div className="flex justify-center">
          <GoldActionButton
            type="submit"
            disabled={busy || (tab === "create" ? teamName.trim().length < 2 : !teamCode.trim())}
            className="disabled:pointer-events-none disabled:opacity-50"
          >
            {busy ? "One moment…" : tab === "create" ? "Create team" : "Join team"}
          </GoldActionButton>
        </div>
      </form>
    </div>
  );
}

function TeamPanel({
  event,
  team,
  busy,
  onLeave,
}: {
  event: Props["event"];
  team: NonNullable<Props["viewer"]["team"]>;
  busy: boolean;
  onLeave: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const size = team.members.length;
  const short = event.minMembers - size;
  const pending = event.isPaidEvent && team.paymentStatus !== "completed";
  const locked = team.paymentStatus === "completed";
  const soloLeader = team.isLeader && size === 1;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(team.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  return (
    <div>
      <p className="font-display text-[26px] leading-tight text-gold">{team.name || "Your team"}</p>
      <p className="mt-1 text-[13px] text-parchment/60">
        {size} of {event.maxMembers} members{team.isLeader ? " · you lead this team" : ""}
      </p>

      <div className="mt-5 flex items-center justify-between gap-3 border border-gold/30 bg-black/40 px-4 py-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-parchment/50">Team code</p>
          <p className="mt-1 font-mono text-[17px] tracking-[0.18em] text-parchment">{team.code}</p>
        </div>
        <button type="button" onClick={copy} className="font-mono text-[11px] uppercase tracking-[0.25em] text-gold hover:text-parchment">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <ul className="mt-5 divide-y divide-gold/10">
        {team.members.map((m) => (
          <li key={m.id} className="flex items-center justify-between py-2.5 text-[14px]">
            <span className="text-parchment/90">
              {m.name}
              {m.isYou && <span className="text-parchment/45"> (you)</span>}
            </span>
            {m.isLeader && <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-gold">Leader</span>}
          </li>
        ))}
      </ul>

      {short > 0 && (
        <p className="mt-4 border-l-2 border-gold/60 pl-3 text-[13px] leading-snug text-parchment/75">
          {short === 1 ? "1 more member" : `${short} more members`} needed to compete. Share the code above.
        </p>
      )}
      {pending && (
        <p className="mt-4 border-l-2 border-gold/60 pl-3 text-[13px] leading-snug text-parchment/75">
          Payment pending: the team&apos;s ₹{event.fees} fee is verified by the coordinators. Payment details are posted in the notices.
        </p>
      )}

      {!locked && (team.isLeader ? soloLeader : true) && (
        <div className="mt-6 flex items-center justify-center gap-5 text-[13px]">
          {confirming ? (
            <>
              <button type="button" disabled={busy} onClick={onLeave} className="text-red-200 underline underline-offset-4 disabled:opacity-50">
                {busy ? "One moment…" : soloLeader ? "Yes, disband" : "Yes, leave"}
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="text-parchment/60 hover:text-gold">
                Stay
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className="text-parchment/55 underline-offset-4 hover:text-gold hover:underline">
              {soloLeader ? "Disband team" : "Leave team"}
            </button>
          )}
        </div>
      )}
      {team.isLeader && size > 1 && (
        <p className="mt-6 text-center text-[13px] text-parchment/55">
          Rename the team or remove members from{" "}
          <a href="/profile" className="text-gold underline-offset-4 hover:underline">
            your profile
          </a>
          .
        </p>
      )}
    </div>
  );
}
