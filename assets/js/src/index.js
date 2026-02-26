/**
 * Divi Anchor AI — Entry Point.
 *
 * Initializes the appropriate builder engine (Divi 4 or 5),
 * creates the adapter instance, and boots the Guidance Mode
 * chat panel with local intent classification.
 *
 * @package Divi_Anchor_AI
 */

import { DiviBuilderAdapter } from './adapter/DiviBuilderAdapter';
import { Divi4Engine } from './adapter/Divi4Engine';
import { Divi5Engine } from './adapter/Divi5Engine';

// Phase 2: Guidance Mode.
import { IntentClassifier } from './intent/IntentClassifier';
import { ChangesetBuilder } from './intent/ChangesetBuilder';
import { ChatPanel } from './chat/ChatPanel';
import { ChangesetPreview } from './chat/ChangesetPreview';
import { VisualFeedback } from './feedback/VisualFeedback';

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
     * Boot the adapter and guidance mode.
     */
    async function init() {
        const engine = createEngine();
        engine.init();

        const adapter = new DiviBuilderAdapter(config, engine);

        // Expose globally for debugging and extension.
        window.diviAnchorAdapter = adapter;

        console.log(
            `[Divi Anchor AI] Adapter initialized (Divi ${config.diviVersion || 'unknown'}, plugin v${config.pluginVersion})`
        );

        // Phase 2: Initialize Guidance Mode.
        await initGuidanceMode(adapter);
    }

    /**
     * Initialize the Guidance Mode system.
     *
     * @param {DiviBuilderAdapter} adapter - The adapter instance.
     */
    async function initGuidanceMode(adapter) {
        const classifier = new IntentClassifier();
        const changesetBuilder = new ChangesetBuilder();
        const changesetPreview = new ChangesetPreview();
        const visualFeedback = new VisualFeedback();

        // Build schema index from all module schemas.
        const schemaIndex = await buildSchemaIndex(adapter);
        classifier.buildIndex(schemaIndex);

        // Create chat panel.
        const chatPanel = new ChatPanel({
            onSend: (text) => handleUserMessage(text, adapter, classifier, changesetBuilder, changesetPreview, visualFeedback, chatPanel),
        });
        chatPanel.mount();

        // Expose for debugging.
        window.diviAnchorGuidance = {
            classifier,
            changesetBuilder,
            visualFeedback,
            chatPanel,
            schemaIndex,
        };

        console.log('[Divi Anchor AI] Guidance Mode ready');
    }

    /**
     * Fetch all module schemas and build a lookup map.
     *
     * @param {DiviBuilderAdapter} adapter - The adapter instance.
     * @returns {Object} Map of module_type → schema.
     */
    async function buildSchemaIndex(adapter) {
        const schemas = {};

        try {
            const types = await adapter.getModuleTypes();

            // Fetch schemas in parallel.
            const fetches = types.map(async (typeInfo) => {
                const moduleType = typeInfo.type || typeInfo;
                try {
                    const schema = await adapter.getModuleSchema(moduleType);
                    schemas[moduleType] = schema;
                } catch (e) {
                    console.warn(`[Divi Anchor AI] Failed to load schema for ${moduleType}:`, e);
                }
            });

            await Promise.all(fetches);
        } catch (e) {
            console.warn('[Divi Anchor AI] Failed to fetch module types:', e);
        }

        console.log(`[Divi Anchor AI] Loaded ${Object.keys(schemas).length} module schemas`);
        return schemas;
    }

    /**
     * Handle a user message from the chat panel.
     *
     * @param {string} text               - User's message text.
     * @param {DiviBuilderAdapter} adapter - Adapter instance.
     * @param {IntentClassifier} classifier
     * @param {ChangesetBuilder} changesetBuilder
     * @param {ChangesetPreview} changesetPreview
     * @param {VisualFeedback} visualFeedback
     * @param {ChatPanel} chatPanel
     */
    async function handleUserMessage(text, adapter, classifier, changesetBuilder, changesetPreview, visualFeedback, chatPanel) {
        // Get the currently selected module.
        const selected = adapter.getSelectedModule();
        const moduleType = selected ? selected.moduleType : null;

        if (!moduleType) {
            chatPanel.addMessage(
                'Please select a module in the Divi Builder first, then tell me what you\'d like to change.',
                'error'
            );
            return;
        }

        // Show typing indicator.
        chatPanel.showTyping();

        // Clean up previous feedback.
        visualFeedback.cleanup();

        // Classify intent locally.
        const intent = classifier.classify(text, moduleType);

        // Remove typing indicator.
        chatPanel.removeTyping();

        // Build guidance plan.
        const plan = changesetBuilder.buildGuidancePlan(intent);

        if (!plan.success) {
            chatPanel.addMessage(plan.message, 'error');
            return;
        }

        // Show guidance message in chat.
        chatPanel.addMessage(plan.message, 'guidance');

        // If the intent includes a value and the action is 'change', show a changeset preview.
        if (intent.action === 'change' && intent.value && intent.fields.length > 0) {
            const field = intent.fields[0];
            const currentData = selected.moduleData || {};
            const preview = changesetPreview.render([
                {
                    field: field.fieldName,
                    label: field.label,
                    old_value: currentData[field.fieldName] || field.default || '',
                    new_value: intent.value,
                },
            ]);
            // Append the preview to the last message.
            const messages = chatPanel.el.querySelectorAll('.da-message');
            if (messages.length > 0) {
                messages[messages.length - 1].appendChild(preview);
            }
        }

        // Execute the visual guidance plan.
        try {
            await visualFeedback.executeGuidancePlan(plan.steps);
        } catch (e) {
            console.warn('[Divi Anchor AI] Guidance execution error:', e);
        }
    }

    // Wait for the builder to be ready.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
