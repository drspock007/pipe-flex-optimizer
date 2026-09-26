// créé par Giovanni Malagnino, 2026-09-25 21:15 CEST (Europe/Rome, UTC+2)
// Dry-run of one table in a scratch document to detect an orphan last row.

import { jsPDF } from "jspdf";
import autoTable, { UserOptions } from "jspdf-autotable";

/** Number of body rows that would land on the last page when drawn at startY (Infinity if no split). */
export function rowsOnLastPage(opts: UserOptions): number {
  return measureTable(opts).lastPageRows;
}

/** True when the title would stay alone at the bottom of the start page (first real row,
 *  wrapped lines included, pushed to the next page). */
export function headAlone(opts: UserOptions): boolean {
  return measureTable(opts).firstRowPage > 1;
}

function measureTable(opts: UserOptions): { lastPageRows: number; firstRowPage: number } {
  const scratch = new jsPDF({ unit: "mm", format: "a4" });
  const pageOfRow = new Map<number, number>();
  autoTable(scratch, {
    ...opts,
    didDrawCell: (d) => { if (d.section === "body") pageOfRow.set(d.row.index, scratch.getNumberOfPages()); },
  });
  const pages = scratch.getNumberOfPages(), firstRowPage = pageOfRow.get(0) ?? 1;
  if (pages === 1) return { lastPageRows: Infinity, firstRowPage };
  return { lastPageRows: [...pageOfRow.values()].filter((p) => p === pages).length, firstRowPage };
}
