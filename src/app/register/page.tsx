"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      setError("Uitnodigingslink is ongeldig.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Wachtwoorden komen niet overeen.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    setStatus("");
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ token, name, password }),
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
      setStatus("Gebruiker succesvol aangemaakt.");
      setName("");
      setPassword("");
      setConfirmPassword("");
      setIsSubmitting(false);
    } catch {
      setError("Kan de server niet bereiken. Controleer je internetverbinding en probeer opnieuw.");
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form className="card w-full max-w-md space-y-3" onSubmit={onSubmit}>
        <h1 className="text-xl font-semibold">Account activeren</h1>
        <p className="text-sm" style={{ color: "var(--gray3)" }}>
          Stel je eigen wachtwoord in. Vereist: minimaal 16 tekens, hoofdletter, kleine letter, cijfer en speciaal teken.
        </p>
        {status && (
          <div
            role="status"
            style={{
              background: "#ecfdf3",
              border: "1px solid #9be2b6",
              color: "#116734",
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {status}
          </div>
        )}
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
            if (status) setStatus("");
            setName(e.target.value);
          }}
          placeholder="Naam"
        />
        <input
          value={password}
          onChange={(e) => {
            if (error) setError("");
            if (status) setStatus("");
            setPassword(e.target.value);
          }}
          placeholder="Wachtwoord"
          type="password"
          required
        />
        <input
          value={confirmPassword}
          onChange={(e) => {
            if (error) setError("");
            if (status) setStatus("");
            setConfirmPassword(e.target.value);
          }}
          placeholder="Herhaal wachtwoord"
          type="password"
          required
        />
        <button className="btn-primary w-full justify-center" disabled={isSubmitting} type="submit">
          Account activeren
        </button>
        <button type="button" className="btn-outline w-full justify-center" onClick={() => router.push("/login")}>
          Naar login
        </button>
      </form>
    </main>
  );
}

function RegisterFallback() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="card w-full max-w-md">Laden...</div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterFallback />}>
      <RegisterForm />
    </Suspense>
  );
}
