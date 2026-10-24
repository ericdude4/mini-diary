import { createHeadlessEditor } from "@lexical/headless";
import { $getRoot } from "lexical";

import { $exportMarkdown, $importMarkdown, EDITOR_NODES } from "../src/renderer/utils/markdown";
import draftJsMarkdown from "./fixtures/draftjs-markdown.json";

/**
 * Load Markdown into the editor and return the editor's Markdown and plain text
 */
function roundTrip(md: string): { md: string; text: string } {
	const editor = createHeadlessEditor({
		nodes: EDITOR_NODES,
		onError: (err): void => {
			throw err;
		},
	});
	editor.update(() => $importMarkdown(md), { discrete: true });
	return editor.getEditorState().read(() => ({
		md: $exportMarkdown(),
		text: $getRoot().getTextContent(),
	}));
}

const OTHER_MARKDOWN = [
	"***both***",
	"__bold__",
	"*italic*",
	"wo*rd*s and half**bold**word",
	"snake_case_word and 5*3*2",
	"line\n\n\n\nmany blank lines",
	"- a\n    - b\n        - c\n- d",
	"~~strike~~ `code` [link](https://example.com) > quote",
];

describe("Markdown conversion of entries", () => {
	test.each(Object.entries(draftJsMarkdown.entries))(
		"keeps formatting of entries written by previous versions (%s)",
		(_, md) => {
			const { md: mdRoundTrip, text } = roundTrip(md);
			// The Markdown syntax may differ (e.g. "*" instead of "_" for italic), but the content must
			// be the same
			const second = roundTrip(mdRoundTrip);
			expect(second.text).toBe(text);
			expect(second.md).toBe(mdRoundTrip);
		},
	);

	test.each(OTHER_MARKDOWN)("is stable for %j", md => {
		const first = roundTrip(md);
		const second = roundTrip(first.md);
		expect(second.text).toBe(first.text);
		expect(second.md).toBe(first.md);
	});

	test("keeps the syntax of entries written by previous versions where possible", () => {
		const { entries } = draftJsMarkdown;
		expect(roundTrip(entries.twoParas).md).toBe(entries.twoParas);
		expect(roundTrip(entries.softBreak).md).toBe(entries.softBreak);
		expect(roundTrip(entries.bold).md).toBe(entries.bold);
		expect(roundTrip(entries.ul).md).toBe(entries.ul);
		expect(roundTrip(entries.ol).md).toBe(entries.ol);
		expect(roundTrip(entries.nested).md).toBe(entries.nested);
		expect(roundTrip(entries.nestedOl).md).toBe(entries.nestedOl);
		expect(roundTrip(entries.unicode).md).toBe(entries.unicode);
		expect(roundTrip(entries.italic).md).toBe("some *italic* text");
	});

	test("parses formatting", () => {
		expect(roundTrip("This text is **bold** and _italic_.").text).toBe(
			"This text is bold and italic.",
		);
	});
});
