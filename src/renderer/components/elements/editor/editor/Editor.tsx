import { InitialConfigType, LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { EditorRefPlugin } from "@lexical/react/LexicalEditorRefPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import logger from "electron-log/renderer";
import { $createParagraphNode, $createTextNode, $getRoot, LexicalEditor } from "lexical";
import debounce from "lodash.debounce";
import { Moment } from "moment-timezone";
import React, { ReactElement, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Entries, IndexDate } from "../../../../types";
import { toIndexDate, toLocaleWeekday } from "../../../../utils/dateFormat";
import { translations } from "../../../../utils/i18n";
import {
	$exportMarkdown,
	$importMarkdown,
	EDITOR_NODES,
	MARKDOWN_SHORTCUT_TRANSFORMERS,
} from "../../../../utils/markdown";
import { registerPendingSave } from "../../../../utils/pendingSaves";
import EditorToolbar from "../editor-toolbar/editor-toolbar/EditorToolbar";
import {
	AllowedFormatsPlugin,
	ContentChangePlugin,
	EnterKeyPlugin,
	ListTabIndentationPlugin,
} from "./plugins/plugins";

const AUTOSAVE_INTERVAL = 500;

const THEME = {
	paragraph: "editor-paragraph",
	list: {
		ul: "editor-list-ul",
		ol: "editor-list-ol",
		listitem: "editor-list-item",
		nested: { listitem: "editor-list-item-nested" },
	},
	text: {
		bold: "editor-text-bold",
		italic: "editor-text-italic",
	},
};

function onError(err: Error): void {
	logger.error("Editor error: ", err);
}

export interface StateProps {
	enableSpellcheck: boolean;
	hideTitles: boolean;
	dateSelected: Moment;
	entries: Entries;
}

export interface DispatchProps {
	updateEntry: (entryDate: IndexDate, title: string, text: string) => void;
}

type Props = StateProps & DispatchProps;

interface EntryEditorProps {
	enableSpellcheck: boolean;
	hideTitles: boolean;
	dateSelected: Moment;
	initialTitle: string;
	initialText: string;
	updateEntry: (entryDate: IndexDate, title: string, text: string) => void;
}

function getTitle(editor: LexicalEditor): string {
	return editor.getEditorState().read(() => $getRoot().getTextContent());
}

function getText(editor: LexicalEditor): string {
	return editor.getEditorState().read(() => $exportMarkdown());
}

/**
 * Title and text editors for the diary entry of a single day
 */
function EntryEditor(props: EntryEditorProps): ReactElement {
	const { dateSelected, enableSpellcheck, hideTitles, initialText, initialTitle, updateEntry } =
		props;

	const indexDate = toIndexDate(dateSelected);

	// The entry as it was when the editor was opened (the props are updated on every save)
	const [original] = useState({ title: initialTitle, text: initialText });

	const titleEditorRef = useRef<LexicalEditor | null>(null);
	const textEditorRef = useRef<LexicalEditor | null>(null);
	const [textEditor, setTextEditor] = useState<LexicalEditor | null>(null);

	// Title and text right after loading the entry into the editors. Converting the entry to the
	// editor format and back can change the Markdown syntax slightly (e.g. "_" vs. "*" for italic).
	// As long as the content hasn't been edited, the original title and text are saved unchanged
	const loadedTitleRef = useRef<string | null>(null);
	const loadedTextRef = useRef<string | null>(null);
	const latestTitleRef = useRef<string | null>(null);

	const titleConfig: InitialConfigType = useMemo(
		() => ({
			namespace: "title",
			onError,
			// Use the latest title in case the title editor is hidden and shown again
			editorState: (): void => {
				const title = latestTitleRef.current ?? original.title;
				$getRoot().append($createParagraphNode().append($createTextNode(title)));
			},
		}),
		[original],
	);

	const textConfig: InitialConfigType = useMemo(
		() => ({
			namespace: "text",
			nodes: EDITOR_NODES,
			onError,
			theme: THEME,
			editorState: (): void => $importMarkdown(original.text),
		}),
		[original],
	);

	const setTitleEditor = useCallback((editor: LexicalEditor | null): void => {
		if (editor) {
			titleEditorRef.current = editor;
			loadedTitleRef.current ??= getTitle(editor);
		}
	}, []);

	const setTextEditorRef = useCallback((editor: LexicalEditor | null): void => {
		if (editor) {
			textEditorRef.current = editor;
			loadedTextRef.current ??= getText(editor);
			setTextEditor(editor);
		}
	}, []);

	const saveEntry = useCallback((): void => {
		if (titleEditorRef.current) {
			latestTitleRef.current = getTitle(titleEditorRef.current);
		}
		const latestTitle = latestTitleRef.current;
		const title =
			latestTitle === null || latestTitle === loadedTitleRef.current
				? original.title
				: latestTitle.trim();

		const latestText = textEditorRef.current ? getText(textEditorRef.current) : null;
		const text =
			latestText === null || latestText === loadedTextRef.current
				? original.text
				: latestText.trim();

		updateEntry(indexDate, title, text);
	}, [indexDate, original, updateEntry]);

	// Save the entry with a delay while typing
	const saveEntryDebouncedRef = useRef<ReturnType<typeof debounce<() => void>> | null>(null);
	const scheduleSave = useCallback((): void => {
		saveEntryDebouncedRef.current?.();
	}, []);

	useEffect(() => {
		const saveEntryDebounced = debounce(saveEntry, AUTOSAVE_INTERVAL);
		saveEntryDebouncedRef.current = saveEntryDebounced;

		// Save entry before the app is closed or the diary is locked
		const save = (): void => {
			saveEntryDebounced.flush();
		};
		const unregister = registerPendingSave(save);
		window.addEventListener("beforeunload", save);
		return (): void => {
			// Save entry when switching to another day
			save();
			unregister();
			window.removeEventListener("beforeunload", save);
		};
	}, [saveEntry]);

	const focusTextEditor = useCallback((): void => {
		textEditorRef.current?.focus();
	}, []);

	const weekdayDate = toLocaleWeekday(dateSelected);
	return (
		<form className="editor">
			<div className="editor-scrollable">
				<p className="text-faded">{weekdayDate}</p>
				{!hideTitles && (
					<div className="editor-title-wrapper">
						<LexicalComposer initialConfig={titleConfig}>
							<PlainTextPlugin
								contentEditable={
									<div className="editor-input-wrapper" onBlur={saveEntry}>
										<ContentEditable
											className="editor-input"
											spellCheck={enableSpellcheck}
											aria-placeholder={translations["add-a-title"]}
											placeholder={
												<div className="editor-placeholder">{translations["add-a-title"]}</div>
											}
										/>
									</div>
								}
								ErrorBoundary={LexicalErrorBoundary}
							/>
							<EnterKeyPlugin onEnter={focusTextEditor} />
							<ContentChangePlugin onChange={scheduleSave} />
							<HistoryPlugin />
							<EditorRefPlugin editorRef={setTitleEditor} />
						</LexicalComposer>
					</div>
				)}
				<div className="editor-text-wrapper">
					<LexicalComposer initialConfig={textConfig}>
						<RichTextPlugin
							contentEditable={
								<div className="editor-input-wrapper" onBlur={saveEntry}>
									<ContentEditable
										className="editor-input"
										spellCheck={enableSpellcheck}
										aria-placeholder={translations["write-something"]}
										placeholder={
											<div className="editor-placeholder">{`${translations["write-something"]}…`}</div>
										}
									/>
								</div>
							}
							ErrorBoundary={LexicalErrorBoundary}
						/>
						<ListPlugin />
						<ListTabIndentationPlugin />
						<MarkdownShortcutPlugin transformers={MARKDOWN_SHORTCUT_TRANSFORMERS} />
						<AllowedFormatsPlugin />
						<ContentChangePlugin onChange={scheduleSave} />
						<HistoryPlugin />
						<EditorRefPlugin editorRef={setTextEditorRef} />
					</LexicalComposer>
				</div>
			</div>
			<EditorToolbar textEditor={textEditor} />
		</form>
	);
}

/**
 * Editor for the diary entry of the selected day
 */
export default function Editor(props: Props): ReactElement {
	const { dateSelected, enableSpellcheck, entries, hideTitles, updateEntry } = props;

	const indexDate = toIndexDate(dateSelected);
	const entry = entries[indexDate];

	// Create new editors when another day is selected
	return (
		<EntryEditor
			key={indexDate}
			dateSelected={dateSelected}
			enableSpellcheck={enableSpellcheck}
			hideTitles={hideTitles}
			initialTitle={entry?.title ?? ""}
			initialText={entry?.text ?? ""}
			updateEntry={updateEntry}
		/>
	);
}
