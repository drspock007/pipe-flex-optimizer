import {permanentSchema} from './permanent/profile';
import { z } from 'zod';
import type { ServiceInput } from './types';

// JSON turns cleared numeric inputs (NaN) into null. Restore them as missing
// inputs, never as zero or an assumed valid engineering value.
const number = z.number().finite().nullable().transform(v => v === null ? NaN : v);
const schema = z.object({
  presetVersion: z.union([z.literal(1),z.literal(2),z.literal(3)]),
  csa:z.object({enabled:z.boolean(),eligibleSteel:z.boolean(),plainPipeline:z.boolean(),anchored:z.boolean(),designPressure:number,designTemperature:number,anchoringTemperature:number,nominalThickness:number,allowance:number,smys:number}).optional(),
  intervention:z.enum(['temporary','permanent']).optional(),permanent:permanentSchema.optional(),
  od:number, thickness:number, E:number, yield:number, nu:number, alpha:number,
  steelDensity:number, fluidDensity:number, coatingThickness:number, coatingDensity:number,
  pressure:number, temperature:number, halfLength:number, angle:number, displacement:number,
  allowablePercent:number, minHalfLength:number, maxHalfLength:number, maxDisplacement:number,
  mode:z.enum(['direct','length','displacement','supports']),
  direction:z.enum(['vertical','horizontal','combined']),
  coatingType:z.enum(['none','yellowJacket','sp2888','fbeAro','custom']).optional(),
  fluidType:z.enum(['custom','naturalGas','air','hydrogen']).optional(),
  gasMolarMass:number.optional(), gasZ:number.optional(), atmosphericPressure:number.optional(),
  maxSupports:number.optional(),
  supports:z.discriminatedUnion('kind',[
    z.object({kind:z.literal('none')}),
    z.object({kind:z.literal('equidistant'),count:number}),
    z.object({kind:z.literal('custom'),fractions:z.array(number).max(20)}),
  ]).optional(),
  scenarios:z.array(z.object({id:z.string(),name:z.string(),referenceTemperature:number,extraAxial:number})).max(12),
});
export function servicePresetValues(input:ServiceInput):Record<string,unknown> {
  return JSON.parse(JSON.stringify({...input,presetVersion:3}));
}
export function readServicePreset(values:Record<string,unknown>):ServiceInput | null {
  const parsed=schema.safeParse(values);
  if(!parsed.success)return null;
  const {presetVersion: _version,...input}=parsed.data;
  if(_version<3){delete input.intervention;delete input.permanent;}
  if(_version===1) delete input.csa;
  return input as ServiceInput;
}
