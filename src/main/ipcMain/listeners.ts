import path from "node:path";

import {
	BrowserWindow,
	dialog,
	FileFilter,
	ipcMain,
	IpcMainEvent,
	IpcMainInvokeEvent,
	MessageBoxOptions,
	nativeTheme,
} from "electron";
import logger from "electron-log/main";

import { DiaryReadResult, JsonValue, SyncResult, Translations } from "../../shared/types";
import createBackup from "../files/backupFile";
import { FILE_NAME, getDiaryFilePath } from "../files/diaryFile";
import {
	deleteFile,
	fileExists,
	FileExistsError,
	isWrongPasswordError,
	moveFile,
	readEncryptedFile,
	readFile,
	writeEncryptedFile,
	writeFileAtomic,
} from "../files/fileAccess";
import { hashPassword } from "../files/hashPassword";
import { convertMdToPdf } from "../files/pdf";
import { getPref, saveDirPref, setPref } from "../files/preferences";
import { getTranslations, getUsedLang, translate } from "../i18n/i18n";
import { disableMenuItems, enableMenuItems } from "../menu/menu";

// Paths the user has selected in a save dialog. The renderer process may only write to these
const allowedWritePaths = new Set<string>();

function getSenderWindow(e: IpcMainEvent | IpcMainInvokeEvent): BrowserWindow | undefined {
	return BrowserWindow.fromWebContents(e.sender) ?? undefined;
}

/**
 * Register a synchronous IPC listener. Errors are passed back to the renderer process instead of
 * leaving it without a return value
 */
function onSync<A extends unknown[], R>(
	channel: string,
	listener: (e: IpcMainEvent, ...args: A) => R,
): void {
	ipcMain.on(channel, (e: IpcMainEvent, ...args: unknown[]): void => {
		try {
			e.returnValue = { value: listener(e, ...(args as A)) } satisfies SyncResult<R>;
		} catch (err) {
			logger.error(`Error in IPC listener "${channel}": `, err);
			e.returnValue = { error: (err as Error).message ?? String(err) } satisfies SyncResult<R>;
		}
	});
}

/**
 * Show a directory selection dialog and return the selected directory (or `null` if canceled)
 */
async function selectDir(
	e: IpcMainInvokeEvent,
	buttonLabel: keyof Translations,
): Promise<string | null> {
	const options: Electron.OpenDialogOptions = {
		buttonLabel: translate(buttonLabel),
		properties: ["openDirectory", "createDirectory"],
	};
	const win = getSenderWindow(e);
	const { canceled, filePaths } = win
		? await dialog.showOpenDialog(win, options)
		: await dialog.showOpenDialog(options);
	return !canceled && filePaths.length === 1 ? filePaths[0] : null;
}

export default function initIpcListeners(): void {
	// Localization

	onSync("getLang", () => getUsedLang());

	onSync(
		"getTranslation",
		(_, i18nKey: keyof Translations, substitutions: Record<string, string>) =>
			translate(i18nKey, substitutions),
	);

	onSync("getTranslations", () => getTranslations());

	// Menu items

	ipcMain.on("disableMenuItems", (): void => {
		disableMenuItems();
	});

	ipcMain.on("enableMenuItems", (): void => {
		enableMenuItems();
	});

	// Preferences

	onSync("getPref", (_, prefName: string, defaultValue: JsonValue) =>
		getPref(prefName, defaultValue),
	);

	onSync("setPref", (_, prefName: string, value: JsonValue) => setPref(prefName, value));

	// Theme

	onSync("isDarkTheme", () => nativeTheme.shouldUseDarkColors);

	// Diary file

	onSync("getDiaryFilePath", () => getDiaryFilePath());

	onSync("diaryFileExists", () => fileExists(getDiaryFilePath()));

	ipcMain.handle("hashPassword", (_, password: string) => hashPassword(password));

	ipcMain.handle("readDiary", (_, hashedPassword: string): DiaryReadResult => {
		try {
			return { content: readEncryptedFile(getDiaryFilePath(), hashedPassword) };
		} catch (err) {
			const isWrongPassword = isWrongPasswordError(err);
			if (!isWrongPassword) {
				logger.error("Error decrypting diary file: ", err);
			}
			return {
				error: (err as Error).message ?? String(err),
				isWrongPassword,
			};
		}
	});

	// Synchronous so writes happen in order and complete before the window is closed
	onSync("writeDiary", (_, hashedPassword: string, content: string) =>
		writeEncryptedFile(getDiaryFilePath(), hashedPassword, content),
	);

	ipcMain.handle("createBackup", (): void => createBackup());

	ipcMain.handle("deleteDiary", (): void => deleteFile(getDiaryFilePath()));

	/**
	 * Let the user select a directory and use the diary file in it (when locked)
	 */
	ipcMain.handle("selectDiaryDir", async (e): Promise<string | null> => {
		const newDir = await selectDir(e, "select-directory");
		if (!newDir) {
			return null;
		}
		saveDirPref(newDir);
		return getDiaryFilePath();
	});

	/**
	 * Let the user select a directory and move the diary file into it (when unlocked)
	 */
	ipcMain.handle("moveDiaryToSelectedDir", async (e): Promise<string | null> => {
		const newDir = await selectDir(e, "move-file");
		if (!newDir) {
			return null;
		}
		try {
			moveFile(getDiaryFilePath(), path.join(newDir, FILE_NAME));
		} catch (err) {
			logger.error("Error moving diary file: ", err);
			const errMsg = err instanceof FileExistsError ? translate("file-exists") : String(err);
			dialog.showErrorBox(
				translate("move-error-title"),
				`${translate("move-error-msg")}: ${errMsg}`,
			);
			return null;
		}
		saveDirPref(newDir);
		return getDiaryFilePath();
	});

	// Dialogs

	ipcMain.handle("showErrorBox", (_, title: string, content: string): void => {
		dialog.showErrorBox(title, content);
	});

	ipcMain.handle("showMessageBox", async (e, options: MessageBoxOptions): Promise<number> => {
		const win = getSenderWindow(e);
		const { response } = win
			? await dialog.showMessageBox(win, options)
			: await dialog.showMessageBox(options);
		return response;
	});

	// Import and export

	/**
	 * Let the user select a text file and return its contents (or `null` if canceled)
	 */
	ipcMain.handle("openTextFile", async (e, filters: FileFilter[]): Promise<string | null> => {
		const options: Electron.OpenDialogOptions = { properties: ["openFile"], filters };
		const win = getSenderWindow(e);
		const { canceled, filePaths } = win
			? await dialog.showOpenDialog(win, options)
			: await dialog.showOpenDialog(options);
		return !canceled && filePaths.length === 1 ? readFile(filePaths[0]) : null;
	});

	/**
	 * Let the user select a path to save a file to (or `null` if canceled)
	 */
	ipcMain.handle(
		"selectSavePath",
		async (e, defaultPath: string, buttonLabel: string): Promise<string | null> => {
			const options: Electron.SaveDialogOptions = { defaultPath, buttonLabel };
			const win = getSenderWindow(e);
			const { canceled, filePath } = win
				? await dialog.showSaveDialog(win, options)
				: await dialog.showSaveDialog(options);
			if (canceled || !filePath) {
				return null;
			}
			allowedWritePaths.add(filePath);
			return filePath;
		},
	);

	ipcMain.handle("writeFile", (_, filePath: string, content: string | Uint8Array): void => {
		if (!allowedWritePaths.has(filePath)) {
			throw Error(`Writing to "${filePath}" is not allowed`);
		}
		allowedWritePaths.delete(filePath);
		writeFileAtomic(filePath, content);
	});

	ipcMain.handle("convertMdToPdf", (_, md: string): Promise<Buffer> => convertMdToPdf(md));

	// Window

	ipcMain.handle("toggleMaximize", (e): void => {
		const win = getSenderWindow(e);
		if (win?.isMaximized()) {
			win.unmaximize();
		} else {
			win?.maximize();
		}
	});
}
