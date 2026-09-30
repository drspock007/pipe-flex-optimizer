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
import { AppInputs, DEFAULT_INPUTS, normalizeAppInputs } from "@/lib/v2-app/inputs";
import UnknownCoatingAlert, { UNKNOWN_COATING_TEXT } from "@/components/v2/UnknownCoatingAlert";
import { derive } from "@/lib/v2-app/bridge";


const Index = () => {
  const [rawInputs, setInputs] = useState<AppInputs>(DEFAULT_INPUTS);
  // Normalized so that a state kept from an older input shape (hot reload) is always complete.
  const inputs = useMemo(() => normalizeAppInputs(rawInputs as unknown as Record<string, unknown>), [rawInputs]);

  // Unknown coating key of the last loaded preset: blocks the export until resolved.
  const [unknownCoating, setUnknownCoating] = useState<string | null>(null);
  const update = (field: string, value: string | number | boolean) => {
    if (field === "coatingType") setUnknownCoating(null);
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

          <div className="rounded-lg border bg-muted/50 px-4 py-3 text-xs text-muted-foreground leading-relaxed space-y-2">
            <p>
              Analyze <strong>pipe lowering into a trench with sidebooms</strong> using four modes: <strong>Fixed L</strong> checks a specified length, <strong>Find L range</strong> searches admissible lengths, <strong>Min. supports</strong> searches the smallest support count, and <strong>Find h</strong> searches admissible vertical end offsets.
            </p>
            <p>
              <strong>L</strong> is the span along the x-axis between the fixed ends; <strong>h<sub>v</sub></strong> and <strong>h<sub>l</sub></strong> are the vertical and lateral offsets of the right end, with h<sub>v</sub> positive upwards. Add up to <strong>20 equally spaced vertical supports</strong> that carry load only when in contact, and optionally enable <strong>rigid, horizontal, frictionless ground contact</strong> at the specified minimum pipe-axis elevation.
            </p>
            <p>
              All four modes support <strong>free axial sliding</strong> (bending stress) or <strong>axial restraint</strong> (coupled axial tension and bending; combined normal stress governs), with or without ground contact. Searches with ground or axial restraint are <strong>exploratory</strong>: coverage is not certified, and a support count above zero is not certified minimal. Review numerical validity and model limits alongside the stress verdict; physical validity is not assessed. Results and PDF reports are available in <strong>SI or imperial units</strong>.
            </p>
          </div>
          <PipeSchematicSVG />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <GeometryCard
                Do={inputs.Do} t={inputs.t} L={inputs.L} h={inputs.h} hl={inputs.hl}
                section={results.section} showL={inputs.mode === "fixedLength" || inputs.mode === "findH"} showH={inputs.mode !== "findH"} onChange={update}
              />
              <AnalysisCard inputs={inputs} onChange={update} />
              <MaterialCard grade={inputs.grade} E={inputs.E} customYield={inputs.customYield} onChange={update} />
              {unknownCoating !== null && <UnknownCoatingAlert coatingKey={unknownCoating} onConfirmNone={() => update("coatingType", "none")} />}
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
              <V2Workspace inputs={inputs} derived={results} exportBlocked={unknownCoating !== null ? UNKNOWN_COATING_TEXT : null} />
            </div>
          </div>

          <PresetsCard
            inputs={inputs}
            onLoad={(v, unknown) => { setInputs(v); setUnknownCoating(unknown); }}
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
