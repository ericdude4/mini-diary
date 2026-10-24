import path from "node:path";

import { app } from "electron";
import logger from "electron-log/main";

import { JsonObject, JsonValue } from "../../shared/types";
import { getDefaultDiaryDir } from "../devMode";
import { fileExists, readFile, writeFileAtomic } from "./fileAccess";

/**
 * Return the path of the preferences file. It's the same file that was used by `electron-settings`
 * in previous versions of Mini Diary, so existing preferences (e.g. the diary directory) are kept
 */
function getPrefFilePath(): string {
	return path.join(app.getPath("userData"), "Settings");
}

let prefs: JsonObject | undefined;

function loadPrefs(): JsonObject {
	if (!prefs) {
		prefs = {};
		if (fileExists(getPrefFilePath())) {
			try {
				prefs = JSON.parse(readFile(getPrefFilePath())) as JsonObject;
			} catch (err) {
				logger.error("Error reading preferences file: ", err);
			}
		}
	}
	return prefs;
}

/**
 * Return value for specified preference. If not set, save and return the provided default value
 */
export function getPref<T extends JsonValue>(prefName: string, defaultValue: T): T {
	const allPrefs = loadPrefs();
	if (prefName in allPrefs) {
		return allPrefs[prefName] as T;
	}
	setPref(prefName, defaultValue);
	return defaultValue;
}

/**
 * Update the specified preference's value
 */
export function setPref(prefName: string, value: JsonValue): void {
	const allPrefs = loadPrefs();
	allPrefs[prefName] = value;
	writeFileAtomic(getPrefFilePath(), JSON.stringify(allPrefs));
}

/**
 * Return the preference for the directory in which the diary file is saved
 */
export function loadDirPref(): string {
	return getPref("filePath", getDefaultDiaryDir());
}

/**
 * Update the diary directory preference
 */
export function saveDirPref(dir: string): void {
	setPref("filePath", dir);
}
