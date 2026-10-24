import { BrowserWindow } from "electron";

let window: BrowserWindow | null = null; // Prevent window from being garbage collected

export function getWindow(): BrowserWindow | null {
	return window;
}

export function setWindow(w: BrowserWindow | null): void {
	window = w;
}
