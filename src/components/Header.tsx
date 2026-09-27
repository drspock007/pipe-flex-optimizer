import { Link, useLocation } from "react-router-dom";
import { Home, HelpCircle, MoveUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo-gmc.png";
import ThemeToggle from "@/components/ThemeToggle";

/** Main application header with GMC logo, tagline and navigation.
 *  Mirrors the shared layout used across Giovanni Malagnino Consulting apps. */
const Header = () => {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/in-service", label: "In-service deflection", icon: MoveUpRight },
    { path: "/help", label: "Help", icon: HelpCircle },
  ];

  return (
    <header className="border-b border-border bg-card shadow-sm">
      <div className="container mx-auto px-4">
        {/* Top band: logo (left) + tagline (right) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center py-6">
          <div className="flex justify-center md:justify-start">
            <a
              href="https://giovannimalagninoconsulting.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block"
            >
              <img
                src={logo}
                alt="Giovanni Malagnino Consulting"
                width={500}
                height={500}
                // Lowercase DOM attribute passed via spread to avoid a React warning.
                {...{ fetchpriority: "high" }}
                decoding="async"
                className="h-24 w-auto hover:opacity-80 transition-opacity"
              />
            </a>
          </div>
          <div
            className="text-left text-foreground"
            style={{
              backgroundColor: 'transparent',
              display: 'block',
              fontFamily: '"Habibi", Georgia, "Times New Roman", serif',
              fontSize: '27px',
              fontWeight: 500,
              letterSpacing: '2px',
              lineHeight: '1.7em',
              margin: 0,
              padding: '0 0 1em 0',
              position: 'static',
              textAlign: 'left',
              textShadow: 'rgba(0, 0, 0, 0.4) 2.16px 2.16px 2.16px',
              textTransform: 'none',
            }}
          >
            <p>Engineering</p>
            <p>Consulting</p>
            <p>Projet management</p>
          </div>
        </div>

        {/* Navigation row */}
        <nav className="flex flex-wrap gap-1 justify-center md:justify-end pb-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary hover:text-secondary-foreground"
                )}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                <span className="sr-only">{item.label}</span>
                <span className="hidden sm:inline" aria-hidden="true">{item.label}</span>
              </Link>
            );
          })}
          <div className="ml-2">
            <ThemeToggle />
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
