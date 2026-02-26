/**
 * Divi Builder Adapter — Unified interface for communicating with the
 * Divi Visual Builder and the Divi Anchor AI REST API.
 *
 * @package Divi_Anchor_AI
 */

export class DiviBuilderAdapter {
    /**
     * @param {Object} config - diviAnchorConfig from wp_localize_script.
     * @param {Object} engine - Divi4Engine or Divi5Engine instance.
     */
    constructor(config, engine) {
        this.config = config;
        this.engine = engine;
        this.restUrl = config.restUrl;
        this.nonce = config.nonce;
    }

    /**
     * Make an authenticated REST request.
     *
     * @param {string} endpoint - Endpoint path (e.g., 'module-types').
     * @param {string} method   - HTTP method.
     * @param {Object} body     - Request body (for POST).
     * @returns {Promise<Object>}
     */
    async request(endpoint, method = 'GET', body = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': this.nonce,
            },
        };

        if (body && method !== 'GET') {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(`${this.restUrl}${endpoint}`, options);

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `Request failed: ${response.status}`);
        }

        return response.json();
    }

    /**
     * Get all registered module types.
     *
     * @returns {Promise<Array>}
     */
    async getModuleTypes() {
        return this.request('module-types');
    }

    /**
     * Get schema for a module type.
     *
     * @param {string} moduleType - e.g., 'et_pb_text'.
     * @returns {Promise<Object>}
     */
    async getModuleSchema(moduleType) {
        return this.request('module-schema', 'POST', { module_type: moduleType });
    }

    /**
     * Analyze a module with an AI prompt.
     *
     * @param {string} prompt     - User's instruction.
     * @param {string} moduleType - Module type.
     * @param {Object} moduleData - Current module settings.
     * @returns {Promise<Object>}
     */
    async analyzeModule(prompt, moduleType, moduleData) {
        return this.request('analyze-module', 'POST', {
            prompt,
            module_type: moduleType,
            module_data: moduleData,
        });
    }

    /**
     * Generate changes from analyzed intent.
     *
     * @param {Object} intent     - Analyzed intent from stage 1.
     * @param {string} moduleType - Module type.
     * @param {Object} moduleData - Current module settings.
     * @returns {Promise<Object>}
     */
    async generateChanges(intent, moduleType, moduleData) {
        return this.request('generate-changes', 'POST', {
            intent,
            module_type: moduleType,
            module_data: moduleData,
        });
    }

    /**
     * Validate a changeset.
     *
     * @param {Object} changeset - Changeset to validate.
     * @returns {Promise<Object>}
     */
    async validateChanges(changeset) {
        return this.request('validate-changes', 'POST', { changeset });
    }

    /**
     * Save a module snapshot for undo.
     *
     * @param {string} moduleId   - Module identifier.
     * @param {string} moduleType - Module type.
     * @param {Object} moduleData - Module data to save.
     * @param {string} label      - Optional label.
     * @returns {Promise<Object>}
     */
    async saveSnapshot(moduleId, moduleType, moduleData, label = '') {
        return this.request('save-snapshot', 'POST', {
            module_id: moduleId,
            module_type: moduleType,
            module_data: moduleData,
            label,
        });
    }

    /**
     * Rollback to a snapshot.
     *
     * @param {Object} params - { snapshot_id } or { module_id }.
     * @returns {Promise<Object>}
     */
    async rollback(params) {
        return this.request('rollback', 'POST', params);
    }

    /**
     * Get the currently selected module from the builder.
     * Delegates to the engine (Divi 4/5 specific).
     *
     * @returns {Object|null} { moduleId, moduleType, moduleData }
     */
    getSelectedModule() {
        if (this.engine && typeof this.engine.getSelectedModule === 'function') {
            return this.engine.getSelectedModule();
        }
        return null;
    }

    /**
     * Apply changes to the currently selected module in the builder.
     * Delegates to the engine.
     *
     * @param {string} moduleId - Module ID.
     * @param {Object} changes  - Key-value pairs of field changes.
     * @returns {boolean}
     */
    applyChanges(moduleId, changes) {
        if (this.engine && typeof this.engine.applyChanges === 'function') {
            return this.engine.applyChanges(moduleId, changes);
        }
        return false;
    }
}
