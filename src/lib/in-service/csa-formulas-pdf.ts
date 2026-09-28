import type { jsPDF } from 'jspdf';
import type { MathPart } from './csa-formulas';
/** Native vector typesetting: scalable fractions, subscripts, Greek and inequalities. */
export function drawFormula(doc:jsPDF,parts:MathPart[],x:number,y:number,size=13):number {
  const font=(p:Extract<MathPart,{text:string}>,s:number)=>{
    doc.setFont(p.greek||p.text==='\\theta'?'symbol':'times',p.greek||p.text==='\\theta'||p.upright?'normal':'italic');doc.setFontSize(s);
  };
  const glyph=(p:Extract<MathPart,{text:string}>)=>p.text==='\\theta'?'q':p.text;
  const width=(ps:MathPart[],s:number):number=>ps.reduce((w,p)=>{
    if('relation' in p)return w+s*.4;
    if('numerator' in p)return w+Math.max(width(p.numerator,s*.9),width(p.denominator,s*.9))+3;
    font(p,s);const main=doc.getTextWidth(glyph(p));doc.setFont('times','italic');doc.setFontSize(s*.65);
    return w+main+(p.sub?doc.getTextWidth(p.sub):0);
  },0);
  const paint=(ps:MathPart[],left:number,baseline:number,s:number)=>{
    for(const p of ps){
      const w=width([p],s);
      if('relation' in p){
        const a=left+1,b=left+w-1,mid=baseline-s*.055,top=mid-s*.11,bottom=mid+s*.11;
        const tip=p.relation==='le'?a:b,tail=p.relation==='le'?b:a;
        doc.setLineWidth(.22);doc.line(tail,top,tip,mid);doc.line(tip,mid,tail,bottom);doc.line(a,bottom+1,b,bottom+1);
      }else if('numerator' in p){
        const ns=s*.9,nw=width(p.numerator,ns),dw=width(p.denominator,ns),bar=baseline-s*.08;
        paint(p.numerator,left+(w-nw)/2,bar-1.5,ns);
        doc.setLineWidth(.22);doc.line(left+.5,bar,left+w-.5,bar);
        paint(p.denominator,left+(w-dw)/2,bar+s*.31,ns);
      }else{
        font(p,s);doc.text(glyph(p),left,baseline);const main=doc.getTextWidth(glyph(p));
        if(p.sub){doc.setFont('times',p.sub.length>1?'normal':'italic');doc.setFontSize(s*.65);doc.text(p.sub,left+main,baseline+s*.10);}
      }
      left+=w;
    }
  };
  const w=width(parts,size);paint(parts,x,y,size);doc.setFont('helvetica','normal');doc.setFontSize(9);return w;
}
