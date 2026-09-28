export const HELP_TOC = [
  { label: "Getting started", items: [["getting-started", "Choose the model"], ["result-terminology", "Result terminology"], ["units-and-exports", "Units and exports"]] },
  { label: "Pipe Lowering", items: [["pipe-lowering", "Overview"], ["lowering-inputs", "Inputs and conventions"], ["lowering-mechanics", "Mechanical models"], ["lowering-contact", "Supports and ground"], ["lowering-modes", "Calculation modes"], ["lowering-numerics", "Evidence and limits"]] },
  { label: "In-service Deflection", items: [["in-service", "Overview"], ["service-scope", "Scope and inputs"], ["service-axial", "Axial forces"], ["service-path", "Path and supports"], ["service-modes", "Calculation modes"], ["service-stress", "Stress and refinement"], ["service-results", "Results and presets"], ["service-limitations", "Limitations"]] },
] as const;
