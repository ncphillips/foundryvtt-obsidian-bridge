import { id as MODULE_ID } from '../../module.json';

export function loadDialogPreferences(dialogType) {
    return game.user.getFlag(MODULE_ID, dialogType) || {};
}

export async function saveDialogPreferences(dialogType, options) {
    await game.user.setFlag(MODULE_ID, dialogType, options);
}
