// src/pages/HelpPage.tsx

import { useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Disclaimer from "@/components/Disclaimer";
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
    document.title = "Help & Documentation — Pipe Lowering Reference";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Technical documentation for Pipe Lowering: mechanical model, FEM solver, calculation modes, safety criteria, and validation for pipeline operations.");
    // Update canonical to self-reference this route
    const canonical = document.querySelector('link[rel="canonical"]');
    const prevCanonical = canonical?.getAttribute("href") ?? null;
    if (canonical) canonical.setAttribute("href", "https://pipe-lowering.giovannimalagninoconsulting.com/help");
    return () => {
      document.title = "Pipe Lowering — Pipeline Stress Analysis Tool";
      if (meta) meta.setAttribute("content", "Online pipe lowering stress analysis tool for engineers. Compute bending stress, deflection and optimal support spacing for trench lowering-in operations.");
      if (canonical && prevCanonical) canonical.setAttribute("href", prevCanonical);
    };
  }, []);

  return (
  <div className="min-h-screen grid-background flex flex-col">
    <Header />

    <main className="container max-w-4xl mx-auto px-4 py-8 space-y-10 flex-1">
      <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">
        Pipe Lowering Documentation
      </h1>

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

    <div className="container max-w-4xl mx-auto px-4 pb-6">
      <Disclaimer />
    </div>
    <Footer />
  </div>
  );
};

export default HelpPage;
