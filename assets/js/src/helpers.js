/**
 * Shared helper functions for Divi Anchor AI.
 *
 * Extracted from the main entry point for testability.
 *
 * @package Divi_Anchor_AI
 */

/** Complex field types that should not be applied locally. */
export const COMPLEX_FIELD_TYPES = ['tiny_mce', 'codemirror', 'custom_css'];

/**
 * Check if an intent represents a simple local change (no AI needed).
 *
 * @param {Object} intent - Classified intent.
 * @returns {boolean}
 */
export function isSimpleLocalChange(intent) {
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
export function resolveLocalValue(intent) {
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
export function needsAI(intent) {
    const changeActions = ['change', 'enable', 'disable'];
    return changeActions.includes(intent.action) && !isSimpleLocalChange(intent);
}

/**
 * Convert an array of { field, new_value } changes to a { field: value } map.
 *
 * @param {Array} changes - Array of { field, new_value }.
 * @returns {Object}
 */
export function changesetToMap(changes) {
    const map = {};
    for (const c of changes) {
        map[c.field] = c.new_value;
    }
    return map;
}

/**
 * Basic markdown formatting (matches MessageList.formatText).
 *
 * @param {string} text - Raw text.
 * @returns {string} HTML string.
 */
export function formatMarkdown(text) {
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
export function formatAIError(stage, error) {
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
