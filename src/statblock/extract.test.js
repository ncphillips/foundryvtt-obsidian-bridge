import { extractStatblocks, hasStatblocks } from './extract';

describe('extractStatblocks', () => {
    describe('basic extraction', () => {
        it('should extract a single statblock', () => {
            const content = `# Monster

\`\`\`statblock
name: Goblin
hp: 7
\`\`\`

Some more text.`;
            const result = extractStatblocks(content);

            expect(result).toHaveLength(1);
            expect(result[0].yaml).toBe('name: Goblin\nhp: 7');
            expect(result[0].startIndex).toBe(11);
            expect(result[0].endIndex).toBe(46);
        });

        it('should extract multiple statblocks', () => {
            const content = `\`\`\`statblock
name: First
\`\`\`

\`\`\`statblock
name: Second
\`\`\``;
            const result = extractStatblocks(content);

            expect(result).toHaveLength(2);
            expect(result[0].yaml).toBe('name: First');
            expect(result[1].yaml).toBe('name: Second');
        });

        it('should capture full YAML content with multiple lines', () => {
            const content = `\`\`\`statblock
name: Test Creature
size: Medium
type: humanoid
ac: 15
hp: 50
\`\`\``;
            const result = extractStatblocks(content);

            expect(result).toHaveLength(1);
            expect(result[0].yaml).toContain('name: Test Creature');
            expect(result[0].yaml).toContain('hp: 50');
        });
    });

    describe('empty and null handling', () => {
        it('should return empty array for empty string', () => {
            expect(extractStatblocks('')).toEqual([]);
        });

        it('should return empty array for null', () => {
            expect(extractStatblocks(null)).toEqual([]);
        });

        it('should return empty array for undefined', () => {
            expect(extractStatblocks(undefined)).toEqual([]);
        });

        it('should return empty array when no statblocks exist', () => {
            const content = 'Just regular markdown without statblocks.';
            expect(extractStatblocks(content)).toEqual([]);
        });
    });

    describe('non-statblock code blocks', () => {
        it('should not extract regular code blocks', () => {
            const content = `\`\`\`javascript
const x = 1;
\`\`\``;
            expect(extractStatblocks(content)).toEqual([]);
        });

        it('should not extract code blocks with similar names', () => {
            const content = `\`\`\`statblocks
name: Not a statblock
\`\`\``;
            expect(extractStatblocks(content)).toEqual([]);
        });

        it('should only extract statblock blocks among mixed code blocks', () => {
            const content = `\`\`\`javascript
const x = 1;
\`\`\`

\`\`\`statblock
name: Goblin
\`\`\`

\`\`\`python
print("hello")
\`\`\``;
            const result = extractStatblocks(content);

            expect(result).toHaveLength(1);
            expect(result[0].yaml).toBe('name: Goblin');
        });
    });

    describe('CRLF line endings', () => {
        it('should handle Windows-style line endings', () => {
            const content = '```statblock\r\nname: Goblin\r\nhp: 7\r\n```';
            const result = extractStatblocks(content);

            expect(result).toHaveLength(1);
            expect(result[0].yaml).toBe('name: Goblin\r\nhp: 7');
        });
    });

    describe('index tracking', () => {
        it('should track correct start and end indices', () => {
            const content = '```statblock\nname: Test\n```';
            const result = extractStatblocks(content);

            expect(result[0].startIndex).toBe(0);
            expect(result[0].endIndex).toBe(content.length);
        });

        it('should track indices for second statblock correctly', () => {
            const content = `\`\`\`statblock
name: First
\`\`\`
text between
\`\`\`statblock
name: Second
\`\`\``;
            const result = extractStatblocks(content);

            expect(result[1].startIndex).toBeGreaterThan(result[0].endIndex);
            expect(content.substring(result[1].startIndex, result[1].endIndex)).toContain('name: Second');
        });
    });
});

describe('hasStatblocks', () => {
    it('should return true when statblock exists', () => {
        const content = `\`\`\`statblock
name: Goblin
\`\`\``;
        expect(hasStatblocks(content)).toBe(true);
    });

    it('should return false when no statblock exists', () => {
        const content = 'Regular markdown content.';
        expect(hasStatblocks(content)).toBe(false);
    });

    it('should return false for empty string', () => {
        expect(hasStatblocks('')).toBe(false);
    });

    it('should return false for null', () => {
        expect(hasStatblocks(null)).toBe(false);
    });

    it('should return false for undefined', () => {
        expect(hasStatblocks(undefined)).toBe(false);
    });

    it('should return false for other code blocks', () => {
        const content = `\`\`\`javascript
const x = 1;
\`\`\``;
        expect(hasStatblocks(content)).toBe(false);
    });
});
