"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ name, email, password }),
      });
      if (!response.ok) {
        const responseText = await response.text();
        let data: { error?: string } | null = null;
        try {
          data = responseText ? (JSON.parse(responseText) as { error?: string }) : null;
        } catch {
          data = null;
        }
        const fallbackMessage = responseText && !responseText.trim().startsWith("<") ? responseText : undefined;
        if (response.status === 409) {
          setError("Dit e-mailadres is al geregistreerd. Log in of gebruik een ander e-mailadres.");
        } else if (response.status === 400) {
          setError(data?.error || fallbackMessage || "Ongeldige registratiegegevens. Controleer je invoer.");
        } else if (response.status === 429) {
          setError("Te veel registratiepogingen. Probeer het later opnieuw.");
        } else if (response.status === 403) {
          setError(data?.error || fallbackMessage || "Request geblokkeerd door beveiliging. Herlaad de pagina en probeer opnieuw.");
        } else {
          setError(data?.error || fallbackMessage || "Registratie mislukt door een serverfout.");
        }
        setIsSubmitting(false);
        return;
      }
      const login = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      });
      if (!login.ok) {
        setError("Account aangemaakt, maar automatisch inloggen mislukte. Probeer handmatig in te loggen.");
        setIsSubmitting(false);
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Kan de server niet bereiken. Controleer je internetverbinding en probeer opnieuw.");
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form className="card w-full max-w-md space-y-3" onSubmit={onSubmit}>
        <h1 className="text-xl font-semibold">Account aanmaken</h1>
        {error && (
          <div
            role="alert"
            aria-live="assertive"
            style={{
              background: "#fff1f1",
              border: "1px solid #f5b7b7",
              color: "#8a1f1f",
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}
        <input
          value={name}
          onChange={(e) => {
            if (error) setError("");
            setName(e.target.value);
          }}
          placeholder="Naam"
        />
        <input
          value={email}
          onChange={(e) => {
            if (error) setError("");
            setEmail(e.target.value);
          }}
          placeholder="E-mail"
          type="email"
          required
        />
        <input
          value={password}
          onChange={(e) => {
            if (error) setError("");
            setPassword(e.target.value);
          }}
          placeholder="Wachtwoord"
          type="password"
          required
        />
        <button className="btn-primary w-full justify-center" disabled={isSubmitting} type="submit">
          Account maken
        </button>
        <button type="button" className="btn-outline w-full justify-center" onClick={() => router.push("/login")}>
          Al account? Inloggen
        </button>
      </form>
    </main>
  );
}
