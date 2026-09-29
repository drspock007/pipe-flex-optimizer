import {it,expect} from 'vitest';
import {DEFAULT_SERVICE} from '../../types';
import {runService} from '../../run';
import {readServicePreset,servicePresetValues} from '../../presets';
import {starterPermanent,starterZone,backfillLayout,splitBackfillZone,fillPermanentBlanks,soilStarter} from '../starters';
import {defaultPermanent,validatePermanent} from '../profile';
import {permanentFixture} from './fixture';
it('provides explicit finite starters without confirming applicability',()=>{
 const p=starterPermanent(DEFAULT_SERVICE);
 expect(p.defaultsReviewed).toBe(false);expect(p.clampsConfirmed).toBe(false);expect(p.propertiesConfirmed).toBe(false);
 expect(p.operations[0].pressure).toBe(DEFAULT_SERVICE.pressure);
 expect(p.operations[0].fluidDensity).toBe(DEFAULT_SERVICE.fluidDensity);
 expect(JSON.stringify(p)).not.toContain('null');
 expect(validatePermanent({...DEFAULT_SERVICE,intervention:'permanent',permanent:{...p,clampsConfirmed:true,propertiesConfirmed:true}})).toEqual([]);
});
it.each(['uniform','halves','ends'] as const)('partitions the excavation with %s layout and independent curve objects',kind=>{
 const zones=backfillLayout(kind,starterZone());expect(zones[0].start).toBe(0);expect(zones.at(-1).end).toBe(1);
 zones.slice(1).forEach((z,j)=>expect(z.start).toBe(zones[j].end));
 if(zones.length>1){zones[0].axial.points[1].reaction=999;expect(zones[1].axial.points[1].reaction).toBe(20);}
 const split=splitBackfillZone(zones);expect(split.length).toBe(zones.length+1);expect(split.reduce((a,z)=>a+z.end-z.start,0)).toBe(1);
});
it('fills blanks only, tags mixed-source points and roundtrips review state',()=>{
 const p=defaultPermanent();p.verticalTolerance=3;p.zones[0].axial.source='Project report';p.zones[0].weight=2;
 const i={...DEFAULT_SERVICE,intervention:'permanent' as const,permanent:p};const out=fillPermanentBlanks(i);
 expect(out.verticalTolerance).toBe(3);expect(out.lateralTolerance).toBe(10);expect(out.zones[0].weight).toBe(2);
 expect(out.zones[0].axial.source).toContain('missing points filled');expect(p.lateralTolerance).toBeNaN();
 expect(readServicePreset(servicePresetValues({...i,permanent:out})).permanent.defaultsReviewed).toBe(false);
 expect(soilStarter('stiff').down.points[1].reaction).toBe(400);
});
it('retains numerical results but prevents acceptance of unreviewed examples',()=>{
 const i=permanentFixture();i.supports={kind:'custom',fractions:[.25,.75]};i.permanent.defaultsReviewed=false;
 const r=runService(i),s=r.permanent.scenarios[0];expect(s.status).toBe('complete');expect(s.final).toBeDefined();expect(s.mechanical).toBe('not evaluated');expect(s.position).toBe('not evaluated');expect(s.message).toContain('ILLUSTRATIVE INPUTS');expect(r.input.permanent.defaultsReviewed).toBe(false);
},60000);
