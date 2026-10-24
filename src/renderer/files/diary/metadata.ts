import { version } from "../../../../package.json";
import { Metadata } from "../../types";
import { createDate } from "../../utils/dateFormat";

// Application name stored in the diary file (the app was renamed from "Mini Diary" to "Journal", but
// the file format is unchanged)
const APPLICATION = "Mini Diary";

/**
 * Return metadata to include in encrypted diary file (consists of app version and date of last
 * write)
 */
export function getMetadata(): Metadata {
	return {
		application: APPLICATION,
		version,
		dateUpdated: createDate().toString(),
	};
}
