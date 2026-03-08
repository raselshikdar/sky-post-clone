import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Restore dark theme variant on load
const savedDarkTheme = localStorage.getItem("awaj-dark-theme") || "dim";
document.documentElement.setAttribute("data-dark-theme", savedDarkTheme);

const root = createRoot(document.getElementById("root")!);
root.render(<App />);

// Remove splash screen after app mounts
const splash = document.getElementById("splash-screen");
if (splash) {
  setTimeout(() => {
    splash.classList.add("fade-out");
    setTimeout(() => splash.remove(), 400);
  }, 800);
}

// Register service worker for PWA installability
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
