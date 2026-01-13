import { id as MODULE_ID } from '../../module.json';

const getTemplate = foundry.applications?.handlebars?.getTemplate ?? globalThis.getTemplate;

export async function registerHandlebarsHelpers() {
    Handlebars.registerHelper('endsWith', function(str, suffix) {
        if (!str || !suffix) {
            return false;
        }
        return str.endsWith(suffix);
    });

    const treeNodeTemplate = await getTemplate(`modules/${MODULE_ID}/templates/partials/tree-node.hbs`);
    Handlebars.registerPartial('tree-node', treeNodeTemplate);

    const calloutTemplate = await getTemplate(`modules/${MODULE_ID}/templates/partials/callout.hbs`);
    Handlebars.registerPartial('callout', calloutTemplate);
}
