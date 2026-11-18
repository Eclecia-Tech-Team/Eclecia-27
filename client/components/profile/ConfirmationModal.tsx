"use client";

import type { ReactNode } from "react";
import { GoldActionButton } from "@/components/common/GoldButton";

interface ConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
  title?: string;
  name?: string;
  description?: ReactNode;
  confirmLabel?: string;
  loading: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onConfirm,
  onCancel,
  title = "Confirm Action",
  name,
  description,
  confirmLabel = "Confirm",
  loading,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onCancel}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-gold/40 bg-[#070b0e] p-6 text-center shadow-[0_24px_60px_rgba(0,0,0,0.9),0_0_35px_rgba(217,164,65,0.12)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-1.5 rounded-xl border border-gold/20" />

        <div className="relative z-10 space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold text-xl">
            ✦
          </div>

          <h3 className="font-nasyhama text-2xl text-gold">{title}</h3>

          <div className="text-sm text-parchment/80 font-serif">
            {description ? (
              description
            ) : name ? (
              <p>
                Are you sure you want to remove{" "}
                <span className="text-gold font-semibold">{name}</span>?
              </p>
            ) : (
              <p>Are you sure you wish to proceed?</p>
            )}
          </div>

          <div className="flex gap-3 pt-4 justify-center">
            <GoldActionButton
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={loading}
              type="button"
            >
              Cancel
            </GoldActionButton>
            <GoldActionButton
              variant="solid"
              size="sm"
              onClick={onConfirm}
              disabled={loading}
              type="button"
            >
              {loading ? "Processing..." : confirmLabel}
            </GoldActionButton>
          </div>
        </div>
      </div>
    </div>
  );
}
