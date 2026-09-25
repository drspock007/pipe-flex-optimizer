// créé par Giovanni Malagnino, 2026-09-25 21:05 CEST (Europe/Rome, UTC+2)
// V2-5-R1: mesh independence, closed-form partial contact, hl independence,
// round-off budget and non-finite guards of the ground branch.

import { describe, expect, it } from "vitest";
import { BiaxialSuccess, GroundInput, GroundLimits, solveGroundFixedLength } from "..";
import { REF, rel } from "./helpers";

const IN: GroundInput = { ...REF, hv: 1000, hl: 0, groundZ: 0, numSupports: 0 };
const ok = (over: Partial<GroundInput> = {}, lim: GroundLimits = {}): BiaxialSuccess => {
  const r = solveGroundFixedLength({ ...IN, ...over }, lim);
  if (r.status !== "ok") throw new Error(`status ${r.status}`);
  return r;
};

// Closed form (no intermediate support, groundZ = 0, hl = 0): lifted length ell.
const EI = IN.E * IN.I, q = IN.q, L = IN.L;
const ell = (72 * EI * IN.hv / q) ** 0.25;
const xD = L - ell;
const zRef = (x: number) => (x <= xD ? 0 : (q * (x - xD) ** 3 * (4 * ell - 3 * (x - xD))) / (72 * EI));
const sigmaRef = (q * ell * ell * IN.c) / (6 * IN.I);
// Continuous contact: distributed q(L-ell) + concentrated q*ell/3 at lift-off.
// The discrete model splits it between the left clamp (which lies on the ground)
// and the nodal ground forces, so the comparison uses contactTotal (= both).
const reactRef = q * (L - ell) + (q * ell) / 3;
const forceScale = q * L;

describe("ground contact R1", () => {
  it("reference values of the closed form", () => {
    expect(Math.abs(xD - 6821.251134)).toBeLessThan(1e-3);
    expect(Math.abs(sigmaRef - 268.062951678)).toBeLessThan(1e-6);
    expect(Math.abs(reactRef - 2294.149225)).toBeLessThan(1e-3);
  });

  it("matches the closed form: stress, shape, lift-off, reactions, balance", () => {
    const r = ok();
    expect(rel(r.maxStress, sigmaRef)).toBeLessThan(1e-3);
    expect(Math.abs(r.ground!.contactTotal - reactRef)).toBeLessThanOrEqual(1e-3 * forceScale);
    const dispScale = IN.hv;
    r.nodes.forEach((n) => expect(Math.abs(n.z - zRef(n.x))).toBeLessThan(1e-3 * dispScale));
    const zones = r.ground!.contactZones;
    expect(Math.abs(zones[zones.length - 1].xEnd - xD)).toBeLessThan(0.01 * L);
    // All forces: contact (incl. left clamp) + right clamp = q L.
    expect(Math.abs(r.ground!.contactTotal + r.endReactions.right.force - q * L)).toBeLessThan(1e-6 * forceScale);
    expect(Math.abs(r.endReactions.right.force - (2 * q * ell) / 3)).toBeLessThanOrEqual(1e-3 * forceScale);
  });

  it("result does not depend on the initial mesh (or is explicitly incomplete)", () => {
    const outs = [64, 128, 256, 512, 1024].map((m) => solveGroundFixedLength(IN, { minElements: m }));
    const good = outs.filter((o): o is BiaxialSuccess => o.status === "ok");
    expect(good.length).toBeGreaterThanOrEqual(2);
    outs.forEach((o) => expect(["ok", "incomplete"]).toContain(o.status));
    for (const a of good) for (const b of good) {
      expect(Math.abs(a.ground!.contactTotal - b.ground!.contactTotal)).toBeLessThanOrEqual(1e-3 * forceScale);
      expect(Math.abs(a.maxStress - b.maxStress)).toBeLessThanOrEqual(1e-3 * sigmaRef);
    }
  });

  it("vertical response is independent of hl", () => {
    const a = ok(), b = ok({ hl: 100000 });
    expect(Math.abs(a.ground!.contactTotal - b.ground!.contactTotal)).toBeLessThanOrEqual(1e-9 * forceScale);
    expect(a.nodes.length).toBe(b.nodes.length);
    a.nodes.forEach((n, i) => expect(Math.abs(n.z - b.nodes[i].z)).toBeLessThan(1e-9 * IN.hv));
    expect(Math.abs(b.ground!.contactTotal - reactRef)).toBeLessThanOrEqual(1e-3 * forceScale);
  });

  it("round-off never accepts residuals above the mechanical budget", () => {
    const r = ok();
    const d = r.diagnostics;
    expect(r.ground!.precisionLoss).toBe(false);
    (Object.keys(d.residuals) as (keyof typeof d.residuals)[]).forEach((k) => expect(d.residuals[k]).toBeLessThanOrEqual(d.residualTolerances[k]));
    const fine = solveGroundFixedLength(IN, { minElements: 2048 });
    expect(fine.status).toBe("incomplete");
  });

  it("never publishes non-finite results", () => {
    for (const over of [{ hl: 1e300 }, { hv: 1e300 }, { q: 1e300 }, { E: 1e-300 }] as Partial<GroundInput>[]) {
      const r = solveGroundFixedLength({ ...IN, ...over });
      if (r.status === "ok") {
        expect(Number.isFinite(r.maxStress)).toBe(true);
        expect(r.nodes.every((n) => Number.isFinite(n.z))).toBe(true);
        expect(Number.isFinite(r.ground!.contactTotal)).toBe(true);
      }
    }
  });
});
