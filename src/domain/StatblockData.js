/**
 * Intermediate representation for creature statblocks.
 * Matches the Fantasy Statblocks format used in Obsidian.
 */
export default class StatblockData {
    static DEFAULTS = {
        name: '',
        filePath: '',
        size: '',
        type: '',
        subtype: '',
        alignment: '',
        ac: null,
        hp: null,
        hitDice: '',
        speed: null,
        abilities: null,
        savingThrows: null,
        skills: null,
        damageVulnerabilities: null,
        damageResistances: null,
        damageImmunities: null,
        conditionImmunities: null,
        senses: null,
        languages: null,
        cr: null,
        traits: null,
        actions: null,
        bonusActions: null,
        reactions: null,
        legendaryActions: null,
        legendaryDescription: '',
        spells: null,
        _action: null,
        _existingActor: null
    };

    constructor(options = {}) {
        Object.assign(this, StatblockData.DEFAULTS, options);

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
