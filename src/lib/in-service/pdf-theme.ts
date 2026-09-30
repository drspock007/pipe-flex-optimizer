import type { jsPDF } from 'jspdf';
export type RGB = [number, number, number];
export interface PdfPalette {background:RGB;foreground:RGB;card:RGB;muted:RGB;primary:RGB;primaryText:RGB;border:RGB}
export const LIGHT_PDF:PdfPalette={background:[255,255,255],foreground:[15,23,41],card:[248,250,252],muted:[86,100,118],primary:[255,147,5],primaryText:[15,23,41],border:[215,224,234]};
export function hslRgb(value:string):RGB {
  const [h,s0,l0]=value.trim().split(/\s+/).map(parseFloat),s=s0/100,l=l0/100;
  const a=s*Math.min(l,1-l),f=(n:number)=>{const k=(n+h/30)%12;return Math.round(255*(l-a*Math.max(-1,Math.min(k-3,9-k,1))));};
  return [f(0),f(8),f(4)];
}
/** Read the same CSS tokens as the visible app at export time. */
export function currentPdfPalette():PdfPalette {
  const css=getComputedStyle(document.documentElement);
  const read=(name:string,fallback:RGB)=>{const v=css.getPropertyValue(name);return v.trim()?hslRgb(v):fallback;};
  return {background:read('--background',LIGHT_PDF.background),foreground:read('--foreground',LIGHT_PDF.foreground),card:read('--card',LIGHT_PDF.card),muted:read('--muted-foreground',LIGHT_PDF.muted),primary:read('--primary',LIGHT_PDF.primary),primaryText:read('--primary-foreground',LIGHT_PDF.primaryText),border:read('--border',LIGHT_PDF.border)};
}
export const PLOT_COLORS={excavated:[59,130,246] as RGB,target:[245,158,11] as RGB,selected:[16,185,129] as RGB,neutral:[148,163,184] as RGB};
export function themePages(doc:jsPDF,p:PdfPalette){
  const paint=()=>{doc.setFillColor(...p.background);doc.rect(0,0,210,297,'F');doc.setFillColor(...p.primary);doc.rect(0,0,3,297,'F');doc.rect(207,0,3,297,'F');doc.setTextColor(...p.foreground);doc.setDrawColor(...p.foreground);};
  paint();doc.internal.events.subscribe('addPage',paint);
}
