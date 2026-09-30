import {describe,it,expect} from 'vitest';
import {requireReportIdentity} from '../identity';
import {createServicePdf} from '../../in-service/report';
import {createServiceSummary} from '../../in-service/report-summary';
import {runService} from '../../in-service/run';
import {DEFAULT_SERVICE} from '../../in-service/types';
describe('mandatory PDF identity',()=>{
 it('rejects missing and whitespace-only names',()=>{
  for(const preparedBy of ['', '   '])expect(()=>requireReportIdentity({preparedBy,projectName:'Project',date:new Date()})).toThrow();
  expect(()=>requireReportIdentity({preparedBy:'Name',projectName:'  ',date:new Date()})).toThrow();
 });
 it('blocks both service generators and prints trimmed metadata when complete',()=>{
  const r=runService(DEFAULT_SERVICE);
  expect(()=>createServicePdf(r,'SI')).toThrow(/name/);expect(()=>createServiceSummary(r,'SI')).toThrow(/name/);
  const meta={preparedBy:'  Ada  ',projectName:'  Project A  ',date:new Date('2026-09-27T16:30:00Z')};
  for(const doc of [createServicePdf(r,'SI',{},undefined,meta),createServiceSummary(r,'SI',undefined,meta)]){expect(doc.output()).toContain('Project A');expect(doc.output()).toContain('Ada');expect(doc.output()).toContain('Exported:');}
 });
});
