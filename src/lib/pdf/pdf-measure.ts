// créé par Giovanni Malagnino, 2026-09-25 21:15 CEST (Europe/Rome, UTC+2)
// Dry-run of one table in a scratch document to detect an orphan last row.

import { jsPDF } from "jspdf";
import autoTable, { UserOptions } from "jspdf-autotable";

/** Number of body rows that would land on the last page when drawn at startY (Infinity if no split). */
export function rowsOnLastPage(opts: UserOptions): number {
  const scratch = new jsPDF({ unit: "mm", format: "a4" });
  const pageOfRow = new Map<number, number>();
  autoTable(scratch, {
    ...opts,
    didDrawCell: (d) => { if (d.section === "body") pageOfRow.set(d.row.index, scratch.getNumberOfPages()); },
  });
  const pages = scratch.getNumberOfPages();
  if (pages === 1) return Infinity;
  return [...pageOfRow.values()].filter((p) => p === pages).length;
}
