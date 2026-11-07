import "@fontsource-variable/manrope";
import "@fontsource-variable/playfair-display";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./index.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Router from "./delivery/Router";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Router />
  </StrictMode>,
);
