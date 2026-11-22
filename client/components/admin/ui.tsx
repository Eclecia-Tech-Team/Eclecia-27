"use client";

import { useCallback, useEffect, useState, useTransition, type ButtonHTMLAttributes, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/* ---------- Toasts ---------- */

type Toast = { id: number; text: string; tone: "ok" | "bad" };
const listeners = new Set<(t: Toast) => void>();
let seq = 0;

/** Small confirmation in the corner. */
export function toast(text: string, tone: Toast["tone"] = "ok") {
  const t = { id: ++seq, text, tone };
  listeners.forEach((l) => l(t));
}

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    const add = (t: Toast) => {
      setItems((list) => [...list.slice(-3), t]);
      setTimeout(() => setItems((list) => list.filter((x) => x.id !== t.id)), t.tone === "bad" ? 6000 : 3000);
    };
    listeners.add(add);
    return () => void listeners.delete(add);
  }, []);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="polite">
      {items.map((t) => (
        <div
          key={t.id}
          className={`adm-toast adm-panel px-4 py-3 text-[13.5px] ${t.tone === "bad" ? "border-[#e57363]/60 text-[#f6b7ab]" : "text-parchment"}`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}

/* ---------- Running server actions ---------- */

type Result = { ok: true } | { ok: false; error: string };

/**
 * Runs a server action, toasts its error (or `success`), and refreshes the
 * page's server data on success.
 */
export function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = useCallback(
    <R extends Result>(fn: () => Promise<R>, opts: { success?: string; onOk?: (r: Extract<R, { ok: true }>) => void; refresh?: boolean } = {}) =>
      start(async () => {
        try {
          const r = await fn();
          if (!r.ok) return toast(r.error, "bad");
          if (opts.success) toast(opts.success);
          opts.onOk?.(r as Extract<R, { ok: true }>);
          if (opts.refresh !== false) router.refresh();
        } catch {
          toast("Something went wrong. Try again.", "bad");
        }
      }),
    [router],
  );
  return { run, pending };
}

/* ---------- Bits ---------- */

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "danger" | "ghost"; size?: "sm" };
export function Button({ variant, size, className = "", type = "button", ...rest }: BtnProps) {
  return <button type={type} data-variant={variant} data-size={size} className={`adm-btn ${className}`} {...rest} />;
}

/** Button that asks "Sure?" on the first click. */
export function ConfirmButton({ children, confirm = "Sure?", onConfirm, ...rest }: Omit<BtnProps, "onClick"> & { confirm?: string; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3500);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <Button
      {...rest}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
    >
      {armed ? confirm : children}
    </Button>
  );
}

export function Field({ label, hint, children, className = "" }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="adm-label">{label}</span>
      {children}
      {hint && <span className="text-[12px] leading-snug text-parchment/45">{hint}</span>}
    </label>
  );
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="adm-switch"
    />
  );
}

/** Switch with its label beside it, for forms. */
export function SwitchRow({ label, hint, checked, onChange, disabled }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className="pt-0.5">
        <Switch checked={checked} onChange={onChange} label={label} disabled={disabled} />
      </div>
      <div>
        <div className="text-[14px]">{label}</div>
        {hint && <div className="text-[12px] text-parchment/45">{hint}</div>}
      </div>
    </div>
  );
}

export function Badge({ tone = "mute", children }: { tone?: "ok" | "warn" | "bad" | "info" | "mute"; children: ReactNode }) {
  return (
    <span className="adm-badge" data-tone={tone}>
      {children}
    </span>
  );
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-[34px] font-semibold leading-none text-parchment">{title}</h1>
        {sub && <p className="mt-2 text-[14px] text-parchment/55">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="adm-panel px-6 py-12 text-center text-[14px] text-parchment/55">{children}</div>;
}

/* ---------- URL-driven filters ---------- */

/** Read and write list filters in the query string, so views are linkable and survive refresh. */
export function useQueryState() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const set = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      if (!("page" in patch)) next.delete("page");
      const qs = next.toString();
      start(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    },
    [params, pathname, router],
  );
  return { get: (k: string) => params.get(k) ?? "", set, pending };
}

/** Search box that updates ?q= after typing pauses. */
export function SearchBox({ placeholder }: { placeholder: string }) {
  const { get, set } = useQueryState();
  const [value, setValue] = useState(get("q"));
  useEffect(() => {
    if (value === get("q")) return;
    const t = setTimeout(() => set({ q: value.trim() || null }), 350);
    return () => clearTimeout(t);
  }, [value, get, set]);
  return <input type="search" className="adm-input sm:max-w-xs" placeholder={placeholder} value={value} onChange={(e) => setValue(e.target.value)} />;
}

export function Pager({ page, pages, total, noun }: { page: number; pages: number; total: number; noun: string }) {
  const { set } = useQueryState();
  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-[13px] text-parchment/55">
      <span>
        {total.toLocaleString("en-IN")} {noun}
        {total === 1 ? "" : "s"}
      </span>
      {pages > 1 && (
        <div className="flex items-center gap-2">
          <Button size="sm" disabled={page <= 1} onClick={() => set({ page: String(page - 1) })}>
            ← Prev
          </Button>
          <span>
            {page} / {pages}
          </span>
          <Button size="sm" disabled={page >= pages} onClick={() => set({ page: String(page + 1) })}>
            Next →
          </Button>
        </div>
      )}
    </div>
  );
}

export const fmtDate = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date(iso))
    : "";
