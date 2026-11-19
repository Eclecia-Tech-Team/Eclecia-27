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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="profile-chamber-card relative w-full max-w-lg p-6 sm:p-8 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative z-10 text-center">
          <h2 className="font-nasyhama text-2xl sm:text-3xl text-gold mb-1">
            Choose Your Celestial Crest
          </h2>
          <p className="font-taiganja text-[11px] uppercase tracking-[0.25em] text-parchment/60 mb-6">
            Select an emblem to represent your presence in the festival
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
                  className="group flex flex-col items-center gap-2 transition-all duration-300 focus:outline-none cursor-pointer"
                >
                  <div
                    className={`astrolabe-bezel relative w-16 h-16 sm:w-20 sm:h-20 p-1 transition-all duration-300 group-hover:scale-110 ${
                      isSelected
                        ? "border-gold shadow-[0_0_20px_rgba(217,164,65,0.6)] scale-105"
                        : "opacity-75 hover:opacity-100"
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
