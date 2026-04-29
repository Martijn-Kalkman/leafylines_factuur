import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { CompanySettings, Document, TimeEntry } from "@/store/useStore";

export function downloadTimeRegistrationCsv(doc: Document, entries: TimeEntry[], hourlyRate: number): void {
  const grouped = entries.reduce<Record<string, TimeEntry[]>>((acc, entry) => {
    const section = entry.section?.trim() || "Algemeen";
    acc[section] = [...(acc[section] ?? []), entry];
    return acc;
  }, {});
  const lines = [
    "sectie,service,uren,uurtarief,totaal",
  ];
  Object.entries(grouped).forEach(([section, sectionEntries]) => {
    sectionEntries.forEach((entry) => {
      const total = (entry.hours || 0) * hourlyRate;
      const service = `"${(entry.service || "").replaceAll('"', '""')}"`;
      lines.push(`"${section.replaceAll('"', '""')}",${service},${entry.hours || 0},${hourlyRate},${total.toFixed(2)}`);
    });
  });
  const csv = lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${doc.id}-urenregistratie.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function generateTimeRegistrationPdf(doc: Document, company: CompanySettings, entries: TimeEntry[], hourlyRate: number): void {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 20;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("Urenregistratie", margin, 16);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(`Document: ${doc.id}`, margin, 24);
  pdf.text(`Klant: ${doc.client}`, margin, 29);
  pdf.text(`Datum: ${doc.date}`, margin, 34);
  pdf.text(`Bedrijf: ${company.name}`, margin, 39);

  const grouped = entries.reduce<Record<string, TimeEntry[]>>((acc, entry) => {
    const section = entry.section?.trim() || "Algemeen";
    acc[section] = [...(acc[section] ?? []), entry];
    return acc;
  }, {});
  const rows: string[][] = [];
  Object.entries(grouped).forEach(([section, sectionEntries]) => {
    rows.push([`[${section}]`, "", "", ""]);
    sectionEntries.forEach((entry) => {
      const total = (entry.hours || 0) * hourlyRate;
      rows.push([
        entry.service || "",
        String(entry.hours || 0),
        `€ ${hourlyRate.toFixed(2)}`,
        `€ ${total.toFixed(2)}`,
      ]);
    });
  });

  autoTable(pdf, {
    startY: 46,
    head: [["Service", "Uren", "Uurtarief", "Totaal"]],
    body: rows.length ? rows : [["Geen urenregistratie", "-", "-", "-"]],
    margin: { left: margin, right: margin },
    styles: { fontSize: 9 },
    headStyles: { fillColor: [63, 128, 237], textColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { halign: "right", cellWidth: 24 },
      2: { halign: "right", cellWidth: 32 },
      3: { halign: "right", cellWidth: 32 },
    },
  });

  const totalHours = entries.reduce((sum, e) => sum + (e.hours || 0), 0);
  const totalAmount = entries.reduce((sum, e) => sum + ((e.hours || 0) * hourlyRate), 0);
  const endY = ((pdf as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 52) + 8;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text(`Totaal uren: ${totalHours.toFixed(2)}`, margin, endY);
  pdf.text(`Totaal bedrag: € ${totalAmount.toFixed(2)}`, margin, endY + 5);

  pdf.save(`${doc.id}-urenregistratie.pdf`);
}
