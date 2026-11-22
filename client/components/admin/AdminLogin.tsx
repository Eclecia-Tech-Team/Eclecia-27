"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { adminLogin, adminMasterKey, adminVerify } from "@/lib/admin/actions/auth";
import { Button, Field } from "./ui";

function deviceId() {
  const KEY = "ecl-admin-device";
  let id = sessionStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID().replaceAll("-", "");
    sessionStorage.setItem(KEY, id);
  }
  return id;
}

type Step = "password" | "code" | "master";

/** Email + password, then the emailed 6-digit code. Invited admins choose their password on first sign-in. */
export function AdminLogin({ masterKeyEnabled }: { masterKeyEnabled: boolean }) {
  const [step, setStep] = useState<Step>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [key, setKey] = useState("");
  const [firstLogin, setFirstLogin] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const otpRef = useRef<HTMLInputElement>(null);

  const router = useRouter();
  const enter = () => {
    router.replace("/admin");
    router.refresh();
  };

  const sendCode = (e?: FormEvent) => {
    e?.preventDefault();
    setError("");
    start(async () => {
      const r = await adminLogin({ email, password, deviceId: deviceId() });
      if (!r.ok) return setError(r.error);
      setFirstLogin(Boolean(r.firstLogin));
      setNote(`We sent a 6-digit code to ${email.trim().toLowerCase()}.`);
      setStep("code");
      setTimeout(() => otpRef.current?.focus(), 50);
    });
  };

  const verify = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    start(async () => {
      const r = await adminVerify({ email, otp, deviceId: deviceId() });
      if (!r.ok) return setError(r.error);
      enter();
    });
  };

  const master = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    start(async () => {
      const r = await adminMasterKey({ key });
      if (!r.ok) return setError(r.error);
      enter();
    });
  };

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="font-taiganja text-[22px] tracking-[0.14em] text-gold">ECLECIA&apos;27</div>
          <div className="adm-label mt-2">Control room</div>
        </div>

        <div className="adm-panel p-6">
          {step === "password" && (
            <form onSubmit={sendCode} className="flex flex-col gap-4">
              <Field label="Email">
                <input className="adm-input" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Field label="Password" hint="First time here? Choose a password now (8+ characters).">
                <input
                  className="adm-input"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              <Button type="submit" variant="primary" disabled={pending}>
                {pending ? "Checking…" : "Continue"}
              </Button>
            </form>
          )}

          {step === "code" && (
            <form onSubmit={verify} className="flex flex-col gap-4">
              <p className="text-[14px] leading-relaxed text-parchment/75">
                {note}
                {firstLogin && " Your password is saved once the code checks out."}
              </p>
              <Field label="Code">
                <input
                  ref={otpRef}
                  className="adm-input text-center font-mono text-[22px] tracking-[0.4em]"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                />
              </Field>
              <Button type="submit" variant="primary" disabled={pending || otp.length !== 6}>
                {pending ? "Signing in…" : "Sign in"}
              </Button>
              <div className="flex justify-between text-[13px]">
                <button type="button" className="text-parchment/55 hover:text-gold" onClick={() => { setStep("password"); setOtp(""); setError(""); }}>
                  ← Back
                </button>
                <button type="button" className="text-parchment/55 hover:text-gold disabled:opacity-40" disabled={pending} onClick={() => sendCode()}>
                  Send a new code
                </button>
              </div>
            </form>
          )}

          {step === "master" && (
            <form onSubmit={master} className="flex flex-col gap-4">
              <p className="text-[13px] leading-relaxed text-parchment/60">For setting up the first admin. Use your own account for everything else.</p>
              <Field label="Master key">
                <input className="adm-input" type="password" autoComplete="off" required value={key} onChange={(e) => setKey(e.target.value)} />
              </Field>
              <Button type="submit" variant="primary" disabled={pending}>
                {pending ? "Checking…" : "Enter"}
              </Button>
              <button type="button" className="text-[13px] text-parchment/55 hover:text-gold" onClick={() => { setStep("password"); setError(""); }}>
                ← Sign in with email
              </button>
            </form>
          )}

          {error && (
            <p role="alert" className="mt-4 text-[13.5px] text-[#f0a093]">
              {error}
            </p>
          )}
        </div>

        {masterKeyEnabled && step === "password" && (
          <button type="button" className="mx-auto mt-5 block text-[12px] text-parchment/35 hover:text-parchment/70" onClick={() => { setStep("master"); setError(""); }}>
            Use master key
          </button>
        )}
      </div>
    </div>
  );
}
