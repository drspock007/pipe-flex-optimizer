// Builds the export file name, same convention as the pipe-thickness-calculator app:
// <prefix>_<project-name>_<date>_<time>
export const buildPdfFileName = (projectName: string, date: Date): string => {
  const project = projectName?.trim().replace(/\s+/g, "-") || "export";
  const d = date.toLocaleDateString().replace(/\//g, "-");
  const t = date.toLocaleTimeString().replace(/:/g, "-");
  return `pipe-lowering_${project}_${d}_${t}`;
};
