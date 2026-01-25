/**
 * Compendium lookup utilities for dnd5e items and spells.
 * Searches SRD compendiums for matching items.
 */

/**
 * Cache for compendium indexes to avoid repeated lookups.
 * @type {Map<string, Map<string, Object>>}
 */
const indexCache = new Map();

/**
 * Gets or builds an index for a compendium, keyed by lowercase name.
 *
 * @param {string} packId - Compendium pack ID (e.g., "dnd5e.items")
 * @returns {Promise<Map<string, Object>>} Map of lowercase name -> index entry
 */
async function getCompendiumIndex(packId) {
    if (indexCache.has(packId)) {
        return indexCache.get(packId);
    }

    const pack = game.packs.get(packId);
    if (!pack) {
        const emptyMap = new Map();
        indexCache.set(packId, emptyMap);
        return emptyMap;
    }

    const index = await pack.getIndex();
    const nameMap = new Map();

    for (const entry of index) {
        const lowerName = entry.name.toLowerCase();
        // Store first match only (avoid duplicates)
        if (!nameMap.has(lowerName)) {
            nameMap.set(lowerName, { ...entry, packId });
        }
    }

    indexCache.set(packId, nameMap);
    return nameMap;
}

/**
 * Clears the compendium index cache.
 * Call this if compendiums are modified.
 */
export function clearCompendiumCache() {
    indexCache.clear();
}

/**
 * Searches for an item in the dnd5e items compendium.
 *
 * @param {string} name - Item name to search for
 * @returns {Promise<Object|null>} Full item document or null if not found
 */
export async function findItem(name) {
    if (!name) {
        return null;
    }

    const lowerName = name.toLowerCase().trim();

    // Try dnd5e.items first (SRD items)
    const itemsIndex = await getCompendiumIndex('dnd5e.items');
    let entry = itemsIndex.get(lowerName);

    // Try dnd5e.equipment if not found
    if (!entry) {
        const equipIndex = await getCompendiumIndex('dnd5e.equipment');
        entry = equipIndex.get(lowerName);
    }

    if (!entry) {
        return null;
    }

    // Load full document
    const pack = game.packs.get(entry.packId);
    if (!pack) {
        return null;
    }

    return pack.getDocument(entry._id);
}

/**
 * Searches for a spell in the dnd5e spells compendium.
 *
 * @param {string} name - Spell name to search for
 * @returns {Promise<Object|null>} Full spell document or null if not found
 */
export async function findSpell(name) {
    if (!name) {
        return null;
    }

    const lowerName = name.toLowerCase().trim();

    // Try dnd5e.spells (SRD spells)
    const spellsIndex = await getCompendiumIndex('dnd5e.spells');
    const entry = spellsIndex.get(lowerName);

    if (!entry) {
        return null;
    }

    // Load full document
    const pack = game.packs.get(entry.packId);
    if (!pack) {
        return null;
    }

    return pack.getDocument(entry._id);
}

/**
 * Batch lookup for multiple spells.
 * More efficient than individual lookups.
 *
 * @param {string[]} names - Array of spell names
 * @returns {Promise<Map<string, Object>>} Map of lowercase name -> spell document
 */
export async function findSpells(names) {
    const results = new Map();

    if (!names || names.length === 0) {
        return results;
    }

    const spellsIndex = await getCompendiumIndex('dnd5e.spells');
    const pack = game.packs.get('dnd5e.spells');

    if (!pack) {
        return results;
    }

    // Collect all matching entries
    const toLoad = [];
    for (const name of names) {
        const lowerName = name.toLowerCase().trim();
        const entry = spellsIndex.get(lowerName);
        if (entry && !results.has(lowerName)) {
            toLoad.push({ name: lowerName, id: entry._id });
        }
    }

    // Batch load documents
    for (const { name, id } of toLoad) {
        try {
            const doc = await pack.getDocument(id);
            if (doc) {
                results.set(name, doc);
            }
        } catch (e) {
            console.warn(`Failed to load spell "${name}":`, e);
        }
    }

    return results;
}

/**
 * Batch lookup for multiple items.
 *
 * @param {string[]} names - Array of item names
 * @returns {Promise<Map<string, Object>>} Map of lowercase name -> item document
 */
export async function findItems(names) {
    const results = new Map();

    if (!names || names.length === 0) {
        return results;
    }

    const itemsIndex = await getCompendiumIndex('dnd5e.items');
    const equipIndex = await getCompendiumIndex('dnd5e.equipment');

    // Collect all matching entries
    const toLoad = [];
    for (const name of names) {
        const lowerName = name.toLowerCase().trim();
        let entry = itemsIndex.get(lowerName) || equipIndex.get(lowerName);
        if (entry && !results.has(lowerName)) {
            toLoad.push({ name: lowerName, entry });
        }
    }

    // Load documents
    for (const { name, entry } of toLoad) {
        try {
            const pack = game.packs.get(entry.packId);
            if (pack) {
                const doc = await pack.getDocument(entry._id);
                if (doc) {
                    results.set(name, doc);
                }
            }
        } catch (e) {
            console.warn(`Failed to load item "${name}":`, e);
        }
    }

    return results;
}
