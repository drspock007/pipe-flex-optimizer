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
  const { deflectionData, supportStatus, h_up_mm } = results;
  const [amplify, setAmplify] = useState(false);
  const [mode, setMode] = useState<PlotMode>("elevation");

  if (!deflectionData || deflectionData.length === 0) return null;

  const L_m = deflectionData[deflectionData.length - 1]?.x ?? 0;
  const factor = amplify ? 10 : 1;

  // Build chart data based on mode
  // h_up_mm: positive upward (right end higher)
  // w: positive downward (FEM convention)
  // h_fem = -h_up_mm (used in FEM, so w_ref_fem = h_fem * x/L)
  const chartData = deflectionData.map(d => {
    const xRatio = L_m > 0 ? d.x / L_m : 0;
    if (mode === "elevation") {
      // Physical elevation: y_ref(x) = h_up_mm * x/L (upward positive)
      // y_pipe(x) = y_ref(x) - w(x)  (w is downward, so subtract)
      const ref = h_up_mm * xRatio;
      const value = ref - d.w;
      return { x: d.x, value: value * factor, ref: ref * factor };
    } else if (mode === "sag") {
      // Sag = w - w_ref_fem = w - (h_fem * x/L) = w - (-h_up * x/L) = w + h_up * x/L
      // Positive sag = pipe below settlement line
      const w_ref_fem = -h_up_mm * xRatio; // h_fem * x/L
      const sag = d.w - w_ref_fem; // = w + h_up * x/L
      return { x: d.x, value: sag * factor, ref: 0 };
    } else {
      // Raw: w(x) positive downward, with inverted Y axis
      const w_ref_fem = -h_up_mm * xRatio;
      return { x: d.x, value: d.w * factor, ref: w_ref_fem * factor };
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

              {/* Support markers on the settlement/reference line */}
              {supportStatus.map((sup, i) => {
                const xRatio = L_m > 0 ? sup.x / L_m : 0;
                let markerY: number;
                if (mode === "elevation") {
                  // Support sits on settlement line: y_ref = h_up * x/L
                  markerY = h_up_mm * xRatio * factor;
                } else if (mode === "sag") {
                  markerY = 0;
                } else {
                  // Raw: support on w_ref_fem = -h_up * x/L
                  markerY = -h_up_mm * xRatio * factor;
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
