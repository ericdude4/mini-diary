import { OverlayType } from "../../../shared/types";
import { openOverlay, setTheme } from "../../store/app/actionCreators";
import {
	setDaySelectedPrevious,
	setDaySelectedNext,
	setDaySelectedToday,
	setMonthSelectedNext,
	setMonthSelectedPrevious,
} from "../../store/diary/actionCreators";
import {
	exportToJsonMiniDiary,
	exportToMd,
	exportToPdf,
	exportToTxtDayOne,
} from "../../store/export/actionCreators";
import { lock } from "../../store/file/actionCreators";
import { setImportFormat } from "../../store/import/actionCreators";
import store, { ThunkDispatchT } from "../../store/store";

const dispatchThunk = store.dispatch as ThunkDispatchT;

export default function initIpcListeners(): void {
	// Date

	window.api.on("nextDay", (): void => {
		dispatchThunk(setDaySelectedNext());
	});

	window.api.on("previousDay", (): void => {
		dispatchThunk(setDaySelectedPrevious());
	});

	window.api.on("goToToday", (): void => {
		dispatchThunk(setDaySelectedToday());
	});

	window.api.on("nextMonth", (): void => {
		dispatchThunk(setMonthSelectedNext());
	});

	window.api.on("previousMonth", (): void => {
		dispatchThunk(setMonthSelectedPrevious());
	});

	// Export

	window.api.on("exportJsonMiniDiary", (): void => {
		dispatchThunk(exportToJsonMiniDiary());
	});

	window.api.on("exportMd", (): void => {
		dispatchThunk(exportToMd());
	});

	window.api.on("exportPdf", (): void => {
		dispatchThunk(exportToPdf());
	});

	window.api.on("exportTxtDayOne", (): void => {
		dispatchThunk(exportToTxtDayOne());
	});

	// Import

	window.api.on("importJsonDayOne", (): void => {
		dispatchThunk(setImportFormat("jsonDayOne"));
		dispatchThunk(openOverlay("import"));
	});

	window.api.on("importJsonJrnl", (): void => {
		dispatchThunk(setImportFormat("jsonJrnl"));
		dispatchThunk(openOverlay("import"));
	});

	window.api.on("importJsonMiniDiary", (): void => {
		dispatchThunk(setImportFormat("jsonMiniDiary"));
		dispatchThunk(openOverlay("import"));
	});

	window.api.on("importTxtDayOne", (): void => {
		dispatchThunk(setImportFormat("txtDayOne"));
		dispatchThunk(openOverlay("import"));
	});

	// Lock (e.g. from the menu or when the screen is locked)

	window.api.on("lock", (): void => {
		dispatchThunk(lock());
	});

	// Overlays

	window.api.on("openOverlay", (overlayType: OverlayType): void => {
		dispatchThunk(openOverlay(overlayType));
	});

	// Theme
	// Listen to system theme changes and update the app theme accordingly (if the theme preference is
	// set to "auto")

	window.api.on("themeUpdated", (isDark: boolean): void => {
		if (store.getState().app.themePref === "auto") {
			dispatchThunk(setTheme(isDark ? "dark" : "light"));
		}
	});
}
