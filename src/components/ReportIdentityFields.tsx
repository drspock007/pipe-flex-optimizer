import {useId} from 'react';
import {Input} from './ui/input';
import FieldHelp from './FieldHelp';
export interface IdentityFields {preparedBy:string;projectName:string}
export default function ReportIdentityFields({value,onChange}:{value:IdentityFields;onChange:(v:IdentityFields)=>void}){
 const id=useId();
 return <div className="grid sm:grid-cols-2 gap-3">{(['preparedBy','projectName'] as const).map(k=><div key={k}><div className="flex items-center gap-1"><label htmlFor={`${id}-${k}`} className="text-sm">{k==='preparedBy'?'Prepared by':'Project name'} *</label><FieldHelp text={k==='preparedBy'?'Required: name of the person preparing this report. Printed in the PDF; does not change the calculation.':'Required: project identification printed in the PDF. Date and time are added automatically when exporting.'}/></div><Input id={`${id}-${k}`} required maxLength={80} value={value[k]} onChange={e=>onChange({...value,[k]:e.target.value})}/></div>)}</div>;
}
