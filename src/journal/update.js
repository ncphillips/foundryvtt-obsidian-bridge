import { id as MODULE_ID } from '../../module.json';

/**
 * Update journal page content in Foundry
 *
 * Dependencies: Foundry (fromUuidSync, page.update APIs)
 */

export async function updateContent(markdownFiles) {
    if (!Array.isArray(markdownFiles) || markdownFiles.length === 0) {
        return { updatedPages: [] };
    }

    const updatedPages = [];

    for (const markdownFile of markdownFiles) {
        if (markdownFile.splitPages) {
            for (let i = 0; i < markdownFile.splitPages.length; i++) {
                const splitPage = markdownFile.splitPages[i];
                const isFirstPage = i === 0;
                const result = await updateSinglePage(
                    splitPage.foundryPageUuid,
                    splitPage.content,
                    isFirstPage ? markdownFile.frontmatter : null,
                    markdownFile.filePath
                );
                if (result) {
                    updatedPages.push(result);
                }
            }
        } else {
            const result = await updateSinglePage(
                markdownFile.foundryPageUuid,
                markdownFile.content,
                markdownFile.frontmatter,
                markdownFile.filePath
            );
            if (result) {
                updatedPages.push(result);
            }
        }
    }

    return { updatedPages };
}

async function updateSinglePage(uuid, content, frontmatter, filePath) {
    if (!uuid) {
        console.warn(`Skipping page without UUID: ${filePath}`);
        return null;
    }

    const page = fromUuidSync(uuid);

    if (!page) {
        throw new Error(`Page not found for UUID: ${uuid} (${filePath})`);
    }

    const originalContent = page.text?.content || '';
    const originalFrontmatter = page.flags?.[MODULE_ID]?.frontmatter ?? null;
    const originalLastSyncedAt = page.flags?.[MODULE_ID]?.lastSyncedAt ?? null;

    await page.update({
        'text.content': content,
        [`flags.${MODULE_ID}.frontmatter`]: frontmatter,
        [`flags.${MODULE_ID}.lastSyncedAt`]: Date.now()
    });

    return {
        page,
        originalContent,
        originalFrontmatter,
        originalLastSyncedAt
    };
}

export async function rollbackUpdates(updatedPages) {
    if (!Array.isArray(updatedPages) || updatedPages.length === 0) {
        return;
    }

    const reversedPages = [...updatedPages].reverse();

    for (const { page, originalContent, originalFrontmatter, originalLastSyncedAt } of reversedPages) {
        try {
            await page.update({
                'text.content': originalContent,
                [`flags.${MODULE_ID}.frontmatter`]: originalFrontmatter,
                [`flags.${MODULE_ID}.lastSyncedAt`]: originalLastSyncedAt
            });
        } catch (error) {
            console.error(`Failed to rollback page ${page.uuid}:`, error);
        }
    }
}
