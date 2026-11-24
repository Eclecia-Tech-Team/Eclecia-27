"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import ConfirmationModal from "./ConfirmationModal";
import type { Registration } from "@/types/interface";
import { whenText } from "@/constants/schedule";
import { TransitionLink } from "@/components/common/TransitionLink";

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
          message: data.message || "You've withdrawn from the event.",
        });
        setModalRegId(null);
      } else {
        setNotification({
          type: "error",
          message: data.error || "Couldn't withdraw. Try again.",
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
        title="Withdraw from this event?"
        name={modalReg?.eventId.eventName}
        confirmLabel="Withdraw"
        description={
          <p>
            You&apos;ll lose your place in <span className="text-parchment">{modalReg?.eventId.eventName}</span>. You can register
            again later while registrations are open.
          </p>
        }
        onConfirm={handleDeregister}
        onCancel={() => setModalRegId(null)}
        loading={Boolean(deregisteringId)}
      />

      <div>
        {notification && (
          <p role="status" className={`pt-5 text-[14px] ${notification.type === "success" ? "text-parchment/80" : "text-[#f6b7ab]"}`}>
            {notification.message}
          </p>
        )}

        {loading ? (
          <div className="flex flex-col gap-0" aria-busy="true">
            {[0, 1].map((i) => (
              <div key={i} className="pf-row">
                <div className="pf-thumb animate-pulse" />
                <div className="space-y-2">
                  <div className="h-5 w-40 animate-pulse bg-parchment/10" />
                  <div className="h-3 w-56 animate-pulse bg-parchment/5" />
                </div>
              </div>
            ))}
          </div>
        ) : registrations.length > 0 ? (
          <ul>
            {registrations.map((reg) => {
              const ev = reg.eventId;
              const href = `/events/${ev.slug ?? ev._id}`;
              const known = (v?: string) => (v && !/^(tba|tbd)$/i.test(v.trim()) ? v : "");
              const { date, time } = whenText(ev);
              const when = [date, time].filter(Boolean).join(" · ") || "Schedule to be announced";
              return (
                <li key={reg._id} className="pf-row">
                  <TransitionLink href={href} className="pf-thumb block" aria-hidden tabIndex={-1}>
                    {ev.banner && <img src={ev.banner} alt="" className="h-full w-full object-cover" />}
                  </TransitionLink>
                  <div className="min-w-0">
                    <TransitionLink href={href} className="font-display text-[24px] font-semibold leading-tight text-parchment transition-colors hover:text-gold">
                      {ev.eventName}
                    </TransitionLink>
                    <p className="mt-1 text-[13.5px] text-parchment/55">
                      {ev.category} · {reg.isInTeam ? "Team" : "Solo"} · {when}
                      {known(ev.venue) && ` · ${ev.venue}`}
                    </p>
                  </div>
                  <div className="pf-row-end flex flex-col items-end gap-2.5 max-sm:items-start">
                    <span className="pf-status" data-tone={reg.verified ? "ok" : "wait"}>
                      {reg.verified ? "Confirmed" : "Payment pending"}
                    </span>
                    {canDeregister(reg) && (
                      <button type="button" className="pf-link" data-tone="danger" disabled={Boolean(deregisteringId)} onClick={() => setModalRegId(reg._id)}>
                        Withdraw
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="py-14">
            <p className="font-display text-[26px] text-parchment">You haven&apos;t registered for anything yet.</p>
            <p className="mt-2 max-w-md text-[15px] leading-relaxed text-parchment/55">
              Seven worlds of theatre, dance, music, art and words. Pick one and make an entrance.
            </p>
            <TransitionLink href="/events" className="pf-link mt-6 inline-block text-gold">
              Explore events →
            </TransitionLink>
          </div>
        )}
      </div>
    </>
  );
}
