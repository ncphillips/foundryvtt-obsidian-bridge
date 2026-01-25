/**
 * Parses Fantasy Statblocks spells array to extract spellcasting data.
 *
 * Expected format:
 * spells:
 * - The creature is a 5th-level spellcaster. Its spellcasting ability is Wisdom (spell save DC 15, +7 to hit with spell attacks).
 * - At-Will: _bane_, _detect magic_, _mage hand_
 * - 3/day: _hellish rebuke_
 * - 2/day Each: _invisibility_, _cure wounds_
 * - 1/day Each: _conjure elemental_, _tree stride_
 */

/**
 * Parsed spellcasting information.
 * @typedef {Object} ParsedSpellcasting
 * @property {number|null} level - Spellcaster level
 * @property {string|null} ability - Spellcasting ability (e.g., 'wis', 'cha')
 * @property {number|null} saveDC - Spell save DC
 * @property {number|null} attackBonus - Spell attack bonus
 * @property {SpellEntry[]} spells - List of spells with usage info
 */

/**
 * Individual spell entry.
 * @typedef {Object} SpellEntry
 * @property {string} name - Spell name (lowercase, no formatting)
 * @property {string} usage - 'atwill', 'innate', or 'spell'
 * @property {number|null} uses - Number of uses per day (null for at-will)
 * @property {string|null} note - Additional note (e.g., "level 8 version")
 */

/**
 * Ability name to abbreviation mapping.
 */
const ABILITY_MAP = {
    strength: 'str',
    dexterity: 'dex',
    constitution: 'con',
    intelligence: 'int',
    wisdom: 'wis',
    charisma: 'cha'
};

/**
 * Parses the header line to extract spellcasting basics.
 * Example: "The creature is a 5th-level spellcaster. Its spellcasting ability is Wisdom (spell save DC 15, +7 to hit with spell attacks)."
 *
 * @param {string} line - Header line
 * @returns {Object} Partial ParsedSpellcasting
 */
function parseSpellcastingHeader(line) {
    const result = {
        level: null,
        ability: null,
        saveDC: null,
        attackBonus: null
    };

    // Extract level: "5th-level spellcaster" or "5th level spellcaster"
    const levelMatch = line.match(/(\d+)(?:st|nd|rd|th)[- ]level\s+spellcaster/i);
    if (levelMatch) {
        result.level = parseInt(levelMatch[1], 10);
    }

    // Extract ability: "spellcasting ability is Wisdom" or "using Wisdom as the spellcasting ability"
    let abilityMatch = line.match(/spellcasting ability is (\w+)/i);
    if (!abilityMatch) {
        abilityMatch = line.match(/using (\w+) as the spellcasting ability/i);
    }
    if (abilityMatch) {
        const abilityName = abilityMatch[1].toLowerCase();
        result.ability = ABILITY_MAP[abilityName] || abilityName.substring(0, 3);
    }

    // Extract save DC: "spell save DC 15" or "DC 15"
    const dcMatch = line.match(/(?:spell save )?DC (\d+)/i);
    if (dcMatch) {
        result.saveDC = parseInt(dcMatch[1], 10);
    }

    // Extract attack bonus: "+7 to hit"
    const attackMatch = line.match(/\+(\d+) to hit/i);
    if (attackMatch) {
        result.attackBonus = parseInt(attackMatch[1], 10);
    }

    return result;
}

/**
 * Parses a spell list line to extract spells and usage.
 * Examples:
 * - "At-Will: _bane_, _detect magic_, _mage hand_"
 * - "3/day: _hellish rebuke_"
 * - "2/day Each: _invisibility_, _cure wounds_"
 * - "1/day Each: _conjure elemental (level 8 version)_, _tree stride_"
 *
 * @param {string} line - Spell list line
 * @returns {SpellEntry[]} Array of spell entries
 */
function parseSpellListLine(line) {
    const spells = [];

    let usage = 'innate';
    let uses = null;

    // Match "At-Will:" or "at will:"
    if (/at[- ]?will/i.test(line)) {
        usage = 'atwill';
        uses = null;
    } else {
        // Match "3/day:" or "3/day each:"
        const usageMatch = line.match(/(\d+)\/day(?:\s+each)?/i);
        if (usageMatch) {
            uses = parseInt(usageMatch[1], 10);
        }
    }

    // Extract spell names - they're italicized with underscores: _spell name_
    const spellPattern = /_([^_]+)_/g;
    let match;

    while ((match = spellPattern.exec(line)) !== null) {
        let spellName = match[1].trim();
        let note = null;

        // Check for parenthetical notes like "(level 8 version)"
        const noteMatch = spellName.match(/\s*\(([^)]+)\)\s*$/);
        if (noteMatch) {
            note = noteMatch[1];
            spellName = spellName.replace(/\s*\([^)]+\)\s*$/, '').trim();
        }

        spells.push({
            name: spellName.toLowerCase(),
            usage,
            uses,
            note
        });
    }

    return spells;
}

/**
 * Normalizes a spells array entry to a string.
 * YAML parses "At-Will: spells" as {"At-Will": "spells"}.
 *
 * @param {string|Object} entry - Array entry (string or object)
 * @returns {string} Normalized string
 */
function normalizeSpellEntry(entry) {
    if (typeof entry === 'string') {
        return entry;
    }
    if (entry && typeof entry === 'object') {
        const keys = Object.keys(entry);
        if (keys.length === 1) {
            return `${keys[0]}: ${entry[keys[0]]}`;
        }
    }
    return '';
}

/**
 * Parses the Fantasy Statblocks spells array.
 *
 * @param {Array} spellsArray - Array of spell list entries (strings or objects)
 * @returns {ParsedSpellcasting} Parsed spellcasting data
 */
export function parseSpellcasting(spellsArray) {
    const result = {
        level: null,
        ability: null,
        saveDC: null,
        attackBonus: null,
        spells: []
    };

    if (!spellsArray || !Array.isArray(spellsArray) || spellsArray.length === 0) {
        return result;
    }

    for (const entry of spellsArray) {
        const line = normalizeSpellEntry(entry);
        if (!line) {
            continue;
        }

        if (/spellcast(?:er|ing ability)/i.test(line)) {
            const header = parseSpellcastingHeader(line);
            result.level = header.level ?? result.level;
            result.ability = header.ability ?? result.ability;
            result.saveDC = header.saveDC ?? result.saveDC;
            result.attackBonus = header.attackBonus ?? result.attackBonus;
        }

        if (/_[^_]+_/.test(line)) {
            const spells = parseSpellListLine(line);
            result.spells.push(...spells);
        }
    }

    return result;
}

/**
 * Extracts spellcasting info from a trait named "Spellcasting" or "Innate Spellcasting".
 * This handles the older format where spellcasting is in a trait.
 *
 * @param {Object} trait - Trait object with name and desc
 * @returns {ParsedSpellcasting|null} Parsed data or null if not spellcasting
 */
export function parseSpellcastingTrait(trait) {
    if (!trait?.name || !trait?.desc) {
        return null;
    }

    const name = trait.name.toLowerCase();
    if (!name.includes('spellcasting')) {
        return null;
    }

    const result = {
        level: null,
        ability: null,
        saveDC: null,
        attackBonus: null,
        spells: []
    };

    const desc = trait.desc;

    const header = parseSpellcastingHeader(desc);
    result.level = header.level;
    result.ability = header.ability;
    result.saveDC = header.saveDC;
    result.attackBonus = header.attackBonus;

    const sections = desc.split(/(?=[*_]*(?:At[- ]?Will|[\d]+\/Day)[*_]*:)/i);

    for (const section of sections) {
        if (/_[^_]+_/.test(section) || /\*\*[^*]+\*\*/.test(section)) {
            const spells = parseSpellListLine(section.replace(/\*\*/g, '_'));
            result.spells.push(...spells);
        }
    }

    return result;
}
