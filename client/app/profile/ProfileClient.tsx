"use client";

import { signOutHome } from "@/lib/sign-out";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { SiteHeader } from "@/components/common/Header";
import { SiteFooter } from "@/components/common/Footer";
import { PageFade } from "@/components/common/PageFade";
import { GoldButton, GoldActionButton } from "@/components/common/GoldButton";
import { Meteors } from "@/components/common/Meteors";
import { PassQr } from "@/components/profile/PassQr";
import EventsTab from "@/components/profile/EventsTab";
import TeamsTab from "@/components/profile/TeamsTab";
import { ASSETS } from "@/constants/assets";
import { getAvatarSrc } from "@/constants/avatars";
import { depth } from "@/lib/depth";
import { canCopyImage, copyImage, downloadImage, isTouchDevice, renderPass, renderShareCard, shareImage, toBlob, type PassInfo } from "@/lib/pass-image";
import type { ProfileData } from "@/types/interface";
import AvatarModal from "./AvatarModal";
import "@/styles/profile.css";

type FieldKey = "fullName" | "phoneNumber" | "college" | "stream" | "username";

/** The four details coordinators need before anyone can register. Username is always set. */
const REQUIRED: FieldKey[] = ["fullName", "phoneNumber", "college", "stream"];

const FIELDS: { key: FieldKey; label: string; placeholder: string; inputMode?: "numeric"; wide?: boolean }[] = [
  { key: "fullName", label: "Full name", placeholder: "As on your college ID" },
  { key: "phoneNumber", label: "Phone", placeholder: "10-digit mobile number", inputMode: "numeric" },
  { key: "college", label: "College", placeholder: "Your college or institute" },
  { key: "stream", label: "Stream", placeholder: "e.g. Computer Science & Engineering" },
  { key: "username", label: "Username", placeholder: "3–30 letters, numbers, _ or -" },
];

const TABS = [
  { id: "details", label: "Details" },
  { id: "events", label: "Events" },
  { id: "teams", label: "Teams" },
] as const;
type Tab = (typeof TABS)[number]["id"];

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Kolkata" }).format(new Date()));
  return hour < 5 ? "Good evening" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

const formatPhone = (p: string) => (/^\d{10}$/.test(p) ? `+91 ${p.slice(0, 5)} ${p.slice(5)}` : p);

export default function ProfileClient({
  initialUsername,
  initialAvatar,
  initialEmail,
  returnTo,
  initialTab = "details",
}: {
  initialUsername: string;
  initialAvatar: number | null;
  initialEmail: string;
  /** Event page that sent the visitor here to finish their profile. */
  returnTo?: string;
  /** Opened from the header menu ("My events" / "My teams"). */
  initialTab?: "details" | "events" | "teams";
}) {
  const [profile, setProfile] = useState<ProfileData>({
    username: initialUsername,
    avatar: initialAvatar ?? 1,
    email: initialEmail,
    fullName: "",
    phoneNumber: "",
    college: "",
    stream: "",
    isProfileComplete: false,
    qrPayload: "",
  });
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [isEditing, setIsEditing] = useState(false);
  const [focusKey, setFocusKey] = useState<FieldKey | null>(null);
  const [formData, setFormData] = useState<Partial<ProfileData>>({});
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<"save" | "share" | "copy" | null>(null);
  const [shareMenu, setShareMenu] = useState(false);
  const shareCard = useRef<Blob | null>(null);
  const [nameCheck, setNameCheck] = useState<{ for: string; available: boolean; reason?: string } | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const inputs = useRef<Partial<Record<FieldKey, HTMLInputElement | null>>>({});
  const hasTriggeredAutoLogout = useRef(false);
  const { data: session, update: updateSession } = useSession();

  const triggerAutoLogout = () => {
    if (hasTriggeredAutoLogout.current) return;
    hasTriggeredAutoLogout.current = true;
    void signOut({ callbackUrl: "/login" });
  };

  const notify = (type: "success" | "error", message: string, ms = 3500) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), ms);
  };

  useEffect(() => {
    document.body.style.overflow = qrModalOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [qrModalOpen]);

  useEffect(() => {
    if (isEditing && focusKey) inputs.current[focusKey]?.focus();
  }, [isEditing, focusKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sessionRes = await fetch("/api/auth/session", { cache: "no-store" });
        if (sessionRes.status === 404) return triggerAutoLogout();
        const res = await fetch("/api/user/profile");
        if (res.status === 404) return triggerAutoLogout();
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setProfile({
          username: data.username,
          avatar: data.avatar ?? 1,
          email: data.email ?? "",
          fullName: data.fullName ?? "",
          phoneNumber: data.phoneNumber ?? "",
          college: data.college ?? "",
          stream: data.stream ?? "",
          isProfileComplete: data.isProfileComplete ?? false,
          qrPayload: data.qrPayload ?? "",
        });
        setLoaded(true);
        // Keep the header in step if the session cookie had an old username or avatar.
        if (session?.user && (session.user.username !== data.username || session.user.avatar !== data.avatar)) {
          void updateSession({ user: { username: data.username, avatar: data.avatar } });
        }
      } catch (err) {
        console.error("Failed to load profile details:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Username: instant format check, then a debounced "is it free?" against the server.
  const draftName = ((formData.username as string) ?? "").trim();
  const nameChanged = isEditing && draftName.toLowerCase() !== profile.username.toLowerCase();
  const nameFormatError = !nameChanged
    ? ""
    : draftName.length < 3 || draftName.length > 30
      ? "3–30 characters"
      : !/^[a-zA-Z0-9_-]+$/.test(draftName)
        ? "Letters, numbers, _ and - only"
        : "";
  useEffect(() => {
    if (!nameChanged || nameFormatError) return;
    let live = true;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/user/username?name=${encodeURIComponent(draftName)}`);
        const data = await res.json();
        if (live && res.ok) setNameCheck({ for: draftName, available: Boolean(data.available), reason: data.reason });
      } catch {}
    }, 350);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [draftName, nameChanged, nameFormatError]);
  const nameStatus: { tone: "ok" | "wait" | "bad"; text: string } | null = !nameChanged
    ? null
    : nameFormatError
      ? { tone: "bad", text: nameFormatError }
      : nameCheck?.for !== draftName
        ? { tone: "wait", text: "Checking…" }
        : nameCheck.available
          ? { tone: "ok", text: "Available" }
          : { tone: "bad", text: nameCheck.reason ?? "Already taken" };
  const nameBlocks = Boolean(nameStatus && nameStatus.tone !== "ok");

  const startEditing = (key: FieldKey | null = null) => {
    setFormData({
      username: profile.username,
      fullName: profile.fullName,
      phoneNumber: profile.phoneNumber,
      college: profile.college,
      stream: profile.stream,
    });
    setFocusKey(key ?? REQUIRED.find((k) => !profile[k]) ?? "fullName");
    setActiveTab("details");
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.status === 404) return triggerAutoLogout();
      const data = await res.json();
      if (!res.ok) return notify("error", data.error || "Couldn't save your details.", 5000);
      setProfile((prev) => ({ ...prev, ...data }));
      setIsEditing(false);
      notify("success", data.isProfileComplete ? "Saved. You're all set to register." : "Saved.");
      await updateSession({ user: { username: data.username, avatar: data.avatar ?? profile.avatar } });
    } catch (err) {
      console.error(err);
      notify("error", "Couldn't save your details. Try again.", 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarSelect = async (avatarId: number) => {
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: avatarId }),
      });
      if (res.status === 404) return triggerAutoLogout();
      if (!res.ok) return notify("error", "Couldn't change your crest.");
      const data = await res.json();
      const nextAvatar = data.avatar ?? avatarId;
      setProfile((p) => ({ ...p, avatar: nextAvatar }));
      await updateSession({ user: { username: profile.username, avatar: nextAvatar } });
      notify("success", "Crest changed.");
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    shareCard.current = null;
  }, [profile.fullName, profile.username, profile.college, profile.stream, profile.avatar]);

  const passInfo = (): PassInfo => ({
    name: profile.fullName || profile.username,
    username: profile.username,
    college: profile.college ?? "",
    stream: profile.stream ?? "",
    avatarSrc: getAvatarSrc(profile.avatar ?? 1),
    qrPayload: profile.qrPayload,
    ready: Boolean(profile.isProfileComplete),
  });

  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.eclecia-hitk.in").replace(/\/+$/, "");
  const caption = `I'm going to Eclecia’27, 15–17 January at HITK, Kolkata. ${site}`;

  /** Save: the full pass with QR, for the holder's own phone. Phones: share sheet ("Save image"). Desktop: download. */
  const savePass = async () => {
    setExporting("save");
    try {
      const blob = await toBlob(await renderPass(passInfo(), { withQr: true }));
      const name = `eclecia-27-pass-${profile.username}.png`;
      if (isTouchDevice() && (await shareImage(blob, name)) !== "unsupported") return;
      downloadImage(blob, name);
      notify("success", "Pass saved. Keep it handy for the gate.");
    } catch (err) {
      console.error(err);
      notify("error", "Couldn't make the image. Try again.");
    } finally {
      setExporting(null);
    }
  };

  /** The story card (never the QR). Rendered once per visit and reused by every share option. */
  const getShareCard = async () => {
    if (!shareCard.current) shareCard.current = await toBlob(await renderShareCard(passInfo()));
    return shareCard.current;
  };

  /** Share: phones get the native sheet with just the image; desktops get a small menu. */
  const sharePass = async () => {
    if (!isTouchDevice()) return setShareMenu((o) => !o);
    setExporting("share");
    try {
      const blob = await getShareCard();
      const how = await shareImage(blob, `eclecia-27-${profile.username}.png`);
      if (how === "unsupported") setShareMenu(true);
    } catch (err) {
      console.error(err);
      notify("error", "Couldn't make the image. Try again.");
    } finally {
      setExporting(null);
    }
  };

  const shareAction = async (kind: "copy" | "download" | "caption") => {
    setShareMenu(false);
    try {
      if (kind === "caption") {
        await navigator.clipboard.writeText(caption);
        return notify("success", "Caption copied.");
      }
      setExporting(kind === "copy" ? "copy" : "share");
      const blob = await getShareCard();
      if (kind === "copy") {
        await copyImage(blob);
        notify("success", "Image copied. Paste it anywhere.");
      } else {
        downloadImage(blob, `eclecia-27-${profile.username}.png`);
        notify("success", "Story card saved. Your QR isn't on it.");
      }
    } catch (err) {
      console.error(err);
      notify("error", kind === "copy" ? "This browser won't copy images. Download it instead." : "Couldn't do that. Try again.");
    } finally {
      setExporting(null);
    }
  };

  const filled = REQUIRED.filter((k) => Boolean(profile[k]));
  const missing = REQUIRED.length - filled.length;
  const first = (profile.fullName || profile.username).split(/\s+/)[0];
  const firstName = first.charAt(0).toUpperCase() + first.slice(1);
  const displayName = profile.fullName || profile.username;
  const avatarSrc = getAvatarSrc(profile.avatar ?? 1);

  return (
    <PageFade className="min-h-dvh">
      <div className="relative flex min-h-dvh flex-col overflow-x-clip bg-black text-parchment">
        <img
          src={ASSETS.cloudinary.bg}
          alt=""
          aria-hidden
          className="pointer-events-none fixed inset-0 h-full w-full object-cover opacity-45"
          style={depth(14, 1.06)}
        />
        <div className="pointer-events-none fixed inset-0" aria-hidden style={depth(14)}>
          <Meteors />
        </div>
        <div aria-hidden className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_30%_30%,transparent_20%,rgba(2,4,6,0.75)_80%)]" />

        <SiteHeader />

        {notification && (
          <div
            role="status"
            className={`pf-toast fixed left-1/2 top-24 z-40 -translate-x-1/2 border px-5 py-2.5 text-[14px] backdrop-blur-md ${
              notification.type === "success" ? "border-gold/40 bg-black/80 text-parchment" : "border-[#e57363]/50 bg-black/85 text-[#f6b7ab]"
            }`}
          >
            {notification.message}
          </div>
        )}

        <main className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 gap-12 px-5 pb-24 pt-28 md:px-8 md:pt-36 lg:grid-cols-[380px_minmax(0,1fr)] lg:gap-16">
          {/* ── The pass ─────────────────────────────────────────────── */}
          <aside className="mx-auto w-full max-w-[400px] lg:sticky lg:top-28 lg:self-start">
            <div className="pf-pass">
              <div className="pf-pass-halo" aria-hidden />
              <div className="px-8 pb-8 pt-7">
                <div className="flex items-baseline justify-between">
                  <span className="font-taiganja text-[13px] tracking-[0.22em] text-gold">ECLECIA<span className="ml-1.5 font-display text-[17px] font-semibold italic tracking-normal">’27</span></span>
                  <span className="pf-label">Festival pass</span>
                </div>

                <div className="mt-7 flex flex-col items-center text-center">
                  <button
                    type="button"
                    onClick={() => setAvatarModalOpen(true)}
                    className="pf-crest group h-[132px] w-[132px] cursor-pointer"
                    aria-label="Change your crest"
                  >
                    <span className="pf-crest-inner block h-full w-full">
                      <img src={avatarSrc} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]" />
                    </span>
                    <span className="absolute inset-[5px] flex items-center justify-center rounded-full bg-black/55 font-mono text-[10px] uppercase tracking-[0.25em] text-gold opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      Change
                    </span>
                  </button>

                  <h2 className="mt-6 max-w-full font-display text-[34px] font-semibold leading-[1.05] text-parchment [overflow-wrap:anywhere]">{displayName}</h2>
                  <p className="mt-2 font-mono text-[12px] tracking-[0.08em] text-gold/75">@{profile.username}</p>
                </div>

                <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-gold/15 pt-5">
                  <div className="min-w-0">
                    <dt className="pf-label">College</dt>
                    <dd className="mt-1.5 line-clamp-2 font-display text-[17px] leading-snug text-parchment/90" title={profile.college}>
                      {profile.college || <span className="text-parchment/30">—</span>}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="pf-label">Stream</dt>
                    <dd className="mt-1.5 line-clamp-2 font-display text-[17px] leading-snug text-parchment/90" title={profile.stream}>
                      {profile.stream || <span className="text-parchment/30">—</span>}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="pf-perf" aria-hidden />

              {/* Stub */}
              <div className="flex items-center gap-6 px-8 py-7">
                <button
                  type="button"
                  onClick={() => setQrModalOpen(true)}
                  className="pf-qr-tile shrink-0 cursor-zoom-in transition-transform duration-300 hover:scale-[1.03]"
                  aria-label="Show your pass QR larger"
                  disabled={!profile.qrPayload}
                >
                  {profile.qrPayload ? <PassQr payload={profile.qrPayload} className="h-[92px] w-[92px]" /> : <div className="h-[92px] w-[92px] animate-pulse bg-black/10" />}
                </button>
                <div className="min-w-0">
                  <span className="pf-status" data-tone={!loaded ? "wait" : profile.isProfileComplete ? "ok" : "wait"}>
                    {!loaded ? "Loading" : profile.isProfileComplete ? "Ready" : "Incomplete"}
                  </span>
                  <p className="mt-2.5 text-[13.5px] leading-snug text-parchment/65">Show this at the gate and food counters.</p>
                  <button type="button" onClick={() => setQrModalOpen(true)} className="pf-link mt-3" disabled={!profile.qrPayload}>
                    Enlarge
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={savePass}
                disabled={!loaded || exporting !== null}
                className="flex items-center justify-center gap-2.5 border border-gold/30 bg-black/40 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-parchment/80 backdrop-blur transition-colors hover:border-gold/70 hover:text-parchment disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-gold" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14" />
                </svg>
                {exporting === "save" ? "Making…" : "Save pass"}
              </button>
              <div className="relative">
              <button
                  type="button"
                  onClick={sharePass}
                  aria-haspopup="menu"
                  aria-expanded={shareMenu}
                  disabled={!loaded || exporting !== null}
                  className="flex w-full items-center justify-center gap-2.5 border border-gold/30 bg-black/40 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-parchment/80 backdrop-blur transition-colors hover:border-gold/70 hover:text-parchment disabled:opacity-50"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-gold" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15V4m0 0L8 8m4-4l4 4M6 12H5v8h14v-8h-1" />
                  </svg>
                  {exporting === "share" || exporting === "copy" ? "Making…" : "Share"}
                </button>
                {shareMenu && (
                  <>
                    <button type="button" aria-hidden tabIndex={-1} className="fixed inset-0 z-20 cursor-default" onClick={() => setShareMenu(false)} />
                    <div role="menu" className="pf-modal absolute right-0 top-[calc(100%+8px)] z-30 w-60 py-2">
                      {canCopyImage() && (
                        <button type="button" role="menuitem" className="block w-full px-4 py-2.5 text-left text-[14px] text-parchment/85 hover:bg-gold/10 hover:text-parchment" onClick={() => shareAction("copy")}>
                          Copy image
                        </button>
                      )}
                      <button type="button" role="menuitem" className="block w-full px-4 py-2.5 text-left text-[14px] text-parchment/85 hover:bg-gold/10 hover:text-parchment" onClick={() => shareAction("download")}>
                        Download image
                      </button>
                      <button type="button" role="menuitem" className="block w-full px-4 py-2.5 text-left text-[14px] text-parchment/85 hover:bg-gold/10 hover:text-parchment" onClick={() => shareAction("caption")}>
                        Copy caption
                      </button>
                      <p className="mx-4 mt-1 border-t border-gold/15 pt-2.5 text-[12px] leading-snug text-parchment/45">A 1080×1920 story card. Your QR isn&apos;t on it.</p>
                    </div>
                  </>
                )}
              </div>
            </div>
            <p className="mt-3 text-center text-[12.5px] leading-snug text-parchment/40">Saved pass includes your QR. The shared card never does.</p>
          </aside>

          {/* ── Account ──────────────────────────────────────────────── */}
          <section className="min-w-0">
            <p className="pf-eyebrow">Your account</p>
            <h1 className="mt-4 font-display text-[44px] font-semibold leading-[1] tracking-[-0.01em] text-parchment md:text-[60px]" suppressHydrationWarning>
              {greeting()}, <em className="font-medium text-gold">{firstName}</em>
            </h1>
            <p className="mt-4 text-[15px] text-parchment/55">{profile.email}</p>

            {/* Readiness */}
            {loaded && (
              <div className="mt-10 max-w-xl">
                {profile.isProfileComplete ? (
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
                    <p className="text-[15.5px] leading-relaxed text-parchment/75">
                      Your profile is complete. You can register for any event.
                    </p>
                    {returnTo ? (
                      <GoldButton href={returnTo} size="sm">
                        Back to the event
                      </GoldButton>
                    ) : (
                      <GoldButton href="/events" size="sm" variant="ghost">
                        Browse events
                      </GoldButton>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline justify-between gap-4">
                      <p className="font-display text-[22px] leading-snug text-parchment">
                        {missing === REQUIRED.length
                          ? "Four details and you're ready to register."
                          : `${missing === 1 ? "One detail" : `${["", "", "Two", "Three"][missing]} details`} left before you can register.`}
                      </p>
                      <span className="shrink-0 font-mono text-[11px] tracking-[0.18em] text-parchment/45">
                        {filled.length}/{REQUIRED.length}
                      </span>
                    </div>
                    <div className="pf-progress mt-4" aria-hidden>
                      {REQUIRED.map((k) => (
                        <span key={k} data-on={Boolean(profile[k])} />
                      ))}
                    </div>
                    {!isEditing && (
                      <GoldActionButton size="sm" className="mt-6" type="button" onClick={() => startEditing()}>
                        Complete profile
                      </GoldActionButton>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Tabs */}
            <div className="pf-tabs mt-14" role="tablist" aria-label="Profile sections">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`tab-${t.id}`}
                  aria-selected={activeTab === t.id}
                  aria-controls={`panel-${t.id}`}
                  onClick={() => setActiveTab(t.id)}
                  className="pf-tab"
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div key={activeTab} id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`} className="profile-tab-pane pt-2">
              {activeTab === "details" && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleSaveProfile();
                  }}
                >
                  <div className="pf-fields">
                    {FIELDS.map((f) => {
                      const value = profile[f.key];
                      const needed = REQUIRED.includes(f.key) && !value;
                      return (
                        <div key={f.key} className={`pf-field ${isEditing ? "border-transparent" : ""}`}>
                          <label htmlFor={`pf-${f.key}`} className="pf-label flex items-center gap-2">
                            {f.label}
                            {needed && !isEditing && <span className="h-1 w-1 rounded-full bg-gold" aria-label="required" />}
                          </label>
                          {isEditing ? (
                            <>
                            <input
                              id={`pf-${f.key}`}
                              ref={(el) => {
                                inputs.current[f.key] = el;
                              }}
                              className="pf-input"
                              value={(formData[f.key] as string) ?? ""}
                              placeholder={f.placeholder}
                              inputMode={f.inputMode}
                              maxLength={f.key === "phoneNumber" ? 10 : f.key === "username" ? 30 : 120}
                              autoComplete={f.key === "fullName" ? "name" : f.key === "phoneNumber" ? "tel-national" : f.key === "college" ? "organization" : "off"}
                              onChange={(e) =>
                                setFormData({ ...formData, [f.key]: f.key === "phoneNumber" ? e.target.value.replace(/\D/g, "") : e.target.value })
                              }
                              aria-describedby={f.key === "username" ? "pf-username-status" : undefined}
                              aria-invalid={f.key === "username" && nameStatus?.tone === "bad" ? true : undefined}
                            />
                            {f.key === "username" && (
                              <p id="pf-username-status" aria-live="polite" className="mt-2 min-h-[16px]">
                                {nameStatus && (
                                  <span className="pf-status" data-tone={nameStatus.tone}>
                                    {nameStatus.text}
                                  </span>
                                )}
                              </p>
                            )}
                            </>
                          ) : value ? (
                            <p className="pf-field-value">
                              {f.key === "phoneNumber" ? formatPhone(value) : value}
                            </p>
                          ) : (
                            <button type="button" className="pf-add mt-2" onClick={() => startEditing(f.key)}>
                              Add {f.label.toLowerCase()}
                            </button>
                          )}
                        </div>
                      );
                    })}
                    <div className={`pf-field ${isEditing ? "border-transparent" : ""}`}>
                      <span className="pf-label flex items-center gap-2">Email</span>
                      <p className="pf-field-value" style={{ color: "rgba(236,228,210,0.62)" }}>
                        {profile.email}
                      </p>
                    </div>
                  </div>

                  <div className="mt-10 flex flex-wrap items-center justify-between gap-6">
                    {isEditing ? (
                      <>
                        <button type="button" className="pf-link" onClick={() => setIsEditing(false)}>
                          Cancel
                        </button>
                        <GoldActionButton size="sm" type="submit" disabled={loading || nameBlocks}>
                          {loading ? "Saving…" : "Save details"}
                        </GoldActionButton>
                      </>
                    ) : (
                      <>
                        <button type="button" className="pf-link" data-tone="danger" onClick={() => void signOutHome()}>
                          Sign out
                        </button>
                        <GoldActionButton size="sm" variant="ghost" type="button" onClick={() => startEditing(null)}>
                          Edit details
                        </GoldActionButton>
                      </>
                    )}
                  </div>
                </form>
              )}
              {activeTab === "events" && <EventsTab />}
              {activeTab === "teams" && <TeamsTab />}
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>

      <AvatarModal open={avatarModalOpen} onClose={() => setAvatarModalOpen(false)} currentAvatar={profile.avatar ?? 1} onSelect={handleAvatarSelect} />

      {qrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-5 backdrop-blur-md" onClick={() => setQrModalOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Your festival pass"
            className="pf-modal w-full max-w-[360px] px-8 pb-8 pt-7 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-baseline justify-between">
              <span className="font-taiganja text-[13px] tracking-[0.22em] text-gold">ECLECIA<span className="ml-1.5 font-display text-[17px] font-semibold italic tracking-normal">’27</span></span>
              <span className="pf-label">Festival pass</span>
            </div>
            <div className="pf-qr-tile mx-auto mt-7 w-fit">
              {profile.qrPayload && <PassQr payload={profile.qrPayload} className="h-[232px] w-[232px]" />}
            </div>
            <p className="mt-6 font-display text-[26px] font-semibold leading-tight text-parchment">{displayName}</p>
            <p className="mt-1 font-mono text-[12px] tracking-[0.08em] text-gold/75">@{profile.username}</p>
            <p className="mt-4 text-[13.5px] text-parchment/55">Turn your brightness up and hold it steady.</p>
            <div className="mt-6 flex items-center justify-center gap-8">
              <button type="button" className="pf-link text-gold" onClick={savePass} disabled={exporting !== null}>
                {exporting === "save" ? "Making…" : "Save to photos"}
              </button>
              <button type="button" className="pf-link" onClick={() => setQrModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PageFade>
  );
}
