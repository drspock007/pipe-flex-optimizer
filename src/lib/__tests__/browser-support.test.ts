import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const script = readFileSync(resolve(process.cwd(), "public/browser-support.js"), "utf8");

function warningFor(userAgent: string, platform = "", maxTouchPoints = 0): string | null {
  const page = document.implementation.createHTMLDocument();
  const root = page.createElement("div");
  root.id = "root";
  page.body.appendChild(root);
  Object.defineProperty(page, "readyState", { value: "complete" });
  runInNewContext(script, { document: page, navigator: { userAgent, platform, maxTouchPoints }, Number });
  return page.querySelector('[role="alert"]')?.textContent ?? null;
}

describe("browser compatibility warning", () => {
  it("uses the recommended Chrome and Firefox thresholds", () => {
    expect(warningFor("Mozilla/5.0 Chrome/119.0.0.0 Safari/537.36")).toContain("Chrome 119.0");
    expect(warningFor("Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36")).toBeNull();
    expect(warningFor("Mozilla/5.0 Firefox/121.0")).toContain("Firefox 122+");
    expect(warningFor("Mozilla/5.0 Firefox/122.0")).toBeNull();
  });

  it("detects Edge before Chrome and applies iOS WebKit limits to Chrome on iOS", () => {
    expect(warningFor("Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36 Edg/119.0.0.0")).toContain("Edge 119.0");
    const chromeIos = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1";
    expect(warningFor(chromeIos)).toContain("iOS/iPadOS Safari 16.4+");
    expect(warningFor(chromeIos.replace("OS 16_3", "OS 16_4"))).toBeNull();
  });

  it("recognizes Safari minor versions without claiming support for unknown agents", () => {
    expect(warningFor("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/16.3 Safari/605.1.15")).toContain("Safari 16.3");
    expect(warningFor("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/16.4 Safari/605.1.15")).toBeNull();
    expect(warningFor("Unknown browser")).toBeNull();
  });
});
