/**
 * Intermediate representation for creature statblocks.
 * Matches the Fantasy Statblocks format used in Obsidian.
 * Object is sealed after construction to prevent accidental property additions.
 *
 * Properties mutated during import:
 * - _action: Set during conflict resolution ('create', 'update', 'skip')
 * - _existingActor: Set when an existing actor is found for update
 */
export default class StatblockData {
    static DEFAULTS = {
        // Identity
        name: '',
        filePath: '',

        // Core stats
        size: '',           // tiny, sm, med, lg, huge, grg
        type: '',           // creature type
        subtype: '',
        alignment: '',

        // Combat
        ac: null,           // number or {value, type}
        hp: null,           // number
        hitDice: '',        // e.g., "12d10+60"
        speed: null,        // {walk: 30, fly: 60, ...}

        // Abilities
        abilities: null,    // {str: 10, dex: 10, ...} - defaults applied in constructor
        savingThrows: null, // {str: 5, dex: 3, ...}
        skills: null,       // {perception: 5, stealth: 3, ...}

        // Traits
        damageVulnerabilities: null,
        damageResistances: null,
        damageImmunities: null,
        conditionImmunities: null,
        senses: null,       // {darkvision: 60, passivePerception: 15}
        languages: null,

        // Challenge
        cr: null,           // number or fraction string

        // Features and Actions
        traits: null,       // [{name, desc}, ...]
        actions: null,
        bonusActions: null,
        reactions: null,
        legendaryActions: null,
        legendaryDescription: '',

        // Spellcasting (Fantasy Statblocks spells array)
        spells: null,       // Array of spell list strings

        // Internal (set during import)
        _action: null,      // 'create', 'update', 'skip'
        _existingActor: null
    };

    constructor(options = {}) {
        Object.assign(this, StatblockData.DEFAULTS, options);

        // Apply mutable defaults for fields that weren't provided
        this.speed = this.speed ?? {};
        this.abilities = this.abilities ?? { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
        this.savingThrows = this.savingThrows ?? {};
        this.skills = this.skills ?? {};
        this.damageVulnerabilities = this.damageVulnerabilities ?? [];
        this.damageResistances = this.damageResistances ?? [];
        this.damageImmunities = this.damageImmunities ?? [];
        this.conditionImmunities = this.conditionImmunities ?? [];
        this.senses = this.senses ?? {};
        this.languages = this.languages ?? [];
        this.traits = this.traits ?? [];
        this.actions = this.actions ?? [];
        this.bonusActions = this.bonusActions ?? [];
        this.reactions = this.reactions ?? [];
        this.legendaryActions = this.legendaryActions ?? [];
        this.spells = this.spells ?? [];

        Object.seal(this);
    }
}
