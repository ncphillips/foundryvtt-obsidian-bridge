/**
 * Maps StatblockData to dnd5e 5.1+ Actor and Item data structures.
 * Reference: dnd5e/module/data/actor/npc.mjs and related schemas.
 */

import { id as MODULE_ID } from '../../../../module.json';
import { parseAttackAction, parseSaveAction, parseRecharge, parseTargeting, parseDamageFromDescription, parseReactionTrigger, isMultiattack, extractWeaponName } from './actionParser.js';
import { parseSpellcasting, parseSpellcastingTrait } from './spellcastingParser.js';
import { extractGearFromTraits, normalizeItemName } from './gearParser.js';
import { findItems, findSpells } from './compendiumLookup.js';

const VALID_SIZES = new Set(['tiny', 'sm', 'med', 'lg', 'huge', 'grg']);

const CREATURE_TYPES = new Set([
    'aberration', 'beast', 'celestial', 'construct', 'dragon',
    'elemental', 'fey', 'fiend', 'giant', 'humanoid', 'monstrosity',
    'ooze', 'plant', 'undead'
]);

const DAMAGE_TYPES = new Set([
    'acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning',
    'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder'
]);

const CONDITIONS = new Set([
    'blinded', 'charmed', 'deafened', 'exhaustion', 'frightened',
    'grappled', 'incapacitated', 'invisible', 'paralyzed', 'petrified',
    'poisoned', 'prone', 'restrained', 'stunned', 'unconscious'
]);

const SENSES = new Set(['blindsight', 'darkvision', 'tremorsense', 'truesight']);

const SKILL_MAP = {
    acrobatics: 'acr',
    animalhandling: 'ani',
    'animal handling': 'ani',
    arcana: 'arc',
    athletics: 'ath',
    deception: 'dec',
    history: 'his',
    insight: 'ins',
    intimidation: 'itm',
    investigation: 'inv',
    medicine: 'med',
    nature: 'nat',
    perception: 'prc',
    performance: 'prf',
    persuasion: 'per',
    religion: 'rel',
    sleightofhand: 'slt',
    'sleight of hand': 'slt',
    stealth: 'ste',
    survival: 'sur'
};

const SKILL_ABILITIES = {
    acr: 'dex', ani: 'wis', arc: 'int', ath: 'str', dec: 'cha',
    his: 'int', ins: 'wis', itm: 'cha', inv: 'int', med: 'wis',
    nat: 'int', prc: 'wis', prf: 'cha', per: 'cha', rel: 'int',
    slt: 'dex', ste: 'dex', sur: 'wis'
};

const MOVEMENT_TYPES = new Set(['walk', 'burrow', 'climb', 'fly', 'swim']);

const KNOWN_LANGUAGES = new Set([
    'common', 'dwarvish', 'elvish', 'giant', 'gnomish', 'goblin',
    'halfling', 'orc', 'abyssal', 'celestial', 'draconic', 'deep',
    'infernal', 'primordial', 'sylvan', 'undercommon', 'druidic',
    'thieves', 'telepathy'
]);

const ACTIVATION_ICONS = {
    action: 'systems/dnd5e/icons/svg/activity/attack.svg',
    bonus: 'systems/dnd5e/icons/svg/activity/utility.svg',
    reaction: 'systems/dnd5e/icons/svg/activity/save.svg',
    legendary: 'systems/dnd5e/icons/svg/activity/damage.svg',
    trait: 'icons/svg/book.svg'
};

/**
 * Converts simple markdown formatting to HTML.
 *
 * @param {string} text - Markdown text
 * @returns {string} HTML text
 */
function markdownToHtml(text) {
    if (!text) {
        return '';
    }

    let html = text
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/__([^_]+)__/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/_([^_]+)_/g, '<em>$1</em>')
        .replace(/\n\n+/g, '</p><p>')
        .replace(/\n/g, '<br>');

    if (!html.startsWith('<p>')) {
        html = '<p>' + html + '</p>';
    }

    return html;
}

/**
 * Normalizes a string to a valid dnd5e key format.
 *
 * @param {string} str - String to normalize
 * @returns {string} Lowercase, trimmed string
 */
function normalizeKey(str) {
    if (!str) {
        return '';
    }
    return String(str).toLowerCase().trim();
}

/**
 * Maps a creature type string to dnd5e creature type object.
 *
 * @param {string} type - Creature type string
 * @param {string} subtype - Optional subtype
 * @returns {Object} dnd5e creature type object
 */
function mapCreatureType(type, subtype) {
    const normalized = normalizeKey(type);
    const typeValue = CREATURE_TYPES.has(normalized) ? normalized : 'custom';

    return {
        value: typeValue,
        subtype: subtype || '',
        swarm: '',
        custom: typeValue === 'custom' ? type : ''
    };
}

/**
 * Maps ability scores and saving throw proficiencies to dnd5e format.
 *
 * @param {Object} abilities - Ability scores {str: 10, dex: 15, ...}
 * @param {Object|null} savingThrows - Saving throw bonuses {str: 5, con: 7, ...}
 * @returns {Object} dnd5e abilities object
 */
function mapAbilities(abilities, savingThrows) {
    const result = {};
    const abilityKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

    for (const key of abilityKeys) {
        const score = abilities?.[key] ?? 10;
        const mod = Math.floor((score - 10) / 2);

        let proficient = 0;
        if (savingThrows && savingThrows[key] !== undefined) {
            const saveBonus = savingThrows[key];
            if (saveBonus > mod) {
                proficient = 1;
            }
        }

        result[key] = {
            value: score,
            proficient,
            bonuses: {
                check: '',
                save: ''
            }
        };
    }

    return result;
}

/**
 * Maps movement speeds to dnd5e movement object.
 *
 * @param {Object|null} speed - Speed object {walk: 30, fly: 60, ...}
 * @returns {Object} dnd5e movement object
 */
function mapMovement(speed) {
    const movement = {
        burrow: 0,
        climb: 0,
        fly: 0,
        swim: 0,
        walk: 0,
        units: 'ft',
        hover: false
    };

    if (!speed) {
        return movement;
    }

    for (const [key, value] of Object.entries(speed)) {
        const normalized = normalizeKey(key);
        if (MOVEMENT_TYPES.has(normalized) && typeof value === 'number') {
            movement[normalized] = value;
        }
        if (normalized === 'hover') {
            movement.hover = true;
        }
    }

    return movement;
}

/**
 * Maps senses to dnd5e senses object.
 *
 * @param {Object|null} senses - Senses object {darkvision: 60, passivePerception: 15, ...}
 * @returns {Object} dnd5e senses object
 */
function mapSenses(senses) {
    const result = {
        blindsight: 0,
        darkvision: 0,
        tremorsense: 0,
        truesight: 0,
        units: 'ft',
        special: ''
    };

    if (!senses) {
        return result;
    }

    for (const [key, value] of Object.entries(senses)) {
        const normalized = normalizeKey(key);
        if (SENSES.has(normalized) && typeof value === 'number') {
            result[normalized] = value;
        }
    }

    return result;
}

/**
 * Maps skills to dnd5e skill proficiency format.
 *
 * @param {Object|null} skills - Skills object {stealth: 6, perception: 4, ...}
 * @param {Object} abilities - Ability scores for calculating modifiers
 * @param {number} profBonus - Calculated proficiency bonus
 * @returns {Object} dnd5e skills object with proficiency values
 */
function mapSkills(skills, abilities, profBonus) {
    const result = {};

    if (!skills) {
        return result;
    }

    for (const [skillName, bonus] of Object.entries(skills)) {
        const normalized = normalizeKey(skillName).replace(/\s+/g, '');
        const skillKey = SKILL_MAP[normalized] || SKILL_MAP[skillName.toLowerCase()];

        if (!skillKey) {
            continue;
        }

        const abilityKey = SKILL_ABILITIES[skillKey];
        const abilityScore = abilities?.[abilityKey] ?? 10;
        const abilityMod = Math.floor((abilityScore - 10) / 2);
        const difference = bonus - abilityMod;
        let profValue = 0;

        if (profBonus > 0) {
            if (difference >= profBonus * 2) {
                profValue = 2;
            } else if (difference >= profBonus) {
                profValue = 1;
            } else if (difference > 0) {
                profValue = 0.5;
            }
        }

        result[skillKey] = {
            value: profValue
        };
    }

    return result;
}

/**
 * Maps a list of damage type strings to dnd5e damage type keys.
 *
 * @param {string[]|null} types - Array of damage type strings
 * @returns {string[]} Array of valid dnd5e damage type keys
 */
function mapDamageTypes(types) {
    if (!types || !Array.isArray(types)) {
        return [];
    }

    const result = [];
    for (const type of types) {
        const normalized = normalizeKey(type);
        if (DAMAGE_TYPES.has(normalized)) {
            result.push(normalized);
        }
    }
    return result;
}

/**
 * Maps a list of condition strings to dnd5e condition keys.
 *
 * @param {string[]|null} conditions - Array of condition strings
 * @returns {string[]} Array of valid dnd5e condition keys
 */
function mapConditions(conditions) {
    if (!conditions || !Array.isArray(conditions)) {
        return [];
    }

    const result = [];
    for (const condition of conditions) {
        const normalized = normalizeKey(condition);
        if (CONDITIONS.has(normalized)) {
            result.push(normalized);
        }
    }
    return result;
}

/**
 * Maps languages array, handling both standard and custom languages.
 *
 * @param {string[]|null} languages - Array of language strings
 * @returns {Object} Object with value Set and custom string
 */
function mapLanguages(languages) {
    if (!languages || !Array.isArray(languages)) {
        return {
            value: new Set(),
            custom: ''
        };
    }

    const value = new Set();
    const custom = [];

    for (const lang of languages) {
        const normalized = normalizeKey(lang);
        if (KNOWN_LANGUAGES.has(normalized)) {
            value.add(normalized);
        } else {
            custom.push(lang);
        }
    }

    return {
        value,
        custom: custom.join('; ')
    };
}

/**
 * Calculates proficiency bonus from CR using standard 5e formula.
 *
 * @param {number|null} cr - Challenge rating
 * @returns {number} Proficiency bonus
 */
function calculateProfBonus(cr) {
    if (cr === null || cr === undefined || cr < 1) {
        return 2;
    }
    return Math.floor((cr - 1) / 4) + 2;
}

/**
 * Extracts legendary resistance count from traits.
 *
 * @param {Array|null} traits - Array of trait objects with name and desc
 * @returns {number} Number of legendary resistances (0 if none found)
 */
function extractLegendaryResistances(traits) {
    if (!traits || !Array.isArray(traits)) {
        return 0;
    }

    for (const trait of traits) {
        if (!trait?.name) {
            continue;
        }
        const match = trait.name.match(/^Legendary Resistances?\s*\((\d+)\/Day\)/i);
        if (match) {
            return parseInt(match[1], 10);
        }
    }

    return 0;
}

/**
 * Maps a StatblockData object to dnd5e Actor.create() data.
 *
 * @param {StatblockData} statblock - Parsed statblock data
 * @returns {Object} Data object suitable for Actor.create()
 */
export function mapToDnd5eActor(statblock) {
    const profBonus = calculateProfBonus(statblock.cr);
    const abilities = mapAbilities(statblock.abilities, statblock.savingThrows);
    const size = VALID_SIZES.has(statblock.size) ? statblock.size : 'med';

    return {
        name: statblock.name || 'Unknown Creature',
        type: 'npc',
        img: 'icons/svg/mystery-man.svg',

        flags: {
            [MODULE_ID]: {
                sourceFile: statblock.filePath,
                importedAt: Date.now()
            }
        },

        system: {
            abilities,
            attributes: {
                ac: {
                    flat: statblock.ac ?? 10,
                    calc: 'flat'
                },
                hp: {
                    value: statblock.hp ?? 1,
                    max: statblock.hp ?? 1,
                    formula: statblock.hitDice || ''
                },
                movement: mapMovement(statblock.speed),
                senses: mapSenses(statblock.senses)
            },
            details: {
                type: mapCreatureType(statblock.type, statblock.subtype),
                alignment: statblock.alignment || '',
                cr: statblock.cr,
                biography: {
                    value: ''
                }
            },
            traits: {
                size,
                languages: mapLanguages(statblock.languages),
                di: {
                    value: new Set(mapDamageTypes(statblock.damageImmunities)),
                    custom: ''
                },
                dr: {
                    value: new Set(mapDamageTypes(statblock.damageResistances)),
                    custom: ''
                },
                dv: {
                    value: new Set(mapDamageTypes(statblock.damageVulnerabilities)),
                    custom: ''
                },
                ci: {
                    value: new Set(mapConditions(statblock.conditionImmunities)),
                    custom: ''
                }
            },
            resources: {
                legact: {
                    max: (statblock.legendaryActions?.length > 0) ? 3 : 0,
                    spent: 0
                },
                legres: {
                    max: extractLegendaryResistances(statblock.traits),
                    spent: 0
                }
            },
            skills: mapSkills(statblock.skills, statblock.abilities, profBonus)
        }
    };
}

/**
 * Creates a feat item for non-attack actions and traits.
 *
 * @param {Object} action - Action object with name and desc
 * @param {string|null} activationType - Activation type (null for traits)
 * @param {string} filePath - Source file path for tracking
 * @returns {Object} Feat item data
 */
function createFeatItem(action, activationType, filePath, attackData = null) {
    if (!action?.name) {
        return null;
    }

    const rechargeInfo = parseRecharge(action.name);
    const reactionInfo = activationType === 'reaction' ? parseReactionTrigger(action.desc) : null;
    const activationCondition = reactionInfo?.hasTrigger ? reactionInfo.trigger : '';

    const iconKey = activationType || 'trait';
    const item = {
        name: rechargeInfo.cleanName,
        type: 'feat',
        img: ACTIVATION_ICONS[iconKey] || 'icons/svg/mystery-man.svg',

        flags: {
            [MODULE_ID]: {
                fromStatblock: true,
                sourceFile: filePath
            }
        },

        system: {
            description: {
                value: markdownToHtml(action.desc)
            },
            type: {
                value: 'monster',
                subtype: ''
            },
            properties: new Set(activationType === null ? ['trait'] : []),
            activities: {}
        }
    };

    if (rechargeInfo.hasRecharge) {
        item.system.uses = {
            spent: 0,
            max: '1',
            recovery: [{
                period: 'recharge',
                type: 'recoverAll',
                formula: String(rechargeInfo.rechargeValue)
            }]
        };
    } else if (rechargeInfo.hasUses) {
        item.system.uses = {
            spent: 0,
            max: String(rechargeInfo.usesValue),
            recovery: [{
                period: rechargeInfo.usesPeriod,
                type: 'recoverAll'
            }]
        };
    }

    const activityId = typeof foundry !== 'undefined'
        ? foundry.utils.randomID()
        : Math.random().toString(36).substring(2, 18);

    if (attackData?.isAttack) {
        const attackType = attackData.isMelee ? 'melee' : 'ranged';
        const classification = attackData.isWeapon ? 'weapon' : 'spell';

        const damageParts = [];
        if (attackData.damageFormula && attackData.damageType) {
            const parsed = parseDamageFormula(attackData.damageFormula);
            damageParts.push({
                number: parsed.number,
                denomination: parsed.denomination,
                bonus: parsed.bonus,
                types: new Set([attackData.damageType]),
                custom: { enabled: false, formula: '' },
                scaling: { mode: '', number: 1, formula: '' }
            });
        }

        item.system.activities[activityId] = {
            _id: activityId,
            type: 'attack',
            name: '',
            activation: {
                type: activationType || 'action',
                condition: activationCondition
            },
            attack: {
                ability: '',
                bonus: String(attackData.attackBonus || 0),
                critical: { threshold: null },
                flat: true,
                type: {
                    value: attackType,
                    classification: classification
                }
            },
            damage: {
                critical: { bonus: '' },
                includeBase: false,
                parts: damageParts
            },
            range: {
                override: true,
                value: attackData.reach || attackData.range || 5,
                long: attackData.longRange || null,
                units: 'ft'
            }
        };
    } else if (activationType) {
        const saveData = parseSaveAction(action.desc);
        const targetData = parseTargeting(action.desc);
        const target = buildTargetData(targetData);
        const range = targetData.range ? {
            override: true,
            value: targetData.range,
            long: targetData.longRange || null,
            units: 'ft'
        } : undefined;

        if (saveData.isSave) {
            const activity = {
                _id: activityId,
                type: 'save',
                name: '',
                activation: {
                    type: activationType,
                    condition: activationCondition
                },
                save: {
                    ability: new Set([saveData.ability]),
                    dc: {
                        calculation: '',
                        formula: String(saveData.dc)
                    }
                },
                damage: {
                    onSave: 'none',
                    parts: []
                }
            };

            if (target) {
                activity.target = target;
            }
            if (range) {
                activity.range = range;
            }

            item.system.activities[activityId] = activity;
        } else {
            const activity = {
                _id: activityId,
                type: 'utility',
                name: '',
                activation: {
                    type: activationType,
                    condition: activationCondition
                }
            };

            if (target) {
                activity.target = target;
            }
            if (range) {
                activity.range = range;
            }

            item.system.activities[activityId] = activity;
        }
    } else {
        // Trait with no activation - check for damage
        const damageData = parseDamageFromDescription(action.desc);
        if (damageData.hasDamage) {
            const parsed = parseDamageFormula(damageData.formula);
            const damageParts = [{
                number: parsed.number,
                denomination: parsed.denomination,
                bonus: parsed.bonus,
                types: damageData.type ? new Set([damageData.type]) : new Set(),
                custom: { enabled: false, formula: '' },
                scaling: { mode: '', number: 1, formula: '' }
            }];

            item.system.activities[activityId] = {
                _id: activityId,
                type: 'damage',
                name: '',
                activation: {
                    type: '',
                    condition: activationCondition
                },
                damage: {
                    critical: { allow: false, bonus: '' },
                    parts: damageParts
                }
            };
        }
    }

    return item;
}

/**
 * Parses a damage formula like "3d8+4" into components.
 *
 * @param {string} formula - Damage formula
 * @returns {Object} Parsed components {number, denomination, bonus}
 */
function parseDamageFormula(formula) {
    const result = { number: 0, denomination: 0, bonus: '' };
    if (!formula) {
        return result;
    }

    const match = formula.match(/(\d+)d(\d+)(?:\s*([+-]\s*\d+))?/);
    if (match) {
        result.number = parseInt(match[1], 10);
        result.denomination = parseInt(match[2], 10);
        if (match[3]) {
            result.bonus = match[3].replace(/\s+/g, '');
        }
    }

    return result;
}

/**
 * Builds a dnd5e target object from parsed targeting data.
 *
 * @param {Object} targetData - Parsed targeting data from parseTargeting
 * @returns {Object|null} dnd5e target object or null if no targeting data
 */
function buildTargetData(targetData) {
    if (!targetData) {
        return null;
    }

    const hasArea = targetData.areaType && targetData.areaSize;
    const hasAffects = targetData.affectsType;

    if (!hasArea && !hasAffects) {
        return null;
    }

    const target = {
        override: true,
        prompt: true
    };

    if (hasArea) {
        target.template = {
            count: '',
            contiguous: false,
            type: targetData.areaType,
            size: String(targetData.areaSize),
            width: '',
            height: '',
            units: 'ft'
        };
    }

    if (hasAffects) {
        target.affects = {
            count: targetData.affectsCount ? String(targetData.affectsCount) : '',
            type: targetData.affectsType,
            choice: false,
            special: ''
        };
    }

    return target;
}


/**
 * Creates a spell item from a compendium spell, customized for this creature.
 *
 * @param {Object} compendiumSpell - Spell document from compendium
 * @param {Object} spellEntry - Parsed spell entry with usage info
 * @param {Object} spellcastingInfo - Parsed spellcasting data
 * @param {string} filePath - Source file path
 * @returns {Object} Spell item data
 */
function createSpellFromCompendium(compendiumSpell, spellEntry, spellcastingInfo, filePath) {
    const spellData = compendiumSpell.toObject();

    // Set our tracking flags
    spellData.flags = spellData.flags || {};
    spellData.flags[MODULE_ID] = {
        fromStatblock: true,
        sourceFile: filePath
    };

    // Set preparation method based on usage
    if (spellEntry.usage === 'atwill') {
        spellData.system.method = 'atwill';
        spellData.system.prepared = 1;
    } else if (spellEntry.uses) {
        spellData.system.method = 'innate';
        spellData.system.prepared = 1;
        // Set uses
        spellData.system.uses = {
            value: spellEntry.uses,
            max: spellEntry.uses,
            per: 'day',
            recovery: ''
        };
    }

    // Set spellcasting ability if known
    if (spellcastingInfo.ability) {
        spellData.system.ability = spellcastingInfo.ability;
    }

    return spellData;
}

/**
 * Creates a basic spell item when compendium lookup fails.
 *
 * @param {Object} spellEntry - Parsed spell entry
 * @param {Object} spellcastingInfo - Parsed spellcasting data
 * @param {string} filePath - Source file path
 * @returns {Object} Basic spell item data
 */
function createBasicSpell(spellEntry, spellcastingInfo, filePath) {
    const uses = spellEntry.uses
        ? { value: spellEntry.uses, max: spellEntry.uses, per: 'day', recovery: '' }
        : null;

    return {
        name: spellEntry.name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        type: 'spell',
        img: 'icons/svg/lightning.svg',

        flags: {
            [MODULE_ID]: {
                fromStatblock: true,
                sourceFile: filePath
            }
        },

        system: {
            description: {
                value: spellEntry.note ? `<p>${spellEntry.note}</p>` : ''
            },
            level: 0, // Unknown level
            school: 'evoc', // Default school
            ability: spellcastingInfo.ability || '',
            method: spellEntry.usage === 'atwill' ? 'atwill' : 'innate',
            prepared: 1,
            uses
        }
    };
}

/**
 * Creates an equipment item from a compendium item.
 *
 * @param {Object} compendiumItem - Item document from compendium
 * @param {number} quantity - Item quantity
 * @param {string} filePath - Source file path
 * @returns {Object} Equipment item data
 */
function createEquipmentFromCompendium(compendiumItem, quantity, filePath) {
    const itemData = compendiumItem.toObject();

    itemData.flags = itemData.flags || {};
    itemData.flags[MODULE_ID] = {
        fromStatblock: true,
        sourceFile: filePath
    };

    // Set quantity if applicable
    if (itemData.system.quantity !== undefined) {
        itemData.system.quantity = quantity;
    }

    // Equip the item
    if (itemData.system.equipped !== undefined) {
        itemData.system.equipped = true;
    }

    return itemData;
}

/**
 * Checks if a trait is the "Gear" trait.
 *
 * @param {Object} trait - Trait object
 * @returns {boolean} True if this is the gear trait
 */
function isGearTrait(trait) {
    if (!trait?.name) {
        return false;
    }
    const name = trait.name.toLowerCase();
    return name === 'gear' || name === 'equipment';
}

/**
 * Checks if a trait is a spellcasting trait.
 *
 * @param {Object} trait - Trait object
 * @returns {boolean} True if this is a spellcasting trait
 */
function isSpellcastingTrait(trait) {
    if (!trait?.name) {
        return false;
    }
    return trait.name.toLowerCase().includes('spellcasting');
}

function isLegendaryResistanceTrait(trait) {
    if (!trait?.name) {
        return false;
    }
    return /^Legendary Resistances?\s*\(\d+\/Day\)/i.test(trait.name);
}

/**
 * Creates embedded item data from all action blocks in the statblock.
 * This is the synchronous version that doesn't do compendium lookups.
 * Use createEmbeddedItemsAsync for full functionality.
 *
 * @param {StatblockData} statblock - Parsed statblock data
 * @returns {Object[]} Array of item data for createEmbeddedDocuments
 */
export function createEmbeddedItems(statblock) {
    const items = [];
    const filePath = statblock.filePath;

    for (const trait of statblock.traits || []) {
        if (isGearTrait(trait) || isSpellcastingTrait(trait) || isLegendaryResistanceTrait(trait)) {
            continue;
        }
        items.push(createFeatItem(trait, null, filePath));
    }

    for (const action of statblock.actions || []) {
        const attackData = parseAttackAction(action.desc);
        items.push(createFeatItem(action, 'action', filePath, attackData.isAttack ? attackData : null));
    }

    for (const action of statblock.bonusActions || []) {
        const attackData = parseAttackAction(action.desc);
        items.push(createFeatItem(action, 'bonus', filePath, attackData.isAttack ? attackData : null));
    }

    for (const action of statblock.reactions || []) {
        const attackData = parseAttackAction(action.desc);
        items.push(createFeatItem(action, 'reaction', filePath, attackData.isAttack ? attackData : null));
    }

    for (const action of statblock.legendaryActions || []) {
        const attackData = parseAttackAction(action.desc);
        items.push(createFeatItem(action, 'legendary', filePath, attackData.isAttack ? attackData : null));
    }

    return items.filter(item => item !== null);
}

/**
 * Creates embedded item data with compendium lookups for spells and equipment.
 * This is the async version that provides full functionality.
 *
 * @param {StatblockData} statblock - Parsed statblock data
 * @returns {Promise<Object[]>} Array of item data for createEmbeddedDocuments
 */
export async function createEmbeddedItemsAsync(statblock) {
    const items = [];
    const filePath = statblock.filePath;

    // Parse spellcasting from the spells array
    let spellcastingInfo = parseSpellcasting(statblock.spells);

    // Also check for spellcasting traits (fallback for older format)
    for (const trait of statblock.traits || []) {
        if (isSpellcastingTrait(trait)) {
            const traitSpellcasting = parseSpellcastingTrait(trait);
            if (traitSpellcasting) {
                // Merge info
                spellcastingInfo.level = spellcastingInfo.level ?? traitSpellcasting.level;
                spellcastingInfo.ability = spellcastingInfo.ability ?? traitSpellcasting.ability;
                spellcastingInfo.saveDC = spellcastingInfo.saveDC ?? traitSpellcasting.saveDC;
                spellcastingInfo.attackBonus = spellcastingInfo.attackBonus
                    ?? traitSpellcasting.attackBonus;
                spellcastingInfo.spells.push(...traitSpellcasting.spells);
            }
        }
    }

    // Parse gear from traits
    const gearItems = extractGearFromTraits(statblock.traits);

    // Collect all names for batch lookup
    const spellNames = spellcastingInfo.spells.map(s => s.name);
    const gearNames = gearItems.map(g => normalizeItemName(g.name));
    const actionWeaponNames = [];

    // Identify potential weapon actions for compendium lookup
    for (const action of statblock.actions || []) {
        const attackData = parseAttackAction(action.desc);
        if (attackData.isAttack && !isMultiattack(action)) {
            actionWeaponNames.push(extractWeaponName(action.name));
        }
    }

    // Batch lookup compendium items
    const [spellsMap, itemsMap] = await Promise.all([
        findSpells(spellNames),
        findItems([...gearNames, ...actionWeaponNames])
    ]);

    // Process traits (skip Gear and Spellcasting)
    for (const trait of statblock.traits || []) {
        if (isGearTrait(trait) || isSpellcastingTrait(trait) || isLegendaryResistanceTrait(trait)) {
            continue;
        }
        items.push(createFeatItem(trait, null, filePath));
    }

    // Process actions
    for (const action of statblock.actions || []) {
        const attackData = parseAttackAction(action.desc);
        if (attackData.isAttack && !isMultiattack(action)) {
            // Check if we found this weapon in compendium
            const weaponName = extractWeaponName(action.name).toLowerCase();
            const compendiumWeapon = itemsMap.get(weaponName);

            if (compendiumWeapon && compendiumWeapon.type === 'weapon') {
                items.push(createEquipmentFromCompendium(compendiumWeapon, 1, filePath));
            } else {
                items.push(createFeatItem(action, 'action', filePath, attackData));
            }
        } else {
            items.push(createFeatItem(action, 'action', filePath));
        }
    }

    // Process bonus actions
    for (const action of statblock.bonusActions || []) {
        const attackData = parseAttackAction(action.desc);
        items.push(createFeatItem(action, 'bonus', filePath, attackData.isAttack ? attackData : null));
    }

    // Process reactions
    for (const action of statblock.reactions || []) {
        const attackData = parseAttackAction(action.desc);
        items.push(createFeatItem(action, 'reaction', filePath, attackData.isAttack ? attackData : null));
    }

    // Process legendary actions
    for (const action of statblock.legendaryActions || []) {
        const attackData = parseAttackAction(action.desc);
        items.push(createFeatItem(action, 'legendary', filePath, attackData.isAttack ? attackData : null));
    }

    // Add spells
    for (const spellEntry of spellcastingInfo.spells) {
        const compendiumSpell = spellsMap.get(spellEntry.name);
        if (compendiumSpell) {
            items.push(createSpellFromCompendium(
                compendiumSpell, spellEntry, spellcastingInfo, filePath
            ));
        } else {
            items.push(createBasicSpell(spellEntry, spellcastingInfo, filePath));
        }
    }

    // Add gear
    for (const gear of gearItems) {
        const normalizedName = normalizeItemName(gear.name);
        const compendiumItem = itemsMap.get(normalizedName);
        if (compendiumItem) {
            items.push(createEquipmentFromCompendium(compendiumItem, gear.quantity, filePath));
        }
        // If not found in compendium, skip - we don't want to create generic loot
    }

    return items.filter(item => item !== null);
}
