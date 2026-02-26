/**
 * Divi 4 Builder Engine.
 *
 * Interacts with the Divi 4 Visual Builder via DOM observation
 * and Backbone model access.
 *
 * @package Divi_Anchor_AI
 */

export class Divi4Engine {
    constructor() {
        this.observer = null;
        this.activeModuleEl = null;
    }

    /**
     * Initialize the engine — start observing the builder.
     */
    init() {
        this.observeBuilder();
    }

    /**
     * Observe the builder DOM for module selection events.
     */
    observeBuilder() {
        const target = document.getElementById('et-fb-app');
        if (!target) {
            return;
        }

        this.observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const el = mutation.target;
                    if (el.classList && el.classList.contains('et_pb_selected')) {
                        this.activeModuleEl = el;
                    }
                }
            }
        });

        this.observer.observe(target, {
            attributes: true,
            subtree: true,
            attributeFilter: ['class'],
        });
    }

    /**
     * Get the currently selected module's data from Backbone models.
     *
     * @returns {Object|null} { moduleId, moduleType, moduleData }
     */
    getSelectedModule() {
        // Access Divi 4's internal Backbone collection.
        if (typeof window.ET_Builder === 'undefined' || !window.ET_Builder.Modules) {
            return null;
        }

        const activeView = this.getActiveModuleView();
        if (!activeView || !activeView.model) {
            return null;
        }

        const model = activeView.model;
        const attrs = model.attributes || {};

        return {
            moduleId: attrs.cid || model.cid,
            moduleType: attrs.type || attrs.module_type || '',
            moduleData: this.extractModuleData(attrs),
        };
    }

    /**
     * Apply field changes to a module's Backbone model.
     *
     * @param {string} moduleId - Module CID.
     * @param {Object} changes  - Key-value pairs to set.
     * @returns {boolean}
     */
    applyChanges(moduleId, changes) {
        if (typeof window.ET_Builder === 'undefined' || !window.ET_Builder.Modules) {
            return false;
        }

        const model = window.ET_Builder.Modules.find(
            (m) => m.cid === moduleId || (m.attributes && m.attributes.cid === moduleId)
        );

        if (!model) {
            return false;
        }

        // Set attributes and trigger re-render.
        Object.entries(changes).forEach(([key, value]) => {
            model.set(key, value);
        });

        // Trigger the builder's content change event.
        if (typeof window.ET_Builder.Events !== 'undefined') {
            window.ET_Builder.Events.trigger('et-modal-view-changed');
        }

        return true;
    }

    /**
     * Get the active module's Backbone view.
     *
     * @returns {Object|null} Backbone View instance.
     */
    getActiveModuleView() {
        // Try the builder's active module reference.
        if (window.ET_Builder && window.ET_Builder.ActiveModule) {
            return window.ET_Builder.ActiveModule;
        }

        // Fallback: find via selected DOM element.
        if (this.activeModuleEl) {
            const cid = this.activeModuleEl.getAttribute('data-cid');
            if (cid && window.ET_Builder.Modules) {
                const model = window.ET_Builder.Modules.find((m) => m.cid === cid);
                if (model && model.views) {
                    return Object.values(model.views)[0] || null;
                }
            }
        }

        return null;
    }

    /**
     * Extract editable module data from Backbone attributes.
     *
     * @param {Object} attrs - Model attributes.
     * @returns {Object} Cleaned module data.
     */
    extractModuleData(attrs) {
        const data = {};
        const skipKeys = new Set([
            'cid', 'type', 'module_type', 'component_path',
            '_i', 'child_slug', 'parent_cid', 'ab_subject',
        ]);

        Object.entries(attrs).forEach(([key, value]) => {
            if (!skipKeys.has(key) && typeof value !== 'object') {
                data[key] = value;
            }
        });

        return data;
    }

    /**
     * Tear down the engine.
     */
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }
}
