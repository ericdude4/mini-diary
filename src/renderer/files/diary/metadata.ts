import { productName, version } from "../../../../package.json";
import { Metadata } from "../../types";
import { createDate } from "../../utils/dateFormat";

/**
 * Return metadata to include in encrypted diary file (consists of app version and date of last
 * write)
 */
export function getMetadata(): Metadata {
	return {
		application: productName,
		version,
		dateUpdated: createDate().toString(),
	};
}
