import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GRADES } from "@/lib/calculations";
import { useUnits } from "@/contexts/UnitContext";

export default function SteelGradeSelect({grade,onChange}:{grade:string;onChange:(grade:string)=>void}) {
  const {conv,label}=useUnits();
  return (          <Select value={grade} onValueChange={onChange}>
            <SelectTrigger aria-label="Steel Grade" className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {GRADES.map(g => (
                <SelectItem key={g.key} value={g.key}>
                  {g.label} — {conv(g.smys, "MPa").toFixed(0)} {label("MPa")}
                </SelectItem>
              ))}
              <SelectItem value="CUSTOM">Custom</SelectItem>
            </SelectContent>
          </Select>);
}
