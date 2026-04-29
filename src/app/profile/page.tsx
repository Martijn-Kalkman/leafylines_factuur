"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

export default function ProfilePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [password, setPassword] = useState("");
  const [saved, setSaved] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      const response = await fetch("/api/profile", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { name?: string; email?: string; role?: "user" | "admin" };
      setName(data.name || "");
      setEmail(data.email || "");
      setRole(data.role === "admin" ? "admin" : "user");
    };
    void loadProfile();
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-56 flex-1 p-8">
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
          <label className="text-xs" style={{ color: "var(--gray3)" }}>Nieuw wachtwoord (optioneel)</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
          <button
            className="btn-primary mt-4"
            onClick={async () => {
              const response = await fetch("/api/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, password }),
              });
              if (response.ok) {
                setSaved("Profiel opgeslagen.");
                setPassword("");
              }
            }}
          >
            Opslaan
          </button>
          {saved && <p className="text-sm mt-2" style={{ color: "var(--success)" }}>{saved}</p>}
        </div>
      </main>
    </div>
  );
}
