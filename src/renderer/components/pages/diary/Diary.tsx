import React, { FunctionComponent, ReactElement } from "react";

import EditorContainer from "../../elements/editor/editor/EditorContainer";
import SidebarContainer from "../../elements/sidebar/sidebar/SidebarContainer";

const Diary: FunctionComponent = (): ReactElement => (
	<div className="diary">
		<SidebarContainer />
		<EditorContainer />
	</div>
);

export default Diary;
