import React, { ReactElement } from "react";

import { translations } from "../../../../../utils/i18n";

export interface StateProps {
	showPhotos: boolean;
}

export interface DispatchProps {
	updateShowPhotosPref: (showPhotos: boolean) => void;
}

type Props = StateProps & DispatchProps;

/**
 * Preference for showing photos and videos from Apple Photos for the selected day
 */
export default function ShowPhotosPref(props: Props): ReactElement {
	const { showPhotos, updateShowPhotosPref } = props;

	const toggleShowPhotos = (): void => {
		updateShowPhotosPref(!showPhotos);
		if (!showPhotos) {
			// Ask for access to the photo library right away (macOS only asks once)
			window.api.photos.authorize();
		}
	};

	return (
		<label htmlFor="checkbox-show-photos">
			<input
				type="checkbox"
				name="checkbox-show-photos"
				id="checkbox-show-photos"
				checked={showPhotos}
				onChange={toggleShowPhotos}
			/>
			{translations["show-photos"]}
		</label>
	);
}
