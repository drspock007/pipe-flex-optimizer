// créé par Giovanni Malagnino, 2026-09-25 01:21 CEST (Europe/Rome, UTC+2)
// Modifié par Giovanni Malagnino, 2026-09-25 20:10 CEST: ground level and contact zones (V2-5).
// Display-only curves from sampleCurve. Design maxima come from the engine.

import { useState } from "react";
import { CartesianGrid, Line, ReferenceArea, ReferenceDot, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { BiaxialSuccess, CurveSample } from "@/lib/mechanics-v2";
import { useUnits } from "@/contexts/UnitContext";

interface Props { solution: BiaxialSuccess; samples: CurveSample[] }

const V2Charts = ({ solution, samples }: Props) => {
  const { conv, label } = useUnits();
  const [deviation, setDeviation] = useState(false);
  const gz = solution.ground ? solution.ground.level : null;
  const data = samples.map((p) => ({
    x: conv(p.x / 1000, "m"),
    sigma: conv(p.sigma, "MPa"),
    ...(p.sigmaCombined === undefined ? {} : { sigmaC: conv(p.sigmaCombined, "MPa") }),
    z: conv(deviation ? p.deltaZ : p.z, "mm"),
    y: conv(deviation ? p.deltaY : p.y, "mm"),
    // Ground level in the same axes; in chord coordinates it becomes groundZ - hv*x/L (not horizontal).
    ...(gz === null ? {} : { ground: conv(deviation ? gz - (solution.input.hv * p.x) / solution.L : gz, "mm") }),
  }));
  const supports = solution.supports.map((s) => ({ x: conv(s.x / 1000, "m"), active: s.active, i: s.index }));
  const chart = (key: "sigma" | "z" | "y", unit: "MPa" | "mm", name: string, extra?: JSX.Element | JSX.Element[]) => (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 16, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="x" type="number" domain={[0, "dataMax"]} tickFormatter={(v) => String(Math.round(v))}
            label={{ value: `x (${label("m")})`, position: "insideBottom", offset: 0, fontSize: 11 }} tick={{ fontSize: 11 }} height={40} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => String(Math.round(v))} width={64}
            label={{ value: `${name} (${label(unit)})`, angle: -90, position: "insideLeft", offset: 4, fontSize: 11, style: { textAnchor: "middle" } }} />
          <Tooltip formatter={(v: number, n: string) => [`${v.toFixed(3)} ${label(unit)}`, n === "sigmaC" ? "Combined normal stress N/A + σb" : n === "sigma" || n === "z" || n === "y" ? name : n]} labelFormatter={(v: number) => `x = ${v.toFixed(3)} ${label("m")}`} />
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
          [<ReferenceLine key="allow" y={conv(solution.sigmaAllow, "MPa")} stroke="hsl(var(--destructive))" strokeDasharray="6 3" label={{ value: "allowable", fontSize: 9, position: "insideTopRight" }} />,
            ...(solution.axial ? [<Line key="comb" type="monotone" dataKey="sigmaC" stroke="hsl(var(--foreground))" strokeDasharray="5 3" dot={false} strokeWidth={1.5} isAnimationActive={false} />] : [])])}
        {solution.axial && <p className="text-[11px] text-muted-foreground">Restrained axial mode — solid orange: resultant bending stress σb; dashed: combined normal stress N/A + σb (governs the verdict). Pressure and shear are not included.</p>}
      </TabsContent>
      <TabsContent value="z">{chart("z", "mm", deviation ? "Δz = z − hv·x/L" : "Absolute vertical z (up +)", solution.ground ? [
        ...solution.ground.contactZones.map((z, i) => (
          <ReferenceArea key={`gz${i}`} x1={conv(z.xStart / 1000, "m")} x2={conv(Math.max(z.xEnd, z.xStart + solution.L / 400) / 1000, "m")} fill="hsl(var(--muted-foreground))" fillOpacity={0.15} strokeOpacity={0} />
        )),
        // Discrete numerical contacts (display subsampled to at most ~150 markers).
        ...solution.ground.contactPoints.filter((_, i, a) => i % Math.max(1, Math.ceil(a.length / 150)) === 0).map((x, i) => (
          <ReferenceDot key={`gp${i}`} x={conv(x / 1000, "m")} y={conv(deviation ? solution.ground!.level - (solution.input.hv * x) / solution.L : solution.ground!.level, "mm")} r={2} fill="hsl(var(--foreground))" stroke="none" ifOverflow="extendDomain" />
        )),
        <Line key="ground" type="linear" dataKey="ground" name="Ground (min. axis level)" stroke="hsl(var(--muted-foreground))" strokeDasharray="6 4" dot={false} strokeWidth={1.5} isAnimationActive={false} />,
      ] : undefined)}
        {solution.ground && <p className="text-[11px] text-muted-foreground">Dashed grey: minimum pipe-axis elevation (ground). Dots: discrete numerical contact nodes (not installed supports). Shaded: estimated zones near the ground, a graphical grouping of these contacts only; outside them the pipe is above the ground at the computed nodes. Orange lines: installed supports.</p>}
      </TabsContent>
      <TabsContent value="y">{chart("y", "mm", deviation ? "Δy = y − hl·x/L" : "Absolute lateral y")}</TabsContent>
      <p className="text-[11px] text-muted-foreground mt-1">Curves are sampled for display only; the maximum stress shown in the results is computed exactly on each element of the engine model{solution.ground ? " (with ground: on the discretized model, with mesh-convergence control)" : ""}.</p>
    </Tabs>
  );
};

export default V2Charts;
