import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { migrateInstrumentData } from "./lib/instruments";
import { OptionalAccounts } from "./contexts/AccountContext";

migrateInstrumentData();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <OptionalAccounts>
      <App />
    </OptionalAccounts>
  </StrictMode>,
);
