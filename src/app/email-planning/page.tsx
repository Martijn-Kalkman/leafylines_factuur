"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { useStore } from "@/store/useStore";

type PlannedEmailRow = {
  clientId: string;
  clientName: string;
  to: string;
  frequencyLabel: string;
  nextRunAtLabel: string;
  invoiceSourceLabel: string;
  statusLabel: string;
  statusTone: "ok" | "warn";
};

type SentAutomaticEmailRow = {
  id: string;
  sentAtLabel: string;
  to: string;
  subject: string;
  status: "success" | "failed";
  error?: string;
};

function toFrequencyLabel(value: "monthly" | "quarterly" | "yearly"): string {
  if (value === "monthly") return "Maandelijks";
  if (value === "quarterly") return "Per kwartaal";
  return "Jaarlijks";
}

function toNextRunLabel(nextDate: string, nextTime?: string): string {
  if (!nextDate) return "-";
  const safeTime = /^\d{2}:\d{2}$/.test(nextTime || "") ? String(nextTime) : "09:00";
  const date = new Date(`${nextDate}T${safeTime}:00`);
  if (Number.isNaN(date.getTime())) return `${nextDate} ${safeTime}`;
  return date.toLocaleString("nl-NL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EmailPlanningPage() {
  const { clients, documents } = useStore();
  const [sentAutomaticRows, setSentAutomaticRows] = useState<SentAutomaticEmailRow[]>([]);
  const [sentAutomaticError, setSentAutomaticError] = useState("");

  useEffect(() => {
    const loadSentAutomaticEmails = async () => {
      setSentAutomaticError("");
      const response = await fetch("/api/emails", { cache: "no-store" });
      if (!response.ok) {
        setSentAutomaticError("Automatische verzendlogs laden mislukt.");
        return;
      }
      const payload = (await response.json()) as {
        emailLogs?: Array<{
          id: string;
          sentAt?: string;
          createdAt: string;
          to: string;
          subject: string;
          kind: "document" | "confirmation";
          source?: "manual" | "automatic";
          status: "success" | "failed";
          error?: string;
        }>;
      };
      const autoRecipientEmails = new Set(
        clients
          .filter((client) => client.recurringInvoice?.enabled && client.recurringInvoice?.autoSend)
          .map((client) => client.email.trim().toLowerCase())
          .filter(Boolean),
      );
      const knownDocumentIds = new Set(documents.filter((doc) => doc.type === "factuur").map((doc) => doc.id));
      const isLikelyAutomaticFallback = (log: {
        to: string;
        subject: string;
      }) => {
        const recipientMatch = autoRecipientEmails.has(log.to.trim().toLowerCase());
        const containsKnownDocumentId = Array.from(knownDocumentIds).some((documentId) => log.subject.includes(documentId));
        return recipientMatch && containsKnownDocumentId;
      };

      const automaticDocumentLogs = (payload.emailLogs ?? [])
        .filter((log) => log.kind === "document" && (log.source === "automatic" || isLikelyAutomaticFallback(log)))
        .map((log) => {
          const sentAt = log.sentAt || log.createdAt;
          return {
            id: log.id,
            sentAtLabel: new Date(sentAt).toLocaleString("nl-NL", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
            to: log.to,
            subject: log.subject,
            status: log.status,
            error: log.error || "",
          };
        });
      setSentAutomaticRows(automaticDocumentLogs);
    };
    void loadSentAutomaticEmails();
    const refreshTimer = setInterval(() => {
      void loadSentAutomaticEmails();
    }, 8000);
    return () => {
      clearInterval(refreshTimer);
    };
  }, [clients, documents]);
  const plannedRows: PlannedEmailRow[] = clients
    .filter((client) => client.recurringInvoice?.enabled && client.recurringInvoice?.autoSend)
    .map<PlannedEmailRow>((client) => {
      const recurring = client.recurringInvoice!;
      const sourceDocument = recurring.sourceDocumentId
        ? documents.find((doc) => doc.id === recurring.sourceDocumentId && doc.type === "factuur")
        : null;
      const hasRecipient = Boolean(client.email.trim());
      const hasInvoiceSource = Boolean(sourceDocument) || Number(recurring.amount) > 0;
      const isReady = hasRecipient && hasInvoiceSource && Boolean(recurring.nextDate);
      return {
        clientId: client.id,
        clientName: client.company || "Onbekende klant",
        to: client.email || "-",
        frequencyLabel: toFrequencyLabel(recurring.frequency),
        nextRunAtLabel: toNextRunLabel(recurring.nextDate, recurring.nextTime),
        invoiceSourceLabel: sourceDocument
          ? `${sourceDocument.id} (${sourceDocument.date})`
          : `Bedrag/omschrijving (€ ${Number(recurring.amount || 0).toFixed(2)})`,
        statusLabel: isReady ? "Klaar om te verzenden" : "Actie nodig",
        statusTone: isReady ? "ok" : "warn",
      };
    })
    .sort((a, b) => a.nextRunAtLabel.localeCompare(b.nextRunAtLabel, "nl-NL"));

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="app-main">
        <div className="mb-6">
          <h1 className="mb-1 text-2xl font-semibold text-[var(--gray1)]">Geplande e-mails</h1>
          <p className="text-sm text-[var(--gray3)]">
            Overzicht van automatische factuurmails: wanneer, naar wie en op basis van welke factuur.
          </p>
        </div>

        <div className="card">
          <table>
            <thead>
              <tr className="border-b border-gray-100">
                <th>Klant</th>
                <th>Ontvanger</th>
                <th>Frequentie</th>
                <th>Volgende verzending</th>
                <th>Factuurbron</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {plannedRows.map((row) => (
                <tr key={row.clientId} className="border-b border-gray-50">
                  <td className="text-xs font-medium text-[var(--gray1)]">{row.clientName}</td>
                  <td className="text-xs text-[var(--gray2)]">{row.to}</td>
                  <td className="text-xs text-[var(--gray3)]">{row.frequencyLabel}</td>
                  <td className="text-xs text-[var(--gray3)]">{row.nextRunAtLabel}</td>
                  <td className="text-xs text-[var(--gray2)]">{row.invoiceSourceLabel}</td>
                  <td className="text-xs">
                    <span
                      className={`rounded px-2 py-0.5 ${
                        row.statusTone === "ok"
                          ? "bg-[#e6f4ec] text-[#1a6e37]"
                          : "bg-[#fef2f2] text-[var(--error)]"
                      }`}
                    >
                      {row.statusLabel}
                    </span>
                  </td>
                </tr>
              ))}
              {plannedRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-[var(--gray4)]">
                    Geen automatische factuurmails gepland.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card mt-4">
          <h2 className="mb-2 text-sm font-semibold text-[var(--gray1)]">Automatisch verzonden e-mails</h2>
          <p className="mb-3 text-xs text-[var(--gray3)]">
            Historie van factuurmails die automatisch door het planning-systeem zijn verstuurd.
          </p>
          {sentAutomaticError && (
            <div className="mb-3 rounded-lg border border-[#f5b7b7] bg-[#fff1f1] px-3 py-2.5 text-[13px] text-[#8a1f1f]">
              {sentAutomaticError}
            </div>
          )}
          <table>
            <thead>
              <tr className="border-b border-gray-100">
                <th>Verstuurd op</th>
                <th>Naar</th>
                <th>Onderwerp</th>
                <th>Status</th>
                <th>Foutmelding</th>
              </tr>
            </thead>
            <tbody>
              {sentAutomaticRows.map((row) => (
                <tr key={row.id} className="border-b border-gray-50">
                  <td className="text-xs text-[var(--gray3)]">{row.sentAtLabel}</td>
                  <td className="text-xs text-[var(--gray2)]">{row.to}</td>
                  <td className="text-xs font-medium text-[var(--gray1)]">{row.subject}</td>
                  <td className="text-xs">
                    <span
                      className={`rounded px-2 py-0.5 ${
                        row.status === "success"
                          ? "bg-[#e6f4ec] text-[#1a6e37]"
                          : "bg-[#fef2f2] text-[var(--error)]"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="text-xs text-[var(--gray3)]">{row.error || "-"}</td>
                </tr>
              ))}
              {sentAutomaticRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-[var(--gray4)]">
                    Nog geen automatische e-mails verzonden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
