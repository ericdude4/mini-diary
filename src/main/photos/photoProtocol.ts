import fs from "node:fs";
import { Readable } from "node:stream";

import { protocol } from "electron";
import logger from "electron-log/main";

import { PHOTO_PROTOCOL } from "../../shared/types";
import { getPhotoImage, getVideoPath } from "./photosHelper";

const THUMBNAIL_SIZE = 320;
const FULL_SIZE = 2560;
const MAX_CACHED_THUMBNAILS = 500;

// Recently loaded thumbnails (`Map` keeps the insertion order, so the oldest entry comes first)
const thumbnailCache = new Map<string, Buffer>();

/**
 * Must be called before the app is ready
 */
export function registerPhotoProtocolScheme(): void {
	protocol.registerSchemesAsPrivileged([
		{
			scheme: PHOTO_PROTOCOL,
			privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
		},
	]);
}

async function getThumbnail(assetId: string): Promise<Buffer> {
	let thumbnail = thumbnailCache.get(assetId);
	if (!thumbnail) {
		thumbnail = await getPhotoImage(assetId, THUMBNAIL_SIZE);
		thumbnailCache.set(assetId, thumbnail);
		if (thumbnailCache.size > MAX_CACHED_THUMBNAILS) {
			thumbnailCache.delete(thumbnailCache.keys().next().value as string);
		}
	}
	return thumbnail;
}

function jpegResponse(data: Buffer): Response {
	return new Response(new Uint8Array(data), { headers: { "Content-Type": "image/jpeg" } });
}

/**
 * Serve a video file. Supports range requests, which the video player needs for seeking
 */
async function videoResponse(filePath: string, rangeHeader: string | null): Promise<Response> {
	const { size } = await fs.promises.stat(filePath);
	// QuickTime files from the Photos library are MP4-compatible
	const headers: Record<string, string> = { "Content-Type": "video/mp4", "Accept-Ranges": "bytes" };

	const range = rangeHeader ? /^bytes=(\d*)-(\d*)$/.exec(rangeHeader) : null;
	if (!range || (range[1] === "" && range[2] === "")) {
		const stream = Readable.toWeb(fs.createReadStream(filePath)) as ReadableStream;
		return new Response(stream, { headers: { ...headers, "Content-Length": String(size) } });
	}

	let start: number;
	let end: number;
	if (range[1] === "") {
		// Last n bytes
		start = Math.max(size - Number(range[2]), 0);
		end = size - 1;
	} else {
		start = Number(range[1]);
		end = range[2] === "" ? size - 1 : Math.min(Number(range[2]), size - 1);
	}
	if (start >= size || start > end) {
		return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
	}
	const stream = Readable.toWeb(fs.createReadStream(filePath, { start, end })) as ReadableStream;
	return new Response(stream, {
		status: 206,
		headers: {
			...headers,
			"Content-Length": String(end - start + 1),
			"Content-Range": `bytes ${start}-${end}/${size}`,
		},
	});
}

/**
 * Serve photos and videos from Apple Photos to the renderer process. URLs have the form
 * `diary-photo://<thumbnail|image|video>/<asset ID>`
 */
export function handlePhotoProtocol(): void {
	protocol.handle(PHOTO_PROTOCOL, async (req: Request): Promise<Response> => {
		const url = new URL(req.url);
		const assetId = decodeURIComponent(url.pathname.slice(1));
		try {
			switch (url.hostname) {
				case "thumbnail":
					return jpegResponse(await getThumbnail(assetId));
				case "image":
					return jpegResponse(await getPhotoImage(assetId, FULL_SIZE));
				case "video":
					return await videoResponse(await getVideoPath(assetId), req.headers.get("range"));
				default:
					return new Response(null, { status: 404 });
			}
		} catch (err) {
			logger.error(`Error loading ${req.url}: `, err);
			return new Response(null, { status: 500 });
		}
	});
}
