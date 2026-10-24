import React, { ReactElement, useState } from "react";

import { translations } from "../../../../utils/i18n";
import DiaryResetButtonContainer from "./diary-reset-button/DiaryResetButtonContainer";

export interface StateProps {
	hashedPassword: string;
}

export interface DispatchProps {
	testFileExists: () => void;
}

type Props = StateProps & DispatchProps;

/**
 * Preference fieldset for updating the diary file's directory (when locked) or moving it to another
 * directory (when unlocked)
 */
export default function FileDirPref(props: Props): ReactElement {
	const { hashedPassword, testFileExists } = props;

	const isLocked = hashedPassword === "";

	const [filePath, setFilePath] = useState(() => window.api.diary.getFilePath());

	const selectMoveDir = async (): Promise<void> => {
		// Show dialog for selecting directory, then move mini-diary.txt file to selected directory
		const newFilePath = await window.api.diary.moveToSelectedDir();
		if (newFilePath) {
			setFilePath(newFilePath);
		}
	};

	const selectDir = async (): Promise<void> => {
		// Show dialog for selecting directory, then use mini-diary.txt file from selected directory
		const newFilePath = await window.api.diary.selectDir();
		if (newFilePath) {
			setFilePath(newFilePath);
			testFileExists();
		}
	};

	/*
		File directory
		- When locked: Change directory
		- When unlocked: Move diary file and change directory
	*/
	return (
		<fieldset className="fieldset-file-dir">
			<legend>{translations["diary-file"]}</legend>
			<div className="fieldset-content">
				<div className="form-group">
					<p className="file-dir">{filePath}</p>
					<button
						type="button"
						className="button button-main"
						onClick={isLocked ? selectDir : selectMoveDir}
					>
						{isLocked ? translations["change-directory"] : translations["move-file"]}
					</button>
					<DiaryResetButtonContainer />
				</div>
			</div>
		</fieldset>
	);
}
