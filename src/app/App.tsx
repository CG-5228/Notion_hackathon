import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { AppRoutes } from "./routes";

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter><AppRoutes /></BrowserRouter>
    </AuthProvider>
  );
}
