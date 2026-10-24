import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
	decrypt,
	encrypt,
	isWrongPasswordError,
	readEncryptedFile,
	writeEncryptedFile,
} from "../src/main/files/fileAccess";
import reference from "./fixtures/diary-v3-encrypted.json";

const PATH_REFERENCE_FILE = path.resolve(__dirname, "fixtures", "diary-v3-encrypted.bin");

describe("diary file encryption", () => {
	test("decrypts diary files written by previous versions", () => {
		expect(readEncryptedFile(PATH_REFERENCE_FILE, reference.hashedPassword)).toBe(
			reference.content,
		);
	});

	test("encrypts exactly like previous versions", () => {
		const encrypted = encrypt(reference.content, reference.hashedPassword);
		expect(encrypted.equals(fs.readFileSync(PATH_REFERENCE_FILE))).toBe(true);
	});

	test("detects wrong passwords", () => {
		const data = fs.readFileSync(PATH_REFERENCE_FILE);
		let error: unknown;
		try {
			decrypt(data, "wrong password");
		} catch (err) {
			error = err;
		}
		expect(isWrongPasswordError(error)).toBe(true);
	});

	describe("writing", () => {
		let tmpDir: string;

		beforeEach(() => {
			tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mini-diary-test-"));
		});

		afterEach(() => {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		});

		test("writes and reads back, leaving no temporary files", () => {
			const filePath = path.join(tmpDir, "mini-diary.txt");
			writeEncryptedFile(filePath, "pw", "first");
			writeEncryptedFile(filePath, "pw", "second");
			expect(readEncryptedFile(filePath, "pw")).toBe("second");
			expect(fs.readdirSync(tmpDir)).toEqual(["mini-diary.txt"]);
		});

		test("keeps symlinks intact", () => {
			const targetPath = path.join(tmpDir, "target.txt");
			const linkPath = path.join(tmpDir, "mini-diary.txt");
			writeEncryptedFile(targetPath, "pw", "first");
			fs.symlinkSync(targetPath, linkPath);
			writeEncryptedFile(linkPath, "pw", "second");
			expect(fs.lstatSync(linkPath).isSymbolicLink()).toBe(true);
			expect(readEncryptedFile(targetPath, "pw")).toBe("second");
		});
	});
});
