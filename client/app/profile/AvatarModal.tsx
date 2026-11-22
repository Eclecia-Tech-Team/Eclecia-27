"use client";

import { useEffect } from "react";
import { AVATARS } from "@/constants/avatars";

interface AvatarModalProps {
  open: boolean;
  onClose: () => void;
  currentAvatar: number;
  onSelect: (avatar: number) => void;
}

export default function AvatarModal({
  open,
  onClose,
  currentAvatar,
  onSelect,
}: AvatarModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-5 backdrop-blur-md" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Choose a crest" className="pf-modal w-full max-w-[560px] px-7 pb-7 pt-8 sm:px-10" onClick={(e) => e.stopPropagation()}>
        <p className="pf-eyebrow">Your crest</p>
        <h2 className="mt-3 font-display text-[32px] font-semibold leading-tight text-parchment">Pick the world you belong to</h2>
        <p className="mt-2 text-[14.5px] text-parchment/55">It sits on your pass and beside your name across the site.</p>

        <div className="mt-8 grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4">
          {AVATARS.map((avatar) => {
            const isSelected = currentAvatar === avatar.id;
            return (
              <button
                key={avatar.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => {
                  onSelect(avatar.id);
                  onClose();
                }}
                className="group flex flex-col items-center gap-2.5 focus:outline-none"
              >
                <span className={`pf-crest block h-[76px] w-[76px] transition-transform duration-300 group-hover:scale-[1.06] ${isSelected ? "" : "opacity-60 saturate-[0.7] group-hover:opacity-100 group-hover:saturate-100 [background:rgba(217,164,65,0.18)]"}`}>
                  <span className="pf-crest-inner block h-full w-full">
                    <img src={avatar.src} alt="" className="h-full w-full object-cover" />
                  </span>
                </span>
                <span className={`font-display text-[16px] ${isSelected ? "text-gold" : "text-parchment/60 group-hover:text-parchment"}`}>{avatar.name}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex justify-end">
          <button type="button" className="pf-link" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
