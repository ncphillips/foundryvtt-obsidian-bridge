/**
 * Parses gear traits to extract equipment items.
 *
 * Expected format in traits:
 * - name: Gear
 *   desc: Chain Shirt, Javelin (3), Morningstar
 */

/**
 * Parsed gear item.
 * @typedef {Object} ParsedGear
 * @property {string} name - Item name
 * @property {number} quantity - Item quantity (default 1)
 */

/**
 * Parses a gear description string into individual items.
 *
 * @param {string} desc - Gear description (e.g., "Chain Shirt, Javelin (3), Morningstar")
 * @returns {ParsedGear[]} Array of parsed gear items
 */
export function parseGearDescription(desc) {
    if (!desc || typeof desc !== 'string') {
        return [];
    }

    const items = [];
    const parts = desc.split(',').map(p => p.trim()).filter(p => p.length > 0);

    for (const part of parts) {
        const quantityMatch = part.match(/^(.+?)\s*\((\d+)\)$/);

        if (quantityMatch) {
            items.push({
                name: quantityMatch[1].trim(),
                quantity: parseInt(quantityMatch[2], 10)
            });
        } else {
            items.push({
                name: part.trim(),
                quantity: 1
            });
        }
    }

    return items;
}

/**
 * Extracts gear from a statblock's traits.
 * Looks for a trait named "Gear" or "Equipment".
 *
 * @param {Array} traits - Array of trait objects with name and desc
 * @returns {ParsedGear[]} Array of parsed gear items
 */
export function extractGearFromTraits(traits) {
    if (!traits || !Array.isArray(traits)) {
        return [];
    }

    for (const trait of traits) {
        if (!trait?.name) {
            continue;
        }

        const name = trait.name.toLowerCase();
        if (name === 'gear' || name === 'equipment') {
            return parseGearDescription(trait.desc);
        }
    }

    return [];
}

/**
 * Normalizes an item name for compendium lookup.
 * Handles common variations and formatting.
 *
 * @param {string} name - Item name from statblock
 * @returns {string} Normalized name for lookup
 */
export function normalizeItemName(name) {
    if (!name) {
        return '';
    }

    return name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ');
}
