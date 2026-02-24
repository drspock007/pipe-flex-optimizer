// ══════════════════════════════════════════════════════════════
// 1D Euler-Bernoulli Beam FEM Solver (Stiffness Method)
// Units: mm, N, MPa throughout
// ══════════════════════════════════════════════════════════════

export interface FEMResult {
  maxStress: number;          // MPa
  maxMoment: number;          // N·mm
  maxMomentLocation: number;  // mm from left end
  stressData: { x: number; stress: number }[];  // x in meters, stress in MPa
  deflectionData: { x: number; w: number }[];   // x in meters, w in mm
  displacements: number[];    // full DOF vector
  nodePositions: number[];    // mm
}

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

// ── Consistent nodal load vector for UDL q (N/mm) on element of length Le ──
// f = [qLe/2, qLe²/12, qLe/2, -qLe²/12]
function elementLoad(q: number, Le: number): number[] {
  const qL = q * Le;
  const qL2 = qL * Le;
  return [qL / 2, qL2 / 12, qL / 2, -qL2 / 12];
}

// ── Assemble global system ──
function assembleSystem(
  nNodes: number,
  elements: { node1: number; node2: number; Le: number }[],
  EI: number,
  q: number,
): { K: number[][]; F: number[] } {
  const nDof = nNodes * 2;
  const K: number[][] = Array.from({ length: nDof }, () => new Array(nDof).fill(0));
  const F: number[] = new Array(nDof).fill(0);

  for (const el of elements) {
    const ke = elementStiffness(EI, el.Le);
    const fe = elementLoad(q, el.Le);
    const dofs = [2 * el.node1, 2 * el.node1 + 1, 2 * el.node2, 2 * el.node2 + 1];

    for (let i = 0; i < 4; i++) {
      F[dofs[i]] += fe[i];
      for (let j = 0; j < 4; j++) {
        K[dofs[i]][dofs[j]] += ke[i][j];
      }
    }
  }
  return { K, F };
}

// ── Solve linear system Ax=b using Gaussian elimination with partial pivoting ──
function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M: number[][] = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let maxVal = Math.abs(M[col][col]);
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > maxVal) {
        maxVal = Math.abs(M[row][col]);
        maxRow = row;
      }
    }
    [M[col], M[maxRow]] = [M[maxRow], M[col]];

    if (Math.abs(M[col][col]) < 1e-30) {
      console.warn(`[FEM] Near-singular matrix at col ${col}`);
      continue;
    }

    for (let row = col + 1; row < n; row++) {
      const factor = M[row][col] / M[col][col];
      for (let j = col; j <= n; j++) {
        M[row][j] -= factor * M[col][j];
      }
    }
  }

  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = M[i][n];
    for (let j = i + 1; j < n; j++) {
      sum -= M[i][j] * x[j];
    }
    x[i] = sum / M[i][i];
  }
  return x;
}

// ── Apply boundary conditions using penalty method ──
function applyBC(
  K: number[][], F: number[],
  constraints: { dof: number; value: number }[]
): void {
  const PENALTY = 1e30;
  for (const { dof, value } of constraints) {
    K[dof][dof] = PENALTY;
    F[dof] = PENALTY * value;
  }
}

// ── Compute element internal moment using Hermite shape function 2nd derivatives ──
// M(xi) = EI * w''(xi)
// N1'' = (-6 + 12*s) / Le²
// N2'' = (-4 + 6*s) / Le
// N3'' = (6 - 12*s) / Le²
// N4'' = (-2 + 6*s) / Le
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

// ── Build mesh: subdivide each span into sub-elements for accuracy ──
function buildMesh(
  supportPositions_mm: number[],
  L_total_mm: number,
  minElementsPerSpan: number = 8,
): number[] {
  const anchors = [0, ...supportPositions_mm, L_total_mm].sort((a, b) => a - b);
  // Remove duplicates
  const unique: number[] = [];
  for (const x of anchors) {
    if (unique.length === 0 || Math.abs(x - unique[unique.length - 1]) > 0.01) {
      unique.push(x);
    }
  }

  // Subdivide each span
  const nodeX: number[] = [unique[0]];
  for (let i = 0; i < unique.length - 1; i++) {
    const spanLen = unique[i + 1] - unique[i];
    const nSub = Math.max(minElementsPerSpan, Math.ceil(spanLen / 500)); // at least 1 element per 500mm
    for (let j = 1; j <= nSub; j++) {
      nodeX.push(unique[i] + (j / nSub) * spanLen);
    }
  }

  return nodeX;
}

// ══════════════════════════════════════════════════════════════
// MAIN FEM SOLVER
// All inputs MUST be in mm, N, MPa
// ══════════════════════════════════════════════════════════════
export function solveFEM(
  E_mpa: number,
  I_mm4: number,
  c_mm: number,
  q_Nmm: number,        // N/mm distributed load
  L_total_mm: number,    // total pipe length in mm
  h_total_mm: number,    // total settlement at right end in mm
  supportPositions_mm: number[], // positions of intermediate supports in mm
): FEMResult {
  console.log(`[FEM] L_mm=${L_total_mm}, q_Nmm=${q_Nmm.toFixed(6)}, h_mm=${h_total_mm}, E=${E_mpa}, I=${I_mm4.toExponential(4)}`);

  const EI = E_mpa * I_mm4;

  // ── Build mesh with subdivisions ──
  const nodeX = buildMesh(supportPositions_mm, L_total_mm);
  const nNodes = nodeX.length;
  const nElements = nNodes - 1;

  // ── Build elements ──
  const elements: { node1: number; node2: number; Le: number }[] = [];
  for (let i = 0; i < nElements; i++) {
    elements.push({
      node1: i,
      node2: i + 1,
      Le: nodeX[i + 1] - nodeX[i],
    });
  }

  // ── Assemble ──
  const { K, F } = assembleSystem(nNodes, elements, EI, q_Nmm);

  // ── Boundary conditions ──
  const constraints: { dof: number; value: number }[] = [];

  // Left end fixed: w(0) = 0, theta(0) = 0
  constraints.push({ dof: 0, value: 0 });
  constraints.push({ dof: 1, value: 0 });

  // Right end fixed: w(L) = h_total, theta(L) = 0
  const rightNode = nNodes - 1;
  constraints.push({ dof: 2 * rightNode, value: h_total_mm });
  constraints.push({ dof: 2 * rightNode + 1, value: 0 });

  // Intermediate supports: w(xi) = linear settlement, theta free
  for (let i = 1; i < nNodes - 1; i++) {
    const x = nodeX[i];
    const isSupport = supportPositions_mm.some(sp => Math.abs(sp - x) < 0.01);
    if (isSupport) {
      const w_imposed = (h_total_mm / L_total_mm) * x;
      constraints.push({ dof: 2 * i, value: w_imposed });
    }
  }

  // ── Apply BC and solve ──
  applyBC(K, F, constraints);
  const U = solveLinearSystem(K, F);

  // ── Post-process ──
  const totalPoints = 200;
  const stressData: { x: number; stress: number }[] = [];
  const deflectionData: { x: number; w: number }[] = [];
  let maxStress = 0;
  let maxMoment = 0;
  let maxMomentLocation = 0;

  for (let pt = 0; pt <= totalPoints; pt++) {
    const x_mm = (pt / totalPoints) * L_total_mm;

    // Find element
    let elIdx = 0;
    for (let i = 0; i < nElements; i++) {
      if (x_mm >= nodeX[i] && x_mm <= nodeX[i + 1]) {
        elIdx = i;
        break;
      }
    }
    if (x_mm >= L_total_mm - 0.01) elIdx = nElements - 1;

    const el = elements[elIdx];
    const xi = x_mm - nodeX[el.node1];

    const w1 = U[2 * el.node1];
    const t1 = U[2 * el.node1 + 1];
    const w2 = U[2 * el.node2];
    const t2 = U[2 * el.node2 + 1];

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

  console.log(`[FEM RESULT] maxMoment=${maxMoment.toExponential(4)} N·mm at x=${maxMomentLocation.toFixed(1)} mm, maxStress=${maxStress.toFixed(2)} MPa`);

  return {
    maxStress,
    maxMoment,
    maxMomentLocation,
    stressData,
    deflectionData,
    displacements: U,
    nodePositions: nodeX,
  };
}

// ══════════════════════════════════════════════════════════════
// AUTO-SUPPORT: iterate 0..100 supports (equally spaced)
// ══════════════════════════════════════════════════════════════
export function autoSupportsFEM(
  E_mpa: number, I: number, c: number, q: number,
  L_mm: number, h_mm: number, allowable: number,
): { numSupports: number; stress: number; result: FEMResult } {
  let bestN = 0;
  let bestStress = Infinity;
  let bestResult: FEMResult | null = null;

  for (let n = 0; n <= 20; n++) {
    const supports = buildEqualSupports(L_mm, n);
    const result = solveFEM(E_mpa, I, c, q, L_mm, h_mm, supports);

    console.log(`[FEM AUTO] n=${n} σ_max=${result.maxStress.toFixed(2)} MPa (allowable=${allowable.toFixed(2)})`);

    if (result.maxStress <= allowable) {
      return { numSupports: n, stress: result.maxStress, result };
    }

    if (result.maxStress < bestStress) {
      bestStress = result.maxStress;
      bestN = n;
      bestResult = result;
    }
  }

  return { numSupports: bestN, stress: bestStress, result: bestResult! };
}

// ══════════════════════════════════════════════════════════════
// FIND MAX L — bracket + bisection
// ══════════════════════════════════════════════════════════════
export function findMaxLFEM(
  E_mpa: number, I: number, c: number, q: number,
  h_mm: number, allowable: number,
): { L_m: number; numSupports: number; result: FEMResult } | undefined {
  for (let n = 0; n <= 20; n++) {
    // Find bracket: L_low is safe, L_high is unsafe
    // Start small and grow exponentially
    let L_low_mm = 0;
    let L_high_mm = 0;
    let foundBracket = false;

    // Check if L=1m is safe
    const L_start = 1000; // 1m in mm
    const supStart = buildEqualSupports(L_start, n);
    const resStart = solveFEM(E_mpa, I, c, q, L_start, h_mm, supStart);
    
    if (resStart.maxStress > allowable) {
      // Even 1m is unsafe with n supports, try more supports
      continue;
    }

    L_low_mm = L_start;

    // Grow exponentially to find upper bound
    let L_test = L_start * 2;
    for (let step = 0; step < 30; step++) {
      const sup = buildEqualSupports(L_test, n);
      const res = solveFEM(E_mpa, I, c, q, L_test, h_mm, sup);
      if (res.maxStress > allowable) {
        L_high_mm = L_test;
        foundBracket = true;
        break;
      }
      L_low_mm = L_test;
      L_test *= 2;
      if (L_test > 1_000_000) { // 1000m cap
        L_high_mm = L_test;
        foundBracket = true;
        break;
      }
    }

    if (!foundBracket) continue;

    // Bisection
    for (let iter = 0; iter < 50; iter++) {
      const mid = (L_low_mm + L_high_mm) / 2;
      if (L_high_mm - L_low_mm < 10) break; // 10mm precision
      const sup = buildEqualSupports(mid, n);
      const res = solveFEM(E_mpa, I, c, q, mid, h_mm, sup);
      if (res.maxStress <= allowable) {
        L_low_mm = mid;
      } else {
        L_high_mm = mid;
      }
    }

    const finalSup = buildEqualSupports(L_low_mm, n);
    const finalRes = solveFEM(E_mpa, I, c, q, L_low_mm, h_mm, finalSup);

    console.log(`[FEM findL] n=${n} L_max=${(L_low_mm / 1000).toFixed(2)}m σ=${finalRes.maxStress.toFixed(2)} MPa`);

    return { L_m: L_low_mm / 1000, numSupports: n, result: finalRes };
  }
  return undefined;
}

// ══════════════════════════════════════════════════════════════
// FIND MAX H — for given L, find max h such that stress <= allowable
// ══════════════════════════════════════════════════════════════
export function findMaxHFEM(
  E_mpa: number, I: number, c: number, q: number,
  L_mm: number, allowable: number,
): { h_mm: number; numSupports: number; result: FEMResult } | undefined {
  for (let n = 0; n <= 20; n++) {
    const supports0 = buildEqualSupports(L_mm, n);
    const result0 = solveFEM(E_mpa, I, c, q, L_mm, 0, supports0);
    if (result0.maxStress > allowable) continue;

    let lo = 0;
    let hi = 100_000;

    for (let iter = 0; iter < 60; iter++) {
      const mid = (lo + hi) / 2;
      if (hi - lo < 0.01) break;
      const supports = buildEqualSupports(L_mm, n);
      const result = solveFEM(E_mpa, I, c, q, L_mm, mid, supports);
      if (result.maxStress <= allowable) {
        lo = mid;
      } else {
        hi = mid;
      }
    }

    const finalSupports = buildEqualSupports(L_mm, n);
    const finalResult = solveFEM(E_mpa, I, c, q, L_mm, lo, finalSupports);

    console.log(`[FEM findH] n=${n} h_max=${lo.toFixed(2)}mm σ=${finalResult.maxStress.toFixed(2)} MPa`);

    return { h_mm: lo, numSupports: n, result: finalResult };
  }
  return undefined;
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
