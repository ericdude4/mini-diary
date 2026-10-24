import { ThemePref, Theme } from "../types";

/**
 * Determines whether the host OS has a native theme option which may be read by Electron
 */
export function supportsNativeTheme(): boolean {
	return window.api.platform === "darwin" || window.api.platform === "win32";
}

/**
 * Determines the theme to use according to the user's theme preference. If the preference is set to
 * "auto", use the system preference
 */
export function getThemeFromPref(themePref: ThemePref): Theme {
	if (themePref === "auto") {
		// Return native theme
		return window.api.theme.isDark() ? "dark" : "light";
	}
	return themePref;
}
