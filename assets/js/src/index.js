/**
 * Divi Anchor AI — Entry Point.
 *
 * Initializes the appropriate builder engine (Divi 4 or 5),
 * creates the adapter instance, and boots the chat panel with
 * local intent classification, guidance mode, and AI-powered changes.
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

        // Initialize Guidance + AI Mode.
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

    /* ─── Helper Functions ─── */

    /** Complex field types that should not be applied locally. */
    const COMPLEX_FIELD_TYPES = ['tiny_mce', 'codemirror', 'custom_css'];

    /**
     * Check if an intent represents a simple local change (no AI needed).
     *
     * @param {Object} intent - Classified intent.
     * @returns {boolean}
     */
    function isSimpleLocalChange(intent) {
        if (intent.action !== 'change' && intent.action !== 'enable' && intent.action !== 'disable') {
            return false;
        }
        if (intent.confidence !== 'high') {
            return false;
        }
        if (intent.fields.length !== 1) {
            return false;
        }
        if (!resolveLocalValue(intent)) {
            return false;
        }
        if (COMPLEX_FIELD_TYPES.includes(intent.fields[0].type)) {
            return false;
        }
        return true;
    }

    /**
     * Resolve the value for a local change (enable → 'on', disable → 'off', or intent.value).
     *
     * @param {Object} intent - Classified intent.
     * @returns {string|null}
     */
    function resolveLocalValue(intent) {
        if (intent.action === 'enable') return 'on';
        if (intent.action === 'disable') return 'off';
        return intent.value || null;
    }

    /**
     * Check if the intent needs the AI pipeline.
     *
     * @param {Object} intent - Classified intent.
     * @returns {boolean}
     */
    function needsAI(intent) {
        const changeActions = ['change', 'enable', 'disable'];
        return changeActions.includes(intent.action) && !isSimpleLocalChange(intent);
    }

    /**
     * Convert an array of { field, new_value } changes to a { field: value } map.
     *
     * @param {Array} changes - Array of { field, new_value }.
     * @returns {Object}
     */
    function changesetToMap(changes) {
        const map = {};
        for (const c of changes) {
            map[c.field] = c.new_value;
        }
        return map;
    }

    /**
     * Update the text content of a message element in-place.
     *
     * @param {HTMLElement} msgEl - Message element.
     * @param {string}      text  - New text content.
     */
    function replaceMessageContent(msgEl, text) {
        // Preserve any appended child elements (previews, buttons) by
        // updating only the first text node or creating one.
        const formatted = formatMarkdown(text);
        // Find or create a content span.
        let contentSpan = msgEl.querySelector('.da-msg-content');
        if (!contentSpan) {
            // Wrap existing innerHTML in a span for first-time setup.
            contentSpan = document.createElement('span');
            contentSpan.className = 'da-msg-content';
            contentSpan.innerHTML = msgEl.innerHTML;
            msgEl.innerHTML = '';
            msgEl.appendChild(contentSpan);
        }
        contentSpan.innerHTML = formatted;
    }

    /**
     * Basic markdown formatting (matches MessageList.formatText).
     *
     * @param {string} text - Raw text.
     * @returns {string} HTML string.
     */
    function formatMarkdown(text) {
        // Escape HTML.
        const div = document.createElement('div');
        div.textContent = text;
        let html = div.innerHTML;
        // **bold**
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        // `code`
        html = html.replace(/`(.+?)`/g, '<code>$1</code>');
        // newlines
        html = html.replace(/\n/g, '<br>');
        return html;
    }

    /**
     * Parse an AI-stage error into a user-friendly message.
     *
     * @param {string} stage - 'analysis' or 'generation'.
     * @param {Error}  error - The caught error.
     * @returns {string}
     */
    function formatAIError(stage, error) {
        const msg = (error && error.message) || String(error);

        if (msg.includes('feature_disabled') || msg.includes('not enabled')) {
            return `AI ${stage} is not enabled. Please enable it in Settings \u2192 Divi Anchor AI.`;
        }
        if (msg.includes('no_api_key') || msg.includes('API key')) {
            return 'No AI provider API key is configured. Please add one in Settings \u2192 Divi Anchor AI.';
        }
        if (msg.includes('parse_error') || msg.includes('unexpected response')) {
            return 'The AI returned an unexpected response. Try rephrasing your request.';
        }
        return `AI ${stage} failed: ${msg}`;
    }

    /**
     * Remove the action buttons from a changeset preview element.
     *
     * @param {HTMLElement} previewEl - The preview wrapper element.
     */
    function removeActionButtons(previewEl) {
        const actions = previewEl.querySelector('.da-changeset-actions');
        if (actions) {
            actions.remove();
        }
    }

    /* ─── Message Handlers ─── */

    /**
     * Handle guidance-only flow (Phase 2 behavior — navigate to field).
     *
     * @param {Object}           intent           - Classified intent.
     * @param {Object}           selected         - Selected module info.
     * @param {ChangesetBuilder} changesetBuilder
     * @param {ChangesetPreview} changesetPreview
     * @param {VisualFeedback}   visualFeedback
     * @param {ChatPanel}        chatPanel
     */
    async function handleGuidanceFlow(intent, selected, changesetBuilder, changesetPreview, visualFeedback, chatPanel) {
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

    /**
     * Handle a simple local change (no AI needed — instant apply).
     *
     * @param {Object}           intent           - Classified intent.
     * @param {Object}           selected         - { moduleId, moduleType, moduleData }.
     * @param {DiviBuilderAdapter} adapter
     * @param {ChangesetPreview} changesetPreview
     * @param {ChatPanel}        chatPanel
     */
    async function handleLocalChange(intent, selected, adapter, changesetPreview, chatPanel) {
        const field = intent.fields[0];
        const value = resolveLocalValue(intent);
        const oldValue = (selected.moduleData || {})[field.fieldName] || field.default || '';

        // Save snapshot (best-effort).
        try {
            await adapter.saveSnapshot(selected.moduleId, selected.moduleType, selected.moduleData, 'Before local change');
        } catch (e) {
            console.warn('[Divi Anchor AI] Snapshot save failed (non-fatal):', e);
        }

        // Apply the change.
        const applied = adapter.applyChanges(selected.moduleId, { [field.fieldName]: value });

        if (!applied) {
            chatPanel.addMessage('Failed to apply changes. The module may have been deselected.', 'error');
            return;
        }

        // Build changeset for preview.
        const changes = [{
            field: field.fieldName,
            label: field.label,
            old_value: oldValue,
            new_value: value,
        }];

        // Show success message with preview.
        const msgEl = chatPanel.addMessage(
            `Done! Updated **${field.label}** to \`${value}\`.`,
            'guidance'
        );

        const preview = changesetPreview.render(changes);
        msgEl.appendChild(preview);

        // Append undo button.
        chatPanel.appendUndoButton(msgEl, async () => {
            try {
                const result = await adapter.rollback({ module_id: selected.moduleId });
                if (result && result.data) {
                    adapter.applyChanges(selected.moduleId, result.data);
                }
            } catch (e) {
                const errMsg = (e && e.message) || 'Undo failed';
                throw new Error(errMsg);
            }
        });
    }

    /**
     * Handle an AI-powered change (two-stage pipeline with confirm/apply/undo).
     *
     * @param {string}             text             - User's original message.
     * @param {Object}             intent           - Classified intent.
     * @param {Object}             selected         - { moduleId, moduleType, moduleData }.
     * @param {DiviBuilderAdapter} adapter
     * @param {ChangesetPreview}   changesetPreview
     * @param {ChatPanel}          chatPanel
     */
    async function handleAIChange(text, intent, selected, adapter, changesetPreview, chatPanel) {
        // Show status message (will be updated in-place).
        const statusEl = chatPanel.addMessage('Analyzing your request...', 'assistant');

        // Save snapshot (best-effort).
        try {
            await adapter.saveSnapshot(selected.moduleId, selected.moduleType, selected.moduleData, 'Before AI change');
        } catch (e) {
            console.warn('[Divi Anchor AI] Snapshot save failed (non-fatal):', e);
        }

        // Stage 1: Analyze module.
        let analysis;
        try {
            analysis = await adapter.analyzeModule(text, selected.moduleType, selected.moduleData);
        } catch (e) {
            replaceMessageContent(statusEl, formatAIError('analysis', e));
            statusEl.className = 'da-message da-message-error';
            return;
        }

        // Stage 2: Generate changes.
        replaceMessageContent(statusEl, 'Generating changes...');

        let generated;
        try {
            generated = await adapter.generateChanges(analysis, selected.moduleType, selected.moduleData);
        } catch (e) {
            replaceMessageContent(statusEl, formatAIError('generation', e));
            statusEl.className = 'da-message da-message-error';
            return;
        }

        // Extract changes array from response.
        const changes = generated.changes || generated.changeset || [];
        if (!changes.length) {
            replaceMessageContent(statusEl, 'The AI did not suggest any changes. Try rephrasing your request.');
            statusEl.className = 'da-message da-message-error';
            return;
        }

        // Validate changeset.
        try {
            const validation = await adapter.validateChanges({
                module_type: selected.moduleType,
                changes,
            });
            if (validation && validation.valid === false) {
                const errors = (validation.errors || []).join(', ');
                replaceMessageContent(statusEl, `The AI generated invalid changes: ${errors}`);
                statusEl.className = 'da-message da-message-error';
                return;
            }
        } catch (e) {
            // Validation endpoint failure is non-fatal — proceed with apply.
            console.warn('[Divi Anchor AI] Validation request failed (non-fatal):', e);
        }

        // Build display changes with old values.
        const displayChanges = changes.map((c) => ({
            field: c.field,
            label: c.label || c.field,
            old_value: (selected.moduleData || {})[c.field] || '',
            new_value: c.new_value,
        }));

        // Update status with summary.
        const summary = generated.summary || `Proposing ${changes.length} change${changes.length > 1 ? 's' : ''}`;
        replaceMessageContent(statusEl, summary);
        statusEl.className = 'da-message da-message-guidance';

        // Show diff preview with Apply / Cancel buttons.
        const preview = changesetPreview.renderWithActions(displayChanges, {
            onApply: () => {
                // Apply changes to the builder.
                const changeMap = changesetToMap(changes);
                const applied = adapter.applyChanges(selected.moduleId, changeMap);

                removeActionButtons(preview);

                if (!applied) {
                    const errEl = chatPanel.addMessage(
                        'Failed to apply changes. The module may have been deselected.',
                        'error'
                    );
                    return;
                }

                const doneEl = chatPanel.addMessage('Changes applied successfully!', 'guidance');

                // Append undo button.
                chatPanel.appendUndoButton(doneEl, async () => {
                    try {
                        const result = await adapter.rollback({ module_id: selected.moduleId });
                        if (result && result.data) {
                            adapter.applyChanges(selected.moduleId, result.data);
                        }
                    } catch (e) {
                        const errMsg = (e && e.message) || 'Undo failed';
                        throw new Error(errMsg);
                    }
                });
            },
            onCancel: () => {
                removeActionButtons(preview);
                chatPanel.addMessage('Changes cancelled.', 'assistant');
            },
        });
        statusEl.appendChild(preview);
    }

    /* ─── Main Message Dispatcher ─── */

    /**
     * Handle a user message from the chat panel.
     *
     * Routes to one of three handlers:
     *  1. Guidance flow (find action or fallback)
     *  2. Local fast-path (simple, high-confidence single-field change)
     *  3. AI pipeline (complex changes requiring AI generation)
     *
     * @param {string}             text             - User's message text.
     * @param {DiviBuilderAdapter} adapter
     * @param {IntentClassifier}   classifier
     * @param {ChangesetBuilder}   changesetBuilder
     * @param {ChangesetPreview}   changesetPreview
     * @param {VisualFeedback}     visualFeedback
     * @param {ChatPanel}          chatPanel
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

        // Route to the appropriate handler.
        if (intent.action === 'find') {
            await handleGuidanceFlow(intent, selected, changesetBuilder, changesetPreview, visualFeedback, chatPanel);
        } else if (isSimpleLocalChange(intent)) {
            await handleLocalChange(intent, selected, adapter, changesetPreview, chatPanel);
        } else if (needsAI(intent)) {
            await handleAIChange(text, intent, selected, adapter, changesetPreview, chatPanel);
        } else {
            // Fallback to guidance.
            await handleGuidanceFlow(intent, selected, changesetBuilder, changesetPreview, visualFeedback, chatPanel);
        }
    }

    // Wait for the builder to be ready.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
