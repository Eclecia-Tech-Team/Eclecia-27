"use client";

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

export default function ProfileClient({
  initialUsername,
  initialAvatar,
  initialEmail,
}: {
  initialUsername: string;
  initialAvatar: number | null;
  initialEmail: string;
}) {
  const tabs = [
    { id: "details", label: "Details" },
    { id: "teams", label: "Teams" },
    { id: "events", label: "Events" },
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
  const { update: updateSession } = useSession();

  const triggerAutoLogout = () => {
    if (hasTriggeredAutoLogout.current) return;
    hasTriggeredAutoLogout.current = true;
    void signOut({ callbackUrl: "/login" });
  };

  useEffect(() => {
    if (qrModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
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
          message: "Profile details updated successfully",
        });
        if (formData.username !== undefined) {
          await updateSession();
        }
      } else {
        setNotification({
          type: "error",
          message: data.error || "Failed to update profile",
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
        setProfile((p) => ({ ...p, avatar: data.avatar ?? avatarId }));
        await updateSession();
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
        />

        <SiteHeader />

        <main className="relative z-10 flex flex-1 flex-col items-center justify-start px-4 pt-28 pb-16 md:pt-32 max-w-4xl w-full mx-auto space-y-8">
          {notification && (
            <div
              className={`w-full max-w-2xl p-3.5 rounded-xl text-center text-sm font-taiganja tracking-wider border shadow-lg transition-all ${
                notification.type === "success"
                  ? "bg-green-950/60 border-green-500/40 text-green-300"
                  : "bg-red-950/60 border-red-500/40 text-red-300"
              }`}
            >
              {notification.message}
            </div>
          )}

          {/* Top Profile Card */}
          <div className="relative w-full rounded-2xl border border-gold/40 bg-[#070b0e]/95 p-6 sm:p-8 backdrop-blur-md shadow-[0_24px_60px_rgba(0,0,0,0.9),0_0_45px_rgba(217,164,65,0.12)] overflow-hidden">
            <div className="pointer-events-none absolute inset-1.5 rounded-xl border border-gold/20" />

            <div className="absolute top-4 right-4 z-20">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-taiganja uppercase tracking-[0.2em] border ${
                  profile.isProfileComplete
                    ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-300"
                    : "border-amber-500/40 bg-amber-950/40 text-amber-300"
                }`}
              >
                ✦ {profile.isProfileComplete ? "PROFILE COMPLETE" : "PROFILE INCOMPLETE"}
              </span>
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6 sm:gap-8 pt-4 sm:pt-0">
              {/* Avatar circle with action buttons */}
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0">
                <div
                  role="button"
                  onClick={() => setAvatarModalOpen(true)}
                  className="w-full h-full rounded-full overflow-hidden border-2 border-gold shadow-[0_0_20px_rgba(217,164,65,0.4)] cursor-pointer group relative bg-black"
                  title="Click to change avatar"
                >
                  <img
                    src={getAvatarSrc(displayAvatar)}
                    alt="Celestial Crest"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-gold text-xs font-taiganja tracking-wider uppercase">
                    Change
                  </div>
                </div>

                {/* Edit avatar button */}
                <button
                  type="button"
                  onClick={() => setAvatarModalOpen(true)}
                  disabled={loading}
                  className="absolute bottom-0 left-0 -translate-x-1/4 translate-y-1/4 sm:top-0 sm:right-0 sm:bottom-auto sm:left-auto sm:translate-x-1/4 sm:-translate-y-1/4 z-20 w-9 h-9 rounded-full bg-gold text-black border border-black shadow-md hover:scale-110 transition-transform flex items-center justify-center cursor-pointer"
                  title="Change Crest"
                  aria-label="Change Crest"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-4 h-4"
                    fill="currentColor"
                  >
                    <path d="M3 17.25V21h3.75l11-11-3.75-3.75-11 11Zm14.71-9.04a1 1 0 0 0 0-1.42l-1.5-1.5a1 1 0 0 0-1.42 0l-1.13 1.13 3.75 3.75 1.3-1.3Z" />
                  </svg>
                </button>

                {/* Show QR button */}
                <button
                  type="button"
                  onClick={() => setQrModalOpen(true)}
                  className="absolute bottom-0 right-0 translate-y-1/4 translate-x-1/4 z-20 w-9 h-9 rounded-full bg-[#111922] text-gold border border-gold/50 shadow-md hover:bg-gold hover:text-black hover:scale-110 transition-all flex items-center justify-center cursor-pointer"
                  title="Show Entry QR"
                  aria-label="Show Entry QR"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-4 h-4"
                    fill="currentColor"
                  >
                    <path d="M3 3h7v7H3V3Zm2 2v3h3V5H5Zm9-2h7v7h-7V3Zm2 2v3h3V5h-3ZM3 14h7v7H3v-7Zm2 2v3h3v-3H5Zm9-2h2v2h-2v-2Zm3 0h4v2h-4v-2Zm-3 3h2v4h-2v-4Zm3 3h4v1h-4v-1Zm2-3h2v2h-2v-2Z" />
                  </svg>
                </button>
              </div>

              {/* User details */}
              <div className="flex flex-col text-center sm:text-left min-w-0 flex-1 space-y-1">
                <span className="font-taiganja text-[11px] uppercase tracking-[0.3em] text-gold/70">
                  Eclecia Participant
                </span>
                <h1 className="font-nasyhama text-3xl sm:text-5xl text-gold truncate">
                  {profile.username}
                </h1>
                <p className="font-serif text-sm sm:text-base text-parchment/70 break-all">
                  {profile.email || "No email linked"}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex justify-center gap-3 w-full">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-2.5 rounded-xl font-taiganja uppercase tracking-[0.25em] text-xs transition-all duration-300 cursor-pointer ${
                    isActive
                      ? "bg-gold text-black font-semibold shadow-[0_0_20px_rgba(217,164,65,0.4)] scale-105"
                      : "border border-gold/30 text-parchment/70 bg-black/40 hover:border-gold/60 hover:text-parchment hover:bg-black/60"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Active Tab Panel */}
          <div className="w-full">
            {activeTab === "details" && (
              <div className="relative rounded-2xl border border-gold/40 bg-[#070b0e]/90 p-6 sm:p-8 backdrop-blur-md shadow-[0_24px_60px_rgba(0,0,0,0.9),0_0_40px_rgba(217,164,65,0.08)]">
                <div className="pointer-events-none absolute inset-1.5 rounded-xl border border-gold/15" />

                <div className="relative z-10 space-y-6">
                  <div className="flex items-center justify-between border-b border-gold/20 pb-4">
                    <div>
                      <h2 className="font-nasyhama text-2xl sm:text-3xl text-gold">
                        Personal Dossier
                      </h2>
                      <p className="font-taiganja text-xs uppercase tracking-[0.2em] text-parchment/60">
                        Registration credentials & details
                      </p>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5 md:col-span-2">
                          <label className="font-taiganja text-xs uppercase tracking-wider text-gold/80 block">
                            Username
                          </label>
                          <input
                            type="text"
                            value={formData.username || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                username: e.target.value,
                              })
                            }
                            className="w-full px-3.5 py-2.5 rounded-lg bg-black/60 border border-gold/40 text-parchment text-sm focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/50"
                            placeholder="Enter username"
                            minLength={3}
                            maxLength={30}
                          />
                          <p className="text-[11px] text-parchment/50 font-serif">
                            3-30 characters (letters, numbers, underscores, hyphens)
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-taiganja text-xs uppercase tracking-wider text-gold/80 block">
                            Full Name
                          </label>
                          <input
                            type="text"
                            value={formData.fullName || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                fullName: e.target.value,
                              })
                            }
                            className="w-full px-3.5 py-2.5 rounded-lg bg-black/60 border border-gold/40 text-parchment text-sm focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/50"
                            placeholder="Your full name"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-taiganja text-xs uppercase tracking-wider text-gold/80 block">
                            Phone Number
                          </label>
                          <input
                            type="text"
                            value={formData.phoneNumber || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                phoneNumber: e.target.value,
                              })
                            }
                            className="w-full px-3.5 py-2.5 rounded-lg bg-black/60 border border-gold/40 text-parchment text-sm focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/50"
                            placeholder="10-digit mobile number"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-taiganja text-xs uppercase tracking-wider text-gold/80 block">
                            College / Institute
                          </label>
                          <input
                            type="text"
                            value={formData.college || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                college: e.target.value,
                              })
                            }
                            className="w-full px-3.5 py-2.5 rounded-lg bg-black/60 border border-gold/40 text-parchment text-sm focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/50"
                            placeholder="Your college or university"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-taiganja text-xs uppercase tracking-wider text-gold/80 block">
                            Stream / Department
                          </label>
                          <input
                            type="text"
                            value={formData.stream || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                stream: e.target.value,
                              })
                            }
                            className="w-full px-3.5 py-2.5 rounded-lg bg-black/60 border border-gold/40 text-parchment text-sm focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/50"
                            placeholder="e.g. Computer Science, Arts, Commerce"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center">
                        <GoldActionButton
                          size="md"
                          variant="solid"
                          onClick={handleSaveProfile}
                          disabled={loading}
                          type="button"
                        >
                          {loading ? "Saving..." : "Save Dossier"}
                        </GoldActionButton>
                        <GoldActionButton
                          size="md"
                          variant="ghost"
                          onClick={() => setIsEditing(false)}
                          type="button"
                        >
                          Cancel
                        </GoldActionButton>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-8">
                        <div>
                          <span className="font-taiganja text-[11px] uppercase tracking-[0.2em] text-gold/70 block mb-1">
                            Username
                          </span>
                          <p className="font-serif text-lg text-parchment">
                            {profile.username || (
                              <span className="text-parchment/30 italic">Not set</span>
                            )}
                          </p>
                        </div>

                        <div>
                          <span className="font-taiganja text-[11px] uppercase tracking-[0.2em] text-gold/70 block mb-1">
                            Full Name
                          </span>
                          <p className="font-serif text-lg text-parchment">
                            {profile.fullName || (
                              <span className="text-parchment/30 italic">Not set</span>
                            )}
                          </p>
                        </div>

                        <div>
                          <span className="font-taiganja text-[11px] uppercase tracking-[0.2em] text-gold/70 block mb-1">
                            Phone Number
                          </span>
                          <p className="font-serif text-lg text-parchment">
                            {profile.phoneNumber || (
                              <span className="text-parchment/30 italic">Not set</span>
                            )}
                          </p>
                        </div>

                        <div>
                          <span className="font-taiganja text-[11px] uppercase tracking-[0.2em] text-gold/70 block mb-1">
                            College / Institute
                          </span>
                          <p className="font-serif text-lg text-parchment">
                            {profile.college || (
                              <span className="text-parchment/30 italic">Not set</span>
                            )}
                          </p>
                        </div>

                        <div>
                          <span className="font-taiganja text-[11px] uppercase tracking-[0.2em] text-gold/70 block mb-1">
                            Stream / Department
                          </span>
                          <p className="font-serif text-lg text-parchment">
                            {profile.stream || (
                              <span className="text-parchment/30 italic">Not set</span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-gold/15">
                        {profile.isProfileComplete ? (
                          <div className="flex items-center gap-2 text-emerald-400 font-taiganja text-xs tracking-wider uppercase">
                            <span>✓</span> Profile Complete. You are eligible to register for all events.
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-amber-300 font-taiganja text-xs tracking-wider uppercase">
                            <span>✦</span> Complete all dossier fields to qualify for event registration.
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row justify-center gap-4 pt-2">
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
                        >
                          Edit Details
                        </GoldActionButton>

                        <GoldActionButton
                          size="md"
                          variant="ghost"
                          onClick={() => signOut({ callbackUrl: "/login" })}
                          type="button"
                        >
                          Sign Out
                        </GoldActionButton>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "teams" && <TeamsTab />}

            {activeTab === "events" && <EventsTab />}
          </div>

          {/* Return Home Button */}
          <div className="pt-4">
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setQrModalOpen(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl border border-gold/40 bg-[#070b0e] p-6 text-center shadow-[0_24px_60px_rgba(0,0,0,0.9),0_0_40px_rgba(217,164,65,0.15)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pointer-events-none absolute inset-1.5 rounded-xl border border-gold/20" />

            <div className="relative z-10 space-y-4">
              <h3 className="font-nasyhama text-3xl text-gold">
                Celestial Pass
              </h3>
              <p className="font-taiganja text-xs uppercase tracking-wider text-parchment/70">
                Present this QR code to event volunteers at venue checkpoints
              </p>

              {profile.qrPayload ? (
                <div className="flex flex-col items-center gap-3 py-2">
                  <div className="p-3 bg-white rounded-xl shadow-lg border-2 border-gold/60">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
                        profile.qrPayload
                      )}`}
                      alt="Participant QR Code"
                      className="w-48 h-48 object-contain"
                    />
                  </div>
                  <p className="font-mono text-[10px] text-parchment/40 break-all select-all">
                    {profile.qrPayload}
                  </p>
                </div>
              ) : (
                <p className="font-serif text-sm text-parchment/50 py-8">
                  Preparing your celestial token...
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
