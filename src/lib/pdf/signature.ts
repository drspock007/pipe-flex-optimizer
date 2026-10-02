import type {jsPDF} from 'jspdf';

/** Blank signing space on the final page of every report, clear of content and footers. */
export function addSignature(doc:jsPDF,cursorY:number,colors?:{
 foreground:[number,number,number];border:[number,number,number];
},margin=16){
 if(cursorY>244){doc.addPage();cursorY=24;}
 const top=Math.max(cursorY+2,242);
 doc.setDrawColor(...(colors?.border??[120,120,120] as [number,number,number]));
 doc.setLineWidth(.3);
 doc.setTextColor(...(colors?.foreground??[30,30,30] as [number,number,number]));
 doc.setFont('helvetica','normal');doc.setFontSize(10);
 doc.text('Signature',margin,top);
 doc.rect(margin,top+3,doc.internal.pageSize.getWidth()-2*margin,25);
}
