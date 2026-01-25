/**
 * Regex to match Fantasy Statblocks code blocks in markdown.
 * Matches ```statblock followed by YAML content and closing ```.
 * Uses non-greedy match to handle multiple statblocks in one document.
 */
const STATBLOCK_REGEX = /```statblock\r?\n([\s\S]+?)\r?\n```/g;

/**
 * Extracts all statblock code blocks from markdown content.
 *
 * @param {string} content - The markdown content to search
 * @returns {{ yaml: string, startIndex: number, endIndex: number }[]} Array of extracted statblocks
 */
export function extractStatblocks(content) {
    if (!content) {
        return [];
    }

    const results = [];
    let match;

    STATBLOCK_REGEX.lastIndex = 0;

    while ((match = STATBLOCK_REGEX.exec(content)) !== null) {
        results.push({
            yaml: match[1],
            startIndex: match.index,
            endIndex: match.index + match[0].length
        });
    }

    return results;
}

/**
 * Checks whether markdown content contains any statblock code blocks.
 *
 * @param {string} content - The markdown content to check
 * @returns {boolean} True if content contains at least one statblock
 */
export function hasStatblocks(content) {
    if (!content) {
        return false;
    }

    STATBLOCK_REGEX.lastIndex = 0;
    return STATBLOCK_REGEX.test(content);
}
