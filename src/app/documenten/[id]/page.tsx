"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ConfirmModal from "@/components/ConfirmModal";
import { useToast } from "@/components/ToastProvider";
import { useStore, calcTotals, DocStatus, daysOverdue } from "@/store/useStore";
import { generatePdf, generatePdfBlob, generatePdfBlobUrl } from "@/lib/generatePdf";
import { downloadTimeRegistrationCsv, generateTimeRegistrationPdf } from "@/lib/generateTimeRegistration";
import { renderEmailTemplate } from "@/lib/emailTemplates";
import { htmlToPlainText, sanitizeHtmlEmail } from "@/lib/htmlEmail";
import { ArrowLeft, Download, Trash2, Repeat, Mail } from "lucide-react";

const STATUSES: DocStatus[] = ["concept", "verzonden", "openstaand", "betaald"];
const FALLBACK_DOCUMENT_SUBJECT_TEMPLATE = "Factuur {documentId}";
const FALLBACK_DOCUMENT_HTML_TEMPLATE = "<p>Beste {clientName},</p><p>In de bijlage vind je factuur <strong>{documentId}</strong>.</p><p>Met vriendelijke groet,<br />{contactName}</p>";
const FALLBACK_CONFIRMATION_HTML_TEMPLATE = "<p>Document <strong>{documentId}</strong> is verzonden naar <a href=\"mailto:{toEmail}\">{toEmail}</a> op {sentAt}.</p>";

export default function DocDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { documents, clients, updateDocument, deleteDocument, company, convertQuoteToInvoice, team, emailIntegration } = useStore();
  const doc = documents.find((d) => d.id === id);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sendEmailOpen, setSendEmailOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [overrideRecipient, setOverrideRecipient] = useState(false);
  const [timeExportFormat, setTimeExportFormat] = useState<"pdf" | "csv">("pdf");
  const { showToast } = useToast();
  const canEdit = doc?.status === "concept";
  const linkedTimeEntries = doc?.timeEntries ?? [];
  const suggestedClients = clients.filter((client) => !doc || client.company === doc.client || client.contactName === doc.clientName);
  const defaultClient = suggestedClients.find((client) => !doc || client.company === doc.client) ?? suggestedClients[0];
  const selectedClient = suggestedClients.find((client) => client.id === selectedClientId);
  const defaultRecipient = (defaultClient?.email || "").trim();

  useEffect(() => {
    let active = true;
    let urlToRevoke = "";
    (async () => {
      if (!doc) return;
      const signature = team.find((m) => m.name === doc.contact)?.signature;
      const url = await generatePdfBlobUrl(doc, company, signature);
      if (!active) {
        URL.revokeObjectURL(url);
        return;
      }
      urlToRevoke = url;
      setPreviewUrl(url);
    })();
    return () => {
      active = false;
      if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
    };
  }, [doc, company, team]);

  const handleDelete = () => {
    if (!doc) return;
    deleteDocument(doc.id);
    showToast("Document verwijderd.", "success");
    router.push("/documenten");
  };

  const handleConvert = () => {
    if (!doc) return;
    const newId = convertQuoteToInvoice(doc.id);
    if (newId) {
      showToast("Offerte omgezet naar factuur.", "success");
      router.push(`/documenten/${newId}`);
    } else {
      showToast("Omzetten is niet gelukt.", "error");
    }
  };

  if (!doc) return <div className="app-fallback">Document niet gevonden.</div>;


  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="app-main">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.back()} className="btn-outline flex items-center gap-2">
            <ArrowLeft size={14} /> Terug
          </button>
          <h1 className="text-xl font-semibold flex-1" style={{ color: "var(--gray1)" }}>{doc.id}</h1>
          <select value={doc.status} onChange={(e) => updateDocument(doc.id, { status: e.target.value as DocStatus })}
            style={{ width: 160 }}>
            {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <button className="btn-primary flex items-center gap-2" onClick={() => generatePdf(doc, company, team.find((m) => m.name === doc.contact)?.signature)}>
            <Download size={14} /> PDF downloaden
          </button>
          {(doc.type === "factuur" || doc.type === "offerte") && linkedTimeEntries.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                value={timeExportFormat}
                onChange={(e) => setTimeExportFormat(e.target.value as "pdf" | "csv")}
                style={{ width: 140 }}
              >
                <option value="pdf">PDF</option>
                <option value="csv">CSV (.csv)</option>
              </select>
              <button
                className="btn-outline flex items-center gap-2"
                onClick={() => {
                  if (timeExportFormat === "pdf") {
                    generateTimeRegistrationPdf(doc, company, linkedTimeEntries, doc.timeHourlyRate);
                    return;
                  }
                  downloadTimeRegistrationCsv(doc, linkedTimeEntries, doc.timeHourlyRate);
                }}
              >
                <Download size={14} /> Urenregistratie download
              </button>
            </div>
          )}
          {canEdit && <button className="btn-outline" onClick={() => router.push(`/nieuw?edit=${doc.id}`)}>Bewerk concept</button>}
          {(
            <button
              className="btn-outline flex items-center gap-2"
              onClick={() => {
                const firstWithEmail = suggestedClients.find((client) => client.email) ?? defaultClient;
                setSelectedClientId(firstWithEmail?.id ?? "");
                setManualEmail("");
                setOverrideRecipient(false);
                setSendEmailOpen(true);
              }}
            >
              <Mail size={14} /> Stuur per e-mail
            </button>
          )}
          {doc.type === "offerte" && (
            <button className="btn-outline flex items-center gap-2" onClick={handleConvert}>
              <Repeat size={14} /> Zet om naar factuur
            </button>
          )}
          <button onClick={() => setDeleteOpen(true)} className="btn-danger flex items-center gap-2">
            <Trash2 size={14} /> Verwijderen
          </button>
        </div>
        <ConfirmModal
          open={deleteOpen}
          title="Document verwijderen"
          message={`Weet je zeker dat je ${doc.id} wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.`}
          confirmLabel="Ja, verwijderen"
          onCancel={() => setDeleteOpen(false)}
          onConfirm={() => { setDeleteOpen(false); handleDelete(); }}
        />
        <ConfirmModal
          open={sendEmailOpen}
          title="Document per e-mail versturen"
          message={
            <div style={{ marginTop: 10 }}>
              <div style={{ marginBottom: 10, padding: 10, borderRadius: 8, border: "1px solid #e5e7eb", background: "#f8fafc" }}>
                <p style={{ fontSize: 12, color: "var(--gray3)", marginBottom: 4 }}>Standaard ontvanger (gekoppelde klant)</p>
                <p style={{ fontSize: 14, color: "var(--gray1)", fontWeight: 600 }}>
                  {defaultRecipient || "Geen e-mailadres gevonden voor deze klant"}
                </p>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: 13, color: "var(--gray2)" }}>
                <input
                  type="checkbox"
                  checked={overrideRecipient}
                  onChange={(e) => setOverrideRecipient(e.target.checked)}
                />
                Ik wil naar een andere ontvanger sturen
              </label>
              {overrideRecipient && suggestedClients.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 12, color: "var(--gray3)", display: "block", marginBottom: 4 }}>Klant selecteren</label>
                  <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)}>
                    {suggestedClients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.company}{client.contactName ? ` (${client.contactName})` : ""}{client.email ? ` - ${client.email}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {overrideRecipient && (
                <>
                  <label style={{ fontSize: 12, color: "var(--gray3)", display: "block", marginBottom: 4 }}>Of vul e-mailadres handmatig in</label>
                  <input
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    placeholder={selectedClient?.email || "naam@bedrijf.nl"}
                  />
                </>
              )}
            </div>
          }
          confirmLabel="Versturen"
          onCancel={() => setSendEmailOpen(false)}
          onConfirm={async () => {
            const to = overrideRecipient
              ? (manualEmail.trim() || selectedClient?.email || "").trim()
              : defaultRecipient;
            if (!to) {
              showToast(
                overrideRecipient
                  ? "Selecteer een klant met e-mailadres of vul handmatig een e-mail in."
                  : "Deze klant heeft geen e-mailadres. Vink 'andere ontvanger' aan om handmatig te kiezen.",
                "error",
              );
              return;
            }
            try {
                const sentAt = new Date();
                const dueDateFromEmailSend = new Date(sentAt);
                dueDateFromEmailSend.setDate(dueDateFromEmailSend.getDate() + 14);
                const templateContext = {
                  documentId: doc.id,
                  clientName: doc.clientName || doc.client,
                  clientCompany: doc.client,
                  contactName: doc.contact || "LeafyLines",
                  toEmail: to,
                  sentAt: sentAt.toLocaleString("nl-NL"),
                  naam: doc.clientName || doc.client,
                  factuurnummer: doc.id,
                  factuurdatum: doc.date,
                  vervaldatum: dueDateFromEmailSend.toLocaleDateString("nl-NL"),
                  bedrag: calcTotals(doc.items, doc.btwRate).total.toFixed(2),
                  adres: `${company.address}, ${company.city}, ${company.country}`,
                  email: company.email,
                  telefoon: company.phone,
                  kvk: company.kvk,
                  btw: company.btw,
                } as const;
                const signature = team.find((m) => m.name === doc.contact)?.signature;
                const pdfBlob = await generatePdfBlob(doc, company, signature);
                const attachmentBase64 = await new Promise<string>((resolve, reject) => {
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
                  reader.readAsDataURL(pdfBlob);
                });
                const payload = {
                  to,
                  sendConfirmation: true,
                  subject: renderEmailTemplate(emailIntegration.documentSubjectTemplate || FALLBACK_DOCUMENT_SUBJECT_TEMPLATE, templateContext),
                  html: sanitizeHtmlEmail(renderEmailTemplate(emailIntegration.documentHtmlTemplate || FALLBACK_DOCUMENT_HTML_TEMPLATE, templateContext)),
                  text: htmlToPlainText(renderEmailTemplate(emailIntegration.documentHtmlTemplate || FALLBACK_DOCUMENT_HTML_TEMPLATE, templateContext)),
                  confirmationHtml: sanitizeHtmlEmail(renderEmailTemplate(emailIntegration.confirmationHtmlTemplate || FALLBACK_CONFIRMATION_HTML_TEMPLATE, {
                    documentId: doc.id,
                    clientName: doc.clientName || doc.client,
                    clientCompany: doc.client,
                    contactName: doc.contact || "LeafyLines",
                    toEmail: to,
                    sentAt: new Date().toLocaleString("nl-NL"),
                    factuurnummer: doc.id,
                  })),
                  confirmationText: htmlToPlainText(renderEmailTemplate(emailIntegration.confirmationHtmlTemplate || FALLBACK_CONFIRMATION_HTML_TEMPLATE, {
                    documentId: doc.id,
                    clientName: doc.clientName || doc.client,
                    clientCompany: doc.client,
                    contactName: doc.contact || "LeafyLines",
                    toEmail: to,
                    sentAt: new Date().toLocaleString("nl-NL"),
                    factuurnummer: doc.id,
                  })),
                  attachmentBase64,
                  attachmentFileName: `${doc.id}.pdf`,
                  attachmentMimeType: "application/pdf",
                };
                const response = await fetch("/api/send-document", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                });
                if (!response.ok) {
                  const data = await response.json();
                  showToast(data?.error || "E-mail verzenden mislukt.", "error");
                  return;
                }
                setSendEmailOpen(false);
                showToast("E-mail verzonden.", "success");
            } catch {
              showToast("E-mail verzenden mislukt.", "error");
            }
          }}
        />
        {doc.status === "openstaand" && daysOverdue(doc.dueDate) > 0 && (
          <div className="card max-w-3xl mx-auto mb-4 text-xs flex justify-between">
            <span style={{ color: "var(--gray3)" }}>Betaalstatus</span>
            <span style={{ color: "var(--gray3)" }}>
              {doc.status === "openstaand" && daysOverdue(doc.dueDate) > 0 ? `${daysOverdue(doc.dueDate)} dagen over vervaldatum` : "Op tijd"}
            </span>
          </div>
        )}

        <div className="card max-w-5xl mx-auto p-2">
          {previewUrl ? (
            <iframe
              title={`PDF preview ${doc.id}`}
              src={previewUrl}
              style={{ width: "100%", height: "1100px", border: "none", borderRadius: 8, background: "white" }}
            />
          ) : (
            <p className="text-sm p-4" style={{ color: "var(--gray4)" }}>PDF preview wordt opgebouwd...</p>
          )}
        </div>
      </main>
    </div>
  );
}