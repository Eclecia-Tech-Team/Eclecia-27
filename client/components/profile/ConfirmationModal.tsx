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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      onClick={onCancel}
    >
      <div
        className="profile-chamber-card relative w-full max-w-sm p-6 text-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative z-10 space-y-4">
          <div className="mx-auto flex h-10 w-10 items-center justify-center border border-gold/40 bg-black/60 text-gold">
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <polygon points="12 2 22 20 2 20" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          <h3 className="font-nasyhama text-2xl text-gold">{title}</h3>

          <div className="text-xs text-parchment/80 font-serif leading-relaxed">
            {description ? (
              description
            ) : name ? (
              <p>
                Are you sure you wish to proceed with{" "}
                <span className="text-gold font-semibold">{name}</span>?
              </p>
            ) : (
              <p>Are you sure you wish to proceed?</p>
            )}
          </div>

          <div className="flex gap-3 pt-3 justify-center">
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
