"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import StatusBadge from "@/components/StatusBadge";
import { useStore, calcTotals, DocStatus, DocType, daysOverdue } from "@/store/useStore";
import { useRouter } from "next/navigation";
import { Search, Plus } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

const STATUSES: DocStatus[] = ["concept", "verzonden", "openstaand", "betaald"];

export default function Documenten() {
  const { documents, generateRecurringDocuments, generateClientRecurringInvoices } = useStore();
  const router = useRouter();
  const { showToast } = useToast();
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const runRecurringGeneration = async () => {
    const documentBasedCreated = generateRecurringDocuments();
    const clientBasedIds = generateClientRecurringInvoices();
    let autoSentCount = 0;
    if (clientBasedIds.length > 0) {
      const state = useStore.getState();
      for (const id of clientBasedIds) {
        const doc = state.documents.find((d) => d.id === id);
        if (!doc) continue;
        const client = state.clients.find((c) => c.company === doc.client);
        if (!client?.recurringInvoice?.autoSend || !client.email) continue;
        const response = await fetch("/api/send-document", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: client.email,
            subject: `Factuur ${doc.id}`,
            text: `Beste ${doc.clientName || doc.client},\n\nJe periodieke factuur ${doc.id} is aangemaakt in LeafyLines.\n\nMet vriendelijke groet,\n${doc.contact || "LeafyLines"}`,
            confirmationText: `Automatische factuur ${doc.id} is verzonden naar ${client.email}.`,
          }),
        });
        if (response.ok) {
          autoSentCount++;
        }
      }
    }
    if (documentBasedCreated || clientBasedIds.length || autoSentCount) {
      showToast(
        `Terugkerend verwerkt: ${documentBasedCreated + clientBasedIds.length} nieuw, ${autoSentCount} automatisch verzonden.`,
        "success",
      );
    }
  };
  useEffect(() => {
    runRecurringGeneration();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<DocStatus | "">("");
  const [filterType, setFilterType] = useState<DocType | "">("");

  const fmt = (n: number) => `€ ${n.toFixed(2).replace(".", ",")}`;

  const filtered = documents
    .filter((d) => {
      const q = search.toLowerCase();
      return (
        (!q || d.id.toLowerCase().includes(q) || d.client.toLowerCase().includes(q)) &&
        (!filterStatus || d.status === filterStatus) &&
        (!filterType || d.type === filterType) &&
        (!onlyOverdue || (d.status === "openstaand" && daysOverdue(d.dueDate) > 0))
      );
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-56 flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold mb-1" style={{ color: "var(--gray1)" }}>Documenten</h1>
            <p className="text-sm" style={{ color: "var(--gray3)" }}>{documents.length} documenten totaal</p>
          </div>
          <button className="btn-primary flex items-center gap-2" onClick={() => router.push("/nieuw")}>
            <Plus size={14} /> Nieuw document
          </button>
        </div>

        <div className="card mb-4">
          <div className="page-actions">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-2.5" style={{ color: "var(--gray4)" }} />
              <input placeholder="Zoek op nummer of klant..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value as DocType | "")} style={{ width: 160 }}>
              <option value="">Alle types</option>
              <option value="factuur">Factuur</option>
              <option value="offerte">Offerte</option>
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as DocStatus | "")} style={{ width: 160 }}>
              <option value="">Alle statussen</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
            <label className="flex items-center gap-2 text-xs px-3">
              <input type="checkbox" checked={onlyOverdue} onChange={(e) => setOnlyOverdue(e.target.checked)} />
              Over vervaldatum
            </label>
            <button className="btn-outline" type="button" onClick={runRecurringGeneration}>
              Genereer terugkerend
            </button>
          </div>
        </div>

        <div className="card">
          <table>
            <thead>
              <tr className="border-b border-gray-100">
                <th>Nummer</th><th>Type</th><th>Taal</th><th>Klant</th><th>Contact</th><th>Datum</th><th>Bedrag</th><th>Herinnering</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => {
                const { total } = calcTotals(d.items, d.btwRate);
                return (
                  <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/documenten/${d.id}`)}>
                    <td className="font-medium text-xs" style={{ color: "var(--gray1)" }}>{d.id}</td>
                    <td><span className="capitalize text-xs px-2 py-0.5 rounded" style={{ background: d.type === "factuur" ? "#e6f9f6" : "#f0eeff", color: d.type === "factuur" ? "#1a6b61" : "#4a35a8" }}>{d.type}</span></td>
                    <td className="text-xs uppercase font-medium" style={{ color: "var(--gray3)" }}>{d.lang}</td>
                    <td className="text-xs" style={{ color: "var(--gray2)" }}>{d.client}</td>
                    <td className="text-xs" style={{ color: "var(--gray3)" }}>{d.contact}</td>
                    <td className="text-xs" style={{ color: "var(--gray3)" }}>{d.date}</td>
                    <td className="text-xs font-medium" style={{ color: "var(--gray1)" }}>{fmt(total)}</td>
                    <td className="text-xs" style={{ color: "var(--gray3)" }}>
                      {d.status === "openstaand" && daysOverdue(d.dueDate) > 0 ? `${daysOverdue(d.dueDate)} dagen` : "-"}
                      {d.reminderSent ? " • verzonden" : ""}
                    </td>
                    <td><StatusBadge status={d.status} /></td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="text-center py-8 text-sm" style={{ color: "var(--gray4)" }}>Geen documenten gevonden</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}