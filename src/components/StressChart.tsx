import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalculationResults } from "@/lib/calculations";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, ReferenceArea,
} from "recharts";
import { TrendingUp } from "lucide-react";

interface Props {
  results: CalculationResults;
}

const StressChart = ({ results }: Props) => {
  const { stressData, allowableStress, supportPositions, supportStatus, maxStress, isSafe } = results;
  const maxY = Math.max(maxStress, allowableStress) * 1.2;

  // Build a set of active support positions for quick lookup
  const activePosSet = new Set(
    supportStatus.filter(s => s.active).map(s => Math.round(s.x * 1000) / 1000)
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <TrendingUp className="h-4 w-4 text-primary" /> Stress Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stressData} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 90% / 0.5)" />
              <XAxis
                dataKey="x"
                label={{ value: "Position (m)", position: "insideBottom", offset: -10, fontSize: 11 }}
                tick={{ fontSize: 10 }}
                allowDecimals={false}
                tickFormatter={(v: number) => Math.round(v).toString()}
              />
              <YAxis
                domain={[0, maxY]}
                label={{ value: "Stress (MPa)", angle: -90, position: "insideLeft", offset: 5, fontSize: 11 }}
                tick={{ fontSize: 10 }}
                allowDecimals={false}
                tickFormatter={(v: number) => Math.round(v).toString()}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [`${value.toFixed(1)} MPa`, "Stress"]}
                labelFormatter={l => `x = ${l} m`}
              />

              {/* Safe region shading */}
              <ReferenceArea
                y1={0} y2={allowableStress}
                fill="hsl(142 71% 45% / 0.08)"
                fillOpacity={1}
              />

              {/* Allowable line */}
              <ReferenceLine
                y={allowableStress}
                stroke="hsl(0 72% 51%)"
                strokeDasharray="6 4"
                strokeWidth={1.5}
                label={{ value: `Allowable: ${allowableStress.toFixed(0)} MPa`, position: "right", fontSize: 10, fill: "hsl(0 72% 51%)" }}
              />

              {/* Support markers: active = solid, inactive = lighter dotted */}
              {supportPositions.map((pos, i) => {
                const roundedPos = Math.round(pos * 1000) / 1000;
                const isActive = activePosSet.has(roundedPos);
                return (
                  <ReferenceLine
                    key={i}
                    x={roundedPos}
                    stroke={isActive ? "hsl(34 100% 51%)" : "hsl(var(--muted-foreground))"}
                    strokeDasharray={isActive ? "none" : "2 4"}
                    strokeWidth={isActive ? 1.5 : 1}
                    strokeOpacity={isActive ? 0.8 : 0.4}
                  />
                );
              })}

              {/* Stress curve */}
              <Line
                type="monotone"
                dataKey="stress"
                stroke="hsl(34 100% 51%)"
                strokeWidth={2}
                dot={false}
                animationDuration={600}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default StressChart;
