import { id as MODULE_ID } from '../../module.json';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class ProgressModal extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(options = {}) {
        super(options);
        this.progressState = {
            currentPhase: 0,
            phaseLabel: `${MODULE_ID}.progress.starting`,
            completedPhases: 0,
            totalPhases: 0,
            percentage: 0
        };
    }

    static DEFAULT_OPTIONS = {
        id: `${MODULE_ID}-progress`,
        classes: [MODULE_ID, 'progress-modal'],
        window: {
            frame: true,
            positioned: true,
            title: `${MODULE_ID}.progress.title`,
            icon: 'fas fa-spinner',
            minimizable: false,
            resizable: false,
            controls: []
        },
        position: {
            width: 500,
            height: 'auto'
        }
    };

    static PARTS = {
        content: {
            template: `modules/${MODULE_ID}/templates/progress-modal.hbs`
        }
    };

    async _prepareContext(options) {
        return {
            phaseLabel: game.i18n.localize(this.progressState.phaseLabel),
            percentage: this.progressState.percentage,
            completedPhases: this.progressState.completedPhases,
            totalPhases: this.progressState.totalPhases,
            showItemCount: false
        };
    }

    updateProgress(state) {
        this.progressState = { ...state };
        this.render();
    }
}
