import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalculationResults } from "@/lib/calculations";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceDot,
} from "recharts";
import { ArrowDown } from "lucide-react";
import { useState } from "react";

interface Props {
  results: CalculationResults;
}

const DeflectionChart = ({ results }: Props) => {
  const { deflectionData, supportStatus } = results;
  const [amplify, setAmplify] = useState(false);

  if (!deflectionData || deflectionData.length === 0) return null;

  const L_m = deflectionData[deflectionData.length - 1]?.x ?? 0;
  const lastW = deflectionData[deflectionData.length - 1]?.w ?? 0;

  const factor = amplify ? 10 : 1;

  const dataWithRef = deflectionData.map(d => ({
    x: d.x,
    w: d.w * factor,
    wRef: L_m > 0 ? (d.x / L_m) * lastW * factor : 0,
  }));

  const allW = dataWithRef.map(d => d.w);
  const allRef = dataWithRef.map(d => d.wRef);
  const allVals = [...allW, ...allRef];
  const minW = Math.min(...allVals);
  const maxW = Math.max(...allVals);
  const margin = Math.max(Math.abs(maxW - minW) * 0.2, 1);

  return (
    <Card>
      <CardHeader className="pb-3">
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
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dataWithRef} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 90% / 0.5)" />
              <XAxis
                dataKey="x"
                label={{ value: "Position (m)", position: "insideBottom", offset: -10, fontSize: 11 }}
                tick={{ fontSize: 10 }}
              />
              <YAxis
                domain={[minW - margin, maxW + margin]}
                label={{ value: amplify ? "w ×10 (mm)" : "w (mm)", angle: -90, position: "insideLeft", offset: 5, fontSize: 11 }}
                tick={{ fontSize: 10 }}
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
                  name === "w" ? (amplify ? "Deflection ×10" : "Deflection") : "Settlement line"
                ]}
                labelFormatter={l => `x = ${l} m`}
              />

              <Line
                type="monotone"
                dataKey="wRef"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={1}
                strokeDasharray="6 4"
                dot={false}
                name="Settlement line"
              />

              <Line
                type="monotone"
                dataKey="w"
                stroke="hsl(34 100% 51%)"
                strokeWidth={2}
                dot={false}
                animationDuration={600}
                name="Deflection"
              />

              {/* Support markers: active = filled, inactive = hollow */}
              {supportStatus.map((sup, i) => {
                const wRefAtSup = L_m > 0 ? (sup.x / L_m) * lastW * factor : 0;
                return (
                  <ReferenceDot
                    key={`sup-${i}`}
                    x={Math.round(sup.x * 1000) / 1000}
                    y={wRefAtSup}
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
