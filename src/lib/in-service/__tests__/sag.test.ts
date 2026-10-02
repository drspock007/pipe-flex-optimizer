import {describe,it,expect,vi} from 'vitest';
import {DEFAULT_SERVICE,section,initialForces,validate,type ServiceInput} from '../types';
import {emptyPipe} from '../sag-profile';
import {solveSimpleSag} from '../sag';
import {runService} from '../run';
import {solveScenario} from '../solve';
import {effectiveFluidDensity} from '../fluid';
import {emptyCsa} from '../csa';
import {servicePresetValues,readServicePreset} from '../presets';
import {createServicePdf} from '../report';
import {createServiceSummary} from '../report-summary';
import {display,internal} from '../display';
const input=(patch:Partial<ServiceInput>={}):ServiceInput=>({...structuredClone(DEFAULT_SERVICE),...{analysis:'sag',sag:{version:1,boundary:'simple',confirmed:true},pressure:0,fluidDensity:0,halfLength:3000},...patch});
describe('sag only and empty pipe',()=>{
 it('removes fluid weight and pressure stresses only, preserving steel, coating and thermal restraint',()=>{
  const i=emptyPipe({...input(),fluidType:'air',pressure:10,coatingType:'custom',coatingThickness:3,coatingDensity:950});
  const p=section(i),ro=i.od/2,ri=ro-i.thickness;
  const expected=(Math.PI*(ro*ro-ri*ri)*i.steelDensity+Math.PI*((ro+3)**2-ro**2)*950)*9.80665e-9;
  expect(p.q).toBeCloseTo(expected,12);expect(p.a).toBe(0);expect(p.b).toBe(0);expect(effectiveFluidDensity(i)).toBe(0);
  expect(effectiveFluidDensity({...i,fluidType:'air'})).toBeGreaterThan(1);
  expect(initialForces({...i,temperature:30},i.scenarios[0]).wall).toBeLessThan(0);
 });
 it('matches independent simply supported deflection, reactions, moment bound and slope',()=>{
  const i=input(),p=section(i),L=6000,s=solveSimpleSag(i,i.scenarios[0]),t=s.target;
  expect(s.status).toBe('pass');expect(t.sagMax).toBeCloseTo(5*p.q*L**4/(384*i.E*p.I),10);
  expect(t.sagX).toBe(L/2);expect(t.midZ).toBe(-t.sagMax);expect(t.leftZ).toBeCloseTo(p.q*L/2,10);
  expect(t.rightZ).toBe(t.leftZ);expect(t.leftMz).toBe(0);expect(t.N).toBe(0);expect(t.wall).toBe(0);
  const bending=p.q*L**2/8*p.ro/p.I,tau=(p.q*L/2)*(p.ro*p.ro+p.ro*p.ri+p.ri*p.ri)/(3*p.I);
  expect(t.vm).toBeCloseTo(Math.hypot(bending,Math.sqrt(3)*tau),10);
  expect(t.maxSlope).toBeCloseTo(p.q*L**3/(24*p.EI),12);expect(s.refinement).toEqual([]);
 });
 it('recovers the existing clamped excavated state, with no actuator or return, independent of inactive movement fields',()=>{
  const i=input({sag:{version:1,boundary:'clamped',confirmed:true},halfLength:5000,pressure:2});
  const movement=solveScenario({...i,analysis:'movement',displacement:10},i.scenarios[0]);
  const r=runService({...i,displacement:NaN,angle:NaN,maxDisplacement:NaN,supports:{kind:'equidistant',count:2}});
  expect(r.errors).toEqual([]);const s=r.result.scenarios[0];expect(s.status).toBe('pass');
  expect(s.target.midZ).toBeCloseTo(movement.excavated.midZ,8);expect(s.target.vm).toBeCloseTo(movement.excavated.vm,7);
  expect(s.stages.every(v=>['initial','excavation'].includes(v.phase))).toBe(true);
  expect(Math.abs(s.target.forceZ)).toBeLessThan(.001);expect(s.target.supports).toBeUndefined();
  expect(s.sag.x).toBeCloseTo(5000,4);expect(s.sag.value).toBeCloseTo(-s.target.midZ,8);
 });
 it('approaches the linear fixed-fixed sag under small load and retains zero-weight cases',()=>{
  const i=input({sag:{version:1,boundary:'clamped',confirmed:true},steelDensity:1,halfLength:5000});
  const s=runService(i).result.scenarios[0],p=section(i);
  expect(s.sag.value/(p.q*10000**4/(384*p.EI))).toBeCloseTo(1,5);
  const zero=runService(input({steelDensity:0})).result.scenarios[0];expect(zero.sag.value).toBe(0);expect(zero.target.leftZ).toBe(0);
 });
 it('Find L selects the largest verified sampled span within the independent sag limit',()=>{
  const i=input({mode:'length',minHalfLength:1000,maxHalfLength:6000,sag:{version:1,boundary:'simple',confirmed:true,limit:10}}),p=section(i);
  const expected=(10*384*p.EI/(5*p.q))**.25,r=runService(i);
  expect(r.candidate).toBeDefined();expect(r.candidate*2).toBeLessThanOrEqual(expected);expect(r.candidate*2/expected).toBeGreaterThan(.98);
  expect(r.samples.length).toBeLessThanOrEqual(49);expect(r.result.status).toBe('pass');
  expect(r.result.scenarios[0].sag.status).toBe('pass');expect(r.boundReached).toBe(false);
 });
 it('handles stress-governed span, upper bounds, failure and independent mechanical/sag verdicts',()=>{
  const i=input({mode:'length',minHalfLength:1000,maxHalfLength:7000,allowablePercent:5,sag:{version:1,boundary:'simple',confirmed:true,limit:1000}});
  const r=runService(i);expect(r.candidate).toBeDefined();expect(r.candidate).toBeLessThan(7000);expect(r.result.scenarios[0].utilization).toBeLessThanOrEqual(1);
  expect(runService({...i,maxHalfLength:1500}).boundReached).toBe(true);
  const d=runService(input({sag:{version:1,boundary:'simple',confirmed:true,limit:.01}})).result;
  expect(d.status).toBe('fail');expect(d.scenarios[0].status).toBe('pass');expect(d.scenarios[0].sag.status).toBe('fail');
  expect(runService({...i,minHalfLength:6000}).candidate).toBeUndefined();
 });
 it('keeps exact analytical equality admissible and numerical near-boundaries uncertain',()=>{
  const i=input(),s=runService(i).result.scenarios[0];
  expect(runService({...i,sag:{...i.sag,limit:s.sag.value}}).result.scenarios[0].sag.status).toBe('pass');
  const clamped=input({sag:{version:1,boundary:'clamped',confirmed:true}}),a=runService(clamped).result.scenarios[0];
  expect(runService({...clamped,sag:{...clamped.sag,limit:a.sag.value}}).result.scenarios[0].sag.status).toBe('uncertain');
 });
 it('rejects unsupported conditions and preserves failed/unstable scenarios',()=>{
  for(const patch of [{pressure:1},{sag:{version:1,boundary:'simple',confirmed:false}},{mode:'length'},{mode:'supports'},{intervention:'permanent'},{scenarios:[{...DEFAULT_SERVICE.scenarios[0],extraAxial:1}]}] as Partial<ServiceInput>[])expect(validate(input(patch)).length).toBeGreaterThan(0);
  expect(runService(input({halfLength:100})).result.status).toBe('out-of-domain');
  expect(runService(input({E:1e308})).result.status).toBe('numerical-failure');
  const r=runService(input({sag:{version:1,boundary:'clamped',confirmed:true},scenarios:[DEFAULT_SERVICE.scenarios[0],{...DEFAULT_SERVICE.scenarios[0],id:'bad',extraAxial:-1e9}]}));
  expect(r.result.scenarios.length).toBe(2);expect(r.result.status).toBe('unstable');
 });
 it('keeps exhausted searches unresolved without an accepted candidate',()=>{
  let calls=0;const spy=vi.spyOn(performance,'now').mockImplementation(()=>calls++===0?0:61000);
  try{const r=runService(input({mode:'length',sag:{version:1,boundary:'simple',confirmed:true,limit:10}}));expect(r.budgetExhausted).toBe(true);expect(r.candidate).toBeUndefined();}finally{spy.mockRestore();}
 });
 it('round trips new and old presets and unit-only representations',()=>{
  const i=input(),values=servicePresetValues(i);expect(readServicePreset(values)).toEqual(i);
  expect(readServicePreset({...values,presetVersion:3}).analysis).toBeUndefined();
  const missing=readServicePreset(servicePresetValues({...i,sag:{...i.sag,limit:NaN}}));expect(missing.sag.limit).toBeNaN();expect(validate(missing).length).toBeGreaterThan(0);
  const length=internal(display(i.halfLength/500,'m','Imperial'),'m','Imperial')*500;
  expect(runService({...i,halfLength:length}).result.scenarios[0].sag.value).toBeCloseTo(runService(i).result.scenarios[0].sag.value,9);
 });
 it('excludes simple supports from anchored CSA and exports coherent sag snapshots in both formats',()=>{
  const r=runService(input({csa:{...emptyCsa(),enabled:true}})),before=structuredClone(r),identity={preparedBy:'Tester',projectName:'Sag validation',date:new Date('2026-10-01T12:00:00Z')};
  expect(r.csa.checks.find(c=>c.id==='anchored').status).toBe('not-applicable');
  for(const units of ['SI','Imperial'] as const)for(const complete of [false,true]){
   const pdf=(complete?createServicePdf(r,units,{},undefined,identity):createServiceSummary(r,units,undefined,identity)).output();
   expect(pdf).toContain('Sag only');expect(pdf).toContain('Maximum downward sag');expect(pdf).not.toContain('Actuator force');expect(pdf).not.toContain('Target amplitude');
  }
  expect(r).toEqual(before);expect(()=>createServiceSummary(r,'SI')).toThrow();
 });
});
