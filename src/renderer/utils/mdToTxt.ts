import { remark } from "remark";
import strip from "strip-markdown";

const processor = remark()
	// Remove Markdown formatting (except for list bullets/numbers)
	.use(strip, { keep: ["list", "listItem"] })
	// Convert remaining Markdown to string
	.data("settings", { bullet: "-", listItemIndent: "one" });

/**
 * Remove formatting characters (e.g. "*" for bold) from the provided Markdown string
 */
export default async function mdToTxt(md: string): Promise<string> {
	const txt = await processor.process(md);
	return String(txt);
}
