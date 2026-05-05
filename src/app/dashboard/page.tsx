"use client";
import Sidebar from "@/components/Sidebar";
import StatusBadge from "@/components/StatusBadge";
import { useStore, calcTotals } from "@/store/useStore";
import { useRouter } from "next/navigation";
import { TrendingUp, FileText } from "lucide-react";
import { useRef } from "react";
import { useToast } from "@/components/ToastProvider";

export default function Dashboard() {
  const { documents, getWorkspacePayload, hydrateWorkspace } = useStore();
  const router = useRouter();
  const { showToast } = useToast();
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const openstaand = documents.filter((d) => d.status === "openstaand");

  const recent = [...documents].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  const fmt = (n: number) => `€ ${n.toFixed(2).replace(".", ",")}`;
  const exportAllData = () => {
    const payload = getWorkspacePayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leafylines-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Export gedownload.", "success");
  };

  const importAllData = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Record<string, unknown>;
      const settingsPayload = {
        documents: parsed.documents ?? [],
        team: parsed.team ?? [],
        company: parsed.company ?? {},
        clientNotes: parsed.clientNotes ?? [],
        lineTemplates: parsed.lineTemplates ?? [],
        emailIntegration: parsed.emailIntegration ?? {},
      };
      const clientsPayload = {
        clients: Array.isArray(parsed.clients) ? parsed.clients : [],
      };
      const [settingsRes, clientsRes] = await Promise.all([
        fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settingsPayload),
        }),
        fetch("/api/klanten", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(clientsPayload),
        }),
      ]);
      if (!settingsRes.ok || !clientsRes.ok) {
        showToast("Import deels mislukt. Controleer je JSON en probeer opnieuw.", "error");
        return;
      }
      hydrateWorkspace({
        ...(settingsPayload as Parameters<typeof hydrateWorkspace>[0]),
        clients: clientsPayload.clients as Parameters<typeof hydrateWorkspace>[0]["clients"],
      });
      showToast("Import succesvol verwerkt.", "success");
    } catch {
      showToast("Ongeldig JSON-bestand. Import mislukt.", "error");
    }
  };

  const kpis = [
    { label: "Openstaande docs", value: String(openstaand.length), icon: FileText, color: "#3F80ED", bg: "#e0ecfd" },
    { label: "Totaal documenten", value: String(documents.length), icon: TrendingUp, color: "#98E5D8", bg: "#e6f9f6" },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="app-main space-y-6">
        <div className="mb-1 flex items-center justify-between">
          <h1>Dashboard</h1>
          <div className="flex items-center gap-2">
            <button className="btn-outline text-xs" onClick={exportAllData}>Export JSON</button>
            <button className="btn-outline text-xs" onClick={() => importInputRef.current?.click()}>Import JSON</button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                void importAllData(file);
                e.currentTarget.value = "";
              }}
            />
          </div>
        </div>
        <p className="mb-6 text-sm text-[var(--gray3)]">Welkom terug bij LeafyLines</p>

        <div className="grid grid-cols-4 gap-4 mb-8">
          {kpis.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="card flex items-center gap-4">
              <div className="h-10 w-10 flex-shrink-0 rounded-xl" style={{ background: bg, display: "grid", placeItems: "center" }}>
                <Icon size={18} color={color} />
              </div>
              <div>
                <p className="mb-0.5 text-xs text-[var(--gray3)]">{label}</p>
                <p className="text-base font-semibold text-[var(--gray1)]">{value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--gray1)]">Recente documenten</h2>
            <button className="btn-outline text-xs" onClick={() => router.push("/documenten")}>Alle bekijken</button>
          </div>
          <table>
            <thead>
              <tr className="border-b border-gray-100">
                <th>Nummer</th><th>Type</th><th>Klant</th><th>Datum</th><th>Bedrag</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((d) => {
                const { total } = calcTotals(d.items, d.btwRate);
                return (
                  <tr key={d.id} className="cursor-pointer border-b border-gray-50 transition-colors hover:bg-[var(--surface-muted)]"
                    onClick={() => router.push(`/documenten/${d.id}`)}>
                    <td className="text-xs font-medium text-[var(--gray1)]">{d.id}</td>
                    <td><span className={`rounded px-2 py-0.5 text-xs capitalize ${d.type === "factuur" ? "bg-[#e6f9f6] text-[#1a6b61]" : "bg-[#f0eeff] text-[#4a35a8]"}`}>{d.type}</span></td>
                    <td className="text-xs text-[var(--gray2)]">{d.client}</td>
                    <td className="text-xs text-[var(--gray3)]">{d.date}</td>
                    <td className="text-xs font-medium text-[var(--gray1)]">{fmt(total)}</td>
                    <td><StatusBadge status={d.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
