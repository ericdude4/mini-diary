// Helper process which gives Mini Diary read-only access to the Apple Photos library.
//
// Protocol: One JSON request per line on stdin, one JSON response per line on stdout.
//   {"id": 1, "cmd": "status"}                          -> {"id": 1, "result": "authorized"}
//   {"id": 2, "cmd": "authorize"}                       -> {"id": 2, "result": "authorized"}
//   {"id": 3, "cmd": "list", "start": ms, "end": ms}    -> {"id": 3, "result": [asset, ...]}
//   {"id": 4, "cmd": "image", "asset": id, "size": px}  -> {"id": 4, "result": "<base64 JPEG>"}
//   {"id": 5, "cmd": "video", "asset": id, "exportDir": path} -> {"id": 5, "result": "<file path>"}
// Errors are returned as {"id": ..., "error": "message"}. The helper exits when stdin is closed.

import AppKit
import AVFoundation
import Foundation
import Photos

let outputQueue = DispatchQueue(label: "output")

func send(_ message: [String: Any]) {
	outputQueue.async {
		guard var data = try? JSONSerialization.data(withJSONObject: message) else { return }
		data.append(0x0A) // Newline
		FileHandle.standardOutput.write(data)
	}
}

func reply(_ id: Any, _ result: Any) {
	send(["id": id, "result": result])
}

func fail(_ id: Any, _ message: String) {
	send(["id": id, "error": message])
}

func statusName(_ status: PHAuthorizationStatus) -> String {
	switch status {
	case .authorized: return "authorized"
	case .limited: return "limited"
	case .denied: return "denied"
	case .restricted: return "restricted"
	case .notDetermined: return "notDetermined"
	@unknown default: return "denied"
	}
}

func findAsset(_ localIdentifier: String) -> PHAsset? {
	return PHAsset.fetchAssets(withLocalIdentifiers: [localIdentifier], options: nil).firstObject
}

func jpegData(_ image: NSImage) -> Data? {
	guard let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else { return nil }
	return NSBitmapImageRep(cgImage: cgImage)
		.representation(using: .jpeg, properties: [.compressionFactor: 0.85])
}

func listAssets(id: Any, start: Double, end: Double) {
	let options = PHFetchOptions()
	options.predicate = NSPredicate(
		format: "creationDate >= %@ AND creationDate < %@",
		Date(timeIntervalSince1970: start / 1000) as NSDate,
		Date(timeIntervalSince1970: end / 1000) as NSDate
	)
	options.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: true)]
	var assets: [[String: Any]] = []
	PHAsset.fetchAssets(with: options).enumerateObjects { asset, _, _ in
		guard asset.mediaType == .image || asset.mediaType == .video else { return }
		assets.append([
			"id": asset.localIdentifier,
			"type": asset.mediaType == .video ? "video" : "image",
			"date": (asset.creationDate?.timeIntervalSince1970 ?? 0) * 1000,
			"duration": asset.duration,
			"width": asset.pixelWidth,
			"height": asset.pixelHeight,
		])
	}
	reply(id, assets)
}

func requestImage(id: Any, asset: PHAsset, size: Double) {
	let options = PHImageRequestOptions()
	options.deliveryMode = .highQualityFormat // Only call the handler once
	options.resizeMode = .fast
	options.isNetworkAccessAllowed = true // Download from iCloud if necessary
	PHImageManager.default().requestImage(
		for: asset,
		targetSize: CGSize(width: size, height: size),
		contentMode: .aspectFit,
		options: options
	) { image, info in
		if let image = image, let data = jpegData(image) {
			reply(id, data.base64EncodedString())
		} else {
			let error = info?[PHImageErrorKey] as? Error
			fail(id, error?.localizedDescription ?? "Could not load image")
		}
	}
}

func requestVideo(id: Any, asset: PHAsset, exportDir: String) {
	let options = PHVideoRequestOptions()
	options.deliveryMode = .highQualityFormat
	options.isNetworkAccessAllowed = true // Download from iCloud if necessary
	options.version = .current
	PHImageManager.default().requestAVAsset(forVideo: asset, options: options) { avAsset, _, info in
		if let urlAsset = avAsset as? AVURLAsset {
			reply(id, urlAsset.url.path)
			return
		}
		// Edited videos (e.g. slow motion) are compositions which need to be exported to a file
		guard let avAsset = avAsset,
		      let session = AVAssetExportSession(asset: avAsset, presetName: AVAssetExportPresetHighestQuality)
		else {
			let error = info?[PHImageErrorKey] as? Error
			fail(id, error?.localizedDescription ?? "Could not load video")
			return
		}
		let outputURL = URL(fileURLWithPath: exportDir).appendingPathComponent("\(UUID().uuidString).mp4")
		session.outputURL = outputURL
		session.outputFileType = .mp4
		session.exportAsynchronously {
			if session.status == .completed {
				reply(id, outputURL.path)
			} else {
				fail(id, session.error?.localizedDescription ?? "Could not export video")
			}
		}
	}
}

func handle(_ request: [String: Any]) {
	guard let id = request["id"], let cmd = request["cmd"] as? String else { return }
	switch cmd {
	case "status":
		reply(id, statusName(PHPhotoLibrary.authorizationStatus(for: .readWrite)))
	case "authorize":
		PHPhotoLibrary.requestAuthorization(for: .readWrite) { status in
			reply(id, statusName(status))
		}
	case "list":
		guard let start = request["start"] as? Double, let end = request["end"] as? Double else {
			return fail(id, "Missing start or end")
		}
		listAssets(id: id, start: start, end: end)
	case "image":
		guard let localIdentifier = request["asset"] as? String, let size = request["size"] as? Double else {
			return fail(id, "Missing asset or size")
		}
		guard let asset = findAsset(localIdentifier) else { return fail(id, "Asset not found") }
		requestImage(id: id, asset: asset, size: size)
	case "video":
		guard let localIdentifier = request["asset"] as? String,
		      let exportDir = request["exportDir"] as? String
		else {
			return fail(id, "Missing asset or exportDir")
		}
		guard let asset = findAsset(localIdentifier) else { return fail(id, "Asset not found") }
		requestVideo(id: id, asset: asset, exportDir: exportDir)
	default:
		fail(id, "Unknown command \(cmd)")
	}
}

// Read requests on a background thread, handle them on the main thread
DispatchQueue.global().async {
	while let line = readLine() {
		guard let data = line.data(using: .utf8),
		      let request = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
		else { continue }
		DispatchQueue.main.async { handle(request) }
	}
	// The app has closed stdin (e.g. because it quit). Exit after writing pending responses
	DispatchQueue.main.async {
		outputQueue.sync {}
		exit(0)
	}
}

dispatchMain()
