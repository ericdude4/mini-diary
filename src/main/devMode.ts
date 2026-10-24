import path from "node:path";

import { app } from "electron";

// Running from source (`yarn start`) instead of the packaged app
const isDev = !app.isPackaged;

/**
 * During development, keep the preferences, backups and diary file inside the project directory, so
 * the development app never reads or modifies the real diary and its backups. Must be called before
 * any user data is accessed
 */
export function initDevMode(): void {
	if (isDev && !app.commandLine.hasSwitch("user-data-dir")) {
		app.setPath("userData", path.join(app.getAppPath(), ".dev-user-data"));
	}
}

/**
 * Directory in which the diary file is saved unless the user has selected another one
 */
export function getDefaultDiaryDir(): string {
	return isDev ? app.getAppPath() : app.getPath("userData");
}
