import { DocStatus } from "@/store/useStore";

const MAP: Record<DocStatus, { bg: string; color: string; label: string }> = {
  betaald:    { bg: "#e6f4ec", color: "#1a6e37", label: "Betaald" },
  openstaand: { bg: "#fef3cd", color: "#856404", label: "Openstaand" },
  verzonden:  { bg: "#e0ecfd", color: "#1a4fa0", label: "Verzonden" },
  concept:    { bg: "#f2f2f2", color: "#555555", label: "Concept" },
};

export default function StatusBadge({ status }: { status: DocStatus }) {
  const s = MAP[status];
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 500, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}