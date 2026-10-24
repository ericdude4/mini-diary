import logger from "electron-log/main";

export function initLogger(): void {
	// Set log level for writing to file
	logger.transports.file.level = "info";

	// Allow renderer process to log (the preload script is included in the app's own preload script)
	logger.initialize({ preload: false });

	// Catch unhandled errors and promise rejections, log them instead of crashing
	logger.errorHandler.startCatching({ showDialog: false });
}
