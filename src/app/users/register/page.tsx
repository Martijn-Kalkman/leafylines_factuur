"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default function AdminInviteUserPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadSession = async () => {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      if (!response.ok) {
        router.replace("/login");
        return;
      }
      const data = (await response.json()) as { authenticated?: boolean; user?: { role?: "user" | "admin" } };
      if (!data.authenticated) {
        router.replace("/login");
        return;
      }
      if (data.user?.role !== "admin") {
        router.replace("/dashboard");
      }
    };
    void loadSession();
  }, [router]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setStatus("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, name }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(data.error || "Uitnodiging versturen mislukt.");
        setIsSubmitting(false);
        return;
      }
      setStatus(`Uitnodiging verstuurd naar ${email}. Rol is standaard user.`);
      setName("");
      setEmail("");
      setIsSubmitting(false);
    } catch {
      setError("Kan de server niet bereiken.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="app-main">
        <h1 className="text-2xl font-semibold mb-1" style={{ color: "var(--gray1)" }}>Gebruiker uitnodigen</h1>
        <p className="text-sm mb-6" style={{ color: "var(--gray3)" }}>
          Admin-only: gebruiker ontvangt een activatielink en kiest zelf een sterk wachtwoord.
        </p>
        <form className="card w-full max-w-xl space-y-3" onSubmit={onSubmit}>
          {error && (
            <div style={{ background: "#fff1f1", border: "1px solid #f5b7b7", color: "#8a1f1f", borderRadius: 8, padding: "10px 12px", fontSize: 13 }}>
              {error}
            </div>
          )}
          {status && (
            <div style={{ background: "#ecfdf3", border: "1px solid #9be2b6", color: "#116734", borderRadius: 8, padding: "10px 12px", fontSize: 13 }}>
              {status}
            </div>
          )}
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Naam (optioneel)"
          />
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="E-mail"
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Versturen..." : "Uitnodiging versturen"}
            </button>
            <button type="button" className="btn-outline" onClick={() => router.push("/users")}>
              Terug naar users
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
