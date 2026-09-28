import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SERVICE, type ServiceInput, validate } from '../types';
import { readServicePreset, servicePresetValues } from '../presets';
import { createPreset, getPresets, duplicatePreset, renamePreset, overwritePreset, deletePreset } from '../../presets/crud';
import { applyImport, buildExportPayload, parseImportFile } from '../../presets/transfer';

beforeEach(()=>localStorage.clear());
const input:ServiceInput={...DEFAULT_SERVICE,mode:'supports',maxSupports:16,fluidType:'naturalGas',gasMolarMass:18.1,gasZ:0.91,atmosphericPressure:0.101325,coatingType:'custom',coatingThickness:3,supports:{kind:'custom',fractions:[0.2,0.7]},scenarios:[{id:'cold',name:'Cold assumption',referenceTemperature:-10,extraAxial:-1200},{id:'warm',name:'Warm assumption',referenceTemperature:35,extraAxial:3500}]};
describe('In-service preset persistence',()=>{
  it('round trips every input through storage and export/import independently of lowering',()=>{
    createPreset('lowering','Shared name',{Do:168.3,h:123});
    expect(createPreset('in-service','Shared name',servicePresetValues(input)).ok).toBe(true);
    const exported=buildExportPayload(['in-service']);
    const preset=getPresets('in-service')[0];
    expect(readServicePreset(preset.values)).toEqual(input);
    deletePreset('in-service',preset.id);
    expect(applyImport(parseImportFile(exported).data!,'rename').imported).toBe(1);
    expect(readServicePreset(getPresets('in-service')[0].values)).toEqual(input);
    expect(getPresets('lowering')[0].values).toEqual({Do:168.3,h:123});
  });
  it('duplicates, renames, overwrites and deletes without affecting the other mode',()=>{
    createPreset('in-service','A',servicePresetValues(input));
    const id=getPresets('in-service')[0].id;
    duplicatePreset('in-service',id);renamePreset('in-service',id,'B');
    overwritePreset('in-service',id,servicePresetValues({...input,displacement:123}));
    expect(readServicePreset(getPresets('in-service').find(p=>p.id===id)!.values)?.displacement).toBe(123);
    expect(readServicePreset(getPresets('in-service').find(p=>p.id!==id)!.values)?.displacement).toBe(input.displacement);
    deletePreset('in-service',id);expect(getPresets('in-service')).toHaveLength(1);
  });
  it('preserves cleared numeric fields as invalid, not as zero or defaults',()=>{
    const restored=readServicePreset(servicePresetValues({...input,pressure:NaN,allowablePercent:NaN}))!;
    expect(restored.pressure).toBeNaN();expect(restored.allowablePercent).toBeNaN();expect(validate(restored).length).toBeGreaterThan(0);
  });
  it('rejects foreign, incomplete, future-version and malformed payloads',()=>{
    const values=servicePresetValues(input);
    for(const bad of [{Do:123},{...values,presetVersion:3},{...values,mode:'bad'},{...values,scenarios:'bad'},{...values,pressure:'2'}])expect(readServicePreset(bad)).toBeNull();
    delete values.od;expect(readServicePreset(values)).toBeNull();
  });
  it('still reads legacy lowering export files',()=>{
    const parsed=parseImportFile(JSON.stringify({version:1,mode:'lowering',presets:[{name:'Legacy',values:{Do:219.1},createdAt:'2026-01-01'}]}));
    expect(applyImport(parsed.data!,'rename').imported).toBe(1);
    expect(getPresets('lowering')[0].values).toEqual({Do:219.1});expect(getPresets('in-service')).toEqual([]);
  });
});
