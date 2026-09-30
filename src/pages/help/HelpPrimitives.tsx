import type { ReactNode } from "react";

export const HelpSection = ({ id, title, eyebrow, children }: { id: string; title: string; eyebrow: string; children: ReactNode }) => (
  <section id={id} className="scroll-mt-6 space-y-4 rounded-xl border bg-card p-5 sm:p-6">
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
      <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
    </div>
    {children}
  </section>
);

export const Subsection = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="space-y-2"><h3 className="text-base font-semibold">{title}</h3>{children}</div>
);

export const P = ({ children }: { children: ReactNode }) => <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>;

export const Bullets = ({ children }: { children: ReactNode }) => (
  <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">{children}</ul>
);

export const Advanced = ({ title, children }: { title: string; children: ReactNode }) => (
  <details className="group rounded-lg border border-border/70 bg-muted/20 p-4">
    <summary className="cursor-pointer select-none text-sm font-semibold marker:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">{title}</summary>
    <div className="mt-4 space-y-3 border-t border-border/60 pt-4">{children}</div>
  </details>
);

export const Note = ({ title, tone = "info", children }: { title: string; tone?: "info" | "warning"; children: ReactNode }) => (
  <aside className={`rounded-lg border p-4 ${tone === "warning" ? "border-amber-500/40 bg-amber-500/5" : "border-primary/30 bg-primary/5"}`}>
    <p className="text-sm font-semibold text-foreground">{title}</p>
    <div className="mt-1 text-sm leading-relaxed text-muted-foreground">{children}</div>
  </aside>
);

export const ScrollTable = ({ children }: { children: ReactNode }) => (
  <div className="overflow-x-auto rounded-lg border"><table className="min-w-[680px] w-full border-collapse text-left text-sm">{children}</table></div>
);
export const Th = ({ children }: { children: ReactNode }) => <th className="bg-muted/60 px-3 py-2 font-semibold">{children}</th>;
export const Td = ({ children }: { children: ReactNode }) => <td className="border-t px-3 py-2 align-top text-muted-foreground">{children}</td>;
