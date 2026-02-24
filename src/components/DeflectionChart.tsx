import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalculationResults } from "@/lib/calculations";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceDot,
} from "recharts";
import { ArrowDown } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type PlotMode = "elevation" | "sag" | "raw";

interface Props {
  results: CalculationResults;
}

const DeflectionChart = ({ results }: Props) => {
  const { deflectionData, supportStatus } = results;
  const [amplify, setAmplify] = useState(false);
  const [mode, setMode] = useState<PlotMode>("elevation");

  if (!deflectionData || deflectionData.length === 0) return null;

  const L_m = deflectionData[deflectionData.length - 1]?.x ?? 0;
  const lastW = deflectionData[deflectionData.length - 1]?.w ?? 0;
  const factor = amplify ? 10 : 1;

  // Build chart data based on mode
  const chartData = deflectionData.map(d => {
    const w_ref = L_m > 0 ? (d.x / L_m) * lastW : 0;
    if (mode === "elevation") {
      // z(x) = -w(x), physical vertical coordinate (up is up)
      return { x: d.x, value: -d.w * factor, ref: -w_ref * factor };
    } else if (mode === "sag") {
      // w_rel(x) = w(x) - w_ref(x), positive = sag below settlement line
      return { x: d.x, value: (d.w - w_ref) * factor, ref: 0 };
    } else {
      // raw: w(x) positive downward
      return { x: d.x, value: d.w * factor, ref: w_ref * factor };
    }
  });

  const allVals = chartData.flatMap(d => [d.value, d.ref]);
  const minV = Math.min(...allVals);
  const maxV = Math.max(...allVals);
  const margin = Math.max(Math.abs(maxV - minV) * 0.2, 1);

  const yLabel = mode === "elevation"
    ? (amplify ? "z ×10 (mm)" : "z (mm)")
    : mode === "sag"
      ? (amplify ? "sag ×10 (mm)" : "sag (mm)")
      : (amplify ? "w ×10 (mm)" : "w (mm)");

  const refLabel = mode === "elevation" ? "Settlement line" : mode === "sag" ? "Zero line" : "Settlement line";
  const valueLabel = mode === "elevation" ? "Elevation" : mode === "sag" ? "Sag" : "Deflection (w↓+)";

  // Invert Y for raw mode (positive downward → flip axis so down is down)
  const yDomain: [number, number] = mode === "raw"
    ? [maxV + margin, minV - margin] // inverted
    : [minV - margin, maxV + margin]; // normal

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <ArrowDown className="h-4 w-4 text-primary" /> Deflection
          </span>
          <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-normal cursor-pointer">
            <Checkbox
              checked={amplify}
              onCheckedChange={(v) => setAmplify(v === true)}
              className="h-3 w-3"
            />
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
                label={{ value: "Position (m)", position: "insideBottom", offset: -10, fontSize: 11 }}
                tick={{ fontSize: 10 }}
              />
              <YAxis
                domain={yDomain}
                label={{ value: yLabel, angle: -90, position: "insideLeft", offset: 5, fontSize: 11 }}
                tick={{ fontSize: 10 }}
                reversed={mode === "raw"}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
                formatter={(value: number, name: string) => [
                  `${value.toFixed(3)} mm`,
                  name === "value" ? (amplify ? `${valueLabel} ×10` : valueLabel) : refLabel
                ]}
                labelFormatter={l => `x = ${l} m`}
              />

              {/* Reference/settlement line */}
              <Line
                type="monotone"
                dataKey="ref"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={1}
                strokeDasharray="6 4"
                dot={false}
                name="ref"
              />

              {/* Main deflection curve */}
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(34 100% 51%)"
                strokeWidth={2}
                dot={false}
                animationDuration={600}
                name="value"
              />

              {/* Support markers */}
              {supportStatus.map((sup, i) => {
                let markerY: number;
                const w_ref_sup = L_m > 0 ? (sup.x / L_m) * lastW : 0;
                if (mode === "elevation") {
                  markerY = -w_ref_sup * factor;
                } else if (mode === "sag") {
                  markerY = 0;
                } else {
                  markerY = w_ref_sup * factor;
                }
                return (
                  <ReferenceDot
                    key={`sup-${i}`}
                    x={Math.round(sup.x * 1000) / 1000}
                    y={markerY}
                    r={4}
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
