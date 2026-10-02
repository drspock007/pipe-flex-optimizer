/** Portable PDF names, with export timestamp in the user’s local browser timezone (including DST). */
export function buildPdfFileName(study:string,preparedBy:string,date:Date,variant?:string):string {
 if(!Number.isFinite(date.getTime()))throw new Error('Invalid report date.');
 const words=preparedBy.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').match(/[A-Za-z0-9]+/g)??[];
 const initials=words.map(w=>w[0]).join('').toUpperCase().slice(0,16)||'AUTHOR';
 const parts=new Intl.DateTimeFormat('en-GB',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
 const part=(type:string)=>parts.find(p=>p.type===type)!.value;
 const stamp=['year','month','day','hour','minute'].map(part).join('');
 const safe=(s:string)=>s.toLowerCase().replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
 return [safe(study)||'study',initials,stamp,...(variant?[safe(variant)]:[])].join('_');
}
