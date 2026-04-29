"use client";
import Sidebar from "@/components/Sidebar";
import StatusBadge from "@/components/StatusBadge";
import { useStore, calcTotals, btwPerKwartaal, omzetPerKlant, omzetPerMaand } from "@/store/useStore";
import { useRouter } from "next/navigation";
import { TrendingUp, Clock, CheckCircle, FileText } from "lucide-react";

export default function Dashboard() {
  const { documents } = useStore();
  const router = useRouter();

  const facturen = documents.filter((d) => d.type === "factuur");
  const betaald = facturen.filter((d) => d.status === "betaald");
  const openstaand = documents.filter((d) => d.status === "openstaand");

  const totalReceived = betaald.reduce((s, d) => s + calcTotals(d.items, d.btwRate).total, 0);
  const totalOpen = openstaand.reduce((s, d) => s + calcTotals(d.items, d.btwRate).total, 0);

  const recent = [...documents].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const maandOmzet = Object.entries(omzetPerMaand(documents)).sort((a, b) => a[0].localeCompare(b[0]));
  const btwKwartaal = Object.entries(btwPerKwartaal(documents)).sort((a, b) => a[0].localeCompare(b[0]));
  const topKlanten = Object.entries(omzetPerKlant(documents)).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxOmzet = Math.max(1, ...maandOmzet.map(([, value]) => value));

  const fmt = (n: number) => `€ ${n.toFixed(2).replace(".", ",")}`;

  const kpis = [
    { label: "Totaal ontvangen", value: fmt(totalReceived), icon: CheckCircle, color: "#27AE50", bg: "#e6f4ec" },
    { label: "Totaal uitstaand", value: fmt(totalOpen), icon: Clock, color: "#E2B928", bg: "#fef9e6" },
    { label: "Openstaande docs", value: String(openstaand.length), icon: FileText, color: "#3F80ED", bg: "#e0ecfd" },
    { label: "Totaal documenten", value: String(documents.length), icon: TrendingUp, color: "#98E5D8", bg: "#e6f9f6" },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-56 flex-1 p-8">
        <h1 className="text-2xl font-semibold mb-1" style={{ color: "var(--gray1)" }}>Dashboard</h1>
        <p className="text-sm mb-6" style={{ color: "var(--gray3)" }}>Welkom terug bij LeafyLines</p>

        <div className="grid grid-cols-4 gap-4 mb-8">
          {kpis.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="card flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                <Icon size={18} color={color} />
              </div>
              <div>
                <p className="text-xs mb-0.5" style={{ color: "var(--gray3)" }}>{label}</p>
                <p className="font-semibold text-base" style={{ color: "var(--gray1)" }}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm" style={{ color: "var(--gray1)" }}>Recente documenten</h2>
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
                  <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/documenten/${d.id}`)}>
                    <td className="font-medium text-xs" style={{ color: "var(--gray1)" }}>{d.id}</td>
                    <td><span className="capitalize text-xs px-2 py-0.5 rounded" style={{ background: d.type === "factuur" ? "#e6f9f6" : "#f0eeff", color: d.type === "factuur" ? "#1a6b61" : "#4a35a8" }}>{d.type}</span></td>
                    <td className="text-xs" style={{ color: "var(--gray2)" }}>{d.client}</td>
                    <td className="text-xs" style={{ color: "var(--gray3)" }}>{d.date}</td>
                    <td className="text-xs font-medium" style={{ color: "var(--gray1)" }}>{fmt(total)}</td>
                    <td><StatusBadge status={d.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="card">
            <h3 className="font-semibold text-sm mb-3" style={{ color: "var(--gray1)" }}>Omzet per maand/jaar</h3>
            <div className="flex flex-col gap-2">
              {maandOmzet.map(([month, value]) => (
                <div key={month}>
                  <div className="flex justify-between text-xs" style={{ color: "var(--gray3)" }}>
                    <span>{month}</span><span>€ {value.toFixed(2)}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 999, background: "#eef2f7", marginTop: 4 }}>
                    <div style={{ height: 6, borderRadius: 999, background: "var(--accent)", width: `${(value / maxOmzet) * 100}%` }} />
                  </div>
                </div>
              ))}
              {maandOmzet.length === 0 && <p className="text-xs" style={{ color: "var(--gray4)" }}>Nog geen betaalde facturen.</p>}
            </div>
          </div>
          <div className="card">
            <h3 className="font-semibold text-sm mb-3" style={{ color: "var(--gray1)" }}>BTW per kwartaal</h3>
            <div className="flex flex-col gap-2">
              {btwKwartaal.map(([q, value]) => (
                <div key={q} className="flex justify-between text-xs" style={{ color: "var(--gray3)" }}>
                  <span>{q}</span><span>€ {value.toFixed(2)}</span>
                </div>
              ))}
              {btwKwartaal.length === 0 && <p className="text-xs" style={{ color: "var(--gray4)" }}>Nog geen BTW data.</p>}
            </div>
          </div>
          <div className="card">
            <h3 className="font-semibold text-sm mb-3" style={{ color: "var(--gray1)" }}>Top klanten</h3>
            <div className="flex flex-col gap-2">
              {topKlanten.map(([name, value]) => (
                <div key={name} className="flex justify-between text-xs" style={{ color: "var(--gray3)" }}>
                  <span>{name}</span><span>€ {value.toFixed(2)}</span>
                </div>
              ))}
              {topKlanten.length === 0 && <p className="text-xs" style={{ color: "var(--gray4)" }}>Nog geen top klanten beschikbaar.</p>}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
