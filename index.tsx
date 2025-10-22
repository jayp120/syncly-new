// index.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./src/index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);



// Register service worker only in production & same-origin
try {
  const mode =
    (import.meta as any)?.env?.MODE || process.env.NODE_ENV || "development";

  if (
    mode === "production" &&
    "serviceWorker" in navigator &&
    window.location.origin === self.origin // ✅ ensures same origin
  ) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered with scope:", registration.scope);
        })
        .catch((err) => {
          console.error("Service Worker registration failed:", err);
        });
    });
  } else {
    console.log("Skipping Service Worker (not production or wrong origin).");
  }
} catch (e) {
  console.log("Skipping Service Worker (env not available).");
}

