import { describe,it,expect } from 'vitest';
import { display,internal } from '../display';
import { DEFAULT_SERVICE } from '../types';
import { PIPE_SIZES,WALL_THICKNESS_BY_NPS } from '../../pipe-presets';
import { validate,section } from '../types';
describe('service units and pipe catalogue',()=>{
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
