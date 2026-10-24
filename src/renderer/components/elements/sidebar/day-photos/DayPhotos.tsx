import PlayIcon from "feather-icons/dist/icons/play.svg?react";
import logger from "electron-log/renderer";
import { Moment } from "moment-timezone";
import React, { ReactElement, useCallback, useEffect, useState } from "react";

import { PhotoAsset, PhotosStatus } from "../../../../../shared/types";
import { toIndexDate } from "../../../../utils/dateFormat";
import { productName as appName } from "../../../../../../package.json";
import { translate, translations } from "../../../../utils/i18n";
import { formatDuration, getPhotoUrl } from "../../../../utils/photos";
import PhotoViewer from "./PhotoViewer";

export interface StateProps {
	dateSelected: Moment;
	showPhotos: boolean;
}

type Props = StateProps;

interface DayAssets {
	indexDate: string;
	assets: PhotoAsset[];
}

/**
 * Hook which returns the access status for the photo library. It's checked again when the window
 * regains focus (e.g. after granting access in System Settings)
 */
function usePhotosStatus(enabled: boolean): PhotosStatus | null {
	const [status, setStatus] = useState<PhotosStatus | null>(null);

	useEffect(() => {
		if (!enabled) {
			return undefined;
		}
		let isCancelled = false;
		const updateStatus = async (): Promise<void> => {
			let newStatus = await window.api.photos.getStatus();
			if (newStatus === "notDetermined") {
				newStatus = await window.api.photos.authorize();
			}
			if (!isCancelled) {
				setStatus(newStatus);
			}
		};
		updateStatus().catch(err => logger.error("Error checking photo library access: ", err));
		window.addEventListener("focus", updateStatus);
		return (): void => {
			isCancelled = true;
			window.removeEventListener("focus", updateStatus);
		};
	}, [enabled]);

	return status;
}

/**
 * Photos and videos from Apple Photos which were taken on the selected day
 */
export default function DayPhotos(props: Props): ReactElement | null {
	const { dateSelected, showPhotos } = props;

	const status = usePhotosStatus(showPhotos);
	const hasAccess = status === "authorized" || status === "limited";
	const indexDate = toIndexDate(dateSelected);

	const [dayAssets, setDayAssets] = useState<DayAssets | null>(null);
	const [viewerIndex, setViewerIndex] = useState<number | null>(null);

	useEffect(() => {
		if (!showPhotos || !hasAccess) {
			return undefined;
		}
		let isCancelled = false;
		const start = dateSelected.clone().startOf("day");
		const end = start.clone().add(1, "day");
		window.api.photos
			.list(start.valueOf(), end.valueOf())
			.then(assets => {
				if (!isCancelled) {
					setDayAssets({ indexDate, assets });
				}
			})
			.catch(err => logger.error("Error loading photos: ", err));
		return (): void => {
			isCancelled = true;
		};
	}, [dateSelected, hasAccess, indexDate, showPhotos]);

	const closeViewer = useCallback((): void => setViewerIndex(null), []);

	if (!showPhotos || status === null || status === "unavailable") {
		return null;
	}

	if (!hasAccess) {
		return (
			<div className="day-photos day-photos-message">
				<p className="text-faded">{translate("photos-access-denied", { appName })}</p>
				<button
					type="button"
					className="button button-main"
					onClick={(): Promise<void> => window.api.photos.openPrivacySettings()}
				>
					{translations["open-system-settings"]}
				</button>
			</div>
		);
	}

	// Don't show the previous day's photos while the selected day's photos are loading
	const assets = dayAssets?.indexDate === indexDate ? dayAssets.assets : [];
	if (assets.length === 0) {
		return null;
	}

	return (
		<div className="day-photos">
			<div className="day-photos-grid">
				{assets.map((asset, index) => (
					<button
						key={asset.id}
						type="button"
						className="day-photo"
						onClick={(): void => setViewerIndex(index)}
					>
						<img src={getPhotoUrl("thumbnail", asset.id)} alt="" loading="lazy" />
						{asset.type === "video" && (
							<span className="day-photo-video">
								<PlayIcon height={10} width={10} />
								{formatDuration(asset.duration)}
							</span>
						)}
					</button>
				))}
			</div>
			{viewerIndex !== null && viewerIndex < assets.length && (
				<PhotoViewer
					assets={assets}
					index={viewerIndex}
					onClose={closeViewer}
					onIndexChange={setViewerIndex}
				/>
			)}
		</div>
	);
}
