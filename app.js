import { startApp } from "./src/controller.js";
import { installIconSupport } from "./src/icons.js";

installIconSupport();
startApp(document.querySelector("#app"));

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("Service worker registration failed:", error);
    });
  });
}
