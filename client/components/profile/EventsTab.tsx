"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import ConfirmationModal from "./ConfirmationModal";
import CopyCode from "./CopyCode";
import TabHeading from "./TabHeading";
import type { Registration } from "@/types/interface";
import { whenText } from "@/constants/schedule";
import { TransitionLink } from "@/components/common/TransitionLink";
import { GoldButton } from "@/components/common/GoldButton";
import { ART, Medallion } from "@/components/schedule/bits";
import "@/styles/schedule.css";

// "15 January 2027" -> "15 Jan"
const shortDate = (d: string) => {
  const m = d.match(/(\d{1,2})\s+([A-Za-z]{3})[a-z]*/);
  return m ? `${m[1]} ${m[2]}` : d;
};

// "8:30 AM – 11:30 AM" -> "8:30am–11:30am"
const shortTime = (t: string) =>
  t
    .replace(/:00/g, "")
    .replace(/\s*[–-]\s*/g, "–")
    .replace(/\s?(AM|PM)/gi, (_, p) => p.toLowerCase());

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
        { method: "PATCH" },
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
            You&apos;ll lose your place in{" "}
            <span className="text-parchment">
              {modalReg?.eventId.eventName}
            </span>
            . You can register again later while registrations are open.
          </p>
        }
        onConfirm={handleDeregister}
        onCancel={() => setModalRegId(null)}
        loading={Boolean(deregisteringId)}
      />

      <div>
        {notification && (
          <p
            role="status"
            className={`pt-5 text-[14px] ${notification.type === "success" ? "text-parchment/80" : "text-[#f6b7ab]"}`}
          >
            {notification.message}
          </p>
        )}

        {loading ? (
          <div className="pf-list mt-6" aria-busy="true">
            {[0, 1].map((i) => (
              <div key={i} className="pf-row">
                <div className="pf-row-art animate-pulse rounded-full bg-parchment/5" />
                <div className="space-y-2">
                  <div className="h-5 w-40 animate-pulse bg-parchment/10" />
                  <div className="h-3 w-56 max-w-full animate-pulse bg-parchment/5" />
                </div>
              </div>
            ))}
          </div>
        ) : registrations.length > 0 ? (
          <>
            <TabHeading
              kicker="Your registered events"
              title="Stages written in your stars"
              count={registrations.length}
            />
            <ul className="pf-list">
              {registrations.map((reg) => {
                const ev = reg.eventId;
                const href = `/events/${ev.slug ?? ev._id}`;
                const known = (v?: string) =>
                  v && !/^(tba|tbd)$/i.test(v.trim()) ? v : "";
                const { date, time } = whenText(ev);
                const venue = known(ev.venue);
                const meta = [
                  date && { Icon: CalendarDays, text: shortDate(date) },
                  time && { Icon: Clock, text: shortTime(time) },
                  venue && { Icon: MapPin, text: venue },
                ].filter(Boolean) as { Icon: typeof Clock; text: string }[];
                const unpaid = Boolean(ev.isPaidEvent) && !reg.verified;
                const idLabel = !unpaid
                  ? "Registration ID"
                  : reg.isPayer
                    ? "Pay with this registration ID"
                    : "Your leader pays the fee";
                // Beside the name on narrow screens, in the right column otherwise; CSS shows one.
                const seal = (place: "title" | "side") => (
                  <span
                    className="pf-seal"
                    data-place={place}
                    data-tone={reg.verified ? "ok" : "wait"}
                  >
                    {reg.verified ? "Confirmed" : "Payment pending"}
                  </span>
                );
                return (
                  <li key={reg._id} className="pf-row">
                    <TransitionLink
                      href={href}
                      className="pf-row-art"
                      aria-hidden
                      tabIndex={-1}
                    >
                      <Medallion
                        art={ev.banner || ART.planet}
                        className="h-full w-full"
                      />
                    </TransitionLink>
                    <div className="min-w-0">
                      <div className="pf-row-title">
                        <TransitionLink href={href} className="pf-row-name">
                          {ev.eventName}
                        </TransitionLink>
                        {seal("title")}
                      </div>
                      <p
                        className="pf-row-meta"
                        style={{
                          display: "flex",
                          flexWrap: "nowrap",
                          alignItems: "center",
                          gap: "0.9rem",
                          minWidth: 0,
                          overflow: "hidden",
                        }}
                      >
                        {meta.length
                          ? meta.map(({ Icon, text }, i) => (
                              <span
                                key={i}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.35rem",
                                  flex:
                                    i === meta.length - 1 ? "0 1 auto" : "none",
                                  minWidth: 0,
                                }}
                              >
                                <Icon
                                  size={14}
                                  aria-hidden
                                  style={{
                                    flex: "none",
                                    color: "#c9a24a",
                                    opacity: 0.85,
                                  }}
                                />
                                <span
                                  style={{
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {text}
                                </span>
                              </span>
                            ))
                          : "Schedule to be announced"}
                      </p>
                      {canDeregister(reg) && (
                        <button
                          type="button"
                          className="pf-withdraw"
                          disabled={Boolean(deregisteringId)}
                          onClick={() => setModalRegId(reg._id)}
                        >
                          Withdraw
                        </button>
                      )}
                    </div>
                    <div className="pf-row-side">
                      {seal("side")}
                      {reg.registrationCode && (
                        <CopyCode code={reg.registrationCode} label={idLabel} />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <div className="pb-10">
            <TabHeading
              kicker="Your registered events"
              title="Your sky is still unwritten"
            />
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-parchment/60">
              Seven worlds of theatre, dance, music, art and words. Pick one and
              make an entrance.
            </p>
            <div className="mt-7 flex justify-end pr-2.5">
              <GoldButton href="/events" size="sm" variant="ghost">
                Explore events
              </GoldButton>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
