// Modifié par Giovanni malagnino, 2026-09-25 01:43 CEST (Europe/Rome, UTC+2)
// PDF report generation for pipe lowering analysis results.

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { V2Report } from "./report-types";
import { UnitSystem } from "@/lib/unit-conversions";
import { buildSections } from "./pdf-sections";
import { buildPdfFileName } from "./file-name";

export interface ReportMeta {
  preparedBy: string;
  projectName: string;
  date: Date;
  system: UnitSystem;
}

const ORANGE: [number, number, number] = [255, 142, 4];

/** Space reserved at the bottom of every page for the footer (mm). */
const FOOTER_SPACE = 20;
const TOP_MARGIN = 20;
/** Sections up to this many rows are never split across pages. */
const KEEP_TOGETHER_ROWS = 8;
const ROW_H = 6.2;

export const generateReportPdf = (
  report: V2Report,
  meta: ReportMeta,
): string => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header band
  doc.setFillColor(...ORANGE);
  doc.rect(0, 0, pageWidth, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Pipe Lowering Analysis Report", 14, 12);

  // Meta block
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Project: ${meta.projectName}`, 14, 27);
  doc.text(`Prepared by: ${meta.preparedBy}`, 14, 33);
  doc.text(`Date: ${meta.date.toLocaleString()}`, 14, 39);
  doc.text(`Unit system: ${meta.system === "SI" ? "SI (metric)" : "Imperial"}`, 14, 45);

  let cursorY = 52;
  for (const section of buildSections(report.inputs, report.derived, report, meta.system)) {
    const estimated = (section.rows.length + 1) * ROW_H;
    if (section.rows.length <= KEEP_TOGETHER_ROWS && cursorY + estimated > pageHeight - FOOTER_SPACE) {
      doc.addPage();
      cursorY = TOP_MARGIN;
    }
    autoTable(doc, {
      startY: cursorY,
      head: [[section.title, ""]],
      body: section.rows,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 1.8 },
      headStyles: { fillColor: ORANGE, textColor: 255, fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 90 }, 1: { halign: "right" } },
      margin: { left: 14, right: 14, top: TOP_MARGIN, bottom: FOOTER_SPACE },
      rowPageBreak: "avoid",
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cursorY = (doc as any).lastAutoTable.finalY + 6;
  }

  // Footer with disclaimer and page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const h = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(
      "Engineering disclaimer: results are indicative and must be verified by a qualified engineer.",
      14,
      h - 10,
    );
    doc.text(`Page ${i} / ${pageCount}`, pageWidth - 14, h - 10, { align: "right" });
  }

  const fileName = buildPdfFileName(meta.projectName, meta.date);
  doc.save(`${fileName}.pdf`);
  return fileName;
};
