// src/pages/HelpPage.tsx

import { useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
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
  <div className="min-h-screen grid-background flex flex-col">
    <Header />

    <main className="container max-w-4xl mx-auto px-4 py-8 space-y-10 flex-1">
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
    </main>

    <Footer />
  </div>
  );
};

export default HelpPage;
