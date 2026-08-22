import {
  StrictMode,
} from "react";

import {
  createRoot,
} from "react-dom/client";

import "./index.css";

import App from "./App.js";

import {
  ThemeProvider,
} from "./context/ThemeContext.js";

import {
  AuthProvider,
} from "./context/AuthContext.js";

const rootElement =
  document.getElementById("root");

if (!rootElement) {
  throw new Error(
    "Root element not found."
  );
}

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);
