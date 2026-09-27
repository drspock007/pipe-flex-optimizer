import { describe,it,expect } from 'vitest';
import { DEFAULT_SERVICE,section,validate,type ServiceInput } from '../types';
import { solveBeam,recover } from '../beam';
import { solveCase } from '../solve';
import { runService } from '../run';
import { supportFractions } from '../supports';
const input:ServiceInput={...DEFAULT_SERVICE,allowablePercent:80,displacement:100,supports:{kind:'equidistant',count:2}};
describe('temporary unilateral supports',()=>{
  it('matches three identical fixed-ended spans in the linear equal-span reference',()=>{
    const D=12000,n=48,p={...section(input),EA:0};
    const b=solveBeam(p,D,n,0,p.q,null,null,()=>{},[1/3,2/3]);
    const s=recover(p,D,n,0,p.q,b,'excavation',1),l=D/3;
    for(const c of s.supports){expect(c.reaction).toBeCloseTo(p.q*l,5);expect(c.gap).toBe(0);}
    expect(s.leftZ).toBeCloseTo(p.q*l/2,5);expect(s.rightZ).toBeCloseTo(p.q*l/2,5);
    expect(s.midZ).toBeCloseTo(-p.q*l**4/(384*p.EI),6);
    expect(Math.abs(s.leftMz)).toBeCloseTo(p.q*l*l/12,2);
  });
  it('satisfies contact and full force/moment balance with asymmetric supports',()=>{
    const D=20000,n=64,p=section(input),f=[0.18,0.37,0.81];
    const b=solveBeam(p,D,n,0,p.q,60,30,()=>{},f);
    const s=recover(p,D,n,input.pressure,p.q,b,'displacement',1);
    for(const c of s.supports){expect(c.gap).toBeGreaterThanOrEqual(-1e-6);expect(c.reaction).toBeGreaterThanOrEqual(0);expect(Math.abs(c.gap*c.reaction)).toBeLessThan(1e-3);}
    expect(s.leftZ+s.rightZ+s.forceZ+s.supports.reduce((v,c)=>v+c.reaction,0)).toBeCloseTo(p.q*D,4);
    // N*w' terms integrate to N*(w(D)-w(0))=0 for the full span.
    expect(s.leftMz+s.rightMz+s.rightZ*D+s.forceZ*D/2+s.supports.reduce((v,c)=>v+c.x*c.reaction,0)).toBeCloseTo(p.q*D*D/2,0);
    expect(s.leftY+s.rightY+s.forceY).toBeCloseTo(0,4);
  });
  it('detaches on lifting and reproduces contact on the reversible return path',()=>{
    const c=solveCase(input),s=c.scenarios[0];
    expect(['pass','fail']).toContain(c.status);
    expect(s.excavated.supports.every(v=>v.state==='contact')).toBe(true);
    expect(s.target.supports.some(v=>v.state==='detached')).toBe(true);
    expect(s.stages.filter(v=>v.phase==='return').at(-1).supports).toEqual(s.excavated.supports);
    expect(s.refinement.length).toBeGreaterThanOrEqual(3);
    expect(s.refinement.at(-1).contactEventsResolved).toBe(true);
  });
  it('leaves horizontal displacement free at all supports and preserves lateral instability guard',()=>{
    const c=solveCase({...input,direction:'horizontal',displacement:40}),s=c.scenarios[0];
    expect(['pass','fail']).toContain(c.status);expect(Math.abs(s.target.forceZ)).toBeLessThan(1e-3);
    expect(s.target.supports.some(v=>v.reaction>0)).toBe(true);
    const unstable=solveCase({...input,scenarios:[{...input.scenarios[0],extraAxial:-1e7}]});
    expect(unstable.status).toBe('unstable');
  });
  it('validates support positions and scales custom locations with full length',()=>{
    for(const fractions of [[0],[1],[0.5],[0.2,0.2],[NaN]])expect(validate({...input,supports:{kind:'custom',fractions}}).length).toBeGreaterThan(0);
    expect(validate({...input,supports:{kind:'equidistant',count:3}}).length).toBeGreaterThan(0);
    expect(supportFractions({...input,halfLength:10000,supports:{kind:'custom',fractions:[0.8,0.2]}})).toEqual([0.2,0.8]);
  });
  it('handles the user 40 m case and checks all counts in ascending pairs',()=>{
    const i:ServiceInput={...input,od:219.1,thickness:8.18,halfLength:20000,pressure:2.9,temperature:10,
      scenarios:[{id:'base',name:'Tref=10',referenceTemperature:10,extraAxial:0}],coatingType:'yellowJacket',fluidType:'naturalGas',allowablePercent:40,displacement:0,mode:'supports',maxSupports:4};
    const r=runService(i);
    expect(r.samples[0].status).toBe('fail');
    expect(r.samples.map(v=>v.value)).toEqual(r.samples.map((_,j)=>2*j));
    expect(r.candidate).toBeDefined();expect(r.result.status).toBe('pass');
    expect(r.result.supportPositions.length).toBe(r.candidate);
  });
  it('keeps no-support output unchanged and diagnoses unresolved close spacing',()=>{
    expect(solveCase({...input,supports:undefined})).toEqual(solveCase({...input,supports:{kind:'none'}}));
    const c=solveCase({...input,supports:{kind:'custom',fractions:[0.25,0.25000000001]}});
    expect(c.status).toBe('numerical-failure');expect(c.scenarios[0].message).toContain('spacing');
  });
  it('localizes observed contact transitions and preserves mirror symmetry',()=>{
    const s=solveCase({...input,supports:{kind:'equidistant',count:4}}).scenarios[0];
    expect(['pass','fail']).toContain(s.status);
    for(const stage of s.stages) {
      expect(stage.supports[0].reaction).toBeCloseTo(stage.supports[3].reaction,3);
      expect(stage.supports[1].reaction).toBeCloseTo(stage.supports[2].reaction,3);
    }
    const path=s.stages.filter(v=>v.phase==='displacement'),steps=s.refinement.at(-1).increments;
    expect(path.length).toBeGreaterThan(steps);
    for(let k=1;k<path.length;k++)if(path[k].supports.some((v,j)=>v.state!=='limit'&&path[k-1].supports[j].state!=='limit'&&v.state!==path[k-1].supports[j].state))expect(path[k].fraction-path[k-1].fraction).toBeLessThanOrEqual(1/(steps*64)+1e-12);
  });

});
