import { ListItemNode, ListNode } from "@lexical/list";
import {
	$convertFromMarkdownString,
	$convertToMarkdownString,
	BOLD_ITALIC_STAR,
	BOLD_ITALIC_UNDERSCORE,
	BOLD_STAR,
	BOLD_UNDERSCORE,
	ITALIC_STAR,
	ITALIC_UNDERSCORE,
	ORDERED_LIST,
	Transformer,
	UNORDERED_LIST,
} from "@lexical/markdown";
import { Klass, LexicalNode } from "lexical";

// Lexical nodes used by the diary entry text editor
export const EDITOR_NODES: Klass<LexicalNode>[] = [ListNode, ListItemNode];

/**
 * Markdown syntax which is supported in diary entries (bold, italic and lists). Entries written by
 * earlier versions of Mini Diary (with the Draft.js editor) use the same subset of Markdown.
 *
 * The order matters for exporting: The first matching transformer is used. Stars are preferred over
 * underscores because they also work within words (e.g. "un*believ*able")
 */
export const MARKDOWN_TRANSFORMERS: Transformer[] = [
	UNORDERED_LIST,
	ORDERED_LIST,
	BOLD_ITALIC_STAR,
	BOLD_ITALIC_UNDERSCORE,
	BOLD_STAR,
	BOLD_UNDERSCORE,
	ITALIC_STAR,
	ITALIC_UNDERSCORE,
];

// Markdown shortcuts while typing (e.g. "- " at the start of a line starts a list)
export const MARKDOWN_SHORTCUT_TRANSFORMERS: Transformer[] = [UNORDERED_LIST, ORDERED_LIST];

/**
 * Replace the editor content with the provided Markdown. Must be called inside `editor.update()`
 */
export function $importMarkdown(md: string): void {
	$convertFromMarkdownString(md, MARKDOWN_TRANSFORMERS);
}

/**
 * Convert the editor content to Markdown. Must be called inside `editor.read()`
 */
export function $exportMarkdown(): string {
	return $convertToMarkdownString(MARKDOWN_TRANSFORMERS);
}
