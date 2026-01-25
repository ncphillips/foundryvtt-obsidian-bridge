import { parseStatblock } from './parse';
import StatblockData from '../domain/StatblockData';

describe('parseStatblock', () => {
    describe('basic parsing', () => {
        it('should return a StatblockData instance', () => {
            const yaml = 'name: Test Creature';
            const result = parseStatblock(yaml);

            expect(result).toBeInstanceOf(StatblockData);
        });

        it('should parse name and filePath', () => {
            const yaml = 'name: Goblin Boss';
            const result = parseStatblock(yaml, '/path/to/file.md');

            expect(result.name).toBe('Goblin Boss');
            expect(result.filePath).toBe('/path/to/file.md');
        });

        it('should parse type and subtype', () => {
            const yaml = `name: Test
type: humanoid
subtype: Goblinoid`;
            const result = parseStatblock(yaml);

            expect(result.type).toBe('humanoid');
            expect(result.subtype).toBe('Goblinoid');
        });

        it('should parse alignment', () => {
            const yaml = `name: Test
alignment: Chaotic Evil`;
            const result = parseStatblock(yaml);

            expect(result.alignment).toBe('Chaotic Evil');
        });
    });

    describe('size normalization', () => {
        it('should normalize Small to sm', () => {
            const yaml = `name: Test
size: Small`;
            const result = parseStatblock(yaml);

            expect(result.size).toBe('sm');
        });

        it('should normalize Medium to med', () => {
            const yaml = `name: Test
size: Medium`;
            const result = parseStatblock(yaml);

            expect(result.size).toBe('med');
        });

        it('should normalize Large to lg', () => {
            const yaml = `name: Test
size: Large`;
            const result = parseStatblock(yaml);

            expect(result.size).toBe('lg');
        });

        it('should normalize Gargantuan to grg', () => {
            const yaml = `name: Test
size: Gargantuan`;
            const result = parseStatblock(yaml);

            expect(result.size).toBe('grg');
        });

        it('should handle lowercase input', () => {
            const yaml = `name: Test
size: medium`;
            const result = parseStatblock(yaml);

            expect(result.size).toBe('med');
        });

        it('should preserve tiny and huge as-is', () => {
            expect(parseStatblock('name: Test\nsize: Tiny').size).toBe('tiny');
            expect(parseStatblock('name: Test\nsize: Huge').size).toBe('huge');
        });
    });

    describe('AC normalization', () => {
        it('should parse numeric AC', () => {
            const yaml = `name: Test
ac: 14`;
            const result = parseStatblock(yaml);

            expect(result.ac).toBe(14);
        });

        it('should extract numeric value from AC string with armor', () => {
            const yaml = `name: Test
ac: 20 (plate armor, shield)`;
            const result = parseStatblock(yaml);

            expect(result.ac).toBe(20);
        });

        it('should handle AC string without parentheses', () => {
            const yaml = `name: Test
ac: "15"`;
            const result = parseStatblock(yaml);

            expect(result.ac).toBe(15);
        });
    });

    describe('stats array normalization', () => {
        it('should convert stats array to abilities object', () => {
            const yaml = `name: Test
stats: [10, 15, 14, 8, 12, 10]`;
            const result = parseStatblock(yaml);

            expect(result.abilities).toEqual({
                str: 10,
                dex: 15,
                con: 14,
                int: 8,
                wis: 12,
                cha: 10
            });
        });

        it('should use default abilities for invalid stats array', () => {
            const yaml = `name: Test
stats: [10, 15]`;
            const result = parseStatblock(yaml);

            expect(result.abilities).toEqual({ str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 });
        });
    });

    describe('saves array normalization', () => {
        it('should convert saves array to saving throws object', () => {
            const yaml = `name: Test
saves:
- Dex: +4
- Con: +6`;
            const result = parseStatblock(yaml);

            expect(result.savingThrows).toEqual({
                dex: 4,
                con: 6
            });
        });

        it('should handle saves without plus sign', () => {
            const yaml = `name: Test
saves:
- Int: 7
- Wis: 4`;
            const result = parseStatblock(yaml);

            expect(result.savingThrows).toEqual({
                int: 7,
                wis: 4
            });
        });

        it('should lowercase ability names', () => {
            const yaml = `name: Test
saves:
- DEX: +4`;
            const result = parseStatblock(yaml);

            expect(result.savingThrows).toEqual({ dex: 4 });
        });
    });

    describe('skillsaves array normalization', () => {
        it('should convert skillsaves array to skills object', () => {
            const yaml = `name: Test
skillsaves:
- Stealth: +6
- Perception: +4`;
            const result = parseStatblock(yaml);

            expect(result.skills).toEqual({
                stealth: 6,
                perception: 4
            });
        });

        it('should lowercase skill names', () => {
            const yaml = `name: Test
skillsaves:
- STEALTH: +6`;
            const result = parseStatblock(yaml);

            expect(result.skills).toEqual({ stealth: 6 });
        });
    });

    describe('speed string normalization', () => {
        it('should parse walk speed', () => {
            const yaml = `name: Test
speed: 30 ft.`;
            const result = parseStatblock(yaml);

            expect(result.speed).toEqual({ walk: 30 });
        });

        it('should parse multiple speed types', () => {
            const yaml = `name: Test
speed: 30 ft., fly 60 ft., swim 30 ft.`;
            const result = parseStatblock(yaml);

            expect(result.speed).toEqual({
                walk: 30,
                fly: 60,
                swim: 30
            });
        });

        it('should handle speed without period', () => {
            const yaml = `name: Test
speed: 30 ft`;
            const result = parseStatblock(yaml);

            expect(result.speed).toEqual({ walk: 30 });
        });
    });

    describe('CR normalization', () => {
        it('should parse integer CR', () => {
            const yaml = `name: Test
cr: 5`;
            const result = parseStatblock(yaml);

            expect(result.cr).toBe(5);
        });

        it('should parse fraction 1/4', () => {
            const yaml = `name: Test
cr: 1/4`;
            const result = parseStatblock(yaml);

            expect(result.cr).toBe(0.25);
        });

        it('should parse fraction 1/8', () => {
            const yaml = `name: Test
cr: 1/8`;
            const result = parseStatblock(yaml);

            expect(result.cr).toBe(0.125);
        });

        it('should parse fraction 1/2', () => {
            const yaml = `name: Test
cr: 1/2`;
            const result = parseStatblock(yaml);

            expect(result.cr).toBe(0.5);
        });

        it('should handle string CR', () => {
            const yaml = `name: Test
cr: "12"`;
            const result = parseStatblock(yaml);

            expect(result.cr).toBe(12);
        });
    });

    describe('comma-separated strings normalization', () => {
        it('should split languages into array', () => {
            const yaml = `name: Test
languages: Common, Goblin`;
            const result = parseStatblock(yaml);

            expect(result.languages).toEqual(['Common', 'Goblin']);
        });

        it('should split condition immunities into array', () => {
            const yaml = `name: Test
condition_immunities: Charmed, Frightened`;
            const result = parseStatblock(yaml);

            expect(result.conditionImmunities).toEqual(['Charmed', 'Frightened']);
        });

        it('should handle single value', () => {
            const yaml = `name: Test
languages: Goblin`;
            const result = parseStatblock(yaml);

            expect(result.languages).toEqual(['Goblin']);
        });
    });

    describe('senses string normalization', () => {
        it('should parse darkvision', () => {
            const yaml = `name: Test
senses: darkvision 60 ft.`;
            const result = parseStatblock(yaml);

            expect(result.senses).toEqual({ darkvision: 60 });
        });

        it('should parse passive Perception', () => {
            const yaml = `name: Test
senses: passive Perception 15`;
            const result = parseStatblock(yaml);

            expect(result.senses).toEqual({ passivePerception: 15 });
        });

        it('should parse multiple senses', () => {
            const yaml = `name: Test
senses: Blindsight 10 ft., Darkvision 60 ft., passive Perception 10`;
            const result = parseStatblock(yaml);

            expect(result.senses).toEqual({
                blindsight: 10,
                darkvision: 60,
                passivePerception: 10
            });
        });
    });

    describe('action blocks pass-through', () => {
        it('should pass through traits array', () => {
            const yaml = `name: Test
traits:
- name: Cruel
  desc: Deals extra damage.`;
            const result = parseStatblock(yaml);

            expect(result.traits).toEqual([{ name: 'Cruel', desc: 'Deals extra damage.' }]);
        });

        it('should pass through actions array', () => {
            const yaml = `name: Test
actions:
- name: Multiattack
  desc: Makes two attacks.`;
            const result = parseStatblock(yaml);

            expect(result.actions).toEqual([{ name: 'Multiattack', desc: 'Makes two attacks.' }]);
        });

        it('should pass through bonus_actions as bonusActions', () => {
            const yaml = `name: Test
bonus_actions:
- name: Nimble Escape
  desc: Takes Disengage or Hide.`;
            const result = parseStatblock(yaml);

            expect(result.bonusActions).toEqual([{ name: 'Nimble Escape', desc: 'Takes Disengage or Hide.' }]);
        });

        it('should pass through reactions', () => {
            const yaml = `name: Test
reactions:
- name: Parry
  desc: Adds to AC.`;
            const result = parseStatblock(yaml);

            expect(result.reactions).toEqual([{ name: 'Parry', desc: 'Adds to AC.' }]);
        });

        it('should pass through legendary_actions as legendaryActions', () => {
            const yaml = `name: Test
legendary_actions:
- name: Attack
  desc: Makes one attack.`;
            const result = parseStatblock(yaml);

            expect(result.legendaryActions).toEqual([{ name: 'Attack', desc: 'Makes one attack.' }]);
        });

        it('should pass through legendary_description as legendaryDescription', () => {
            const yaml = `name: Test
legendary_description: Can take 3 legendary actions.`;
            const result = parseStatblock(yaml);

            expect(result.legendaryDescription).toBe('Can take 3 legendary actions.');
        });

        it('should pass through spells array', () => {
            const yaml = `name: Test
spells:
- The creature is a 5th-level spellcaster. Its spellcasting ability is Wisdom (spell save DC 15, +7 to hit with spell attacks).
- At-Will: _bane_, _detect magic_
- 3/day: _hellish rebuke_`;
            const result = parseStatblock(yaml);

            expect(result.spells).toEqual([
                'The creature is a 5th-level spellcaster. Its spellcasting ability is Wisdom (spell save DC 15, +7 to hit with spell attacks).',
                { 'At-Will': '_bane_, _detect magic_' },
                { '3/day': '_hellish rebuke_' }
            ]);
        });
    });

    describe('real-world statblock parsing', () => {
        it('should parse Goblin Boss statblock', () => {
            const yaml = `name: Goblin Boss
size: Small
type: humanoid
subtype: Goblinoid
alignment: Chaotic Neutral
ac: 14
hp: 21
hit_dice: 6d6
speed: 30 ft.
stats: [10, 15, 10, 10, 8, 10]
saves:
- Dex: +2
skillsaves:
- Stealth: +6
senses: darkvision 60 ft., passive Perception 9
languages: Goblin
cr: 1
traits:
- name: Cruel
  desc: Deals extra damage.`;
            const result = parseStatblock(yaml, '/path/to/Goblin Boss.md');

            expect(result.name).toBe('Goblin Boss');
            expect(result.size).toBe('sm');
            expect(result.type).toBe('humanoid');
            expect(result.ac).toBe(14);
            expect(result.hp).toBe(21);
            expect(result.hitDice).toBe('6d6');
            expect(result.speed).toEqual({ walk: 30 });
            expect(result.abilities.dex).toBe(15);
            expect(result.savingThrows).toEqual({ dex: 2 });
            expect(result.skills).toEqual({ stealth: 6 });
            expect(result.senses).toEqual({ darkvision: 60, passivePerception: 9 });
            expect(result.languages).toEqual(['Goblin']);
            expect(result.cr).toBe(1);
        });

        it('should parse Hobgoblin General statblock with complex AC', () => {
            const yaml = `name: Hobgoblin General
size: Medium
type: humanoid
ac: 20 (plate armor, shield)
hp: 237
cr: 12
condition_immunities: Charmed, Frightened`;
            const result = parseStatblock(yaml);

            expect(result.name).toBe('Hobgoblin General');
            expect(result.size).toBe('med');
            expect(result.ac).toBe(20);
            expect(result.hp).toBe(237);
            expect(result.cr).toBe(12);
            expect(result.conditionImmunities).toEqual(['Charmed', 'Frightened']);
        });
    });

    describe('error handling', () => {
        it('should throw on invalid YAML', () => {
            const yaml = `name: [invalid
yaml: structure`;
            expect(() => parseStatblock(yaml, '/test.md')).toThrow();
        });

        it('should throw on non-object YAML', () => {
            const yaml = '- item1\n- item2';
            expect(() => parseStatblock(yaml, '/test.md')).toThrow(/expected object/);
        });
    });
});
