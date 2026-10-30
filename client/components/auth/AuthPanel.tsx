"use client";

import { useState, type FormEvent, type InputHTMLAttributes } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import { GoldActionButton } from "@/components/common/GoldButton";
import { TransitionLink } from "@/components/common/TransitionLink";

type Mode = "register" | "login" | "verify";

export interface AuthPanelProps {
  initialMode: "register" | "login";
  googleEnabled: boolean;
  /** Set when already signed in; the panel then shows the account instead of the forms. */
  user?: { username?: string; email?: string | null } | null;
  initialError?: string | null;
}

const DEVICE_ID_KEY = "eclecia_otp_device";

/** Per-tab id the OTP is bound to, so a code only works where it was requested. */
function getDeviceId() {
  let id = sessionStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID().replaceAll("-", "");
    sessionStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

async function post<T = { error?: string; message?: string }>(url: string, body: object) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, deviceId: getDeviceId() }),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  return { ok: res.ok, data };
}

export function AuthPanel({ initialMode, googleEnabled, user, initialError }: AuthPanelProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [notice, setNotice] = useState<string | null>(null);

  const switchMode = (next: "register" | "login") => {
    setMode(next);
    setError(null);
    setNotice(null);
    // Keep the URL honest so refresh / share lands on the same tab.
    router.replace(next === "login" ? "/login" : "/register", { scroll: false });
  };

  const finishSignIn = async () => {
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setError("Couldn't sign you in. Please try again.");
      return;
    }
    router.refresh();
  };

  const run = (task: () => Promise<void>) => async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await task();
    } catch {
      setError("Network hiccup. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const onRegister = run(async () => {
    const { ok, data } = await post("/api/auth/register", { username, email, password });
    if (!ok) return setError(data.error ?? "Couldn't create your account.");
    setNotice(`We sent a 6-digit code to ${email}.`);
    setMode("verify");
  });

  const onLogin = run(async () => {
    const { ok, data } = await post<{ requiresVerification?: boolean; message?: string }>(
      "/api/auth/signin-check",
      { email, password },
    );
    if (!ok) return setError(data.error ?? "Invalid email or password");
    if (data.requiresVerification) {
      setNotice(data.message ?? `We sent a 6-digit code to ${email}.`);
      setMode("verify");
      return;
    }
    await finishSignIn();
  });

  const onVerify = run(async () => {
    const { ok, data } = await post("/api/auth/verify-otp", { email, otp });
    if (!ok) return setError(data.error ?? "That code didn't work.");
    await finishSignIn();
  });

  const onResend = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const { ok, data } = await post("/api/auth/resend-otp", { email }).catch(() => ({
      ok: false,
      data: { error: "Network hiccup. Please try again." } as { error?: string },
    }));
    setBusy(false);
    if (!ok) setError(data.error ?? "Couldn't resend the code.");
    else setNotice(`New code sent to ${email}.`);
  };

  if (user) {
    return (
      <Shell eyebrow="You're in" title={user.username ?? "Welcome"}>
        <p className="text-center font-sans text-[15px] leading-relaxed text-parchment/75">
          Signed in as <span className="text-parchment">{user.email}</span>. Event registrations open
          soon; we&apos;ll email you when they do.
        </p>
        <div className="mt-8 flex flex-col items-center gap-5">
          <GoldActionButton onClick={() => signOut({ redirectTo: "/login" })} variant="ghost" size="sm">
            Sign out
          </GoldActionButton>
          <TransitionLink
            href="/events"
            className="font-mono text-[11px] uppercase tracking-[0.35em] text-parchment/60 transition-colors hover:text-gold"
          >
            Explore the events →
          </TransitionLink>
        </div>
      </Shell>
    );
  }

  if (mode === "verify") {
    return (
      <Shell eyebrow="Verify email" title="Check your inbox">
        <form onSubmit={onVerify} className="flex flex-col gap-6" noValidate>
          <Messages error={error} notice={notice} />
          <Field
            label="6-digit code"
            value={otp}
            onChange={(v) => setOtp(v.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            className="text-center text-[24px] tracking-[0.5em]"
          />
          <Submit busy={busy} disabled={otp.length !== 6}>
            Verify &amp; enter
          </Submit>
        </form>
        <div className="mt-6 flex justify-between font-mono text-[11px] uppercase tracking-[0.25em] text-parchment/60">
          <button type="button" onClick={() => switchMode("login")} className="transition-colors hover:text-gold">
            ← Back
          </button>
          <button type="button" onClick={onResend} disabled={busy} className="transition-colors hover:text-gold disabled:opacity-50">
            Resend code
          </button>
        </div>
      </Shell>
    );
  }

  const registering = mode === "register";

  return (
    <Shell eyebrow={registering ? "Registrations" : "Welcome back"} title={registering ? "Join Eclecia'27" : "Sign in"}>
      <div role="tablist" aria-label="Account" className="mb-8 grid grid-cols-2 border-b border-gold/25">
        {(["register", "login"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={mode === tab}
            onClick={() => switchMode(tab)}
            className={`-mb-px border-b-2 pb-3 font-mono text-[11px] uppercase tracking-[0.3em] transition-colors ${
              mode === tab ? "border-gold text-gold" : "border-transparent text-parchment/55 hover:text-parchment"
            }`}
          >
            {tab === "register" ? "Create account" : "Sign in"}
          </button>
        ))}
      </div>

      <form onSubmit={registering ? onRegister : onLogin} className="flex flex-col gap-6" noValidate>
        <Messages error={error} notice={notice} />
        {registering && (
          <Field
            label="Username"
            value={username}
            onChange={setUsername}
            autoComplete="username"
            minLength={3}
            maxLength={30}
            hint="Letters, numbers, _ and -"
          />
        )}
        <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete={registering ? "new-password" : "current-password"}
          hint={registering ? "At least 8 characters" : undefined}
        />
        <Submit busy={busy} disabled={!email || !password || (registering && !username)}>
          {registering ? "Create account" : "Sign in"}
        </Submit>
      </form>

      {googleEnabled && (
        <>
          <div className="my-7 flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.3em] text-parchment/40">
            <span className="h-px flex-1 bg-gold/20" />
            or
            <span className="h-px flex-1 bg-gold/20" />
          </div>
          <button
            type="button"
            onClick={() => signIn("google", { redirectTo: "/register" })}
            className="w-full border border-gold/40 py-3 font-mono text-[11px] uppercase tracking-[0.3em] text-parchment transition-colors hover:border-gold hover:text-gold"
          >
            Continue with Google
          </button>
        </>
      )}
    </Shell>
  );
}

function Shell({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="w-full max-w-[420px] border border-gold/30 bg-black/55 px-6 py-9 backdrop-blur-md sm:px-9">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-gold">{eyebrow}</p>
        <h1 className="font-nasyhama text-[30px] font-normal leading-tight text-parchment sm:text-[36px]">{title}</h1>
        <span className="h-0.5 w-12 rounded-full bg-gold" />
      </div>
      {children}
    </section>
  );
}

function Messages({ error, notice }: { error: string | null; notice: string | null }) {
  if (!error && !notice) return null;
  return (
    <p
      role={error ? "alert" : "status"}
      className={`border-l-2 py-1 pl-3 font-sans text-[13px] leading-snug ${
        error ? "border-red-400 text-red-200" : "border-gold text-parchment/85"
      }`}
    >
      {error ?? notice}
    </p>
  );
}

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
};

function Field({ label, value, onChange, hint, className = "", ...input }: FieldProps) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-parchment/60">{label}</span>
      <input
        {...input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`border-b border-gold/35 bg-transparent pb-2 font-sans text-[16px] text-parchment outline-none transition-colors placeholder:text-parchment/30 focus:border-gold ${className}`}
      />
      {hint && <span className="font-sans text-[12px] text-parchment/45">{hint}</span>}
    </label>
  );
}

function Submit({ busy, disabled, children }: { busy: boolean; disabled?: boolean; children: React.ReactNode }) {
  return (
    <div className="mt-2 flex justify-center">
      <GoldActionButton type="submit" disabled={busy || disabled} className="disabled:pointer-events-none disabled:opacity-50">
        {busy ? "One moment…" : children}
      </GoldActionButton>
    </div>
  );
}
