// Style reset
import "minireset.css/minireset.min.css";
import "./assets/styles/styles.scss";

import logger from "electron-log/renderer";
import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";

import AppContainer from "./components/AppContainer";
import initIpcListeners from "./electron/ipcRenderer/listeners";
import store from "./store/store";
import { initI18n } from "./utils/i18n";

// Log unhandled errors and promise rejections
logger.errorHandler.startCatching({ showDialog: false });
initIpcListeners();
initI18n();

// Create 'root' div
const root = document.createElement("div");
root.id = "root";
document.body.appendChild(root);

// Render React app inside root
createRoot(root).render(
	<Provider store={store}>
		<AppContainer />
	</Provider>,
);
