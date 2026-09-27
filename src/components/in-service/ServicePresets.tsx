import { toast } from 'sonner';
import { PresetManager } from '@/components/presets/PresetManager';
import { readServicePreset, servicePresetValues } from '@/lib/in-service/presets';
import type { ServiceInput } from '@/lib/in-service/types';

export function ServicePresets({input,onLoad}:{input:ServiceInput;onLoad:(input:ServiceInput)=>void}) {
  return <section className="rounded-lg border bg-card p-4 space-y-4">
    <h2 className="font-semibold">Presets</h2>
    <p className="text-xs text-muted-foreground">Save all In-service inputs on this device: pipe, steel, fluid, coating, operating conditions, movement, supports, custom criterion and initial-state scenarios. Use Manage to rename, duplicate, delete or export/import presets. Loading a preset clears previous results; calculate again after reviewing the inputs.</p>
    <PresetManager mode="in-service" getCurrentValues={()=>servicePresetValues(input)} onLoad={values=>{
      const restored=readServicePreset(values);
      if(!restored){toast.error('Invalid or unsupported In-service preset. Current inputs were kept.');return false;}
      onLoad(restored);
    }}/>
  </section>;
}
