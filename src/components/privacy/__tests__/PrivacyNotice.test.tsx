import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import PrivacyNotice from "../PrivacyNotice";

describe("PrivacyNotice", () => {
  beforeEach(() => window.localStorage.clear());

  it("uses English regardless of the browser language", async () => {
    render(<PrivacyNotice />);

    expect(await screen.findByRole("heading", { name: "We value your privacy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accept all" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject all" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Customize" })).toBeInTheDocument();
    expect(screen.queryByText("Votre vie privée compte")).not.toBeInTheDocument();
  });
});
