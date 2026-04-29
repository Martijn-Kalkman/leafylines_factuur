"use client";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

function toastColor(type: ToastType): string {
  if (type === "success") return "#27AE50";
  if (type === "error") return "#E85757";
  return "#3F80ED";
}

function toastAccent(type: ToastType): string {
  if (type === "success") return "#baf0ca";
  if (type === "error") return "#ffd0d0";
  return "#cbdfff";
}

function toastIcon(type: ToastType): string {
  if (type === "success") return "✓";
  if (type === "error") return "⚠";
  return "i";
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div style={{ position: "fixed", top: 20, right: 20, zIndex: 2000, display: "flex", flexDirection: "column", gap: 10 }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              minWidth: 240,
              maxWidth: 420,
              padding: "10px 12px 12px",
              borderRadius: 12,
              color: "white",
              fontSize: 13,
              fontWeight: 500,
              border: `1px solid ${toastAccent(t.type)}`,
              boxShadow: "0 12px 28px rgba(0,0,0,.18)",
              background: toastColor(t.type),
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 22, height: 22, borderRadius: 999, background: "rgba(255,255,255,.22)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>
                {toastIcon(t.type)}
              </span>
              <span style={{ lineHeight: 1.3 }}>{t.message}</span>
            </div>
            <div style={{ marginTop: 8, height: 3, width: "100%", borderRadius: 999, background: "rgba(255,255,255,.3)" }}>
              <div style={{ height: 3, width: "100%", borderRadius: 999, background: "rgba(255,255,255,.9)" }} />
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
