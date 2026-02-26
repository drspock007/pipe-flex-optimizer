import { HelpCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { useUnits } from "@/contexts/UnitContext";
import logo from "@/assets/logo.png";

const Header = () => {
  const { system, toggle } = useUnits();

  return (
    <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Pipe Settlement logo" className="h-9 rounded-lg" />
          <div>
            <h1 className="text-sm font-bold tracking-tight leading-none">Pipe Settlement</h1>
            <p className="text-[10px] text-muted-foreground font-medium tracking-widest uppercase">Flexibility Optimizer</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-medium ${system === "SI" ? "text-foreground" : "text-muted-foreground"}`}>SI</span>
            <Switch checked={system === "Imperial"} onCheckedChange={toggle} className="h-5 w-9" />
            <span className={`text-[10px] font-medium ${system === "Imperial" ? "text-foreground" : "text-muted-foreground"}`}>IMP</span>
          </div>
          <Link to="/help" className="text-muted-foreground hover:text-foreground transition-colors" title="Help">
            <HelpCircle className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
