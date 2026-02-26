/**
 * Divi 5 Builder Engine — Store integration + selection tracking.
 *
 * Uses the @divi/data store API to interact with the Divi 5 Visual Builder:
 *   - select('divi/edit-post') for reading module data
 *   - dispatch('divi/edit-post') for writing module attributes
 *   - subscribe() for tracking selection changes
 *
 * Falls back to DOM observation when store selectors are unavailable.
 *
 * @package Divi_Anchor_AI
 */

export class Divi5Engine {
    constructor() {
        this.store = null;
        this.dispatch = null;
        this.unsubscribe = null;
        this.selectedModuleId = null;
        this.domObserver = null;
    }

    /**
     * Initialize the engine by connecting to the Divi 5 store.
     */
    init() {
        if (!window.divi || !window.divi.data) {
            console.warn('[Divi Anchor AI] Divi 5 store (window.divi.data) not available');
            return;
        }

        const data = window.divi.data;

        // Acquire store references.
        this.store = data.select('divi/edit-post');
        this.dispatch = data.dispatch('divi/edit-post');

        // Subscribe to store for selection changes.
        const selectionSelectors = [
            'getEditingModuleId',
            'getActiveModuleId',
            'getSelectedModuleId',
        ];

        let getSelectedId = null;
        for (const name of selectionSelectors) {
            if (typeof this.store[name] === 'function') {
                getSelectedId = this.store[name].bind(this.store);
                break;
            }
        }

        if (getSelectedId) {
            let lastId = null;
            this.unsubscribe = data.subscribe(() => {
                const id = getSelectedId();
                if (id !== lastId) {
                    lastId = id;
                    this.selectedModuleId = id || null;
                }
            });
        } else {
            // Fallback: DOM observation for module settings panels.
            this._initDOMObserver();
        }

        console.log('[Divi Anchor AI] Divi 5 engine initialized');
    }

    /**
     * Fallback DOM observer watching for settings panels with [data-module-id].
     *
     * @private
     */
    _initDOMObserver() {
        if (typeof MutationObserver === 'undefined') return;

        this.domObserver = new MutationObserver(() => {
            const activePanel = document.querySelector(
                '.et-fb-settings-panel[data-module-id], [data-module-id].et-fb-module--active'
            );
            if (activePanel) {
                this.selectedModuleId = activePanel.getAttribute('data-module-id');
            }
        });

        this.domObserver.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    /**
     * Get the currently selected module.
     *
     * @returns {Object|null} { moduleId, moduleType, moduleData } or null.
     */
    getSelectedModule() {
        if (!this.store || !this.selectedModuleId) {
            // Try DOM-based detection as last resort.
            if (!this.selectedModuleId) {
                this._detectModuleFromDOM();
            }
            if (!this.store || !this.selectedModuleId) {
                return null;
            }
        }

        try {
            const id = this.selectedModuleId;
            const moduleType = this.store.getModuleType(id);
            const moduleData = this.store.getModuleAttrs(id) || {};

            if (!moduleType) return null;

            return {
                moduleId: id,
                moduleType,
                moduleData,
            };
        } catch (e) {
            console.warn('[Divi Anchor AI] Error reading module from store:', e);
            return null;
        }
    }

    /**
     * Attempt to detect the selected module ID from the DOM.
     *
     * @private
     */
    _detectModuleFromDOM() {
        const activeEl = document.querySelector(
            '.et-fb-settings-panel[data-module-id], [data-module-id].et-fb-module--active'
        );
        if (activeEl) {
            this.selectedModuleId = activeEl.getAttribute('data-module-id');
        }
    }

    /**
     * Apply changes to a module via the Divi 5 store.
     *
     * @param {string} moduleId - Module identifier.
     * @param {Object} changes  - Map of field name → new value.
     * @returns {boolean} True if changes were dispatched.
     */
    applyChanges(moduleId, changes) {
        if (!this.dispatch) return false;

        try {
            for (const [field, value] of Object.entries(changes)) {
                this.dispatch.editModuleAttribute(moduleId, field, value);
            }
            return true;
        } catch (e) {
            console.warn('[Divi Anchor AI] Error applying changes via store:', e);
            return false;
        }
    }

    /**
     * Tear down the engine and release resources.
     */
    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }

        if (this.domObserver) {
            this.domObserver.disconnect();
            this.domObserver = null;
        }

        this.store = null;
        this.dispatch = null;
        this.selectedModuleId = null;
    }
}
