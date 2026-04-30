import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Document, CompanySettings, calcTotals } from "@/store/useStore";

const TEAL  = [91, 196, 179]   as const;
const BLUE  = [63, 128, 237]   as const;
const DARK  = [51, 51, 51]     as const;
const MID   = [79, 79, 79]     as const;
const GRAY  = [130, 130, 130]  as const;
const LGRAY = [200, 200, 200]  as const;
const WHITE = [255, 255, 255]  as const;

const T = {
  nl: {
    docTitle: (t: string) => t === "factuur" ? "Factuur" : "Offerte",
    product: "Product/service", desc: "Artikelomschrijving",
    price: "Stukprijs", total: "Totaal",
    date: "Datum", dueDate: "Vervaldatum", number: (t: string) => t === "factuur" ? "Factuurnummer" : "Offertenummer",
    kvk: "KvK nummer", btwLabel: "BTW nummer", iban: "IBAN",
    btwPct: "BTW in %", btwEur: "BTW in €", incl: "Incl. VAT",
    notes: "Notities",
    footer: (id: string, dueDate: string) =>
      `Vervaldatum: ${dueDate}. Gelieve te betalen op onze IBAN onder vermelding van factuurnummer ${id}.`,
  },
  en: {
    docTitle: (t: string) => t === "factuur" ? "Invoice" : "Quotation",
    product: "Product/service", desc: "Description",
    price: "Unit price", total: "Total",
    date: "Date", dueDate: "Due date", number: (t: string) => t === "factuur" ? "Invoice number" : "Quote number",
    kvk: "Chamber of Commerce", btwLabel: "VAT number", iban: "IBAN",
    btwPct: "VAT %", btwEur: "VAT amount", incl: "Incl. VAT",
    notes: "Notes",
    footer: (id: string, dueDate: string) =>
      `Due date: ${dueDate}. Please pay to our IBAN quoting reference ${id}.`,
  },
};

async function loadPng(): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const res = await fetch("/leaf.png");
    const blob = await res.blob();
    const base64 = await new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.readAsDataURL(blob);
    });
    // Get natural dimensions via an Image element
    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.src = base64;
    });
    return { data: base64, ...dims };
  } catch {
    return null;
  }
}

async function buildPdf(doc: Document, COMPANY: CompanySettings): Promise<jsPDF> {
  const lang = doc.lang === "nl" ? T.nl : T.en;
  const { sub, tax, total } = calcTotals(doc.items, doc.btwRate);
  const fmt = (n: number) => `\u20AC ${n.toFixed(2)}`;

  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const M = 20;
  const PAGE_H = 297;
  const PAGE_CONTENT_TOP = 55;
  const FOOTER_SAFE_TOP = 268;
  const CONTENT_BOTTOM = FOOTER_SAFE_TOP - 4;
  const footerTemplate = (COMPANY.footerText?.trim() || lang.footer(doc.id, doc.dueDate))
    .replace("binnen 14 dagen", "uiterlijk op {dueDate}")
    .replace("within 14 days", "by {dueDate}");
  const footerText = footerTemplate
    .replaceAll("{id}", doc.id)
    .replaceAll("{dueDate}", doc.dueDate);
  const rawWebsite = COMPANY.website?.trim() || "";
  const legalUrl = rawWebsite
    ? (/^https?:\/\//i.test(rawWebsite) ? rawWebsite : `https://${rawWebsite}`)
    : "";
  const legalLabel = legalUrl ? `Juridische voorwaarden: ${legalUrl}` : "";

  const logo = await loadPng();

  // ── Doc title (top-left) ─────────────────────────────────────
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(20);
  pdf.setTextColor(...DARK);
  pdf.text(lang.docTitle(doc.type), M, 18);

  // ── Logo (top-right, correct aspect ratio) ───────────────────
  if (logo) {
    const logoH = 40; // desired height in mm
    const logoW = (logo.w / logo.h) * logoH;
    pdf.addImage(logo.data, "PNG", W - M - logoW, 6, logoW, logoH);
  } else {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.setTextColor(...TEAL);
    pdf.text("LEAFYLINES", W - M, 18, { align: "right" });
  }

  // ── Company address (left, below title) ──────────────────────
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...MID);
  [COMPANY.name, COMPANY.address, COMPANY.city, COMPANY.country].forEach((line, i) => {
    pdf.text(line, M, 30 + i * 5);
  });

  // ── Client block (left) ──────────────────────────────────────
  const blockY = 60;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(...DARK);
  pdf.text(doc.client, M, blockY);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...MID);
  [doc.clientName, doc.clientCountry, doc.clientAddress, doc.clientCity].forEach((line, i) => {
    if (line) pdf.text(line, M, blockY + 6 + i * 5);
  });

  // ── Contact block (right) ────────────────────────────────────
  const cx = W / 2 + 5;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(...DARK);
  pdf.text(doc.contact, cx, blockY);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...BLUE);
  pdf.text(doc.contactEmail || COMPANY.email, cx, blockY + 6);
  pdf.setTextColor(...MID);
  pdf.text(doc.phone, cx, blockY + 11);

  // ── Meta: Datum + Factuurnummer (left) | KvK/BTW/IBAN (right) 
  const metaY = 90;
  const metaLeft: [string, string][] = [
    [lang.date + ":", doc.date],
    [lang.number(doc.type) + ":", doc.id],
  ];
  const metaRight: [string, string][] = [
    [lang.kvk + ":", COMPANY.kvk],
    [lang.btwLabel + ":", COMPANY.btw],
    [lang.iban + ":", COMPANY.iban],
  ];

  metaLeft.forEach(([label, val], i) => {
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(9); pdf.setTextColor(...DARK);
    pdf.text(label, M, metaY + i * 6);
    pdf.setFont("helvetica", "normal"); pdf.setTextColor(...MID);
    pdf.text(val, M + 38, metaY + i * 6);
  });

  metaRight.forEach(([label, val], i) => {
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(9); pdf.setTextColor(...DARK);
    pdf.text(label, cx, metaY + i * 6);
    pdf.setFont("helvetica", "normal"); pdf.setTextColor(...MID);
    pdf.text(val, W - M, metaY + i * 6, { align: "right" });
  });

  // ── Items table (only rows with actual data) ─────────────────
  const filledRows = doc.items
    .filter((item) => {
      const hasProduct = item.product.trim().length > 0;
      const hasDescription = item.description.trim().length > 0;
      const quantity = Number(item.quantity ?? 1);
      const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
      const hasAmount = (item.price || 0) * safeQuantity !== 0;
      return hasProduct || hasDescription || hasAmount;
    })
    .map((item) => [
    item.product,
    item.description,
    fmt(item.price),
    fmt((item.price || 0) * Number(item.quantity ?? 1)),
  ]);

  autoTable(pdf, {
    startY: metaY + 20,
    head: [[lang.product, lang.desc, lang.price, lang.total]],
    body: filledRows,
    foot: [["", "", "", fmt(sub)]],
    headStyles: {
      fillColor: [...BLUE],
      textColor: [...WHITE],
      fontSize: 9,
      fontStyle: "bold",
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [...MID],
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
      lineColor: [...LGRAY],
      lineWidth: 0.1,
    },
    footStyles: {
      fillColor: [...BLUE],
      textColor: [...WHITE],
      fontSize: 9,
      fontStyle: "bold",
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
      halign: "right",
    },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: "auto" },
      2: { cellWidth: 26, halign: "right" },
      3: { cellWidth: 28, halign: "right" },
    },
    showFoot: "lastPage",
    margin: { left: M, right: M, top: PAGE_CONTENT_TOP, bottom: PAGE_H - CONTENT_BOTTOM },
  });

  const finalTableY = (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? metaY + 20;
  const rawNoteRows = doc.notes
    ? doc.notes.split("\n").map((line) => line.trim()).filter(Boolean)
    : [];
  const noteRows = rawNoteRows.map((line) => ({
    type: line.startsWith("## ") ? "header" as const : "text" as const,
    value: line.startsWith("## ") ? line.slice(3).trim() : line,
  })).filter((row) => row.value.length > 0);
  const noteLineHeight = 4;
  const notesHeadingHeight = noteRows.length > 0 ? 6 : 0;
  const notesBodyHeight = noteRows.reduce((height, row) => {
    const wrapped = pdf.splitTextToSize(row.value, W - 2 * M);
    return height + wrapped.length * noteLineHeight + (row.type === "header" ? 1.5 : 0);
  }, 0);
  const notesHeight = noteRows.length > 0 ? notesHeadingHeight + notesBodyHeight + 4 : 0;
  const legalLines = COMPANY.signatureLegalText ? pdf.splitTextToSize(COMPANY.signatureLegalText, W - 2 * M) : [];
  const legalHeight = legalLines.length > 0 ? legalLines.length * 4 + 4 : 0;
  const signatureBlockHeight = doc.type === "factuur" && doc.signaturesEnabled ? legalHeight + 24 : 0;
  const footerLines = pdf.splitTextToSize(footerText, W - 2 * M);
  const totalsBlockHeight = 18; // 2 rows + incl row

  let contentY = finalTableY + 5;
  // Keep totals directly under table when possible, otherwise move only totals.
  if (contentY + totalsBlockHeight > CONTENT_BOTTOM) {
    pdf.addPage();
    contentY = PAGE_CONTENT_TOP;
  }

  // ── Totals ────────────────────────────────────────────────────
  const tY = contentY;
  const lx = W - M - 50;
  const rx = W - M;

  const rows: [string, string][] = [
    [lang.btwPct, `${doc.btwRate}%`],
    [lang.btwEur, fmt(tax)],
  ];
  rows.forEach(([label, val], i) => {
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(...GRAY);
    pdf.text(label, lx, tY + i * 5.5);
    pdf.text(val, rx, tY + i * 5.5, { align: "right" });
  });

  const inclY = tY + rows.length * 5.5 + 1;
  pdf.setDrawColor(...LGRAY);
  pdf.line(lx, inclY, rx, inclY);
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(9); pdf.setTextColor(...DARK);
  pdf.text(lang.incl, lx, inclY + 5);
  pdf.text(fmt(total), rx, inclY + 5, { align: "right" });

  // ── Notes ─────────────────────────────────────────────────────
  let flowY = inclY + 14;
  if (noteRows.length > 0) {
    if (flowY + notesHeight > CONTENT_BOTTOM) {
      pdf.addPage();
      flowY = PAGE_CONTENT_TOP;
    }
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(...DARK);
    pdf.text(lang.notes, M, flowY);
    let noteY = flowY + notesHeadingHeight;
    for (const row of noteRows) {
      const wrapped = pdf.splitTextToSize(row.value, W - 2 * M);
      pdf.setFont("helvetica", row.type === "header" ? "bold" : "normal");
      pdf.setFontSize(row.type === "header" ? 8.5 : 8);
      pdf.setTextColor(...GRAY);
      pdf.text(wrapped, M, noteY, { maxWidth: W - 2 * M });
      noteY += wrapped.length * noteLineHeight + (row.type === "header" ? 1.5 : 0);
    }
    flowY += notesHeight + 3;
  }

  // ── Signature lines (optional for invoices) ───────────────────
  if (doc.type === "factuur" && doc.signaturesEnabled) {
    if (flowY + signatureBlockHeight > CONTENT_BOTTOM) {
      pdf.addPage();
      flowY = PAGE_CONTENT_TOP;
    }
    if (legalLines.length > 0) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(...GRAY);
      pdf.text(legalLines, M, flowY, { maxWidth: W - 2 * M });
      flowY += legalHeight + 2;
    }
    const leftX1 = M;
    const leftX2 = W / 2 - 10;
    const rightX1 = W / 2 + 10;
    const rightX2 = W - M;
    const lineY = flowY + 10;
    pdf.setDrawColor(...LGRAY);
    pdf.line(leftX1, lineY, leftX2, lineY);
    pdf.line(rightX1, lineY, rightX2, lineY);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...GRAY);
    pdf.text("Handtekening LeafyLines", leftX1, lineY + 4);
    pdf.text(doc.payerSignatureLabel || "Handtekening klant", rightX1, lineY + 4);
    flowY = lineY + 8;
  }

  // ── Header + Footer on every page ─────────────────────────────
  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    pdf.setPage(page);
    // Header title
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(20);
    pdf.setTextColor(...DARK);
    pdf.text(lang.docTitle(doc.type), M, 18);
    // Header logo
    if (logo) {
      const logoH = 40;
      const logoW = (logo.w / logo.h) * logoH;
      pdf.addImage(logo.data, "PNG", W - M - logoW, 6, logoW, logoH);
    } else {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.setTextColor(...TEAL);
      pdf.text("LEAFYLINES", W - M, 18, { align: "right" });
    }
    // Footer
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...GRAY);
    pdf.text(footerLines, W / 2, 279, { align: "center", maxWidth: W - 2 * M });
    if (legalLabel) {
      pdf.setTextColor(...BLUE);
      const legalY = 286;
      const labelWidth = pdf.getTextWidth(legalLabel);
      const startX = (W - labelWidth) / 2;
      // Add clickable legal link on every page footer.
      pdf.textWithLink(legalLabel, startX, legalY, { url: legalUrl });
    }
  }

  return pdf;
}

export async function generatePdfBlobUrl(doc: Document, COMPANY: CompanySettings, signature?: string): Promise<string> {
  const blob = await generatePdfBlob(doc, COMPANY, signature);
  return URL.createObjectURL(blob);
}

export async function generatePdfBlob(doc: Document, COMPANY: CompanySettings, signature?: string): Promise<Blob> {
  void signature;
  const pdf = await buildPdf(doc, COMPANY);
  return pdf.output("blob");
}

export async function generatePdf(doc: Document, COMPANY: CompanySettings, signature?: string) {
  void signature;
  const pdf = await buildPdf(doc, COMPANY);
  pdf.save(`${doc.id}.pdf`);
}