import fs from 'node:fs';
import {permanentFixture} from '../src/lib/in-service/permanent/__tests__/fixture';
import {constructionPath} from '../src/lib/in-service/permanent/sequence';
import {section,initialForces} from '../src/lib/in-service/types';
const cases=[];
for(const release of ['before','after'] as const){for(const direction of ['vertical','combined'] as const){
 const input=permanentFixture();input.permanent.release=release;input.direction=direction;input.angle=45;input.permanent.initialSupports=release==='before'?'remove':'keep';input.permanent.operations=[{name:'Pressure and cooling',pressure:.2,temperature:18,fluidDensity:50}];
 const stages=[];const r=constructionPath(input,input.scenarios[0],16,4,()=>{},(stage,load)=>{
  const i={...input,pressure:load.pressure,temperature:load.temperature,fluidType:'custom' as const,fluidDensity:load.density},p=section(i);
  stages.push({name:stage.name,mesh:stage.mesh,expected:stage.state.d,axial:stage.state.axial,section:p,N0:initialForces(i,input.scenarios[0],p).effective,load:{...load,fixed:[...load.fixed],forces:[...load.forces]}});
 });if(r.status!=='complete')throw new Error(r.message);cases.push({name:`${release}-${direction}`,stages});
}}
fs.mkdirSync('output/pdf',{recursive:true});fs.writeFileSync('output/pdf/permanent-reference-input.json',JSON.stringify(cases));console.log(cases.map(c=>[c.name,c.stages.length]));
