import path from "node:path";

import { loadDirPref } from "./preferences";

export const FILE_NAME = "mini-diary.txt";

/**
 * Return path to diary file (set in preferences)
 */
export function getDiaryFilePath(): string {
	// Concatenate and return directory preference with file name
	const fileDir = loadDirPref();
	return path.resolve(fileDir, FILE_NAME);
}
