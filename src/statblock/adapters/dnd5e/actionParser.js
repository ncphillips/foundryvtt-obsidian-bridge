/**
 * Parses action descriptions to extract attack data.
 */

/**
 * @typedef {Object} ParsedAttack
 * @property {boolean} isAttack
 * @property {string} attackType - 'mwak', 'rwak', 'msak', 'rsak', or null
 * @property {boolean} isMelee
 * @property {boolean} isRanged
 * @property {boolean} isWeapon
 * @property {number|null} attackBonus
 * @property {number|null} reach
 * @property {number|null} range
 * @property {number|null} longRange
 * @property {string|null} damageFormula
 * @property {string|null} damageType
 * @property {string} description
 */

const ATTACK_TYPE_PATTERN = /_(Melee|Ranged|Melee or Ranged)\s*(Weapon\s*)?Attack(?:\s*Roll)?:?_\s*\+?(\d+)/i;
const REACH_PATTERN = /reach\s+(\d+)\s*ft/i;
const RANGE_PATTERN = /range\s+(\d+)(?:\/(\d+))?\s*(?:ft)?/i;
const HIT_PATTERN = /_Hit:?_\s*(?:\d+\s*)?(?:\()?(\d+d\d+(?:\s*[+-]\s*\d+)?)\)?(?:\s+(\w+))?\s*damage/i;
const DAMAGE_TYPE_PATTERN = /(\d+d\d+(?:\s*[+-]\s*\d+)?)\)?\s+(\w+)\s+damage/i;

const DAMAGE_TYPES = new Set([
    'acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning',
    'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder'
]);

/**
 * @param {string} desc
 * @returns {ParsedAttack}
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

    const attackMatch = desc.match(ATTACK_TYPE_PATTERN);
    if (!attackMatch) {
        return result;
    }

    result.isAttack = true;
    const attackTypeStr = attackMatch[1].toLowerCase();
    const isWeaponStr = attackMatch[2];
    result.attackBonus = parseInt(attackMatch[3], 10);

    if (attackTypeStr.includes('melee')) {
        result.isMelee = true;
    }
    if (attackTypeStr.includes('ranged')) {
        result.isRanged = true;
    }

    result.isWeapon = !!isWeaponStr || attackTypeStr.includes('weapon');

    if (result.isMelee && result.isRanged) {
        result.attackType = result.isWeapon ? 'mwak' : 'msak';
    } else if (result.isMelee) {
        result.attackType = result.isWeapon ? 'mwak' : 'msak';
    } else if (result.isRanged) {
        result.attackType = result.isWeapon ? 'rwak' : 'rsak';
    }

    const reachMatch = desc.match(REACH_PATTERN);
    if (reachMatch) {
        result.reach = parseInt(reachMatch[1], 10);
    }

    const rangeMatch = desc.match(RANGE_PATTERN);
    if (rangeMatch) {
        result.range = parseInt(rangeMatch[1], 10);
        if (rangeMatch[2]) {
            result.longRange = parseInt(rangeMatch[2], 10);
        }
    }

    const damageMatch = desc.match(DAMAGE_TYPE_PATTERN) || desc.match(HIT_PATTERN);
    if (damageMatch) {
        result.damageFormula = damageMatch[1].replace(/\s+/g, '');
        const potentialType = damageMatch[2]?.toLowerCase();
        if (potentialType && DAMAGE_TYPES.has(potentialType)) {
            result.damageType = potentialType;
        }
    }

    return result;
}

export function isMultiattack(action) {
    if (!action?.name) {
        return false;
    }
    return action.name.toLowerCase().includes('multiattack');
}

export function extractWeaponName(name) {
    if (!name) {
        return '';
    }
    return name
        .replace(/\s*\(.*\)$/, '')
        .trim();
}

const ABILITY_MAP = {
    strength: 'str',
    dexterity: 'dex',
    constitution: 'con',
    intelligence: 'int',
    wisdom: 'wis',
    charisma: 'cha'
};

const SAVE_PATTERNS = [
    /_(\w+)\s+Saving\s+Throw:?_\s*DC\s*(\d+)/i,
    /DC\s*(\d+)\s+(\w+)\s+saving\s+throw/i,
    /(\w+)\s+sav(?:ing\s+throw|e)\s*\(DC\s*(\d+)\)/i,
    /DC\s*(\d+)\s+(\w+)\s+sav(?:ing\s+throw|e)/i
];

/**
 * @typedef {Object} ParsedSave
 * @property {boolean} isSave
 * @property {string|null} ability
 * @property {number|null} dc
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

    const rechargeMatch = name.match(/\s*\(Recharge\s+(\d)(?:-6)?\)\s*$/i);
    if (rechargeMatch) {
        result.hasRecharge = true;
        result.rechargeValue = parseInt(rechargeMatch[1], 10);
        result.cleanName = name.replace(/\s*\(Recharge\s+\d(?:-6)?\)\s*$/i, '').trim();
        return result;
    }

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

export function parseDamageFromDescription(desc) {
    const result = {
        hasDamage: false,
        formula: null,
        type: null
    };

    if (!desc) {
        return result;
    }

    const parenPattern = /(\d+)\s*\((\d+d\d+(?:\s*[+-]\s*\d+)?)\)\s*(\w+)?\s*damage/i;
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
 * @typedef {Object} ParsedReaction
 * @property {boolean} hasTrigger
 * @property {string|null} trigger
 * @property {string|null} response
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
 * @typedef {Object} ParsedTarget
 * @property {string|null} areaType
 * @property {number|null} areaSize
 * @property {number|null} range
 * @property {number|null} longRange
 * @property {string|null} affectsType
 * @property {number|null} affectsCount
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
