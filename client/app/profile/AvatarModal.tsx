"use client";

import { useEffect } from "react";
import { AVATARS } from "@/constants/avatars";
import { GoldActionButton } from "@/components/common/GoldButton";

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
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-gold/40 bg-[#070b0e] p-6 sm:p-8 shadow-[0_24px_60px_rgba(0,0,0,0.9),0_0_40px_rgba(217,164,65,0.15)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Inner hairline */}
        <div className="pointer-events-none absolute inset-1.5 rounded-xl border border-gold/20" />

        <div className="relative z-10 text-center">
          <h2 className="font-nasyhama text-2xl sm:text-3xl text-gold mb-1">
            Choose Your Celestial Crest
          </h2>
          <p className="font-taiganja text-[11px] uppercase tracking-[0.25em] text-parchment/60 mb-6">
            Select an avatar representing your realm
          </p>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 sm:gap-5 my-6 justify-items-center">
            {AVATARS.map((avatar) => {
              const isSelected = currentAvatar === avatar.id;
              return (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => {
                    onSelect(avatar.id);
                    onClose();
                  }}
                  className="group flex flex-col items-center gap-2 transition-all duration-300 focus:outline-none"
                >
                  <div
                    className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full p-1 transition-all duration-300 group-hover:scale-110 ${
                      isSelected
                        ? "ring-2 ring-gold shadow-[0_0_18px_rgba(217,164,65,0.55)] scale-105"
                        : "ring-1 ring-gold/30 hover:ring-gold/70"
                    }`}
                  >
                    <img
                      src={avatar.src}
                      alt={avatar.name}
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                  <span
                    className={`font-taiganja text-[11px] tracking-wider transition-colors duration-200 ${
                      isSelected
                        ? "text-gold font-semibold"
                        : "text-parchment/70 group-hover:text-parchment"
                    }`}
                  >
                    {avatar.name}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-gold/20 flex justify-center">
            <GoldActionButton
              variant="ghost"
              size="sm"
              onClick={onClose}
              type="button"
            >
              Cancel
            </GoldActionButton>
          </div>
        </div>
      </div>
    </div>
  );
}
