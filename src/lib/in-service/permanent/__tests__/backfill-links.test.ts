import {it,expect} from 'vitest';
import {DEFAULT_SERVICE} from '../../types';
import {fillPermanentBlanks,starterPermanent} from '../starters';
import {backfillLoad} from '../backfill-load';
import {changeBackfillMaterial,syncBackfillDiameter} from '../backfill-links';
it('updates density and derived weight on material changes, without inventing unknown densities',()=>{
 const z=starterPermanent(DEFAULT_SERVICE).zones[0];
 const gravel=changeBackfillMaterial(z,'Crushed stone');
 expect(gravel.loadEstimate.density).toBe(2100);expect(gravel.weight).toBe(backfillLoad(gravel.loadEstimate));
 expect(changeBackfillMaterial(gravel,'Sand').loadEstimate.density).toBe(1800);
 expect(changeBackfillMaterial(gravel,'Reused excavated soil').weight).toBeNaN();
 const direct={...z,loadEstimate:undefined,weight:123};expect(changeBackfillMaterial(direct,'Sand').weight).toBe(123);
});
it('synchronizes all estimated zone widths only on actual diameter changes',()=>{
 const i={...DEFAULT_SERVICE,permanent:starterPermanent(DEFAULT_SERVICE)};
 const z=i.permanent.zones[0];i.permanent.zones=[z,structuredClone(z),{...z,loadEstimate:undefined,weight:123}];
 i.permanent.defaultsReviewed=true;
 expect(syncBackfillDiameter(i,{...i})).toEqual(i);
 const next=syncBackfillDiameter(i,{...i,od:323.9});
 for(const zone of next.permanent.zones.slice(0,2)){expect(zone.loadEstimate.width).toBeCloseTo(.3239,12);expect(zone.weight).toBe(backfillLoad(zone.loadEstimate));}
 expect(next.permanent.zones[2].weight).toBe(123);expect(next.permanent.defaultsReviewed).toBe(false);
 expect(i.permanent.zones[0].loadEstimate.width).toBe(.1683);
});

it('keeps unknown material density empty when filling other missing fields',()=>{
 const permanent=starterPermanent(DEFAULT_SERVICE);permanent.zones[0]=changeBackfillMaterial(permanent.zones[0],'Reused excavated soil');
 expect(fillPermanentBlanks({...DEFAULT_SERVICE,permanent}).zones[0].loadEstimate.density).toBeNaN();
});
