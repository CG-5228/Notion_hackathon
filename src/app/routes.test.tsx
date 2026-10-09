import { render, screen } from "@testing-library/react";
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
    expect(screen.getByText(/Find your buddy\./)).toBeInTheDocument();
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
});
