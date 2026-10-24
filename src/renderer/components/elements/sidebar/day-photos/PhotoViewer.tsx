import PrevIcon from "feather-icons/dist/icons/chevron-left.svg?react";
import NextIcon from "feather-icons/dist/icons/chevron-right.svg?react";
import CloseIcon from "feather-icons/dist/icons/x.svg?react";
import React, { MouseEvent, ReactElement, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { PhotoAsset } from "../../../../../shared/types";
import { translations } from "../../../../utils/i18n";
import { getPhotoUrl } from "../../../../utils/photos";

const ICON_PROPS = { height: 28, width: 28 };

interface Props {
	assets: PhotoAsset[];
	index: number;
	onClose: () => void;
	onIndexChange: (index: number) => void;
}

/**
 * Full-window viewer for a photo or video
 */
function Media({ asset }: { asset: PhotoAsset }): ReactElement {
	const [isLoaded, setIsLoaded] = useState(false);
	const [hasError, setHasError] = useState(false);

	if (hasError) {
		return <p className="photo-viewer-error">{translations["photo-load-error"]}</p>;
	}
	if (asset.type === "video") {
		return (
			<video
				className="photo-viewer-media"
				src={getPhotoUrl("video", asset.id)}
				poster={getPhotoUrl("thumbnail", asset.id)}
				controls
				autoPlay
				onError={(): void => setHasError(true)}
			/>
		);
	}
	return (
		<>
			{/* Show the thumbnail until the full-size image has loaded (e.g. from iCloud) */}
			{!isLoaded && (
				<img className="photo-viewer-media" src={getPhotoUrl("thumbnail", asset.id)} alt="" />
			)}
			<img
				className={`photo-viewer-media ${isLoaded ? "" : "photo-viewer-media-loading"}`}
				src={getPhotoUrl("image", asset.id)}
				alt=""
				onLoad={(): void => setIsLoaded(true)}
				onError={(): void => setHasError(true)}
			/>
		</>
	);
}

export default function PhotoViewer(props: Props): ReactElement {
	const { assets, index, onClose, onIndexChange } = props;

	const hasPrev = index > 0;
	const hasNext = index < assets.length - 1;

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent): void => {
			let handled = true;
			if (e.key === "Escape") {
				onClose();
			} else if (e.key === "ArrowLeft" && hasPrev) {
				onIndexChange(index - 1);
			} else if (e.key === "ArrowRight" && hasNext) {
				onIndexChange(index + 1);
			} else {
				handled = e.key === "ArrowLeft" || e.key === "ArrowRight";
			}
			if (handled) {
				// Prevent the arrow keys from also switching to the previous/next day (menu shortcuts)
				e.preventDefault();
				e.stopPropagation();
			}
		};
		window.addEventListener("keydown", onKeyDown, true);
		return (): void => window.removeEventListener("keydown", onKeyDown, true);
	}, [hasNext, hasPrev, index, onClose, onIndexChange]);

	const onBackdropClick = (e: MouseEvent): void => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	return createPortal(
		<div className="photo-viewer" onClick={onBackdropClick} role="presentation">
			<button type="button" className="photo-viewer-button photo-viewer-close" onClick={onClose}>
				<CloseIcon {...ICON_PROPS} title={translations.close} />
			</button>
			{hasPrev && (
				<button
					type="button"
					className="photo-viewer-button photo-viewer-prev"
					onClick={(): void => onIndexChange(index - 1)}
				>
					<PrevIcon {...ICON_PROPS} title={translations["previous-photo"]} />
				</button>
			)}
			<div className="photo-viewer-content" onClick={onBackdropClick} role="presentation">
				<Media key={assets[index].id} asset={assets[index]} />
			</div>
			{hasNext && (
				<button
					type="button"
					className="photo-viewer-button photo-viewer-next"
					onClick={(): void => onIndexChange(index + 1)}
				>
					<NextIcon {...ICON_PROPS} title={translations["next-photo"]} />
				</button>
			)}
			<p className="photo-viewer-counter">{`${index + 1} / ${assets.length}`}</p>
		</div>,
		document.body,
	);
}
