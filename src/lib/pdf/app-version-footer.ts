import type {jsPDF} from 'jspdf';
/** Never relabel a legacy calculation with the current app version. */
export function appVersionFooter(doc:jsPDF,version?:string){
 doc.text(version?'App '+version:'App version not recorded',doc.internal.pageSize.getWidth()-16,282,{align:'right'});
}
