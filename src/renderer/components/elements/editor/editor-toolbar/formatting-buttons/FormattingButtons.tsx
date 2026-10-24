import {
	INSERT_ORDERED_LIST_COMMAND,
	INSERT_UNORDERED_LIST_COMMAND,
	ListNode,
	REMOVE_LIST_COMMAND,
} from "@lexical/list";
import { $getNearestNodeOfType } from "@lexical/utils";
import BoldIcon from "feather-icons/dist/icons/bold.svg?react";
import ItalicIcon from "feather-icons/dist/icons/italic.svg?react";
import UlIcon from "feather-icons/dist/icons/list.svg?react";
import { $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND, LexicalEditor } from "lexical";
import React, { ReactElement, useEffect, useState } from "react";

import OlIcon from "../../../../../assets/icons/ordered-list.svg?react";
import { translations } from "../../../../../utils/i18n";
import { iconProps } from "../../../../../utils/icons";

const STROKE_WIDTH_DEFAULT = 2;
const STROKE_WIDTH_SELECTED = 3;

export interface CustomProps {
	textEditor: LexicalEditor | null;
}

type Props = CustomProps;

interface ActiveFormats {
	isBold: boolean;
	isItalic: boolean;
	isOl: boolean;
	isUl: boolean;
}

const NO_FORMATS: ActiveFormats = { isBold: false, isItalic: false, isOl: false, isUl: false };

/**
 * Toolbar buttons for changing the formatting of the diary entry (bold, italic, lists)
 */
export default function FormattingButtons(props: Props): ReactElement {
	const { textEditor } = props;

	// Detect active inline/block styles
	const [activeFormats, setActiveFormats] = useState(NO_FORMATS);
	const { isBold, isItalic, isOl, isUl } = activeFormats;
	useEffect(() => {
		if (!textEditor) {
			return undefined;
		}
		return textEditor.registerUpdateListener(({ editorState }) => {
			editorState.read(() => {
				const selection = $getSelection();
				if (!$isRangeSelection(selection)) {
					setActiveFormats(NO_FORMATS);
					return;
				}
				const list = $getNearestNodeOfType(selection.anchor.getNode(), ListNode);
				setActiveFormats({
					isBold: selection.hasFormat("bold"),
					isItalic: selection.hasFormat("italic"),
					isOl: list?.getListType() === "number",
					isUl: list?.getListType() === "bullet",
				});
			});
		});
	}, [textEditor]);

	const onBoldClick = (): void => {
		textEditor?.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
	};

	const onItalicClick = (): void => {
		textEditor?.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
	};

	const onOlClick = (): void => {
		textEditor?.dispatchCommand(
			isOl ? REMOVE_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND,
			undefined,
		);
	};

	const onUlClick = (): void => {
		textEditor?.dispatchCommand(
			isUl ? REMOVE_LIST_COMMAND : INSERT_UNORDERED_LIST_COMMAND,
			undefined,
		);
	};

	return (
		<div className="formatting-buttons">
			<button
				type="button"
				className={`button button-invisible ${isBold ? "button-active" : ""}`}
				onClick={onBoldClick}
			>
				<BoldIcon
					{...iconProps}
					strokeWidth={isBold ? STROKE_WIDTH_SELECTED : STROKE_WIDTH_DEFAULT}
					title={translations.bold}
				/>
			</button>
			<button
				type="button"
				className={`button button-invisible ${isItalic ? "button-active" : ""}`}
				onClick={onItalicClick}
			>
				<ItalicIcon
					{...iconProps}
					strokeWidth={isItalic ? STROKE_WIDTH_SELECTED : STROKE_WIDTH_DEFAULT}
					title={translations.italic}
				/>
			</button>
			<button
				type="button"
				className={`button button-invisible ${isUl ? "button-active" : ""}`}
				onClick={onUlClick}
			>
				<UlIcon
					{...iconProps}
					strokeWidth={isUl ? STROKE_WIDTH_SELECTED : STROKE_WIDTH_DEFAULT}
					title={translations.bullets}
				/>
			</button>
			<button
				type="button"
				className={`button button-invisible ${isOl ? "button-active" : ""}`}
				onClick={onOlClick}
			>
				<OlIcon
					{...iconProps}
					strokeWidth={isOl ? STROKE_WIDTH_SELECTED : STROKE_WIDTH_DEFAULT}
					title={translations.list}
				/>
			</button>
		</div>
	);
}
