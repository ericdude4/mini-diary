import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const CIPHER = "aes-192-cbc";
const KEY_LENGTH = 24;
const IV_LENGTH = 16;

export class FileExistsError extends Error {}

/**
 * Derive the key and IV the same way OpenSSL's `EVP_BytesToKey` does (MD5, one iteration, no salt).
 * This is what Node's `crypto.createCipher` used internally before it was removed in Node 22. Diary
 * files written by previous versions of Mini Diary can only be decrypted with this derivation
 */
function deriveKeyAndIv(password: string): { key: Buffer; iv: Buffer } {
	const passwordBuffer = Buffer.from(password, "utf8");
	let derived = Buffer.alloc(0);
	let block = Buffer.alloc(0);
	while (derived.length < KEY_LENGTH + IV_LENGTH) {
		block = crypto
			.createHash("md5")
			.update(Buffer.concat([block, passwordBuffer]))
			.digest();
		derived = Buffer.concat([derived, block]);
	}
	return {
		key: derived.subarray(0, KEY_LENGTH),
		iv: derived.subarray(KEY_LENGTH, KEY_LENGTH + IV_LENGTH),
	};
}

export function encrypt(content: string, hashedPassword: string): Buffer {
	const { key, iv } = deriveKeyAndIv(hashedPassword);
	const cipher = crypto.createCipheriv(CIPHER, key, iv);
	return Buffer.concat([cipher.update(Buffer.from(content, "utf8")), cipher.final()]);
}

export function decrypt(data: Buffer, hashedPassword: string): string {
	const { key, iv } = deriveKeyAndIv(hashedPassword);
	const decipher = crypto.createDecipheriv(CIPHER, key, iv);
	return Buffer.concat([decipher.update(data), decipher.final()]).toString();
}

/**
 * Return whether the error was thrown because the file could not be decrypted with the provided
 * password
 */
export function isWrongPasswordError(err: unknown): boolean {
	return err instanceof Error && /bad[ _]decrypt/i.test(err.message);
}

export function fileExists(filePath: string): boolean {
	return fs.existsSync(filePath);
}

/**
 * Move a file, also across volumes (where `rename` is not possible)
 */
export function moveFile(sourcePath: string, destinationPath: string): void {
	if (fileExists(destinationPath)) {
		throw new FileExistsError();
	}
	try {
		fs.renameSync(sourcePath, destinationPath);
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code !== "EXDEV") {
			throw err;
		}
		fs.copyFileSync(sourcePath, destinationPath, fs.constants.COPYFILE_EXCL);
		fs.unlinkSync(sourcePath);
	}
}

export function readFile(filePath: string): string {
	return fs.readFileSync(filePath, { encoding: "utf8" });
}

export function readEncryptedFile(filePath: string, hashedPassword: string): string {
	return decrypt(fs.readFileSync(filePath), hashedPassword);
}

/**
 * Write the file to a temporary file in the same directory first and then move it into place, so
 * the existing file is never left half-written (e.g. if the app crashes during the write)
 */
export function writeFileAtomic(filePath: string, content: string | Uint8Array): void {
	// If the file is a symlink, replace its target instead of the link itself
	const targetPath = fileExists(filePath) ? fs.realpathSync(filePath) : filePath;
	const tmpPath = path.join(
		path.dirname(targetPath),
		`.${path.basename(targetPath)}.${process.pid}.${Date.now()}.tmp`,
	);
	try {
		fs.writeFileSync(tmpPath, content);
		fs.renameSync(tmpPath, targetPath);
	} catch (err) {
		fs.rmSync(tmpPath, { force: true });
		throw err;
	}
}

export function writeEncryptedFile(
	filePath: string,
	hashedPassword: string,
	content: string,
): void {
	writeFileAtomic(filePath, encrypt(content, hashedPassword));
}

export function deleteFile(filePath: string): void {
	fs.unlinkSync(filePath);
}
