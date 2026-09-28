import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Disclaimer from "@/components/Disclaimer";
import HelpOverview from "./help/HelpOverview";
import HelpPipeLowering from "./help/HelpPipeLowering";
import HelpInService from "./help/HelpInService";
import { HELP_TOC } from "./help/help-toc";

const HelpPage = () => {
  return <div className="min-h-screen grid-background flex flex-col">
    <Header />
    <main className="container mx-auto max-w-5xl flex-1 space-y-10 px-4 py-8">
      <header className="space-y-3">
        <p className="text-sm font-medium text-primary">Engineering model guide</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Help &amp; Technical Documentation</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">Use this guide to choose the correct calculation model, prepare inputs and interpret what a result does—and does not—demonstrate.</p>
      </header>

      <nav aria-label="Help table of contents" className="rounded-xl border bg-card p-5">
        <h2 className="text-base font-semibold">On this page</h2>
        <div className="mt-4 grid gap-5 md:grid-cols-3">
          {HELP_TOC.map(group => <div key={group.label}>
            <h3 className="text-sm font-semibold text-foreground">{group.label}</h3>
            <ul className="mt-2 space-y-1.5">{group.items.map(([id, label]) => <li key={id}><a className="text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline" href={`#${id}`}>{label}</a></li>)}</ul>
          </div>)}
        </div>
      </nav>

      <HelpOverview />
      <HelpPipeLowering />
      <HelpInService />
    </main>
    <div className="container mx-auto max-w-5xl px-4 pb-6"><Disclaimer /></div>
    <Footer />
  </div>;
};

export default HelpPage;
