import { describe,it,expect } from 'vitest';
import { DEFAULT_SERVICE,section,initialForces,validate,targetComponents,type ServiceInput } from '../types';
import { solveBeam,recover,stressBound } from '../beam';
import { solveCase,solveScenario } from '../solve';
import { runService } from '../run';
const input=(changes:Partial<ServiceInput>={}):ServiceInput=>({...structuredClone(DEFAULT_SERVICE),allowablePercent:80,...changes});
describe('in-service reference mechanics',()=>{
  it('recovers fixed-fixed uniform-load sag, end moments and reaction balance',()=>{
    const i=input({pressure:0}),p=section(i),D=20000;
    // Suppress geometric extension for this independent linear reference.
    const linear={...p,EA:0}, b=solveBeam(linear,D,32,0,p.q,null,null);
    const s=recover(p,D,32,0,p.q,b,'excavation',1);
    expect(s.midZ).toBeCloseTo(-p.q*D**4/(384*p.EI),5);
    expect(Math.abs(s.leftMz)).toBeCloseTo(p.q*D**2/12,3);
    expect(s.leftZ+s.rightZ).toBeCloseTo(p.q*D,5);
    expect(s.forceZ).toBeCloseTo(0,5);
  });
  it('recovers the prescribed center-displacement point-load solution',()=>{
    const p=section(input({pressure:0})),D=20000,h=10;
    const s=recover(p,D,16,0,0,solveBeam({...p,EA:0},D,16,0,0,h,null),'displacement',1);
    expect(s.forceZ).toBeCloseTo(192*p.EI*h/D**3,6);
    expect(s.leftZ+s.rightZ+s.forceZ).toBeCloseTo(0,6);
    expect(Math.abs(s.leftMz)).toBeCloseTo(24*p.EI*h/D**2,4);
  });
  it('separates pressure, thermal restraint and extra force without double counting',()=>{
    const i=input({pressure:8,temperature:40}),s={...i.scenarios[0],referenceTemperature:10,extraAxial:1234},p=section(i);
    const f=initialForces(i,s,p);
    expect(f.wall).toBeCloseTo(2*i.nu*i.pressure*p.Ai-p.EA*i.alpha*30+1234,6);
    expect(f.wall-f.effective).toBeCloseTo(i.pressure*p.Ai,6);
    expect(initialForces({...i,pressure:0,temperature:10},{...s,extraAxial:0}).effective).toBe(0);
  });
  it('matches Lame pressure-only von Mises at the inner surface',()=>{
    const p=section(input({pressure:10}));const wall=p.a*p.A;
    expect(stressBound(p,wall,0,0).vm).toBeCloseTo(Math.sqrt(3)*p.b/p.ri**2,10);
  });
  it('horizontal-only pull leaves vertical sag free, including at the target',()=>{
    const i=input({direction:'horizontal',displacement:50,pressure:0,halfLength:5000});
    const r=solveScenario(i,i.scenarios[0]);
    expect(r.status).toBe('pass');expect(r.target.midY).toBeCloseTo(50,5);
    expect(r.target.midZ).toBeLessThan(0);expect(Math.abs(r.target.forceZ)).toBeLessThan(0.01);
    expect(r.stages.at(-1).midZ).toBeCloseTo(0,8);
    expect(r.refinement.length).toBeGreaterThanOrEqual(3);
  });
  it('rejects initial effective compression beyond Euler before any stabilizing lift',()=>{
    const i=input({pressure:0});const p=section(i),critical=4*Math.PI**2*p.EI/(2*i.halfLength)**2;
    const r=solveScenario(i,{...i.scenarios[0],extraAxial:-1.01*critical});
    expect(r.status).toBe('unstable');expect(r.stages).toHaveLength(0);
  });
  it('allows subcritical compression and checks symmetry and equilibrium',()=>{
    const i=input({pressure:0,displacement:20,halfLength:5000});const p=section(i);
    const r=solveScenario(i,{...i.scenarios[0],extraAxial:-0.3*4*Math.PI**2*p.EI/(2*i.halfLength)**2});
    expect(r.status).toBe('pass');const s=r.target;
    expect(s.leftZ).toBeCloseTo(s.rightZ,4);
    expect(s.leftZ+s.rightZ+s.forceZ).toBeCloseTo(p.q*2*i.halfLength,3);
  });
  it('requires all scenarios and keeps failed scenarios in a common result',()=>{
    const i=input({pressure:0,displacement:20,halfLength:5000});i.scenarios.push({id:'bad',name:'Compression',referenceTemperature:20,extraAxial:-1e9});
    const r=solveCase(i);expect(r.status).toBe('unstable');expect(r.scenarios).toHaveLength(2);
  });
  it('requires an explicit threshold and rejects impossible/overflow sections',()=>{
    expect(validate(DEFAULT_SERVICE).length).toBeGreaterThan(0);
    expect(runService(input({thickness:100})).result).toBeUndefined();
    expect(solveScenario(input({E:1e308}),input().scenarios[0]).status).toBe('numerical-failure');
  });
  it('keeps signed directions and combined amplitudes consistent',()=>{
    expect(targetComponents(input({direction:'horizontal',angle:-1}))).toEqual({z:null,y:-200});
    const t=targetComponents(input({direction:'combined',angle:45}));expect(Math.hypot(t.y,t.z)).toBeCloseTo(200,10);
  });
  it('does not impose a 100 m full-length cap',()=>{
    const i=input({od:914,thickness:19.05,pressure:0,halfLength:60000,fluidDensity:0,steelDensity:0,displacement:100});
    expect(solveScenario(i,i.scenarios[0]).status).toBe('pass');
  });
});
describe('intervention scope guards',()=>{
  it('stops at the first out-of-elastic-scope stage and never exposes a completed target',()=>{
    const i=input({displacement:500,yield:100});const r=solveScenario(i,i.scenarios[0]);
    expect(r.status).toBe('out-of-domain');expect(r.target).toBeUndefined();
    expect(r.stages.at(-1).vm).toBeGreaterThan(100);
    expect(r.stages.slice(0,-1).every(s=>s.vm<=100)).toBe(true);
  });
  it('retains uncertainty when the chosen threshold equals the computed bound',()=>{
    const i=input({displacement:50});const r=solveScenario(i,i.scenarios[0]);
    const same=solveScenario({...i,allowablePercent:100*r.worst.vm/i.yield},i.scenarios[0]);
    expect(same.status).toBe('uncertain');
  });
  it('rotates the zero-weight solution consistently between both transverse planes',()=>{
    const i=input({pressure:0,steelDensity:0,fluidDensity:0,displacement:50});
    const z=solveScenario(i,i.scenarios[0]);
    const y=solveScenario({...i,direction:'horizontal'},i.scenarios[0]);
    const mixed=solveScenario({...i,direction:'combined',angle:45},i.scenarios[0]);
    expect(y.worst.vm).toBeCloseTo(z.worst.vm,6);expect(mixed.worst.vm).toBeCloseTo(z.worst.vm,6);
    expect(Math.hypot(mixed.target.midY,mixed.target.midZ)).toBeCloseTo(50,7);
  });
});
it('includes both endpoints when assessing the reverse displacement phase',()=>{
  const i=input({displacement:100});const r=solveScenario(i,i.scenarios[0]);
  const outbound=[r.excavated,...r.stages.filter(s=>s.phase==='displacement')];
  const inbound=r.stages.filter(s=>s.phase==='return');
  expect(inbound[0].vm).toBe(r.target.vm);expect(inbound.at(-1).midZ).toBe(r.excavated.midZ);
  expect(Math.max(...inbound.map(s=>s.vm))).toBe(Math.max(...outbound.map(s=>s.vm)));
});
