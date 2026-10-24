import { Translations } from "../../../shared/types";

// Localization

export function getLang(): string {
	return window.api.i18n.getLang();
}

export function getTranslation(
	i18nKey: keyof Translations,
	substitutions: Record<string, string>,
): string {
	return window.api.i18n.getTranslation(i18nKey, substitutions);
}

export function getTranslations(): Translations {
	return window.api.i18n.getTranslations();
}

// Menu items

export function disableMenuItems(): void {
	window.api.menu.disableItems();
}

export function enableMenuItems(): void {
	window.api.menu.enableItems();
}

// Window

export function toggleWindowSize(): void {
	window.api.window.toggleMaximize();
}
