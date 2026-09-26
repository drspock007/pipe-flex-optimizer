import { it } from "vitest";
import { writeFileSync } from "fs";
import { REF } from "./helpers";
import { solveGroundFixedLength } from "../ground-solve";
it("fixed", { timeout: 500000 }, () => {
  const { L: _L, numSupports: _n, ...B } = REF, out: any = {};
  for (const [n, hv] of [[0,1000],[0,2500],[3,2500],[8,2500],[20,2500]] as const) {
    const k = `n${n}_hv${hv}`; out[k] = [];
    for (let i = 0; i <= 64; i++) { const L = 7500 * Math.pow(16, i / 64);
      const r: any = solveGroundFixedLength({ ...B, L, hv, numSupports: n, groundZ: 0 });
      out[k].push({ L, st: r.status === "ok" && !r.numericalValid ? "invalid" : r.status, m: r.ground?.method, cause: r.cause, s: r.maxStress, gt: r.ground?.contactTotal, cn: r.ground?.contactNodes }); }
    const c: any = {}; out[k].forEach((x: any) => { const t = x.st + (x.cause ? ":" + x.cause : ""); c[t] = (c[t] || 0) + 1; });
    console.log("SUMMARY", k, JSON.stringify(c));
  }
  writeFileSync(process.env.OUT || "/tmp/r1/out.json", JSON.stringify(out));
});
