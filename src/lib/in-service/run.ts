import {runSag} from './sag';
import {runPermanent} from './permanent/sequence';
import { evaluateCsa } from './csa';
import { MODEL_VERSION, validate, type ServiceInput, type ServiceReport, type CaseResult, type SearchSample } from './types';
import { solveCase } from './solve';
export const SEARCH_LIMIT=49,SEARCH_MS=60000;
export function runService(input:ServiceInput,onProgress?:(message:string)=>void):ServiceReport {
  const start=performance.now(), errors=validate(input);
  const r:ServiceReport={version:MODEL_VERSION,createdAt:new Date().toISOString(),input:structuredClone(input),errors,samples:[],budgetExhausted:false,boundReached:false,message:'',elapsedMs:0};
  if(errors.length) return {...r,csa:evaluateCsa(input),message:'Correct the input errors before calculating.'};
  const check=()=>{if(performance.now()-start>SEARCH_MS) {r.budgetExhausted=true;throw new Error('Calculation time budget exhausted; unresolved result.');}};
  if(input.analysis==='sag'){
    r.version='in-service-sag-1';
    try{runSag(r,check,SEARCH_LIMIT,onProgress);}catch(e){r.message=e instanceof Error?e.message:String(e);}
    r.csa=evaluateCsa(input);r.elapsedMs=performance.now()-start;return r;
  }
  if(input.intervention==='permanent'){
    r.permanent=runPermanent(input,check);if(input.permanent.defaultsReviewed===false){r.permanent.scenarios.forEach(s=>{s.mechanical='not evaluated';s.position='not evaluated';s.message='ILLUSTRATIVE INPUTS — starting values have not been confirmed for this project. Numerical results only; stress and retention verdicts are not evaluated. '+s.message;});}r.version=r.permanent.version;r.message='Permanent elastic assessment: separate stress, position and soil-limit results; no installation approval.';r.csa=evaluateCsa(input);r.elapsedMs=performance.now()-start;return r;
  }
  if(input.mode==='direct') {
    r.result=solveCase(input,check);r.message='Direct calculation. Custom elastic beam criterion only.';
  } else if(input.mode==='supports') {
    let firstCase:CaseResult|undefined;
    for(let count=0;count<=(input.maxSupports??10)&&!r.budgetExhausted;count+=2) {
      onProgress?.(`Checking ${count} equidistant supports across all scenarios`);
      const candidateInput:ServiceInput={...input,mode:'direct',supports:count?{kind:'equidistant',count}:{kind:'none'}};
      const c=solveCase(candidateInput,check);firstCase??=c;
      const usages=c.scenarios.flatMap(s=>s.utilization===undefined?[]:[s.utilization]).filter(Number.isFinite);
      r.samples.push({value:count,status:c.status,maxUtilization:usages.length?Math.max(...usages):null});
      if(c.status==='pass'&&!r.budgetExhausted) {
        onProgress?.('Rechecking support candidate across all scenarios');
        r.result=solveCase(candidateInput,check);
        if(r.result.status==='pass'&&!r.budgetExhausted)r.candidate=count;
        break;
      }
    }
    r.result??=firstCase;
    r.boundReached=r.candidate===(input.maxSupports??10);
    const unresolved=r.samples.some(s=>s.value<(r.candidate??Infinity)&&!['pass','fail'].includes(s.status));
    r.message=r.candidate===undefined?'No support count verified within the tested family.':`Smallest verified count in the tested equidistant family: ${r.candidate} supports. Not a general optimum.`;
    if(unresolved)r.message+=' Lower counts include unresolved or out-of-scope cases; minimality is not established.';
    if(r.budgetExhausted)r.message+=' Global time budget exhausted; incomplete coverage.';
  } else {
    const isLength=input.mode==='length',lo=isLength?input.minHalfLength:0,hi=isLength?input.maxHalfLength:input.maxDisplacement;
    const values=Array.from({length:25},(_,k)=>isLength?lo*Math.pow(hi/lo,k/24):lo+(hi-lo)*k/24);
    const cases=new Set<number>();
    let firstCase:CaseResult|undefined;
    const evaluate=(value:number)=>{
      onProgress?.(`Exploratory search: ${cases.size+1} / ${SEARCH_LIMIT} samples`);
      const c=solveCase({...input,halfLength:isLength?value:input.halfLength,displacement:isLength?input.displacement:value},check);
      cases.add(value);
      firstCase??=c;
      const usages=c.scenarios.map(s=>s.utilization).filter((v):v is number=>v!==undefined&&Number.isFinite(v));
      const row:SearchSample={value,status:c.status,maxUtilization:usages.length?Math.max(...usages):null};
      r.samples.push(row);return row;
    };
    for(const v of values) {if(r.budgetExhausted) break;evaluate(v);}
    // Refine all observed pass/non-pass boundaries; do not infer monotonicity.
    for(let pass=0;pass<4 && cases.size<SEARCH_LIMIT && !r.budgetExhausted;pass++) {
      const sorted=[...r.samples].sort((a,b)=>a.value-b.value);
      for(let k=0;k<sorted.length-1 && cases.size<SEARCH_LIMIT && !r.budgetExhausted;k++) {
        const a=sorted[k],b=sorted[k+1];
        if((a.status==='pass')!==(b.status==='pass')) evaluate(isLength?Math.sqrt(a.value*b.value):(a.value+b.value)/2);
      }
    }
    r.samples.sort((a,b)=>a.value-b.value);
    const passing=r.samples.filter(s=>s.status==='pass');
    const candidate=isLength?passing[0]:passing.at(-1);
    if(candidate&&!r.budgetExhausted) {
      onProgress?.('Rechecking the selected candidate across all scenarios');
      const selected=solveCase({...input,halfLength:isLength?candidate.value:input.halfLength,displacement:isLength?input.displacement:candidate.value},check);
      r.result=selected;
      if(selected.status==='pass') {r.candidate=candidate.value;r.boundReached=isLength?candidate.value===lo:Math.abs(candidate.value-hi)<1e-8;}
    }
    if(!r.result) r.result=firstCase;
    r.message=r.candidate!==undefined
      ? `Verified sampled candidate, not a certified ${isLength?'minimum length':'maximum displacement'}.${r.boundReached?' Search bound reached.':''}`
      : 'No common candidate verified. This does not prove that no admissible solution exists.';
    if(r.budgetExhausted) r.message+=' Time budget exhausted; incomplete coverage.';
  }
  r.elapsedMs=performance.now()-start; r.csa=evaluateCsa(r.input); return r;
}
