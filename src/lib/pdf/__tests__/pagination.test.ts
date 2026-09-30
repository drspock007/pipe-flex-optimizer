import { describe, expect, it } from "vitest";
import { UserOptions } from "jspdf-autotable";
import { measureTable, planTable } from "../pdf-measure";

const options = (count: number, startY = 52): UserOptions => ({
  startY, head: [["Results summary", ""]],
  body: Array.from({ length: count }, (_, i) => [`Diagnostic ${i}`, "Value"]),
  theme: "grid", styles: { fontSize: 9, cellPadding: 1.8 },
  columnStyles: { 0: { cellWidth: 90 }, 1: { halign: "right" } },
  margin: { left: 14, right: 14, top: 20, bottom: 20 }, rowPageBreak: "avoid",
});

describe("report table pagination", () => {
  it("starts an oversized table on page one and carries two final rows together", () => {
    const opts = Array.from({ length: 50 }, (_, i) => options(i + 60))
      .find((o) => measureTable(o).lastPageRows === 1)!;
    expect(opts).toBeDefined();
    expect(measureTable({ ...opts, startY: 20 }).pages).toBeGreaterThan(1);
    const plan = planTable(opts, 20, 8);
    expect(plan.newPage).toBe(false);
    expect(plan.parts[0].startY).toBe(52);
    expect(measureTable(plan.parts[0]).firstRowPage).toBe(1);
    expect(plan.parts).toHaveLength(2);
    expect(plan.parts[1].body).toHaveLength(2);
    expect(measureTable(plan.parts[1]).pages).toBe(1);
    expect(plan.parts.flatMap((p) => p.body!)).toEqual(opts.body);
  });

  it("moves a short table only when it fits on a fresh page", () => {
    const plan = planTable(options(5, 260), 20, 8);
    expect(plan.newPage).toBe(true);
    expect(measureTable(plan.parts[0]).pages).toBe(1);
  });

  it("keeps the title with a wrapped first row", () => {
    const opts = options(3, 255);
    opts.body![0] = ["Long diagnostic", "Wrapped explanation. ".repeat(25)];
    expect(measureTable(opts).firstRowPage).toBeGreaterThan(1);
    const plan = planTable(opts, 20, 8);
    expect(plan.newPage).toBe(true);
    expect(measureTable(plan.parts[0]).firstRowPage).toBe(1);
  });
});
