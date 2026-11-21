"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import type { EventOption } from "@/lib/admin/queries";
import { checkIn, deskCount, findAtDesk, undoScan, type CheckInResult, type DeskMatch } from "@/lib/admin/actions/checkin";
import { updateRegistration } from "@/lib/admin/actions/registrations";
import { Badge, Button, toast } from "./ui";

/** The same pass scanned again within this window is ignored (camera sees it every frame). */
const SAME_PASS_MS = 5000;

const TONE: Record<CheckInResult["status"], { ring: string; text: string; label: string }> = {
  success: { ring: "border-[#8fc79a] bg-[#8fc79a]/10", text: "text-[#a9dcb2]", label: "Allowed" },
  warning: { ring: "border-[#e6c06a] bg-[#e6c06a]/10", text: "text-[#f0d28c]", label: "Already done" },
  denied: { ring: "border-[#e57363] bg-[#e57363]/10", text: "text-[#f6b7ab]", label: "Denied" },
  error: { ring: "border-[#e57363] bg-[#e57363]/10", text: "text-[#f6b7ab]", label: "Problem" },
};

export function CheckInDesk({ events, initialEventId }: { events: EventOption[]; initialEventId: string }) {
  const router = useRouter();
  const [eventId, setEventId] = useState(initialEventId);
  const [picked, setAction] = useState<"entry" | "food">("entry");
  const [camera, setCamera] = useState<"off" | "starting" | "on" | "blocked">("off");
  const [result, setResult] = useState<(CheckInResult & { action: "entry" | "food" }) | null>(null);
  const [counts, setCounts] = useState<{ for: string; checkedIn: number; verified: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastRef = useRef<{ qr: string; at: number }>({ qr: "", at: 0 });
  const pausedRef = useRef(false);

  const event = events.find((e) => e.id === eventId);
  const action = event?.isFoodProvided ? picked : "entry";
  const settings = useRef({ eventId, action });
  useEffect(() => {
    settings.current = { eventId, action };
  }, [eventId, action]);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamera("off");
  }, []);
  useEffect(() => stop, [stop]);

  const refreshCount = useCallback(async (id: string) => {
    const r = await deskCount(id);
    if (r.ok) setCounts({ for: id, checkedIn: r.checkedIn, verified: r.verified });
  }, []);
  useEffect(() => {
    if (!eventId) return;
    let live = true;
    deskCount(eventId).then((r) => live && r.ok && setCounts({ for: eventId, checkedIn: r.checkedIn, verified: r.verified }));
    return () => {
      live = false;
    };
  }, [eventId]);
  const count = counts?.for === eventId ? counts : null;

  const undo = async () => {
    if (!result?.regId) return;
    const r = await undoScan({ regId: result.regId, action: result.action });
    if (!r.ok) return toast(r.error, "bad");
    toast(result.action === "food" ? "Packet taken back" : "Check-in undone");
    setResult(null);
    lastRef.current = { qr: "", at: 0 };
    refreshCount(eventId);
  };

  const submit = useCallback(async (qr: string) => {
    const { eventId: id, action: act } = settings.current;
    if (!id) return;
    pausedRef.current = true;
    setBusy(true);
    try {
      const r = await checkIn({ eventId: id, qr, action: act });
      setResult({ ...r, action: act });
      if (r.status === "success") refreshCount(id);
      navigator.vibrate?.(r.status === "success" ? 60 : [80, 60, 80]);
    } catch {
      setResult({ status: "error", message: "Network problem. Scan again.", action: act });
    } finally {
      setBusy(false);
      // Give the volunteer a moment to read the result before scanning resumes.
      setTimeout(() => (pausedRef.current = false), 1800);
    }
  }, [refreshCount]);

  const start = async () => {
    setResult(null);
    setCamera("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } }, audio: false });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setCamera("on");
    } catch {
      setCamera("blocked");
    }
  };

  // Decode loop: a few frames a second is plenty and keeps phones cool.
  useEffect(() => {
    if (camera !== "on") return;
    let timer = 0;
    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState >= 2 && !pausedRef.current) {
        const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx && canvas.width) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
          if (code?.data) {
            const now = Date.now();
            if (code.data !== lastRef.current.qr || now - lastRef.current.at > SAME_PASS_MS) {
              lastRef.current = { qr: code.data, at: now };
              void submit(code.data);
            }
          }
        }
      }
      timer = window.setTimeout(tick, 180);
    };
    tick();
    return () => clearTimeout(timer);
  }, [camera, submit]);

  const tone = result ? TONE[result.status] : null;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <div className="adm-panel flex flex-col gap-3 p-4">
        <select
          className="adm-input text-[15px]"
          value={eventId}
          aria-label="Event"
          onChange={(e) => {
            setEventId(e.target.value);
            setResult(null);
            // In the URL so a volunteer's bookmark opens straight on their event.
            router.replace(e.target.value ? `/admin/checkin?event=${e.target.value}` : "/admin/checkin", { scroll: false });
          }}
        >
          <option value="">Pick the event you&apos;re checking in</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Scan for">
          {(["entry", "food"] as const).map((a) => (
            <button
              key={a}
              type="button"
              role="radio"
              aria-checked={action === a}
              disabled={a === "food" && !event?.isFoodProvided}
              onClick={() => {
                setAction(a);
                setResult(null);
              }}
              className={`adm-btn py-2.5 text-[14px] ${action === a ? "border-gold bg-gold/10 text-gold" : ""}`}
            >
              {a === "entry" ? "Entry" : event && !event.isFoodProvided ? "Food (not served)" : "Food"}
            </button>
          ))}
        </div>
      </div>

      <div className="adm-panel relative aspect-square overflow-hidden bg-black">
        <video ref={videoRef} playsInline muted className={`h-full w-full object-cover ${camera === "on" ? "" : "hidden"}`} />
        <canvas ref={canvasRef} className="hidden" />
        {camera === "on" && (
          <div aria-hidden className="pointer-events-none absolute inset-[18%] border-2 border-gold/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        )}
        {camera !== "on" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            {camera === "blocked" ? (
              <p className="text-[14px] text-[#f6b7ab]">Camera blocked. Allow camera access for this site in the browser settings, then try again.</p>
            ) : (
              <p className="text-[14px] text-parchment/55">{eventId ? "Point the camera at the participant's pass QR." : "Pick an event first."}</p>
            )}
            <Button variant="primary" disabled={!eventId || camera === "starting"} onClick={start}>
              {camera === "starting" ? "Starting camera…" : "Start scanning"}
            </Button>
          </div>
        )}
        {busy && <div className="absolute inset-x-0 bottom-0 bg-black/70 py-2 text-center text-[13px]">Checking…</div>}
      </div>

      {result && tone && (
        <div className={`border-2 p-5 ${tone.ring}`} role="status" aria-live="assertive">
          <div className={`adm-label ${tone.text}`}>{tone.label}</div>
          {result.name && <div className="mt-1 font-display text-[28px] font-semibold leading-tight">{result.name}</div>}
          {(result.email || result.team) && (
            <div className="text-[13px] text-parchment/55">
              {result.email}
              {result.team && ` · Team ${result.team}`}
            </div>
          )}
          <p className={`mt-2 text-[15px] ${tone.text}`}>{result.message}</p>
          {result.note && <p className="mt-1 text-[13.5px] text-[#f0d28c]">⚠ {result.note}</p>}
          {result.status === "success" && result.regId && (
            <button type="button" className="mt-3 text-[13px] text-parchment/60 underline-offset-4 hover:text-parchment hover:underline" onClick={undo}>
              Undo (wrong person or button)
            </button>
          )}
        </div>
      )}

      {eventId && action === "entry" && <ManualLookup eventId={eventId} onCheckedIn={() => refreshCount(eventId)} />}

      <div className="flex items-center justify-between text-[13px] text-parchment/50">
        <span>{count ? `${count.checkedIn} of ${count.verified} verified are in` : ""}</span>
        <div className="flex gap-4">
          {camera === "on" && (
            <button type="button" className="hover:text-gold" onClick={stop}>
              Stop camera
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** No phone, flat battery: look the person up and check them in by hand. */
function ManualLookup({ eventId, onCheckedIn }: { eventId: string; onCheckedIn: () => void }) {
  const [q, setQ] = useState("");
  const [matches, setMatches] = useState<DeskMatch[]>([]);
  const [busyId, setBusyId] = useState("");

  const searching = q.trim().length >= 2;
  const shown = searching ? matches : [];
  useEffect(() => {
    if (!searching) return;
    let live = true;
    const t = setTimeout(async () => {
      const r = await findAtDesk({ eventId, q });
      if (live && r.ok) setMatches(r.matches);
    }, 300);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q, eventId, searching]);

  const admit = async (m: DeskMatch) => {
    setBusyId(m.id);
    const r = await updateRegistration(m.id, { checkedIn: true });
    setBusyId("");
    if (!r.ok) return toast(r.error, "bad");
    toast(`${m.name} is in`);
    onCheckedIn();
    setMatches((list) => list.map((x) => (x.id === m.id ? { ...x, checkedIn: true } : x)));
  };

  return (
    <details className="adm-panel p-4">
      <summary className="cursor-pointer text-[14px] text-parchment/75">No pass? Find them by name, email or phone</summary>
      <input className="adm-input mt-3" type="search" placeholder="Start typing…" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="mt-2 flex flex-col">
        {shown.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-3 border-b border-white/5 py-2.5">
            <div className="min-w-0">
              <div className="truncate text-[14px]">{m.name}</div>
              <div className="truncate text-[12px] text-parchment/50">
                {m.email}
                {m.team && ` · ${m.team}`}
              </div>
            </div>
            {m.checkedIn ? (
              <Badge tone="ok">in</Badge>
            ) : !m.verified ? (
              <Badge tone="bad">not verified</Badge>
            ) : (
              <Button size="sm" variant="primary" disabled={busyId === m.id} onClick={() => admit(m)}>
                Check in
              </Button>
            )}
          </li>
        ))}
        {searching && !shown.length && <li className="py-3 text-[13px] text-parchment/45">No one registered for this event matches.</li>}
      </ul>
    </details>
  );
}
