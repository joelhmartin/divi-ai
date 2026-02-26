/**
 * Changeset Builder — Converts classified intent to a guidance step sequence.
 *
 * Takes an intent object from IntentClassifier and generates an ordered
 * array of UI steps for VisualFeedback to execute.
 *
 * @package Divi_Anchor_AI
 */

export class ChangesetBuilder {
    /**
     * Build a guidance plan from a classified intent.
     *
     * @param {Object} intent - Intent from IntentClassifier.classify().
     * @returns {Object} { steps: Array, message: string, success: boolean }.
     */
    buildGuidancePlan(intent) {
        // No module context.
        if (!intent.module) {
            return {
                steps: [],
                message: 'Please select a module first, then tell me what you\'d like to change.',
                success: false,
            };
        }

        // No fields matched.
        if (intent.confidence === 'none' || intent.confidence === 'low') {
            if (intent.fields.length === 0) {
                return {
                    steps: [],
                    message:
                        `I couldn't find a matching setting in the ${intent.module} module. ` +
                        'Try describing the setting differently, or check the Design and Advanced tabs.',
                    success: false,
                };
            }
        }

        // Build step sequence for the top matched field.
        const topField = intent.fields[0];
        const steps = this.buildStepsForField(topField, intent);
        const message = this.buildMessage(intent, topField);

        return {
            steps,
            message,
            success: true,
        };
    }

    /**
     * Build the step sequence to guide the user to a specific field.
     *
     * @param {Object} field  - The matched field object.
     * @param {Object} intent - The full intent object.
     * @returns {Array} Step objects for VisualFeedback.
     */
    buildStepsForField(field, intent) {
        const steps = [];

        // Step 1: Open settings modal.
        steps.push({ action: 'open-settings' });

        // Step 2: Switch to the correct tab.
        steps.push({
            action: 'switch-tab',
            tab: field.tab,
            tabIndex: this.tabNameToIndex(field.tab),
        });

        // Step 3: Expand the toggle.
        steps.push({
            action: 'expand-toggle',
            toggleName: field.toggleName,
            toggleLabel: field.toggleLabel,
        });

        // Step 4: Highlight the field with a tooltip.
        const tooltip = this.buildTooltip(field, intent);
        steps.push({
            action: 'highlight-field',
            fieldName: field.fieldName,
            tooltip,
        });

        // Step 5: If responsive and breakpoint requested, show responsive mode.
        if (field.responsive && intent.breakpoint) {
            steps.push({
                action: 'show-responsive',
                breakpoint: intent.breakpoint,
            });
        }

        return steps;
    }

    /**
     * Build the tooltip content for a field.
     *
     * @param {Object} field  - Matched field.
     * @param {Object} intent - Full intent.
     * @returns {Object} { title, body }.
     */
    buildTooltip(field, intent) {
        const title = field.label;
        let body = '';

        if (intent.action === 'change' && intent.value) {
            body = `Set this to "${intent.value}".`;
            if (field.options && field.options[intent.value]) {
                body = `Set this to "${field.options[intent.value]}".`;
            }
        } else if (intent.action === 'find') {
            body = `This is the "${field.label}" setting.`;
            if (field.options) {
                const optionNames = Object.values(field.options);
                body += ` Options: ${optionNames.join(', ')}.`;
            }
        } else if (intent.action === 'enable') {
            body = 'Switch this to "Yes" to enable it.';
        } else if (intent.action === 'disable') {
            body = 'Switch this to "No" to disable it.';
        } else {
            body = `Found in the ${this.capitalize(field.tab)} tab > ${field.toggleLabel} section.`;
        }

        if (field.responsive && intent.breakpoint) {
            body += ` (${this.capitalize(intent.breakpoint)} breakpoint)`;
        }

        return { title, body };
    }

    /**
     * Build the chat message describing what was found.
     *
     * @param {Object} intent - The classified intent.
     * @param {Object} topField - The best-matched field.
     * @returns {string}
     */
    buildMessage(intent, topField) {
        const tabName = this.capitalize(topField.tab);
        let msg = `Found **${topField.label}** in the **${tabName}** tab > **${topField.toggleLabel}** section.`;

        if (intent.action === 'change' && intent.value) {
            msg += ` You can change it to "${intent.value}" there.`;
        }

        if (topField.responsive && intent.breakpoint) {
            msg += ` Use the responsive toggle to set it for **${intent.breakpoint}** specifically.`;
        }

        // If other fields matched, mention them.
        if (intent.fields.length > 1) {
            const others = intent.fields
                .slice(1, 3)
                .map((f) => `"${f.label}"`)
                .join(', ');
            msg += `\n\nOther possible matches: ${others}.`;
        }

        return msg;
    }

    /**
     * Map tab name to index.
     *
     * @param {string} name - 'general' | 'design' | 'advanced'.
     * @returns {number}
     */
    tabNameToIndex(name) {
        const map = { general: 0, design: 1, advanced: 2, ai: 3 };
        return map[name] != null ? map[name] : 0;
    }

    /**
     * Capitalize a string.
     *
     * @param {string} str
     * @returns {string}
     */
    capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}
