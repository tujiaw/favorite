import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";
import { installIconSupport } from "./icons.js";

installIconSupport();

createRoot(document.querySelector("#app") as HTMLElement).render(<App />);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("Service worker registration failed:", error);
    });
  });
}
