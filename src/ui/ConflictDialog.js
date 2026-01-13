/**
 * Dialog for resolving sync conflicts during import.
 *
 * Shows pages that have been modified in Foundry since last sync.
 * Users can check pages to overwrite or uncheck to skip.
 *
 * Dependencies: Foundry (ApplicationV2, HandlebarsApplicationMixin)
 */

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class ConflictDialog extends HandlebarsApplicationMixin(ApplicationV2) {
    #resolve = null;
    #reject = null;

    constructor(conflicts, options = {}) {
        super(options);
        this.conflicts = conflicts.map(c => ({
            ...c,
            checked: true,
            formattedModifiedTime: this._formatTimestamp(c.modifiedTime),
            formattedLastSyncedAt: this._formatTimestamp(c.lastSyncedAt)
        }));
    }

    static DEFAULT_OPTIONS = {
        id: 'obsidian-bridge-conflicts',
        classes: ['obsidian-bridge', 'conflict-dialog'],
        tag: 'form',
        window: {
            frame: true,
            positioned: true,
            title: 'obsidian-bridge.conflicts.dialog-title',
            icon: 'fas fa-exclamation-triangle',
            minimizable: false,
            resizable: false
        },
        actions: {
            continue: ConflictDialog._onContinue,
            abort: ConflictDialog._onAbort
        },
        position: {
            width: 550,
            height: 'auto'
        }
    };

    static PARTS = {
        form: {
            template: 'modules/obsidian-bridge/templates/conflict-dialog.hbs'
        }
    };

    async _prepareContext(options) {
        return {
            conflicts: this.conflicts,
            conflictCount: this.conflicts.length
        };
    }

    _onRender(context, options) {
        super._onRender(context, options);

        const checkboxes = this.element.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const conflict = this.conflicts.find(c => c.pageUuid === checkbox.dataset.uuid);
                if (conflict) {
                    conflict.checked = checkbox.checked;
                }
            });
        });
    }

    _formatTimestamp(timestamp) {
        if (!timestamp) {
            return 'Unknown';
        }
        const date = new Date(timestamp);
        return date.toLocaleString();
    }

    /**
     * Opens the dialog and returns a promise that resolves with skipped conflicts.
     *
     * @param {Conflict[]} conflicts - Array of conflicts to display
     * @returns {Promise<Conflict[]>} Conflicts the user chose to skip (unchecked)
     * @throws {Error} If user clicks Abort
     */
    static async prompt(conflicts) {
        const dialog = new ConflictDialog(conflicts);

        return new Promise((resolve, reject) => {
            dialog.#resolve = resolve;
            dialog.#reject = reject;
            dialog.render(true);
        });
    }

    static _onContinue(event, target) {
        event.preventDefault();

        const skipped = this.conflicts.filter(c => !c.checked);
        this.#resolve(skipped);
        this.#resolve = null;
        this.#reject = null;
        this.close();
    }

    static _onAbort(event, target) {
        event.preventDefault();

        this.#reject(new Error('Import aborted by user'));
        this.#resolve = null;
        this.#reject = null;
        this.close();
    }

    async close(options = {}) {
        if (this.#reject) {
            this.#reject(new Error('Dialog closed'));
            this.#reject = null;
        }
        return super.close(options);
    }
}
