import type { jsPDF } from 'jspdf';
import {appVersionFooter} from './app-version-footer';
export type RGB = [number, number, number];
export interface PdfPalette {background:RGB;foreground:RGB;card:RGB;muted:RGB;primary:RGB;tableHeader:RGB;primaryText:RGB;border:RGB}
/** Fixed ink-conscious palette shared by every exported report, regardless of the app theme. */
export const LIGHT_PDF:PdfPalette={background:[255,255,255],foreground:[15,23,41],card:[250,250,250],muted:[86,100,118],primary:[255,147,5],tableHeader:[255,242,220],primaryText:[15,23,41],border:[220,220,220]};
export function hslRgb(value:string):RGB {
  const [h,s0,l0]=value.trim().split(/\s+/).map(parseFloat),s=s0/100,l=l0/100;
  const a=s*Math.min(l,1-l),f=(n:number)=>{const k=(n+h/30)%12;return Math.round(255*(l-a*Math.max(-1,Math.min(k-3,9-k,1))));};
  return [f(0),f(8),f(4)];
}
/** PDF colors never follow the current app theme. */
export function printPdfPalette():PdfPalette {
  return LIGHT_PDF;
}
/** @deprecated Use printPdfPalette; retained for older internal callers. */
export const currentPdfPalette=printPdfPalette;
export const PLOT_COLORS={excavated:[59,130,246] as RGB,target:[245,158,11] as RGB,selected:[16,185,129] as RGB,neutral:[148,163,184] as RGB};
export function themePages(doc:jsPDF,p:PdfPalette){
  const paint=()=>{doc.setFillColor(...p.background);doc.rect(0,0,210,297,'F');doc.setFillColor(...p.primary);doc.rect(0,0,3,297,'F');doc.rect(207,0,3,297,'F');doc.setTextColor(...p.foreground);doc.setDrawColor(...p.foreground);};
  paint();doc.internal.events.subscribe('addPage',paint);
}

/** Common header, release identification and pagination for all modules. */
export function finishPdfPages(doc:jsPDF,p:PdfPalette,version:string|undefined,heading:string,format:'Complete'|'Summary'){
  const pages=doc.getNumberOfPages();
  for(let k=1;k<=pages;k++){
    doc.setPage(k);doc.setFont('helvetica','normal');doc.setFontSize(8);
    doc.setTextColor(...p.muted);
    doc.text(heading,16,12);
    appVersionFooter(doc,version);
    doc.text(`${format} | ${k} / ${pages}`,16,288);
  }
}
