import { DocStatus } from "@/store/useStore";

const MAP: Record<DocStatus, { className: string; label: string }> = {
  betaald: { className: "bg-[#e6f4ec] text-[#1a6e37]", label: "Betaald" },
  openstaand: { className: "bg-[#fef3cd] text-[#856404]", label: "Openstaand" },
  verzonden: { className: "bg-[#e0ecfd] text-[#1a4fa0]", label: "Verzonden" },
  concept: { className: "bg-[#f2f2f2] text-[#555555]", label: "Concept" },
};

export default function StatusBadge({ status }: { status: DocStatus }) {
  const s = MAP[status];
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${s.className}`}>
      {s.label}
    </span>
  );
}