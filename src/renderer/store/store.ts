import { combineReducers, configureStore, ThunkAction, ThunkDispatch } from "@reduxjs/toolkit";
import { createLogger } from "redux-logger";

import appReducer from "./app/reducer";
import { AppAction } from "./app/types";
import diaryReducer from "./diary/reducer";
import { DiaryAction } from "./diary/types";
import exportReducer from "./export/reducer";
import { ExportAction } from "./export/types";
import fileReducer from "./file/reducer";
import { FileAction } from "./file/types";
import importReducer from "./import/reducer";
import { ImportAction } from "./import/types";

// Combine reducers
const rootReducer = combineReducers({
	app: appReducer,
	diary: diaryReducer,
	file: fileReducer,
	export: exportReducer,
	import: importReducer,
});

export type RootAction = AppAction | DiaryAction | ExportAction | FileAction | ImportAction;
export type RootState = ReturnType<typeof rootReducer>;
export type ThunkActionT = ThunkAction<void, RootState, void, RootAction>;
export type AsyncThunkActionT = ThunkAction<Promise<void>, RootState, void, RootAction>;
export type ThunkDispatchT = ThunkDispatch<RootState, void, RootAction>;

// Create store
export default configureStore({
	reducer: rootReducer,
	middleware: getDefaultMiddleware => {
		const middleware = getDefaultMiddleware({
			// The state contains Moment objects (which are not serializable)
			serializableCheck: false,
			// The entries object is large, checking it for mutations on every action is slow
			immutableCheck: false,
		});
		return import.meta.env.DEV ? middleware.concat(createLogger()) : middleware;
	},
});
