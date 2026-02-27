// src/pages/HelpPage.tsx

import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import HelpIntroduction from "./help/HelpIntroduction";
import HelpInputs from "./help/HelpInputs";
import HelpSectionProperties from "./help/HelpSectionProperties";
import HelpMechanicalModel from "./help/HelpMechanicalModel";
import HelpLoading from "./help/HelpLoading";
import HelpSettlement from "./help/HelpSettlement";
import HelpSupports from "./help/HelpSupports";
import HelpFEM from "./help/HelpFEM";
import HelpCalcModes from "./help/HelpCalcModes";
import HelpSafetyCriteria from "./help/HelpSafetyCriteria";
import HelpValidation from "./help/HelpValidation";
import HelpLimitations from "./help/HelpLimitations";

const tocItems = [
  { id: "introduction", label: "1. Introduction" },
  { id: "inputs", label: "2. Input Parameters" },
  { id: "section-properties", label: "3. Section Properties" },
  { id: "mechanical-model", label: "4. Mechanical Model" },
  { id: "loading", label: "5. Loading" },
  { id: "settlement", label: "6. Differential Settlement" },
  { id: "supports", label: "7. Intermediate Supports" },
  { id: "fem", label: "8. Finite Element Method" },
  { id: "calc-modes", label: "9. Calculation Modes" },
  { id: "safety", label: "10. Safety Criteria" },
  { id: "validation", label: "11. Validation" },
  { id: "limitations", label: "12. Limitations" },
];

const HelpPage = () => {
  useEffect(() => {
    document.title = "Help & Documentation — Pipe Lowering | Pipeline Engineering Reference";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Technical documentation for the Pipe Lowering tool: mechanical model, FEM solver, calculation modes, safety criteria and validation for pipeline lowering-in operations.");
    return () => {
      document.title = "Pipe Lowering — Flexibility Optimizer | Pipeline Stress Analysis Tool";
      if (meta) meta.setAttribute("content", "Free online pipe lowering stress analysis tool for pipeline engineers. Compute bending stress, deflection and optimal support spacing during trench lowering-in operations.");
    };
  }, []);

  return (
  <div className="min-h-screen grid-background">
    <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container flex h-14 items-center gap-3 px-4">
        <Link
          to="/"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div className="h-5 w-px bg-border" />
        <h1 className="text-sm font-bold tracking-tight">Help &amp; Documentation</h1>
      </div>
    </header>

    <main className="container max-w-4xl mx-auto px-4 py-8 space-y-10">
      {/* Table of contents */}
      <nav className="rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold mb-2">Table of Contents</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          {tocItems.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <HelpIntroduction />
      <HelpInputs />
      <HelpSectionProperties />
      <HelpMechanicalModel />
      <HelpLoading />
      <HelpSettlement />
      <HelpSupports />
      <HelpFEM />
      <HelpCalcModes />
      <HelpSafetyCriteria />
      <HelpValidation />
      <HelpLimitations />

      <footer className="pt-6 border-t text-center text-[10px] text-muted-foreground">
        v202602252100
      </footer>
    </main>
  </div>
  );
};

export default HelpPage;
