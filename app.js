import { startApp } from "./src/controller.js";
import { installIconSupport } from "./src/icons.js";

installIconSupport();
startApp(document.querySelector("#app"));
