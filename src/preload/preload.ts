// Allow the renderer process to log via `electron-log`
import "electron-log/preload";

import { contextBridge, FileFilter, ipcRenderer, MessageBoxOptions } from "electron";

import { DiaryReadResult, JsonValue, OverlayType, SyncResult, Translations } from "../shared/types";

/**
 * Call a synchronous IPC listener in the main process. Rethrow errors which occurred there
 */
function sendSync<T>(channel: string, ...args: unknown[]): T {
	const result: SyncResult<T> = ipcRenderer.sendSync(channel, ...args);
	if (result.error !== undefined) {
		throw Error(result.error);
	}
	return result.value as T;
}

// Messages which can be sent from the main to the renderer process
export interface MainToRendererEvents {
	exportJsonMiniDiary: [];
	exportMd: [];
	exportPdf: [];
	exportTxtDayOne: [];
	goToToday: [];
	importJsonDayOne: [];
	importJsonJrnl: [];
	importJsonMiniDiary: [];
	importTxtDayOne: [];
	lock: [];
	nextDay: [];
	nextMonth: [];
	openOverlay: [overlayType: OverlayType];
	previousDay: [];
	previousMonth: [];
	themeUpdated: [isDark: boolean];
}

const api = {
	platform: process.platform,

	/**
	 * Listen to messages from the main process. Returns a function for removing the listener
	 */
	on<E extends keyof MainToRendererEvents>(
		channel: E,
		listener: (...args: MainToRendererEvents[E]) => void,
	): () => void {
		const wrappedListener = (_: Electron.IpcRendererEvent, ...args: unknown[]): void =>
			listener(...(args as MainToRendererEvents[E]));
		ipcRenderer.on(channel, wrappedListener);
		return (): void => {
			ipcRenderer.removeListener(channel, wrappedListener);
		};
	},

	i18n: {
		getLang: (): string => sendSync("getLang"),
		getTranslation: (i18nKey: keyof Translations, substitutions: Record<string, string>): string =>
			sendSync("getTranslation", i18nKey, substitutions),
		getTranslations: (): Translations => sendSync("getTranslations"),
	},

	menu: {
		disableItems: (): void => ipcRenderer.send("disableMenuItems"),
		enableItems: (): void => ipcRenderer.send("enableMenuItems"),
	},

	prefs: {
		get: <T extends JsonValue>(prefName: string, defaultValue: T): T =>
			sendSync("getPref", prefName, defaultValue),
		set: (prefName: string, value: JsonValue): void => sendSync("setPref", prefName, value),
	},

	theme: {
		isDark: (): boolean => sendSync("isDarkTheme"),
	},

	diary: {
		getFilePath: (): string => sendSync("getDiaryFilePath"),
		fileExists: (): boolean => sendSync("diaryFileExists"),
		hashPassword: (password: string): Promise<string> =>
			ipcRenderer.invoke("hashPassword", password),
		read: (hashedPassword: string): Promise<DiaryReadResult> =>
			ipcRenderer.invoke("readDiary", hashedPassword),
		write: (hashedPassword: string, content: string): void =>
			sendSync("writeDiary", hashedPassword, content),
		createBackup: (): Promise<void> => ipcRenderer.invoke("createBackup"),
		delete: (): Promise<void> => ipcRenderer.invoke("deleteDiary"),
		selectDir: (): Promise<string | null> => ipcRenderer.invoke("selectDiaryDir"),
		moveToSelectedDir: (): Promise<string | null> => ipcRenderer.invoke("moveDiaryToSelectedDir"),
	},

	dialog: {
		showErrorBox: (title: string, content: string): Promise<void> =>
			ipcRenderer.invoke("showErrorBox", title, content),
		showMessageBox: (options: MessageBoxOptions): Promise<number> =>
			ipcRenderer.invoke("showMessageBox", options),
	},

	files: {
		openTextFile: (filters: FileFilter[]): Promise<string | null> =>
			ipcRenderer.invoke("openTextFile", filters),
		selectSavePath: (defaultPath: string, buttonLabel: string): Promise<string | null> =>
			ipcRenderer.invoke("selectSavePath", defaultPath, buttonLabel),
		write: (filePath: string, content: string | Uint8Array): Promise<void> =>
			ipcRenderer.invoke("writeFile", filePath, content),
		convertMdToPdf: (md: string): Promise<Uint8Array> => ipcRenderer.invoke("convertMdToPdf", md),
	},

	window: {
		toggleMaximize: (): Promise<void> => ipcRenderer.invoke("toggleMaximize"),
	},
};

export type Api = typeof api;

contextBridge.exposeInMainWorld("api", api);
