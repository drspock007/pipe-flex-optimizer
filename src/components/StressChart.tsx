import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalculationResults } from "@/lib/calculations";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, ReferenceArea,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { useUnits } from "@/contexts/UnitContext";
import { useMemo } from "react";

interface Props {
  results: CalculationResults;
}

const StressChart = ({ results }: Props) => {
  const { conv, label } = useUnits();
  const { stressData, allowableStress, supportPositions, supportStatus, maxStress } = results;

  const convAllowable = conv(allowableStress, "MPa");
  const convMax = conv(maxStress, "MPa");
  const maxY = Math.max(convMax, convAllowable) * 1.2;

  const chartData = useMemo(
    () => stressData.map(d => ({ x: conv(d.x, "m"), stress: conv(d.stress, "MPa") })),
    [stressData, conv]
  );

  const activePosSet = new Set(
    supportStatus.filter(s => s.active).map(s => Math.round(conv(s.x, "m") * 1000) / 1000)
  );

  const posLabel = label("m");
  const stressLabel = label("MPa");

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
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 90% / 0.5)" />
              <XAxis
                dataKey="x"
                label={{ value: `Position (${posLabel})`, position: "insideBottom", offset: -10, fontSize: 11 }}
                tick={{ fontSize: 10 }} allowDecimals={false}
                tickFormatter={(v: number) => Math.round(v).toString()}
              />
              <YAxis
                domain={[0, maxY]}
                label={{ value: `Stress (${stressLabel})`, angle: -90, position: "insideLeft", offset: 5, fontSize: 11 }}
                tick={{ fontSize: 10 }} allowDecimals={false}
                tickFormatter={(v: number) => Math.round(v).toString()}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px", fontSize: "12px",
                }}
                formatter={(value: number) => [`${value.toFixed(1)} ${stressLabel}`, "Stress"]}
                labelFormatter={l => `x = ${l} ${posLabel}`}
              />
              <ReferenceArea y1={0} y2={convAllowable} fill="hsl(142 71% 45% / 0.08)" fillOpacity={1} />
              <ReferenceLine
                y={convAllowable}
                stroke="hsl(0 72% 51%)" strokeDasharray="6 4" strokeWidth={1.5}
                label={{ value: `Allowable: ${convAllowable.toFixed(0)} ${stressLabel}`, position: "right", fontSize: 10, fill: "hsl(0 72% 51%)" }}
              />
              {supportPositions.map((pos, i) => {
                const cPos = Math.round(conv(pos, "m") * 1000) / 1000;
                const isActive = activePosSet.has(cPos);
                return (
                  <ReferenceLine
                    key={i} x={cPos}
                    stroke={isActive ? "hsl(34 100% 51%)" : "hsl(var(--muted-foreground))"}
                    strokeDasharray={isActive ? "none" : "2 4"}
                    strokeWidth={isActive ? 1.5 : 1}
                    strokeOpacity={isActive ? 0.8 : 0.4}
                  />
                );
              })}
              <Line type="monotone" dataKey="stress" stroke="hsl(34 100% 51%)" strokeWidth={2} dot={false} animationDuration={600} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default StressChart;
