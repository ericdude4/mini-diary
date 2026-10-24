import { PHOTO_PROTOCOL } from "../../shared/types";

/**
 * URL for loading a photo or video from Apple Photos (served by the main process)
 */
export function getPhotoUrl(kind: "thumbnail" | "image" | "video", assetId: string): string {
	return `${PHOTO_PROTOCOL}://${kind}/${encodeURIComponent(assetId)}`;
}

/**
 * Format a video duration in seconds as "m:ss"
 */
export function formatDuration(seconds: number): string {
	const rounded = Math.round(seconds);
	return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}
