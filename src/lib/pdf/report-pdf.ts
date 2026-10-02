import {currentPdfPalette, LIGHT_PDF, themePages, finishPdfPages, type PdfPalette} from './theme';
import {addSignature} from './signature';
import {requireReportIdentity} from './identity';
// Modifié par Giovanni malagnino, 2026-09-25 01:43 CEST (Europe/Rome, UTC+2)
// PDF report generation for pipe lowering analysis results.

import { jsPDF } from "jspdf";
import autoTable, { UserOptions } from "jspdf-autotable";
import { planTable } from "./pdf-measure";
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


/** Space reserved at the bottom of every page for the footer (mm). */
const FOOTER_SPACE = 37;
const TOP_MARGIN = 22;
/** Keep short sections together when their wrapped rows fit on a fresh page. */
const KEEP_TOGETHER_ROWS = 8;

export const createReportPdf = (
  report: V2Report,
  meta: ReportMeta,
  palette: PdfPalette = LIGHT_PDF,
): jsPDF => {
  meta = {...meta,...requireReportIdentity(meta)};
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  themePages(doc, palette);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("Pipe Lowering Analysis Report", 16, 26);

  // Meta block
  doc.setTextColor(...palette.foreground);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  let cursorY = 34;
  for (const text of [`Project: ${meta.projectName}`, `Prepared by: ${meta.preparedBy}`, `Exported: ${meta.date.toLocaleString()} | ${Intl.DateTimeFormat().resolvedOptions().timeZone}`, `Unit system: ${meta.system === "SI" ? "SI (metric)" : "Imperial"}`]) {
    const lines=doc.splitTextToSize(text,178);
    doc.text(lines,16,cursorY);cursorY+=lines.length*5+1;
  }
  cursorY+=1;
  for (const section of buildSections(report.inputs, report.derived, report, meta.system)) {
    const opts: UserOptions = {
      startY: cursorY,
      head: [[section.title, ""]],
      body: section.rows,
      theme: "plain",
      styles: { fontSize: 9, cellPadding: 1.25, textColor: palette.foreground, fillColor: palette.background, lineColor: palette.border },
      alternateRowStyles: { fillColor: palette.card },
      headStyles: { fillColor: palette.primary, textColor: palette.primaryText, fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 90 }, 1: { halign: "right" } },
      margin: { left: 16, right: 16, top: TOP_MARGIN, bottom: FOOTER_SPACE },
      rowPageBreak: "avoid",
    };
    const plan = planTable(opts, TOP_MARGIN, KEEP_TOGETHER_ROWS);
    if (plan.newPage) doc.addPage();
    for (const [index, part] of plan.parts.entries()) {
      if (index > 0) doc.addPage();
      autoTable(doc, part);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cursorY = (doc as any).lastAutoTable.finalY + 6;
  }

  addSignature(doc,cursorY,palette);

  finishPdfPages(doc,palette,report.appVersion,
    'GMC | Pipe lowering | Qualified engineering verification required','Complete');

  return doc;
};

export const generateReportPdf = (report: V2Report, meta: ReportMeta): string => {
  const doc = createReportPdf(report, meta, currentPdfPalette());
  const fileName = buildPdfFileName('pipe-lowering',meta.preparedBy,meta.date);
  doc.save(`${fileName}.pdf`);
  return fileName;
};
