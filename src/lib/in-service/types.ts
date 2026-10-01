import {validateSag,type SagProfile,type SagAssessment} from './sag-profile';
import {validatePermanent,type PermanentProfile} from './permanent/profile';
import type {PermanentResult} from './permanent/sequence';
import type { CsaProfile, CsaAssessment } from './csa';
import { validateSupports, type SupportLayout, type SupportContact } from './supports';
import { effectiveFluidDensity, validateFluid, type FluidType } from './fluid';
import { effectiveCoating, COATING_LABELS, type CoatingType } from '../coating-presets';
import { findNpsByOd } from '../pipe-presets';
export const MODEL_VERSION = 'in-service-steel-2';
export type Direction = 'vertical' | 'horizontal' | 'combined';
export type Mode = 'direct' | 'length' | 'displacement' | 'supports';
export interface Scenario { id: string; name: string; referenceTemperature: number; extraAxial: number }
/** All lengths mm; forces N; stress and E MPa; temperatures C. */
export interface ServiceInput {
  analysis?: 'movement' | 'sag'; sag?: SagProfile;
  intervention?: 'temporary' | 'permanent'; permanent?: PermanentProfile;
  csa?: CsaProfile;
  od: number; thickness: number; E: number; yield: number; nu: number; alpha: number;
  steelDensity: number; fluidDensity: number; coatingThickness: number; coatingDensity: number;
  supports?: SupportLayout; maxSupports?: number;
  coatingType?: CoatingType;
  fluidType?: FluidType; gasMolarMass?: number; gasZ?: number; atmosphericPressure?: number;
  pressure: number; temperature: number; halfLength: number;
  direction: Direction; angle: number; displacement: number;
  allowablePercent: number; scenarios: Scenario[];
  mode: Mode; minHalfLength: number; maxHalfLength: number; maxDisplacement: number;
}
export const DEFAULT_SERVICE: ServiceInput = {
  od: 168.3, thickness: 7.11, E: 207000, yield: 359, nu: 0.3, alpha: 12e-6,
  steelDensity: 7850, fluidDensity: 40, fluidType: 'custom', coatingType: 'none', coatingThickness: 0, coatingDensity: 950,
  pressure: 2, temperature: 20, halfLength: 10000, direction: 'vertical', angle: 90,
  displacement: 200, allowablePercent: 50, mode: 'direct',
  minHalfLength: 1000, maxHalfLength: 50000, maxDisplacement: 500,
  scenarios: [{ id: 'base', name: 'Initial-state hypothesis 1', referenceTemperature: 20, extraAxial: 0 }],
};
export interface Section { ro: number; ri: number; A: number; Ai: number; I: number; EI: number; EA: number; q: number; a: number; b: number }
export type Status = 'pass' | 'fail' | 'unstable' | 'out-of-domain' | 'numerical-failure' | 'uncertain' | 'invalid';
export interface ShapePoint { x: number; z: number; y: number }
export interface Stage {
  sagMax?:number; sagX?:number;
  supports?: SupportContact[]; contactIterations?: number;
  phase: 'initial' | 'excavation' | 'displacement' | 'return' | 'restoration'; fraction: number;
  vm: number; normalVm: number; x: number; shearX: number; element: [number, number];
  N: number; wall: number; midZ: number; midY: number; forceZ: number; forceY: number;
  leftZ: number; rightZ: number; leftY: number; rightY: number;
  leftMz: number; rightMz: number; leftMy: number; rightMy: number;
  maxSlope: number; residual: number; shape: ShapePoint[];
}
export interface Refinement { supportReactions?:number[]; supportGaps?:number[]; contactEventsResolved?:boolean; elements: number; increments: number; vm: number; maxForce: number; sag: number; change: number }
export interface ScenarioResult {
  sag?:SagAssessment;
  scenario: Scenario; status: Status; message: string; N0: number; wall0: number; criticalLoad: number;
  worst?: Stage; excavated?: Stage; target?: Stage; stages: Stage[]; refinement: Refinement[];
  stressUncertainty: number; utilization?: number;
}
export interface CaseResult { halfLength: number; displacement: number; status: Status; scenarios: ScenarioResult[]; supportPositions?:number[]; governing?: string }
export interface SearchSample { value: number; status: Status; maxUtilization: number | null }
export interface ServiceReport {
  permanent?: PermanentResult;
  csa?: CsaAssessment;
  version: string; createdAt: string; input: ServiceInput; errors: string[];
  result?: CaseResult; samples: SearchSample[]; candidate?: number; budgetExhausted: boolean;
  boundReached: boolean; message: string; elapsedMs: number;
}
export function validate(i: ServiceInput): string[] {
  const errors: string[] = [...validateFluid(i),...(i.analysis==='sag'?validateSag(i):[...validateSupports(i),...validatePermanent(i)])];
  if (i.coatingType!==undefined && !Object.prototype.hasOwnProperty.call(COATING_LABELS,i.coatingType)) errors.push('Unknown coating type.');
  const nums = Object.entries(i).filter(([k]) => !['analysis', 'sag', ...(i.analysis==='sag'?['angle','displacement','maxDisplacement','halfLength','minHalfLength','maxHalfLength']:[]), 'intervention', 'permanent', 'csa', 'scenarios', 'mode', 'direction', 'coatingType', 'fluidType', 'fluidDensity', 'gasMolarMass', 'gasZ', 'atmosphericPressure', 'supports', 'maxSupports'].includes(k));
  if (nums.some(([,v]) => typeof v !== 'number' || !Number.isFinite(v))) errors.push('Enter finite values, including an explicit custom allowable percentage.');
  if (!(i.od > 0 && i.thickness > 0 && 2*i.thickness < i.od)) errors.push('Require 0 < 2t < outside diameter.');
  if (!(i.E > 0 && i.yield > 0 && i.nu >= 0 && i.nu < 0.5 && i.alpha >= 0)) errors.push('Invalid elastic steel properties.');
  if ([i.pressure, i.steelDensity, i.coatingThickness, i.coatingDensity, ...(i.analysis==='sag'?[]:[i.displacement, i.maxDisplacement])].some(x => x < 0)) errors.push('Pressure, densities, thickness and displacement amplitudes must be nonnegative.');
  if (!(i.analysis==='sag'?(i.mode==='direct'?Number.isFinite(i.halfLength)&&i.halfLength>0:[i.minHalfLength,i.maxHalfLength].every(Number.isFinite)&&i.minHalfLength>0&&i.maxHalfLength>i.minHalfLength):(i.halfLength > 0 && i.minHalfLength > 0 && i.maxHalfLength > i.minHalfLength))) errors.push('Require positive length and increasing search bounds.');
  if (i.mode==='displacement' && !(i.maxDisplacement>0)) errors.push('Displacement search requires a positive upper amplitude bound.');
  if (!(i.allowablePercent > 0 && i.allowablePercent <= 100)) errors.push('Elastic custom threshold must be above 0 and at most 100% of yield.');
  if (i.analysis!==undefined&&!['movement','sag'].includes(i.analysis))errors.push('Unknown analysis type.');
  if (!['direct','length','displacement','supports'].includes(i.mode) || (i.analysis!=='sag'&&!['vertical','horizontal','combined'].includes(i.direction))) errors.push('Unknown calculation mode or direction.');
  if (!i.scenarios.length || i.scenarios.length > 12) errors.push('Provide 1 to 12 scenarios.');
  if (new Set(i.scenarios.map(s => s.id)).size !== i.scenarios.length) errors.push('Scenario identifiers must be unique.');
  if (i.scenarios.some(s => !s.name.trim() || !Number.isFinite(s.referenceTemperature) || !Number.isFinite(s.extraAxial))) errors.push('Each scenario needs a name, reference temperature and finite extra axial force.');
  return errors;
}
export function serviceCoating(i:ServiceInput) {
  return effectiveCoating(i.coatingType??'custom',i.coatingThickness,i.coatingDensity,findNpsByOd(i.od));
}
export function section(i: ServiceInput): Section {
  const ro=i.od/2, ri=ro-i.thickness, A=Math.PI*(ro-ri)*(ro+ri), Ai=Math.PI*ri*ri;
  const I=A*(ro*ro+ri*ri)/4, a=i.pressure*Ai/A, b=a*ro*ro;
  const coat=serviceCoating(i), coatA=Math.PI*coat.thickness*(i.od+coat.thickness);
  const q=(A*i.steelDensity+Ai*effectiveFluidDensity(i)+coatA*coat.density)*9.80665e-9;
  return {ro,ri,A,Ai,I,EI:i.E*I,EA:i.E*A,q,a,b};
}
export function initialForces(i: ServiceInput,s: Scenario, p=section(i)) {
  const wall=2*i.nu*i.pressure*p.Ai-p.EA*i.alpha*(i.temperature-s.referenceTemperature)+s.extraAxial;
  return {wall, effective:wall-i.pressure*p.Ai};
}
export function targetComponents(i: ServiceInput): {z: number|null; y: number|null} {
  if(i.direction==='vertical') return {z:i.displacement*(i.angle<0?-1:1),y:null};
  if(i.direction==='horizontal') return {z:null,y:i.displacement*(i.angle<0?-1:1)};
  const a=i.angle*Math.PI/180;
  return {z:i.displacement*Math.sin(a),y:i.displacement*Math.cos(a)};
}
