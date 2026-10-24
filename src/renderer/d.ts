/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

import type { Api } from "../preload/preload";

declare global {
	interface Window {
		api: Api;
	}
}
