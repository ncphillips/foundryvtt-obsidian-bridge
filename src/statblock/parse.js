import jsyaml from 'js-yaml';
import StatblockData from '../domain/StatblockData.js';

/**
 * Size string to dnd5e abbreviation mapping.
 * Fantasy Statblocks uses full words; Foundry uses abbreviations.
 */
const SIZE_MAP = {
    tiny: 'tiny',
    small: 'sm',
    medium: 'med',
    large: 'lg',
    huge: 'huge',
    gargantuan: 'grg'
};

/**
 * Normalizes size string to dnd5e abbreviation.
 *
 * @param {string} size - Size string like "Small" or "Medium"
 * @returns {string} Abbreviated size like "sm" or "med"
 */
function normalizeSize(size) {
    if (!size) {
        return '';
    }
    const lower = size.toLowerCase().trim();
    return SIZE_MAP[lower] || lower;
}

/**
 * Extracts numeric AC value from AC field.
 * AC can be a number (14) or string ("20 (plate armor, shield)").
 *
 * @param {number|string} ac - AC value from statblock
 * @returns {number|null} Numeric AC value
 */
function normalizeAC(ac) {
    if (ac === null || ac === undefined) {
        return null;
    }
    if (typeof ac === 'number') {
        return ac;
    }
    const match = String(ac).match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : null;
}

/**
 * Converts stats array to abilities object.
 * Input: [10, 15, 14, 8, 12, 10]
 * Output: {str: 10, dex: 15, con: 14, int: 8, wis: 12, cha: 10}
 *
 * @param {number[]} stats - Array of 6 ability scores in order
 * @returns {Object|null} Abilities object or null if invalid
 */
function normalizeStats(stats) {
    if (!Array.isArray(stats) || stats.length !== 6) {
        return null;
    }
    return {
        str: stats[0],
        dex: stats[1],
        con: stats[2],
        int: stats[3],
        wis: stats[4],
        cha: stats[5]
    };
}

/**
 * Converts saves array to saving throws object.
 * Input: [{Dex: +4}, {Con: +6}]
 * Output: {dex: 4, con: 6}
 *
 * @param {Object[]} saves - Array of save objects
 * @returns {Object|null} Saving throws object or null if invalid
 */
function normalizeSaves(saves) {
    if (!Array.isArray(saves)) {
        return null;
    }
    const result = {};
    for (const save of saves) {
        for (const [key, value] of Object.entries(save)) {
            const ability = key.toLowerCase();
            const bonus = typeof value === 'string'
                ? parseInt(value.replace(/^\+/, ''), 10)
                : value;
            result[ability] = bonus;
        }
    }
    return Object.keys(result).length > 0 ? result : null;
}

/**
 * Converts skillsaves array to skills object.
 * Input: [{Stealth: +6}, {Perception: +4}]
 * Output: {stealth: 6, perception: 4}
 *
 * @param {Object[]} skillsaves - Array of skill objects
 * @returns {Object|null} Skills object or null if invalid
 */
function normalizeSkillsaves(skillsaves) {
    if (!Array.isArray(skillsaves)) {
        return null;
    }
    const result = {};
    for (const skill of skillsaves) {
        for (const [key, value] of Object.entries(skill)) {
            const skillName = key.toLowerCase();
            const bonus = typeof value === 'string'
                ? parseInt(value.replace(/^\+/, ''), 10)
                : value;
            result[skillName] = bonus;
        }
    }
    return Object.keys(result).length > 0 ? result : null;
}

/**
 * Parses speed string into speed object.
 * Input: "30 ft., fly 60 ft., swim 30 ft."
 * Output: {walk: 30, fly: 60, swim: 30}
 *
 * @param {string} speedStr - Speed string from statblock
 * @returns {Object|null} Speed object or null if invalid
 */
function normalizeSpeed(speedStr) {
    if (!speedStr) {
        return null;
    }

    const result = {};
    const parts = String(speedStr).split(',').map(p => p.trim());

    for (const part of parts) {
        // Match patterns like "30 ft." (walk), "fly 60 ft.", "swim 30 ft."
        const match = part.match(/^(?:(\w+)\s+)?(\d+)\s*ft\.?/i);
        if (match) {
            const type = match[1] ? match[1].toLowerCase() : 'walk';
            const value = parseInt(match[2], 10);
            result[type] = value;
        }
    }

    return Object.keys(result).length > 0 ? result : null;
}

/**
 * Normalizes CR to a number.
 * Handles fractions like "1/4" -> 0.25, "1/8" -> 0.125
 *
 * @param {string|number} cr - Challenge rating
 * @returns {number|null} Numeric CR value
 */
function normalizeCR(cr) {
    if (cr === null || cr === undefined) {
        return null;
    }
    if (typeof cr === 'number') {
        return cr;
    }
    const crStr = String(cr).trim();

    const fractionMatch = crStr.match(/^(\d+)\/(\d+)$/);
    if (fractionMatch) {
        return parseInt(fractionMatch[1], 10) / parseInt(fractionMatch[2], 10);
    }

    const parsed = parseFloat(crStr);
    return isNaN(parsed) ? null : parsed;
}

/**
 * Splits comma-separated string into array.
 * Input: "Common, Goblin"
 * Output: ['Common', 'Goblin']
 *
 * @param {string} str - Comma-separated string
 * @returns {string[]|null} Array of trimmed strings or null if empty
 */
function normalizeCommaList(str) {
    if (!str) {
        return null;
    }
    const items = String(str).split(',').map(s => s.trim()).filter(s => s.length > 0);
    return items.length > 0 ? items : null;
}

/**
 * Parses senses string into senses object.
 * Input: "darkvision 60 ft., passive Perception 15"
 * Output: {darkvision: 60, passivePerception: 15}
 *
 * @param {string} sensesStr - Senses string from statblock
 * @returns {Object|null} Senses object or null if invalid
 */
function normalizeSenses(sensesStr) {
    if (!sensesStr) {
        return null;
    }

    const result = {};
    const parts = String(sensesStr).split(',').map(p => p.trim());

    for (const part of parts) {
        // Match "passive Perception 15"
        const passiveMatch = part.match(/passive\s+perception\s+(\d+)/i);
        if (passiveMatch) {
            result.passivePerception = parseInt(passiveMatch[1], 10);
            continue;
        }

        // Match sense types like "darkvision 60 ft.", "blindsight 10 ft."
        const senseMatch = part.match(/^(\w+)\s+(\d+)\s*ft\.?/i);
        if (senseMatch) {
            const senseType = senseMatch[1].toLowerCase();
            result[senseType] = parseInt(senseMatch[2], 10);
        }
    }

    return Object.keys(result).length > 0 ? result : null;
}

/**
 * Parses a Fantasy Statblock YAML string into a StatblockData object.
 *
 * @param {string} yaml - YAML content from statblock code block
 * @param {string} filePath - Source file path for error tracking
 * @returns {StatblockData} Parsed and normalized statblock data
 * @throws {Error} If YAML parsing fails
 */
export function parseStatblock(yaml, filePath = '') {
    const data = jsyaml.load(yaml);

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error(`Invalid statblock YAML in ${filePath}: expected object`);
    }

    return new StatblockData({
        name: data.name || '',
        filePath,
        size: normalizeSize(data.size),
        type: data.type || '',
        subtype: data.subtype || '',
        alignment: data.alignment || '',
        ac: normalizeAC(data.ac),
        hp: data.hp ?? null,
        hitDice: data.hit_dice || '',
        speed: normalizeSpeed(data.speed),
        abilities: normalizeStats(data.stats),
        savingThrows: normalizeSaves(data.saves),
        skills: normalizeSkillsaves(data.skillsaves),
        damageVulnerabilities: normalizeCommaList(data.damage_vulnerabilities),
        damageResistances: normalizeCommaList(data.damage_resistances),
        damageImmunities: normalizeCommaList(data.damage_immunities),
        conditionImmunities: normalizeCommaList(data.condition_immunities),
        senses: normalizeSenses(data.senses),
        languages: normalizeCommaList(data.languages),
        cr: normalizeCR(data.cr),
        traits: data.traits || null,
        actions: data.actions || null,
        bonusActions: data.bonus_actions || null,
        reactions: data.reactions || null,
        legendaryActions: data.legendary_actions || null,
        legendaryDescription: data.legendary_description || '',
        spells: data.spells || null
    });
}
