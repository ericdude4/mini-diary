import crypto from "node:crypto";
import { promisify } from "node:util";

const pbkdf2 = promisify(crypto.pbkdf2);

const CIPHER = "sha512";
const ITERATIONS = 500000;
const KEY_BYTE_LENGTH = 64;
const SALT =
	"KvAUQORXF8OBYXcYmIwHBpahc7I9Td+qe+H1/eGTaXvI9XfRLngERiC4ufpfx4mqvQgITb0t+ns840lJcRRTKQmF65vje5/Wfb99Nsu6kxDudTiM5pKUcmn36fEJ9/lhFIyBd18Unouh3OiTxO+5xhGugtujNARLijOzkDkYy/8=";

/**
 * Hash the password on a background thread (hashing takes a while and would otherwise block the
 * main process)
 */
export async function hashPassword(password: string): Promise<string> {
	try {
		const hash = await pbkdf2(password, SALT, ITERATIONS, KEY_BYTE_LENGTH, CIPHER);
		return hash.toString("hex");
	} catch (err) {
		throw Error(`Error while hashing password: ${String(err)}`, { cause: err });
	}
}
