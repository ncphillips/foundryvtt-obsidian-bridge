import { registerImportHooks } from './infrastructure/registerHooks.js';
import { registerDnd5eAdapter } from './statblock/adapters/dnd5e/index.js';

Hooks.once('init', async () => {
    console.log('Obsidian Bridge | Initializing');
    registerDnd5eAdapter();
    await registerImportHooks();
});
