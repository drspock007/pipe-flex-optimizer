// ══════════════════════════════════════════════════════════════
// 1D Euler-Bernoulli Beam FEM Solver (Stiffness Method) — V2
// Units: mm, N, MPa throughout
// Features: Banded solver, adaptive mesh, performance guardrails
// ══════════════════════════════════════════════════════════════

export interface FEMResult {
  maxStress: number;          // MPa
  maxMoment: number;          // N·mm
  maxMomentLocation: number;  // mm from left end
  stressData: { x: number; stress: number }[];  // x in meters, stress in MPa
  deflectionData: { x: number; w: number }[];   // x in meters, w in mm
  displacements: number[];    // full DOF vector
  nodePositions: number[];    // mm
  meshInfo: { elementsPerSpan: number; totalDofs: number; solveTimeMs: number };
  warnings: string[];
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
    [12 * k,      6 * Le * k,   -12 * k,      6 * Le * k],
    [6 * Le * k,  4 * Le2 * k,  -6 * Le * k,  2 * Le2 * k],
    [-12 * k,     -6 * Le * k,  12 * k,       -6 * Le * k],
    [6 * Le * k,  2 * Le2 * k,  -6 * Le * k,  4 * Le2 * k],
  ];
}

// ── Consistent nodal load vector for UDL q (N/mm) ──
function elementLoad(q: number, Le: number): number[] {
  const qL = q * Le;
  const qL2 = qL * Le;
  return [qL / 2, qL2 / 12, qL / 2, -qL2 / 12];
}

// ── Assemble global system (banded storage) ──
// Bandwidth for beam elements: each element connects 2 nodes (4 DOFs),
// so half-bandwidth = 3 (max DOF distance within element)
function assembleSystemBanded(
  nNodes: number,
  elements: { node1: number; node2: number; Le: number }[],
  EI: number,
  q: number,
): { bands: Float64Array[]; F: Float64Array; nDof: number; halfBw: number } {
  const nDof = nNodes * 2;
  // Half bandwidth: max distance between DOFs in an element = 3
  const halfBw = 3;
  // Store only upper triangle: bands[0] = diagonal, bands[k] = k-th superdiagonal
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
          if (i !== j) {
            // symmetric: also need lower, but we handle that in solver
          }
        }
      }
    }
  }
  return { bands, F, nDof, halfBw };
}

// ── Banded symmetric positive-definite solver (LDLT factorization) ──
// Solves K*x = F where K is symmetric banded, stored as bands[0..halfBw]
// bands[k][i] = K[i][i+k] for k >= 0
function solveBanded(bands: Float64Array[], F: Float64Array, nDof: number, halfBw: number): Float64Array {
  // Make working copies
  const d = new Float64Array(nDof); // diagonal of D
  const L: Float64Array[] = [];
  for (let k = 0; k <= halfBw; k++) {
    L.push(new Float64Array(bands[k]));
  }
  const b = new Float64Array(F);

  // LDLT factorization in-place on banded storage
  for (let i = 0; i < nDof; i++) {
    // Compute D[i]
    let sum = L[0][i];
    for (let k = 1; k <= halfBw; k++) {
      const j = i - k;
      if (j >= 0) {
        sum -= L[k][j] * L[k][j] * d[j];
      }
    }
    d[i] = sum;

    if (Math.abs(d[i]) < 1e-30) {
      d[i] = 1e-30; // prevent division by zero
    }

    // Compute L entries for column i
    for (let k = 1; k <= halfBw; k++) {
      const row = i + k;
      if (row >= nDof) break;
      let s = L[k][i]; // original K[i][i+k] = K[row][i] (but stored as bands[k][i])
      // Wait — bands[k][i] = K[i][i+k], so for column i of L, we need rows > i
      // L[row][i] = (K[row][i] - sum) / D[i]
      // K[row][i] = bands[row-i][i] = bands[k][i]
      for (let m = 1; m <= halfBw; m++) {
        const j = i - m;
        if (j < 0) break;
        const ki = i - j; // = m
        const krow = row - j;
        if (krow > halfBw) continue;
        if (krow <= 0) continue;
        s -= L[ki][j] * L[krow][j] * d[j];
      }
      L[k][i] = s / d[i];
    }
  }

  // Forward solve: L * y = b
  for (let i = 0; i < nDof; i++) {
    for (let k = 1; k <= halfBw; k++) {
      const j = i - k;
      if (j >= 0) {
        b[i] -= L[k][j] * b[j];
      }
    }
  }

  // Diagonal solve: D * z = y
  for (let i = 0; i < nDof; i++) {
    b[i] /= d[i];
  }

  // Backward solve: L^T * x = z
  for (let i = nDof - 1; i >= 0; i--) {
    for (let k = 1; k <= halfBw; k++) {
      const row = i + k;
      if (row >= nDof) break;
      b[i] -= L[k][i] * b[row];
    }
  }

  return b;
}

// ── Apply boundary conditions using direct DOF elimination ──
// Transfers coupling terms to RHS before zeroing row/column.
// This avoids numerical issues from penalty method.
function applyBCBanded(
  bands: Float64Array[], F: Float64Array, nDof: number, halfBw: number,
  constraints: { dof: number; value: number }[]
): void {
  for (const { dof, value } of constraints) {
    // Transfer coupling K[j][dof]*value to RHS of connected DOFs
    for (let k = 1; k <= halfBw; k++) {
      // Upper triangle: K[dof][dof+k] stored as bands[k][dof]
      const j_upper = dof + k;
      if (j_upper < nDof) {
        F[j_upper] -= bands[k][dof] * value;
        bands[k][dof] = 0;
      }
      // Lower triangle (symmetric): K[dof-k][dof] stored as bands[k][dof-k]
      const j_lower = dof - k;
      if (j_lower >= 0) {
        F[j_lower] -= bands[k][j_lower] * value;
        bands[k][j_lower] = 0;
      }
    }
    // Set identity row: K[dof][dof] = 1, F[dof] = value
    bands[0][dof] = 1;
    F[dof] = value;
  }
}

// ── Compute element internal moment ──
function elementMoment(
  EI: number, Le: number,
  w1: number, t1: number, w2: number, t2: number,
  xi: number
): number {
  const s = xi / Le;
  const L2 = Le * Le;
  const N1pp = (-6 + 12 * s) / L2;
  const N2pp = (-4 + 6 * s) / Le;
  const N3pp = (6 - 12 * s) / L2;
  const N4pp = (-2 + 6 * s) / Le;
  return EI * (N1pp * w1 + N2pp * t1 + N3pp * w2 + N4pp * t2);
}

// ── Compute deflection w(xi) using Hermite shape functions ──
function elementDeflection(
  Le: number,
  w1: number, t1: number, w2: number, t2: number,
  xi: number
): number {
  const s = xi / Le;
  const s2 = s * s;
  const s3 = s2 * s;
  const N1 = 1 - 3 * s2 + 2 * s3;
  const N2 = xi * (1 - s) * (1 - s);
  const N3 = 3 * s2 - 2 * s3;
  const N4 = xi * s * (s - 1);
  return N1 * w1 + N2 * t1 + N3 * w2 + N4 * t2;
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

  // Check total DOFs would not exceed limit
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
// CORE FEM SOLVER (single solve)
// ══════════════════════════════════════════════════════════════
function solveFEMCore(
  E_mpa: number, I_mm4: number, c_mm: number, q_Nmm: number,
  L_total_mm: number, h_total_mm: number,
  supportPositions_mm: number[],
  targetElementsPerSpan: number,
): FEMResult {
  const t0 = performance.now();
  const EI = E_mpa * I_mm4;
  const warnings: string[] = [];

  const { nodeX, elementsPerSpan, warnings: meshWarnings } = buildMesh(
    supportPositions_mm, L_total_mm, targetElementsPerSpan
  );
  warnings.push(...meshWarnings);

  const nNodes = nodeX.length;
  const nElements = nNodes - 1;

  const elements: { node1: number; node2: number; Le: number }[] = [];
  for (let i = 0; i < nElements; i++) {
    elements.push({ node1: i, node2: i + 1, Le: nodeX[i + 1] - nodeX[i] });
  }

  // Assemble banded system
  const { bands, F, nDof, halfBw } = assembleSystemBanded(nNodes, elements, EI, q_Nmm);

  // Boundary conditions
  const constraints: { dof: number; value: number }[] = [];
  constraints.push({ dof: 0, value: 0 });
  constraints.push({ dof: 1, value: 0 });
  const rightNode = nNodes - 1;
  constraints.push({ dof: 2 * rightNode, value: h_total_mm });
  constraints.push({ dof: 2 * rightNode + 1, value: 0 });

  for (let i = 1; i < nNodes - 1; i++) {
    const x = nodeX[i];
    const isSupport = supportPositions_mm.some(sp => Math.abs(sp - x) < 0.01);
    if (isSupport) {
      constraints.push({ dof: 2 * i, value: (h_total_mm / L_total_mm) * x });
    }
  }

  applyBCBanded(bands, F, nDof, halfBw, constraints);
  const U = solveBanded(bands, F, nDof, halfBw);

  // Post-process
  const totalPoints = 200;
  const stressData: { x: number; stress: number }[] = [];
  const deflectionData: { x: number; w: number }[] = [];
  let maxStress = 0, maxMoment = 0, maxMomentLocation = 0;

  for (let pt = 0; pt <= totalPoints; pt++) {
    const x_mm = (pt / totalPoints) * L_total_mm;
    let elIdx = 0;
    for (let i = 0; i < nElements; i++) {
      if (x_mm >= nodeX[i] && x_mm <= nodeX[i + 1]) { elIdx = i; break; }
    }
    if (x_mm >= L_total_mm - 0.01) elIdx = nElements - 1;

    const el = elements[elIdx];
    const xi = x_mm - nodeX[el.node1];
    const w1 = U[2 * el.node1], t1 = U[2 * el.node1 + 1];
    const w2 = U[2 * el.node2], t2 = U[2 * el.node2 + 1];

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

  const solveTimeMs = performance.now() - t0;

  return {
    maxStress, maxMoment, maxMomentLocation,
    stressData, deflectionData,
    displacements: Array.from(U), nodePositions: nodeX,
    meshInfo: { elementsPerSpan, totalDofs: nDof, solveTimeMs },
    warnings,
  };
}

// ══════════════════════════════════════════════════════════════
// ADAPTIVE MESH SOLVER — accuracy control
// Solve at 8, compare with 16; if error > 1%, use 20
// ══════════════════════════════════════════════════════════════
export function solveFEM(
  E_mpa: number, I_mm4: number, c_mm: number, q_Nmm: number,
  L_total_mm: number, h_total_mm: number,
  supportPositions_mm: number[],
  adaptive: boolean = false,
): FEMResult {
  if (!adaptive) {
    return solveFEMCore(E_mpa, I_mm4, c_mm, q_Nmm, L_total_mm, h_total_mm, supportPositions_mm, 8);
  }

  // Step 1: solve with 8 elements
  const r8 = solveFEMCore(E_mpa, I_mm4, c_mm, q_Nmm, L_total_mm, h_total_mm, supportPositions_mm, 8);
  // Step 2: solve with 16 elements
  const r16 = solveFEMCore(E_mpa, I_mm4, c_mm, q_Nmm, L_total_mm, h_total_mm, supportPositions_mm, 16);

  const M1 = r8.maxMoment;
  const M2 = r16.maxMoment;

  if (M2 > 0 && Math.abs(M2 - M1) / M2 < 0.01) {
    // 8 elements is accurate enough
    r8.warnings.push(`Adaptive: 8 elem/span accepted (error ${((Math.abs(M2 - M1) / M2) * 100).toFixed(2)}%)`);
    return r8;
  }

  // Need finer mesh
  const r20 = solveFEMCore(E_mpa, I_mm4, c_mm, q_Nmm, L_total_mm, h_total_mm, supportPositions_mm, 20);
  r20.warnings.push(`Adaptive: refined to 20 elem/span (8→16 error was ${M2 > 0 ? ((Math.abs(M2 - M1) / M2) * 100).toFixed(2) : '∞'}%)`);
  return r20;
}

// ── Quick solve for search (no post-processing, just max stress) ──
function solveFEMQuick(
  E_mpa: number, I_mm4: number, c_mm: number, q_Nmm: number,
  L_total_mm: number, h_total_mm: number,
  supportPositions_mm: number[],
): number {
  // Minimal solve with 8 elements, only compute max stress
  const EI = E_mpa * I_mm4;
  const { nodeX } = buildMesh(supportPositions_mm, L_total_mm, 8);
  const nNodes = nodeX.length;
  const nElements = nNodes - 1;

  const elements: { node1: number; node2: number; Le: number }[] = [];
  for (let i = 0; i < nElements; i++) {
    elements.push({ node1: i, node2: i + 1, Le: nodeX[i + 1] - nodeX[i] });
  }

  const { bands, F, nDof, halfBw } = assembleSystemBanded(nNodes, elements, EI, q_Nmm);

  const constraints: { dof: number; value: number }[] = [];
  constraints.push({ dof: 0, value: 0 }, { dof: 1, value: 0 });
  const rightNode = nNodes - 1;
  constraints.push({ dof: 2 * rightNode, value: h_total_mm }, { dof: 2 * rightNode + 1, value: 0 });
  for (let i = 1; i < nNodes - 1; i++) {
    const x = nodeX[i];
    if (supportPositions_mm.some(sp => Math.abs(sp - x) < 0.01)) {
      constraints.push({ dof: 2 * i, value: (h_total_mm / L_total_mm) * x });
    }
  }

  applyBCBanded(bands, F, nDof, halfBw, constraints);
  const U = solveBanded(bands, F, nDof, halfBw);

  // Sample stress at element boundaries + midpoints only
  let maxStress = 0;
  for (let i = 0; i < nElements; i++) {
    const el = elements[i];
    const w1 = U[2 * el.node1], t1 = U[2 * el.node1 + 1];
    const w2 = U[2 * el.node2], t2 = U[2 * el.node2 + 1];
    for (const xi of [0, el.Le / 2, el.Le]) {
      const M = elementMoment(EI, el.Le, w1, t1, w2, t2, xi);
      const stress = (Math.abs(M) * c_mm) / I_mm4;
      if (stress > maxStress) maxStress = stress;
    }
  }
  return maxStress;
}

// ══════════════════════════════════════════════════════════════
// AUTO-SUPPORT
// ══════════════════════════════════════════════════════════════
export function autoSupportsFEM(
  E_mpa: number, I: number, c: number, q: number,
  L_mm: number, h_mm: number, allowable: number,
): { numSupports: number; stress: number; result: FEMResult } {
  let bestN = 0, bestStress = Infinity;
  let bestResult: FEMResult | null = null;

  for (let n = 0; n <= MAX_SUPPORTS; n++) {
    const supports = buildEqualSupports(L_mm, n);
    const stress = solveFEMQuick(E_mpa, I, c, q, L_mm, h_mm, supports);

    if (stress <= allowable) {
      // Found it — do a full adaptive solve for the final result
      const result = solveFEM(E_mpa, I, c, q, L_mm, h_mm, supports, true);
      return { numSupports: n, stress: result.maxStress, result };
    }

    if (stress < bestStress) {
      bestStress = stress;
      bestN = n;
    }
  }

  // None safe — return best with full solve
  const supports = buildEqualSupports(L_mm, bestN);
  bestResult = solveFEM(E_mpa, I, c, q, L_mm, h_mm, supports, true);
  return { numSupports: bestN, stress: bestResult.maxStress, result: bestResult };
}

// ══════════════════════════════════════════════════════════════
// FIND MAX L — coarse scan + auto-support per candidate + bisection
// ══════════════════════════════════════════════════════════════
export function findMaxLFEM(
  E_mpa: number, I: number, c: number, q: number,
  h_mm: number, allowable: number,
): { L_m: number; numSupports: number; result: FEMResult } | undefined {
  // Helper: evaluate a candidate L with auto-support optimization
  function evaluateLength(L_mm: number): { safe: boolean; stress: number; numSupports: number } {
    for (let n = 0; n <= MAX_SUPPORTS; n++) {
      const supports = buildEqualSupports(L_mm, n);
      const stress = solveFEMQuick(E_mpa, I, c, q, L_mm, h_mm, supports);
      if (stress <= allowable) {
        return { safe: true, stress, numSupports: n };
      }
    }
    // Even with max supports, still unsafe
    const supports = buildEqualSupports(L_mm, MAX_SUPPORTS);
    const stress = solveFEMQuick(E_mpa, I, c, q, L_mm, h_mm, supports);
    return { safe: false, stress, numSupports: MAX_SUPPORTS };
  }

  // Step 1: Coarse scan from 1m to 1000m to find safe range
  const coarseSteps = [
    1, 2, 3, 5, 7, 10, 15, 20, 30, 50, 75, 100, 150, 200, 300, 500, 750, 1000
  ];
  let lastSafeL_mm = 0;
  let lastSafeN = 0;
  let firstUnsafeL_mm = 0;

  for (const L_m of coarseSteps) {
    const L_mm = L_m * 1000;
    const ev = evaluateLength(L_mm);
    if (ev.safe) {
      lastSafeL_mm = L_mm;
      lastSafeN = ev.numSupports;
    } else {
      firstUnsafeL_mm = L_mm;
      break;
    }
  }

  // No safe L found at all
  if (lastSafeL_mm === 0) return undefined;

  // Safe all the way to cap
  if (firstUnsafeL_mm === 0) {
    const supports = buildEqualSupports(lastSafeL_mm, lastSafeN);
    const result = solveFEM(E_mpa, I, c, q, lastSafeL_mm, h_mm, supports, true);
    result.warnings.push('FindL: safe up to 1000m cap');
    return { L_m: lastSafeL_mm / 1000, numSupports: lastSafeN, result };
  }

  // Step 2: Bisection between lastSafeL and firstUnsafeL
  let lo = lastSafeL_mm;
  let hi = firstUnsafeL_mm;
  let bestN = lastSafeN;

  for (let iter = 0; iter < 20; iter++) {
    const mid = (lo + hi) / 2;
    if (hi - lo < 10) break; // 10mm precision
    const ev = evaluateLength(mid);
    if (ev.safe) {
      lo = mid;
      bestN = ev.numSupports;
    } else {
      hi = mid;
    }
  }

  // Final full adaptive solve at the safe L
  const finalSupports = buildEqualSupports(lo, bestN);
  const finalResult = solveFEM(E_mpa, I, c, q, lo, h_mm, finalSupports, true);
  finalResult.warnings.push(`FindL: bisection [${(lo/1000).toFixed(2)}, ${(hi/1000).toFixed(2)}] m, ${bestN} supports`);
  return { L_m: lo / 1000, numSupports: bestN, result: finalResult };
}

// ══════════════════════════════════════════════════════════════
// FIND MAX H — with auto-support per candidate
// ══════════════════════════════════════════════════════════════
export function findMaxHFEM(
  E_mpa: number, I: number, c: number, q: number,
  L_mm: number, allowable: number,
): { h_mm: number; numSupports: number; result: FEMResult } | undefined {
  // Helper: evaluate candidate h with auto-support
  function evaluateH(h: number): { safe: boolean; numSupports: number } {
    for (let n = 0; n <= MAX_SUPPORTS; n++) {
      const supports = buildEqualSupports(L_mm, n);
      const stress = solveFEMQuick(E_mpa, I, c, q, L_mm, h, supports);
      if (stress <= allowable) return { safe: true, numSupports: n };
    }
    return { safe: false, numSupports: MAX_SUPPORTS };
  }

  // Check h=0 is feasible
  const ev0 = evaluateH(0);
  if (!ev0.safe) return undefined;

  // Exponential bracket
  let lo = 0, hi = 0;
  let bestN = ev0.numSupports;
  let testH = 100;
  for (let step = 0; step < 15; step++) {
    const ev = evaluateH(testH);
    if (!ev.safe) { hi = testH; break; }
    lo = testH;
    bestN = ev.numSupports;
    testH *= 2;
    if (testH > 100_000) { hi = testH; break; }
  }
  if (hi === 0) {
    // Safe all the way
    const supports = buildEqualSupports(L_mm, bestN);
    const result = solveFEM(E_mpa, I, c, q, L_mm, lo, supports, true);
    return { h_mm: lo, numSupports: bestN, result };
  }

  // Bisection
  for (let iter = 0; iter < 20; iter++) {
    const mid = (lo + hi) / 2;
    if (hi - lo < 0.1) break;
    const ev = evaluateH(mid);
    if (ev.safe) { lo = mid; bestN = ev.numSupports; } else { hi = mid; }
  }

  const finalSupports = buildEqualSupports(L_mm, bestN);
  const finalResult = solveFEM(E_mpa, I, c, q, L_mm, lo, finalSupports, true);
  return { h_mm: lo, numSupports: bestN, result: finalResult };
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
