/**
 * Changeset Preview — Diff view for proposed field changes.
 *
 * @package Divi_Anchor_AI
 */

export class ChangesetPreview {
    /**
     * Render a changeset preview element.
     *
     * @param {Array} changes - Array of { field, label, old_value, new_value }.
     * @returns {HTMLElement}
     */
    render(changes) {
        const wrapper = document.createElement('div');
        wrapper.className = 'da-changeset-preview';

        const title = document.createElement('div');
        title.className = 'da-changeset-preview-title';
        title.textContent = 'Proposed Changes';
        wrapper.appendChild(title);

        changes.forEach((change) => {
            wrapper.appendChild(this.renderItem(change));
        });

        return wrapper;
    }

    /**
     * Render a single change item.
     *
     * @param {Object} change - { field, label, old_value, new_value }.
     * @returns {HTMLElement}
     */
    renderItem(change) {
        const row = document.createElement('div');
        row.className = 'da-changeset-item';

        const fieldEl = document.createElement('span');
        fieldEl.className = 'da-changeset-field';
        fieldEl.textContent = change.label || change.field;
        row.appendChild(fieldEl);

        if (change.old_value) {
            const oldEl = document.createElement('span');
            oldEl.className = 'da-changeset-old';
            oldEl.textContent = this.formatValue(change.old_value);
            row.appendChild(oldEl);

            const arrow = document.createElement('span');
            arrow.className = 'da-changeset-arrow';
            arrow.textContent = ' \u2192 ';
            row.appendChild(arrow);
        }

        const newEl = document.createElement('span');
        newEl.className = 'da-changeset-new';
        newEl.textContent = this.formatValue(change.new_value);
        row.appendChild(newEl);

        return row;
    }

    /**
     * Format a value for display.
     *
     * @param {string} value - Field value.
     * @returns {string}
     */
    formatValue(value) {
        if (value === 'on') return 'Yes';
        if (value === 'off') return 'No';
        if (value === '') return '(empty)';
        // Truncate long values.
        if (typeof value === 'string' && value.length > 40) {
            return value.substring(0, 37) + '...';
        }
        return String(value);
    }
}
