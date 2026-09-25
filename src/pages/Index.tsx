// src/pages/Index.tsx
// Modifié par Giovanni malagnino, 2026-09-25 01:21 CEST (Europe/Rome, UTC+2)

import { useMemo, useState } from "react";
import Header from "@/components/Header";
import GeometryCard from "@/components/GeometryCard";
import MaterialCard from "@/components/MaterialCard";
import AllowableStressCard from "@/components/AllowableStressCard";
import LoadCard from "@/components/LoadCard";
import { UnitProvider } from "@/contexts/UnitContext";
import PipeSchematicSVG from "@/components/PipeSchematicSVG";
import CoatingCard from "@/components/CoatingCard";
import { findNpsByOd } from "@/lib/pipe-presets";
import heroPipeline from "@/assets/hero-pipeline.png";
import Footer from "@/components/Footer";
import Disclaimer from "@/components/Disclaimer";
import PresetsCard from "@/components/presets/PresetsCard";
import AnalysisCard from "@/components/v2/AnalysisCard";
import V2Workspace from "@/components/v2/V2Workspace";
import { AppInputs, DEFAULT_INPUTS } from "@/lib/v2-app/inputs";
import { derive } from "@/lib/v2-app/bridge";


const Index = () => {
  const [inputs, setInputs] = useState<AppInputs>(DEFAULT_INPUTS);

  const update = (field: string, value: string | number | boolean) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  // Section, load and allowable stress (engine units), shared by cards and V2.
  const results = useMemo(() => derive(inputs), [inputs]);

  return (
    <UnitProvider>
      <div className="min-h-screen grid-background">
        <Header />
        <div className="relative w-full h-40 sm:h-52 md:h-64 overflow-hidden">
          <img
            src={heroPipeline}
            alt="Pipeline lowering-in with sidebooms"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
        </div>
        <main className="container px-4 py-6 space-y-6">
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">
            Pipe Lowering Analysis &amp; Stress Calculator
          </h1>

          <div className="rounded-lg border bg-muted/50 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
            <p>
              This calculation applies, for example, to a <strong>trench lowering-in with sidebooms</strong>.
              The height <strong>h</strong> represents the trench depth plus the pipe lifting height from ground level.
              The length <strong>L</strong> is the distance from the last sideboom to the point where the pipe contacts the trench bottom.
              Additional sideboom(s) may be positioned in between if intermediate support(s) are required.
            </p>
          </div>
          <PipeSchematicSVG />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <GeometryCard
                Do={inputs.Do} t={inputs.t} L={inputs.L} h={inputs.h} hl={inputs.hl}
                section={results.section} showL={inputs.mode === "fixedLength"} onChange={update}
              />
              <AnalysisCard inputs={inputs} onChange={update} />
              <MaterialCard grade={inputs.grade} E={inputs.E} customYield={inputs.customYield} onChange={update} />
              <CoatingCard
                coatingType={inputs.coatingType as any}
                coatingThickness={inputs.coatingThickness}
                coatingDensity={inputs.coatingDensity}
                Do={inputs.Do}
                nps={findNpsByOd(inputs.Do)}
                onChange={update}
              />
              <AllowableStressCard
                allowablePercent={inputs.allowablePercent} yieldStrength={results.yieldStrength}
                allowableStress={results.allowableStress} onChange={(v) => update("allowablePercent", v)}
              />
              <LoadCard
                includeSelfWeight={inputs.includeSelfWeight} density={inputs.density}
                q={results.q} weightPerMeter={results.section.weightPerMeter}
                coatingWeightPerMeter={results.section.coatingWeightPerMeter}
                onChange={update}
              />
            </div>

            <div className="lg:col-span-2">
              <V2Workspace inputs={inputs} derived={results} />
            </div>
          </div>

          <PresetsCard
            inputs={inputs}
            onLoad={setInputs}
          />
        </main>

        <div className="container px-4 pb-6">
          <Disclaimer />
        </div>
        <Footer />
      </div>
    </UnitProvider>
  );
};

export default Index;
