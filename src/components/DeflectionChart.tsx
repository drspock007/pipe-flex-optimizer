import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalculationResults } from "@/lib/calculations";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
} from "recharts";
import { ArrowDown } from "lucide-react";

interface Props {
  results: CalculationResults;
}

const DeflectionChart = ({ results }: Props) => {
  const { deflectionData, supportPositions } = results;

  if (!deflectionData || deflectionData.length === 0) return null;

  // Settlement reference line data
  const L_m = deflectionData[deflectionData.length - 1]?.x ?? 0;
  const h_mm = results.debug.L_mm > 0
    ? (deflectionData[deflectionData.length - 1]?.w ?? 0)
    : 0;

  const refLineData = deflectionData.map(d => ({
    x: d.x,
    w: d.w,
    ref: L_m > 0 ? (d.x / L_m) * (results.computedH ?? results.debug.L_mm > 0 ? deflectionData[deflectionData.length - 1]?.w : 0) : 0,
  }));

  // Compute settlement reference: w_ref(x) = (h_total/L_total) * x
  // We know h from the last deflection point or from inputs
  const totalH = results.computedH ?? (deflectionData.length > 0 ? 0 : 0);
  const dataWithRef = deflectionData.map(d => ({
    ...d,
    wRef: L_m > 0 ? (d.x / L_m) * (deflectionData[deflectionData.length - 1]?.w ?? 0) : 0,
  }));

  const allW = deflectionData.map(d => d.w);
  const minW = Math.min(...allW);
  const maxW = Math.max(...allW);
  const margin = Math.max(Math.abs(maxW - minW) * 0.2, 1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ArrowDown className="h-4 w-4 text-primary" /> Deflection
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
                label={{ value: "w (mm)", angle: -90, position: "insideLeft", offset: 5, fontSize: 11 }}
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
                  name === "w" ? "Deflection" : "Settlement line"
                ]}
                labelFormatter={l => `x = ${l} m`}
              />

              {/* Support markers */}
              {supportPositions.map((pos, i) => (
                <ReferenceLine
                  key={i}
                  x={Math.round(pos * 1000) / 1000}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                />
              ))}

              {/* Settlement reference line */}
              <Line
                type="monotone"
                dataKey="wRef"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={1}
                strokeDasharray="6 4"
                dot={false}
                name="Settlement line"
              />

              {/* Deflection curve */}
              <Line
                type="monotone"
                dataKey="w"
                stroke="hsl(34 100% 51%)"
                strokeWidth={2}
                dot={false}
                animationDuration={600}
                name="Deflection"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default DeflectionChart;
