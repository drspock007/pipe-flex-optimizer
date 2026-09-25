// créé par Giovanni Malagnino, 2026-09-25 00:54 CEST (Europe/Rome, UTC+2)
// Public contract of the fixed-active-set contact regime (V2-2B-1).
// With T = L^4 (mm^4), for a prescribed active set:
//   inactive gap        g_i(T)          = alpha_i + beta_i * T   (mm)
//   scaled active force R_i * L^3 / EI  = gamma_i + delta_i * T  (mm)
// alpha, gamma in mm; beta, delta in mm / mm^4. Reaction in N: R_i = (gamma_i + delta_i T) EI / L^3.
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
  slope: number; // delta or beta (mm / mm^4)
  /** True when both coefficients are zero within tolerance: satisfied for every L. */
  identicallyZero: boolean;
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
      physicalValidity: "not-assessed";
    }
  | { status: "invalid-input"; errors: string[] }
  | { status: "not-implemented"; message: string }
  | { status: "numerical-failure"; message: string };
