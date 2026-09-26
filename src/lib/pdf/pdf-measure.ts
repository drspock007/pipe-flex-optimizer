// créé par Giovanni Malagnino, 2026-09-25 21:15 CEST (Europe/Rome, UTC+2)
// Measure actual wrapped rows with the same renderer used for the report.

import { jsPDF } from "jspdf";
import autoTable, { UserOptions } from "jspdf-autotable";

export function measureTable(opts: UserOptions): { pages: number; lastPageRows: number; firstRowPage: number } {
  const scratch = new jsPDF({ unit: "mm", format: "a4" });
  const pageOfRow = new Map<number, number>();
  autoTable(scratch, {
    ...opts,
    didDrawCell: (d) => { if (d.section === "body") pageOfRow.set(d.row.index, scratch.getNumberOfPages()); },
  });
  const pages = scratch.getNumberOfPages(), firstRowPage = pageOfRow.get(0) ?? 1;
  if (pages === 1) return { pages, lastPageRows: pageOfRow.size, firstRowPage };
  return { pages, lastPageRows: [...pageOfRow.values()].filter((p) => p === pages).length, firstRowPage };
}

/** Each continuation starts on a fresh page. Only move a whole table to avoid a
 * widow if it actually fits there; otherwise carry its final two rows together. */
export function planTable(opts: UserOptions, top: number, keepTogetherRows: number): { newPage: boolean; parts: UserOptions[] } {
  const body = opts.body ?? [];
  if (!body.length) return { newPage: false, parts: [opts] };
  const current = measureTable(opts);
  if (current.pages === 1) return { newPage: false, parts: [opts] };
  const fresh = { ...opts, startY: top };
  const onFreshPage = measureTable(fresh);
  const newPage = Number(opts.startY) > top && (current.firstRowPage > 1
    || (onFreshPage.pages === 1 && (body.length <= keepTogetherRows || current.lastPageRows === 1)));
  const first = newPage ? fresh : opts;
  const layout = newPage ? onFreshPage : current;
  if (layout.pages > 1 && layout.lastPageRows === 1 && body.length > 2) {
    const tail = { ...fresh, body: body.slice(-2) };
    if (measureTable(tail).pages === 1) {
      return { newPage, parts: [{ ...first, body: body.slice(0, -2) }, tail] };
    }
  }
  return { newPage, parts: [first] };
}
