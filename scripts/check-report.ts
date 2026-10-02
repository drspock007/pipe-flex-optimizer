import {APP_VERSION} from '../src/lib/app-version';
// Reproduce the V2-13 report with the same engine, text builders and PDF renderer as the UI.
// Run: bun run scripts/check-report.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { DEFAULT_INPUTS } from '../src/lib/v2-app/inputs';
import { derive, toLengthRestrainedInput, toFixedInput } from '../src/lib/v2-app/bridge';
import { searchMinSupportsRestrained, solveGroundFixedLength, type RestrainedLengthResult } from '../src/lib/mechanics-v2';
import { groundMinRows, describeGroundMin, GROUND_MIN_LIMITS } from '../src/lib/v2-app/ground-min-text';
import { restrainedLengthRows, RESTRAINED_LENGTH_LIMITS } from '../src/lib/v2-app/restrained-length-text';
import { createReportPdf } from '../src/lib/pdf/report-pdf';
import { toDisplay, unitLabel } from '../src/lib/unit-conversions';
import type { V2Report } from '../src/lib/pdf/report-types';
const inputs = { ...DEFAULT_INPUTS, mode: 'minSupports' as const, axialMode: 'restrained' as const,
  groundEnabled: true, groundContactZ: 0, searchLmin: 3, searchLmax: 120, maxSupports: 5,
  h: 300, hl: 50, allowablePercent: 40, coatingType: 'yellowJacket' };
const derived = derive(inputs);
const result = searchMinSupportsRestrained(toLengthRestrainedInput(inputs), 5);
if (result.status !== 'found') throw new Error(`Search: ${result.status}`);
const { L, n } = result.candidate;
const solution = solveGroundFixedLength({ ...toFixedInput(inputs, L, n), groundZ: 0 });
if (solution.status !== 'ok') throw new Error(`Solve: ${solution.status}`);
if (n !== 1 || result.minimality.certified || Math.abs(L - 28780.41084) > 0.1
  || Math.abs(solution.axial!.combinedMax - 99.548489) > 0.001) throw new Error('Reference candidate changed');
mkdirSync('output/pdf', { recursive: true });
for (const system of ['SI', 'Imperial'] as const) {
  const fmt = (mm: number) => `${toDisplay(mm / 1000, 'm', system).toFixed(3)} ${unitLabel('m', system)}`;
  const fmtS = (mpa: number) => `${toDisplay(mpa, 'MPa', system).toFixed(2)} ${unitLabel('MPa', system)}`;
  const report: V2Report = { appVersion:APP_VERSION, key: 'v2-13-reproduction', inputs, derived, solution, ranges: [],
    searchStatus: describeGroundMin(result).title,
    searchNotes: [...groundMinRows(result, fmt, fmtS), ['Support-count search method and limits', GROUND_MIN_LIMITS],
      ...restrainedLengthRows(result.candidate.search as RestrainedLengthResult, fmt, fmtS).map(([a,b]) => [`Candidate length search: ${a}`, b] as [string,string]),
      ['Length search method and limits', RESTRAINED_LENGTH_LIMITS]] };
  const doc = createReportPdf(report, { preparedBy: 'Validation Codex', projectName: `V2-13 controle ${system}`, date: new Date(), system });
  writeFileSync(`output/pdf/v2-13-${system}.pdf`, Buffer.from(doc.output('arraybuffer')));
  console.log(system, doc.getNumberOfPages(), 'pages');
}
console.log({ L, n, combined: solution.axial!.combinedMax, q: derived.q });
