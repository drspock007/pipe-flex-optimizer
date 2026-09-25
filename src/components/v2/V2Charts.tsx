// créé par Giovanni Malagnino, 2026-09-25 01:21 CEST (Europe/Rome, UTC+2)
// Display-only curves from sampleCurve. Design maxima come from the engine.

import { useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { BiaxialSuccess, CurveSample } from "@/lib/mechanics-v2";
import { useUnits } from "@/contexts/UnitContext";

interface Props { solution: BiaxialSuccess; samples: CurveSample[] }

const V2Charts = ({ solution, samples }: Props) => {
  const { conv, label } = useUnits();
  const [deviation, setDeviation] = useState(false);
  const data = samples.map((p) => ({
    x: conv(p.x / 1000, "m"),
    sigma: conv(p.sigma, "MPa"),
    z: conv(deviation ? p.deltaZ : p.z, "mm"),
    y: conv(deviation ? p.deltaY : p.y, "mm"),
  }));
  const supports = solution.supports.map((s) => ({ x: conv(s.x / 1000, "m"), active: s.active, i: s.index }));
  const chart = (key: "sigma" | "z" | "y", unit: "MPa" | "mm", name: string, extra?: JSX.Element) => (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 16, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="x" type="number" domain={[0, "dataMax"]} tickFormatter={(v) => String(Math.round(v))}
            label={{ value: `x (${label("m")})`, position: "insideBottom", offset: 0, fontSize: 11 }} tick={{ fontSize: 11 }} height={40} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => String(Math.round(v))} width={64}
            label={{ value: `${name} (${label(unit)})`, angle: -90, position: "insideLeft", offset: 4, fontSize: 11, style: { textAnchor: "middle" } }} />
          <Tooltip formatter={(v: number) => [`${v.toFixed(3)} ${label(unit)}`, name]} labelFormatter={(v: number) => `x = ${v.toFixed(3)} ${label("m")}`} />
          {supports.map((s) => (
            <ReferenceLine key={s.i} x={s.x} stroke="hsl(var(--primary))" strokeDasharray={s.active ? undefined : "4 3"} strokeOpacity={s.active ? 0.9 : 0.4}
              label={{ value: `S${s.i}${s.active ? "" : " (open)"}`, fontSize: 9, position: "top" }} />
          ))}
          {extra}
          <Line type="monotone" dataKey={key} stroke="hsl(var(--primary))" dot={false} strokeWidth={2} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
  return (
    <Tabs defaultValue="stress">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TabsList>
          <TabsTrigger value="stress">Stress σ(x)</TabsTrigger>
          <TabsTrigger value="z">Vertical z(x)</TabsTrigger>
          <TabsTrigger value="y">Lateral y(x)</TabsTrigger>
        </TabsList>
        <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Switch checked={deviation} onCheckedChange={setDeviation} className="h-5 w-9" />
          Deviation from the end-to-end chord
        </label>
      </div>
      <TabsContent value="stress">
        {chart("sigma", "MPa", "Resultant bending stress",
          <ReferenceLine y={conv(solution.sigmaAllow, "MPa")} stroke="hsl(var(--destructive))" strokeDasharray="6 3" label={{ value: "allowable", fontSize: 9, position: "right" }} />)}
      </TabsContent>
      <TabsContent value="z">{chart("z", "mm", deviation ? "Δz = z − hv·x/L" : "Absolute vertical z (up +)")}</TabsContent>
      <TabsContent value="y">{chart("y", "mm", deviation ? "Δy = y − hl·x/L" : "Absolute lateral y")}</TabsContent>
      <p className="text-[11px] text-muted-foreground mt-1">Curves are sampled for display only; the maximum stress shown in the results is computed exactly by the engine.</p>
    </Tabs>
  );
};

export default V2Charts;
