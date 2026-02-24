import { useState, useEffect, useRef } from "react";
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

// Force clean re-mount after hook refactor
const Index = () => {
  const [inputs, setInputs] = useState<PipeInputs>({
    Do: 114.3,
    t: 6.02,
    L: 30,
    h: 2500,
    grade: "API 5L X52",
    customYield: 359,
    E: 210,
    allowablePercent: 80,
    includeSelfWeight: true,
    density: 7850,
    calcMode: "standard",
    targetSupports: 0,
  });

  const update = (field: string, value: string | number | boolean) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  const { results, isComputing } = useFEMWorker(inputs);

  return (
    <div className="min-h-screen grid-background">
      <Header />
      <main className="container px-4 py-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <GeometryCard
              Do={inputs.Do} t={inputs.t} L={inputs.L} h={inputs.h}
              section={results.section}
              calcMode={inputs.calcMode}
              computedL={results.computedL}
              computedH={results.computedH}
              onChange={update}
            />
            <MaterialCard
              grade={inputs.grade} E={inputs.E} customYield={inputs.customYield}
              onChange={update}
            />
            <AllowableStressCard
              allowablePercent={inputs.allowablePercent}
              yieldStrength={results.yieldStrength}
              allowableStress={results.allowableStress}
              onChange={v => update("allowablePercent", v)}
            />
            <LoadCard
              includeSelfWeight={inputs.includeSelfWeight}
              density={inputs.density}
              q={results.q}
              weightPerMeter={results.section.weightPerMeter}
              onChange={update}
            />
          </div>
          <div className="lg:col-span-2 space-y-4">
            {/* Computing indicator */}
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
            <ResultsPanel results={results} />
            <DebugPanel debug={results.debug} numSupports={results.numSupports} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
