import eslintReact from "@eslint-react/eslint-plugin";
import eslintJs from "@eslint/js";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
	globalIgnores(["out/", "dist/", "website/index.js"]),
	eslintJs.configs.recommended,
	tseslint.configs.recommended,
	{
		languageOptions: {
			globals: { ...globals.node },
		},
		rules: {
			"@typescript-eslint/explicit-function-return-type": [
				"error",
				{ allowExpressions: true, allowTypedFunctionExpressions: true },
			],
		},
	},
	{
		files: ["src/renderer/**/*.{ts,tsx}"],
		extends: [eslintReact.configs["recommended-typescript"], reactHooks.configs.flat.recommended],
		languageOptions: {
			globals: { ...globals.browser },
		},
	},
	{
		files: ["test/**/*.ts"],
		languageOptions: {
			globals: { ...globals.vitest },
		},
	},
	{
		files: ["website/**/*.ts"],
		languageOptions: {
			globals: { ...globals.browser },
		},
	},
	prettier,
);
