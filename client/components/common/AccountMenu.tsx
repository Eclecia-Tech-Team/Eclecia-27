/* eslint-disable @next/next/no-img-element */
"use client";

import { signOutHome } from "@/lib/sign-out";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { TransitionLink } from "./TransitionLink";
import { getAvatarSrc } from "@/constants/avatars";

type Props = { username: string; email?: string | null; avatar?: number | null };

const ITEMS = [
  { href: "/profile", label: "Profile & pass" },
  { href: "/profile?tab=events", label: "My events" },
  { href: "/profile?tab=teams", label: "My teams" },
];

/**
 * The header's account control: crest (plus name from xl up) that opens a
 * small menu with the profile sections and Sign out. Same control on phones.
 */
export function AccountMenu({ username, email, avatar }: Props) {
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  // Close on outside click and Escape (focus back on the trigger).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    root.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={root} className="relative">
      {/* Desktop Avatar Square Button — avatar only, no text, opens dropdown */}
      <button
        ref={button}
        type="button"
        className="header-profile-btn group hidden xl:inline-flex cursor-pointer p-1.25!"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${username}`}
        onClick={() => setOpen((o) => !o)}
      >
        <div className="relative h-7 w-7 overflow-hidden border border-gold/70 shadow-[0_0_8px_rgba(217,164,65,0.3)] bg-black shrink-0">
          <img
            src={getAvatarSrc(avatar)}
            alt={username}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
        </div>
      </button>

      {/* Mobile Profile Icon (phone view remains as it is) */}
      <button
        type="button"
        className="hdr-account group xl:hidden"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${username}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="hdr-crest">
          <img src={getAvatarSrc(avatar)} alt="" />
        </span>
      </button>

      {open && (
        <div role="menu" aria-label="Account" className="hdr-menu">
          <div className="flex items-center gap-3 px-5 pb-4 pt-5">
            <span className="hdr-crest h-10! w-10!">
              <img src={getAvatarSrc(avatar)} alt="" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-[19px] font-semibold leading-tight text-parchment">{username}</p>
              {email && <p className="truncate text-[12.5px] text-parchment/50">{email}</p>}
            </div>
          </div>
          <div className="mx-5 h-px bg-gold/15" />
          <div className="py-2">
            {ITEMS.map((item) => {
              const current = item.href === "/profile" && pathname === "/profile";
              return (
                <TransitionLink key={item.href} href={item.href} role="menuitem" onClick={close} className="hdr-menu-item" aria-current={current ? "page" : undefined}>
                  {item.label}
                </TransitionLink>
              );
            })}
          </div>
          <div className="mx-5 h-px bg-gold/15" />
          <div className="py-2">
            <button
              type="button"
              role="menuitem"
              className="hdr-menu-item hdr-menu-signout"
              disabled={leaving}
              onClick={() => {
                setLeaving(true);
                void signOutHome();
              }}
            >
              {leaving ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
