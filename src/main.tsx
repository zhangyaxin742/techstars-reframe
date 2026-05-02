import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Hero } from "../components/landing/hero";
import { App } from "./App";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root not found");
}

const routePath = window.location.pathname.replace(/\/+$/, "") || "/";
const route = routePath === "/app" ? <App /> : <Hero />;

createRoot(rootElement).render(
  <StrictMode>
    {route}
  </StrictMode>
);
