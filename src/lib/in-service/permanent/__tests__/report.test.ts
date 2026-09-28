import {it,expect} from 'vitest';
import {permanentFixture} from './fixture';
import {constructionPath} from '../sequence';
import {createServicePdf} from '../../report';
import {createServiceSummary} from '../../report-summary';
import type {ServiceReport} from '../../types';
const identity={preparedBy:'Tester',projectName:'Synthetic case',date:new Date('2026-09-28T12:00:00Z')};
it('exports permanent partial snapshots without claiming convergence, enforces identity and does not mutate units',()=>{
 const input=permanentFixture();let calls=0;
 const scenario=constructionPath(input,input.scenarios[0],16,4,()=>{if(++calls>20)throw new Error('Budget exhausted');});
 const report:ServiceReport={input,version:'permanent-elastic-1',createdAt:identity.date.toISOString(),permanent:{version:'permanent-elastic-1',validation:'numerically benchmarked',scenarios:[scenario]},errors:[],samples:[],budgetExhausted:true,boundReached:false,message:'Partial path',elapsedMs:60000};
 const before=structuredClone(report);
 expect(()=>createServiceSummary(report,'SI')).toThrow();
 expect(()=>createServicePdf(report,'SI',{},undefined,{...identity,projectName:' '})).toThrow();
 for(const units of ['SI','Imperial'] as const){
  for(const doc of [createServiceSummary(report,units,undefined,identity),createServicePdf(report,units,{},undefined,identity)]){
   const text=doc.output();expect(text).toContain('Permanent maintained deviation');expect(text).toContain('unresolved');expect(text).toContain('not evaluated');expect(text).toContain('No permanent installation approval');expect(text).toContain('Synthetic case');expect(text).not.toContain('(satisfied)');
  }
 }
 expect(report).toEqual(before);
});
