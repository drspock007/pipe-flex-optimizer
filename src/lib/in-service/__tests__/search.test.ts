import { describe,it,expect,vi,afterEach } from 'vitest';
import { DEFAULT_SERVICE,type CaseResult } from '../types';
import { runService } from '../run';
import * as solver from '../solve';
const input=()=>({...structuredClone(DEFAULT_SERVICE),allowablePercent:80});
afterEach(()=>vi.restoreAllMocks());
describe('service exploratory searches',()=>{
  it('rechecks a real displacement candidate across all scenarios',()=>{
    const r=runService({...input(),mode:'displacement',maxDisplacement:250});
    expect(r.samples.length).toBeGreaterThanOrEqual(25);
    expect(r.candidate).toBeGreaterThan(0);
    expect(r.candidate).toBeLessThan(250);
    expect(r.result.status).toBe('pass');
    expect(r.result.scenarios.every(s=>s.status==='pass')).toBe(true);
    expect(r.message).toContain('not a certified');
  });
  it('distinguishes a reached displacement bound from a mechanical maximum',()=>{
    const r=runService({...input(),mode:'displacement',maxDisplacement:10});
    expect(r.boundReached).toBe(true);expect(r.candidate).toBe(10);
  });
  it('keeps disjoint pass regions and unresolved regions rather than assuming monotonicity',()=>{
    const spy=vi.spyOn(solver,'solveCase').mockImplementation(i=>({halfLength:i.halfLength,displacement:i.displacement,scenarios:[],status:i.displacement>100&&i.displacement<150?'uncertain':i.displacement<25||i.displacement>200?'pass':'fail'}));
    const r=runService({...input(),mode:'displacement',maxDisplacement:240});
    expect(r.samples.some(s=>s.status==='uncertain')).toBe(true);
    expect(r.samples.some(s=>s.status==='fail')).toBe(true);
    expect(r.candidate).toBe(240);
    expect(spy.mock.calls.filter(([i])=>i.displacement===240)).toHaveLength(2);
  });
  it('does not turn an unsuccessful final recheck into a candidate',()=>{
    const calls=new Map<number,number>();
    vi.spyOn(solver,'solveCase').mockImplementation(i=>{
      const count=(calls.get(i.displacement)??0)+1;calls.set(i.displacement,count);
      return {halfLength:i.halfLength,displacement:i.displacement,scenarios:[],status:count===1?'pass':'numerical-failure'};
    });
    const r=runService({...input(),mode:'displacement'});
    expect(r.candidate).toBeUndefined();expect(r.result.status).toBe('numerical-failure');
  });
  it('searches full length using half-length bounds without calling it a certified minimum',()=>{
    const r=runService({...input(),mode:'length',minHalfLength:8000,maxHalfLength:15000,displacement:100});
    expect(r.candidate).toBeDefined();expect(r.result.halfLength).toBe(r.candidate);
    expect(r.samples.every(s=>s.value>=8000&&s.value<=15000+1e-8)).toBe(true);
  });
  it('keeps a time-budget interruption unresolved',()=>{
    vi.spyOn(performance,'now').mockReturnValueOnce(0).mockReturnValue(61000);
    const r=runService({...input(),mode:'length'});
    expect(r.budgetExhausted).toBe(true);expect(r.candidate).toBeUndefined();expect(r.samples[0].status).toBe('numerical-failure');
  });
  it('searches support pairs in order, retains unresolved counts and rechecks all scenarios',()=>{
    const spy=vi.spyOn(solver,'solveCase').mockImplementation(i=>{
      const count=i.supports?.kind==='equidistant'?i.supports.count:0;
      return {halfLength:i.halfLength,displacement:i.displacement,scenarios:[],status:count===0?'uncertain':count===2?'fail':'pass'};
    });
    const r=runService({...input(),mode:'supports',maxSupports:8});
    expect(r.samples.map(s=>s.value)).toEqual([0,2,4]);expect(r.candidate).toBe(4);
    expect(r.message).toContain('minimality is not established');
    expect(spy.mock.calls.map(([i])=>i.supports.kind==='equidistant'?i.supports.count:0)).toEqual([0,2,4,4]);
  });
  it('rejects a failed support recheck and preserves one global support-search budget',()=>{
    const spy=vi.spyOn(solver,'solveCase').mockReturnValueOnce({halfLength:10000,displacement:100,status:'pass',scenarios:[]}).mockReturnValue({halfLength:10000,displacement:100,status:'numerical-failure',scenarios:[]});
    expect(runService({...input(),mode:'supports'}).candidate).toBeUndefined();spy.mockRestore();
    vi.spyOn(performance,'now').mockReturnValueOnce(0).mockReturnValue(61000);
    const r=runService({...input(),mode:'supports'});
    expect(r.samples).toHaveLength(1);expect(r.budgetExhausted).toBe(true);expect(r.candidate).toBeUndefined();
  });

});
