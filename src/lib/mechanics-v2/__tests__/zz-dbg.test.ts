import { it } from "vitest";
import { searchHeightGround, searchHeightFixedSupports } from "..";
import { REF } from "./helpers";
const { hv: _hv, numSupports: _n, ...BASE } = REF;
it("dbg", () => {
  const ng: any = searchHeightFixedSupports(BASE, 0);
  const r: any = searchHeightGround({ ...BASE, groundZ: -1e5 }, 0);
  console.log("DBG_NG", ng.extremes, "DBG_G", r.status, JSON.stringify(r.ranges), JSON.stringify(r.zones), r.diagnostics.evaluations);
  let t = performance.now();
  const r2: any = searchHeightGround({ ...BASE, groundZ: 0 }, 20);
  console.log("DBG_20", r2.status, JSON.stringify(r2.ranges), JSON.stringify(r2.zones).slice(0,300), r2.diagnostics.evaluations, performance.now() - t);
}, 60000);
