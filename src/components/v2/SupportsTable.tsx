// créé par Giovanni Malagnino, 2026-09-25 01:21 CEST (Europe/Rome, UTC+2)
import { SupportResult } from "@/lib/mechanics-v2";
import { useUnits } from "@/contexts/UnitContext";

const SupportsTable = ({ supports }: { supports: SupportResult[] }) => {
  const { conv, label } = useUnits();
  if (!supports.length) return <p className="text-xs text-muted-foreground">No intermediate support installed.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono">
        <thead className="text-muted-foreground">
          <tr className="border-b">
            <th className="text-left py-1 pr-2">#</th>
            <th className="text-right pr-2">x ({label("m")})</th>
            <th className="text-right pr-2">Reaction ({label("N")})</th>
            <th className="text-right pr-2">Gap ({label("mm")})</th>
            <th className="text-right">Contact</th>
          </tr>
        </thead>
        <tbody>
          {supports.map((s) => (
            <tr key={s.index} className="border-b border-border/50">
              <td className="py-1 pr-2">{s.index}</td>
              <td className="text-right pr-2">{conv(s.x / 1000, "m").toFixed(3)}</td>
              <td className="text-right pr-2">{conv(s.reaction, "N").toFixed(1)}</td>
              <td className="text-right pr-2">{conv(s.gap, "mm").toFixed(2)}</td>
              <td className={`text-right ${s.active ? "text-primary font-semibold" : "text-muted-foreground"}`}>{s.active ? "active" : "open"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SupportsTable;
