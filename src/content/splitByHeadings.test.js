import { describe, it, expect } from '@jest/globals';
import { splitByHeadings } from './splitByHeadings.js';

describe('splitByHeadings', () => {
    describe('basic splitting', () => {
        it('should split content on H1 headings', () => {
            const html = '<h1>First Section</h1><p>Content one</p><h1>Second Section</h1><p>Content two</p>';
            const result = splitByHeadings(html, 1);

            expect(result).toHaveLength(2);
            expect(result[0].title).toBe('First Section');
            expect(result[0].content).toBe('<p>Content one</p>');
            expect(result[1].title).toBe('Second Section');
            expect(result[1].content).toBe('<p>Content two</p>');
        });

        it('should split content on H2 headings', () => {
            const html = '<h2>Alpha</h2><p>A content</p><h2>Beta</h2><p>B content</p>';
            const result = splitByHeadings(html, 2);

            expect(result).toHaveLength(2);
            expect(result[0].title).toBe('Alpha');
            expect(result[1].title).toBe('Beta');
        });

        it('should split content on H3 headings', () => {
            const html = '<h3>Section A</h3><p>A</p><h3>Section B</h3><p>B</p>';
            const result = splitByHeadings(html, 3);

            expect(result).toHaveLength(2);
            expect(result[0].title).toBe('Section A');
            expect(result[1].title).toBe('Section B');
        });
    });

    describe('preamble handling', () => {
        it('should create preamble section with null title for content before first heading', () => {
            const html = '<p>Introduction</p><h1>Main Section</h1><p>Content</p>';
            const result = splitByHeadings(html, 1);

            expect(result).toHaveLength(2);
            expect(result[0].title).toBeNull();
            expect(result[0].content).toBe('<p>Introduction</p>');
            expect(result[1].title).toBe('Main Section');
            expect(result[1].content).toBe('<p>Content</p>');
        });

        it('should handle content that starts with heading (no preamble)', () => {
            const html = '<h1>Only Section</h1><p>Content here</p>';
            const result = splitByHeadings(html, 1);

            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('Only Section');
            expect(result[0].content).toBe('<p>Content here</p>');
        });
    });

    describe('nested headings', () => {
        it('should keep lower-level headings in parent section when splitting on H1', () => {
            const html = '<h1>Main</h1><h2>Subsection</h2><p>Sub content</p><h1>Another</h1><p>More</p>';
            const result = splitByHeadings(html, 1);

            expect(result).toHaveLength(2);
            expect(result[0].title).toBe('Main');
            expect(result[0].content).toContain('<h2>Subsection</h2>');
            expect(result[0].content).toContain('<p>Sub content</p>');
            expect(result[1].title).toBe('Another');
        });

        it('should not split on higher-level headings when splitting on H2', () => {
            const html = '<h1>Title</h1><h2>First</h2><p>A</p><h2>Second</h2><p>B</p>';
            const result = splitByHeadings(html, 2);

            expect(result).toHaveLength(3);
            expect(result[0].title).toBeNull();
            expect(result[0].content).toBe('<h1>Title</h1>');
            expect(result[1].title).toBe('First');
            expect(result[2].title).toBe('Second');
        });
    });

    describe('edge cases', () => {
        it('should return empty array for empty string', () => {
            const result = splitByHeadings('', 1);

            expect(result).toEqual([]);
        });

        it('should return empty array for null input', () => {
            const result = splitByHeadings(null, 1);

            expect(result).toEqual([]);
        });

        it('should return empty array for undefined input', () => {
            const result = splitByHeadings(undefined, 1);

            expect(result).toEqual([]);
        });

        it('should return single section with null title when no headings exist', () => {
            const html = '<p>Just some content without headings</p>';
            const result = splitByHeadings(html, 1);

            expect(result).toHaveLength(1);
            expect(result[0].title).toBeNull();
            expect(result[0].content).toBe('<p>Just some content without headings</p>');
        });

        it('should return single section when only one heading exists', () => {
            const html = '<h1>Only Heading</h1><p>Content</p>';
            const result = splitByHeadings(html, 1);

            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('Only Heading');
            expect(result[0].content).toBe('<p>Content</p>');
        });

        it('should handle headings with attributes', () => {
            const html = '<h1 class="title" id="main">Section Title</h1><p>Content</p>';
            const result = splitByHeadings(html, 1);

            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('Section Title');
        });

        it('should strip HTML tags from heading text', () => {
            const html = '<h1><strong>Bold</strong> Title</h1><p>Content</p>';
            const result = splitByHeadings(html, 1);

            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('Bold Title');
        });

        it('should throw error for invalid heading level below 1', () => {
            expect(() => splitByHeadings('<p>test</p>', 0)).toThrow('Heading level must be between 1 and 6');
        });

        it('should throw error for invalid heading level above 6', () => {
            expect(() => splitByHeadings('<p>test</p>', 7)).toThrow('Heading level must be between 1 and 6');
        });
    });

    describe('whitespace handling', () => {
        it('should trim content in sections', () => {
            const html = '  <p>Preamble</p>  <h1>Section</h1>  <p>Content</p>  ';
            const result = splitByHeadings(html, 1);

            expect(result).toHaveLength(2);
            expect(result[0].content).toBe('<p>Preamble</p>');
            expect(result[1].content).toBe('<p>Content</p>');
        });

        it('should handle empty content between headings', () => {
            const html = '<h1>First</h1><h1>Second</h1><p>Content</p>';
            const result = splitByHeadings(html, 1);

            expect(result).toHaveLength(2);
            expect(result[0].title).toBe('First');
            expect(result[0].content).toBe('');
            expect(result[1].title).toBe('Second');
            expect(result[1].content).toBe('<p>Content</p>');
        });
    });

    describe('case insensitivity', () => {
        it('should match uppercase heading tags', () => {
            const html = '<H1>Title</H1><p>Content</p>';
            const result = splitByHeadings(html, 1);

            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('Title');
        });

        it('should match mixed case heading tags', () => {
            const html = '<H1>First</h1><p>A</p><h1>Second</H1><p>B</p>';
            const result = splitByHeadings(html, 1);

            expect(result).toHaveLength(2);
        });
    });
});
