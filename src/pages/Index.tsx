// src/pages/Index.tsx

import { useState } from "react";
import Header from "@/components/Header";
import GeometryCard from "@/components/GeometryCard";
import MaterialCard from "@/components/MaterialCard";
import AllowableStressCard from "@/components/AllowableStressCard";
import LoadCard from "@/components/LoadCard";
import ResultsPanel from "@/components/ResultsPanel";
import StressChart from "@/components/StressChart";
import DeflectionChart from "@/components/DeflectionChart";
import DebugPanel from "@/components/DebugPanel";
import { PipeInputs } from "@/lib/calculations";
import { useFEMWorker } from "@/hooks/use-fem-worker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { UnitProvider } from "@/contexts/UnitContext";
import PipeSchematicSVG from "@/components/PipeSchematicSVG";
import CoatingCard from "@/components/CoatingCard";
import { findNpsByOd } from "@/lib/pipe-presets";
import heroPipeline from "@/assets/hero-pipeline.png";
import Footer from "@/components/Footer";

const Index = () => {
  const [inputs, setInputs] = useState<PipeInputs>({
    Do: 114.3, t: 6.02, L: 30, h: 2500,
    grade: "X52", customYield: 359, E: 207,
    allowablePercent: 80, includeSelfWeight: true, density: 7850,
    calcMode: "standard", targetSupports: 0, findLDisplay: "Lmid",
    coatingType: "none", coatingThickness: 1.5, coatingDensity: 950,
  });

  const update = (field: string, value: string | number | boolean) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const { results, isComputing } = useFEMWorker(inputs);

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
                Do={inputs.Do} t={inputs.t} L={inputs.L} h={inputs.h}
                section={results.section} calcMode={inputs.calcMode}
                computedLmin={results.computedLmin} computedLmax={results.computedLmax}
                computedH={results.computedH} onChange={update}
              />
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

            <div className="lg:col-span-2 space-y-4">
              {isComputing && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-md px-3 py-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  Computing FEM solution…
                </div>
              )}

              <Tabs defaultValue="stress">
                <TabsList>
                  <TabsTrigger value="stress">Stress σ(x)</TabsTrigger>
                  <TabsTrigger value="deflection">Deflection w(x)</TabsTrigger>
                </TabsList>
                <TabsContent value="stress">
                  <StressChart results={results} />
                </TabsContent>
                <TabsContent value="deflection">
                  <DeflectionChart results={results} />
                </TabsContent>
              </Tabs>

              <ResultsPanel results={results} onChange={update} />
              {/* <DebugPanel debug={results.debug} numSupports={results.numSupports} supportStatus={results.supportStatus} /> */}
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </UnitProvider>
  );
};

export default Index;
