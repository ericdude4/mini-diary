import { resolve } from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";
import svgr from "vite-plugin-svgr";

// All dependencies are bundled (`externalizeDeps: false`), so the packaged app does not need a
// `node_modules` directory
export default defineConfig({
	main: {
		build: {
			externalizeDeps: false,
			rolldownOptions: {
				input: { main: resolve("src/main/main.ts") },
			},
		},
	},
	preload: {
		build: {
			externalizeDeps: false,
			rolldownOptions: {
				input: { preload: resolve("src/preload/preload.ts") },
				// Sandboxed preload scripts must be CommonJS
				output: { format: "cjs", entryFileNames: "[name].cjs" },
			},
		},
	},
	renderer: {
		root: "src/renderer",
		build: {
			rolldownOptions: {
				input: { index: resolve("src/renderer/index.html") },
			},
		},
		plugins: [
			react(),
			// Import SVG files as React components (`import Icon from "./icon.svg?react"`)
			svgr({ svgrOptions: { titleProp: true } }),
		],
	},
});
