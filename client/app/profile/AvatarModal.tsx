"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AVATARS } from "@/constants/avatars";
import { GoldActionButton } from "@/components/common/GoldButton";

interface AvatarModalProps {
  open: boolean;
  onClose: () => void;
  currentAvatar: number;
  onSelect: (avatar: number) => void;
}

export default function AvatarModal({ open, onClose, currentAvatar, onSelect }: AvatarModalProps) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return <AvatarPicker key={currentAvatar} currentAvatar={currentAvatar} onClose={onClose} onSelect={onSelect} />;
}

/** A fresh draft each time the picker opens; only confirmation saves it. */
function AvatarPicker({ currentAvatar, onClose, onSelect }: Omit<AvatarModalProps, "open">) {
  const [selectedId, setSelectedId] = useState(currentAvatar);
  const dialogRef = useRef<HTMLDivElement>(null);
  const selected = AVATARS.find((avatar) => avatar.id === selectedId) ?? AVATARS[0];

  useEffect(() => {
    const previousFocus = document.activeElement;
    dialogRef.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus({ preventScroll: true });
    return () => {
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-picker-title"
        aria-describedby="avatar-picker-description"
        className="pf-modal flex max-h-[calc(100dvh-32px)] w-full max-w-[760px] flex-col p-5 sm:p-8"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key !== "Tab") return;
          const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])");
          if (!buttons?.length) return;
          const first = buttons[0], last = buttons[buttons.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }}
      >
        <header className="shrink-0">
          <p className="pf-eyebrow">Your avatar</p>
          <h2 id="avatar-picker-title" className="mt-2 font-display text-[28px] font-semibold leading-tight text-parchment sm:text-[32px]">Find your vibe</h2>
          <p id="avatar-picker-description" className="mt-2 text-[14px] text-parchment/55">Tap one to preview it on your pass and beside your name.</p>
        </header>

        <div className="mt-5 flex min-h-0 flex-col gap-4 sm:flex-row sm:gap-8">
          <div className="flex shrink-0 items-center gap-5 sm:w-48 sm:flex-col sm:justify-center sm:gap-4 sm:py-2 sm:text-center">
            <div className="pf-crest h-32 w-32 shrink-0 sm:h-48 sm:w-48">
              <div className="pf-crest-inner h-full w-full">
                <Image src={selected.src} alt={`${selected.name} avatar preview`} width={512} height={512} unoptimized className="h-full w-full object-cover" />
              </div>
            </div>
            <div aria-live="polite" aria-atomic="true">
              <p className="pf-label">Selected preview</p>
              <p className="mt-2 font-display text-[28px] leading-none text-gold">{selected.name}</p>
            </div>
          </div>

          <div className="grid min-h-0 grid-cols-4 gap-x-2 gap-y-3 overflow-y-auto overscroll-contain px-1 py-2 sm:flex-1 sm:gap-x-3 sm:gap-y-4" role="group" aria-label="Avatar options">
            {AVATARS.map((avatar) => {
              const isSelected = selected.id === avatar.id;
              return (
                <button
                  key={avatar.id}
                  type="button"
                  aria-label={`Preview ${avatar.name}`}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedId(avatar.id)}
                  className="group flex flex-col items-center gap-2 py-1 outline-offset-2 focus-visible:outline-2 focus-visible:outline-gold"
                >
                  <span className={`pf-crest block h-14 w-14 transition-opacity duration-150 sm:h-[68px] sm:w-[68px] ${isSelected ? "ring-1 ring-gold ring-offset-2 ring-offset-[#090a0c]" : "opacity-60 hover:opacity-100"}`}>
                    <span className="pf-crest-inner block h-full w-full">
                      <Image src={avatar.src} alt="" width={512} height={512} unoptimized className="h-full w-full object-cover" />
                    </span>
                  </span>
                  <span className={`font-display text-[14px] leading-none sm:text-[16px] ${isSelected ? "text-gold" : "text-parchment/60 group-hover:text-parchment"}`}>{avatar.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <footer className="mt-5 flex shrink-0 items-center justify-between gap-4 border-t border-gold/15 pt-4">
          <button type="button" className="pf-link min-h-11 px-1" onClick={onClose}>Cancel</button>
          <GoldActionButton size="sm" className="min-h-11" disabled={selected.id === currentAvatar} onClick={() => { onSelect(selected.id); onClose(); }}>
            Use avatar
          </GoldActionButton>
        </footer>
      </div>
    </div>
  );
}
