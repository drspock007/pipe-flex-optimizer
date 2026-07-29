import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { initUsageMetrics } from "./lib/usageMetrics.ts";
import "./index.css";

initUsageMetrics();

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<App />);
} else {
  console.error("[bootstrap] Root element #root was not found");
}
