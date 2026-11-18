"use client";

import { useEffect, useState } from "react";
import ConfirmationModal from "./ConfirmationModal";
import type { Registration } from "@/types/interface";
import { GoldActionButton } from "@/components/common/GoldButton";

export default function EventsTab() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [deregisteringId, setDeregisteringId] = useState<string | null>(null);
  const [modalRegId, setModalRegId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch("/api/registration/my-events", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        const data = await response.json();

        if (response.ok) {
          setRegistrations(data.registrations || []);
        }
      } catch (error) {
        console.error("Failed to fetch events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const canDeregister = (reg: Registration) => {
    if (reg.isInTeam) return false;
    if (!reg.eventId.isPaidEvent) return true;
    return !reg.verified;
  };

  const handleDeregister = async () => {
    if (!modalRegId) return;

    setDeregisteringId(modalRegId);
    try {
      const response = await fetch(
        `/api/registration/my-events/de-register/${modalRegId}`,
        { method: "PATCH" }
      );
      const data = await response.json();

      if (response.ok) {
        setRegistrations((prev) => prev.filter((r) => r._id !== modalRegId));
        setNotification({
          type: "success",
          message: data.message || "Successfully de-registered from event",
        });
        setModalRegId(null);
      } else {
        setNotification({
          type: "error",
          message: data.error || "Failed to de-register",
        });
      }
    } catch (error) {
      console.error("Failed to de-register:", error);
      setNotification({
        type: "error",
        message: "Something went wrong. Please try again.",
      });
    } finally {
      setDeregisteringId(null);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const modalReg = registrations.find((r) => r._id === modalRegId);

  return (
    <>
      <ConfirmationModal
        isOpen={Boolean(modalRegId)}
        title="De-Register Event"
        name={modalReg?.eventId.eventName}
        confirmLabel="De-Register"
        description={
          <p>
            Are you sure you want to de-register from{" "}
            <span className="text-gold font-semibold">
              {modalReg?.eventId.eventName}
            </span>
            ? This action cannot be undone.
          </p>
        }
        onConfirm={handleDeregister}
        onCancel={() => setModalRegId(null)}
        loading={Boolean(deregisteringId)}
      />

      <div className="relative rounded-2xl border border-gold/40 bg-[#070b0e]/90 p-5 sm:p-8 backdrop-blur-md shadow-[0_24px_60px_rgba(0,0,0,0.9),0_0_40px_rgba(217,164,65,0.08)]">
        <div className="pointer-events-none absolute inset-1.5 rounded-xl border border-gold/15" />

        <div className="relative z-10 space-y-6">
          <div className="text-center space-y-1">
            <h2 className="font-nasyhama text-2xl sm:text-3xl text-gold">
              My Registered Events
            </h2>
            <p className="font-taiganja text-xs uppercase tracking-[0.25em] text-parchment/60">
              The cosmic journeys you have embarked upon
            </p>
          </div>

          {notification && (
            <div
              className={`p-3 rounded-lg text-sm text-center border font-taiganja tracking-wider ${
                notification.type === "success"
                  ? "bg-green-950/40 border-green-500/40 text-green-300"
                  : "bg-red-950/40 border-red-500/40 text-red-300"
              }`}
            >
              {notification.message}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin" />
              <p className="font-taiganja text-xs uppercase tracking-widest text-parchment/60">
                Summoning your event logs...
              </p>
            </div>
          ) : registrations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
              {registrations.map((reg) => (
                <div
                  key={reg._id}
                  className="relative rounded-xl border border-gold/30 bg-black/40 p-4 transition-all duration-300 hover:border-gold/60 hover:bg-black/60 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {reg.eventId.banner && (
                      <div className="relative w-full h-36 rounded-lg overflow-hidden border border-gold/20">
                        <img
                          src={reg.eventId.banner}
                          alt={reg.eventId.eventName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div>
                      <h3 className="font-nasyhama text-xl text-gold">
                        {reg.eventId.eventName}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-taiganja tracking-wider bg-gold/15 text-gold border border-gold/30">
                          {reg.eventId.category}
                        </span>
                        {reg.isInTeam ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-taiganja tracking-wider bg-cyan-950/40 text-cyan-300 border border-cyan-500/30">
                            Team Event
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-taiganja tracking-wider bg-parchment/10 text-parchment/70 border border-parchment/20">
                            Solo
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-parchment/80 font-serif">
                      <div className="flex items-center gap-2">
                        <span className="text-gold">✦</span>
                        <span>Date: {reg.eventId.date || "TBA"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gold">✦</span>
                        <span>Time: {reg.eventId.time || "TBA"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gold">✦</span>
                        <span>Venue: {reg.eventId.venue || "TBA"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-gold/20 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs font-taiganja tracking-wider">
                      <span className="text-parchment/50">
                        {new Date(reg.createdAt).toLocaleDateString()}
                      </span>
                      {reg.verified ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          ✓ Verified
                        </span>
                      ) : (
                        <span className="text-amber-300/80 flex items-center gap-1">
                          ⏳ Pending
                        </span>
                      )}
                    </div>

                    {canDeregister(reg) && (
                      <button
                        type="button"
                        onClick={() => setModalRegId(reg._id)}
                        disabled={Boolean(deregisteringId)}
                        className="mt-1 w-full py-1.5 rounded border border-red-500/30 bg-red-950/20 text-red-300 hover:bg-red-900/30 hover:border-red-500/50 text-xs font-taiganja uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
                      >
                        De-Register
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 space-y-3 text-center">
              <div className="text-4xl text-gold/60">✦</div>
              <h3 className="font-nasyhama text-2xl text-parchment">
                No Celestial Quests Yet
              </h3>
              <p className="font-taiganja text-xs uppercase tracking-widest text-parchment/50">
                Explore the Events Atlas and register for competitions to see them here
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
