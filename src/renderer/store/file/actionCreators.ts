import logger from "electron-log/renderer";

import { disableMenuItems, enableMenuItems } from "../../electron/ipcRenderer/senders";
import { getMetadata } from "../../files/diary/metadata";
import { performMigrations } from "../../files/diary/migrations";
import mergeEntries from "../../files/import/mergeEntries";
import { Entries, IndexDate, MiniDiaryJson } from "../../types";
import { createDate } from "../../utils/dateFormat";
import { translations } from "../../utils/i18n";
import { flushPendingSaves } from "../../utils/pendingSaves";
import { addIndexDoc, createIndex, removeIndexDoc, updateIndexDoc } from "../../utils/searchIndex";
import { AsyncThunkActionT, ThunkActionT } from "../store";
import {
	CLEAR_FILE_STATE,
	ClearFileStateAction,
	DECRYPT_ERROR,
	DECRYPT_IN_PROGRESS,
	DECRYPT_SUCCESS,
	ENCRYPT_ERROR,
	ENCRYPT_IN_PROGRESS,
	ENCRYPT_SUCCESS,
	SET_FILE_EXISTS,
	SET_HASHED_PASSWORD,
	SetDecryptErrorAction,
	SetDecryptInProgressAction,
	SetDecryptSuccessAction,
	SetEncryptErrorAction,
	SetEncryptInProgressAction,
	SetEncryptSuccessAction,
	SetFileExistsAction,
	SetHashedPasswordAction,
} from "./types";

// Action creators

function clearFileState(): ClearFileStateAction {
	return {
		type: CLEAR_FILE_STATE,
	};
}

function setDecryptInProgress(): SetDecryptInProgressAction {
	return {
		type: DECRYPT_IN_PROGRESS,
	};
}

function setDecryptError(decryptErrorMsg: string): SetDecryptErrorAction {
	return {
		type: DECRYPT_ERROR,
		payload: {
			decryptErrorMsg,
		},
	};
}

function setDecryptSuccess(entries: Entries): SetDecryptSuccessAction {
	return {
		type: DECRYPT_SUCCESS,
		payload: {
			entries,
		},
	};
}

function setEncryptInProgress(): SetEncryptInProgressAction {
	return {
		type: ENCRYPT_IN_PROGRESS,
	};
}

function setEncryptError(encryptErrorMsg: string): SetEncryptErrorAction {
	return {
		type: ENCRYPT_ERROR,
		payload: {
			encryptErrorMsg,
		},
	};
}

function setEncryptSuccess(entries: Entries): SetEncryptSuccessAction {
	return {
		type: ENCRYPT_SUCCESS,
		payload: {
			entries,
		},
	};
}

function setFileExists(exists: boolean): SetFileExistsAction {
	return {
		type: SET_FILE_EXISTS,
		payload: {
			fileExists: exists,
		},
	};
}

function setHashedPassword(hashedPassword: string): SetHashedPasswordAction {
	return {
		type: SET_HASHED_PASSWORD,
		payload: {
			hashedPassword,
		},
	};
}

// Thunks

/**
 * Test whether a diary file exists at the path specified in the preferences
 */
export const testFileExists =
	(): ThunkActionT =>
	(dispatch): void => {
		dispatch(setFileExists(window.api.diary.fileExists()));
	};

/**
 * Lock the diary: Remove password and diary entries from state
 */
export const lock =
	(): ThunkActionT =>
	(dispatch): void => {
		// Save unsaved changes before removing the password from the state
		flushPendingSaves();
		dispatch(clearFileState());
		disableMenuItems();
	};

/**
 * Read diary entries from disk
 */
export const decryptFile =
	(password: string): AsyncThunkActionT =>
	async (dispatch): Promise<void> => {
		dispatch(setDecryptInProgress());
		try {
			const hashedPassword = await window.api.diary.hashPassword(password);
			const result = await window.api.diary.read(hashedPassword);
			if (result.error !== undefined) {
				dispatch(
					setDecryptError(
						result.isWrongPassword
							? translations["wrong-password"]
							: `${translations["decryption-error"]}: ${result.error}`,
					),
				);
				return;
			}
			let data: MiniDiaryJson = JSON.parse(result.content);

			// On success: Save password
			dispatch(setHashedPassword(hashedPassword));

			// Perform data migrations between app updates if necessary
			data = performMigrations(data);

			// Load diary entries and save password
			const { entries } = data;
			dispatch(setDecryptSuccess(entries));
			createIndex(entries);
			enableMenuItems();
			await window.api.diary.createBackup();
		} catch (err) {
			// Error reading diary file
			logger.error("Error decrypting diary file: ", err);
			dispatch(setDecryptError(`${translations["decryption-error"]}: ${(err as Error).message}`));
		}
	};

/**
 * Create new encrypted diary file and index with the provided password
 */
export const createEncryptedFile =
	(password: string): AsyncThunkActionT =>
	async (dispatch): Promise<void> => {
		const entries = {};
		const content: MiniDiaryJson = {
			metadata: getMetadata(),
			entries,
		};
		dispatch(setEncryptInProgress());
		try {
			const hashedPassword = await window.api.diary.hashPassword(password);
			window.api.diary.write(hashedPassword, JSON.stringify(content));
			dispatch(setEncryptSuccess(entries));
			dispatch(setHashedPassword(hashedPassword));
			createIndex(entries);
			enableMenuItems();
		} catch (err) {
			logger.error("Error creating encrypted diary file: ", err);
			dispatch(setEncryptError((err as Error).message));
		}
	};

/**
 * Write diary entries to disk
 */
const writeEntriesEncrypted =
	(entries: Entries, hashedPassword: string): ThunkActionT =>
	(dispatch): void => {
		const fileContent: MiniDiaryJson = {
			metadata: getMetadata(),
			entries,
		};
		dispatch(setEncryptInProgress());
		try {
			window.api.diary.write(hashedPassword, JSON.stringify(fileContent));
			dispatch(setEncryptSuccess(entries));
		} catch (err) {
			logger.error("Error updating encrypted diary file: ", err);
			dispatch(setEncryptError((err as Error).message));
		}
	};

/**
 * Delete the diary file in the currently selected directory
 */
export const resetDiary =
	(): AsyncThunkActionT =>
	async (dispatch): Promise<void> => {
		await window.api.diary.delete();
		dispatch(lock());
	};

/**
 * Write diary entries to disk with a new password. Update the password in the store
 */
export const updatePassword =
	(newPassword: string): AsyncThunkActionT =>
	async (dispatch, getState): Promise<void> => {
		const hashedPassword = await window.api.diary.hashPassword(newPassword);
		// Read entries after hashing so changes made in the meantime are included
		const { entries } = getState().file;
		dispatch(writeEntriesEncrypted(entries, hashedPassword));
		dispatch(setHashedPassword(hashedPassword));
	};

/**
 * Update the diary entry in the state. Remove the entry if it is empty. Then write the diary to the
 * encrypted diary file and update the index
 */
export const updateEntry =
	(entryDate: IndexDate, title: string, text: string): ThunkActionT =>
	(dispatch, getState): void => {
		const { entries, hashedPassword } = getState().file;
		const entriesUpdated = { ...entries };

		// Abort if password has been deleted from state (e.g. when the diary has been locked)
		if (!hashedPassword) {
			return;
		}

		if (title === "" && text === "") {
			// Empty entry
			if (entryDate in entries) {
				// If existing entry: Delete entry from file and index
				delete entriesUpdated[entryDate];
				removeIndexDoc(entryDate);
			}
		} else if (!(entryDate in entries)) {
			// Entry doesn't exist yet
			const entryAdded = {
				dateUpdated: createDate().toString(),
				title,
				text,
			};
			entriesUpdated[entryDate] = entryAdded;
			addIndexDoc(entryDate, entryAdded);
		} else if (
			title !== entries[entryDate].title || // Title has changed
			text !== entries[entryDate].text // Text has changed
		) {
			// Entry has been updated
			const entryUpdated = {
				dateUpdated: createDate().toString(),
				title,
				text,
			};
			entriesUpdated[entryDate] = entryUpdated;
			updateIndexDoc(entryDate, entryUpdated);
		} else {
			return;
		}
		// Write entries to disk
		dispatch(writeEntriesEncrypted(entriesUpdated, hashedPassword));
	};

/**
 * Merge the provided diary JSON with the one in the Redux state. For each entry, use the new one if
 * none exists yet. Otherwise, append the new title and text to the existing ones
 */
export const mergeUpdateFile =
	(newEntries: Entries): ThunkActionT =>
	(dispatch, getState): void => {
		const { entries, hashedPassword } = getState().file;
		const entriesUpdated = { ...entries };

		Object.entries(newEntries).forEach(([indexDate, newEntry]): void => {
			if (indexDate in entriesUpdated) {
				// Entry exists -> merge
				const oldEntry = entriesUpdated[indexDate];
				entriesUpdated[indexDate] = mergeEntries(oldEntry, newEntry);
			} else {
				// Entry does not exist yet -> add
				entriesUpdated[indexDate] = newEntry;
			}
		});
		dispatch(writeEntriesEncrypted(entriesUpdated, hashedPassword));
		createIndex(entriesUpdated); // Recreate index
	};
