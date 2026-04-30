"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

export default function ProfilePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [invoiceEmail, setInvoiceEmail] = useState("");
  const [invoicePhone, setInvoicePhone] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [password, setPassword] = useState("");
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      const response = await fetch("/api/profile", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as {
        name?: string;
        email?: string;
        role?: "user" | "admin";
        invoiceEmail?: string;
        invoicePhone?: string;
      };
      setName(data.name || "");
      setEmail(data.email || "");
      setInvoiceEmail(data.invoiceEmail || data.email || "");
      setInvoicePhone(data.invoicePhone || "");
      setRole(data.role === "admin" ? "admin" : "user");
    };
    void loadProfile();
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="app-main">
        <h1 className="text-2xl font-semibold mb-1" style={{ color: "var(--gray1)" }}>Profiel</h1>
        <div className="mb-6" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <p className="text-sm" style={{ color: "var(--gray3)", margin: 0 }}>{email}</p>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 999,
              padding: "4px 10px",
              background: role === "admin" ? "#fff1d6" : "#eef2f7",
              color: role === "admin" ? "#8a5a00" : "var(--gray2)",
              border: role === "admin" ? "1px solid #f4d28a" : "1px solid #dde3ea",
              textTransform: "uppercase",
              letterSpacing: 0.4,
            }}
          >
            {role}
          </span>
        </div>
        <div className="card max-w-xl">
          <label className="text-xs" style={{ color: "var(--gray3)" }}>Naam</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="mb-3" />
          <div style={{ marginBottom: 14 }}>
            <label className="text-xs" style={{ color: "var(--gray3)" }}>Factuur contact e-mail</label>
            <input value={invoiceEmail} onChange={(e) => setInvoiceEmail(e.target.value)} type="email" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label className="text-xs" style={{ color: "var(--gray3)" }}>Factuur contact telefoon</label>
            <input value={invoicePhone} onChange={(e) => setInvoicePhone(e.target.value)} />
          </div>
          <label className="text-xs" style={{ color: "var(--gray3)" }}>Nieuw wachtwoord (optioneel)</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
          <button
            className="btn-primary mt-4"
            onClick={async () => {
              setSaved("");
              setError("");
              const payload: {
                name: string;
                invoiceEmail: string;
                invoicePhone: string;
                password?: string;
              } = {
                name,
                invoiceEmail,
                invoicePhone,
              };
              const trimmedPassword = password.trim();
              if (trimmedPassword) {
                payload.password = trimmedPassword;
              }
              const response = await fetch("/api/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              if (response.ok) {
                setSaved("Profiel opgeslagen.");
                setPassword("");
                return;
              }
              const data = (await response.json().catch(() => ({}))) as { error?: string };
              setError(data.error || "Profiel opslaan mislukt.");
            }}
          >
            Opslaan
          </button>
          {error && <p className="text-sm mt-2" style={{ color: "#8a1f1f" }}>{error}</p>}
          {saved && <p className="text-sm mt-2" style={{ color: "var(--success)" }}>{saved}</p>}
        </div>
      </main>
    </div>
  );
}
