"use client";

import type React from "react";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Bevestigen",
  cancelLabel = "Annuleren",
  confirmVariant = "danger",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2200] flex items-center justify-center bg-black/35 p-4">
      <div className="card w-full max-w-[460px]" role="dialog" aria-modal="true" aria-label={title}>
        <h3 className="mb-2 text-lg font-semibold text-[var(--gray1)]">{title}</h3>
        <div className="mb-[18px] text-sm text-[var(--gray3)]">{message}</div>
        <div className="flex justify-end gap-2">
          <button className="btn-outline" onClick={onCancel}>{cancelLabel}</button>
          <button
            className={confirmVariant === "danger" ? "btn-danger" : "btn-primary"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
