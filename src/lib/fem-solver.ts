// ══════════════════════════════════════════════════════════════
// 1D Euler-Bernoulli Beam FEM Solver (Stiffness Method)
// Units: mm, N, MPa throughout
// ══════════════════════════════════════════════════════════════

export interface FEMResult {
  maxStress: number;          // MPa
  maxMoment: number;          // N·mm
  maxMomentLocation: number;  // mm from left end
  stressData: { x: number; stress: number }[];  // x in meters
  displacements: number[];    // full DOF vector
  nodePositions: number[];    // mm
}

// ── Standard 4×4 Euler-Bernoulli beam element stiffness matrix ──
// k = (EI/Le³) * [[12, 6Le, -12, 6Le],
//                  [6Le, 4Le², -6Le, 2Le²],
//                  [-12, -6Le, 12, -6Le],
//                  [6Le, 2Le², -6Le, 4Le²]]
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
  const nDof = nNodes * 2; // each node: [w, theta]
  const K: number[][] = Array.from({ length: nDof }, () => new Array(nDof).fill(0));
  const F: number[] = new Array(nDof).fill(0);

  for (const el of elements) {
    const ke = elementStiffness(EI, el.Le);
    const fe = elementLoad(q, el.Le);
    // DOF mapping: node1 -> [2*node1, 2*node1+1], node2 -> [2*node2, 2*node2+1]
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
  // Augmented matrix
  const M: number[][] = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    // Partial pivoting
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

    // Eliminate below
    for (let row = col + 1; row < n; row++) {
      const factor = M[row][col] / M[col][col];
      for (let j = col; j <= n; j++) {
        M[row][j] -= factor * M[col][j];
      }
    }
  }

  // Back substitution
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
// For each constrained DOF, we set K[i][i] = PENALTY, F[i] = PENALTY * value
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

// ── Compute element internal moment at local position xi (0..Le) ──
// Using Hermite shape functions:
//   N1(xi) = 1 - 3(xi/L)² + 2(xi/L)³
//   N2(xi) = xi(1 - xi/L)²
//   N3(xi) = 3(xi/L)² - 2(xi/L)³
//   N4(xi) = xi²/L(xi/L - 1)
//
// M(xi) = EI * d²w/dx² = EI * [N1''w1 + N2''θ1 + N3''w2 + N4''θ2]
//
// N1'' = (-6 + 12xi/L) / L²
// N2'' = (-4 + 6xi/L) / L
// N3'' = (6 - 12xi/L) / L²
// N4'' = (-2 + 6xi/L) / L
function elementMoment(
  EI: number, Le: number,
  w1: number, t1: number, w2: number, t2: number,
  xi: number
): number {
  const s = xi / Le; // normalized coordinate
  const L2 = Le * Le;

  const N1pp = (-6 + 12 * s) / L2;
  const N2pp = (-4 + 6 * s) / Le;
  const N3pp = (6 - 12 * s) / L2;
  const N4pp = (-2 + 6 * s) / Le;

  return EI * (N1pp * w1 + N2pp * t1 + N3pp * w2 + N4pp * t2);
}

// ══════════════════════════════════════════════════════════════
// MAIN FEM SOLVER
// ══════════════════════════════════════════════════════════════
export function solveFEM(
  E_mpa: number,
  I_mm4: number,
  c_mm: number,
  q_Nmm: number,        // N/mm distributed load (self-weight)
  L_total_mm: number,    // total pipe length in mm
  h_total_mm: number,    // total settlement at right end in mm
  supportPositions_mm: number[], // positions of intermediate supports in mm
): FEMResult {
  const EI = E_mpa * I_mm4;

  // ── Build node list ──
  // Nodes at: 0, each support, L_total
  const nodeX = [0, ...supportPositions_mm, L_total_mm].sort((a, b) => a - b);
  // Remove duplicates
  const uniqueNodeX: number[] = [];
  for (const x of nodeX) {
    if (uniqueNodeX.length === 0 || Math.abs(x - uniqueNodeX[uniqueNodeX.length - 1]) > 0.01) {
      uniqueNodeX.push(x);
    }
  }

  const nNodes = uniqueNodeX.length;
  const nElements = nNodes - 1;

  // ── Build elements ──
  const elements: { node1: number; node2: number; Le: number }[] = [];
  for (let i = 0; i < nElements; i++) {
    elements.push({
      node1: i,
      node2: i + 1,
      Le: uniqueNodeX[i + 1] - uniqueNodeX[i],
    });
  }

  // ── Assemble ──
  const { K, F } = assembleSystem(nNodes, elements, EI, q_Nmm);

  // ── Boundary conditions ──
  const constraints: { dof: number; value: number }[] = [];

  // Left end fixed: w(0) = 0, theta(0) = 0
  constraints.push({ dof: 0, value: 0 });  // w at node 0
  constraints.push({ dof: 1, value: 0 });  // theta at node 0

  // Right end fixed: w(L) = h_total, theta(L) = 0
  const rightNode = nNodes - 1;
  constraints.push({ dof: 2 * rightNode, value: h_total_mm });     // w at right
  constraints.push({ dof: 2 * rightNode + 1, value: 0 });           // theta at right

  // Intermediate supports: w(xi) = linear settlement, theta free
  // Linear settlement line: w(x) = (h_total / L_total) * x
  for (let i = 1; i < nNodes - 1; i++) {
    const x = uniqueNodeX[i];
    // Check if this node is a support
    const isSupport = supportPositions_mm.some(sp => Math.abs(sp - x) < 0.01);
    if (isSupport) {
      const w_imposed = (h_total_mm / L_total_mm) * x;
      constraints.push({ dof: 2 * i, value: w_imposed }); // w only, theta is free
    }
  }

  // ── Apply BC and solve ──
  applyBC(K, F, constraints);
  const U = solveLinearSystem(K, F);

  // ── Post-process: compute stress distribution ──
  const totalPoints = 200;
  const stressData: { x: number; stress: number }[] = [];
  let maxStress = 0;
  let maxMoment = 0;
  let maxMomentLocation = 0;

  for (let pt = 0; pt <= totalPoints; pt++) {
    const x_mm = (pt / totalPoints) * L_total_mm;

    // Find which element this point belongs to
    let elIdx = 0;
    for (let i = 0; i < nElements; i++) {
      if (x_mm >= uniqueNodeX[i] && x_mm <= uniqueNodeX[i + 1]) {
        elIdx = i;
        break;
      }
    }
    // Handle right boundary
    if (x_mm >= L_total_mm - 0.01) elIdx = nElements - 1;

    const el = elements[elIdx];
    const xi = x_mm - uniqueNodeX[el.node1]; // local coordinate

    const w1 = U[2 * el.node1];
    const t1 = U[2 * el.node1 + 1];
    const w2 = U[2 * el.node2];
    const t2 = U[2 * el.node2 + 1];

    const M = elementMoment(EI, el.Le, w1, t1, w2, t2, xi);
    const stress = (Math.abs(M) * c_mm) / I_mm4;

    if (stress > maxStress) {
      maxStress = stress;
      maxMoment = Math.abs(M);
      maxMomentLocation = x_mm;
    }

    stressData.push({
      x: Math.round((x_mm / 1000) * 1000) / 1000, // convert to meters, round
      stress: Math.round(stress * 100) / 100,
    });
  }

  return {
    maxStress,
    maxMoment,
    maxMomentLocation,
    stressData,
    displacements: U,
    nodePositions: uniqueNodeX,
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

  for (let n = 0; n <= 100; n++) {
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

  // Return best found even if not safe
  return { numSupports: bestN, stress: bestStress, result: bestResult! };
}

// ══════════════════════════════════════════════════════════════
// FIND MAX L — scan approach (non-monotonic, can't bisect)
// For each support count, scan L from large to small to find max safe L
// ══════════════════════════════════════════════════════════════
export function findMaxLFEM(
  E_mpa: number, I: number, c: number, q: number,
  h_mm: number, allowable: number,
): { L_m: number; numSupports: number; result: FEMResult } | undefined {
  for (let n = 0; n <= 100; n++) {
    // Scan L from a large value down, then refine
    // Start with coarse scan
    const L_max_mm = 500_000; // 500m max
    const L_min_mm = 1_000;   // 1m min
    const coarseSteps = 200;
    
    let bestL = 0;
    
    // Coarse scan: find largest L where stress <= allowable
    for (let step = 0; step <= coarseSteps; step++) {
      const L_mm = L_min_mm + (step / coarseSteps) * (L_max_mm - L_min_mm);
      const supports = buildEqualSupports(L_mm, n);
      const result = solveFEM(E_mpa, I, c, q, L_mm, h_mm, supports);
      if (result.maxStress <= allowable) {
        bestL = L_mm;
      }
    }

    if (bestL <= 0) continue;

    // Refine: binary search in the neighborhood of bestL
    let lo = bestL;
    let hi = Math.min(bestL + (L_max_mm - L_min_mm) / coarseSteps, L_max_mm);
    
    // Verify hi is indeed unsafe (otherwise extend)
    {
      const supports = buildEqualSupports(hi, n);
      const result = solveFEM(E_mpa, I, c, q, hi, h_mm, supports);
      if (result.maxStress <= allowable) {
        // Still safe at hi; extend search
        hi = Math.min(hi * 2, L_max_mm);
      }
    }

    for (let iter = 0; iter < 50; iter++) {
      const mid = (lo + hi) / 2;
      if (hi - lo < 1) break; // 1mm precision
      const supports = buildEqualSupports(mid, n);
      const result = solveFEM(E_mpa, I, c, q, mid, h_mm, supports);
      if (result.maxStress <= allowable) {
        lo = mid;
      } else {
        hi = mid;
      }
    }

    const finalSupports = buildEqualSupports(lo, n);
    const finalResult = solveFEM(E_mpa, I, c, q, lo, h_mm, finalSupports);
    
    console.log(`[FEM findL] n=${n} L_max=${(lo/1000).toFixed(2)}m σ=${finalResult.maxStress.toFixed(2)} MPa`);
    
    return { L_m: lo / 1000, numSupports: n, result: finalResult };
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
  for (let n = 0; n <= 100; n++) {
    // Binary search on h
    let lo = 0;
    let hi = 100_000; // 100m max settlement
    
    // Check if h=0 is already unsafe (self-weight alone exceeds allowable)
    const supports0 = buildEqualSupports(L_mm, n);
    const result0 = solveFEM(E_mpa, I, c, q, L_mm, 0, supports0);
    if (result0.maxStress > allowable) continue; // need more supports

    for (let iter = 0; iter < 60; iter++) {
      const mid = (lo + hi) / 2;
      if (hi - lo < 0.01) break; // 0.01mm precision
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
