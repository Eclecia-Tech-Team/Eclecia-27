"use client";

import { PassQr } from "@/components/profile/PassQr";
import { useState, useEffect, useRef } from "react";
import { signOut, useSession } from "next-auth/react";
import { SiteHeader } from "@/components/common/Header";
import { SiteFooter } from "@/components/common/Footer";
import { PageFade } from "@/components/common/PageFade";
import { GoldButton, GoldActionButton } from "@/components/common/GoldButton";
import { ASSETS } from "@/constants/assets";
import { getAvatarSrc } from "@/constants/avatars";
import type { ProfileData } from "@/types/interface";
import AvatarModal from "./AvatarModal";
import EventsTab from "@/components/profile/EventsTab";
import TeamsTab from "@/components/profile/TeamsTab";
import "@/styles/profile.css";
import { Meteors } from "@/components/common/Meteors";
import { depth } from "@/lib/depth";

export default function ProfileClient({
  initialUsername,
  initialAvatar,
  initialEmail,
  returnTo,
}: {
  initialUsername: string;
  initialAvatar: number | null;
  initialEmail: string;
  /** Event page that sent the visitor here to finish their profile. */
  returnTo?: string;
}) {
  const tabs = [
    { id: "details", label: "Dossier" },
    { id: "teams", label: "Guilds" },
    { id: "events", label: "Quests" },
  ] as const;

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

  const [activeTab, setActiveTab] = useState<"details" | "teams" | "events">(
    "details"
  );
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<ProfileData>>({});
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const hasTriggeredAutoLogout = useRef(false);
  const { data: session, update: updateSession } = useSession();

  const triggerAutoLogout = () => {
    if (hasTriggeredAutoLogout.current) return;
    hasTriggeredAutoLogout.current = true;
    void signOut({ callbackUrl: "/login" });
  };

  useEffect(() => {
    if (qrModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [qrModalOpen]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const sessionRes = await fetch("/api/auth/session", {
          cache: "no-store",
        });
        if (sessionRes.status === 404) {
          triggerAutoLogout();
          return;
        }

        const res = await fetch("/api/user/profile");
        if (res.status === 404) {
          triggerAutoLogout();
          return;
        }
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

        setFormData({
          username: data.username ?? "",
          fullName: data.fullName ?? "",
          phoneNumber: data.phoneNumber ?? "",
          college: data.college ?? "",
          stream: data.stream ?? "",
        });

        // Automatically sync header session if username or avatar in session cookie was stale
        if (
          session?.user &&
          (session.user.username !== data.username || session.user.avatar !== data.avatar)
        ) {
          void updateSession({
            user: {
              username: data.username,
              avatar: data.avatar,
            },
          });
        }
      } catch (err) {
        console.error("Failed to load profile details:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.status === 404) {
        triggerAutoLogout();
        return;
      }

      const data = await res.json();

      if (res.ok) {
        setProfile((prev) => ({
          ...prev,
          ...data,
        }));
        setIsEditing(false);
        setNotification({
          type: "success",
          message: "Dossier credentials saved successfully",
        });
        if (formData.username !== undefined || data.username !== undefined) {
          await updateSession({
            user: {
              username: data.username,
              avatar: data.avatar ?? profile.avatar,
            },
          });
        }
      } else {
        setNotification({
          type: "error",
          message: data.error || "Failed to update dossier",
        });
      }
    } catch (err) {
      console.error(err);
      setNotification({
        type: "error",
        message: "Failed to update profile. Please try again.",
      });
    } finally {
      setLoading(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleAvatarSelect = async (avatarId: number) => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: avatarId }),
      });

      if (res.status === 404) {
        triggerAutoLogout();
        return;
      }

      if (res.ok) {
        const data = await res.json();
        const nextAvatar = data.avatar ?? avatarId;
        setProfile((p) => ({ ...p, avatar: nextAvatar }));
        await updateSession({
          user: {
            username: profile.username,
            avatar: nextAvatar,
          },
        });
        setNotification({
          type: "success",
          message: "Celestial Crest updated",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const displayAvatar = profile.avatar ?? 1;

  return (
    <PageFade className="min-h-dvh">
      <div className="relative flex min-h-dvh flex-col justify-between overflow-x-hidden bg-black text-parchment">
        {/* Celestial Background Artwork */}
        <img
          src={ASSETS.cloudinary.bg}
          alt=""
          aria-hidden
          className="pointer-events-none fixed inset-0 h-full w-full object-cover opacity-60"
          style={depth(14, 1.06)}
        />
        <div className="pointer-events-none fixed inset-0" aria-hidden style={depth(14)}>
          <Meteors />
        </div>

        <SiteHeader />

        <main className="relative z-10 flex flex-1 flex-col items-center justify-start px-3 sm:px-4 pt-24 pb-16 md:pt-28 max-w-4xl w-full mx-auto space-y-4 sm:space-y-6">
          {returnTo && (
            <div className="flex w-full flex-col items-center justify-between gap-3 border border-gold/40 bg-black/60 px-4 py-3 text-center sm:flex-row sm:text-left">
              <p className="text-[14px] text-parchment/85">
                {profile.isProfileComplete
                  ? "Your profile is complete. You can register now."
                  : "Fill in your full name, phone and college, then save to register for the event."}
              </p>
              {profile.isProfileComplete && (
                <GoldButton href={returnTo} size="sm">
                  Back to the event
                </GoldButton>
              )}
            </div>
          )}
          {notification && (
            <div
              className={`w-full p-2.5 text-center text-xs font-taiganja tracking-wider border shadow-lg transition-all ${
                notification.type === "success"
                  ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                  : "bg-red-950/60 border-red-500/40 text-red-300"
              }`}
            >
              {notification.message}
            </div>
          )}

          {/* ── Citizen Identity Card ─────────────────────────────────────── */}
          <div className="profile-chamber-card w-full p-4 sm:p-6 md:p-8">
            {/* ── Desktop View (Locked in: spacious architectural identity deck) ── */}
            <div className="hidden sm:flex sm:flex-row items-stretch gap-6 md:gap-8">
              {/* Left Column: Avatar + Merged Segmented Controller */}
              <div className="flex flex-col items-center justify-center gap-3 shrink-0">
                <div
                  className="astrolabe-bezel relative w-24 h-24 md:w-26 md:h-26 cursor-pointer group shrink-0"
                  onClick={() => setAvatarModalOpen(true)}
                  title="Change Celestial Crest"
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-black">
                    <img
                      src={getAvatarSrc(displayAvatar)}
                      alt="Celestial Crest"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[10px] font-taiganja tracking-widest uppercase text-gold">
                    Edit Crest
                  </div>
                </div>

                {/* Unified Segmented Controller (Change Crest | Pass QR) */}
                <div className="crest-qr-segmented-bar">
                  <button
                    type="button"
                    onClick={() => setAvatarModalOpen(true)}
                    className="crest-qr-seg-btn"
                    title="Change Celestial Avatar"
                  >
                    Change Crest
                  </button>
                  <div className="crest-qr-seg-divider" />
                  <button
                    type="button"
                    onClick={() => setQrModalOpen(true)}
                    className="crest-qr-seg-btn"
                    title="View Festival Pass QR"
                  >
                    Pass QR
                  </button>
                </div>
              </div>

              {/* Subtle vertical separator on desktop */}
              <div className="w-px bg-gradient-to-b from-transparent via-gold/25 to-transparent self-stretch my-1" aria-hidden />

              {/* Right Column: Citizen Metadata & Dossier Overview */}
              <div className="flex-1 min-w-0 flex flex-col justify-between text-left space-y-2">
                <div>
                  {/* Header Row: Registry Breadcrumb & Status */}
                  <div className="flex flex-row items-center justify-between gap-2 border-b border-gold/15 pb-2">
                    <span className="font-taiganja text-[10px] uppercase tracking-[0.25em] text-gold/70">
                      Citizen Registry // Tier 01
                    </span>
                    <span
                      className="profile-arch-tag text-[9px] whitespace-nowrap"
                      data-variant={profile.isProfileComplete ? "complete" : "pending"}
                    >
                      [ {profile.isProfileComplete ? "DOSSIER COMPLETE" : "DOSSIER INCOMPLETE"} ]
                    </span>
                  </div>

                  {/* Citizen Name & Credentials */}
                  <div className="pt-2">
                    <h1 className="font-display text-2xl md:text-3xl text-parchment tracking-wide font-normal truncate leading-tight">
                      {profile.fullName || profile.username}
                    </h1>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      <span className="font-mono text-xs text-gold/80 tracking-wider">
                        @{profile.username}
                      </span>
                      <span className="text-gold/30 text-xs">•</span>
                      <span className="font-serif text-xs text-parchment/60 truncate">
                        {profile.email || "No email bound"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ornamental accent line */}
                <div className="pt-2 flex items-center gap-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-gold/30 via-gold/15 to-transparent" />
                  <img
                    src={ASSETS.cloudinary.divider}
                    alt=""
                    aria-hidden
                    className="w-36 opacity-60 pointer-events-none -my-2"
                  />
                  <div className="h-px flex-1 bg-gradient-to-l from-gold/30 via-gold/15 to-transparent" />
                </div>
              </div>
            </div>

            {/* ── Mobile View (Streamlined, balanced avatar, high-visibility Pass QR) ── */}
            <div className="sm:hidden flex flex-col gap-3">
              {/* Top Row: Generous Avatar + Identity Info side by side */}
              <div className="flex items-center gap-3.5">
                {/* Properly sized avatar filling space */}
                <div
                  className="astrolabe-bezel relative w-20 h-20 shrink-0 cursor-pointer group"
                  onClick={() => setAvatarModalOpen(true)}
                  title="Change Celestial Crest"
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-black">
                    <img
                      src={getAvatarSrc(displayAvatar)}
                      alt="Celestial Crest"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[8px] font-taiganja tracking-widest uppercase text-gold">
                    Edit
                  </div>
                </div>

                {/* Identity Metadata */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-1 border-b border-gold/15 pb-1">
                    <span className="font-taiganja text-[8px] uppercase tracking-[0.2em] text-gold/70 truncate">
                      Citizen Registry
                    </span>
                    <span
                      className="profile-arch-tag text-[7.5px] px-1.5 py-0.5 whitespace-nowrap"
                      data-variant={profile.isProfileComplete ? "complete" : "pending"}
                    >
                      {profile.isProfileComplete ? "Complete" : "Incomplete"}
                    </span>
                  </div>

                  <h1 className="font-display text-xl text-parchment tracking-wide font-normal truncate leading-tight pt-0.5">
                    {profile.fullName || profile.username}
                  </h1>
                  <p className="font-mono text-[11px] text-gold/80 tracking-wider leading-tight">
                    @{profile.username}
                  </p>
                  <p className="font-serif text-[11px] text-parchment/55 truncate leading-tight">
                    {profile.email || "No email bound"}
                  </p>
                </div>
              </div>

              {/* Mobile Separated Action Buttons: High-visibility Festival Pass QR */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gold/15">
                <button
                  type="button"
                  onClick={() => setAvatarModalOpen(true)}
                  className="py-2 px-2.5 border border-gold/30 bg-black/70 hover:border-gold hover:text-white text-parchment/80 text-[10px] font-taiganja uppercase tracking-wider transition-colors cursor-pointer text-center"
                >
                  Change Crest
                </button>
                <button
                  type="button"
                  onClick={() => setQrModalOpen(true)}
                  className="py-2 px-2.5 border border-gold/60 bg-gold/15 hover:bg-gold/25 text-gold text-[10px] font-taiganja uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5 text-[#ffd875] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="5" height="5" x="3" y="3" rx="1"/>
                    <rect width="5" height="5" x="16" y="3" rx="1"/>
                    <rect width="5" height="5" x="3" y="16" rx="1"/>
                    <path d="M21 16h-3a2 2 0 0 0-2 2v3"/>
                    <path d="M21 21v.01"/>
                    <path d="M12 7v3a2 2 0 0 1-2 2H7"/>
                    <path d="M3 12h.01"/>
                    <path d="M12 3h.01"/>
                    <path d="M12 16v.01"/>
                    <path d="M16 12h1"/>
                    <path d="M21 12v.01"/>
                    <path d="M12 21v-1"/>
                  </svg>
                  <span>Pass QR</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── Tab Navigation Bar ──────────────────────────────────────────── */}
          <div className="w-full">
            <div className="profile-tab-track">
              {tabs.map((tab, i) => (
                <button
                  key={tab.id}
                  type="button"
                  data-active={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="profile-tab-item"
                >
                  <span className="profile-tab-index">{String(i + 1).padStart(2, "0")} {"//"}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Active Tab Chamber ──────────────────────────────────────────── */}
          <div key={activeTab} className="profile-tab-pane w-full">
            {activeTab === "details" && (
              <div className="profile-chamber-card p-4 sm:p-6 space-y-5">
                <div className="flex items-start justify-between border-b border-gold/20 pb-3">
                  <div>
                    <h2 className="font-nasyhama text-xl sm:text-2xl text-gold leading-tight">
                      Personal Dossier
                    </h2>
                    <p className="font-taiganja text-[10px] uppercase tracking-[0.2em] text-parchment/50 mt-0.5">
                      Registration Credentials & Details
                    </p>
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1 md:col-span-2">
                        <label className="font-taiganja text-[10px] uppercase tracking-[0.25em] text-gold/80 block">
                          Username
                        </label>
                        <input
                          type="text"
                          value={formData.username || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, username: e.target.value })
                          }
                          className="w-full px-3 py-2 bg-black/70 border border-gold/40 text-parchment text-sm focus:border-gold focus:outline-none"
                          placeholder="Handle"
                          minLength={3}
                          maxLength={30}
                        />
                        <p className="text-[10px] text-parchment/35 font-mono">
                          3–30 chars · letters, numbers, underscores, hyphens
                        </p>
                      </div>

                      <div className="space-y-1">
                        <label className="font-taiganja text-[10px] uppercase tracking-[0.25em] text-gold/80 block">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={formData.fullName || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, fullName: e.target.value })
                          }
                          className="w-full px-3 py-2 bg-black/70 border border-gold/40 text-parchment text-sm focus:border-gold focus:outline-none"
                          placeholder="Your legal name"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-taiganja text-[10px] uppercase tracking-[0.25em] text-gold/80 block">
                          Phone Number
                        </label>
                        <input
                          type="text"
                          value={formData.phoneNumber || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, phoneNumber: e.target.value })
                          }
                          className="w-full px-3 py-2 bg-black/70 border border-gold/40 text-parchment text-sm focus:border-gold focus:outline-none"
                          placeholder="10-digit number"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-taiganja text-[10px] uppercase tracking-[0.25em] text-gold/80 block">
                          College / Institute
                        </label>
                        <input
                          type="text"
                          value={formData.college || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, college: e.target.value })
                          }
                          className="w-full px-3 py-2 bg-black/70 border border-gold/40 text-parchment text-sm focus:border-gold focus:outline-none"
                          placeholder="College name"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-taiganja text-[10px] uppercase tracking-[0.25em] text-gold/80 block">
                          Stream / Department
                        </label>
                        <input
                          type="text"
                          value={formData.stream || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, stream: e.target.value })
                          }
                          className="w-full px-3 py-2 bg-black/70 border border-gold/40 text-parchment text-sm focus:border-gold focus:outline-none"
                          placeholder="e.g. Computer Science & Engineering"
                        />
                      </div>
                    </div>

                    {/* Action row: Cancel (left) & Save Dossier (right), inset from edges */}
                    <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-4 px-3 sm:px-8 md:px-10">
                      <GoldActionButton
                        size="md"
                        variant="ghost"
                        onClick={() => setIsEditing(false)}
                        type="button"
                        className="w-56 max-w-[85%] sm:w-auto"
                      >
                        Cancel
                      </GoldActionButton>
                      <GoldActionButton
                        size="md"
                        variant="solid"
                        onClick={handleSaveProfile}
                        disabled={loading}
                        type="button"
                        className="w-56 max-w-[85%] sm:w-auto"
                      >
                        {loading ? "Saving..." : "Save Dossier"}
                      </GoldActionButton>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Dossier fields — 2 col on sm+, 1 col on mobile */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="dossier-cell">
                        <span className="font-taiganja text-[9px] uppercase tracking-[0.25em] text-gold/60 block mb-1">
                          Username
                        </span>
                        <p className="font-mono text-sm text-parchment font-light">
                          {profile.username || (
                            <span className="text-parchment/35">— Not set —</span>
                          )}
                        </p>
                      </div>

                      <div className="dossier-cell">
                        <span className="font-taiganja text-[9px] uppercase tracking-[0.25em] text-gold/60 block mb-1">
                          Full Name
                        </span>
                        <p className="font-serif text-sm text-parchment font-light">
                          {profile.fullName || (
                            <span className="text-parchment/35">— Not set —</span>
                          )}
                        </p>
                      </div>

                      <div className="dossier-cell">
                        <span className="font-taiganja text-[9px] uppercase tracking-[0.25em] text-gold/60 block mb-1">
                          Phone Number
                        </span>
                        <p className="font-mono text-sm text-parchment font-light">
                          {profile.phoneNumber || (
                            <span className="text-parchment/35">— Not set —</span>
                          )}
                        </p>
                      </div>

                      <div className="dossier-cell">
                        <span className="font-taiganja text-[9px] uppercase tracking-[0.25em] text-gold/60 block mb-1">
                          College / Institute
                        </span>
                        <p className="font-serif text-sm text-parchment font-light">
                          {profile.college || (
                            <span className="text-parchment/35">— Not set —</span>
                          )}
                        </p>
                      </div>

                      <div className="dossier-cell sm:col-span-2">
                        <span className="font-taiganja text-[9px] uppercase tracking-[0.25em] text-gold/60 block mb-1">
                          Stream / Department
                        </span>
                        <p className="font-serif text-sm text-parchment font-light">
                          {profile.stream || (
                            <span className="text-parchment/35">— Not set —</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Eligibility notice */}
                    <div className="border-t border-gold/15 pt-3">
                      {profile.isProfileComplete ? (
                        <p className="text-emerald-400 font-taiganja text-[10px] tracking-widest uppercase">
                          Dossier verified — eligible for all event registrations.
                        </p>
                      ) : (
                        <p className="text-amber-300/80 font-taiganja text-[10px] tracking-widest uppercase">
                          Complete all dossier fields to qualify for event registration.
                        </p>
                      )}
                    </div>

                    {/* Action row: Sign Out (left) & Edit Dossier (right), inset from edges */}
                    <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-4 px-3 sm:px-8 md:px-10">
                      <GoldActionButton
                        size="md"
                        variant="ghost"
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        type="button"
                        className="w-56 max-w-[85%] sm:w-auto"
                      >
                        Sign Out
                      </GoldActionButton>

                      <GoldActionButton
                        size="md"
                        variant="solid"
                        onClick={() => {
                          setFormData({
                            username: profile.username,
                            fullName: profile.fullName,
                            phoneNumber: profile.phoneNumber,
                            college: profile.college,
                            stream: profile.stream,
                          });
                          setIsEditing(true);
                        }}
                        type="button"
                        className="w-56 max-w-[85%] sm:w-auto"
                      >
                        Edit Dossier
                      </GoldActionButton>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "teams" && <TeamsTab />}

            {activeTab === "events" && <EventsTab />}
          </div>

          {/* Return Home */}
          <div className="pt-2">
            <GoldButton href="/" variant="ghost" size="sm">
              ← Return to Cosmos
            </GoldButton>
          </div>
        </main>

        <SiteFooter />
      </div>

      {/* Avatar Selection Modal */}
      <AvatarModal
        open={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
        currentAvatar={displayAvatar}
        onSelect={handleAvatarSelect}
      />

      {/* Profile QR Code Modal */}
      {qrModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={() => setQrModalOpen(false)}
        >
          <div
            className="profile-chamber-card relative w-full max-w-sm p-6 text-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative z-10 space-y-4">
              <h3 className="font-nasyhama text-3xl text-gold">
                Celestial Pass
              </h3>
              <p className="font-taiganja text-[11px] uppercase tracking-wider text-parchment/70">
                Official Checkpoint Token
              </p>

              {profile.qrPayload ? (
                <div className="flex flex-col items-center gap-3 py-2">
                  <div className="p-3 bg-white border-2 border-gold/70 shadow-[0_0_20px_rgba(217,164,65,0.3)]">
                    <PassQr payload={profile.qrPayload} className="w-48 h-48" />
                  </div>
                  <p className="font-taiganja text-[10px] tracking-widest uppercase text-parchment/50">
                    Scan at festival venue gates for check-in
                  </p>
                </div>
              ) : (
                <p className="font-serif text-sm text-parchment/50 py-8">
                  Generating checkpoint token...
                </p>
              )}

              <GoldActionButton
                size="sm"
                variant="ghost"
                onClick={() => setQrModalOpen(false)}
                type="button"
              >
                Close Pass
              </GoldActionButton>
            </div>
          </div>
        </div>
      )}
    </PageFade>
  );
}
