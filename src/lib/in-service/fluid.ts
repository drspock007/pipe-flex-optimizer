/** MPa gauge, degrees C, g/mol. Gas model: rho = p_abs M / (Z R T). */
export const FLUIDS = {
  naturalGas: { label: 'Natural gas', molarMass: 16.04246 },
  air: { label: 'Air (dry)', molarMass: 28.97 },
  hydrogen: { label: 'Hydrogen', molarMass: 2.01588 },
  custom: { label: 'Custom density', molarMass: 0 },
} as const;
export type FluidType = keyof typeof FLUIDS;
export interface FluidInput {
  fluidType?: FluidType; fluidDensity: number; pressure: number; temperature: number;
  gasMolarMass?: number; gasZ?: number; atmosphericPressure?: number;
}
export function gasProperties(i:FluidInput) {
  const type=i.fluidType??'custom';
  return {molarMass:i.gasMolarMass??FLUIDS[type]?.molarMass,
    z:i.gasZ??1,atmosphere:i.atmosphericPressure??0.101325};
}
export function effectiveFluidDensity(i:FluidInput):number {
  if(!i.fluidType||i.fluidType==='custom')return i.fluidDensity;
  const {molarMass,z,atmosphere}=gasProperties(i);
  if(!(molarMass>0&&z>0&&atmosphere>0&&i.temperature>-273.15&&i.pressure>=0))return NaN;
  return (i.pressure+atmosphere)*1e6*(molarMass/1000)/(z*8.31446261815324*(i.temperature+273.15));
}
export function validateFluid(i:FluidInput):string[] {
  if(i.fluidType!==undefined&&!Object.prototype.hasOwnProperty.call(FLUIDS,i.fluidType))return ['Unknown fluid type.'];
  if(!i.fluidType||i.fluidType==='custom')return Number.isFinite(i.fluidDensity)&&i.fluidDensity>=0?[]:['Enter a finite, nonnegative custom fluid density.'];
  const p=gasProperties(i);
  if(![p.molarMass,p.z,p.atmosphere].every(v=>Number.isFinite(v)&&v>0)||!Number.isFinite(i.temperature)||i.temperature<=-273.15)return ['Gas density requires T > absolute zero and positive finite molar mass, Z and atmospheric pressure.'];
  const density=effectiveFluidDensity(i);
  return Number.isFinite(density)&&density>0?[]:['Gas density cannot be resolved for these inputs.'];
}
