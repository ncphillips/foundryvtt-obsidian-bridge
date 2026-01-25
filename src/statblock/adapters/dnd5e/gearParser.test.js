import { parseGearDescription, extractGearFromTraits, normalizeItemName } from './gearParser.js';

describe('gearParser', () => {
    describe('parseGearDescription', () => {
        it('returns empty array for null input', () => {
            expect(parseGearDescription(null)).toEqual([]);
            expect(parseGearDescription('')).toEqual([]);
        });

        it('parses single item', () => {
            const result = parseGearDescription('Chain Shirt');
            expect(result).toEqual([{ name: 'Chain Shirt', quantity: 1 }]);
        });

        it('parses multiple items', () => {
            const result = parseGearDescription('Chain Shirt, Longsword, Shield');
            expect(result).toEqual([
                { name: 'Chain Shirt', quantity: 1 },
                { name: 'Longsword', quantity: 1 },
                { name: 'Shield', quantity: 1 }
            ]);
        });

        it('parses items with quantities', () => {
            const result = parseGearDescription('Chain Shirt, Javelin (3), Morningstar');
            expect(result).toEqual([
                { name: 'Chain Shirt', quantity: 1 },
                { name: 'Javelin', quantity: 3 },
                { name: 'Morningstar', quantity: 1 }
            ]);
        });

        it('handles whitespace', () => {
            const result = parseGearDescription('  Chain Shirt ,  Javelin (3) ,  Morningstar  ');
            expect(result).toEqual([
                { name: 'Chain Shirt', quantity: 1 },
                { name: 'Javelin', quantity: 3 },
                { name: 'Morningstar', quantity: 1 }
            ]);
        });
    });

    describe('extractGearFromTraits', () => {
        it('returns empty array for null input', () => {
            expect(extractGearFromTraits(null)).toEqual([]);
            expect(extractGearFromTraits([])).toEqual([]);
        });

        it('extracts gear from Gear trait', () => {
            const traits = [
                { name: 'Abduct', desc: 'Some ability' },
                { name: 'Gear', desc: 'Chain Shirt, Javelin (3), Morningstar' }
            ];
            const result = extractGearFromTraits(traits);
            expect(result).toEqual([
                { name: 'Chain Shirt', quantity: 1 },
                { name: 'Javelin', quantity: 3 },
                { name: 'Morningstar', quantity: 1 }
            ]);
        });

        it('extracts gear from Equipment trait', () => {
            const traits = [
                { name: 'Equipment', desc: 'Leather Armor, Dagger' }
            ];
            const result = extractGearFromTraits(traits);
            expect(result).toEqual([
                { name: 'Leather Armor', quantity: 1 },
                { name: 'Dagger', quantity: 1 }
            ]);
        });

        it('returns empty array if no gear trait found', () => {
            const traits = [
                { name: 'Keen Senses', desc: 'Advantage on Perception' },
                { name: 'Pack Tactics', desc: 'Advantage when ally nearby' }
            ];
            const result = extractGearFromTraits(traits);
            expect(result).toEqual([]);
        });
    });

    describe('normalizeItemName', () => {
        it('lowercases and trims', () => {
            expect(normalizeItemName('  Chain Shirt  ')).toBe('chain shirt');
            expect(normalizeItemName('LONGSWORD')).toBe('longsword');
        });

        it('handles empty input', () => {
            expect(normalizeItemName('')).toBe('');
            expect(normalizeItemName(null)).toBe('');
        });
    });
});
