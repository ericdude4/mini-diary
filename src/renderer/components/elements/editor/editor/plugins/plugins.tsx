import { ListItemNode } from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getNearestNodeOfType, mergeRegister } from "@lexical/utils";
import {
	$getSelection,
	$isRangeSelection,
	COMMAND_PRIORITY_CRITICAL,
	COMMAND_PRIORITY_EDITOR,
	COMMAND_PRIORITY_HIGH,
	FORMAT_TEXT_COMMAND,
	INDENT_CONTENT_COMMAND,
	KEY_ENTER_COMMAND,
	KEY_TAB_COMMAND,
	OUTDENT_CONTENT_COMMAND,
	TextFormatType,
	TextNode,
} from "lexical";
import { useEffect } from "react";

// Text formats which can be stored in Markdown
const ALLOWED_FORMATS: TextFormatType[] = ["bold", "italic"];
const DISALLOWED_FORMATS: TextFormatType[] = [
	"capitalize",
	"code",
	"highlight",
	"lowercase",
	"strikethrough",
	"subscript",
	"superscript",
	"underline",
	"uppercase",
];

/**
 * Only allow formatting which can be saved as Markdown (bold and italic). Blocks keyboard shortcuts
 * like Cmd+U and removes other formatting from pasted text
 */
export function AllowedFormatsPlugin(): null {
	const [editor] = useLexicalComposerContext();

	useEffect(
		() =>
			mergeRegister(
				editor.registerCommand(
					FORMAT_TEXT_COMMAND,
					format => !ALLOWED_FORMATS.includes(format), // `true` stops the command
					COMMAND_PRIORITY_CRITICAL,
				),
				editor.registerNodeTransform(TextNode, node => {
					DISALLOWED_FORMATS.forEach(format => {
						if (node.hasFormat(format)) {
							node.toggleFormat(format);
						}
					});
					if (node.getStyle() !== "") {
						node.setStyle("");
					}
				}),
			),
		[editor],
	);

	return null;
}

/**
 * Indent/outdent list items with Tab/Shift+Tab
 */
export function ListTabIndentationPlugin(): null {
	const [editor] = useLexicalComposerContext();

	useEffect(
		() =>
			editor.registerCommand(
				KEY_TAB_COMMAND,
				event => {
					const selection = $getSelection();
					if (
						!$isRangeSelection(selection) ||
						!$getNearestNodeOfType(selection.anchor.getNode(), ListItemNode)
					) {
						return false;
					}
					event.preventDefault();
					return editor.dispatchCommand(
						event.shiftKey ? OUTDENT_CONTENT_COMMAND : INDENT_CONTENT_COMMAND,
						undefined,
					);
				},
				COMMAND_PRIORITY_EDITOR,
			),
		[editor],
	);

	return null;
}

/**
 * Call `onEnter` instead of inserting a line break when the Enter key is pressed
 */
export function EnterKeyPlugin({ onEnter }: { onEnter: () => void }): null {
	const [editor] = useLexicalComposerContext();

	useEffect(
		() =>
			editor.registerCommand(
				KEY_ENTER_COMMAND,
				event => {
					event?.preventDefault();
					onEnter();
					return true;
				},
				// Run before the plain text plugin's handler (which inserts a line break)
				COMMAND_PRIORITY_HIGH,
			),
		[editor, onEnter],
	);

	return null;
}

/**
 * Call `onChange` when the editor content changes (but not when only the selection changes)
 */
export function ContentChangePlugin({ onChange }: { onChange: () => void }): null {
	const [editor] = useLexicalComposerContext();

	useEffect(
		() =>
			editor.registerUpdateListener(({ dirtyElements, dirtyLeaves, prevEditorState }) => {
				if ((dirtyElements.size > 0 || dirtyLeaves.size > 0) && !prevEditorState.isEmpty()) {
					onChange();
				}
			}),
		[editor, onChange],
	);

	return null;
}
