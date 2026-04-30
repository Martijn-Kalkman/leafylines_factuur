"use client";

import { useEffect, useRef, useState } from "react";
import { type Client, useStore } from "@/store/useStore";
import { generatePdfBlob } from "@/lib/generatePdf";
import { renderEmailTemplate } from "@/lib/emailTemplates";
import { htmlToPlainText, sanitizeHtmlEmail } from "@/lib/htmlEmail";
import { calcTotals } from "@/store/useStore";

const FALLBACK_DOCUMENT_SUBJECT_TEMPLATE = "Factuur {documentId} - LeafyLines";
const FALLBACK_DOCUMENT_HTML_TEMPLATE = `
<div style="margin:0;padding:24px;background:#f4f7fb;font-family:Arial,'Helvetica Neue',sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
    <tr>
      <td style="padding:20px 24px;background:linear-gradient(135deg,#0f766e,#0b4f4a);color:#ffffff;">
        <p style="margin:0;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;opacity:.9;">LeafyLines</p>
        <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;font-weight:700;">Factuur {documentId}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:24px;">
        <p style="margin:0 0 12px;font-size:15px;line-height:1.7;">Beste {clientName},</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;">
          Bedankt voor de fijne samenwerking. In de bijlage vind je factuur
          <strong>{documentId}</strong>.
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 18px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;">
          <tr>
            <td style="padding:14px 16px;">
              <p style="margin:0 0 6px;font-size:13px;color:#4b5563;">Factuurdatum: <strong style="color:#111827;">{factuurdatum}</strong></p>
              <p style="margin:0 0 6px;font-size:13px;color:#4b5563;">Vervaldatum: <strong style="color:#111827;">{vervaldatum}</strong></p>
              <p style="margin:0;font-size:13px;color:#4b5563;">Totaalbedrag: <strong style="color:#0f766e;">EUR {bedrag}</strong></p>
            </td>
          </tr>
        </table>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#374151;">
          Heb je nog vragen over deze factuur? Reageer gerust op deze e-mail.
        </p>
        <p style="margin:0;font-size:15px;line-height:1.7;">
          Met vriendelijke groet,<br />
          <strong>{contactName}</strong><br />
          LeafyLines
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:14px 24px;background:#f8fafc;border-top:1px solid #e5e7eb;">
        <p style="margin:0;font-size:12px;color:#6b7280;">Dit is een geautomatiseerd bericht vanuit LeafyLines.</p>
      </td>
    </tr>
  </table>
</div>
`;
const FALLBACK_CONFIRMATION_HTML_TEMPLATE = `
<div style="margin:0;padding:24px;background:#f4f7fb;font-family:Arial,'Helvetica Neue',sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
    <tr>
      <td style="padding:18px 24px;background:#111827;color:#ffffff;">
        <p style="margin:0;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;opacity:.9;">LeafyLines</p>
        <h2 style="margin:8px 0 0;font-size:20px;line-height:1.3;">Verzendbevestiging</h2>
      </td>
    </tr>
    <tr>
      <td style="padding:24px;">
        <p style="margin:0 0 14px;font-size:15px;line-height:1.7;">
          Factuur <strong>{documentId}</strong> is succesvol verzonden naar
          <a href="mailto:{toEmail}" style="color:#0f766e;text-decoration:none;">{toEmail}</a>.
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0;background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;">
          <tr>
            <td style="padding:14px 16px;">
              <p style="margin:0;font-size:13px;color:#4b5563;">Verstuurd op: <strong style="color:#111827;">{sentAt}</strong></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>
`;

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

  useEffect(() => {
    let active = true;
    const loadSession = async () => {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      if (!active) return;
      if (!response.ok) {
        setIsAuthenticated(false);
        setAuthUserId(null);
        return;
      }
      const data = (await response.json()) as { authenticated?: boolean; user?: { id?: string } };
      const authenticated = data.authenticated === true;
      setIsAuthenticated(authenticated);
      setAuthUserId(authenticated ? String(data.user?.id || "") : null);
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
      const [settingsResponse, clientsResponse] = await Promise.all([
        fetch("/api/settings", { cache: "no-store" }),
        fetch("/api/klanten", { cache: "no-store" }),
      ]);
      if (!settingsResponse.ok || !clientsResponse.ok) return;
      const settingsPayload = (await settingsResponse.json()) as Record<string, unknown>;
      const clientsPayload = (await clientsResponse.json()) as { clients?: unknown[] };
      hydrateWorkspace({
        ...settingsPayload,
        clients: (clientsPayload.clients ?? []) as Client[],
      });
      setWorkspaceLoadedUserId(authUserId);
    };

    void loadWorkspace();
  }, [isAuthenticated, authUserId, workspaceLoadedUserId, hydrateWorkspace]);

  useEffect(() => {
    if (!isAuthenticated || !authUserId) return;
    if (workspaceLoadedUserId !== authUserId) return;

    const syncWorkspaceToDatabase = async () => {
      const payload = getWorkspacePayload();
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
        console.error("Workspace autosave failed", {
          settingsStatus: settingsResponse.status,
          clientsStatus: clientsResponse.status,
        });
      }
    };

    const unsubscribe = useStore.subscribe((state, previousState) => {
      if (state === previousState) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        void syncWorkspaceToDatabase();
      }, 1000);
    });

    // Force an initial sync and a periodic sync so data reaches DB even if
    // a subscription callback is skipped in edge cases.
    void syncWorkspaceToDatabase();
    const periodicSyncTimer = setInterval(() => {
      void syncWorkspaceToDatabase();
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
        const clientBasedIds = generateClientRecurringInvoices();
        if (clientBasedIds.length === 0) return;

        const state = useStore.getState();
        for (const id of clientBasedIds) {
          const doc = state.documents.find((d) => d.id === id);
          if (!doc) continue;
          const client = state.clients.find((c) => c.company === doc.client);
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
          const response = await fetch("/api/send-document", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({
              to: client.email,
              sendConfirmation: true,
              subject: renderEmailTemplate(state.emailIntegration.documentSubjectTemplate || FALLBACK_DOCUMENT_SUBJECT_TEMPLATE, templateContext),
              html: sanitizeHtmlEmail(renderEmailTemplate(state.emailIntegration.documentHtmlTemplate || FALLBACK_DOCUMENT_HTML_TEMPLATE, templateContext)),
              text: htmlToPlainText(renderEmailTemplate(state.emailIntegration.documentHtmlTemplate || FALLBACK_DOCUMENT_HTML_TEMPLATE, templateContext)),
              confirmationHtml: sanitizeHtmlEmail(renderEmailTemplate(state.emailIntegration.confirmationHtmlTemplate || FALLBACK_CONFIRMATION_HTML_TEMPLATE, {
                documentId: doc.id,
                clientName: doc.clientName || doc.client,
                clientCompany: doc.client,
                contactName: doc.contact || "LeafyLines",
                toEmail: client.email,
                sentAt: new Date().toLocaleString("nl-NL"),
              })),
              confirmationText: htmlToPlainText(renderEmailTemplate(state.emailIntegration.confirmationHtmlTemplate || FALLBACK_CONFIRMATION_HTML_TEMPLATE, {
                documentId: doc.id,
                clientName: doc.clientName || doc.client,
                clientCompany: doc.client,
                contactName: doc.contact || "LeafyLines",
                toEmail: client.email,
                sentAt: new Date().toLocaleString("nl-NL"),
              })),
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
    const timer = setInterval(() => {
      void runRecurringGeneration();
    }, 30_000);

    return () => {
      clearInterval(timer);
    };
  }, [isAuthenticated, authUserId, workspaceLoadedUserId, generateRecurringDocuments, generateClientRecurringInvoices]);

  return <>{children}</>;
}
