/* eslint-disable @next/next/no-img-element */
"use client";

import {
  startTransition,
  useEffect,
  useOptimistic,
  useRef,
  useState,
  type FormEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { signOutHome } from "@/lib/sign-out";
import { TransitionLink } from "@/components/common/TransitionLink";
import { ASSETS } from "@/constants/assets";
import { atlasArt } from "@/constants/events";

type Tab = "login" | "register";
type View = "credentials" | "verify" | "forgot" | "reset";

export interface AuthPanelProps {
  googleEnabled: boolean;
  /** Set when already signed in; the panel then shows the account instead of the forms. */
  user?: { username?: string; email?: string | null } | null;
}

const TAB_HREF: Record<Tab, string> = { login: "/login", register: "/register" };
const TABS: { id: Tab; label: string }[] = [
  { id: "login", label: "Sign in" },
  { id: "register", label: "Create account" },
];

/** In tab order, so headings slide the way the tab underline does. */
const HEADINGS = {
  login: { title: "Welcome back", sub: "Sign in to register for events and carry your pass." },
  register: { title: "Take your seat", sub: "One account for every event, team and your festival pass." },
  forgot: { title: "Forgot password?", sub: "We'll email you a 6-digit code to set a new one." },
  reset: { title: "New password", sub: "Enter the code we emailed you, then your new password." },
  verify: { title: "Check your inbox", sub: "Enter the 6-digit code we just sent you." },
  account: { title: "You're in", sub: "Your Eclecia’27 account is ready." },
} as const;

const ERRORS: Record<string, string> = {
  use_credentials: "This email already has a password account. Sign in with your email and password.",
  CredentialsSignin: "Invalid email or password.",
};

const NETWORK_ERROR = "Network error. Please try again.";
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

export function AuthPanel({ googleEnabled, user }: AuthPanelProps) {
  const router = useRouter();
  const pathTab: Tab = usePathname() === "/login" ? "login" : "register";
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error");
  // Moves on click; settles on the URL once the navigation lands.
  const [tab, setTab] = useOptimistic(pathTab);
  const [view, setView] = useState<View>("credentials");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    errorCode ? (ERRORS[errorCode] ?? "Sign-in failed. Please try again.") : null,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // A link elsewhere on the page (Join Us) can change the route mid-flow.
  const [seenPathTab, setSeenPathTab] = useState(pathTab);
  if (pathTab !== seenPathTab) {
    setSeenPathTab(pathTab);
    setView("credentials");
    setError(null);
    setNotice(null);
  }

  useEffect(() => {
    if (view === "credentials") return;
    panelRef.current?.querySelector<HTMLInputElement>(`[data-view="${view}"] input`)?.focus({ preventScroll: true });
  }, [view]);

  const switchTab = (next: Tab) => {
    setView("credentials");
    setError(null);
    setNotice(null);
    if (next === pathTab) return;
    // Same layout on both routes, so this only swaps metadata and keeps the URL honest.
    startTransition(() => {
      setTab(next);
      router.replace(TAB_HREF[next], { scroll: false });
    });
  };

  const finishSignIn = async () => {
    const callbackUrl = searchParams.get("callbackUrl") || "/profile";
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setError("We couldn't sign you in. Please try again.");
      return;
    }
    router.push(callbackUrl);
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
      setError(NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  };

  const onRegister = run(async () => {
    const { ok, data } = await post("/api/auth/register", { username, email, password });
    if (!ok) return setError(data.error ?? "We couldn't create your account.");
    setOtp("");
    setNotice(`We sent a 6-digit code to ${email}.`);
    setView("verify");
  });

  const onLogin = run(async () => {
    const { ok, data } = await post<{ requiresVerification?: boolean; message?: string }>(
      "/api/auth/signin-check",
      { email, password },
    );
    if (!ok) return setError(data.error ?? "Invalid email or password.");
    if (data.requiresVerification) {
      setOtp("");
      setNotice(data.message ?? `We sent a 6-digit code to ${email}.`);
      setView("verify");
      return;
    }
    await finishSignIn();
  });

  const onVerify = run(async () => {
    const { ok, data } = await post("/api/auth/verify-otp", { email, otp });
    if (!ok) return setError(data.error ?? "That code didn't work.");
    await finishSignIn();
  });

  const onForgot = run(async () => {
    const { ok, data } = await post("/api/auth/forgot-password", { email });
    if (!ok) return setError(data.error ?? "We couldn't send a reset code.");
    setOtp("");
    setNewPassword("");
    setNotice(`We sent a 6-digit code to ${email}.`);
    setView("reset");
  });

  const onReset = run(async () => {
    const { ok, data } = await post("/api/auth/reset-password", { email, otp, newPassword });
    if (!ok) return setError(data.error ?? "We couldn't reset your password.");
    setPassword("");
    setNotice("Your password has been reset. Sign in with your new password.");
    setView("credentials");
  });

  /** Resend for the verify and reset views; each has its own endpoint. */
  const onResend = async (url: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const { ok, data } = await post(url, { email }).catch(() => ({
      ok: false,
      data: { error: NETWORK_ERROR } as { error?: string },
    }));
    setBusy(false);
    if (!ok) setError(data.error ?? "We couldn't resend the code.");
    else setNotice(`We sent a new code to ${email}.`);
  };

  const registering = tab === "register";
  const heading = user ? "account" : view === "credentials" ? tab : view;
  const onForm = !user && view === "credentials";

  return (
    <section
      data-tab={registering && !user ? "register" : "login"}
      className="auth-card relative grid w-full max-w-[440px] overflow-hidden md:min-h-[600px] md:max-w-[960px] md:grid-cols-[5fr_6fr]"
    >
      <ArtPane art={registering && !user ? "register" : "login"} />

      <div ref={panelRef} className="relative px-7 pt-8 pb-2 sm:px-12 md:pt-12 md:pb-4">
        <header className="mb-8">
          <p className="auth-eyebrow">Eclecia ’27 · 15–17 January<span className="hidden sm:inline"> · HITK</span></p>
          <h1 className="mt-4 font-display text-[40px] font-semibold leading-[1.02] tracking-[-0.01em] text-parchment sm:text-[46px]">
            <Swap
              active={heading}
              items={Object.entries(HEADINGS).map(([id, h]) => ({
                id,
                node: id === "account" && user?.username ? user.username : h.title,
              }))}
            />
          </h1>
          <p className="mt-3 w-full font-sans text-[15px] leading-relaxed text-parchment/60">
            <Swap
              active={heading}
              className="w-full"
              items={Object.entries(HEADINGS).map(([id, h]) => ({ id, node: h.sub }))}
            />
          </p>
        </header>

        <Collapse open={onForm}>
          <Tabs tab={tab} onSelect={switchTab} />
        </Collapse>

        <Messages error={error} notice={notice} />

        <Collapse open={!!user}>
          {user && <Account user={user} />}
        </Collapse>

        <Collapse open={onForm}>
          <form
            id="auth-credentials"
            role="tabpanel"
            aria-label={registering ? "Register" : "Sign In"}
            onSubmit={registering ? onRegister : onLogin}
            noValidate
          >
            <Collapse open={registering}>
              <Field
                label="Username"
                name="username"
                value={username}
                onChange={setUsername}
                autoComplete="username"
                minLength={3}
                maxLength={30}
                hint="Letters, numbers, _ and -. You can change it later."
              />
            </Collapse>
            <Field label="Email" name="email" type="email" value={email} onChange={setEmail} autoComplete="email" placeholder="you@college.edu" />
            <Field
              label="Password"
              name="password"
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete={registering ? "new-password" : "current-password"}
              footer={
                <>
                  <Collapse open={registering}>
                    <p className="pt-2 font-sans text-[12.5px] text-parchment/45">At least 8 characters.</p>
                  </Collapse>
                  <Collapse open={!registering}>
                    <div className="flex justify-end pt-2">
                      <TextButton
                        onClick={() => {
                          setError(null);
                          setNotice(null);
                          setView("forgot");
                        }}
                      >
                        Forgot password?
                      </TextButton>
                    </div>
                  </Collapse>
                </>
              }
            />
            <Submit disabled={busy || !email || !password || (registering && !username)}>
              <Swap
                active={busy ? "busy" : tab}
                items={[
                  { id: "login", node: "Sign in" },
                  { id: "register", node: "Create account" },
                  { id: "busy", node: "One moment…" },
                ]}
              />
            </Submit>
          </form>

          {googleEnabled && (
            <>
              <div className="flex items-center gap-4 pt-1 pb-5 font-mono text-[10px] uppercase tracking-[0.3em] text-parchment/40">
                <span className="h-px flex-1 bg-parchment/10" />
                or
                <span className="h-px flex-1 bg-parchment/10" />
              </div>
              <div className="pb-6">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => signIn("google", { redirectTo: searchParams.get("callbackUrl") || "/profile" })}
                  className="auth-google-btn group relative flex h-[52px] w-full items-center justify-center gap-3 font-sans text-[14.5px] text-parchment/90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <GoogleMark className="transition-all duration-300 group-disabled:opacity-35 group-disabled:grayscale-[0.7]" />
                  <span>Continue with Google</span>
                </button>
              </div>
            </>
          )}
        </Collapse>

        <Collapse open={!user && view === "verify"}>
          <form data-view="verify" onSubmit={onVerify} noValidate>
            <CodeField value={otp} onChange={setOtp} />
            <Submit disabled={busy || otp.length !== 6}>{busy ? "One moment…" : "Verify and continue"}</Submit>
            <FlowLinks onBack={() => switchTab("login")} onResend={() => onResend("/api/auth/resend-otp")} busy={busy} />
          </form>
        </Collapse>

        <Collapse open={!user && view === "forgot"}>
          <form data-view="forgot" onSubmit={onForgot} noValidate>
            <Field label="Email" name="email" type="email" value={email} onChange={setEmail} autoComplete="email" placeholder="you@college.edu" />
            <Submit disabled={busy || !email}>{busy ? "One moment…" : "Send code"}</Submit>
            <FlowLinks onBack={() => switchTab("login")} busy={busy} />
          </form>
        </Collapse>

        <Collapse open={!user && view === "reset"}>
          <form data-view="reset" onSubmit={onReset} noValidate>
            <CodeField value={otp} onChange={setOtp} />
            <Field
              label="New password"
              name="new-password"
              type="password"
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
              hint="At least 8 characters."
            />
            <Submit disabled={busy || otp.length !== 6 || newPassword.length < 8}>
              {busy ? "One moment…" : "Set new password"}
            </Submit>
            <FlowLinks onBack={() => switchTab("login")} onResend={() => onResend("/api/auth/forgot-password")} busy={busy} />
          </form>
        </Collapse>
      </div>
    </section>
  );
}

/**
 * The landing's finale in miniature: wordmark over the eclipse,
 * mask-and-sitar banners framing the sky, hills with the veena (sign in) or
 * the mudra hand (register) in front. The eclipse sets for sign-in and
 * rises for register.
 */
function ArtPane({ art }: { art: Tab }) {
  return (
    <div aria-hidden className="auth-art relative z-[1] h-44 overflow-hidden md:h-auto">
      {/* Sky */}
      <img src={ASSETS.cloudinary.bg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
      <img src={atlasArt.shared("gold-dust")} alt="" className="auth-dust absolute inset-0 h-full w-full object-cover opacity-50 mix-blend-screen" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_55%,transparent_20%,rgba(5,5,6,0.75)_75%)]" />

      {/* Eclipse */}
      <div className="auth-eclipse absolute bottom-[34%] left-1/2 w-[112px] md:bottom-[27%] md:w-[310px]">
        {/* Banners hang off the eclipse itself: always centred on it, mirrored, and rising/setting with it. */}
        <img src={ASSETS.cloudinary.banner} alt="" className="auth-banner absolute top-1/2 right-[calc(100%-22px)] hidden w-[118px] max-w-none -translate-y-1/2 md:block" />
        <img src={ASSETS.cloudinary.banner} alt="" className="auth-banner absolute top-1/2 left-[calc(100%-22px)] hidden w-[118px] max-w-none -translate-y-1/2 -scale-x-100 md:block" />
        <img src={ASSETS.cloudinary.blacksun} alt="" className="relative w-full" />
      </div>

      {/* Ground and the piece in front */}
      <img src={ASSETS.cloudinary.bottom} alt="" className="absolute inset-x-0 bottom-0 w-full md:h-[32%] md:object-cover md:object-top" />
      <img
        src={ASSETS.cloudinary.veena}
        alt=""
        data-state={art === "login" ? "active" : "before"}
        className="auth-art-piece absolute bottom-[2%] left-[8%] hidden w-[84%] md:block"
      />
      <img
        src={ASSETS.cloudinary.hand}
        alt=""
        data-state={art === "register" ? "active" : "after"}
        className="auth-art-piece absolute bottom-[2%] left-[20%] hidden w-[60%] md:block"
      />

      {/* Title block */}
      <div className="absolute inset-x-0 top-8 hidden flex-col items-center px-10 text-center md:flex">
        <img src={ASSETS.cloudinary.wordmarkBlacker} alt="" className="w-[72%] max-w-[330px] drop-shadow-[0_8px_24px_rgba(0,0,0,0.7)]" />
        <p className="-mt-1 font-display text-[22px] italic leading-snug text-gold/95 [text-shadow:0_2px_14px_rgba(0,0,0,0.9)]">
          <Swap
            active={art}
            items={[
              { id: "login", node: "The stage is set." },
              { id: "register", node: "Take your place on the stage." },
            ]}
          />
        </p>
      </div>
    </div>
  );
}

function Tabs({ tab, onSelect }: { tab: Tab; onSelect: (tab: Tab) => void }) {
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next = tab === "login" ? "register" : "login";
    onSelect(next);
    e.currentTarget.querySelector<HTMLButtonElement>(`[data-tab-id="${next}"]`)?.focus();
  };

  return (
    <div role="tablist" aria-label="Account" onKeyDown={onKeyDown} className="relative mb-7 grid grid-cols-2 border-b border-parchment/10">
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="tab"
          data-tab-id={id}
          aria-selected={tab === id}
          aria-controls="auth-credentials"
          tabIndex={tab === id ? 0 : -1}
          onClick={() => onSelect(id)}
          className="auth-tab-btn pb-3.5 text-center"
        >
          {label}
        </button>
      ))}
      <span aria-hidden className="auth-tab-line absolute -bottom-px left-0 h-px w-1/2" />
    </div>
  );
}

function Account({ user }: { user: NonNullable<AuthPanelProps["user"]> }) {
  return (
    <div className="pb-8">
      <p className="font-sans text-[15px] leading-relaxed text-parchment/70">
        Signed in as <span className="text-parchment">{user.email}</span>. Event registrations open soon; we&apos;ll
        email you when they do.
      </p>
      <div className="mt-8 flex flex-col gap-5">
        <TransitionLink href="/profile" className="auth-submit">
          Open your profile <span aria-hidden>→</span>
        </TransitionLink>
        <div className="flex items-center justify-between">
          <TransitionLink href="/events" className="auth-link">
            Explore events →
          </TransitionLink>
          <button type="button" className="auth-link" onClick={() => void signOutHome()}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

/** Crossfades between items stacked in one cell, so the slot's size never jumps. */
function Swap({
  active,
  items,
  className = "",
}: {
  active: string;
  items: { id: string; node: ReactNode }[];
  className?: string;
}) {
  const activeIndex = items.findIndex((item) => item.id === active);
  return (
    <span className={`auth-swap ${className}`}>
      {items.map(({ id, node }, i) => (
        <span
          key={id}
          aria-hidden={i !== activeIndex}
          data-state={i === activeIndex ? "active" : i < activeIndex ? "before" : "after"}
        >
          {node}
        </span>
      ))}
    </span>
  );
}

function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div className="auth-collapse" data-open={open} inert={!open}>
      <div className="auth-collapse-clip">
        <div>{children}</div>
      </div>
    </div>
  );
}

function Messages({ error, notice }: { error: string | null; notice: string | null }) {
  const message = error ?? notice;
  // Keeps the text while the box closes so it collapses instead of snapping shut.
  const [shown, setShown] = useState(message);
  if (message && message !== shown) setShown(message);

  return (
    <Collapse open={!!message}>
      <div className="pb-6">
        <p
          role={error ? "alert" : "status"}
          className={`border-l py-1.5 pl-4 font-sans text-[14px] leading-snug ${
            error ? "border-[#e57363] text-[#f6b7ab]" : "border-gold text-parchment/80"
          }`}
        >
          {shown && (/[.!?]$/.test(shown) ? shown : `${shown}.`)}
        </p>
      </div>
    </Collapse>
  );
}

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  footer?: ReactNode;
};


function Field({ label, value, onChange, hint, footer, type, className = "", ...input }: FieldProps) {
  const [reveal, setReveal] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="auth-field pb-6">
      <label className="flex flex-col gap-1">
        <span className="auth-label">{label}</span>
        <span className="relative">
          <input
            {...input}
            type={isPassword && reveal ? "text" : type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`auth-input ${isPassword ? "pr-10" : ""} ${className}`}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setReveal(!reveal)}
              aria-label={reveal ? "Hide Password" : "Show Password"}
              aria-pressed={reveal}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-end text-parchment/40 transition-colors hover:text-gold"
            >
              <EyeIcon open={reveal} />
            </button>
          )}
        </span>
      </label>
      {hint && <p className="mt-2 font-sans text-[12.5px] text-parchment/45">{hint}</p>}
      {footer}
    </div>
  );
}

function CodeField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <Field
      label="6-digit code"
      name="otp"
      value={value}
      onChange={(v) => onChange(v.replace(/\D/g, "").slice(0, 6))}
      inputMode="numeric"
      autoComplete="one-time-code"
      className="auth-code"
    />
  );
}

function Submit({ disabled, children }: { disabled?: boolean; children: ReactNode }) {
  return (
    <div className="pt-2 pb-6">
      <button type="submit" disabled={disabled} className="auth-submit">
        {children}
        <span aria-hidden className="text-[14px] tracking-normal">→</span>
      </button>
    </div>
  );
}

function TextButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="auth-link"
    >
      {children}
    </button>
  );
}

function FlowLinks({ onBack, onResend, busy }: { onBack: () => void; onResend?: () => void; busy: boolean }) {
  return (
    <div className="flex justify-between pb-8">
      <TextButton onClick={onBack}>← Back to sign in</TextButton>
      {onResend && (
        <TextButton onClick={onResend} disabled={busy}>
          Resend code
        </TextButton>
      )}
    </div>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
      {open && <path d="M4 4l16 16" />}
    </svg>
  );
}

function GoogleMark({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 48 48" className={className}>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.7 1.2 9.2 3.6l6.9-6.9C35.9 2.4 30.5 0 24 0 14.6 0 6.5 5.4 2.6 13.2l8 6.2C12.5 13.7 17.8 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.9 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.9c-.6 3-2.2 5.5-4.7 7.2l7.7 6c4.5-4.2 7-10.3 7-17.7z" />
      <path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-8-6.2C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l8-6.2z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.1 1.4-4.9 2.3-8.2 2.3-6.2 0-11.5-4.2-13.4-9.9l-8 6.2C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}
