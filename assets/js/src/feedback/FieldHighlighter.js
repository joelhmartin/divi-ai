/**
 * Field Highlighter — Highlights fields in the Divi 4 settings modal.
 *
 * Uses a 4-strategy fallback chain to locate field elements in the DOM.
 *
 * @package Divi_Anchor_AI
 */

export class FieldHighlighter {
    constructor() {
        this.activeHighlights = [];
    }

    /**
     * Highlight a field in the settings modal.
     *
     * @param {string} fieldName - The schema field name (e.g., 'text_orientation').
     * @param {Object} [options] - { duration: ms, glow: boolean }.
     * @returns {HTMLElement|null} The highlighted element, or null if not found.
     */
    highlight(fieldName, options = {}) {
        const { duration = 6000, glow = true } = options;

        const el = this.findFieldElement(fieldName);
        if (!el) {
            return null;
        }

        el.classList.add('da-field-highlight');
        if (glow) {
            el.classList.add('da-field-highlight-glow');
        }

        this.activeHighlights.push(el);

        // Scroll into view smoothly.
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Auto-remove after duration.
        if (duration > 0) {
            setTimeout(() => {
                this.removeHighlight(el);
            }, duration);
        }

        return el;
    }

    /**
     * Find a field element using a 4-strategy fallback chain.
     *
     * Strategy 1: [data-field-name="fieldName"]
     * Strategy 2: [data-option_name="fieldName"]
     * Strategy 3: [name="fieldName"]
     * Strategy 4: Label text match
     *
     * @param {string} fieldName - Field name to find.
     * @returns {HTMLElement|null}
     */
    findFieldElement(fieldName) {
        // Strategy 1: data-field-name attribute.
        let el = document.querySelector(`[data-field-name="${fieldName}"]`);
        if (el) return this.getFieldContainer(el);

        // Strategy 2: data-option_name attribute.
        el = document.querySelector(`[data-option_name="${fieldName}"]`);
        if (el) return this.getFieldContainer(el);

        // Strategy 3: name attribute.
        el = document.querySelector(
            `.et-fb-settings-modal [name="${fieldName}"], .et-fb-option--${fieldName}`
        );
        if (el) return this.getFieldContainer(el);

        // Strategy 4: Label text match.
        el = this.findByLabelText(fieldName);
        if (el) return this.getFieldContainer(el);

        return null;
    }

    /**
     * Find a field by searching label text.
     *
     * @param {string} fieldName - Field name to humanize and search.
     * @returns {HTMLElement|null}
     */
    findByLabelText(fieldName) {
        const humanized = fieldName.replace(/_/g, ' ').toLowerCase();
        const labels = document.querySelectorAll(
            '.et-fb-form__label, .et-fb-option-label, label'
        );

        for (const label of labels) {
            if (label.textContent.trim().toLowerCase().includes(humanized)) {
                // Return the parent option container.
                const container = label.closest(
                    '.et-fb-form__group, .et-fb-option, .et_pb_option'
                );
                return container || label;
            }
        }
        return null;
    }

    /**
     * Walk up from a field input to its option container.
     *
     * @param {HTMLElement} el - The input/select element.
     * @returns {HTMLElement} The container to highlight.
     */
    getFieldContainer(el) {
        const container = el.closest(
            '.et-fb-form__group, .et-fb-option, .et_pb_option'
        );
        return container || el;
    }

    /**
     * Remove highlight from a specific element.
     *
     * @param {HTMLElement} el - Element to un-highlight.
     */
    removeHighlight(el) {
        el.classList.remove('da-field-highlight', 'da-field-highlight-glow');
        this.activeHighlights = this.activeHighlights.filter((e) => e !== el);
    }

    /**
     * Clear all active highlights.
     */
    clearAll() {
        this.activeHighlights.forEach((el) => {
            el.classList.remove('da-field-highlight', 'da-field-highlight-glow');
        });
        this.activeHighlights = [];
    }
}
