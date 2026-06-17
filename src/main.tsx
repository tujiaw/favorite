import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ThemeProvider } from "@/components/theme-provider";
import "./styles.css";
import { installIconSupport } from "./icons.js";

installIconSupport();

createRoot(document.querySelector("#app") as HTMLElement).render(
  <ThemeProvider defaultTheme="system">
    <App />
  </ThemeProvider>
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("Service worker registration failed:", error);
    });
  });
}
