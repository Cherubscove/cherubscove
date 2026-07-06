import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { initializeConsoleLoggingPreference } from "./lib/console";
import "./index.css";

void initializeConsoleLoggingPreference();

createRoot(document.getElementById("root")!).render(<App />);
