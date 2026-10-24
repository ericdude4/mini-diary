import path from "node:path";

import { app, BrowserWindow, nativeTheme, powerMonitor, shell } from "electron";
import contextMenu from "electron-context-menu";
import electronDebug from "electron-debug";

import { initDevMode } from "./devMode";
import { initLogger } from "./logger";
import { initI18n } from "./i18n/i18n";
import initIpcListeners from "./ipcMain/listeners";
import { lock, sendThemeUpdated } from "./ipcMain/senders";
import { buildMenu } from "./menu/menu";
import { handlePhotoProtocol, registerPhotoProtocolScheme } from "./photos/photoProtocol";
import { stopPhotosHelper } from "./photos/photosHelper";
import { getWindow, setWindow } from "./window";

initDevMode();
initLogger();
electronDebug();
registerPhotoProtocolScheme();
contextMenu({
	showCopyImage: false,
	showSearchWithGoogle: false,
});

async function createWindow(): Promise<BrowserWindow> {
	const win = new BrowserWindow({
		width: 1100,
		minWidth: 500,
		height: 600,
		minHeight: 500,
		show: false,
		titleBarStyle: "hiddenInset",
		webPreferences: {
			preload: path.join(import.meta.dirname, "../preload/preload.cjs"),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true,
			spellcheck: true,
		},
	});
	win.on("ready-to-show", (): void => {
		win.show();
	});
	win.on("closed", (): void => {
		// Dereference the window
		setWindow(null);
	});

	// The app never needs to navigate away or open other windows. Open links in the browser instead
	win.webContents.setWindowOpenHandler(({ url }) => {
		if (url.startsWith("https://")) {
			shell.openExternal(url);
		}
		return { action: "deny" };
	});
	win.webContents.on("will-navigate", (e): void => {
		e.preventDefault();
	});

	// Load HTML file (or the dev server URL during development)
	if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
		await win.loadURL(process.env.ELECTRON_RENDERER_URL);
	} else {
		await win.loadFile(path.join(import.meta.dirname, "../renderer/index.html"));
	}

	return win;
}

app.on("will-quit", (): void => {
	stopPhotosHelper();
});

// Quit app when all of its windows have been closed
app.on("window-all-closed", (): void => {
	app.quit();
});

// On app activation (e.g. when clicking dock icon), re-create BrowserWindow if necessary
app.on("activate", async (): Promise<void> => {
	if (app.isReady() && !getWindow()) {
		setWindow(await createWindow());
	}
});

(async (): Promise<void> => {
	// Wait for Electron to be initialized
	await app.whenReady();

	// Set up translations, messaging between main and renderer processes, and application menu
	initI18n();
	buildMenu();
	initIpcListeners();
	handlePhotoProtocol();

	// Lock diary when screen is locked
	if (process.platform === "darwin" || process.platform === "win32") {
		powerMonitor.on("lock-screen", lock);
	}

	// Notify renderer process about system theme changes
	nativeTheme.on("updated", sendThemeUpdated);

	// Create and show BrowserWindow
	setWindow(await createWindow());
})();
