/**
 * Splits HTML content into sections based on heading tags.
 *
 * Content before the first heading becomes a section with null title.
 * Each heading at the specified level starts a new section.
 * Nested headings (lower levels) stay within their parent section.
 *
 * @param {string} html - HTML content to split
 * @param {number} level - Heading level to split on (1-6)
 * @returns {Array<{title: string|null, content: string}>} Array of sections
 */
export function splitByHeadings(html, level) {
    if (!html || typeof html !== 'string') {
        return [];
    }

    if (level < 1 || level > 6) {
        throw new Error('Heading level must be between 1 and 6');
    }

    const tagPattern = new RegExp(`<h${level}[^>]*>([\\s\\S]*?)<\\/h${level}>`, 'gi');
    const sections = [];
    let lastIndex = 0;
    let match;

    while ((match = tagPattern.exec(html)) !== null) {
        const beforeHeading = html.slice(lastIndex, match.index).trim();

        if (sections.length === 0 && beforeHeading) {
            sections.push({
                title: null,
                content: beforeHeading
            });
        } else if (sections.length > 0 && beforeHeading) {
            const currentSection = sections[sections.length - 1];
            if (currentSection.content) {
                currentSection.content += `\n${beforeHeading}`;
            } else {
                currentSection.content = beforeHeading;
            }
        }

        const headingText = match[1].replace(/<[^>]*>/g, '').trim();

        sections.push({
            title: headingText,
            content: ''
        });

        lastIndex = match.index + match[0].length;
    }

    const remaining = html.slice(lastIndex).trim();
    if (remaining) {
        if (sections.length === 0) {
            sections.push({
                title: null,
                content: remaining
            });
        } else {
            sections[sections.length - 1].content = remaining;
        }
    }

    return sections;
}
