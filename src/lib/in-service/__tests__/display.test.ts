import { describe,it,expect } from 'vitest';
import { display,internal,label } from '../display';
import { DEFAULT_SERVICE } from '../types';
import { PIPE_SIZES,WALL_THICKNESS_BY_NPS } from '../../pipe-presets';
import { validate,section } from '../types';
describe('service units and pipe catalogue',()=>{
  it('converts pressure from internal MPa to kPa or psi without changing mechanics',()=>{
    expect(display(2,'pressure','SI')).toBe(2000);
    expect(label('pressure','SI')).toBe('kPa');
    expect(display(2,'pressure','Imperial')).toBeCloseTo(290.0754,3);
    for(const system of ['SI','Imperial'] as const) expect(internal(display(2,'pressure',system),'pressure',system)).toBeCloseTo(2,12);
  });
  it('uses preset coating properties and NPS-dependent thickness in the weight',()=>{
    const i={...DEFAULT_SERVICE,allowablePercent:80,coatingThickness:3,coatingDensity:1800};
    const bare=section({...i,coatingType:'none'}).q;
    expect(section({...i,coatingType:'yellowJacket'}).q-bare).toBeCloseTo(Math.PI*1.09*(168.3+1.09)*950*9.80665e-9,12);
    expect(section({...i,coatingType:'custom'}).q-bare).toBeCloseTo(Math.PI*3*(168.3+3)*1800*9.80665e-9,12);
    expect(section({...i,coatingType:'sp2888'}).q-bare).toBeCloseTo(Math.PI*3*(168.3+3)*1250*9.80665e-9,12);
  });
  it('roundtrips absolute temperature and thermal coefficient correctly',()=>{
    expect(display(20,'C','Imperial')).toBe(68);
    expect(internal(32,'C','Imperial')).toBe(0);
    expect(display(12e-6,'alpha','Imperial')).toBeCloseTo(6.6666666667,8);
    for(const u of ['mm','m','N','MPa','kg/m3','alpha','C'] as const)expect(internal(display(12.345,u,'Imperial'),u,'Imperial')).toBeCloseTo(12.345,10);
  });
  it('accepts every catalogue OD and schedule as a positive annular section',()=>{
    for(const size of PIPE_SIZES)for(const wall of WALL_THICKNESS_BY_NPS[size.nps]){
      const i={...structuredClone(DEFAULT_SERVICE),od:size.od_mm,thickness:wall.wt_mm,allowablePercent:80};
      expect(validate(i)).toHaveLength(0);expect(section(i).I).toBeGreaterThan(0);
    }
    expect(PIPE_SIZES[0].nps).toBe('1/8');expect(PIPE_SIZES.at(-1).nps).toBe('36');
  });
});
