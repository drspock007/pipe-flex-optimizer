// créé par Giovanni Malagnino, 2026-09-25 00:54 CEST (Europe/Rome, UTC+2)
// Modifié par Giovanni malagnino, 2026-09-25 01:04 CEST (Europe/Rome, UTC+2)
// Public contract of the fixed-active-set contact regime (V2-2B-1, V2-2B).
// With T = L^4 (mm^4), for a prescribed active set:
//   inactive gap        g_i(T)          = alpha_i + beta_i * T   (mm)
//   scaled active force R_i * L^3 / EI  = gamma_i + delta_i * T  (mm)
// alpha, gamma in mm; beta, delta in mm / mm^4. Reaction in N: R_i = (gamma_i + delta_i T) EI / L^3.
// Scaled form (always representable): with Lambda = T q / EI = (L / Lq)^4,
// Lq = (EI/q)^(1/4), the slope per unit Lambda is scaledSlope (mm).
// Physical validity is not assessed. Non-finite bounds are null, never Infinity.

import { BiaxialInput } from "./types";

export type RegimeInput = Omit<BiaxialInput, "L"> & {
  /** 1-based indices of the supports imposed as active (at their contact level). */
  activeSet: number[];
};

export interface RegimeConstraint {
  kind: "reaction" | "gap";
  support: number; // 1-based
  constant: number; // gamma or alpha (mm)
  /** delta or beta (mm / mm^4); 0 when not representable, see slopeRepresentable. */
  slope: number;
  /** Slope per unit Lambda (mm); 0 when q = 0. Used for all interval computations. */
  scaledSlope: number;
  /** False when slope = scaledSlope * q / EI under/overflows in double precision. */
  slopeRepresentable: boolean;
  /** True when both coefficients are zero within tolerance: satisfied for every L. */
  identicallyZero: boolean;
  /** Coefficients set to zero because they are below their own rounding-error estimate. */
  roundingZero: { constant: boolean; slope: boolean };
  /** A kept coefficient is close to its rounding-error estimate: its sign is uncertain. */
  signUncertain: boolean;
}

export interface RegimeEvent {
  kind: "reaction-zero" | "gap-zero";
  support: number;
}

export interface RegimeBound {
  /** Finite length in mm, or null when not finite. */
  value: number | null;
  included: boolean;
  kind: "finite" | "zero-excluded" | "unbounded";
  /** All constraints vanishing at this bound (several = simultaneous events). */
  events: RegimeEvent[];
}

export interface RegimeInterval {
  status: "interval" | "single-point" | "empty";
  lower: RegimeBound | null; // null when empty
  upper: RegimeBound | null;
}

export type RegimeResult =
  | {
      status: "ok";
      numSupports: number;
      activeSet: number[];
      constraints: RegimeConstraint[];
      interval: RegimeInterval;
      /** Lq = (EI/q)^(1/4) in mm, null when q = 0. */
      loadLengthScale: number | null;
      /** True when a sign-uncertain coefficient decides the interval. */
      ambiguous: boolean;
      physicalValidity: "not-assessed";
    }
  | { status: "invalid-input"; errors: string[] }
  | { status: "not-implemented"; message: string }
  | { status: "numerical-failure"; message: string };
