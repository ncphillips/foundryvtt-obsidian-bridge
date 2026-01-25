import { mapToDnd5eActor, createEmbeddedItems } from './mapper';
import StatblockData from '../../../domain/StatblockData';

describe('mapToDnd5eActor', () => {
    describe('name and type', () => {
        it('should set name correctly', () => {
            const statblock = new StatblockData({ name: 'Goblin Boss' });
            const result = mapToDnd5eActor(statblock);

            expect(result.name).toBe('Goblin Boss');
        });

        it('should default name to Unknown Creature when missing', () => {
            const statblock = new StatblockData({});
            const result = mapToDnd5eActor(statblock);

            expect(result.name).toBe('Unknown Creature');
        });

        it('should set type to npc', () => {
            const statblock = new StatblockData({ name: 'Test' });
            const result = mapToDnd5eActor(statblock);

            expect(result.type).toBe('npc');
        });
    });

    describe('flags', () => {
        it('should set sourceFile flag', () => {
            const statblock = new StatblockData({
                name: 'Test',
                filePath: '/vault/monsters/goblin.md'
            });
            const result = mapToDnd5eActor(statblock);

            expect(result.flags['obsidian-bridge'].sourceFile).toBe('/vault/monsters/goblin.md');
        });

        it('should set importedAt flag', () => {
            const before = Date.now();
            const statblock = new StatblockData({ name: 'Test' });
            const result = mapToDnd5eActor(statblock);
            const after = Date.now();

            expect(result.flags['obsidian-bridge'].importedAt).toBeGreaterThanOrEqual(before);
            expect(result.flags['obsidian-bridge'].importedAt).toBeLessThanOrEqual(after);
        });
    });

    describe('abilities', () => {
        it('should map abilities from StatblockData', () => {
            const statblock = new StatblockData({
                name: 'Test',
                abilities: { str: 18, dex: 14, con: 16, int: 10, wis: 12, cha: 8 }
            });
            const result = mapToDnd5eActor(statblock);

            expect(result.system.abilities.str.value).toBe(18);
            expect(result.system.abilities.dex.value).toBe(14);
            expect(result.system.abilities.con.value).toBe(16);
            expect(result.system.abilities.int.value).toBe(10);
            expect(result.system.abilities.wis.value).toBe(12);
            expect(result.system.abilities.cha.value).toBe(8);
        });

        it('should default abilities to 10 when not provided', () => {
            const statblock = new StatblockData({ name: 'Test' });
            const result = mapToDnd5eActor(statblock);

            for (const ability of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
                expect(result.system.abilities[ability].value).toBe(10);
            }
        });

        it('should set saving throw proficiency based on bonus', () => {
            const statblock = new StatblockData({
                name: 'Test',
                abilities: { str: 10, dex: 14, con: 10, int: 10, wis: 10, cha: 10 },
                savingThrows: { dex: 5 }
            });
            const result = mapToDnd5eActor(statblock);

            expect(result.system.abilities.dex.proficient).toBe(1);
            expect(result.system.abilities.str.proficient).toBe(0);
        });
    });

    describe('AC', () => {
        it('should map AC correctly', () => {
            const statblock = new StatblockData({ name: 'Test', ac: 15 });
            const result = mapToDnd5eActor(statblock);

            expect(result.system.attributes.ac.flat).toBe(15);
            expect(result.system.attributes.ac.calc).toBe('flat');
        });

        it('should default AC to 10 when not provided', () => {
            const statblock = new StatblockData({ name: 'Test' });
            const result = mapToDnd5eActor(statblock);

            expect(result.system.attributes.ac.flat).toBe(10);
        });
    });

    describe('HP and hitDice', () => {
        it('should map HP correctly', () => {
            const statblock = new StatblockData({ name: 'Test', hp: 45 });
            const result = mapToDnd5eActor(statblock);

            expect(result.system.attributes.hp.value).toBe(45);
            expect(result.system.attributes.hp.max).toBe(45);
        });

        it('should map hitDice to formula', () => {
            const statblock = new StatblockData({ name: 'Test', hp: 45, hitDice: '6d8+18' });
            const result = mapToDnd5eActor(statblock);

            expect(result.system.attributes.hp.formula).toBe('6d8+18');
        });

        it('should default HP to 1 when not provided', () => {
            const statblock = new StatblockData({ name: 'Test' });
            const result = mapToDnd5eActor(statblock);

            expect(result.system.attributes.hp.value).toBe(1);
            expect(result.system.attributes.hp.max).toBe(1);
        });
    });

    describe('movement', () => {
        it('should map walk speed', () => {
            const statblock = new StatblockData({
                name: 'Test',
                speed: { walk: 30 }
            });
            const result = mapToDnd5eActor(statblock);

            expect(result.system.attributes.movement.walk).toBe(30);
        });

        it('should map multiple movement types', () => {
            const statblock = new StatblockData({
                name: 'Test',
                speed: { walk: 30, fly: 60, swim: 30, climb: 20, burrow: 10 }
            });
            const result = mapToDnd5eActor(statblock);

            expect(result.system.attributes.movement.walk).toBe(30);
            expect(result.system.attributes.movement.fly).toBe(60);
            expect(result.system.attributes.movement.swim).toBe(30);
            expect(result.system.attributes.movement.climb).toBe(20);
            expect(result.system.attributes.movement.burrow).toBe(10);
        });

        it('should set units to ft', () => {
            const statblock = new StatblockData({ name: 'Test', speed: { walk: 30 } });
            const result = mapToDnd5eActor(statblock);

            expect(result.system.attributes.movement.units).toBe('ft');
        });
    });

    describe('senses', () => {
        it('should map darkvision', () => {
            const statblock = new StatblockData({
                name: 'Test',
                senses: { darkvision: 60 }
            });
            const result = mapToDnd5eActor(statblock);

            expect(result.system.attributes.senses.darkvision).toBe(60);
        });

        it('should map multiple sense types', () => {
            const statblock = new StatblockData({
                name: 'Test',
                senses: { darkvision: 60, blindsight: 30, tremorsense: 60, truesight: 120 }
            });
            const result = mapToDnd5eActor(statblock);

            expect(result.system.attributes.senses.darkvision).toBe(60);
            expect(result.system.attributes.senses.blindsight).toBe(30);
            expect(result.system.attributes.senses.tremorsense).toBe(60);
            expect(result.system.attributes.senses.truesight).toBe(120);
        });

        it('should not include passivePerception in senses (handled elsewhere)', () => {
            const statblock = new StatblockData({
                name: 'Test',
                senses: { darkvision: 60, passivePerception: 15 }
            });
            const result = mapToDnd5eActor(statblock);

            expect(result.system.attributes.senses.darkvision).toBe(60);
            expect(result.system.attributes.senses.passivePerception).toBeUndefined();
        });
    });

    describe('creature type', () => {
        it('should map standard creature type', () => {
            const statblock = new StatblockData({ name: 'Test', type: 'humanoid' });
            const result = mapToDnd5eActor(statblock);

            expect(result.system.details.type.value).toBe('humanoid');
            expect(result.system.details.type.custom).toBe('');
        });

        it('should map subtype', () => {
            const statblock = new StatblockData({
                name: 'Test',
                type: 'humanoid',
                subtype: 'goblinoid'
            });
            const result = mapToDnd5eActor(statblock);

            expect(result.system.details.type.subtype).toBe('goblinoid');
        });

        it('should handle custom creature type', () => {
            const statblock = new StatblockData({ name: 'Test', type: 'Weird Thing' });
            const result = mapToDnd5eActor(statblock);

            expect(result.system.details.type.value).toBe('custom');
            expect(result.system.details.type.custom).toBe('Weird Thing');
        });
    });

    describe('challenge rating', () => {
        it('should map integer CR', () => {
            const statblock = new StatblockData({ name: 'Test', cr: 5 });
            const result = mapToDnd5eActor(statblock);

            expect(result.system.details.cr).toBe(5);
        });

        it('should map fractional CR 1/4', () => {
            const statblock = new StatblockData({ name: 'Test', cr: 0.25 });
            const result = mapToDnd5eActor(statblock);

            expect(result.system.details.cr).toBe(0.25);
        });

        it('should map fractional CR 1/8', () => {
            const statblock = new StatblockData({ name: 'Test', cr: 0.125 });
            const result = mapToDnd5eActor(statblock);

            expect(result.system.details.cr).toBe(0.125);
        });

        it('should map fractional CR 1/2', () => {
            const statblock = new StatblockData({ name: 'Test', cr: 0.5 });
            const result = mapToDnd5eActor(statblock);

            expect(result.system.details.cr).toBe(0.5);
        });
    });

    describe('size', () => {
        it('should map valid size', () => {
            const statblock = new StatblockData({ name: 'Test', size: 'lg' });
            const result = mapToDnd5eActor(statblock);

            expect(result.system.traits.size).toBe('lg');
        });

        it('should default invalid size to med', () => {
            const statblock = new StatblockData({ name: 'Test', size: 'invalid' });
            const result = mapToDnd5eActor(statblock);

            expect(result.system.traits.size).toBe('med');
        });

        it('should map all valid size codes', () => {
            const sizes = ['tiny', 'sm', 'med', 'lg', 'huge', 'grg'];
            for (const size of sizes) {
                const statblock = new StatblockData({ name: 'Test', size });
                const result = mapToDnd5eActor(statblock);
                expect(result.system.traits.size).toBe(size);
            }
        });
    });

    describe('damage immunities/resistances/vulnerabilities', () => {
        it('should map damage immunities', () => {
            const statblock = new StatblockData({
                name: 'Test',
                damageImmunities: ['fire', 'poison']
            });
            const result = mapToDnd5eActor(statblock);

            expect(result.system.traits.di.value).toEqual(new Set(['fire', 'poison']));
        });

        it('should map damage resistances', () => {
            const statblock = new StatblockData({
                name: 'Test',
                damageResistances: ['cold', 'lightning']
            });
            const result = mapToDnd5eActor(statblock);

            expect(result.system.traits.dr.value).toEqual(new Set(['cold', 'lightning']));
        });

        it('should map damage vulnerabilities', () => {
            const statblock = new StatblockData({
                name: 'Test',
                damageVulnerabilities: ['radiant']
            });
            const result = mapToDnd5eActor(statblock);

            expect(result.system.traits.dv.value).toEqual(new Set(['radiant']));
        });

        it('should filter out invalid damage types', () => {
            const statblock = new StatblockData({
                name: 'Test',
                damageImmunities: ['fire', 'invalid', 'poison']
            });
            const result = mapToDnd5eActor(statblock);

            expect(result.system.traits.di.value).toEqual(new Set(['fire', 'poison']));
        });
    });

    describe('condition immunities', () => {
        it('should map condition immunities', () => {
            const statblock = new StatblockData({
                name: 'Test',
                conditionImmunities: ['charmed', 'frightened']
            });
            const result = mapToDnd5eActor(statblock);

            expect(result.system.traits.ci.value).toEqual(new Set(['charmed', 'frightened']));
        });

        it('should filter out invalid conditions', () => {
            const statblock = new StatblockData({
                name: 'Test',
                conditionImmunities: ['charmed', 'invalid', 'poisoned']
            });
            const result = mapToDnd5eActor(statblock);

            expect(result.system.traits.ci.value).toEqual(new Set(['charmed', 'poisoned']));
        });
    });

    describe('languages', () => {
        it('should map standard languages', () => {
            const statblock = new StatblockData({
                name: 'Test',
                languages: ['Common', 'Elvish']
            });
            const result = mapToDnd5eActor(statblock);

            expect(result.system.traits.languages.value).toEqual(new Set(['common', 'elvish']));
        });

        it('should handle custom languages', () => {
            const statblock = new StatblockData({
                name: 'Test',
                languages: ['Common', 'Weird Alien Language']
            });
            const result = mapToDnd5eActor(statblock);

            expect(result.system.traits.languages.value).toEqual(new Set(['common']));
            expect(result.system.traits.languages.custom).toBe('Weird Alien Language');
        });

        it('should join multiple custom languages with semicolons', () => {
            const statblock = new StatblockData({
                name: 'Test',
                languages: ['Common', 'Weird Lang 1', 'Weird Lang 2']
            });
            const result = mapToDnd5eActor(statblock);

            expect(result.system.traits.languages.custom).toBe('Weird Lang 1; Weird Lang 2');
        });
    });

    describe('missing optional fields', () => {
        it('should handle missing optional fields gracefully', () => {
            const statblock = new StatblockData({ name: 'Minimal Creature' });
            const result = mapToDnd5eActor(statblock);

            expect(result.name).toBe('Minimal Creature');
            expect(result.type).toBe('npc');
            expect(result.system.attributes.ac.flat).toBe(10);
            expect(result.system.attributes.hp.value).toBe(1);
            expect(result.system.traits.size).toBe('med');
            expect(result.system.details.cr).toBeNull();
        });
    });

    describe('legendary resistances', () => {
        it('should extract legendary resistance count from traits', () => {
            const statblock = new StatblockData({
                name: 'Test',
                traits: [
                    { name: 'Legendary Resistance (3/Day)', desc: 'If the creature fails a saving throw, it can choose to succeed instead.' }
                ]
            });
            const result = mapToDnd5eActor(statblock);

            expect(result.system.resources.legres.max).toBe(3);
            expect(result.system.resources.legres.spent).toBe(0);
        });

        it('should handle singular form', () => {
            const statblock = new StatblockData({
                name: 'Test',
                traits: [
                    { name: 'Legendary Resistance (1/Day)', desc: 'Desc' }
                ]
            });
            const result = mapToDnd5eActor(statblock);

            expect(result.system.resources.legres.max).toBe(1);
        });

        it('should handle plural form with lowercase', () => {
            const statblock = new StatblockData({
                name: 'Test',
                traits: [
                    { name: 'Legendary Resistances (3/day)', desc: 'Desc' }
                ]
            });
            const result = mapToDnd5eActor(statblock);

            expect(result.system.resources.legres.max).toBe(3);
        });

        it('should default to 0 when no legendary resistance trait', () => {
            const statblock = new StatblockData({
                name: 'Test',
                traits: [
                    { name: 'Pack Tactics', desc: 'Something' }
                ]
            });
            const result = mapToDnd5eActor(statblock);

            expect(result.system.resources.legres.max).toBe(0);
        });

        it('should default to 0 with no traits', () => {
            const statblock = new StatblockData({ name: 'Test' });
            const result = mapToDnd5eActor(statblock);

            expect(result.system.resources.legres.max).toBe(0);
        });
    });
});

describe('createEmbeddedItems', () => {
    describe('traits', () => {
        it('should create feat items for traits', () => {
            const statblock = new StatblockData({
                name: 'Test',
                traits: [
                    { name: 'Pack Tactics', desc: 'The creature has advantage...' }
                ]
            });
            const result = createEmbeddedItems(statblock);

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Pack Tactics');
            expect(result[0].type).toBe('feat');
            expect(result[0].system.description.value).toContain('The creature has advantage...');
        });
    });

    describe('actions', () => {
        it('should create feat items for actions', () => {
            const statblock = new StatblockData({
                name: 'Test',
                actions: [
                    { name: 'Multiattack', desc: 'Makes two attacks.' },
                    { name: 'Bite', desc: 'Melee weapon attack...' }
                ]
            });
            const result = createEmbeddedItems(statblock);

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('Multiattack');
            expect(result[1].name).toBe('Bite');
        });
    });

    describe('bonus actions', () => {
        it('should create feat items for bonus actions', () => {
            const statblock = new StatblockData({
                name: 'Test',
                bonusActions: [
                    { name: 'Nimble Escape', desc: 'Takes Disengage or Hide.' }
                ]
            });
            const result = createEmbeddedItems(statblock);

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Nimble Escape');
        });
    });

    describe('reactions', () => {
        it('should create feat items for reactions', () => {
            const statblock = new StatblockData({
                name: 'Test',
                reactions: [
                    { name: 'Parry', desc: 'Adds 2 to AC against one attack.' }
                ]
            });
            const result = createEmbeddedItems(statblock);

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Parry');
        });
    });

    describe('legendary actions', () => {
        it('should create feat items for legendary actions', () => {
            const statblock = new StatblockData({
                name: 'Test',
                legendaryActions: [
                    { name: 'Attack', desc: 'Makes one attack.' },
                    { name: 'Move', desc: 'Moves up to half speed.' }
                ]
            });
            const result = createEmbeddedItems(statblock);

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('Attack');
            expect(result[1].name).toBe('Move');
        });
    });

    describe('fromStatblock flag', () => {
        it('should set fromStatblock flag on all items', () => {
            const statblock = new StatblockData({
                name: 'Test',
                filePath: '/vault/test.md',
                traits: [{ name: 'Trait', desc: 'desc' }],
                actions: [{ name: 'Action', desc: 'desc' }],
                bonusActions: [{ name: 'Bonus', desc: 'desc' }],
                reactions: [{ name: 'Reaction', desc: 'desc' }],
                legendaryActions: [{ name: 'Legendary', desc: 'desc' }]
            });
            const result = createEmbeddedItems(statblock);

            expect(result).toHaveLength(5);
            for (const item of result) {
                expect(item.flags['obsidian-bridge'].fromStatblock).toBe(true);
                expect(item.flags['obsidian-bridge'].sourceFile).toBe('/vault/test.md');
            }
        });
    });

    describe('empty statblock', () => {
        it('should return empty array for statblock with no action blocks', () => {
            const statblock = new StatblockData({ name: 'Test' });
            const result = createEmbeddedItems(statblock);

            expect(result).toEqual([]);
        });
    });

    describe('combined action blocks', () => {
        it('should combine all action types in order', () => {
            const statblock = new StatblockData({
                name: 'Test',
                traits: [{ name: 'Trait 1', desc: '' }],
                actions: [{ name: 'Action 1', desc: '' }],
                bonusActions: [{ name: 'Bonus 1', desc: '' }],
                reactions: [{ name: 'Reaction 1', desc: '' }],
                legendaryActions: [{ name: 'Legendary 1', desc: '' }]
            });
            const result = createEmbeddedItems(statblock);

            expect(result).toHaveLength(5);
            expect(result[0].name).toBe('Trait 1');
            expect(result[1].name).toBe('Action 1');
            expect(result[2].name).toBe('Bonus 1');
            expect(result[3].name).toBe('Reaction 1');
            expect(result[4].name).toBe('Legendary 1');
        });
    });

    describe('recharge abilities', () => {
        it('should parse Recharge 5-6 and set uses with recharge recovery', () => {
            const statblock = new StatblockData({
                name: 'Test',
                actions: [{ name: 'Breath Weapon (Recharge 5-6)', desc: 'Breathes fire.' }]
            });
            const result = createEmbeddedItems(statblock);

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Breath Weapon');
            expect(result[0].system.uses).toBeDefined();
            expect(result[0].system.uses.max).toBe('1');
            expect(result[0].system.uses.spent).toBe(0);
            expect(result[0].system.uses.recovery).toHaveLength(1);
            expect(result[0].system.uses.recovery[0].period).toBe('recharge');
            expect(result[0].system.uses.recovery[0].formula).toBe('5');
        });
    });

    describe('reaction triggers', () => {
        it('should extract trigger as activation condition for reactions', () => {
            const statblock = new StatblockData({
                name: 'Test',
                reactions: [{
                    name: 'Parry',
                    desc: '_Trigger:_ The goblin is hit by a melee attack. _Response:_ The goblin adds 2 to its AC.'
                }]
            });
            const result = createEmbeddedItems(statblock);

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Parry');

            const activityId = Object.keys(result[0].system.activities)[0];
            const activity = result[0].system.activities[activityId];

            expect(activity.activation.type).toBe('reaction');
            expect(activity.activation.condition).toBe('The goblin is hit by a melee attack.');
            expect(result[0].system.description.value).toContain('Trigger');
            expect(result[0].system.description.value).toContain('Response');
        });

        it('should leave condition empty for reactions without trigger format', () => {
            const statblock = new StatblockData({
                name: 'Test',
                reactions: [{
                    name: 'Opportunity Attack',
                    desc: 'The creature can make an opportunity attack.'
                }]
            });
            const result = createEmbeddedItems(statblock);

            const activityId = Object.keys(result[0].system.activities)[0];
            expect(result[0].system.activities[activityId].activation.condition).toBe('');
        });
    });

    describe('daily use abilities', () => {
        it('should parse X/Day and set uses with day recovery', () => {
            const statblock = new StatblockData({
                name: 'Test',
                actions: [{ name: 'Protective Magic (3/Day)', desc: 'Grants advantage.' }]
            });
            const result = createEmbeddedItems(statblock);

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Protective Magic');
            expect(result[0].system.uses).toBeDefined();
            expect(result[0].system.uses.max).toBe('3');
            expect(result[0].system.uses.spent).toBe(0);
            expect(result[0].system.uses.recovery).toHaveLength(1);
            expect(result[0].system.uses.recovery[0].period).toBe('day');
            expect(result[0].system.uses.recovery[0].type).toBe('recoverAll');
        });

        it('should parse X/Short Rest and set uses with sr recovery', () => {
            const statblock = new StatblockData({
                name: 'Test',
                actions: [{ name: 'Second Wind (1/Short Rest)', desc: 'Heals.' }]
            });
            const result = createEmbeddedItems(statblock);

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Second Wind');
            expect(result[0].system.uses.max).toBe('1');
            expect(result[0].system.uses.recovery[0].period).toBe('sr');
        });

        it('should parse X/Long Rest and set uses with lr recovery', () => {
            const statblock = new StatblockData({
                name: 'Test',
                traits: [{ name: 'Divine Intervention (1/Long Rest)', desc: 'Once per day.' }]
            });
            const result = createEmbeddedItems(statblock);

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Divine Intervention');
            expect(result[0].system.uses.max).toBe('1');
            expect(result[0].system.uses.recovery[0].period).toBe('lr');
        });
    });
});
