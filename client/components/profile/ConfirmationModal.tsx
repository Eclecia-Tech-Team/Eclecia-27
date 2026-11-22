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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-5 backdrop-blur-md" onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="pf-modal w-full max-w-[400px] px-8 pb-7 pt-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-[28px] font-semibold leading-tight text-parchment">{title}</h3>
        <div className="mt-3 text-[15px] leading-relaxed text-parchment/65">
          {description ?? (name ? <p>Continue with <span className="text-parchment">{name}</span>?</p> : <p>Are you sure?</p>)}
        </div>
        <div className="mt-8 flex items-center justify-between gap-4">
          <button type="button" className="pf-link" onClick={onCancel} disabled={loading}>
            Keep it
          </button>
          <GoldActionButton variant="solid" size="sm" onClick={onConfirm} disabled={loading} type="button">
            {loading ? "Working…" : confirmLabel}
          </GoldActionButton>
        </div>
      </div>
    </div>
  );
}
