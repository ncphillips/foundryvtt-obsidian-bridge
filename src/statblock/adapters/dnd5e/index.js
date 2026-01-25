/**
 * dnd5e adapter for statblock import.
 * Requires dnd5e system version 5.1 or higher.
 */

import StatblockAdapterRegistry from '../../registry.js';
import { mapToDnd5eActor, createEmbeddedItemsAsync } from './mapper.js';
import { id as MODULE_ID } from '../../../../module.json';

/**
 * Adapter for the dnd5e game system.
 * Handles conversion of StatblockData to dnd5e Actor documents.
 */
const DND5E_ADAPTER = {
    /**
     * Checks if the current dnd5e system version is supported.
     * Requires dnd5e 5.1+ for the current NPC schema.
     *
     * @returns {boolean} True if system is dnd5e 5.1+
     */
    isSupported() {
        // Check if we're in a Foundry context with game.system available
        if (typeof game === 'undefined' || !game.system?.id) {
            return false;
        }

        if (game.system.id !== 'dnd5e') {
            return false;
        }

        // Parse version - require 5.1+
        const version = game.system.version;
        if (!version) {
            return false;
        }

        const parts = version.split('.').map(Number);
        const major = parts[0] || 0;
        const minor = parts[1] || 0;

        return major > 5 || (major === 5 && minor >= 1);
    },

    /**
     * Creates a new Actor from a StatblockData object.
     *
     * @param {StatblockData} statblock - Parsed statblock data
     * @param {Object} options - Import options
     * @param {Folder|null} options.folder - Target folder for the actor
     * @returns {Promise<Actor>} The created Actor document
     */
    async createActor(statblock, options = {}) {
        const actorData = mapToDnd5eActor(statblock);

        // Set folder if provided
        if (options.folder) {
            actorData.folder = options.folder.id;
        }

        // Create the actor
        const actor = await Actor.create(actorData);

        // Create embedded items (traits, actions, spells, gear)
        const items = await createEmbeddedItemsAsync(statblock);
        if (items.length > 0) {
            await actor.createEmbeddedDocuments('Item', items);
        }

        return actor;
    },

    /**
     * Updates an existing Actor with new statblock data.
     * Replaces actor system data and recreates all items that were
     * originally imported from a statblock.
     *
     * @param {Actor} existing - The existing Actor document to update
     * @param {StatblockData} statblock - New statblock data
     * @returns {Promise<Actor>} The updated Actor document
     */
    async updateActor(existing, statblock) {
        const actorData = mapToDnd5eActor(statblock);

        // Update the actor's system data
        // We need to be careful not to overwrite folder, permissions, etc.
        await existing.update({
            name: actorData.name,
            img: actorData.img,
            system: actorData.system,
            flags: actorData.flags
        });

        // Delete old items that we created (flagged with fromStatblock)
        const oldItems = existing.items.filter(item =>
            item.flags[MODULE_ID]?.fromStatblock === true
        );

        if (oldItems.length > 0) {
            await existing.deleteEmbeddedDocuments(
                'Item',
                oldItems.map(item => item.id)
            );
        }

        // Create new items
        const items = await createEmbeddedItemsAsync(statblock);
        if (items.length > 0) {
            await existing.createEmbeddedDocuments('Item', items);
        }

        return existing;
    }
};

/**
 * Registers the dnd5e adapter with the StatblockAdapterRegistry.
 * This function should be called during module initialization.
 */
export function registerDnd5eAdapter() {
    StatblockAdapterRegistry.register('dnd5e', DND5E_ADAPTER);
}

export default DND5E_ADAPTER;
