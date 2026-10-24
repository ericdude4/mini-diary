import { LexicalEditor } from "lexical";
import React, { ReactElement } from "react";

import FormattingButtons from "../formatting-buttons/FormattingButtons";
import WordCountWrapper from "../word-count/WordCountWrapper";

export interface CustomProps {
	textEditor: LexicalEditor | null;
}

type Props = CustomProps;

export default function EditorToolbar(props: Props): ReactElement {
	const { textEditor } = props;

	return (
		<div
			className="editor-toolbar"
			onMouseDown={(e): void => {
				e.preventDefault(); // Keep focus on editor when a button is clicked
			}}
			role="none"
		>
			<FormattingButtons textEditor={textEditor} />
			<WordCountWrapper />
		</div>
	);
}
