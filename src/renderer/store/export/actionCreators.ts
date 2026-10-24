import logger from "electron-log/renderer";

import { convertToMiniDiaryJson } from "../../files/export/json";
import { convertToMd } from "../../files/export/md";
import { convertToDayOneTxt } from "../../files/export/txt";
import { ExportFormat, Entries } from "../../types";
import { translations } from "../../utils/i18n";
import { ThunkActionT } from "../store";
import {
	EXPORT_ERROR,
	EXPORT_IN_PROGRESS,
	EXPORT_SUCCESS,
	SetExportErrorAction,
	SetExportInProgressAction,
	SetExportSuccessAction,
} from "./types";

const fileExtensions: Record<ExportFormat, string> = {
	jsonMiniDiary: "json",
	md: "md",
	pdf: "pdf",
	txtDayOne: "txt",
};

// Action creators

function setExportInProgress(): SetExportInProgressAction {
	return {
		type: EXPORT_IN_PROGRESS,
	};
}

function setExportError(exportErrorMsg: string): SetExportErrorAction {
	return {
		type: EXPORT_ERROR,
		payload: {
			exportErrorMsg,
		},
	};
}

function setExportSuccess(): SetExportSuccessAction {
	return {
		type: EXPORT_SUCCESS,
	};
}

/**
 * Convert entries to a PDF (rendered by the main process)
 */
async function convertToPdf(entries: Entries): Promise<Uint8Array> {
	return window.api.files.convertMdToPdf(await convertToMd(entries));
}

// Thunks

const exportToFile =
	(
		converterFunc: (entries: Entries) => Promise<string | Uint8Array>,
		exportFormat: ExportFormat,
	): ThunkActionT =>
	async (dispatch, getState): Promise<void> => {
		const fileExtension = fileExtensions[exportFormat];
		const filePath = await window.api.files.selectSavePath(
			`mini-diary-export.${fileExtension}`,
			translations.export,
		);
		if (filePath) {
			dispatch(setExportInProgress());
			// Sort and convert entries to the specified format, then write them to disk
			const { entries } = getState().file;
			try {
				await window.api.files.write(filePath, await converterFunc(entries));
				dispatch(setExportSuccess());
			} catch (err) {
				logger.error("Error exporting diary file: ", err);
				dispatch(setExportError(String(err)));
			}
		}
	};

export const exportToJsonMiniDiary =
	(): ThunkActionT =>
	(dispatch): void => {
		dispatch(exportToFile(convertToMiniDiaryJson, "jsonMiniDiary"));
	};

export const exportToMd =
	(): ThunkActionT =>
	(dispatch): void => {
		dispatch(exportToFile(convertToMd, "md"));
	};

export const exportToPdf =
	(): ThunkActionT =>
	(dispatch): void => {
		dispatch(exportToFile(convertToPdf, "pdf"));
	};

export const exportToTxtDayOne =
	(): ThunkActionT =>
	(dispatch): void => {
		dispatch(exportToFile(convertToDayOneTxt, "txtDayOne"));
	};
