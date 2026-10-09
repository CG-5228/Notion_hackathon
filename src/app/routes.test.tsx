import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { AppRoutes } from "./routes";
import { COPY } from "@/types";

function at(path: string) {
  return render(<AuthProvider><MemoryRouter initialEntries={[path]}><AppRoutes /></MemoryRouter></AuthProvider>);
}

describe("app shell routing", () => {
  it("landing shows the mandatory pair warning and group notice verbatim", () => {
    at("/");
    expect(screen.getByRole("heading", { level: 1, name: /Good plans/ })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(COPY.pairWarning.slice(0, 40)))).toBeInTheDocument();
    expect(screen.getByText(COPY.groupNotice)).toBeInTheDocument();
  });
  it("protected routes never render feature screens without a backend/session", () => {
    at("/buddy/abc");
    expect(screen.queryByText(/Pseudonymous chat/)).not.toBeInTheDocument();
  });
  it("unknown routes 404", () => {
    at("/nope");
    expect(screen.getByText("404")).toBeInTheDocument();
  });
  it("filters clearly labelled inspiration without pretending it is a live events feed", () => {
    at("/");
    const ideas = within(screen.getByRole("region", { name: "Activity inspiration" }));
    expect(ideas.getByText(/not live events/)).toBeInTheDocument();
    expect(ideas.getAllByText("Activity idea")).toHaveLength(4);
    fireEvent.click(ideas.getByRole("button", { name: "Outdoors" }));
    expect(ideas.getByRole("button", { name: "Outdoors" })).toHaveAttribute("aria-pressed", "true");
    expect(ideas.getAllByText("Activity idea")).toHaveLength(1);
    expect(ideas.getByRole("link", { name: /Take the scenic route/ })).toHaveAttribute("href", "/auth?mode=signup");
    expect(ideas.queryByText("Coffee & a catch-up")).not.toBeInTheDocument();
    fireEvent.click(ideas.getByRole("button", { name: "A bit of everything" }));
    expect(ideas.getAllByText("Activity idea")).toHaveLength(4);
  });
  it("keeps both navigation layouts connected to the shared routes", () => {
    at("/");
    for (const name of ["Main", "Mobile"]) {
      const navigation = within(screen.getByRole("navigation", { name }));
      expect(navigation.getByRole("link", { name: "Discover" })).toHaveAttribute("href", "/");
      expect(navigation.getByRole("link", { name: /Create/ })).toHaveAttribute("href", "/activities/new");
      expect(navigation.getByRole("link", { name: "My plans" })).toHaveAttribute("href", "/my-activities");
    }
  });
  it("opens account creation from an idea without leaving the form under mobile navigation", async () => {
    at("/");
    fireEvent.click(screen.getByRole("link", { name: /Make it a movie night/ }));
    expect(await screen.findByRole("textbox", { name: "University email" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create account with university email" })).toBeDisabled();
    expect(screen.queryByRole("navigation", { name: "Mobile" })).not.toBeInTheDocument();
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, left: 0, behavior: "instant" });
  });
});
