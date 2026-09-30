import {it,expect} from 'vitest';
import {permanentFixture} from './fixture';
import {readServicePreset,servicePresetValues} from '../../presets';
import {runService} from '../../run';
import {DEFAULT_SERVICE} from '../../types';
it('roundtrips v3 permanent data and preserves blank numbers',()=>{const i=permanentFixture();expect(readServicePreset(servicePresetValues(i))).toEqual(i);i.permanent.verticalTolerance=NaN;expect(readServicePreset(servicePresetValues(i)).permanent.verticalTolerance).toBeNaN();});
it.each([1,2])('keeps v%s presets temporary despite extra fields',version=>{const i=permanentFixture(),loaded=readServicePreset({...servicePresetValues(i),presetVersion:version});expect(loaded.permanent).toBeUndefined();expect(loaded.intervention).toBeUndefined();});
it('does not let an inactive permanent profile change temporary mechanics',()=>{const i={...DEFAULT_SERVICE,mode:'direct' as const},a=runService(i),b=runService({...i,intervention:'temporary',permanent:permanentFixture().permanent});expect(b.result).toEqual(a.result);});
it('keeps permanent requests direct and missing profiles invalid',()=>{const i=permanentFixture();i.mode='length';const r=runService(i);expect(r.errors.join()).toContain('direct');expect(r.result).toBeUndefined();i.mode='direct';delete i.permanent;expect(runService(i).errors.length).toBeGreaterThan(0);});
