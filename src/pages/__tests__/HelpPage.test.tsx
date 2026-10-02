import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ThemeProvider } from "@/components/theme-provider";
import HelpPage from "../HelpPage";
import { HELP_TOC } from "../help/help-toc";

const renderPage = () => render(<ThemeProvider><MemoryRouter initialEntries={["/help"]}><HelpPage /></MemoryRouter></ThemeProvider>);

describe("HelpPage", () => {
  it("renders both independent model guides and grouped navigation", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Help & Technical Documentation" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Pipe Lowering" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "In-service Deflection" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Getting started" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Recommended browsers" })).toBeInTheDocument();
    expect(screen.getByText("iOS/iPadOS 16.4")).toBeInTheDocument();
  });

  it("maps every table-of-contents link to exactly one stable target", () => {
    const { container } = renderPage();
    const nav = screen.getByRole("navigation", { name: "Help table of contents" });
    const expected = HELP_TOC.reduce<Array<readonly [string, string]>>((all, group) => [...all, ...group.items], []);
    expect(within(nav).getAllByRole("link")).toHaveLength(expected.length);
    for (const [id] of expected) {
      expect(nav.querySelector(`a[href="#${id}"]`)).not.toBeNull();
      expect(container.querySelectorAll(`#${id}`)).toHaveLength(1);
    }
  });

  it("states the critical model and evidence distinctions", () => {
    const { container } = renderPage();
    const text = container.textContent ?? "";
    expect(text).toContain("Free sliding");
    expect(text).toContain("Restrained");
    expect(text).toContain("Wall force and effective tension must remain separate");
    expect(text).toContain("custom threshold");
    expect(text).toContain("not normative");
    expect(text).toContain("exploratory");
    expect(text).toContain("not a certified minimum");
  });

  it("keeps obsolete claims out and exposes keyboard-native advanced details", () => {
    const { container } = renderPage();
    const text = container.textContent ?? "";
    expect(text).not.toContain("+0.5 MPa");
    expect(text).not.toContain("axial restraint is not implemented");
    expect(text).not.toContain("8, 16, and 20 elements/span");
    expect(container.querySelectorAll("details").length).toBeGreaterThan(5);
    container.querySelectorAll("details").forEach(details => expect(details.querySelector(":scope > summary")).not.toBeNull());
  });
});
