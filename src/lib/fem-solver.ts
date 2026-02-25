// src/lib/fem-solver.ts
// Modifié par Giovanni Malagnino, 2026-02-25 16:46 UTC.
//
// 1D Euler-Bernoulli Beam FEM Solver (Stiffness Method)
// Units: mm, N, MPa throughout
//
// SIGN CONVENTION:
//   w is POSITIVE DOWNWARD
//   q (self-weight) is POSITIVE DOWNWARD
//   h_fem_mm: FEM settlement (positive = right end lower)
//   Boundary: left w=0,θ=0; right w=h_fem_mm,θ=0
//   Support elevation line: w_ref(x) = h_fem_mm · x / L
//   Contact (unilateral hoists/sidebooms):
//     - Activate if penetration: w(x_i) > w_ref(x_i) + tolW
//     - Deactivate if reaction would push downward (not possible for a hoist)
//
// Features: banded solver, adaptive mesh, unilateral active-set supports,
//           FindL window + Lopt (min stress) inside the window.

export interface SupportStatus {
  x_mm: number;
  w_fem: number; // mm
  w_ref: number; // mm
  active: boolean;
}

export interface FEMResult {
  maxStress: number; // MPa
  maxMoment: number; // N·mm
  maxMomentLocation: number; // mm from left end
  stressData: { x: number; stress: number }[]; // x in meters
  deflectionData: { x: number; w: number }[]; // x in meters, w in mm
  displacements: number[];
  nodePositions: number[]; // mm
  meshInfo: { elementsPerSpan: number; totalDofs: number; solveTimeMs: number };
  warnings: string[];
  activeSupports: number[]; // indices into candidate array
  supportStatus: SupportStatus[];
  contactIterations: number;
}

export interface EvaluateCandidateResult {
  maxStress: number;
  isSafe: boolean;
  result: FEMResult;
  contactValid: boolean;
  contactWarnings: string[];
}

// ── Guardrails ──
const MAX_SUPPORTS = 20;
const MAX_ELEMENTS_PER_SPAN = 20;
const MAX_TOTAL_DOFS = 1000;

// ── Beam element stiffness ──
function elementStiffness(EI: number, Le: number): number[][] {
  const Le2 = Le * Le;
  const Le3 = Le2 * Le;
  const k = EI / Le3;
  return [
    [12 * k, 6 * Le * k, -12 * k, 6 * Le * k],
    [6 * Le * k, 4 * Le2 * k, -6 * Le * k, 2 * Le2 * k],
    [-12 * k, -6 * Le * k, 12 * k, -6 * Le * k],
    [6 * Le * k, 2 * Le2 * k, -6 * Le * k, 4 * Le2 * k],
  ];
}

// ── Consistent load vector for UDL q (N/mm) ──
function elementLoad(q: number, Le: number): number[] {
  const qL = q * Le;
  const qL2 = qL * Le;
  return [qL / 2, qL2 / 12, qL / 2, -qL2 / 12];
}

// ── Assemble banded system ──
// Storage: bands[k][row] stores K[row, row+k] (upper triangle)
function assembleSystemBanded(
  nNodes: number,
  elements: { node1: number; node2: number; Le: number }[],
  EI: number,
  q: number,
): { bands: Float64Array[]; F: Float64Array; nDof: number; halfBw: number } {
  const nDof = nNodes * 2;
  const halfBw = 3;
  const bands: Float64Array[] = Array.from({ length: halfBw + 1 }, () => new Float64Array(nDof));
  const F = new Float64Array(nDof);

  for (const el of elements) {
    const ke = elementStiffness(EI, el.Le);
    const fe = elementLoad(q, el.Le);
    const dofs = [2 * el.node1, 2 * el.node1 + 1, 2 * el.node2, 2 * el.node2 + 1];

    for (let i = 0; i < 4; i++) {
      F[dofs[i]] += fe[i];
      for (let j = i; j < 4; j++) {
        const di = dofs[i];
        const dj = dofs[j];
        const row = Math.min(di, dj);
        const col = Math.max(di, dj);
        const band = col - row;
        if (band <= halfBw) bands[band][row] += ke[i][j];
      }
    }
  }

  return { bands, F, nDof, halfBw };
}

// ── LDLT banded solver ──
function solveBanded(bands: Float64Array[], F: Float64Array, nDof: number, halfBw: number): Float64Array {
  const d = new Float64Array(nDof);
  const L: Float64Array[] = bands.map((b) => new Float64Array(b));
  const b = new Float64Array(F);

  for (let i = 0; i < nDof; i++) {
    let sum = L[0][i];
    for (let k = 1; k <= halfBw; k++) {
      const j = i - k;
      if (j >= 0) sum -= L[k][j] * L[k][j] * d[j];
    }
    d[i] = sum;
    if (!Number.isFinite(d[i]) || Math.abs(d[i]) < 1e-30) d[i] = 1e-30;

    for (let k = 1; k <= halfBw; k++) {
      const row = i + k;
      if (row >= nDof) break;
      let s = L[k][i];
      for (let m = 1; m <= halfBw; m++) {
        const j = i - m;
        if (j < 0) break;
        const ki = i - j;
        const krow = row - j;
        if (krow > halfBw || krow <= 0) continue;
        s -= L[ki][j] * L[krow][j] * d[j];
      }
      L[k][i] = s / d[i];
    }
  }

  // Forward: L*y=b
  for (let i = 0; i < nDof; i++) {
    for (let k = 1; k <= halfBw; k++) {
      const j = i - k;
      if (j >= 0) b[i] -= L[k][j] * b[j];
    }
  }
  // Diagonal: D*z=y
  for (let i = 0; i < nDof; i++) b[i] /= d[i];
  // Backward: L^T*x=z
  for (let i = nDof - 1; i >= 0; i--) {
    for (let k = 1; k <= halfBw; k++) {
      const row = i + k;
      if (row >= nDof) break;
      b[i] -= L[k][i] * b[row];
    }
  }
  return b;
}

// ── Apply BC by direct elimination ──
function applyBCBanded(
  bands: Float64Array[],
  F: Float64Array,
  nDof: number,
  halfBw: number,
  constraints: { dof: number; value: number }[],
): void {
  for (const { dof, value } of constraints) {
    for (let k = 1; k <= halfBw; k++) {
      const jUp = dof + k;
      if (jUp < nDof) {
        F[jUp] -= bands[k][dof] * value;
        bands[k][dof] = 0;
      }
      const jLo = dof - k;
      if (jLo >= 0) {
        F[jLo] -= bands[k][jLo] * value;
        bands[k][jLo] = 0;
      }
    }
    bands[0][dof] = 1;
    F[dof] = value;
  }
}

// ── Moment and deflection shape functions ──
function elementMoment(EI: number, Le: number, w1: number, t1: number, w2: number, t2: number, xi: number): number {
  const s = xi / Le;
  const L2 = Le * Le;
  const N1pp = (-6 + 12 * s) / L2;
  const N2pp = (-4 + 6 * s) / Le;
  const N3pp = (6 - 12 * s) / L2;
  const N4pp = (-2 + 6 * s) / Le;
  return EI * (N1pp * w1 + N2pp * t1 + N3pp * w2 + N4pp * t2);
}

function elementDeflection(Le: number, w1: number, t1: number, w2: number, t2: number, xi: number): number {
  const s = xi / Le;
  const s2 = s * s;
  const s3 = s2 * s;
  const N1 = 1 - 3 * s2 + 2 * s3;
  const N2 = xi * (1 - s) * (1 - s);
  const N3 = 3 * s2 - 2 * s3;
  const N4 = xi * s * (s - 1);
  return N1 * w1 + N2 * t1 + N3 * w2 + N4 * t2;
}

// ── Interpolate w(x) from FEM U ──
function interpolateDeflection(nodeX: number[], U: number[] | Float64Array, x_mm: number): number {
  const nNodes = nodeX.length;
  for (let i = 0; i < nNodes - 1; i++) {
    const x1 = nodeX[i];
    const x2 = nodeX[i + 1];
    if (x_mm >= x1 - 0.01 && x_mm <= x2 + 0.01) {
      const Le = x2 - x1;
      const xi = Math.max(0, Math.min(Le, x_mm - x1));
      const w1 = U[2 * i] as number,
        t1 = U[2 * i + 1] as number;
      const w2 = U[2 * (i + 1)] as number,
        t2 = U[2 * (i + 1) + 1] as number;
      return elementDeflection(Le, w1, t1, w2, t2, xi);
    }
  }
  if (x_mm <= nodeX[0]) return U[0] as number;
  return U[2 * (nNodes - 1)] as number;
}

// ── Mesh builder ──
function buildMesh(
  supportPositions_mm: number[],
  L_total_mm: number,
  targetElementsPerSpan: number = 8,
): { nodeX: number[]; elementsPerSpan: number; warnings: string[] } {
  const warnings: string[] = [];
  const anchors = [0, ...supportPositions_mm, L_total_mm].sort((a, b) => a - b);

  const unique: number[] = [];
  for (const x of anchors) {
    if (unique.length === 0 || Math.abs(x - unique[unique.length - 1]) > 0.01) unique.push(x);
  }

  const nSpans = unique.length - 1;
  let nSub = Math.max(4, Math.min(MAX_ELEMENTS_PER_SPAN, targetElementsPerSpan));

  const totalNodes = nSpans * nSub + 1;
  const totalDofs = totalNodes * 2;
  if (totalDofs > MAX_TOTAL_DOFS) {
    nSub = Math.max(4, Math.floor((MAX_TOTAL_DOFS / 2 - 1) / nSpans));
    warnings.push(`Mesh reduced to ${nSub} elem/span to stay under ${MAX_TOTAL_DOFS} DOFs`);
  }

  const nodeX: number[] = [unique[0]];
  for (let i = 0; i < unique.length - 1; i++) {
    const spanLen = unique[i + 1] - unique[i];
    for (let j = 1; j <= nSub; j++) nodeX.push(unique[i] + (j / nSub) * spanLen);
  }

  return { nodeX, elementsPerSpan: nSub, warnings };
}

// ── Reactions for unilateral logic ──
function bandedMatVecAt(bands: Float64Array[], U: Float64Array, i: number, halfBw: number): number {
  const n = U.length;
  let s = bands[0][i] * U[i];
  for (let k = 1; k <= halfBw; k++) {
    const jUp = i + k;
    if (jUp < n) s += bands[k][i] * U[jUp]; // K(i,i+k)
    const jLo = i - k;
    if (jLo >= 0) s += bands[k][jLo] * U[jLo]; // K(i,i-k) via symmetry
  }
  return s;
}

function reactionAtDof(bands0: Float64Array[], F0: Float64Array, U: Float64Array, dof: number, halfBw: number): number {
  // R = K*U - F. Positive is downward. Hoist can only pull UP => require R <= 0.
  return bandedMatVecAt(bands0, U, dof, halfBw) - F0[dof];
}

function findNodeIndex(nodeX: number[], x_mm: number): number | null {
  for (let i = 0; i < nodeX.length; i++) {
    if (Math.abs(nodeX[i] - x_mm) < 0.01) return i;
  }
  return null;
}

// ══════════════════════════════════════════════════════════════
// CORE SOLVER (bilateral constraints at specified support positions)
// ══════════════════════════════════════════════════════════════
function solveFEMCoreWithSystem(
  E_mpa: number,
  I_mm4: number,
  c_mm: number,
  q_Nmm: number,
  L_total_mm: number,
  h_total_mm: number,
  supportPositions_mm: number[],
  targetElementsPerSpan: number,
): { result: FEMResult; bands0: Float64Array[]; F0: Float64Array; halfBw: number } {
  const t0 = performance.now();
  const EI = E_mpa * I_mm4;
  const warnings: string[] = [];

  const {
    nodeX,
    elementsPerSpan,
    warnings: meshWarnings,
  } = buildMesh(supportPositions_mm, L_total_mm, targetElementsPerSpan);
  warnings.push(...meshWarnings);

  const nNodes = nodeX.length;
  const nElements = nNodes - 1;

  const elements: { node1: number; node2: number; Le: number }[] = [];
  for (let i = 0; i < nElements; i++) elements.push({ node1: i, node2: i + 1, Le: nodeX[i + 1] - nodeX[i] });

  const { bands, F, nDof, halfBw } = assembleSystemBanded(nNodes, elements, EI, q_Nmm);

  // Preserve originals for reactions
  const bands0 = bands.map((b) => new Float64Array(b));
  const F0 = new Float64Array(F);

  const constraints: { dof: number; value: number }[] = [];
  // Left fixed
  constraints.push({ dof: 0, value: 0 }, { dof: 1, value: 0 });
  // Right fixed with imposed settlement
  const rightNode = nNodes - 1;
  constraints.push({ dof: 2 * rightNode, value: h_total_mm }, { dof: 2 * rightNode + 1, value: 0 });

  // Supports: enforce w = w_ref(x) at support nodes (rotation free)
  for (let i = 1; i < nNodes - 1; i++) {
    const x = nodeX[i];
    const isSupport = supportPositions_mm.some((sp) => Math.abs(sp - x) < 0.01);
    if (isSupport) constraints.push({ dof: 2 * i, value: (h_total_mm / L_total_mm) * x });
  }

  applyBCBanded(bands, F, nDof, halfBw, constraints);
  const U = solveBanded(bands, F, nDof, halfBw);

  const stressData: { x: number; stress: number }[] = [];
  const deflectionData: { x: number; w: number }[] = [];
  let maxStress = 0;
  let maxMoment = 0;
  let maxMomentLocation = 0;

  const samplesPerElement = 10;
  for (let i = 0; i < nElements; i++) {
    const el = elements[i];
    const w1 = U[2 * el.node1] as number,
      t1 = U[2 * el.node1 + 1] as number;
    const w2 = U[2 * el.node2] as number,
      t2 = U[2 * el.node2 + 1] as number;

    for (let j = 0; j < samplesPerElement; j++) {
      const frac = (j + 0.5) / samplesPerElement;
      const xi = frac * el.Le;
      const x_mm = nodeX[el.node1] + xi;

      const M = elementMoment(EI, el.Le, w1, t1, w2, t2, xi);
      const stress = (Math.abs(M) * c_mm) / I_mm4;
      const w = elementDeflection(el.Le, w1, t1, w2, t2, xi);

      if (stress > maxStress) {
        maxStress = stress;
        maxMoment = Math.abs(M);
        maxMomentLocation = x_mm;
      }

      const x_m = Math.round((x_mm / 1000) * 1000) / 1000;
      stressData.push({ x: x_m, stress: Math.round(stress * 100) / 100 });
      deflectionData.push({ x: x_m, w: Math.round(w * 1000) / 1000 });
    }
  }

  const solveTimeMs = performance.now() - t0;

  const result: FEMResult = {
    maxStress,
    maxMoment,
    maxMomentLocation,
    stressData,
    deflectionData,
    displacements: Array.from(U),
    nodePositions: nodeX,
    meshInfo: { elementsPerSpan, totalDofs: nDof, solveTimeMs },
    warnings,
    activeSupports: [],
    supportStatus: [],
    contactIterations: 0,
  };

  return { result, bands0, F0, halfBw };
}

function solveFEMCore(
  E_mpa: number,
  I_mm4: number,
  c_mm: number,
  q_Nmm: number,
  L_total_mm: number,
  h_total_mm: number,
  supportPositions_mm: number[],
  targetElementsPerSpan: number,
): FEMResult {
  return solveFEMCoreWithSystem(
    E_mpa,
    I_mm4,
    c_mm,
    q_Nmm,
    L_total_mm,
    h_total_mm,
    supportPositions_mm,
    targetElementsPerSpan,
  ).result;
}

// ══════════════════════════════════════════════════════════════
// UNILATERAL HOIST SUPPORTS (active-set + reaction rule)
// ══════════════════════════════════════════════════════════════
interface UnilateralResult {
  result: FEMResult;
  activeSupports: number[];
  supportStatus: SupportStatus[];
  contactIterations: number;
}

function solveWithUnilateralSupports(
  E_mpa: number,
  I_mm4: number,
  c_mm: number,
  q_Nmm: number,
  L_total_mm: number,
  h_total_mm: number,
  candidateSupports_mm: number[],
  targetElementsPerSpan: number,
  maxIter: number = 20,
): UnilateralResult {
  const tolW = 1e-6 * Math.max(1, Math.abs(h_total_mm));
  const tolR = 1e-9 * Math.max(1, Math.abs(q_Nmm) * L_total_mm);

  let activeSet: number[] = [];
  let iter = 0;

  for (iter = 0; iter < maxIter; iter++) {
    activeSet.sort((a, b) => a - b);
    const activeSupportPositions = activeSet.map((i) => candidateSupports_mm[i]);

    const core = solveFEMCoreWithSystem(
      E_mpa,
      I_mm4,
      c_mm,
      q_Nmm,
      L_total_mm,
      h_total_mm,
      activeSupportPositions,
      targetElementsPerSpan,
    );

    const U = new Float64Array(core.result.displacements);
    const nodeX = core.result.nodePositions;

    // Add: penetration (pipe below the hoist line)
    const mustAdd: number[] = [];
    for (let i = 0; i < candidateSupports_mm.length; i++) {
      const x_i = candidateSupports_mm[i];
      const w_ref_i = (h_total_mm * x_i) / L_total_mm;
      const w_fem_i = interpolateDeflection(nodeX, U, x_i);
      if (w_fem_i > w_ref_i + tolW) mustAdd.push(i);
    }

    // Remove: wrong-sign reaction (would push downward)
    const mustRemove: number[] = [];
    for (const idx of activeSet) {
      const x_i = candidateSupports_mm[idx];
      const nodeIdx = findNodeIndex(nodeX, x_i);
      if (nodeIdx == null) continue;
      const dofW = 2 * nodeIdx;
      const R = reactionAtDof(core.bands0, core.F0, U, dofW, core.halfBw);
      if (R > tolR) mustRemove.push(idx);
    }

    const next = Array.from(new Set([...activeSet, ...mustAdd]))
      .filter((i) => !mustRemove.includes(i))
      .sort((a, b) => a - b);

    const same = next.length === activeSet.length && next.every((v, k) => v === activeSet[k]);

    if (same) {
      const finalActivePos = next.map((i) => candidateSupports_mm[i]);
      const final = solveFEMCore(
        E_mpa,
        I_mm4,
        c_mm,
        q_Nmm,
        L_total_mm,
        h_total_mm,
        finalActivePos,
        targetElementsPerSpan,
      );

      const supportStatus: SupportStatus[] = candidateSupports_mm.map((x_mm, i) => {
        const w_ref = (h_total_mm * x_mm) / L_total_mm;
        const w_fem = interpolateDeflection(final.nodePositions, final.displacements, x_mm);
        return {
          x_mm,
          w_fem: Math.round(w_fem * 1000) / 1000,
          w_ref: Math.round(w_ref * 1000) / 1000,
          active: next.includes(i),
        };
      });

      final.activeSupports = next;
      final.supportStatus = supportStatus;
      final.contactIterations = iter + 1;

      return { result: final, activeSupports: next, supportStatus, contactIterations: iter + 1 };
    }

    activeSet = next;
  }

  // MaxIter reached: still output coherent final solve
  const finalActivePos = activeSet.map((i) => candidateSupports_mm[i]);
  const final = solveFEMCore(E_mpa, I_mm4, c_mm, q_Nmm, L_total_mm, h_total_mm, finalActivePos, targetElementsPerSpan);

  const supportStatus: SupportStatus[] = candidateSupports_mm.map((x_mm, i) => {
    const w_ref = (h_total_mm * x_mm) / L_total_mm;
    const w_fem = interpolateDeflection(final.nodePositions, final.displacements, x_mm);
    return {
      x_mm,
      w_fem: Math.round(w_fem * 1000) / 1000,
      w_ref: Math.round(w_ref * 1000) / 1000,
      active: activeSet.includes(i),
    };
  });

  final.activeSupports = activeSet;
  final.supportStatus = supportStatus;
  final.contactIterations = maxIter;

  return { result: final, activeSupports: activeSet, supportStatus, contactIterations: maxIter };
}

// ── Contact sanity check ──
function validateContact(supportStatus: SupportStatus[], h_fem_mm: number): { valid: boolean; warnings: string[] } {
  const tol = 1e-6 * Math.max(1, Math.abs(h_fem_mm));
  const warnings: string[] = [];
  let valid = true;

  for (const s of supportStatus) {
    if (s.active) {
      if (Math.abs(s.w_fem - s.w_ref) > 10 * tol) {
        valid = false;
        warnings.push(
          `Contact violation (active): x=${s.x_mm.toFixed(0)}mm |w_fem-w_ref|=${Math.abs(s.w_fem - s.w_ref).toFixed(3)}mm`,
        );
      }
    } else {
      if (s.w_fem > s.w_ref + tol) {
        valid = false;
        warnings.push(
          `Contact violation (inactive): x=${s.x_mm.toFixed(0)}mm w_fem=${s.w_fem.toFixed(3)} > w_ref+tol=${(s.w_ref + tol).toFixed(3)}`,
        );
      }
    }
  }

  return { valid, warnings };
}

// ══════════════════════════════════════════════════════════════
// Public helper used by searches and display
// ══════════════════════════════════════════════════════════════
export function evaluateCandidate(
  E_mpa: number,
  I: number,
  c: number,
  q: number,
  L_m: number,
  h_fem_mm: number,
  supportsCount: number,
  allowable: number,
): EvaluateCandidateResult {
  const L_mm = L_m * 1000;
  const candidates = buildEqualSupports(L_mm, supportsCount);

  const { result, supportStatus } = solveWithUnilateralSupports(E_mpa, I, c, q, L_mm, h_fem_mm, candidates, 16);
  const { valid: contactValid, warnings: contactWarnings } = validateContact(supportStatus, h_fem_mm);

  if (!contactValid) result.warnings.push(...contactWarnings);

  const isSafe = result.maxStress <= allowable + 0.5 && contactValid;

  return { maxStress: result.maxStress, isSafe, result, contactValid, contactWarnings };
}

// ══════════════════════════════════════════════════════════════
// Adaptive mesh (bilateral) export
// ══════════════════════════════════════════════════════════════
export function solveFEM(
  E_mpa: number,
  I_mm4: number,
  c_mm: number,
  q_Nmm: number,
  L_total_mm: number,
  h_total_mm: number,
  supportPositions_mm: number[],
  adaptive: boolean = false,
): FEMResult {
  if (!adaptive) {
    return solveFEMCore(E_mpa, I_mm4, c_mm, q_Nmm, L_total_mm, h_total_mm, supportPositions_mm, 8);
  }

  const r8 = solveFEMCore(E_mpa, I_mm4, c_mm, q_Nmm, L_total_mm, h_total_mm, supportPositions_mm, 8);
  const r16 = solveFEMCore(E_mpa, I_mm4, c_mm, q_Nmm, L_total_mm, h_total_mm, supportPositions_mm, 16);

  const M1 = r8.maxMoment;
  const M2 = r16.maxMoment;

  if (M2 > 0 && Math.abs(M2 - M1) / M2 < 0.01) {
    r8.warnings.push(`Adaptive: 8 elem/span accepted (error ${((Math.abs(M2 - M1) / M2) * 100).toFixed(2)}%)`);
    return r8;
  }

  const r20 = solveFEMCore(E_mpa, I_mm4, c_mm, q_Nmm, L_total_mm, h_total_mm, supportPositions_mm, 20);
  r20.warnings.push(
    `Adaptive: refined to 20 elem/span (8→16 error was ${M2 > 0 ? ((Math.abs(M2 - M1) / M2) * 100).toFixed(2) : "∞"}%)`,
  );
  return r20;
}

// ══════════════════════════════════════════════════════════════
// AUTO SUPPORTS (minimum candidates to be safe)
// ══════════════════════════════════════════════════════════════
export function autoSupportsFEM(
  E_mpa: number,
  I: number,
  c: number,
  q: number,
  L_mm: number,
  h_fem_mm: number,
  allowable: number,
): { numSupports: number; stress: number; result: FEMResult } {
  const L_m = L_mm / 1000;
  let bestN = 0;
  let bestStress = Infinity;
  let bestResult: FEMResult | null = null;
  let prevStress = Infinity;

  for (let n = 0; n <= MAX_SUPPORTS; n++) {
    const ev = evaluateCandidate(E_mpa, I, c, q, L_m, h_fem_mm, n, allowable);

    if (ev.isSafe) {
      return { numSupports: n, stress: ev.maxStress, result: ev.result };
    }

    if (ev.maxStress < bestStress) {
      bestStress = ev.maxStress;
      bestN = n;
      bestResult = ev.result;
    }

    if (n > 0 && ev.maxStress > prevStress * 1.05) break;
    prevStress = ev.maxStress;
  }

  if (!bestResult) {
    const ev = evaluateCandidate(E_mpa, I, c, q, L_m, h_fem_mm, bestN, allowable);
    bestResult = ev.result;
    bestStress = ev.maxStress;
  }

  return { numSupports: bestN, stress: bestStress, result: bestResult };
}

// ══════════════════════════════════════════════════════════════
// FIND L RANGE + Lopt (min stress) inside the safe window
// ══════════════════════════════════════════════════════════════
export interface FindLRangeResult {
  Lmin: number;
  Lmax: number;
  Lmid: number;
  Lopt: number;
  numSupports: number;

  resultAtLmin: FEMResult;
  resultAtLmid: FEMResult;
  resultAtLopt: FEMResult;
  resultAtLmax: FEMResult;

  stressAtLmin: number;
  stressAtLmid: number;
  stressAtLopt: number;
  stressAtLmax: number;

  searchLminGuess: number;
  searchLmaxGuess: number;
}

export function findLRangeFEM(
  E_mpa: number,
  I: number,
  c: number,
  q: number,
  h_fem_mm: number,
  allowable: number,
): FindLRangeResult | undefined {
  // Coarse grid (meters)
  const coarseGrid: number[] = [];
  for (let L = 1; L <= 100; L += 1) coarseGrid.push(L);
  for (let L = 105; L <= 300; L += 5) coarseGrid.push(L);
  for (let L = 310; L <= 1000; L += 10) coarseGrid.push(L);

  // Cache evaluations by L (meters) for each nSup
  const keyOf = (L: number) => L.toFixed(5);

  for (let nSup = 0; nSup <= MAX_SUPPORTS; nSup++) {
    const cache = new Map<string, EvaluateCandidateResult>();

    const evalAt = (L_m: number): EvaluateCandidateResult => {
      const k = keyOf(L_m);
      const existing = cache.get(k);
      if (existing) return existing;
      const ev = evaluateCandidate(E_mpa, I, c, q, L_m, h_fem_mm, nSup, allowable);
      cache.set(k, ev);
      return ev;
    };

    // Scan grid and mark safe points
    const safeFlags: boolean[] = [];
    const stresses: number[] = [];
    for (const L_m of coarseGrid) {
      const ev = evalAt(L_m);
      safeFlags.push(ev.isSafe);
      stresses.push(ev.maxStress);
    }

    if (!safeFlags.some((v) => v)) continue;

    // Identify contiguous safe runs (by grid index adjacency)
    type Run = { i0: number; i1: number };
    const runs: Run[] = [];
    let i = 0;
    while (i < safeFlags.length) {
      if (!safeFlags[i]) {
        i++;
        continue;
      }
      const i0 = i;
      while (i < safeFlags.length && safeFlags[i]) i++;
      const i1 = i - 1;
      runs.push({ i0, i1 });
    }

    if (runs.length === 0) continue;

    // Choose the run with the smallest Lmin (first safe run)
    const run = runs.reduce((best, r) => (coarseGrid[r.i0] < coarseGrid[best.i0] ? r : best), runs[0]);

    const LminGuess = coarseGrid[run.i0];
    const LmaxGuess = coarseGrid[run.i1];

    // Refine Lmin using bisection between previous grid point and first safe point
    let loMin = run.i0 > 0 ? coarseGrid[run.i0 - 1] : 0.5;
    let hiMin = LminGuess;

    for (let iter = 0; iter < 25; iter++) {
      const mid = (loMin + hiMin) / 2;
      if ((hiMin - loMin) * 1000 < 10) break; // < 10 mm in meters scale
      const ev = evalAt(mid);
      if (ev.isSafe) hiMin = mid;
      else loMin = mid;
    }
    let refinedLmin = hiMin;

    // Refine Lmax using bisection between last safe point and next grid point
    let loMax = LmaxGuess;
    let hiMax = run.i1 < coarseGrid.length - 1 ? coarseGrid[run.i1 + 1] : LmaxGuess * 1.1;

    for (let iter = 0; iter < 25; iter++) {
      const mid = (loMax + hiMax) / 2;
      if ((hiMax - loMax) * 1000 < 10) break;
      const ev = evalAt(mid);
      if (ev.isSafe) loMax = mid;
      else hiMax = mid;
    }
    let refinedLmax = loMax;

    // Endpoint tightening (small steps) to ensure safe
    const eps = 0.5;
    for (let s = 0; s < 80; s++) {
      const ev = evalAt(refinedLmin);
      if (ev.maxStress <= allowable + eps && ev.contactValid) break;
      refinedLmin += 0.01;
    }
    for (let s = 0; s < 80; s++) {
      const ev = evalAt(refinedLmax);
      if (ev.maxStress <= allowable + eps && ev.contactValid) break;
      refinedLmax -= 0.01;
    }

    if (refinedLmin >= refinedLmax) continue;

    // Lmid
    const Lmid = (refinedLmin + refinedLmax) / 2;

    // Lopt: start from best coarse point within the run
    let bestL = LminGuess;
    let bestStress = Infinity;
    for (let k = run.i0; k <= run.i1; k++) {
      const Lm = coarseGrid[k];
      const ev = evalAt(Lm);
      if (ev.isSafe && ev.maxStress < bestStress) {
        bestStress = ev.maxStress;
        bestL = Lm;
      }
    }

    // Local refinement around bestL using a small bracket + golden-section (limited evals)
    const leftNeighbor =
      run.i0 < run.i1 ? coarseGrid[Math.max(run.i0, Math.min(run.i1, coarseGrid.indexOf(bestL) - 1))] : refinedLmin;
    const rightNeighbor =
      run.i0 < run.i1 ? coarseGrid[Math.max(run.i0, Math.min(run.i1, coarseGrid.indexOf(bestL) + 1))] : refinedLmax;

    let a = Math.max(refinedLmin, Math.min(leftNeighbor, bestL));
    let b = Math.min(refinedLmax, Math.max(rightNeighbor, bestL));
    if (b - a < 0.2) {
      a = refinedLmin;
      b = refinedLmax;
    }

    const phi = 0.61803398875;
    let c1 = b - phi * (b - a);
    let c2 = a + phi * (b - a);

    const f = (L: number): number => {
      const ev = evalAt(L);
      return ev.isSafe ? ev.maxStress : Number.POSITIVE_INFINITY;
    };

    let f1 = f(c1);
    let f2 = f(c2);

    for (let iter = 0; iter < 10; iter++) {
      if (b - a < 0.02) break;
      if (f1 > f2) {
        a = c1;
        c1 = c2;
        f1 = f2;
        c2 = a + phi * (b - a);
        f2 = f(c2);
      } else {
        b = c2;
        c2 = c1;
        f2 = f1;
        c1 = b - phi * (b - a);
        f1 = f(c1);
      }
    }

    const Lopt = f1 < f2 ? c1 : c2;

    // Final full results at the four points
    const evLmin = evalAt(refinedLmin);
    const evLmax = evalAt(refinedLmax);
    const evLmid = evalAt(Lmid);
    const evLopt = evalAt(Lopt);

    return {
      Lmin: Math.round(refinedLmin * 100) / 100,
      Lmax: Math.round(refinedLmax * 100) / 100,
      Lmid: Math.round(Lmid * 100) / 100,
      Lopt: Math.round(Lopt * 100) / 100,
      numSupports: nSup,

      resultAtLmin: evLmin.result,
      resultAtLmid: evLmid.result,
      resultAtLopt: evLopt.result,
      resultAtLmax: evLmax.result,

      stressAtLmin: evLmin.maxStress,
      stressAtLmid: evLmid.maxStress,
      stressAtLopt: evLopt.maxStress,
      stressAtLmax: evLmax.maxStress,

      searchLminGuess: LminGuess,
      searchLmaxGuess: LmaxGuess,
    };
  }

  return undefined;
}

// ══════════════════════════════════════════════════════════════
// FIND MAX H (uses evaluateCandidate)
// ══════════════════════════════════════════════════════════════
export function findMaxHFEM(
  E_mpa: number,
  I: number,
  c: number,
  q: number,
  L_mm: number,
  allowable: number,
): { h_mm: number; numSupports: number; result: FEMResult } | undefined {
  const L_m = L_mm / 1000;

  function evaluateH(h_fem: number): { safe: boolean; numSupports: number } {
    for (let n = 0; n <= MAX_SUPPORTS; n++) {
      const ev = evaluateCandidate(E_mpa, I, c, q, L_m, h_fem, n, allowable);
      if (ev.isSafe) return { safe: true, numSupports: n };
    }
    return { safe: false, numSupports: MAX_SUPPORTS };
  }

  const ev0 = evaluateH(0);
  if (!ev0.safe) return undefined;

  let lo = 0,
    hi = 0;
  let bestN = ev0.numSupports;

  let testH = 100;
  for (let step = 0; step < 15; step++) {
    const ev = evaluateH(testH);
    if (!ev.safe) {
      hi = testH;
      break;
    }
    lo = testH;
    bestN = ev.numSupports;
    testH *= 2;
    if (testH > 100_000) {
      hi = testH;
      break;
    }
  }

  if (hi === 0) {
    const ev = evaluateCandidate(E_mpa, I, c, q, L_m, lo, bestN, allowable);
    return { h_mm: lo, numSupports: bestN, result: ev.result };
  }

  for (let iter = 0; iter < 20; iter++) {
    const mid = (lo + hi) / 2;
    if (hi - lo < 0.1) break;
    const ev = evaluateH(mid);
    if (ev.safe) {
      lo = mid;
      bestN = ev.numSupports;
    } else {
      hi = mid;
    }
  }

  const ev = evaluateCandidate(E_mpa, I, c, q, L_m, lo, bestN, allowable);
  return { h_mm: lo, numSupports: bestN, result: ev.result };
}

// ── Candidate supports: equally spaced ──
export function buildEqualSupports(L_mm: number, numSupports: number): number[] {
  if (numSupports <= 0) return [];
  const spacing = L_mm / (numSupports + 1);
  const positions: number[] = [];
  for (let i = 1; i <= numSupports; i++) positions.push(i * spacing);
  return positions;
}
