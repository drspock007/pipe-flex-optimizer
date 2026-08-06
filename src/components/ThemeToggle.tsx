import { Sun, Moon, Monitor, Check } from "lucide-react";
import { useTheme, type Theme } from "./theme-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Light / dark / auto theme switcher shown at the end of the header nav. */
const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  const options: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "auto", label: "Auto", icon: Monitor },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
        aria-label="Toggle theme"
      >
        <Icon className="h-4 w-4" />
        <span className="capitalize hidden sm:inline">{theme}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {options.map((opt) => {
          const OptIcon = opt.icon;
          return (
            <DropdownMenuItem
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className="gap-2 text-xs"
            >
              <OptIcon className="h-4 w-4" />
              <span className="flex-1">{opt.label}</span>
              {theme === opt.value && <Check className="h-3.5 w-3.5 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ThemeToggle;
