/**
 * Registry for system-specific statblock adapters.
 * Adapters handle conversion between StatblockData and system-specific actor data.
 *
 * Each adapter must implement:
 * - isSupported(): boolean - Check if system version is compatible
 * - createActor(statblock, options): Promise<Actor> - Create actor from statblock
 * - updateActor(existing, statblock): Promise<Actor> - Update existing actor
 */
class StatblockAdapterRegistry {
    static _adapters = new Map();

    /**
     * Register an adapter for a specific game system.
     *
     * @param {string} systemId - The Foundry system ID (e.g., 'dnd5e')
     * @param {object} adapter - The adapter instance
     * @throws {Error} If adapter is missing required methods
     */
    static register(systemId, adapter) {
        if (!systemId || typeof systemId !== 'string') {
            throw new Error('StatblockAdapterRegistry.register requires a valid systemId string');
        }

        if (!adapter) {
            throw new Error('StatblockAdapterRegistry.register requires an adapter');
        }

        const requiredMethods = ['isSupported', 'createActor', 'updateActor'];
        for (const method of requiredMethods) {
            if (typeof adapter[method] !== 'function') {
                throw new Error(`Adapter for "${systemId}" is missing required method: ${method}`);
            }
        }

        this._adapters.set(systemId, adapter);
    }

    /**
     * Get the adapter for the current game system.
     * Returns null if no adapter registered or if adapter reports unsupported.
     *
     * @returns {object|null} The adapter for game.system.id, or null if not available
     */
    static getAdapter() {
        if (typeof game === 'undefined' || !game.system?.id) {
            return null;
        }

        const adapter = this._adapters.get(game.system.id);
        if (!adapter || !adapter.isSupported()) {
            return null;
        }

        return adapter;
    }

    /**
     * Check if statblock import is available for the current system.
     *
     * @returns {boolean} True if an adapter is registered for the current system
     */
    static isAvailable() {
        return this.getAdapter() !== null;
    }

    /**
     * Get all registered system IDs.
     * Primarily useful for debugging and testing.
     *
     * @returns {string[]} Array of registered system IDs
     */
    static getRegisteredSystems() {
        return Array.from(this._adapters.keys());
    }

    /**
     * Clear all registered adapters.
     * Primarily useful for testing.
     */
    static clear() {
        this._adapters.clear();
    }
}

export default StatblockAdapterRegistry;
