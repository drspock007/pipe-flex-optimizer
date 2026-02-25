// ══════════════════════════════════════════════════════════════
// 1D Euler-Bernoulli Beam FEM Solver (Stiffness Method) — V4
// Units: mm, N, MPa throughout
//
// SIGN CONVENTION:
//   w is POSITIVE DOWNWARD
//   q (self-weight) is POSITIVE DOWNWARD
//   h_fem_mm: FEM settlement value (positive = right end lower)
//     When user says "right end higher by h_up", h_fem = -h_up
//   Boundary: left w=0,θ=0; right w=h_fem_mm,θ=0
//   Support elevation line: w_ref(x) = h_fem_mm · x / L
//   Contact: ACTIVE if w(x_i) > w_ref(x_i) + tol (pipe sags past support)
//
// Features: Banded solver, adaptive mesh, unilateral contact supports
// ══════════════════════════════════════════════════════════════

export interface SupportStatus {
  x_mm: number;
  w_fem: number; // mm - deflection from FEM
  w_ref: number; // mm - settlement line value
  active: boolean;
}

export interface FEMResult {
  maxStress: number; // MPa
  maxMoment: number; // N·mm
  maxMomentLocation: number; // mm from left end
  stressData: { x: number; stress: number }[]; // x in meters, stress in MPa
  deflectionData: { x: number; w: number }[]; // x in meters, w in mm
  displacements: number[]; // full DOF vector
  nodePositions: number[]; // mm
  meshInfo: { elementsPerSpan: number; totalDofs: number; solveTimeMs: number };
  warnings: string[];
  // Unilateral contact info
  activeSupports: number[]; // indices into candidate array
  supportStatus: SupportStatus[]; // status of all candidate supports
  contactIterations: number;
}

export interface EvaluateCandidateResult {
  maxStress: number;
  isSafe: boolean;
  result: FEMResult;
  contactValid: boolean;
  contactWarnings: string[];
}

// ── Performance guardrails ──
const MAX_SUPPORTS = 20;
const MAX_ELEMENTS_PER_SPAN = 20;
const MAX_TOTAL_DOFS = 1000;

// ── Standard 4×4 Euler-Bernoulli beam element stiffness matrix ──
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

// ── Consistent nodal load vector for UDL q (N/mm) ──
function elementLoad(q: number, Le: number): number[] {
  const qL = q * Le;
  const qL2 = qL * Le;
  return [qL / 2, qL2 / 12, qL / 2, -qL2 / 12];
}

// ── Assemble global system (banded storage) ──
function assembleSystemBanded(
  nNodes: number,
  elements: { node1: number; node2: number; Le: number }[],
  EI: number,
  q: number,
): { bands: Float64Array[]; F: Float64Array; nDof: number; halfBw: number } {
  const nDof = nNodes * 2;
  const halfBw = 3;
  const bands: Float64Array[] = [];
  for (let k = 0; k <= halfBw; k++) {
    bands.push(new Float64Array(nDof));
  }
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
        if (band <= halfBw) {
          bands[band][row] += ke[i][j];
        }
      }
    }
  }
  return { bands, F, nDof, halfBw };
}

// ── Banded symmetric positive-definite solver (LDLT factorization) ──
function solveBanded(bands: Float64Array[], F: Float64Array, nDof: number, halfBw: number): Float64Array {
  const d = new Float64Array(nDof);
  const L: Float64Array[] = [];
  for (let k = 0; k <= halfBw; k++) {
    L.push(new Float64Array(bands[k]));
  }
  const b = new Float64Array(F);

  for (let i = 0; i < nDof; i++) {
    let sum = L[0][i];
    for (let k = 1; k <= halfBw; k++) {
      const j = i - k;
      if (j >= 0) {
        sum -= L[k][j] * L[k][j] * d[j];
      }
    }
    d[i] = sum;
    if (Math.abs(d[i]) < 1e-30) d[i] = 1e-30;

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

  for (let i = 0; i < nDof; i++) {
    for (let k = 1; k <= halfBw; k++) {
      const j = i - k;
      if (j >= 0) b[i] -= L[k][j] * b[j];
    }
  }
  for (let i = 0; i < nDof; i++) b[i] /= d[i];
  for (let i = nDof - 1; i >= 0; i--) {
    for (let k = 1; k <= halfBw; k++) {
      const row = i + k;
      if (row >= nDof) break;
      b[i] -= L[k][i] * b[row];
    }
  }
  return b;
}

// ── Utilities for reactions / active-set contact ─────────────────────────────
// Storage convention: bands[k][row] stores K[row, row+k] (upper triangle).
function bandedMatVecAt(bands: Float64Array[], U: Float64Array, i: number, halfBw: number): number {
  const n = U.length;
  let s = bands[0][i] * U[i];
  for (let k = 1; k <= halfBw; k++) {
    const jUp = i + k;
    if (jUp < n) {
      // K[i, i+k]
      s += bands[k][i] * U[jUp];
    }
    const jLo = i - k;
    if (jLo >= 0) {
      // K[i-k, i] == K[i, i-k]
      s += bands[k][jLo] * U[jLo];
    }
  }
  return s;
}

function reactionAtDof(bands0: Float64Array[], F0: Float64Array, U: Float64Array, dof: number, halfBw: number): number {
  // R = K*U - F
  // With w positive downward, positive R means a downward reaction would be
  // required to enforce the constraint. A sideboom can only pull up (R <= 0).
  return bandedMatVecAt(bands0, U, dof, halfBw) - F0[dof];
}

function findNodeIndex(nodeX: number[], x_mm: number): number | null {
  for (let i = 0; i < nodeX.length; i++) {
    if (Math.abs(nodeX[i] - x_mm) < 0.01) return i;
  }
  return null;
}

// ── Apply boundary conditions using direct DOF elimination ──
function applyBCBanded(
  bands: Float64Array[],
  F: Float64Array,
  nDof: number,
  halfBw: number,
  constraints: { dof: number; value: number }[],
): void {
  for (const { dof, value } of constraints) {
    for (let k = 1; k <= halfBw; k++) {
      const j_upper = dof + k;
      if (j_upper < nDof) {
        F[j_upper] -= bands[k][dof] * value;
        bands[k][dof] = 0;
      }
      const j_lower = dof - k;
      if (j_lower >= 0) {
        F[j_lower] -= bands[k][j_lower] * value;
        bands[k][j_lower] = 0;
      }
    }
    bands[0][dof] = 1;
    F[dof] = value;
  }
}

// ── Compute element internal moment ──
function elementMoment(EI: number, Le: number, w1: number, t1: number, w2: number, t2: number, xi: number): number {
  const s = xi / Le;
  const L2 = Le * Le;
  const N1pp = (-6 + 12 * s) / L2;
  const N2pp = (-4 + 6 * s) / Le;
  const N3pp = (6 - 12 * s) / L2;
  const N4pp = (-2 + 6 * s) / Le;
  return EI * (N1pp * w1 + N2pp * t1 + N3pp * w2 + N4pp * t2);
}

// ── Compute deflection w(xi) using Hermite shape functions ──
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

// ── Interpolate deflection at arbitrary x_mm from FEM solution ──
function interpolateDeflection(nodeX: number[], U: number[] | Float64Array, x_mm: number): number {
  const nNodes = nodeX.length;
  for (let i = 0; i < nNodes - 1; i++) {
    const x1 = nodeX[i];
    const x2 = nodeX[i + 1];
    if (x_mm >= x1 - 0.01 && x_mm <= x2 + 0.01) {
      const Le = x2 - x1;
      const xi = Math.max(0, Math.min(Le, x_mm - x1));
      const w1 = U[2 * i],
        t1 = U[2 * i + 1];
      const w2 = U[2 * (i + 1)],
        t2 = U[2 * (i + 1) + 1];
      return elementDeflection(Le, w1, t1, w2, t2, xi);
    }
  }
  if (x_mm <= nodeX[0]) return U[0] as number;
  return U[2 * (nNodes - 1)] as number;
}

// ── Build mesh with guardrails ──
function buildMesh(
  supportPositions_mm: number[],
  L_total_mm: number,
  targetElementsPerSpan: number = 8,
): { nodeX: number[]; elementsPerSpan: number; warnings: string[] } {
  const warnings: string[] = [];
  const anchors = [0, ...supportPositions_mm, L_total_mm].sort((a, b) => a - b);
  const unique: number[] = [];
  for (const x of anchors) {
    if (unique.length === 0 || Math.abs(x - unique[unique.length - 1]) > 0.01) {
      unique.push(x);
    }
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
    for (let j = 1; j <= nSub; j++) {
      nodeX.push(unique[i] + (j / nSub) * spanLen);
    }
  }

  return { nodeX, elementsPerSpan: nSub, warnings };
}

// ══════════════════════════════════════════════════════════════
// CORE FEM SOLVER (single solve, bilateral supports)
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
  for (let i = 0; i < nElements; i++) {
    elements.push({ node1: i, node2: i + 1, Le: nodeX[i + 1] - nodeX[i] });
  }

  const { bands, F, nDof, halfBw } = assembleSystemBanded(nNodes, elements, EI, q_Nmm);

  // Preserve originals for reactions
  const bands0 = bands.map((b) => new Float64Array(b));
  const F0 = new Float64Array(F);

  const constraints: { dof: number; value: number }[] = [];
  constraints.push({ dof: 0, value: 0 });
  constraints.push({ dof: 1, value: 0 });
  const rightNode = nNodes - 1;
  constraints.push({ dof: 2 * rightNode, value: h_total_mm });
  constraints.push({ dof: 2 * rightNode + 1, value: 0 });

  for (let i = 1; i < nNodes - 1; i++) {
    const x = nodeX[i];
    const isSupport = supportPositions_mm.some((sp) => Math.abs(sp - x) < 0.01);
    if (isSupport) {
      constraints.push({ dof: 2 * i, value: (h_total_mm / L_total_mm) * x });
    }
  }

  applyBCBanded(bands, F, nDof, halfBw, constraints);
  const U = solveBanded(bands, F, nDof, halfBw);

  const stressData: { x: number; stress: number }[] = [];
  const deflectionData: { x: number; w: number }[] = [];
  let maxStress = 0,
    maxMoment = 0,
    maxMomentLocation = 0;

  const samplesPerElement = 10;

  for (let i = 0; i < nElements; i++) {
    const el = elements[i];
    const w1 = U[2 * el.node1],
      t1 = U[2 * el.node1 + 1];
    const w2 = U[2 * el.node2],
      t2 = U[2 * el.node2 + 1];

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

  const plotMax = stressData.reduce((m, d) => Math.max(m, d.stress), 0);
  if (maxStress > 0 && Math.abs(plotMax - maxStress) / maxStress > 0.02) {
    warnings.push(`⚠️ Graph mismatch: plot max ${plotMax.toFixed(1)} vs computed ${maxStress.toFixed(1)} MPa`);
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
// UNILATERAL CONTACT SOLVER — Active-set iteration
// Supports can only push up (resist gravity), not pull down.
// ══════════════════════════════════════════════════════════════

interface UnilateralResult {
  result: FEMResult;
  activeSupports: number[]; // indices into candidateSupports
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
  maxIter: number = 15,
): UnilateralResult {
  // Contact tolerances
  const tolW = 1e-6 * Math.max(1, Math.abs(h_total_mm));
  const tolR = 1e-8 * Math.max(1, Math.abs(q_Nmm) * L_total_mm);

  // Active-set for sidebooms/hoists:
  // - Activate if the pipe sags below the target line (penetration): w_fem > w_ref + tolW
  // - Deactivate if the reaction would have to push downward (not possible for a hoist): R_dof > tolR
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

    const resultNow = core.result;
    const U = new Float64Array(resultNow.displacements);
    const nodeX = resultNow.nodePositions;

    // 1) Add supports with penetration
    const mustAdd: number[] = [];
    for (let i = 0; i < candidateSupports_mm.length; i++) {
      const x_i = candidateSupports_mm[i];
      const w_ref_i = (h_total_mm * x_i) / L_total_mm;
      const w_fem_i = interpolateDeflection(nodeX, U, x_i);
      if (w_fem_i > w_ref_i + tolW) mustAdd.push(i);
    }

    // 2) Remove supports with wrong-sign reaction (would push downward)
    const mustRemove: number[] = [];
    for (const i of activeSet) {
      const x_i = candidateSupports_mm[i];
      const nodeIdx = findNodeIndex(nodeX, x_i);
      if (nodeIdx == null) continue;
      const dofW = 2 * nodeIdx;
      const R = reactionAtDof(core.bands0, core.F0, U, dofW, core.halfBw);
      if (R > tolR) mustRemove.push(i);
    }

    const next = Array.from(new Set([...activeSet, ...mustAdd]))
      .filter((i) => !mustRemove.includes(i))
      .sort((a, b) => a - b);

    const same = next.length === activeSet.length && next.every((v, idx) => v === activeSet[idx]);

    if (same) {
      // Final coherent solve using converged active set
      const finalSupportPositions = next.map((i) => candidateSupports_mm[i]);
      const final = solveFEMCore(
        E_mpa,
        I_mm4,
        c_mm,
        q_Nmm,
        L_total_mm,
        h_total_mm,
        finalSupportPositions,
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

  // If maxIter reached, still provide a coherent final solve
  const finalSupportPositions = activeSet.map((i) => candidateSupports_mm[i]);
  const final = solveFEMCore(
    E_mpa,
    I_mm4,
    c_mm,
    q_Nmm,
    L_total_mm,
    h_total_mm,
    finalSupportPositions,
    targetElementsPerSpan,
  );

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

// ══════════════════════════════════════════════════════════════
// CONTACT SANITY CHECK
// ══════════════════════════════════════════════════════════════
function validateContact(supportStatus: SupportStatus[], h_fem_mm: number): { valid: boolean; warnings: string[] } {
  const tol = 1e-6 * Math.max(1, Math.abs(h_fem_mm));
  const warnings: string[] = [];
  let valid = true;

  for (const s of supportStatus) {
    if (s.active) {
      // Active: w should be very close to w_ref
      if (Math.abs(s.w_fem - s.w_ref) > 10 * tol) {
        valid = false;
        warnings.push(
          `Contact violation (active): x=${s.x_mm.toFixed(0)}mm |w_fem-w_ref|=${Math.abs(s.w_fem - s.w_ref).toFixed(3)}mm > 10·tol`,
        );
      }
    } else {
      // Inactive: w should be <= w_ref + tol (pipe above or at support)
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
// SINGLE SOURCE OF TRUTH: evaluateCandidate
// Used by FindL scan, bisection, auto-supports, and display.
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
  if (!contactValid) {
    // Bubble contact warnings up into the FEM result so the UI/debug can show them.
    result.warnings.push(...contactWarnings);
  }
  const isSafe = result.maxStress <= allowable + 0.5 && contactValid;

  return { maxStress: result.maxStress, isSafe, result, contactValid, contactWarnings };
}

// ══════════════════════════════════════════════════════════════
// ADAPTIVE MESH SOLVER
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
// AUTO-SUPPORT (with unilateral contacts via evaluateCandidate)
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
  let bestN = 0,
    bestStress = Infinity;
  let bestResult: FEMResult | null = null;
  let prevStress = Infinity;
  const L_m = L_mm / 1000;

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
// FIND L RANGE — [Lmin, Lmax] with unilateral supports
// Uses evaluateCandidate as single source of truth.
// Seeded with settlement-only estimate for faster bracketing.
// ══════════════════════════════════════════════════════════════

export interface FindLRangeResult {
  Lmin: number;
  Lmax: number;
  numSupports: number;
  resultAtMid: FEMResult; // full result at L_plot = clamp(midpoint, [Lmin,Lmax])
  resultAtLmin: FEMResult;
  L_plot: number; // display L = midpoint
  stressAtLmin: number;
  stressAtLmax: number;
  stressAtLplot: number;
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
  // Seed: settlement-only estimate L_seed = sqrt(6*E*c*|h|/allowable) (mm -> m)
  const h_abs = Math.abs(h_fem_mm);
  let L_seed_mm = h_abs > 0 && allowable > 0 ? Math.sqrt((6 * E_mpa * c * h_abs) / allowable) : 0;
  const L_seed_m = L_seed_mm / 1000;

  // Build coarse grid centered around seed
  const coarseGrid: number[] = [];
  if (L_seed_m > 5) {
    const lo = Math.max(1, Math.floor(L_seed_m * 0.3));
    const hi = Math.ceil(L_seed_m * 3);
    for (let L = lo; L <= Math.min(hi, 100); L += 1) coarseGrid.push(L);
    for (let L = Math.max(105, lo); L <= Math.min(hi, 300); L += 5) {
      if (!coarseGrid.includes(L)) coarseGrid.push(L);
    }
    for (let L = Math.max(310, lo); L <= Math.min(hi, 1000); L += 10) {
      if (!coarseGrid.includes(L)) coarseGrid.push(L);
    }
    const maxGrid = Math.max(...coarseGrid);
    if (maxGrid < 1000) {
      for (let L = maxGrid + 10; L <= 1000; L += 10) coarseGrid.push(L);
    }
    for (let L = 1; L < lo; L += 1) coarseGrid.unshift(L);
  } else {
    for (let L = 1; L <= 100; L += 1) coarseGrid.push(L);
    for (let L = 105; L <= 300; L += 5) coarseGrid.push(L);
    for (let L = 310; L <= 1000; L += 10) coarseGrid.push(L);
  }
  coarseGrid.sort((a, b) => a - b);

  for (let nSup = 0; nSup <= MAX_SUPPORTS; nSup++) {
    const safePoints: number[] = [];
    for (const L_m of coarseGrid) {
      const ev = evaluateCandidate(E_mpa, I, c, q, L_m, h_fem_mm, nSup, allowable);
      if (ev.isSafe) {
        safePoints.push(L_m);
      }
    }

    if (safePoints.length === 0) continue;

    const LminGuess = Math.min(...safePoints);
    const LmaxGuess = Math.max(...safePoints);

    const gridIdx = (v: number) => coarseGrid.indexOf(v);
    const idxMin = gridIdx(LminGuess);
    const idxMax = gridIdx(LmaxGuess);

    // Refine Lmin by bisection
    let loMin = idxMin > 0 ? coarseGrid[idxMin - 1] : 0.5;
    let hiMin = LminGuess;
    for (let iter = 0; iter < 20; iter++) {
      const mid = (loMin + hiMin) / 2;
      if ((hiMin - loMin) * 1000 < 10) break;
      const ev = evaluateCandidate(E_mpa, I, c, q, mid, h_fem_mm, nSup, allowable);
      if (ev.isSafe) {
        hiMin = mid;
      } else {
        loMin = mid;
      }
    }
    let refinedLmin = hiMin;

    // Refine Lmax by bisection
    let loMax = LmaxGuess;
    let hiMax = idxMax < coarseGrid.length - 1 ? coarseGrid[idxMax + 1] : LmaxGuess * 1.1;
    for (let iter = 0; iter < 20; iter++) {
      const mid = (loMax + hiMax) / 2;
      if ((hiMax - loMax) * 1000 < 10) break;
      const ev = evaluateCandidate(E_mpa, I, c, q, mid, h_fem_mm, nSup, allowable);
      if (ev.isSafe) {
        loMax = mid;
      } else {
        hiMax = mid;
      }
    }
    let refinedLmax = loMax;

    // Safety verification: shrink endpoints if needed
    const eps = 0.5;
    for (let s = 0; s < 50; s++) {
      const ev = evaluateCandidate(E_mpa, I, c, q, refinedLmin, h_fem_mm, nSup, allowable);
      if (ev.maxStress <= allowable + eps && ev.contactValid) break;
      refinedLmin += 0.01;
    }
    for (let s = 0; s < 50; s++) {
      const ev = evaluateCandidate(E_mpa, I, c, q, refinedLmax, h_fem_mm, nSup, allowable);
      if (ev.maxStress <= allowable + eps && ev.contactValid) break;
      refinedLmax -= 0.01;
    }

    if (refinedLmin >= refinedLmax) continue;

    // Compute representative results at clamped midpoint
    const L_plot = Math.max(refinedLmin, Math.min(refinedLmax, (refinedLmin + refinedLmax) / 2));
    const evMid = evaluateCandidate(E_mpa, I, c, q, L_plot, h_fem_mm, nSup, allowable);
    const evLmin = evaluateCandidate(E_mpa, I, c, q, refinedLmin, h_fem_mm, nSup, allowable);
    const evLmax = evaluateCandidate(E_mpa, I, c, q, refinedLmax, h_fem_mm, nSup, allowable);

    return {
      Lmin: Math.round(refinedLmin * 100) / 100,
      Lmax: Math.round(refinedLmax * 100) / 100,
      numSupports: nSup,
      resultAtMid: evMid.result,
      resultAtLmin: evLmin.result,
      L_plot: Math.round(L_plot * 100) / 100,
      stressAtLmin: evLmin.maxStress,
      stressAtLmax: evLmax.maxStress,
      stressAtLplot: evMid.maxStress,
      searchLminGuess: LminGuess,
      searchLmaxGuess: LmaxGuess,
    };
  }

  return undefined;
}

// ══════════════════════════════════════════════════════════════
// FIND MAX H — with unilateral supports via evaluateCandidate
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

// ── Helper: build equally spaced support positions ──
export function buildEqualSupports(L_mm: number, numSupports: number): number[] {
  if (numSupports <= 0) return [];
  const spacing = L_mm / (numSupports + 1);
  const positions: number[] = [];
  for (let i = 1; i <= numSupports; i++) {
    positions.push(i * spacing);
  }
  return positions;
}
