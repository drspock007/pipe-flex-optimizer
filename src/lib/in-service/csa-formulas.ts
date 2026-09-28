/** Shared mathematical notation for screen (KaTeX) and vector PDF output. */
export type MathPart =
  | {text:string; sub?:string; greek?:'nu'|'alpha'; upright?:boolean}
  | {relation:'le'|'ge'}
  | {numerator:MathPart[]; denominator:MathPart[]};
const t=(text:string,sub?:string):MathPart=>({text,sub});
const op=(text:string):MathPart=>({text,upright:true});
const le:MathPart={relation:'le'}, ge:MathPart={relation:'ge'};
const nu:MathPart={text:'n',greek:'nu'},alpha:MathPart={text:'a',greek:'alpha'};
export interface ScientificFormula { parts:MathPart[]; note?:string }
export const CSA_FORMULAS:Record<string,ScientificFormula[]> = {
  wall:[{parts:[t('t','nom'),ge,t('t','min')],note:'Minimum from Table 4.5; use the next larger listed outside diameter.'}],
  temperature:[{parts:[t('T'),op(' = '),t('T','a'),op(' + '),{numerator:[t('T','b'),op(' - '),t('T','a')],denominator:[t('\\theta','b'),op(' - '),t('\\theta','a')]},op(' ('),t('\\theta'),op(' - '),t('\\theta','a'),op(')')],note:'Linear interpolation between adjacent Table 4.4 temperatures: theta is temperature; T is the dimensionless factor. T = 1 at or below 120 °C; no extrapolation above 230 °C.'}],
  anchored:[
    {parts:[t('t','n'),op(' = '),t('t','nom'),op(' - '),t('c')],note:'c: allowance under 4.3.10.'},
    {parts:[t('S','h'),op(' = '),{numerator:[t('P'),op(' '),t('D')],denominator:[op('2'),t('t','n')]}]},
    {parts:[t('S','L'),op(' = '),nu,t('S','h'),op(' - '),t('E'),alpha,op(' ('),t('T','2'),op(' - '),t('T','1'),op(')')]},
    {parts:[t('S','h'),op(' - '),t('S','L'),le,op('0.90 '),t('S'),op(' '),t('T')],note:'Applies when SL ≤ 0. Calculations use mm, MPa and °C. S is specified SMYS; T is the temperature factor. This is not a lifting check.'},
  ],
};
function atomTex(text:string):string {return text==='\\theta'?'\\theta':text.replace(/ /g,'\\,');}
export function formulaTex(parts:MathPart[]):string {
  return parts.map(p=>{
    if('relation' in p)return p.relation==='le'?'\\leq':'\\geq';
    if('numerator' in p)return `\\frac{${formulaTex(p.numerator)}}{${formulaTex(p.denominator)}}`;
    const text=p.greek?`\\${p.greek}`:atomTex(p.text);
    return text+(p.sub?`_{${p.sub.length>1?`\\mathrm{${p.sub}}`:p.sub}}`:'');
  }).join(' ');
}
