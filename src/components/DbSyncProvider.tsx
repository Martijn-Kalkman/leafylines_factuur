"use client";

import { useEffect, useRef, useState } from "react";
import { type Client, useStore } from "@/store/useStore";
import { generatePdfBlob } from "@/lib/generatePdf";
import { renderEmailTemplate } from "@/lib/emailTemplates";
import { htmlToPlainText, sanitizeHtmlEmail } from "@/lib/htmlEmail";
import { calcTotals } from "@/store/useStore";

const FALLBACK_DOCUMENT_SUBJECT_TEMPLATE = "Factuur {documentId}";
const FALLBACK_DOCUMENT_HTML_TEMPLATE =
  "<p>Beste {clientName},</p><p>In de bijlage vind je factuur <strong>{documentId}</strong>.</p><p>Met vriendelijke groet,<br />{contactName}</p>";
const FALLBACK_CONFIRMATION_HTML_TEMPLATE =
  "<p>Document <strong>{documentId}</strong> is verzonden naar <a href=\"mailto:{toEmail}\">{toEmail}</a> op {sentAt}.</p>";

type SessionPayload = { authenticated?: boolean; user?: { id?: string } };
type WorkspacePayload = Pick<
  ReturnType<typeof useStore.getState>,
  "documents" | "clients" | "team" | "company" | "clientNotes" | "lineTemplates" | "emailIntegration" | "emailLogs"
>;

async function fetchSessionPayload(): Promise<SessionPayload | null> {
  const response = await fetch("/api/auth/session", { cache: "no-store" });
  if (!response.ok) return null;
  return (await response.json()) as SessionPayload;
}

async function loadWorkspacePayloadFromDatabase(): Promise<{
  settingsPayload: Record<string, unknown>;
  clients: Client[];
} | null> {
  const [settingsResponse, clientsResponse] = await Promise.all([
    fetch("/api/settings", { cache: "no-store" }),
    fetch("/api/klanten", { cache: "no-store" }),
  ]);
  if (!settingsResponse.ok || !clientsResponse.ok) return null;
  const settingsPayload = (await settingsResponse.json()) as Record<string, unknown>;
  const clientsPayload = (await clientsResponse.json()) as { clients?: unknown[] };
  return {
    settingsPayload,
    clients: (clientsPayload.clients ?? []) as Client[],
  };
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const commaIndex = result.indexOf(",");
      if (commaIndex < 0) {
        reject(new Error("Could not encode PDF attachment."));
        return;
      }
      resolve(result.slice(commaIndex + 1));
    };
    reader.onerror = () => reject(new Error("Could not encode PDF attachment."));
    reader.readAsDataURL(blob);
  });
}

async function persistWorkspaceToDatabase(payload: WorkspacePayload): Promise<void> {
  const settingsPayload = {
    documents: payload.documents,
    team: payload.team,
    company: payload.company,
    clientNotes: payload.clientNotes,
    lineTemplates: payload.lineTemplates,
    emailIntegration: payload.emailIntegration,
  };
  const [settingsResponse, clientsResponse] = await Promise.all([
    fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settingsPayload),
    }),
    fetch("/api/klanten", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clients: payload.clients }),
    }),
  ]);
  if (!settingsResponse.ok || !clientsResponse.ok) {
    const [settingsBodyRaw, clientsBodyRaw] = await Promise.all([
      settingsResponse.text().catch(() => ""),
      clientsResponse.text().catch(() => ""),
    ]);
    const parseErrorBody = (value: string) => {
      if (!value) return { message: "" };
      try {
        const parsed = JSON.parse(value) as { error?: string; detail?: string; errorId?: string };
        return {
          message: [parsed.error, parsed.detail].filter(Boolean).join(" | "),
          errorId: parsed.errorId,
        };
      } catch {
        return { message: value.slice(0, 500) };
      }
    };
    const settingsParsed = parseErrorBody(settingsBodyRaw);
    const clientsParsed = parseErrorBody(clientsBodyRaw);
    console.error("Workspace autosave failed", {
      settingsStatus: settingsResponse.status,
      clientsStatus: clientsResponse.status,
      settingsError: settingsParsed.message,
      settingsErrorId: settingsParsed.errorId,
      clientsError: clientsParsed.message,
      clientsErrorId: clientsParsed.errorId,
    });
  }
}

export function DbSyncProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [workspaceLoadedUserId, setWorkspaceLoadedUserId] = useState<string | null>(null);
  const hydrateWorkspace = useStore((state) => state.hydrateWorkspace);
  const getWorkspacePayload = useStore((state) => state.getWorkspacePayload);
  const generateRecurringDocuments = useStore((state) => state.generateRecurringDocuments);
  const generateClientRecurringInvoices = useStore((state) => state.generateClientRecurringInvoices);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recurringRunRef = useRef(false);
  const syncInFlightRef = useRef(false);
  const syncQueuedRef = useRef(false);

  useEffect(() => {
    let active = true;
    const loadSession = async () => {
      if (!active) return;
      const sessionPayload = await fetchSessionPayload();
      if (!sessionPayload) {
        setIsAuthenticated(false);
        setAuthUserId(null);
        return;
      }
      const authenticated = sessionPayload.authenticated === true;
      setIsAuthenticated(authenticated);
      setAuthUserId(authenticated ? String(sessionPayload.user?.id || "") : null);
    };
    void loadSession();
    const sessionTimer = setInterval(() => {
      if (!active) return;
      void loadSession();
    }, 5000);
    const onFocus = () => {
      if (!active) return;
      void loadSession();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      active = false;
      clearInterval(sessionTimer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !authUserId) {
      setWorkspaceLoadedUserId(null);
      return;
    }
    if (workspaceLoadedUserId === authUserId) return;

    const loadWorkspace = async () => {
      const workspacePayload = await loadWorkspacePayloadFromDatabase();
      if (!workspacePayload) return;
      hydrateWorkspace({
        ...workspacePayload.settingsPayload,
        clients: workspacePayload.clients,
      });
      setWorkspaceLoadedUserId(authUserId);
    };

    void loadWorkspace();
  }, [isAuthenticated, authUserId, workspaceLoadedUserId, hydrateWorkspace]);

  useEffect(() => {
    if (!isAuthenticated || !authUserId) return;
    if (workspaceLoadedUserId !== authUserId) return;

    const flushWorkspaceSyncQueue = async () => {
      if (syncInFlightRef.current) return;
      syncInFlightRef.current = true;
      try {
        // Coalesce multiple rapid updates into ordered writes.
        while (syncQueuedRef.current) {
          syncQueuedRef.current = false;
          const payload = getWorkspacePayload();
          await persistWorkspaceToDatabase(payload);
        }
      } finally {
        syncInFlightRef.current = false;
      }
    };

    const requestWorkspaceSync = () => {
      syncQueuedRef.current = true;
      void flushWorkspaceSyncQueue();
    };

    const unsubscribe = useStore.subscribe((state, previousState) => {
      if (state === previousState) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        requestWorkspaceSync();
      }, 1000);
    });

    // Force an initial sync and a periodic sync so data reaches DB even if
    // a subscription callback is skipped in edge cases.
    requestWorkspaceSync();
    const periodicSyncTimer = setInterval(() => {
      requestWorkspaceSync();
    }, 15_000);

    return () => {
      unsubscribe();
      clearInterval(periodicSyncTimer);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [isAuthenticated, authUserId, workspaceLoadedUserId, getWorkspacePayload]);

  useEffect(() => {
    if (!isAuthenticated || !authUserId) return;
    if (workspaceLoadedUserId !== authUserId) return;

    const runRecurringGeneration = async () => {
      if (recurringRunRef.current) return;
      recurringRunRef.current = true;
      try {
        generateRecurringDocuments();
        const generatedRecurringInvoices = generateClientRecurringInvoices();
        if (generatedRecurringInvoices.length === 0) return;

        const state = useStore.getState();
        for (const invoiceJob of generatedRecurringInvoices) {
          const doc = state.documents.find((d) => d.id === invoiceJob.documentId);
          if (!doc) continue;
          const client = state.clients.find((c) => c.id === invoiceJob.clientId);
          if (!client?.recurringInvoice?.autoSend || !client.email) continue;
          const sentAt = new Date();
          const dueDateFromEmailSend = new Date(sentAt);
          dueDateFromEmailSend.setDate(dueDateFromEmailSend.getDate() + 14);
          const templateContext = {
            documentId: doc.id,
            clientName: doc.clientName || doc.client,
            clientCompany: doc.client,
            contactName: doc.contact || "LeafyLines",
            toEmail: client.email,
            sentAt: sentAt.toLocaleString("nl-NL"),
            naam: doc.clientName || doc.client,
            factuurnummer: doc.id,
            factuurdatum: doc.date,
            vervaldatum: dueDateFromEmailSend.toLocaleDateString("nl-NL"),
            bedrag: calcTotals(doc.items, doc.btwRate).total.toFixed(2),
            adres: `${state.company.address}, ${state.company.city}, ${state.company.country}`,
            email: state.company.email,
            telefoon: state.company.phone,
            kvk: state.company.kvk,
            btw: state.company.btw,
          } as const;
          const signature = state.team.find((m) => m.name === doc.contact)?.signature;
          const pdfBlob = await generatePdfBlob(doc, state.company, signature);
          const attachmentBase64 = await blobToBase64(pdfBlob);
          const subjectTemplate =
            state.emailIntegration.documentSubjectTemplate?.trim() || FALLBACK_DOCUMENT_SUBJECT_TEMPLATE;
          const documentHtmlTemplate =
            state.emailIntegration.documentHtmlTemplate?.trim() || FALLBACK_DOCUMENT_HTML_TEMPLATE;
          const renderedSubject = renderEmailTemplate(subjectTemplate, templateContext);
          const renderedDocumentHtml = renderEmailTemplate(documentHtmlTemplate, templateContext);
          const confirmationHtmlTemplate =
            state.emailIntegration.confirmationHtmlTemplate?.trim() || FALLBACK_CONFIRMATION_HTML_TEMPLATE;
          const renderedConfirmationHtml = confirmationHtmlTemplate
            ? renderEmailTemplate(confirmationHtmlTemplate, {
                documentId: doc.id,
                clientName: doc.clientName || doc.client,
                clientCompany: doc.client,
                contactName: doc.contact || "LeafyLines",
                toEmail: client.email,
                sentAt: new Date().toLocaleString("nl-NL"),
              })
            : "";
          const response = await fetch("/api/send-document", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({
              to: client.email,
              source: "automatic",
              sendConfirmation: true,
              subject: renderedSubject,
              html: sanitizeHtmlEmail(renderedDocumentHtml),
              text: htmlToPlainText(renderedDocumentHtml),
              ...(renderedConfirmationHtml
                ? {
                    confirmationHtml: sanitizeHtmlEmail(renderedConfirmationHtml),
                    confirmationText: htmlToPlainText(renderedConfirmationHtml),
                  }
                : {}),
              attachmentBase64,
              attachmentFileName: `${doc.id}.pdf`,
              attachmentMimeType: "application/pdf",
            }),
          });
          if (!response.ok) {
            const details = await response.text().catch(() => "");
            console.error(`Recurring auto-send failed for ${doc.id}:`, details || response.statusText);
          }
        }
      } finally {
        recurringRunRef.current = false;
      }
    };

    void runRecurringGeneration();
    const runOnVisibilityOrFocus = () => {
      void runRecurringGeneration();
    };
    window.addEventListener("focus", runOnVisibilityOrFocus);
    document.addEventListener("visibilitychange", runOnVisibilityOrFocus);
    const timer = setInterval(() => {
      void runRecurringGeneration();
    }, 5_000);

    return () => {
      window.removeEventListener("focus", runOnVisibilityOrFocus);
      document.removeEventListener("visibilitychange", runOnVisibilityOrFocus);
      clearInterval(timer);
    };
  }, [isAuthenticated, authUserId, workspaceLoadedUserId, generateRecurringDocuments, generateClientRecurringInvoices]);

  return <>{children}</>;
}
