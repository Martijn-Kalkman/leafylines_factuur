"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ConfirmModal from "@/components/ConfirmModal";
import { useToast } from "@/components/ToastProvider";
import { useStore, DocStatus, daysOverdue } from "@/store/useStore";
import { generatePdf, generatePdfBlob, generatePdfBlobUrl } from "@/lib/generatePdf";
import { downloadTimeRegistrationCsv, generateTimeRegistrationPdf } from "@/lib/generateTimeRegistration";
import { ArrowLeft, Download, Trash2, BellRing, Repeat, Mail } from "lucide-react";

const STATUSES: DocStatus[] = ["concept", "verzonden", "openstaand", "betaald"];

export default function DocDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { documents, updateDocument, deleteDocument, company, markReminderSent, convertQuoteToInvoice, projects, team } = useStore();
  const doc = documents.find((d) => d.id === id);
  const project = doc?.projectId ? projects.find((p) => p.id === doc.projectId) : null;
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [timeExportFormat, setTimeExportFormat] = useState<"pdf" | "csv">("pdf");
  const { showToast } = useToast();
  const canEdit = doc?.status === "concept";
  const linkedTimeEntries = doc?.timeEntries ?? [];

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

  if (!doc) return <div className="ml-56 p-8">Document niet gevonden.</div>;


  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-56 flex-1 p-8">
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
              onClick={async () => {
                const to = window.prompt("Ontvanger e-mail", "");
                if (!to) return;
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
                  subject: `${doc.type === "factuur" ? "Factuur" : "Offerte"} ${doc.id}`,
                  text: `Beste ${doc.clientName || doc.client},\n\nIn de bijlage vind je ${doc.type} ${doc.id}.\n\nMet vriendelijke groet,\n${doc.contact}`,
                  confirmationText: `Document ${doc.id} is verzonden naar ${to}.`,
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
                showToast("E-mail verzonden.", "success");
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
          {doc.status === "openstaand" && (
            <button className="btn-outline flex items-center gap-2" onClick={() => { markReminderSent(doc.id); showToast("Herinnering gemarkeerd als verzonden.", "success"); }}>
              <BellRing size={14} /> Herinnering verzonden
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
        {(project || (doc.status === "openstaand" && daysOverdue(doc.dueDate) > 0)) && (
          <div className="card max-w-3xl mx-auto mb-4 text-xs flex justify-between">
            <span style={{ color: "var(--gray3)" }}>
              {project ? `Project: ${project.name} (${project.status})` : "Geen project"}
            </span>
            <span style={{ color: "var(--gray3)" }}>
              {doc.status === "openstaand" && daysOverdue(doc.dueDate) > 0 ? `${daysOverdue(doc.dueDate)} dagen over vervaldatum` : "Op tijd"}
              {doc.reminderSent ? " • herinnering verzonden" : ""}
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