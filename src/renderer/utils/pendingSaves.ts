type SaveFunc = () => void;

// Functions which save changes that have not been written to disk yet (e.g. by the editor, which
// saves with a delay while typing)
const saveFuncs = new Set<SaveFunc>();

/**
 * Register a function which saves pending changes. Returns a function for unregistering it
 */
export function registerPendingSave(saveFunc: SaveFunc): () => void {
	saveFuncs.add(saveFunc);
	return (): void => {
		saveFuncs.delete(saveFunc);
	};
}

/**
 * Save all pending changes immediately (e.g. before locking the diary)
 */
export function flushPendingSaves(): void {
	saveFuncs.forEach(saveFunc => saveFunc());
}
