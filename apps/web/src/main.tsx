import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { bootstrapLocalStore } from "./lib/bootstrap";
import "./design/tokens.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);

// Seed Dexie on first run so app works fully offline with real-feeling data
void bootstrapLocalStore().catch(() => undefined);
