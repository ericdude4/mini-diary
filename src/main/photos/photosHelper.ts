import { ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

import { app } from "electron";
import logger from "electron-log/main";

import { PhotoAsset, PhotosStatus } from "../../shared/types";

interface PendingRequest {
	resolve: (result: unknown) => void;
	reject: (err: Error) => void;
}

let helper: ChildProcessWithoutNullStreams | null = null;
let nextRequestId = 1;
const pendingRequests = new Map<number, PendingRequest>();

/**
 * Path of the Swift helper binary which reads photos from Apple Photos (see `native/photos-helper`)
 */
function getHelperPath(): string {
	if (app.isPackaged) {
		return path.join(process.resourcesPath, "photos-helper");
	}
	// Allow replacing the helper during development (e.g. with a fake one for testing)
	return (
		process.env.MINI_DIARY_PHOTOS_HELPER ??
		path.join(app.getAppPath(), "native", "photos-helper", "bin", "photos-helper")
	);
}

/**
 * Whether photos can be shown on this system
 */
export function isPhotosAvailable(): boolean {
	return process.platform === "darwin" && fs.existsSync(getHelperPath());
}

function rejectAll(err: Error): void {
	pendingRequests.forEach(({ reject }) => reject(err));
	pendingRequests.clear();
}

/**
 * Start the helper process (if it isn't running yet)
 */
function getHelper(): ChildProcessWithoutNullStreams {
	if (helper) {
		return helper;
	}
	const child = spawn(getHelperPath(), [], { stdio: "pipe" });
	readline.createInterface({ input: child.stdout }).on("line", (line: string): void => {
		let response: { id: number; result?: unknown; error?: string };
		try {
			response = JSON.parse(line);
		} catch {
			logger.error(`Invalid response from photos helper: ${line}`);
			return;
		}
		const pending = pendingRequests.get(response.id);
		if (pending) {
			pendingRequests.delete(response.id);
			if (response.error !== undefined) {
				pending.reject(Error(response.error));
			} else {
				pending.resolve(response.result);
			}
		}
	});
	child.stderr.on("data", (data: Buffer): void => {
		logger.warn(`Photos helper: ${data.toString()}`);
	});
	child.on("error", (err: Error): void => {
		logger.error("Photos helper error: ", err);
		helper = null;
		rejectAll(err);
	});
	child.on("exit", (code: number | null): void => {
		helper = null;
		rejectAll(Error(`Photos helper exited with code ${code}`));
	});
	helper = child;
	return child;
}

function request<T>(cmd: string, params: Record<string, unknown> = {}): Promise<T> {
	return new Promise((resolve, reject) => {
		const id = nextRequestId;
		nextRequestId += 1;
		pendingRequests.set(id, { resolve: resolve as (result: unknown) => void, reject });
		getHelper().stdin.write(`${JSON.stringify({ id, cmd, ...params })}\n`);
	});
}

/**
 * Return whether the app may access the photo library (without asking the user)
 */
export async function getPhotosStatus(): Promise<PhotosStatus> {
	if (!isPhotosAvailable()) {
		return "unavailable";
	}
	return request<PhotosStatus>("status");
}

/**
 * Ask the user for access to the photo library (if they haven't been asked yet)
 */
export async function authorizePhotos(): Promise<PhotosStatus> {
	if (!isPhotosAvailable()) {
		return "unavailable";
	}
	return request<PhotosStatus>("authorize");
}

/**
 * Return the photos and videos taken between the provided timestamps (in ms)
 */
export function listPhotos(start: number, end: number): Promise<PhotoAsset[]> {
	return request<PhotoAsset[]>("list", { start, end });
}

/**
 * Return the photo as JPEG which fits into a square of the provided size (in px)
 */
export async function getPhotoImage(assetId: string, size: number): Promise<Buffer> {
	const base64 = await request<string>("image", { asset: assetId, size });
	return Buffer.from(base64, "base64");
}

let videoExportDir: string | null = null;

/**
 * Return the path of the video file (edited videos are exported to a temporary file first)
 */
export function getVideoPath(assetId: string): Promise<string> {
	videoExportDir ??= fs.mkdtempSync(path.join(app.getPath("temp"), "mini-diary-videos-"));
	return request<string>("video", { asset: assetId, exportDir: videoExportDir });
}

/**
 * Stop the helper and delete exported videos
 */
export function stopPhotosHelper(): void {
	helper?.stdin.end();
	helper = null;
	if (videoExportDir) {
		fs.rmSync(videoExportDir, { recursive: true, force: true });
		videoExportDir = null;
	}
}
