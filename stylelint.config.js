export default {
	extends: "stylelint-config-standard-scss",
	rules: {
		// Allow `@include` directly followed by declarations
		"declaration-empty-line-before": null,
		// Class names of third-party components (e.g. `rdp-day_button`) don't follow a pattern
		"selector-class-pattern": null,
		"value-keyword-case": ["lower", { ignoreKeywords: ["BlinkMacSystemFont"] }],
	},
};
