export interface ReportIdentity {preparedBy:string;projectName:string;date:Date}
export function requireReportIdentity(meta:ReportIdentity|undefined):ReportIdentity {
 if(!meta?.preparedBy.trim()||!meta.projectName.trim())throw new Error('Enter your name and the project name before exporting a PDF.');
 if(meta.preparedBy.trim().length>80||meta.projectName.trim().length>80)throw new Error('Report names must not exceed 80 characters.');
 if(!Number.isFinite(meta.date.getTime()))throw new Error('Invalid report date.');
 return {...meta,preparedBy:meta.preparedBy.trim(),projectName:meta.projectName.trim()};
}
