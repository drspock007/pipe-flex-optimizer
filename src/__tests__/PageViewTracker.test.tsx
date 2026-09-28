import { fireEvent, render, screen } from "@testing-library/react";
import { Link, MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { PageViewTracker } from "@/App";
import { recordView } from "@/lib/usageMetrics";

vi.mock("@/lib/usageMetrics", () => ({
  recordView: vi.fn(),
}));

describe("PageViewTracker", () => {
  it("leaves the initial GA4 view to gtag config and tracks later SPA navigation once", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <PageViewTracker />
        <Link to="/help">Help</Link>
      </MemoryRouter>,
    );
    expect(recordView).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("link", { name: "Help" }));
    expect(recordView).toHaveBeenCalledTimes(1);
    expect(recordView).toHaveBeenCalledWith("/help");
  });
});
