import { describe,it,expect } from 'vitest';
import { evaluateCsa,emptyCsa,temperatureFactor,minimumWall } from '../csa';
import { DEFAULT_SERVICE,validate,type ServiceInput } from '../types';
import { runService } from '../run';
import { readServicePreset,servicePresetValues } from '../presets';
import { display,internal } from '../display';
const base:ServiceInput={...DEFAULT_SERVICE,csa:{...emptyCsa(),enabled:true,eligibleSteel:true,plainPipeline:true,anchored:true,designPressure:2,designTemperature:40,anchoringTemperature:20,nominalThickness:7.11,allowance:0,smys:359}};
const check=(i=base,id='anchored')=>evaluateCsa(i)!.checks.find(c=>c.id===id)!;
const profile=(v:Partial<NonNullable<ServiceInput['csa']>>)=>({...base,csa:{...base.csa,...v}});
describe('CSA targeted independent design checks',()=>{
  it('is opt-in and never invalidates mechanical inputs',()=>{
    expect(evaluateCsa(DEFAULT_SERVICE)).toBeUndefined();
    expect(validate({...DEFAULT_SERVICE,csa:{...emptyCsa(),enabled:true}})).toEqual([]);
    expect(check({...base,csa:{...emptyCsa(),enabled:true}}).status).toBe('not-assessed');
  });
  it('uses thin-wall design stress and prescribed material constants, not solver stresses',()=>{
    const c=check();
    // Sh=23.670886..., thermal stress=49.68, SL=-42.578734...
    expect(c.demand).toBeCloseTo(66.24962025316455,9);
    expect(c.limit).toBeCloseTo(323.1,10);expect(c.status).toBe('pass');
    expect(check({...base,E:100000,nu:.2,alpha:1e-5,yield:200}).demand).toBe(c.demand);
  });
  it('handles zero SL, tensile SL, equality and exceedance without rounding verdicts',()=>{
    expect(check(profile({designTemperature:20})).status).toBe('not-applicable');
    const zero={...profile({designPressure:0,designTemperature:20}),pressure:0};
    expect(check(zero).status).toBe('pass');expect(check(zero).demand).toBe(0);
    const eq={...profile({designPressure:0,designTemperature:120,smys:248.4/.9}),pressure:0};
    expect(check(eq).status).toBe('pass');
    expect(check({...eq,csa:{...eq.csa,smys:200}}).status).toBe('fail');
  });
  it('uses tabulated or next-larger OD, without extrapolation',()=>{
    expect(minimumWall(10.3)).toEqual([10.3,1.7]);expect(minimumWall(168.3)).toEqual([168.3,2.1]);
    expect(minimumWall(168.31)).toEqual([219.1,3.2]);expect(minimumWall(2032)).toEqual([2032,10.3]);
    for(const d of [10,2032.1,NaN,Infinity])expect(minimumWall(d)).toBeUndefined();
    expect(check(profile({nominalThickness:2.1}),'wall').status).toBe('pass');
    expect(check(profile({nominalThickness:2.09}),'wall').status).toBe('fail');
  });
  it('interpolates the temperature factor only in the documented domain',()=>{
    for(const [t,f] of [[-20,1],[120,1],[150,.97],[180,.93],[200,.91],[230,.87],[165,.95]])expect(temperatureFactor(t)).toBeCloseTo(f,12);
    for(const t of [231,NaN,-273.15])expect(temperatureFactor(t)).toBeUndefined();
  });
  it('blocks only affected checks for unknown scope, missing inputs, loads or inconsistent design conditions',()=>{
    for(const v of [{anchored:false},{smys:NaN},{allowance:8},{allowance:-1},{designPressure:1},{designTemperature:10},{anchoringTemperature:50},{designTemperature:231}])expect(check(profile(v)).status).toBe('not-assessed');
    expect(check(profile({anchored:false}),'wall').status).toBe('pass');
    expect(check({...base,scenarios:[{...base.scenarios[0],extraAxial:1}]}).status).toBe('not-assessed');
    expect(check(profile({designPressure:1e308})).status).toBe('not-assessed');
    expect(check(base,'bending').status).toBe('not-assessed');expect(check(base,'annex-c').status).toBe('not-assessed');
    expect(check({...base,fluidType:'hydrogen'},'annex-c').reason).toContain('excluded');
  });
  it('round trips missing and filled profile values, and imports legacy presets disabled',()=>{
    expect(readServicePreset(servicePresetValues(base))).toEqual(base);
    const blank=readServicePreset(servicePresetValues(profile({allowance:NaN})))!;
    expect(blank.csa.allowance).toBeNaN();
    expect(readServicePreset({...servicePresetValues(base),presetVersion:1}).csa).toBeUndefined();
    expect(readServicePreset({...servicePresetValues(base),csa:{enabled:true}})).toBeNull();
  });
  it('preserves SI and imperial values without rounding calculation inputs',()=>{
    for(const unit of ['pressure','C','mm','MPa'] as const)for(const system of ['SI','Imperial'] as const)expect(internal(display(123.456,unit,system),unit,system)).toBeCloseTo(123.456,9);
  });
  for(const mode of ['direct','length','displacement','supports'] as const)it(`does not change ${mode} candidates, mechanics or diagnostics`,()=>{
    // Small, stiff cases keep this regression fast while exercising actual search paths.
    const input={...structuredClone(base),mode,halfLength:2000,minHalfLength:1800,maxHalfLength:2200,displacement:1,maxDisplacement:2,maxSupports:0};
    const a=runService({...input,csa:undefined}),b=runService(input);
    expect(b.errors).toEqual(a.errors);expect(b.result).toEqual(a.result);expect(b.samples).toEqual(a.samples);expect(b.candidate).toEqual(a.candidate);
    expect(b.csa).toEqual(evaluateCsa(input));input.csa.smys=1;expect(b.input.csa.smys).toBe(359);
  },30000);
});
