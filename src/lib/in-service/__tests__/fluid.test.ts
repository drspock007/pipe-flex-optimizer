import { describe,it,expect } from 'vitest';
import { DEFAULT_SERVICE, section, validate } from '../types';
import { effectiveFluidDensity } from '../fluid';
import { internal,display } from '../display';
const base={...DEFAULT_SERVICE,allowablePercent:80};
describe('operating fluid density',()=>{
  it('uses absolute pressure at zero gauge for dry air and hydrogen',()=>{
    expect(effectiveFluidDensity({...base,fluidType:'air',pressure:0,temperature:20})).toBeCloseTo(1.20432,4);
    expect(effectiveFluidDensity({...base,fluidType:'hydrogen',pressure:0,temperature:0})).toBeCloseTo(0.08994,4);
  });
  it('updates with pressure, absolute temperature, composition and Z',()=>{
    const i={...base,fluidType:'naturalGas' as const,pressure:0,temperature:20};
    const rho=effectiveFluidDensity(i);
    expect(effectiveFluidDensity({...i,pressure:0.101325})).toBeCloseTo(2*rho,12);
    expect(effectiveFluidDensity({...i,temperature:313.15})).toBeCloseTo(rho/2,12);
    expect(effectiveFluidDensity({...i,gasZ:0.8})).toBeCloseTo(rho/0.8,12);
    expect(effectiveFluidDensity({...i,gasMolarMass:32.08492})).toBeCloseTo(2*rho,12);
  });
  it('keeps custom density and legacy inputs independent of pressure and temperature',()=>{
    expect(effectiveFluidDensity({...base,fluidType:undefined})).toBe(40);
    expect(effectiveFluidDensity({...base,pressure:10,temperature:80,gasZ:NaN})).toBe(40);
    expect(validate({...base,gasZ:NaN})).toEqual([]);
  });
  it('rejects invalid gas inputs instead of producing a usable weight',()=>{
    for(const patch of [{temperature:-273.15},{gasZ:0},{gasZ:NaN},{gasMolarMass:-1},{atmosphericPressure:0}]){
      expect(validate({...base,fluidType:'air',...patch}).length).toBeGreaterThan(0);
    }
  });
  it('uses calculated density in distributed weight and preserves SI/imperial equivalence',()=>{
    const i={...base,fluidType:'hydrogen' as const};
    const density=effectiveFluidDensity(i);
    expect(section(i).q).toBeCloseTo(section({...i,fluidType:'custom',fluidDensity:density}).q,12);
    expect(effectiveFluidDensity({...i,pressure:internal(display(2,'pressure','Imperial'),'pressure','Imperial'),temperature:internal(68,'C','Imperial')})).toBeCloseTo(density,7);
  });
});
