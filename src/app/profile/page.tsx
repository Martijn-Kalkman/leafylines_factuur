"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { setThemePreference, type ThemePreference } from "@/components/ThemeInitializer";

export default function ProfilePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [invoiceEmail, setInvoiceEmail] = useState("");
  const [invoicePhone, setInvoicePhone] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>("system");
  const [password, setPassword] = useState("");
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");

  const saveProfile = async (options?: { includePassword?: boolean; includeTheme?: boolean }) => {
    setSaved("");
    setError("");
    const payload: {
      name: string;
      invoiceEmail: string;
      invoicePhone: string;
      themePreference?: ThemePreference;
      password?: string;
    } = {
      name,
      invoiceEmail,
      invoicePhone,
    };
    if (options?.includeTheme) {
      payload.themePreference = themePreference;
    }
    const trimmedPassword = password.trim();
    if (options?.includePassword && trimmedPassword) {
      payload.password = trimmedPassword;
    }

    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.ok) {
      setSaved("Profiel opgeslagen.");
      if (options?.includePassword) {
        setPassword("");
      }
      return;
    }
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    setError(data.error || "Profiel opslaan mislukt.");
  };

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
        themePreference?: ThemePreference;
      };
      setName(data.name || "");
      setEmail(data.email || "");
      setInvoiceEmail(data.invoiceEmail || data.email || "");
      setInvoicePhone(data.invoicePhone || "");
      setRole(data.role === "admin" ? "admin" : "user");
      const nextPreference =
        data.themePreference === "light" || data.themePreference === "dark" || data.themePreference === "system"
          ? data.themePreference
          : "system";
      setThemePreferenceState(nextPreference);
      setThemePreference(nextPreference);
    };
    void loadProfile();
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="app-main">
        <h1 className="mb-1 text-2xl font-semibold text-[var(--gray1)]">Profiel</h1>
        <div className="mb-6 flex items-center gap-2.5">
          <p className="m-0 text-sm text-[var(--gray3)]">{email}</p>
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.04em] ${
              role === "admin"
                ? "border-[#f4d28a] bg-[#fff1d6] text-[#8a5a00]"
                : "border-[#dde3ea] bg-[#eef2f7] text-[var(--gray2)]"
            }`}
          >
            {role}
          </span>
        </div>
        <div className="grid max-w-4xl gap-4 lg:grid-cols-2">
          <div className="card">
            <h2 className="mb-4 text-sm font-semibold text-[var(--gray1)]">Profielgegevens</h2>
            <label className="text-xs text-[var(--gray3)]">Naam</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mb-3" />
            <div className="mb-3.5">
              <label className="text-xs text-[var(--gray3)]">Factuur contact e-mail</label>
              <input value={invoiceEmail} onChange={(e) => setInvoiceEmail(e.target.value)} type="email" />
            </div>
            <div className="mb-3.5">
              <label className="text-xs text-[var(--gray3)]">Factuur contact telefoon</label>
              <input value={invoicePhone} onChange={(e) => setInvoicePhone(e.target.value)} />
            </div>
            <label className="text-xs text-[var(--gray3)]">Nieuw wachtwoord (optioneel)</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
            <button
              className="btn-primary mt-4"
              onClick={() => void saveProfile({ includePassword: true, includeTheme: false })}
            >
              Profiel opslaan
            </button>
          </div>

          <div className="card">
            <h2 className="mb-4 text-sm font-semibold text-[var(--gray1)]">Voorkeuren</h2>
            <div className="mb-2">
              <label className="text-xs text-[var(--gray3)]">Thema voorkeur</label>
              <select
                value={themePreference}
                onChange={(event) => {
                  const nextTheme = event.target.value as ThemePreference;
                  setThemePreferenceState(nextTheme);
                  setThemePreference(nextTheme);
                }}
              >
                <option value="system">Systeeminstelling volgen</option>
                <option value="light">Licht</option>
                <option value="dark">Donker</option>
              </select>
            </div>
            <p className="mb-4 text-xs text-[var(--gray3)]">
              Kies hoe de app wordt weergegeven. &quot;Systeeminstelling volgen&quot; schakelt automatisch mee met je apparaat.
            </p>
            <button
              className="btn-primary"
              onClick={() => void saveProfile({ includePassword: false, includeTheme: true })}
            >
              Voorkeuren opslaan
            </button>
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-[#8a1f1f]">{error}</p>}
        {saved && <p className="mt-3 text-sm text-[var(--success)]">{saved}</p>}
      </main>
    </div>
  );
}
