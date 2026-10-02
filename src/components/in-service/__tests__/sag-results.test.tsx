import {render,screen,fireEvent,within,cleanup} from '@testing-library/react';
import {afterEach,describe,it,expect} from 'vitest';
import {UnitProvider,useUnits} from '@/contexts/UnitContext';
import {DEFAULT_SERVICE,type ServiceInput} from '@/lib/in-service/types';
import {runService} from '@/lib/in-service/run';
import {sagStress,stressPercent} from '@/lib/in-service/sag-report-data';
import {createServiceSummary} from '@/lib/in-service/report-summary';
import {createServicePdf} from '@/lib/in-service/report';
import SagResults from '../SagResults';
const input:ServiceInput={...DEFAULT_SERVICE,analysis:'sag',sag:{version:1,boundary:'simple',confirmed:true,limit:600},od:114.3,thickness:6.02,halfLength:9000,pressure:0,fluidDensity:0,coatingType:'fbeAro',coatingThickness:1.5,allowablePercent:30};
const identity={preparedBy:'Tester',projectName:'Stress alert check',date:new Date('2026-10-01T12:00:00Z')};
afterEach(cleanup);
describe('sag stress exceedance presentation',()=>{
 it('warns on the current over-limit case, distinguishes yield, and preserves percentages across units',()=>{
  const r=runService(input);
  expect(r.appVersion).toMatch(/^v\d{12}$/);
  r.appVersion='v200001010101';
  function Results(){const {toggle}=useUnits();return <><button onClick={toggle}>Toggle units</button><SagResults report={r} identity={identity}/></>;}
  render(<UnitProvider><Results/></UnitProvider>);
  expect(screen.getByRole('alert')).toHaveTextContent('117.72% of the custom limit');
  expect(screen.getByRole('alert')).toHaveTextContent('35.32% of yield strength');
  expect(within(screen.getByRole('row',{name:'Stress / yield strength 35.32%'})).getByRole('cell')).toHaveTextContent('35.32%');
  fireEvent.click(screen.getByRole('button',{name:'Toggle units'}));
  expect(screen.getByRole('alert')).toHaveTextContent('35.32% of yield strength');
  expect(screen.getByRole('row',{name:'Stress / custom limit 117.72%'})).toBeInTheDocument();
  for(const units of ['SI','Imperial'] as const)for(const complete of [false,true]){
   const pdf=(complete?createServicePdf(r,units,{},undefined,identity):createServiceSummary(r,units,undefined,identity)).output();
   expect(pdf.includes('(Signature)')).toBe(complete);
   expect(pdf).not.toContain('f = 5 q L^4');
   if(complete)expect(pdf).toContain(units==='SI'?'(12)':'(6.66667)');
   expect(pdf).toContain('App v200001010101');
   expect(pdf).toContain('WARNING');expect(pdf).toContain('35.32%');expect(pdf).toContain('Stress / yield strength');
  }
 });
 it('does not warn at or below the custom limit, and never invents missing stress values',()=>{
  const r=runService({...input,allowablePercent:50}),s=r.result.scenarios[0];
  render(<UnitProvider><SagResults report={r} identity={identity}/></UnitProvider>);
  expect(screen.queryByRole('alert')).toBeNull();
  expect(sagStress({...s,utilization:1},input.yield).exceeded).toBe(false);
  expect(sagStress({...s,utilization:1.000001,status:'uncertain'},input.yield).exceeded).toBe(true);
  expect(stressPercent(100.0001)).toBe('>100.00%');
  expect(sagStress({...s,utilization:undefined,worst:undefined},input.yield)).toEqual({customPercent:undefined,yieldPercent:undefined,exceeded:false,alert:undefined});
 });
});
