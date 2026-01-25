import { parseSpellcasting, parseSpellcastingTrait } from './spellcastingParser.js';

describe('spellcastingParser', () => {
    describe('parseSpellcasting', () => {
        it('returns empty result for null input', () => {
            const result = parseSpellcasting(null);
            expect(result.spells).toEqual([]);
            expect(result.level).toBeNull();
        });

        it('returns empty result for empty array', () => {
            const result = parseSpellcasting([]);
            expect(result.spells).toEqual([]);
        });

        it('parses spellcaster header line', () => {
            const result = parseSpellcasting([
                'The bugbear beastmage is a 5th-level spellcaster. Its spellcasting ability is Wisdom (spell save DC 15, +7 to hit with spell attacks).'
            ]);

            expect(result.level).toBe(5);
            expect(result.ability).toBe('wis');
            expect(result.saveDC).toBe(15);
            expect(result.attackBonus).toBe(7);
        });

        it('parses at-will spells', () => {
            const result = parseSpellcasting([
                { 'At-Will': '_bane_, _detect magic_, _mage hand_, _thaumaturgy_' }
            ]);

            expect(result.spells).toHaveLength(4);
            expect(result.spells[0]).toEqual({
                name: 'bane',
                usage: 'atwill',
                uses: null,
                note: null
            });
            expect(result.spells[1].name).toBe('detect magic');
        });

        it('parses daily spells with counts', () => {
            const result = parseSpellcasting([
                { '3/day': '_hellish rebuke_' },
                { '2/day Each': '_invisibility_, _cure wounds_' }
            ]);

            expect(result.spells).toHaveLength(3);
            expect(result.spells[0]).toEqual({
                name: 'hellish rebuke',
                usage: 'innate',
                uses: 3,
                note: null
            });
            expect(result.spells[1].uses).toBe(2);
            expect(result.spells[2].uses).toBe(2);
        });

        it('parses spell notes in parentheses', () => {
            const result = parseSpellcasting([
                { '1/day Each': '_conjure elemental (level 8 version)_, _tree stride_' }
            ]);

            expect(result.spells).toHaveLength(2);
            expect(result.spells[0]).toEqual({
                name: 'conjure elemental',
                usage: 'innate',
                uses: 1,
                note: 'level 8 version'
            });
            expect(result.spells[1].note).toBeNull();
        });

        it('parses full Fantasy Statblocks spells array', () => {
            const result = parseSpellcasting([
                'The bugbear beastmage is a 5th-level spellcaster. Its spellcasting ability is Wisdom (spell save DC 15, +7 to hit with spell attacks).',
                { 'At-Will': '_bane_, _detect magic_, _mage hand_, _thaumaturgy_' },
                { '3/day': '_hellish rebuke_' },
                { '2/day Each': '_invisibility_, _cure wounds_, _conjure woodland beings_' },
                { '1/day Each': '_conjure elemental_, _tree stride_' }
            ]);

            expect(result.level).toBe(5);
            expect(result.ability).toBe('wis');
            expect(result.saveDC).toBe(15);
            expect(result.attackBonus).toBe(7);
            expect(result.spells).toHaveLength(10);

            // Check at-will spells (4: bane, detect magic, mage hand, thaumaturgy)
            const atWillSpells = result.spells.filter(s => s.usage === 'atwill');
            expect(atWillSpells).toHaveLength(4);

            // Check 3/day spell
            const threePerDay = result.spells.filter(s => s.uses === 3);
            expect(threePerDay).toHaveLength(1);

            // Check 2/day spells
            const twoPerDay = result.spells.filter(s => s.uses === 2);
            expect(twoPerDay).toHaveLength(3);

            // Check 1/day spells
            const onePerDay = result.spells.filter(s => s.uses === 1);
            expect(onePerDay).toHaveLength(2);
        });
    });

    describe('parseSpellcastingTrait', () => {
        it('returns null for non-spellcasting trait', () => {
            const result = parseSpellcastingTrait({
                name: 'Keen Senses',
                desc: 'The creature has advantage on Perception checks.'
            });
            expect(result).toBeNull();
        });

        it('returns null for null input', () => {
            expect(parseSpellcastingTrait(null)).toBeNull();
            expect(parseSpellcastingTrait({})).toBeNull();
        });

        it('parses spellcasting trait with markdown formatting', () => {
            const result = parseSpellcastingTrait({
                name: 'Spellcasting',
                desc: 'The goblin casts one of the following spells, using Charisma as the spellcasting ability (spell save DC 19). **At Will:** _Shocking Grasp_, _Thaumaturgy_. **3/Day Each:** _Blink_, _Fear_.'
            });

            expect(result).not.toBeNull();
            expect(result.ability).toBe('cha');
            expect(result.saveDC).toBe(19);
            expect(result.spells.length).toBeGreaterThan(0);
        });
    });
});
