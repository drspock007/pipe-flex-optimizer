import {it,expect} from 'vitest';
import {backfillLoad} from '../backfill-load';
import {permanentFixture} from './fixture';
import {validatePermanent} from '../profile';
import {readServicePreset,servicePresetValues} from '../../presets';
it('calculates a rectangular soil column and rejects invalid or stale inputs',()=>{
 expect(backfillLoad({cover:2,width:.5,density:2000})).toBeCloseTo(19.6133,10);
 expect(backfillLoad({cover:0,width:.5,density:2000})).toBe(0);
 for(const e of [{cover:NaN,width:.5,density:2000},{cover:-1,width:.5,density:2000},{cover:2,width:0,density:2000},{cover:2,width:.5,density:0},{cover:1e308,width:1e308,density:2000}])expect(backfillLoad(e)).toBeNaN();
 const i=permanentFixture(),z=i.permanent.zones[0];z.loadEstimate={cover:2,width:.5,density:2000};z.weight=backfillLoad(z.loadEstimate);
 expect(validatePermanent(i)).toEqual([]);
 expect(readServicePreset(servicePresetValues(i)).permanent.zones[0].loadEstimate).toEqual(z.loadEstimate);
 z.weight=1;expect(validatePermanent(i).join(' ')).toContain('Invalid backfill weight estimate');
});
