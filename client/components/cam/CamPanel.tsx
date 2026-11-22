/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { TransitionLink } from "@/components/common/TransitionLink";
import { GoldButton, GoldActionButton } from "@/components/common/GoldButton";
import { ASSETS } from "@/constants/assets";
import { atlasArt } from "@/constants/events";
import type { ICampusAmbassadorData } from "@/types/interface";

const GRAD_YEARS = [
  2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032,
] as const;

export function CamPanel() {
  const { status } = useSession();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  // Data states
  const [ambassador, setAmbassador] = useState<ICampusAmbassadorData | null>(
    null,
  );

  // Form fields
  const [fullName, setFullName] = useState("");
  const [college, setCollege] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [stream, setStream] = useState("");
  const [graduationYear, setGraduationYear] = useState<number>(2027);

  const panelRef = useRef<HTMLDivElement>(null);

  const fetchCamStatus = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/cam");
      if (!res.ok) {
        if (res.status === 401) {
          return;
        }
        throw new Error("Failed to load ambassador details");
      }

      const data = await res.json();
      if (data.isAmbassador && data.ambassador) {
        setAmbassador(data.ambassador);
      } else if (data.user) {
        setFullName(data.user.fullName || "");
        setCollege(data.user.college || "");
        setPhoneNumber(data.user.phoneNumber || "");
        setStream(data.user.stream || "");
      }
    } catch (err: unknown) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : "Failed to fetch ambassador information";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    if (status === "unauthenticated") {
      const timer = setTimeout(() => {
        if (!ignore) setLoading(false);
      }, 0);
      return () => {
        ignore = true;
        clearTimeout(timer);
      };
    }

    if (status === "authenticated") {
      const timer = setTimeout(() => {
        if (!ignore) {
          fetchCamStatus();
        }
      }, 0);
      return () => {
        ignore = true;
        clearTimeout(timer);
      };
    }
  }, [status, fetchCamStatus]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!graduationYear) {
      setError("Please select your graduation year.");
      return;
    }
    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!college.trim()) {
      setError("College / Institute name is required.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch("/api/cam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          graduationYear,
          fullName: fullName.trim(),
          college: college.trim(),
          phoneNumber: phoneNumber.trim(),
          stream: stream.trim(),
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to join Ambassador program");
      }

      if (result.ambassador) {
        setAmbassador(result.ambassador);
      }
    } catch (err: unknown) {
      console.error("Submission failed:", err);
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  const copyCode = async () => {
    if (!ambassador?.ambassadorCode) return;
    try {
      await navigator.clipboard.writeText(ambassador.ambassadorCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      // fallback
    }
  };

  const shareAmbassadorCode = async () => {
    if (!ambassador?.ambassadorCode) return;
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://eclecia-hitk.in";
    const refUrl = `${origin}/events?ref=${encodeURIComponent(ambassador.ambassadorCode)}`;
    const shareMessage = `Join me at Eclecia'27, the annual cultural fest of Heritage Institute of Technology! Register for events using my ambassador referral link:\n${refUrl}\n\n(Ambassador Code: ${ambassador.ambassadorCode})`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Register for Eclecia’27 Events",
          text: `Join me at Eclecia'27! Register for events with my ambassador referral link: ${refUrl} (Ambassador Code: ${ambassador.ambassadorCode})`,
          url: refUrl,
        });
        setShareFeedback("Shared!");
        setTimeout(() => setShareFeedback(null), 2500);
        return;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }

    // Fallback: copy share message to clipboard
    try {
      await navigator.clipboard.writeText(shareMessage);
      setShareFeedback("Referral link copied!");
      setTimeout(() => setShareFeedback(null), 2500);
    } catch {
      setShareFeedback("Could not copy link.");
      setTimeout(() => setShareFeedback(null), 2500);
    }
  };

  const isAmbassadorRegistered = !!ambassador;
  const isVisitor = !loading && status === "unauthenticated";
  const isApplying = !loading && !ambassador && status === "authenticated";

  return (
    <section className="auth-card relative grid w-full max-w-110 overflow-hidden md:min-h-160 md:max-w-240 md:grid-cols-[5fr_6fr]">
      {/* Editorial Left Art Pane */}
      <CamArtPane isRegistered={isAmbassadorRegistered} />

      {/* Right Content Pane - Responsive padding (px-5 on mobile to avoid overflow) */}
      <div
        ref={panelRef}
        className="relative flex flex-col justify-between px-5 pt-7 pb-6 sm:px-10 md:pt-12 md:pb-10 transition-opacity duration-500 ease-out"
      >
        <div>
          {/* Header section matching login / register typography */}
          <header className="mb-6">
            <p className="auth-eyebrow">
              Eclecia&apos;27 · Celestial Ambassador Guild
            </p>
            <h1 className="mt-3 font-display text-[32px] sm:text-[36px] md:text-[44px] font-semibold leading-[1.05] tracking-[-0.01em] text-parchment">
              {isAmbassadorRegistered
                ? "Ambassador Pass"
                : isVisitor
                  ? "Campus Envoy"
                  : "Join the Guild"}
            </h1>
            <p className="mt-2 font-sans text-[13.5px] sm:text-[14.5px] leading-relaxed text-parchment/60">
              {isAmbassadorRegistered
                ? "Your official ambassador credential for Eclecia'27 is active."
                : isVisitor
                  ? "Represent your campus. Lead the celestial cultural movement across Eastern India."
                  : "Confirm your academic credentials to receive your unique ambassador identifier."}
            </p>
          </header>

          {/* Loading Indicator */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <div className="w-6 h-6 rounded-full border border-gold/40 border-t-gold animate-spin" />
              <span className="auth-eyebrow text-[9.5px]">
                Loading guild records…
              </span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div
              role="alert"
              className="mb-5 border border-red-500/35 bg-red-950/30 px-3.5 py-2.5 text-[13px] text-red-200"
            >
              {error}
            </div>
          )}

          {/* VIEW 1: UNLOGGED VISITOR */}
          {isVisitor && (
            <div className="space-y-6 pt-2 animate-fadeIn">
              <div className="space-y-3 border-y border-gold/15 py-4">
                <span className="auth-label block text-gold/80">
                  Ambassador Privileges
                </span>
                <ul className="space-y-2.5 text-[13.5px] font-sans text-parchment/80">
                  <li className="flex items-center gap-2.5">
                    <span className="h-1 w-1 rounded-full bg-gold inline-block" />
                    Official Certificate of Excellence from HITK
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="h-1 w-1 rounded-full bg-gold inline-block" />
                    Exclusive Festival Gifts & Branded Hampers
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="h-1 w-1 rounded-full bg-gold inline-block" />
                    Campus leadership recognition & networking opportunities
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="h-1 w-1 rounded-full bg-gold inline-block" />
                    Exciting performance-based awards and commendations
                  </li>
                </ul>
              </div>

              <div className="pt-2 flex justify-center">
                <GoldButton
                  href="/login?callbackUrl=/cam"
                  variant="solid"
                  size="md"
                  className="w-full max-w-xs"
                >
                  Sign in to Apply
                </GoldButton>
              </div>

              <p className="text-center font-mono text-[11px] uppercase tracking-widest text-parchment/45">
                New to Eclecia?{" "}
                <TransitionLink
                  href="/register"
                  className="text-gold underline underline-offset-4 hover:text-parchment"
                >
                  Create an account
                </TransitionLink>
              </p>
            </div>
          )}

          {/* VIEW 2: ALREADY REGISTERED AMBASSADOR */}
          {isAmbassadorRegistered && ambassador && (
            <div className="space-y-6 pt-1 animate-fadeIn">
              {/* Top Details & Status Strip */}
              <div className="border-b border-gold/20 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 pr-2">
                    <span className="auth-eyebrow text-[9.5px] block text-gold/85">
                      Citizen Credential
                    </span>
                    <h2 className="font-display text-[26px] sm:text-[30px] font-semibold text-parchment leading-tight mt-1 truncate">
                      {ambassador.name}
                    </h2>
                    <p className="font-sans text-[13px] sm:text-[14px] text-parchment/70 mt-1 line-clamp-1">
                      {ambassador.college} · Batch of{" "}
                      {ambassador.graduationYear}
                    </p>
                  </div>

                  {/* <span className="inline-block border border-gold/45 bg-gold/10 px-2.5 py-1 font-mono text-[9.5px] sm:text-[10px] uppercase tracking-[0.2em] text-gold shrink-0">
                    Active
                  </span> */}
                </div>
              </div>

              {/* Unique Code Section - Guaranteed single-line display with tap to copy */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="auth-label block text-gold/85">
                    Unique Ambassador Code
                  </span>
                  {copied && (
                    <span className="font-mono text-[10.5px] uppercase tracking-wider text-gold font-semibold animate-pulse">
                      Copied!
                    </span>
                  )}
                </div>

                {/* Code — plain, no box */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={copyCode}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      copyCode();
                    }
                  }}
                  className="group flex w-full items-center justify-between gap-4 cursor-pointer py-1 focus:outline-none"
                  title="Click to copy code"
                >
                  {/* Code */}
                  <span className="font-mono text-[17px] min-[360px]:text-[19px] min-[400px]:text-[22px] sm:text-[26px] font-bold tracking-widest sm:tracking-[0.18em] text-gold select-all whitespace-nowrap break-keep">
                    {ambassador.ambassadorCode}
                  </span>

                  {/* Copy label */}
                  <span className="inline-flex items-center gap-1.5 shrink-0 text-gold/40 group-hover:text-gold/80 transition-colors duration-200 font-mono text-[10px] sm:text-[10.5px] uppercase tracking-wider">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3 w-3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </span>
                </div>

                {/* Small note below: Tap to copy */}
                <p className="font-mono text-[10.5px] uppercase tracking-wider text-parchment/40">
                  {copied ? (
                    <span className="text-gold font-semibold">
                      Code copied to clipboard!
                    </span>
                  ) : (
                    "Give this code to fellow participants during event registration."
                  )}
                </p>
              </div>

              {/* Share Code Feature & Action Button */}
              <div className="space-y-3 pt-2 flex flex-col items-center">
                <GoldActionButton
                  type="button"
                  onClick={shareAmbassadorCode}
                  variant="solid"
                  size="md"
                  className="w-full max-w-sm"
                >
                  <span className="flex items-center gap-2">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5 text-black"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                    <span>Share Ambassador Code</span>
                  </span>
                </GoldActionButton>

                {shareFeedback && (
                  <p className="text-center font-mono text-[11px] text-gold uppercase tracking-wider animate-fadeIn">
                    {shareFeedback}
                  </p>
                )}
              </div>

              {/* Navigation links */}
              <div className="flex items-center justify-between border-t border-gold/15 pt-4 text-xs font-mono">
                <TransitionLink
                  href="/profile"
                  className="auth-link inline-flex items-center gap-1.5"
                >
                  ← Citizen Profile
                </TransitionLink>
                <TransitionLink
                  href="/events"
                  className="auth-link inline-flex items-center gap-1.5"
                >
                  Explore Events Atlas →
                </TransitionLink>
              </div>
            </div>
          )}

          {/* VIEW 3: APPLICATION FORM FOR LOGGED IN USERS */}
          {isApplying && (
            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
              {/* Full Name */}
              <div className="auth-field">
                <label className="auth-label block">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="auth-input"
                />
              </div>

              {/* College */}
              <div className="auth-field">
                <label className="auth-label block">
                  College / University Name
                </label>
                <input
                  type="text"
                  required
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  placeholder="e.g. Heritage Institute of Technology"
                  className="auth-input"
                />
              </div>

              {/* Graduation Year */}
              <div className="auth-field">
                <label className="auth-label block">Year of Graduation</label>
                <div className="relative">
                  <select
                    value={graduationYear}
                    onChange={(e) =>
                      setGraduationYear(parseInt(e.target.value, 10))
                    }
                    className="auth-input appearance-none cursor-pointer pr-8"
                  >
                    {GRAD_YEARS.map((yr) => (
                      <option
                        key={yr}
                        value={yr}
                        className="bg-[#0b0b0b] text-[#ece4d2]"
                      >
                        {yr}
                      </option>
                    ))}
                  </select>
                  {/* Subtle chevron */}
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center text-parchment/40 text-[10px]">
                    ▼
                  </div>
                </div>
              </div>

              {/* Phone Number */}
              <div className="auth-field">
                <label className="auth-label block">Mobile Number</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="10-digit phone number"
                  className="auth-input"
                />
              </div>

              {/* Stream / Department */}
              <div className="auth-field">
                <label className="auth-label block">Stream / Department</label>
                <input
                  type="text"
                  value={stream}
                  onChange={(e) => setStream(e.target.value)}
                  placeholder="e.g. Computer Science, Mechanical, BBA"
                  className="auth-input"
                />
              </div>

              {/* Celestial Custom Submit Button */}
              <div className="pt-4 space-y-4">
                <div className="flex justify-center">
                  <GoldActionButton
                    type="submit"
                    disabled={submitting}
                    variant="solid"
                    size="md"
                    className="w-full max-w-xs"
                  >
                    {submitting
                      ? "Pledging Candidacy..."
                      : "Join as Ambassador"}
                  </GoldActionButton>
                </div>

                <div className="flex justify-between items-center px-1">
                  <TransitionLink href="/profile" className="auth-link">
                    Cancel
                  </TransitionLink>
                  <span className="font-mono text-[10px] tracking-widest text-parchment/40 uppercase">
                    Eclecia&apos;27
                  </span>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer info line - hidden on mobile phone view */}
        <div className="hidden sm:flex mt-6 border-t border-gold/10 pt-4 items-center justify-between text-parchment/40">
          <span className="font-mono text-[10px] uppercase tracking-widest">
            Fest Dates: 15–17 Jan 2027
          </span>
          <TransitionLink href="/" className="auth-link text-[10px]">
            Home
          </TransitionLink>
        </div>
      </div>
    </section>
  );
}

/** Left art pane matching the AuthPanel aesthetic with Eclecia Logo header and smooth celestial animations */
function CamArtPane({ isRegistered }: { isRegistered: boolean }) {
  return (
    <div
      aria-hidden
      className="auth-art relative z-1 h-52 overflow-hidden md:h-auto"
    >
      {/* Sky backdrop */}
      <img
        src={ASSETS.cloudinary.bg}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-45"
      />
      <img
        src={atlasArt.shared("gold-dust")}
        alt=""
        className="auth-dust absolute inset-0 h-full w-full object-cover opacity-50 mix-blend-screen"
      />
      {/* Central radial halo glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_55%,rgba(217,164,65,0.18),transparent_55%,rgba(5,5,6,0.8)_85%)]" />

      {/* Top Title Block with Eclecia Wordmark Logo (matching the sign-in / register header) */}
      <div className="absolute inset-x-0 top-8 z-10 hidden flex-col items-center px-8 text-center md:flex">
        <img
          src={ASSETS.cloudinary.wordmarkBlacker}
          alt="Eclecia'27"
          className="w-[74%] max-w-[320px] drop-shadow-[0_8px_24px_rgba(0,0,0,0.85)]"
        />
        <p className="-mt-1 font-display text-[21px] italic leading-snug text-gold/95 [text-shadow:0_2px_14px_rgba(0,0,0,0.9)]">
          {isRegistered
            ? "Emissary of the Celestial Fest."
            : "Lead the Celestial Movement."}
        </p>
      </div>

      {/* Orbit & Astrolabe layer */}
      <img
        src={atlasArt.shared("orbitPerspective")}
        alt=""
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-85 max-w-none opacity-30 pointer-events-none mix-blend-screen"
      />

      {/* Eclipse with rising/setting subtle transition */}
      <div className="auth-eclipse absolute bottom-[34%] left-1/2 w-28 md:bottom-[27%] md:w-77.5">
        <img
          src={ASSETS.cloudinary.banner}
          alt=""
          className="auth-banner absolute top-1/2 right-[calc(100%-22px)] hidden w-29.5 max-w-none -translate-y-1/2 md:block"
        />
        <img
          src={ASSETS.cloudinary.banner}
          alt=""
          className="auth-banner absolute top-1/2 left-[calc(100%-22px)] hidden w-29.5 max-w-none -translate-y-1/2 -scale-x-100 md:block"
        />
        <img
          src={ASSETS.cloudinary.blacksun}
          alt=""
          className="relative w-full filter drop-shadow-[0_0_24px_rgba(217,164,65,0.35)]"
        />
      </div>

      {/* Ground and foreground artwork with smooth transitions */}
      <img
        src={ASSETS.cloudinary.bottom}
        alt=""
        className="absolute inset-x-0 bottom-0 w-full md:h-[32%] md:object-cover md:object-top"
      />
      <img
        src={ASSETS.cloudinary.veena}
        alt=""
        data-state={!isRegistered ? "active" : "before"}
        className="auth-art-piece absolute bottom-[2%] left-[8%] hidden w-[84%] md:block transition-all duration-700"
      />
      <img
        src={ASSETS.cloudinary.hand}
        alt=""
        data-state={isRegistered ? "active" : "after"}
        className="auth-art-piece absolute bottom-[2%] left-[20%] hidden w-[60%] md:block transition-all duration-700"
      />
    </div>
  );
}
