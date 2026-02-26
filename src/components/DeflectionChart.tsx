import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalculationResults } from "@/lib/calculations";
import { Checkbox } from "@/components/ui/checkbox";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceDot } from "recharts";
import { ArrowDown } from "lucide-react";
import { useState, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUnits } from "@/contexts/UnitContext";

type PlotMode = "elevation" | "sag" | "raw";

interface Props {
  results: CalculationResults;
}

const DeflectionChart = ({ results }: Props) => {
  const { conv, label } = useUnits();
  const { deflectionData, supportStatus, h_up_mm } = results;
  const [amplify, setAmplify] = useState(false);
  const [mode, setMode] = useState<PlotMode>("sag");

  const hasData = deflectionData && deflectionData.length > 0;

  const L_m = hasData ? (deflectionData[deflectionData.length - 1]?.x ?? 0) : 0;
  const factor = amplify ? 10 : 1;
  const w0 = hasData ? (deflectionData[0]?.w ?? 0) : 0;
  const wL = hasData ? (deflectionData[deflectionData.length - 1]?.w ?? 0) : 0;

  const posLabel = label("m");
  const deflLabel = label("mm");

  const chartData = useMemo(() => (hasData ? deflectionData : []).map((d) => {
    const xRatio = L_m > 0 ? d.x / L_m : 0;
    const w_ref = w0 + xRatio * (wL - w0);

    if (mode === "elevation") {
      const ref = h_up_mm * xRatio;
      const value = -d.w;
      return { x: conv(d.x, "m"), value: conv(value * factor, "mm"), ref: conv(ref * factor, "mm") };
    } else if (mode === "sag") {
      const sag = Math.max(0, d.w - w_ref);
      return { x: conv(d.x, "m"), value: conv(sag * factor, "mm"), ref: 0 };
    } else {
      return { x: conv(d.x, "m"), value: conv(d.w * factor, "mm"), ref: conv(w_ref * factor, "mm") };
    }
  }), [deflectionData, mode, amplify, conv, hasData]);

  if (!hasData) return null;

  const allVals = chartData.flatMap((d) => [d.value, d.ref]);
  const minV = Math.min(...allVals);
  const maxV = Math.max(...allVals);
  const margin = Math.max(Math.abs(maxV - minV) * 0.2, 1);

  const yLabel =
    mode === "elevation"
      ? amplify ? `z ×10 (${deflLabel})` : `z (${deflLabel})`
      : mode === "sag"
        ? amplify ? `sag ×10 (${deflLabel})` : `sag (${deflLabel})`
        : amplify ? `w ×10 (${deflLabel})` : `w (${deflLabel})`;

  const refLabel = mode === "elevation" ? "Settlement line" : mode === "sag" ? "Zero line" : "Settlement line";
  const valueLabel = mode === "elevation" ? "Elevation" : mode === "sag" ? "Sag" : "Deflection (w↓+)";

  const yDomain: [number, number] = mode === "raw"
    ? [maxV + margin, minV - margin]
    : [minV - margin, maxV + margin];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <ArrowDown className="h-4 w-4 text-primary" /> Deflection
          </span>
          <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-normal cursor-pointer">
            <Checkbox checked={amplify} onCheckedChange={(v) => setAmplify(v === true)} className="h-3 w-3" />
            Amplify ×10
          </label>
        </CardTitle>
        <Tabs value={mode} onValueChange={(v) => setMode(v as PlotMode)} className="mt-1">
          <TabsList className="h-7">
            <TabsTrigger value="elevation" className="text-[10px] px-2 py-0.5 h-5">Elevation z(x)</TabsTrigger>
            <TabsTrigger value="sag" className="text-[10px] px-2 py-0.5 h-5">Relative sag</TabsTrigger>
            <TabsTrigger value="raw" className="text-[10px] px-2 py-0.5 h-5">w (↓+)</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 90% / 0.5)" />
              <XAxis
                dataKey="x"
                label={{ value: `Position (${posLabel})`, position: "insideBottom", offset: -10, fontSize: 11 }}
                tick={{ fontSize: 10 }} allowDecimals={false}
                tickFormatter={(v: number) => Math.round(v).toString()}
              />
              <YAxis
                domain={yDomain}
                label={{ value: yLabel, angle: -90, position: "insideLeft", offset: 5, fontSize: 11 }}
                tick={{ fontSize: 10 }} allowDecimals={false}
                tickFormatter={(v: number) => Math.round(v).toString()}
                reversed={mode === "raw"}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px", fontSize: "12px",
                }}
                formatter={(value: number, name: string) => [
                  `${value.toFixed(3)} ${deflLabel}`,
                  name === "value" ? (amplify ? `${valueLabel} ×10` : valueLabel) : refLabel,
                ]}
                labelFormatter={(l) => `x = ${l} ${posLabel}`}
              />
              <Line type="monotone" dataKey="ref" stroke="hsl(var(--muted-foreground))" strokeWidth={1} strokeDasharray="6 4" dot={false} name="ref" />
              <Line type="monotone" dataKey="value" stroke="hsl(34 100% 51%)" strokeWidth={2} dot={false} animationDuration={600} name="value" />
              {supportStatus.map((sup, i) => {
                const xRatio = L_m > 0 ? sup.x / L_m : 0;
                const w_ref_here = w0 + xRatio * (wL - w0);
                let markerY: number;
                if (mode === "elevation") markerY = conv(h_up_mm * xRatio * factor, "mm");
                else if (mode === "sag") markerY = 0;
                else markerY = conv(w_ref_here * factor, "mm");

                return (
                  <ReferenceDot
                    key={`sup-${i}`}
                    x={Math.round(conv(sup.x, "m") * 1000) / 1000}
                    y={markerY} r={4}
                    fill={sup.active ? "hsl(34 100% 51%)" : "none"}
                    stroke={sup.active ? "hsl(34 100% 51%)" : "hsl(var(--muted-foreground))"}
                    strokeWidth={sup.active ? 0 : 1.5}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default DeflectionChart;
