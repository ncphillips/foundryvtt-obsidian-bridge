/**
 * Detect pages that have been modified in Foundry since last sync.
 *
 * A conflict occurs when:
 * 1. A page already exists in Foundry matching the import target
 * 2. The page has a lastSyncedAt timestamp (not a first-time import)
 * 3. The page's modifiedTime > lastSyncedAt (edited since last sync)
 *
 * Dependencies: Foundry (game.folders, game.journal APIs)
 */

/**
 * Detects conflicts between the import plan and existing Foundry documents.
 *
 * @param {import('../domain/JournalStructurePlan').default} structurePlan - The planned journal structure
 * @returns {Promise<Conflict[]>} Array of detected conflicts
 */
export async function detectConflicts(structurePlan) {
    const folderIndex = buildFolderIndex();
    const entryIndex = buildEntryIndex();
    const conflicts = [];

    for (const entryPlan of structurePlan.entries) {
        const folderId = resolveFolderId(entryPlan.folderPath, folderIndex);
        const entryKey = `${folderId}:${entryPlan.name}`;
        const existingEntry = entryIndex.get(entryKey);

        if (!existingEntry) {
            continue;
        }

        const pageIndex = new Map();
        for (const page of existingEntry.pages) {
            pageIndex.set(page.name, page);
        }

        for (const pagePlan of entryPlan.pages) {
            const existingPage = pageIndex.get(pagePlan.name);

            if (!existingPage) {
                continue;
            }

            const conflict = checkPageConflict(existingPage, existingEntry, pagePlan);
            if (conflict) {
                conflicts.push(conflict);
            }
        }
    }

    return conflicts;
}

function buildFolderIndex() {
    const index = new Map();

    for (const folder of game.folders.filter(f => f.type === 'JournalEntry')) {
        const key = `${folder.folder?.id ?? null}:${folder.name}`;
        index.set(key, folder);
    }

    return index;
}

function buildEntryIndex() {
    const index = new Map();

    for (const entry of game.journal) {
        const key = `${entry.folder?.id ?? null}:${entry.name}`;
        index.set(key, entry);
    }

    return index;
}

/**
 * Resolves a folder path to a Foundry folder ID.
 *
 * @param {string|null} folderPath - The folder path from the plan
 * @param {Map} folderIndex - Index of existing folders
 * @returns {string|null} The folder ID or null
 */
function resolveFolderId(folderPath, folderIndex) {
    if (!folderPath) {
        return null;
    }

    let parentId = null;
    for (const name of folderPath.split('/')) {
        const folder = folderIndex.get(`${parentId}:${name}`);
        if (!folder) {
            return null;
        }
        parentId = folder.id;
    }

    return parentId;
}

// Tolerance for timing differences between Date.now() and Foundry's modifiedTime.
// When we update a page, we call Date.now() before Foundry processes the update,
// so modifiedTime ends up slightly newer than lastSyncedAt. A 5-second window
// handles this while still catching real user edits.
const SYNC_TOLERANCE_MS = 5000;

/**
 * Checks if a page has been modified since last sync.
 *
 * @param {JournalEntryPage} page - The existing Foundry page
 * @param {JournalEntry} entry - The parent journal entry
 * @param {Object} pagePlan - The page plan from structure
 * @returns {Conflict|null} Conflict info or null if no conflict
 */
function checkPageConflict(page, entry, pagePlan) {
    const lastSyncedAt = page.flags?.['obsidian-bridge']?.lastSyncedAt;
    if (lastSyncedAt == null) {
        return null;
    }

    const modifiedTime = page._stats?.modifiedTime;

    if (!modifiedTime || modifiedTime <= lastSyncedAt + SYNC_TOLERANCE_MS) {
        return null;
    }

    return {
        pageUuid: page.uuid,
        pageName: page.name,
        entryName: entry.name,
        modifiedTime,
        lastSyncedAt,
        markdownFile: pagePlan.markdownFile
    };
}

/**
 * Filters out markdown files that the user chose to skip.
 *
 * @param {MarkdownFile[]} markdownFiles - Array of markdown files (mutated)
 * @param {Conflict[]} skippedConflicts - Conflicts the user chose not to overwrite
 */
export function filterSkippedFiles(markdownFiles, skippedConflicts) {
    const skippedFiles = new Set(skippedConflicts.map(c => c.markdownFile));

    for (let i = markdownFiles.length - 1; i >= 0; i--) {
        if (skippedFiles.has(markdownFiles[i])) {
            markdownFiles.splice(i, 1);
        }
    }
}
