import { describe, expect, it } from "vitest";
import { solveGroundFixedLength } from "..";

// Inspect the numbers directly: JSON serialization would hide Infinity as null.
function expectFinite(value: unknown): void {
  if (typeof value === "number") expect(Number.isFinite(value)).toBe(true);
  else if (value && typeof value === "object") Object.values(value).forEach(expectFinite);
}

describe.each(["free", "restrained"] as const)("flat finite output (%s)", (axialMode) => {
  const input = { L: 1e308, hv: 0, hl: 0, groundZ: 0, q: 1e-308,
    E: 1, I: 1, A: 1, c: 1, sigmaAllow: 1, numSupports: 20, axialMode };

  it("avoids intermediate coordinate overflow and preserves every span", () => {
    const r = solveGroundFixedLength(input);
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expectFinite(r);
    expect(r.ground?.method).toBe("analytical-full-contact");
    expect(r.nodes.at(-1)?.x).toBe(input.L);
    expect(r.members).toHaveLength(21);
    expect(r.members.every((m) => m.length > 0)).toBe(true);
    expect(r.ground?.totalReaction).toBeCloseTo(1, 14);
  });

  it.each([
    { q: 1e-307 }, // finite total load, unrepresentable moment scale
    { E: 1e308, I: 2 }, // unrepresentable rigidity
    { L: Number.MIN_VALUE, q: 0 }, // spans collapse through underflow
  ])("fails explicitly when derived values cannot be represented: %o", (override) => {
    const r = solveGroundFixedLength({ ...input, ...override });
    expect(r.status).toBe("numerical-failure");
  });
});
