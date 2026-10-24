import fs from "node:fs";
import path from "node:path";

import { app } from "electron";

import { getDiaryFilePath } from "./diaryFile";

const FILES_TO_KEEP = 50;

function getBackupDir(): string {
	return path.join(app.getPath("userData"), "backups");
}

/**
 * Format the current date and time for inclusion in the file name (e.g. "2019-01-01-12h30")
 */
function toFileNameDate(date: Date): string {
	const pad = (n: number): string => String(n).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(
		date.getHours(),
	)}h${pad(date.getMinutes())}`;
}

/**
 * Create backup directory at specified path if it doesn't exist yet
 */
function createBackupDir(dir: string): void {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir);
	}
}

/**
 * Create a backup of the diary by copying the diary file to the backup directory
 */
function createBackupFile(dir: string): void {
	const dateTime = toFileNameDate(new Date());
	const diaryFilePath = getDiaryFilePath();
	const backupPath = path.join(dir, `backup-${dateTime}.txt`);
	fs.copyFileSync(diaryFilePath, backupPath);
}

/**
 * Delete old backup files until the requested number of files remain
 */
function deleteOldBackupFiles(dir: string, filesToKeep: number): void {
	const files = fs.readdirSync(dir).sort();
	const txtFiles = files.filter((fileName: string) => fileName.endsWith(".txt"));
	if (txtFiles.length > filesToKeep) {
		for (let fileIndex = 0; fileIndex < txtFiles.length - filesToKeep; fileIndex += 1) {
			const fileToDelete = path.join(dir, txtFiles[fileIndex]);
			fs.unlinkSync(fileToDelete);
		}
	}
}

/**
 * Create a copy of the encrypted diary file and delete old backup files if necessary
 */
export default function createBackup(): void {
	const backupDir = getBackupDir();
	createBackupDir(backupDir);
	deleteOldBackupFiles(backupDir, FILES_TO_KEEP);
	createBackupFile(backupDir);
}
