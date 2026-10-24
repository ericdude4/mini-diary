import path from "node:path";

import { app } from "electron";

// Running from source (`yarn start`) instead of the packaged app
const isDev = !app.isPackaged;

// Directory name of the user data (preferences, backups and the default diary location). The app was
// called "Mini Diary" before it was renamed to "Journal", so the existing directory is still used
const USER_DATA_DIR_NAME = "Mini Diary";

/**
 * Set the directory for the user data. Must be called before any user data is accessed.
 *
 * During development, the preferences, backups and diary file are kept inside the project
 * directory, so the development app never reads or modifies the real diary and its backups
 */
export function initUserDataPath(): void {
	if (app.commandLine.hasSwitch("user-data-dir")) {
		return;
	}
	app.setPath(
		"userData",
		isDev
			? path.join(app.getAppPath(), ".dev-user-data")
			: path.join(app.getPath("appData"), USER_DATA_DIR_NAME),
	);
}

/**
 * Directory in which the diary file is saved unless the user has selected another one
 */
export function getDefaultDiaryDir(): string {
	return isDev ? app.getAppPath() : app.getPath("userData");
}
