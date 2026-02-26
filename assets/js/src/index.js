/**
 * Divi Anchor AI — Entry Point.
 *
 * Initializes the appropriate builder engine (Divi 4 or 5)
 * and creates the adapter instance.
 *
 * @package Divi_Anchor_AI
 */

import { DiviBuilderAdapter } from './adapter/DiviBuilderAdapter';
import { Divi4Engine } from './adapter/Divi4Engine';
import { Divi5Engine } from './adapter/Divi5Engine';

(function () {
    'use strict';

    const config = window.diviAnchorConfig;

    if (!config) {
        return;
    }

    /**
     * Select the appropriate engine based on detected Divi version.
     *
     * @returns {Object} Engine instance.
     */
    function createEngine() {
        if (config.diviVersion === '5') {
            return new Divi5Engine();
        }
        return new Divi4Engine();
    }

    /**
     * Boot the adapter.
     */
    function init() {
        const engine = createEngine();
        engine.init();

        const adapter = new DiviBuilderAdapter(config, engine);

        // Expose globally for debugging and extension.
        window.diviAnchorAdapter = adapter;

        console.log(
            `[Divi Anchor AI] Adapter initialized (Divi ${config.diviVersion || 'unknown'}, plugin v${config.pluginVersion})`
        );
    }

    // Wait for the builder to be ready.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
