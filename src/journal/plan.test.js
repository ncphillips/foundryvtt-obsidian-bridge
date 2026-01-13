import planJournalStructure from './plan';
import MarkdownFile from '../domain/MarkdownFile';
import ImportOptions from '../domain/ImportOptions';

function createMarkdownFile(filePath) {
    return new MarkdownFile({
        filePath,
        lookupKeys: [],
        content: '<p>test</p>',
        links: [],
        assets: []
    });
}

describe('planJournalStructure', () => {
    describe('combineNotes: false', () => {
        it('should create separate journal entries for each file', () => {
            const markdownFiles = [
                createMarkdownFile('Dragons/Ancient Red Dragon.md'),
                createMarkdownFile('Dragons/Blue Dragon.md')
            ];
            const options = new ImportOptions({
                combineNotes: false
            });

            const plan = planJournalStructure(markdownFiles, options);

            expect(plan.entries).toHaveLength(2);
            expect(plan.entries[0].name).toBe('Ancient Red Dragon');
            expect(plan.entries[0].pages).toHaveLength(1);
            expect(plan.entries[0].pages[0].name).toBe('Ancient Red Dragon');
            expect(plan.entries[1].name).toBe('Blue Dragon');
            expect(plan.entries[1].pages).toHaveLength(1);
        });

        it('should create folder hierarchy from file paths', () => {
            const markdownFiles = [
                createMarkdownFile('Combat/Dragons/Ancient Red Dragon.md'),
                createMarkdownFile('Combat/Undead/Lich.md')
            ];
            const options = new ImportOptions({
                combineNotes: false
            });

            const plan = planJournalStructure(markdownFiles, options);

            expect(plan.folders).toHaveLength(3);

            const combatFolder = plan.folders.find(f => f.name === 'Combat');
            expect(combatFolder).toBeDefined();
            expect(combatFolder.path).toBe('Combat');
            expect(combatFolder.parentPath).toBeNull();

            const dragonsFolder = plan.folders.find(f => f.name === 'Dragons');
            expect(dragonsFolder).toBeDefined();
            expect(dragonsFolder.path).toBe('Combat/Dragons');
            expect(dragonsFolder.parentPath).toBe('Combat');

            const undeadFolder = plan.folders.find(f => f.name === 'Undead');
            expect(undeadFolder).toBeDefined();
            expect(undeadFolder.path).toBe('Combat/Undead');
            expect(undeadFolder.parentPath).toBe('Combat');
        });

        it('should place entries in correct folders', () => {
            const markdownFiles = [
                createMarkdownFile('Combat/Dragons/Ancient Red Dragon.md'),
                createMarkdownFile('NPCs/Merchant.md')
            ];
            const options = new ImportOptions({
                combineNotes: false
            });

            const plan = planJournalStructure(markdownFiles, options);

            expect(plan.entries[0].folderPath).toBe('Combat/Dragons');
            expect(plan.entries[1].folderPath).toBe('NPCs');
        });

        it('should handle files at vault root', () => {
            const markdownFiles = [
                createMarkdownFile('README.md')
            ];
            const options = new ImportOptions({
                combineNotes: false
            });

            const plan = planJournalStructure(markdownFiles, options);

            expect(plan.folders).toHaveLength(0);
            expect(plan.entries).toHaveLength(1);
            expect(plan.entries[0].folderPath).toBeNull();
            expect(plan.entries[0].name).toBe('README');
        });
    });

    describe('combineNotes: true', () => {
        it('should combine files in same folder into one journal entry and not create folder', () => {
            const markdownFiles = [
                createMarkdownFile('Dragons/Ancient Red Dragon.md'),
                createMarkdownFile('Dragons/Blue Dragon.md'),
                createMarkdownFile('Dragons/Green Dragon.md')
            ];
            const options = new ImportOptions({
                combineNotes: true
            });

            const plan = planJournalStructure(markdownFiles, options);

            expect(plan.folders).toHaveLength(0);

            expect(plan.entries).toHaveLength(1);
            expect(plan.entries[0].name).toBe('Dragons');
            expect(plan.entries[0].folderPath).toBeNull();
            expect(plan.entries[0].pages).toHaveLength(3);
            expect(plan.entries[0].pages[0].name).toBe('Ancient Red Dragon');
            expect(plan.entries[0].pages[1].name).toBe('Blue Dragon');
            expect(plan.entries[0].pages[2].name).toBe('Green Dragon');
        });

        it('should not combine folders with only one file', () => {
            const markdownFiles = [
                createMarkdownFile('Dragons/Ancient Red Dragon.md'),
                createMarkdownFile('Undead/Lich.md')
            ];
            const options = new ImportOptions({
                combineNotes: true
            });

            const plan = planJournalStructure(markdownFiles, options);

            expect(plan.folders).toHaveLength(2);
            expect(plan.folders.find(f => f.name === 'Dragons')).toBeDefined();
            expect(plan.folders.find(f => f.name === 'Undead')).toBeDefined();

            expect(plan.entries).toHaveLength(2);
            expect(plan.entries[0].name).toBe('Ancient Red Dragon');
            expect(plan.entries[0].folderPath).toBe('Dragons');
            expect(plan.entries[0].pages).toHaveLength(1);
            expect(plan.entries[1].name).toBe('Lich');
            expect(plan.entries[1].folderPath).toBe('Undead');
            expect(plan.entries[1].pages).toHaveLength(1);
        });

        it('should handle mixed single-file and multi-file folders correctly', () => {
            const markdownFiles = [
                createMarkdownFile('Handouts/Quz.md'),
                createMarkdownFile('Handouts/Foo/Bar.md'),
                createMarkdownFile('Handouts/Foo/Baz.md')
            ];
            const options = new ImportOptions({
                combineNotes: true
            });

            const plan = planJournalStructure(markdownFiles, options);

            expect(plan.folders).toHaveLength(1);
            expect(plan.folders[0].name).toBe('Handouts');
            expect(plan.folders[0].path).toBe('Handouts');

            expect(plan.entries).toHaveLength(2);

            const quzEntry = plan.entries.find(e => e.name === 'Quz');
            expect(quzEntry).toBeDefined();
            expect(quzEntry.folderPath).toBe('Handouts');
            expect(quzEntry.pages).toHaveLength(1);

            const fooEntry = plan.entries.find(e => e.name === 'Foo');
            expect(fooEntry).toBeDefined();
            expect(fooEntry.folderPath).toBe('Handouts');
            expect(fooEntry.pages).toHaveLength(2);
            expect(fooEntry.pages.find(p => p.name === 'Bar')).toBeDefined();
            expect(fooEntry.pages.find(p => p.name === 'Baz')).toBeDefined();
        });

        it('should keep combined folder at same level when it has subfolders', () => {
            const markdownFiles = [
                createMarkdownFile('Lore/City/District A.md'),
                createMarkdownFile('Lore/City/District B.md'),
                createMarkdownFile('Lore/City/District C.md'),
                createMarkdownFile('Lore/City/District D.md'),
                createMarkdownFile('Lore/City/District E.md'),
                createMarkdownFile('Lore/History.md'),
                createMarkdownFile('Lore/Culture.md'),
                createMarkdownFile('Lore/Religion.md'),
                createMarkdownFile('Lore/Geography.md')
            ];
            const options = new ImportOptions({
                combineNotes: true
            });

            const plan = planJournalStructure(markdownFiles, options);

            expect(plan.folders).toHaveLength(1);
            expect(plan.folders[0].name).toBe('Lore');
            expect(plan.folders[0].path).toBe('Lore');

            expect(plan.entries).toHaveLength(2);

            const cityEntry = plan.entries.find(e => e.name === 'City');
            expect(cityEntry).toBeDefined();
            expect(cityEntry.folderPath).toBe('Lore');
            expect(cityEntry.pages).toHaveLength(5);

            const loreEntry = plan.entries.find(e => e.name === 'Lore');
            expect(loreEntry).toBeDefined();
            expect(loreEntry.folderPath).toBe('Lore');
            expect(loreEntry.pages).toHaveLength(4);
        });

        it('should handle files at vault root as separate entries when combining', () => {
            const markdownFiles = [
                createMarkdownFile('README.md'),
                createMarkdownFile('CHANGELOG.md')
            ];
            const options = new ImportOptions({
                combineNotes: true
            });

            const plan = planJournalStructure(markdownFiles, options);

            expect(plan.entries).toHaveLength(2);
            expect(plan.entries[0].folderPath).toBeNull();
            expect(plan.entries[0].name).toBe('README');
            expect(plan.entries[1].folderPath).toBeNull();
            expect(plan.entries[1].name).toBe('CHANGELOG');
        });

        it('should preserve MarkdownFile references in pages', () => {
            const dragonFile = createMarkdownFile('Dragons/Ancient Red Dragon.md');
            const markdownFiles = [dragonFile];
            const options = new ImportOptions({
                combineNotes: true
            });

            const plan = planJournalStructure(markdownFiles, options);

            expect(plan.entries[0].pages[0].markdownFile).toBe(dragonFile);
        });
    });

    describe('skipFolderCombine: true', () => {
        it('should not combine folders that contain subfolders', () => {
            const markdownFiles = [
                createMarkdownFile('Combat/overview.md'),
                createMarkdownFile('Combat/Dragons/Ancient Red Dragon.md')
            ];
            const options = new ImportOptions({
                combineNotes: true,
                skipFolderCombine: true
            });

            const plan = planJournalStructure(markdownFiles, options);

            expect(plan.entries).toHaveLength(2);

            const overviewEntry = plan.entries.find(e => e.name === 'overview');
            expect(overviewEntry).toBeDefined();
            expect(overviewEntry.pages).toHaveLength(1);

            const dragonEntry = plan.entries.find(e => e.name === 'Ancient Red Dragon');
            expect(dragonEntry).toBeDefined();
            expect(dragonEntry.folderPath).toBe('Combat/Dragons');
            expect(dragonEntry.pages).toHaveLength(1);
        });

        it('should combine folders that do not contain subfolders', () => {
            const markdownFiles = [
                createMarkdownFile('Dragons/Ancient Red Dragon.md'),
                createMarkdownFile('Dragons/Blue Dragon.md')
            ];
            const options = new ImportOptions({
                combineNotes: true,
                skipFolderCombine: true
            });

            const plan = planJournalStructure(markdownFiles, options);

            expect(plan.entries).toHaveLength(1);
            expect(plan.entries[0].name).toBe('Dragons');
            expect(plan.entries[0].pages).toHaveLength(2);
        });

        it('should handle mixed scenarios correctly', () => {
            const markdownFiles = [
                createMarkdownFile('Combat/overview.md'),
                createMarkdownFile('Combat/Dragons/Ancient Red Dragon.md'),
                createMarkdownFile('Combat/Dragons/Blue Dragon.md'),
                createMarkdownFile('NPCs/Merchant.md'),
                createMarkdownFile('NPCs/Guard.md')
            ];
            const options = new ImportOptions({
                combineNotes: true,
                skipFolderCombine: true
            });

            const plan = planJournalStructure(markdownFiles, options);

            expect(plan.entries).toHaveLength(3);

            const overviewEntry = plan.entries.find(e => e.name === 'overview');
            expect(overviewEntry.pages).toHaveLength(1);

            const dragonsEntry = plan.entries.find(e => e.name === 'Dragons');
            expect(dragonsEntry.pages).toHaveLength(2);

            const npcsEntry = plan.entries.find(e => e.name === 'NPCs');
            expect(npcsEntry.pages).toHaveLength(2);
        });
    });

    describe('vault root handling', () => {
        it('should strip vault root from file paths', () => {
            const markdownFiles = [
                createMarkdownFile('MyVault/Combat/Dragons/Ancient Red Dragon.md'),
                createMarkdownFile('MyVault/Combat/Undead/Lich.md'),
                createMarkdownFile('MyVault/README.md')
            ];
            const options = new ImportOptions({
                vaultPath: 'MyVault',
                combineNotes: false
            });

            const plan = planJournalStructure(markdownFiles, options);

            expect(plan.folders).toHaveLength(3);
            expect(plan.folders.find(f => f.name === 'Combat')).toBeDefined();
            expect(plan.folders.find(f => f.name === 'Dragons')).toBeDefined();
            expect(plan.folders.find(f => f.name === 'Undead')).toBeDefined();
            expect(plan.folders.find(f => f.name === 'MyVault')).toBeUndefined();

            expect(plan.entries).toHaveLength(3);
            const readmeEntry = plan.entries.find(e => e.name === 'README');
            expect(readmeEntry).toBeDefined();
            expect(readmeEntry.folderPath).toBeNull();

            const dragonEntry = plan.entries.find(e => e.name === 'Ancient Red Dragon');
            expect(dragonEntry).toBeDefined();
            expect(dragonEntry.folderPath).toBe('Combat/Dragons');
        });

        it('should handle vault root in combine mode', () => {
            const markdownFiles = [
                createMarkdownFile('MyVault/Dragons/Ancient Red Dragon.md'),
                createMarkdownFile('MyVault/Dragons/Blue Dragon.md')
            ];
            const options = new ImportOptions({
                vaultPath: 'MyVault',
                combineNotes: true
            });

            const plan = planJournalStructure(markdownFiles, options);

            expect(plan.folders).toHaveLength(0);

            expect(plan.entries).toHaveLength(1);
            expect(plan.entries[0].name).toBe('Dragons');
            expect(plan.entries[0].folderPath).toBeNull();
        });

        it('should work without vault path set', () => {
            const markdownFiles = [
                createMarkdownFile('Dragons/Ancient Red Dragon.md')
            ];
            const options = new ImportOptions({
                combineNotes: false
            });

            const plan = planJournalStructure(markdownFiles, options);

            expect(plan.folders).toHaveLength(1);
            expect(plan.folders[0].name).toBe('Dragons');
        });
    });

    describe('edge cases', () => {
        it('should handle empty markdown files array', () => {
            const markdownFiles = [];
            const options = new ImportOptions({
                combineNotes: false
            });

            const plan = planJournalStructure(markdownFiles, options);

            expect(plan.folders).toHaveLength(0);
            expect(plan.entries).toHaveLength(0);
        });

        it('should handle deeply nested folder structure', () => {
            const markdownFiles = [
                createMarkdownFile('A/B/C/D/file.md')
            ];
            const options = new ImportOptions({
                combineNotes: false
            });

            const plan = planJournalStructure(markdownFiles, options);

            expect(plan.folders).toHaveLength(4);
            expect(plan.folders[0].path).toBe('A');
            expect(plan.folders[1].path).toBe('A/B');
            expect(plan.folders[2].path).toBe('A/B/C');
            expect(plan.folders[3].path).toBe('A/B/C/D');
        });

        it('should strip .md extension from page names', () => {
            const markdownFiles = [
                createMarkdownFile('Dragons/Ancient Red Dragon.md')
            ];
            const options = new ImportOptions({
                combineNotes: false
            });

            const plan = planJournalStructure(markdownFiles, options);

            expect(plan.entries[0].name).toBe('Ancient Red Dragon');
            expect(plan.entries[0].pages[0].name).toBe('Ancient Red Dragon');
        });
    });

    describe('splitByHeadings: true', () => {
        function createMarkdownFileWithContent(filePath, content) {
            return new MarkdownFile({
                filePath,
                lookupKeys: [],
                content,
                links: [],
                assets: []
            });
        }

        it('should create multiple pages from file with multiple H1 headings', () => {
            const content = '<h1>History</h1><p>Historical content</p><h1>Geography</h1><p>Geographical content</p>';
            const markdownFiles = [
                createMarkdownFileWithContent('Dragons/Dragon Lore.md', content)
            ];
            const options = new ImportOptions({
                combineNotes: false,
                splitByHeadings: true,
                splitHeadingLevel: 1
            });

            const plan = planJournalStructure(markdownFiles, options);

            expect(plan.entries).toHaveLength(1);
            expect(plan.entries[0].name).toBe('Dragon Lore');
            expect(plan.entries[0].pages).toHaveLength(2);
            expect(plan.entries[0].pages[0].name).toBe('History');
            expect(plan.entries[0].pages[1].name).toBe('Geography');
        });

        it('should use file name for preamble page', () => {
            const content = '<p>Introduction</p><h1>Main Section</h1><p>Content</p>';
            const markdownFiles = [
                createMarkdownFileWithContent('Dragon Lore.md', content)
            ];
            const options = new ImportOptions({
                combineNotes: false,
                splitByHeadings: true,
                splitHeadingLevel: 1
            });

            const plan = planJournalStructure(markdownFiles, options);

            expect(plan.entries[0].pages).toHaveLength(2);
            expect(plan.entries[0].pages[0].name).toBe('Dragon Lore');
            expect(plan.entries[0].pages[1].name).toBe('Main Section');
        });

        it('should populate splitPages on MarkdownFile', () => {
            const content = '<h1>First</h1><p>A</p><h1>Second</h1><p>B</p>';
            const file = createMarkdownFileWithContent('Test.md', content);
            const options = new ImportOptions({
                combineNotes: false,
                splitByHeadings: true,
                splitHeadingLevel: 1
            });

            planJournalStructure([file], options);

            expect(file.splitPages).toHaveLength(2);
            expect(file.splitPages[0].name).toBe('First');
            expect(file.splitPages[0].headingTitle).toBe('First');
            expect(file.splitPages[0].content).toBe('<p>A</p>');
            expect(file.splitPages[0].foundryPageUuid).toBeNull();
            expect(file.splitPages[1].name).toBe('Second');
            expect(file.splitPages[1].headingTitle).toBe('Second');
            expect(file.splitPages[1].content).toBe('<p>B</p>');
        });

        it('should include splitPage reference in page plan', () => {
            const content = '<h1>Section</h1><p>Content</p><h1>Another</h1><p>More</p>';
            const file = createMarkdownFileWithContent('Test.md', content);
            const options = new ImportOptions({
                combineNotes: false,
                splitByHeadings: true,
                splitHeadingLevel: 1
            });

            const plan = planJournalStructure([file], options);

            expect(plan.entries[0].pages[0].splitPage).toBe(file.splitPages[0]);
            expect(plan.entries[0].pages[1].splitPage).toBe(file.splitPages[1]);
        });

        it('should not split files with single heading', () => {
            const content = '<h1>Only Section</h1><p>Content</p>';
            const file = createMarkdownFileWithContent('Test.md', content);
            const options = new ImportOptions({
                combineNotes: false,
                splitByHeadings: true,
                splitHeadingLevel: 1
            });

            const plan = planJournalStructure([file], options);

            expect(plan.entries[0].pages).toHaveLength(1);
            expect(plan.entries[0].pages[0].name).toBe('Test');
            expect(plan.entries[0].pages[0].splitPage).toBeUndefined();
            expect(file.splitPages).toBeNull();
        });

        it('should not split files with no headings', () => {
            const content = '<p>Just some content</p>';
            const file = createMarkdownFileWithContent('Test.md', content);
            const options = new ImportOptions({
                combineNotes: false,
                splitByHeadings: true,
                splitHeadingLevel: 1
            });

            const plan = planJournalStructure([file], options);

            expect(plan.entries[0].pages).toHaveLength(1);
            expect(plan.entries[0].pages[0].name).toBe('Test');
            expect(file.splitPages).toBeNull();
        });

        it('should split on H2 when splitHeadingLevel is 2', () => {
            const content = '<h1>Title</h1><h2>First</h2><p>A</p><h2>Second</h2><p>B</p>';
            const file = createMarkdownFileWithContent('Test.md', content);
            const options = new ImportOptions({
                combineNotes: false,
                splitByHeadings: true,
                splitHeadingLevel: 2
            });

            const plan = planJournalStructure([file], options);

            expect(plan.entries[0].pages).toHaveLength(3);
            expect(plan.entries[0].pages[0].name).toBe('Test');
            expect(plan.entries[0].pages[1].name).toBe('First');
            expect(plan.entries[0].pages[2].name).toBe('Second');
        });

        it('should work with combineNotes enabled', () => {
            const content1 = '<h1>Section A</h1><p>A</p><h1>Section B</h1><p>B</p>';
            const content2 = '<h1>Section C</h1><p>C</p><h1>Section D</h1><p>D</p>';
            const markdownFiles = [
                createMarkdownFileWithContent('Folder/File1.md', content1),
                createMarkdownFileWithContent('Folder/File2.md', content2)
            ];
            const options = new ImportOptions({
                combineNotes: true,
                splitByHeadings: true,
                splitHeadingLevel: 1
            });

            const plan = planJournalStructure(markdownFiles, options);

            expect(plan.entries).toHaveLength(1);
            expect(plan.entries[0].name).toBe('Folder');
            expect(plan.entries[0].pages).toHaveLength(4);
            expect(plan.entries[0].pages[0].name).toBe('Section A');
            expect(plan.entries[0].pages[1].name).toBe('Section B');
            expect(plan.entries[0].pages[2].name).toBe('Section C');
            expect(plan.entries[0].pages[3].name).toBe('Section D');
        });
    });
});
