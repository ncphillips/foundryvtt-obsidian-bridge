/**
 * Parses action descriptions to extract attack data.
 * Handles Fantasy Statblocks action format.
 */

/**
 * Attack data extracted from an action description.
 * @typedef {Object} ParsedAttack
 * @property {boolean} isAttack - Whether this is an attack action
 * @property {string} attackType - 'mwak', 'rwak', 'msak', 'rsak', or null
 * @property {boolean} isMelee - Has melee capability
 * @property {boolean} isRanged - Has ranged capability
 * @property {boolean} isWeapon - Is a weapon attack (vs spell attack)
 * @property {number|null} attackBonus - Attack bonus (e.g., +5 -> 5)
 * @property {number|null} reach - Reach in feet for melee
 * @property {number|null} range - Short range for ranged
 * @property {number|null} longRange - Long range for ranged
 * @property {string|null} damageFormula - Damage dice (e.g., "2d6 + 3")
 * @property {string|null} damageType - Damage type (e.g., "slashing")
 * @property {string} description - Original full description
 */

/**
 * Regex patterns for parsing attack descriptions.
 */
const ATTACK_TYPE_PATTERN = /_(Melee|Ranged|Melee or Ranged)\s*(Weapon\s*)?Attack(?:\s*Roll)?:?_\s*\+?(\d+)/i;
const REACH_PATTERN = /reach\s+(\d+)\s*ft/i;
const RANGE_PATTERN = /range\s+(\d+)(?:\/(\d+))?\s*(?:ft)?/i;
const HIT_PATTERN = /_Hit:?_\s*(?:\d+\s*)?(?:\()?(\d+d\d+(?:\s*[+-]\s*\d+)?)\)?(?:\s+(\w+))?\s*damage/i;
const DAMAGE_TYPE_PATTERN = /(\d+d\d+(?:\s*[+-]\s*\d+)?)\)?\s+(\w+)\s+damage/i;

/**
 * Valid damage types in 5e.
 */
const DAMAGE_TYPES = new Set([
    'acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning',
    'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder'
]);

/**
 * Parses an action description to extract attack data.
 *
 * @param {string} desc - The action description
 * @returns {ParsedAttack} Parsed attack data
 */
export function parseAttackAction(desc) {
    const result = {
        isAttack: false,
        attackType: null,
        isMelee: false,
        isRanged: false,
        isWeapon: false,
        attackBonus: null,
        reach: null,
        range: null,
        longRange: null,
        damageFormula: null,
        damageType: null,
        description: desc || ''
    };

    if (!desc) {
        return result;
    }

    // Check for attack pattern
    const attackMatch = desc.match(ATTACK_TYPE_PATTERN);
    if (!attackMatch) {
        return result;
    }

    result.isAttack = true;
    const attackTypeStr = attackMatch[1].toLowerCase();
    const isWeaponStr = attackMatch[2];
    result.attackBonus = parseInt(attackMatch[3], 10);

    // Determine melee/ranged
    if (attackTypeStr.includes('melee')) {
        result.isMelee = true;
    }
    if (attackTypeStr.includes('ranged')) {
        result.isRanged = true;
    }

    // Determine weapon vs spell
    result.isWeapon = !!isWeaponStr || attackTypeStr.includes('weapon');

    // Set attack type code
    if (result.isMelee && result.isRanged) {
        // Versatile - defaults to melee weapon
        result.attackType = result.isWeapon ? 'mwak' : 'msak';
    } else if (result.isMelee) {
        result.attackType = result.isWeapon ? 'mwak' : 'msak';
    } else if (result.isRanged) {
        result.attackType = result.isWeapon ? 'rwak' : 'rsak';
    }

    // Extract reach
    const reachMatch = desc.match(REACH_PATTERN);
    if (reachMatch) {
        result.reach = parseInt(reachMatch[1], 10);
    }

    // Extract range
    const rangeMatch = desc.match(RANGE_PATTERN);
    if (rangeMatch) {
        result.range = parseInt(rangeMatch[1], 10);
        if (rangeMatch[2]) {
            result.longRange = parseInt(rangeMatch[2], 10);
        }
    }

    // Extract damage
    const damageMatch = desc.match(DAMAGE_TYPE_PATTERN);
    if (damageMatch) {
        result.damageFormula = damageMatch[1].replace(/\s+/g, '');
        const potentialType = damageMatch[2].toLowerCase();
        if (DAMAGE_TYPES.has(potentialType)) {
            result.damageType = potentialType;
        }
    } else {
        // Try simpler pattern
        const hitMatch = desc.match(HIT_PATTERN);
        if (hitMatch) {
            result.damageFormula = hitMatch[1].replace(/\s+/g, '');
            if (hitMatch[2]) {
                const potentialType = hitMatch[2].toLowerCase();
                if (DAMAGE_TYPES.has(potentialType)) {
                    result.damageType = potentialType;
                }
            }
        }
    }

    return result;
}

/**
 * Determines if an action is a multiattack action.
 *
 * @param {Object} action - Action object with name and desc
 * @returns {boolean} True if this is a multiattack
 */
export function isMultiattack(action) {
    if (!action?.name) {
        return false;
    }
    return action.name.toLowerCase().includes('multiattack');
}

/**
 * Extracts the weapon name from an action, if it appears to be a weapon.
 * This is used for compendium lookups.
 *
 * @param {string} name - Action name (e.g., "Longsword", "Javelin")
 * @returns {string} Normalized weapon name for lookup
 */
export function extractWeaponName(name) {
    if (!name) {
        return '';
    }
    // Remove common suffixes/prefixes that aren't part of weapon names
    return name
        .replace(/\s*\(.*\)$/, '') // Remove parenthetical notes
        .trim();
}

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
 * Saving throw patterns.
 */
const SAVE_PATTERNS = [
    // "_Dexterity Saving Throw:_ DC 16" - Fantasy Statblocks format
    /_(\w+)\s+Saving\s+Throw:?_\s*DC\s*(\d+)/i,
    // "DC 16 Dexterity saving throw"
    /DC\s*(\d+)\s+(\w+)\s+saving\s+throw/i,
    // "Dexterity saving throw (DC 16)" or "Dexterity save (DC 16)"
    /(\w+)\s+sav(?:ing\s+throw|e)\s*\(DC\s*(\d+)\)/i,
    // "must succeed on a DC 16 Dexterity saving throw"
    /DC\s*(\d+)\s+(\w+)\s+sav(?:ing\s+throw|e)/i
];

/**
 * Parsed save data from an action description.
 * @typedef {Object} ParsedSave
 * @property {boolean} isSave - Whether this action requires a saving throw
 * @property {string|null} ability - Save ability abbreviation (str, dex, etc.)
 * @property {number|null} dc - Save DC
 */

/**
 * Parses an action description to extract saving throw data.
 *
 * @param {string} desc - The action description
 * @returns {ParsedSave} Parsed save data
 */
/**
 * Parses recharge and limited use info from an action name.
 *
 * @param {string} name - Action name (e.g., "Breath Weapon (Recharge 5-6)" or "Protective Magic (3/Day)")
 * @returns {{hasRecharge: boolean, rechargeValue: number|null, hasUses: boolean, usesValue: number|null, usesPeriod: string|null, cleanName: string}}
 */
export function parseRecharge(name) {
    const result = {
        hasRecharge: false,
        rechargeValue: null,
        hasUses: false,
        usesValue: null,
        usesPeriod: null,
        cleanName: name || ''
    };

    if (!name) {
        return result;
    }

    // Match "Recharge 5-6" or "Recharge 6"
    const rechargeMatch = name.match(/\s*\(Recharge\s+(\d)(?:-6)?\)\s*$/i);
    if (rechargeMatch) {
        result.hasRecharge = true;
        result.rechargeValue = parseInt(rechargeMatch[1], 10);
        result.cleanName = name.replace(/\s*\(Recharge\s+\d(?:-6)?\)\s*$/i, '').trim();
        return result;
    }

    // Match "3/Day", "1/Day", "3/day each", "1/Short Rest", "1/Long Rest"
    const usesMatch = name.match(/\s*\((\d+)\/(Day|Short Rest|Long Rest)(?:\s+Each)?\)\s*$/i);
    if (usesMatch) {
        result.hasUses = true;
        result.usesValue = parseInt(usesMatch[1], 10);
        const period = usesMatch[2].toLowerCase();
        if (period === 'day') {
            result.usesPeriod = 'day';
        } else if (period === 'short rest') {
            result.usesPeriod = 'sr';
        } else if (period === 'long rest') {
            result.usesPeriod = 'lr';
        }
        result.cleanName = name.replace(/\s*\(\d+\/(?:Day|Short Rest|Long Rest)(?:\s+Each)?\)\s*$/i, '').trim();
    }

    return result;
}

export function parseSaveAction(desc) {
    const result = {
        isSave: false,
        ability: null,
        dc: null
    };

    if (!desc) {
        return result;
    }

    for (const pattern of SAVE_PATTERNS) {
        const match = desc.match(pattern);
        if (match) {
            result.isSave = true;

            // Pattern order varies - some have DC first, some have ability first
            if (/^\d+$/.test(match[1])) {
                result.dc = parseInt(match[1], 10);
                const abilityName = match[2].toLowerCase();
                result.ability = ABILITY_MAP[abilityName] || abilityName.substring(0, 3);
            } else {
                const abilityName = match[1].toLowerCase();
                result.ability = ABILITY_MAP[abilityName] || abilityName.substring(0, 3);
                result.dc = parseInt(match[2], 10);
            }
            break;
        }
    }

    return result;
}

/**
 * Parses damage from a description that isn't an attack.
 * Matches patterns like "2 (1d4) damage" or "1d6 fire damage".
 *
 * @param {string} desc - The description text
 * @returns {{hasDamage: boolean, formula: string|null, type: string|null}}
 */
export function parseDamageFromDescription(desc) {
    const result = {
        hasDamage: false,
        formula: null,
        type: null
    };

    if (!desc) {
        return result;
    }

    // Pattern: "2 (1d4) damage" or "2 (1d4) fire damage"
    const parenPattern = /(\d+)\s*\((\d+d\d+(?:\s*[+-]\s*\d+)?)\)\s*(\w+)?\s*damage/i;
    // Pattern: "1d6 damage" or "1d6 fire damage"
    const simplePattern = /(\d+d\d+(?:\s*[+-]\s*\d+)?)\s+(\w+)?\s*damage/i;

    let match = desc.match(parenPattern);
    if (match) {
        result.hasDamage = true;
        result.formula = match[2].replace(/\s+/g, '');
        if (match[3] && DAMAGE_TYPES.has(match[3].toLowerCase())) {
            result.type = match[3].toLowerCase();
        }
        return result;
    }

    match = desc.match(simplePattern);
    if (match) {
        result.hasDamage = true;
        result.formula = match[1].replace(/\s+/g, '');
        if (match[2] && DAMAGE_TYPES.has(match[2].toLowerCase())) {
            result.type = match[2].toLowerCase();
        }
    }

    return result;
}

/**
 * Parsed reaction trigger/response data.
 * @typedef {Object} ParsedReaction
 * @property {boolean} hasTrigger - Whether this has a trigger/response format
 * @property {string|null} trigger - The trigger text (activation condition)
 * @property {string|null} response - The response text (description body)
 */

/**
 * Parses a reaction description to extract trigger and response.
 *
 * @param {string} desc - The reaction description
 * @returns {ParsedReaction} Parsed reaction data
 */
export function parseReactionTrigger(desc) {
    const result = {
        hasTrigger: false,
        trigger: null,
        response: null
    };

    if (!desc) {
        return result;
    }

    const pattern = /_Trigger:_\s*(.+?)\s*_Response:_\s*(.+)$/is;
    const match = desc.match(pattern);

    if (match) {
        result.hasTrigger = true;
        result.trigger = match[1].trim();
        result.response = match[2].trim();
    }

    return result;
}

/**
 * Area type mappings from common terms to dnd5e keys.
 */
const AREA_TYPE_MAP = {
    emanation: 'radius',
    sphere: 'sphere',
    cone: 'cone',
    cube: 'cube',
    cylinder: 'cylinder',
    line: 'line',
    square: 'square',
    circle: 'circle',
    wall: 'wall'
};

/**
 * Parsed targeting data from an action description.
 * @typedef {Object} ParsedTarget
 * @property {string|null} areaType - Area template type (radius, sphere, cone, etc.)
 * @property {number|null} areaSize - Size of the area in feet
 * @property {number|null} range - Range in feet
 * @property {number|null} longRange - Long range in feet (for ranged abilities)
 * @property {string|null} affectsType - Type of targets (creature, ally, enemy, willing)
 * @property {number|null} affectsCount - Number of targets (null for area effects)
 */

/**
 * Parses an action description to extract targeting data.
 *
 * @param {string} desc - The action description
 * @returns {ParsedTarget} Parsed targeting data
 */
export function parseTargeting(desc) {
    const result = {
        areaType: null,
        areaSize: null,
        range: null,
        longRange: null,
        affectsType: null,
        affectsCount: null
    };

    if (!desc) {
        return result;
    }

    const areaPatterns = [
        /(\d+)[- ]foot[- ]?(emanation|sphere|cone|cube|cylinder|line|square|circle|wall)/i,
        /(\d+)[- ]foot[- ]?radius\s+(sphere|cylinder|circle)/i,
        /(emanation|sphere|cone|cube|cylinder|line)\s+of\s+(\d+)\s*(?:feet|ft)/i
    ];

    for (const pattern of areaPatterns) {
        const match = desc.match(pattern);
        if (match) {
            if (/^\d+$/.test(match[1])) {
                result.areaSize = parseInt(match[1], 10);
                const areaKey = match[2].toLowerCase();
                result.areaType = AREA_TYPE_MAP[areaKey] || areaKey;
            } else {
                const areaKey = match[1].toLowerCase();
                result.areaType = AREA_TYPE_MAP[areaKey] || areaKey;
                result.areaSize = parseInt(match[2], 10);
            }
            break;
        }
    }

    const rangePatterns = [
        /within\s+(\d+)\s*(?:feet|ft)/i,
        /between\s+(\d+)\s+and\s+(\d+)\s*(?:feet|ft)/i,
        /up\s+to\s+(\d+)\s*(?:feet|ft)/i,
        /can\s+see\s+within\s+(\d+)\s*(?:feet|ft)/i
    ];

    for (const pattern of rangePatterns) {
        const match = desc.match(pattern);
        if (match) {
            result.range = parseInt(match[1], 10);
            if (match[2]) {
                result.longRange = parseInt(match[2], 10);
            }
            break;
        }
    }

    // Order matters - check specific patterns before general ones
    if (/\ball\s+hostile\s+creatures?\b/i.test(desc)) {
        result.affectsType = 'enemy';
        result.affectsCount = null;
    } else if (/\ball\s+creatures?\b/i.test(desc)) {
        result.affectsType = 'creature';
        result.affectsCount = null;
    } else if (/\beach\s+creature\b/i.test(desc)) {
        result.affectsType = 'creature';
        result.affectsCount = null;
    } else if (/\ballied\s+creature\b/i.test(desc) || /\ban?\s+ally\b/i.test(desc)) {
        result.affectsType = 'ally';
        result.affectsCount = 1;
    } else if (/\b(?:one|a|an)\s+(?:\w+\s+)*?(?:creature|target)\b/i.test(desc)) {
        result.affectsType = 'creature';
        result.affectsCount = 1;
    }

    return result;
}
