/**
 * Visual Feedback — Orchestrates step-by-step DOM guidance in Divi 4 VB.
 *
 * Executes a guidance plan by sequentially performing DOM actions
 * like opening settings, switching tabs, expanding toggles,
 * highlighting fields, and showing tooltips.
 *
 * @package Divi_Anchor_AI
 */

import { FieldHighlighter } from './FieldHighlighter';
import { GuidanceOverlay } from './GuidanceOverlay';

export class VisualFeedback {
    constructor() {
        this.highlighter = new FieldHighlighter();
        this.overlay = new GuidanceOverlay();
        this.executing = false;
    }

    /**
     * Execute a guidance plan step by step.
     *
     * @param {Array} steps - Array of step objects from ChangesetBuilder.
     * @returns {Promise<boolean>} True if all steps executed.
     */
    async executeGuidancePlan(steps) {
        if (this.executing) {
            this.cleanup();
        }

        this.executing = true;

        try {
            for (let i = 0; i < steps.length; i++) {
                if (!this.executing) break;
                await this.executeStep(steps[i], i, steps.length);
                if (i < steps.length - 1) {
                    await this.delay(400);
                }
            }
        } finally {
            this.executing = false;
        }

        return true;
    }

    /**
     * Execute a single guidance step.
     *
     * @param {Object} step - { action, ... } step object.
     * @param {number} index - Current step index.
     * @param {number} total - Total number of steps.
     * @returns {Promise<boolean>}
     */
    async executeStep(step, index, total) {
        switch (step.action) {
            case 'open-settings':
                return this.openSettingsModal(step);
            case 'switch-tab':
                return this.switchTab(step);
            case 'expand-toggle':
                return this.expandToggle(step);
            case 'highlight-field':
                return this.highlightField(step, index, total);
            case 'show-responsive':
                return this.showResponsive(step);
            case 'show-tooltip':
                return this.showTooltip(step);
            default:
                return false;
        }
    }

    /**
     * Open the module settings modal.
     *
     * @param {Object} step - { action: 'open-settings' }.
     * @returns {boolean}
     */
    openSettingsModal(step) {
        // Strategy 1: Use ET_Builder Events.
        if (
            typeof window.ET_Builder !== 'undefined' &&
            window.ET_Builder.Events
        ) {
            try {
                window.ET_Builder.Events.trigger('et-modal-settings-open');
                return true;
            } catch (e) {
                // Fall through to strategy 2.
            }
        }

        // Strategy 2: Click the gear icon on the selected module.
        const selected = document.querySelector('.et_pb_selected');
        if (selected) {
            const gear = selected.querySelector(
                '.et-fb-settings-icon, [data-action="settings"]'
            );
            if (gear) {
                gear.click();
                return true;
            }
        }

        return false;
    }

    /**
     * Switch to a settings tab (general/design/advanced).
     *
     * @param {Object} step - { action: 'switch-tab', tab: 'design', tabIndex: 1 }.
     * @returns {boolean}
     */
    switchTab(step) {
        const tabIndex = step.tabIndex != null ? step.tabIndex : this.tabNameToIndex(step.tab);
        const tabs = document.querySelectorAll(
            '.et-fb-tabs__item, .et-fb-settings-tab'
        );

        if (tabs.length > tabIndex) {
            tabs[tabIndex].click();
            tabs[tabIndex].classList.add('da-active-tab-indicator');
            setTimeout(() => {
                tabs[tabIndex].classList.remove('da-active-tab-indicator');
            }, 3000);
            return true;
        }
        return false;
    }

    /**
     * Expand a toggle section.
     *
     * @param {Object} step - { action: 'expand-toggle', toggleName: 'text', toggleLabel: 'Text' }.
     * @returns {boolean}
     */
    expandToggle(step) {
        // Strategy 1: data-toggle attribute.
        let toggle = document.querySelector(`[data-toggle="${step.toggleName}"]`);
        if (toggle) {
            this.ensureToggleOpen(toggle);
            toggle.classList.add('da-toggle-highlight');
            setTimeout(() => toggle.classList.remove('da-toggle-highlight'), 4000);
            return true;
        }

        // Strategy 2: Match toggle by label text.
        if (step.toggleLabel) {
            const headers = document.querySelectorAll(
                '.et-fb-form__toggle-header, .et-fb-option-toggle-title'
            );
            for (const header of headers) {
                if (
                    header.textContent.trim().toLowerCase() ===
                    step.toggleLabel.toLowerCase()
                ) {
                    toggle = header.closest(
                        '.et-fb-form__toggle, .et-fb-option-toggle'
                    );
                    if (toggle) {
                        this.ensureToggleOpen(toggle);
                        toggle.classList.add('da-toggle-highlight');
                        setTimeout(
                            () => toggle.classList.remove('da-toggle-highlight'),
                            4000
                        );
                        return true;
                    }
                }
            }
        }

        return false;
    }

    /**
     * Ensure a toggle element is in its open state.
     *
     * @param {HTMLElement} toggleEl - The toggle container.
     */
    ensureToggleOpen(toggleEl) {
        // Divi toggles typically use an 'et-fb-form__toggle--closed' class.
        if (toggleEl.classList.contains('et-fb-form__toggle--closed')) {
            const header = toggleEl.querySelector('.et-fb-form__toggle-header');
            if (header) {
                header.click();
            }
        }
    }

    /**
     * Highlight a specific field and show a tooltip.
     *
     * @param {Object} step - { action: 'highlight-field', fieldName, tooltip }.
     * @param {number} index - Step index.
     * @param {number} total - Total steps.
     * @returns {boolean}
     */
    highlightField(step, index, total) {
        const el = this.highlighter.highlight(step.fieldName, {
            duration: 8000,
            glow: true,
        });

        if (!el) return false;

        if (step.tooltip) {
            this.overlay.show(el, step.tooltip.title || '', step.tooltip.body || '', {
                autoDismiss: 8000,
            });
        }

        return true;
    }

    /**
     * Show responsive mode indicator.
     *
     * @param {Object} step - { action: 'show-responsive', breakpoint }.
     * @returns {boolean}
     */
    showResponsive(step) {
        // Look for the responsive toggle icon near the field.
        const responsiveBtn = document.querySelector(
            '.et-fb-responsive-toggle, [data-responsive-toggle]'
        );
        if (responsiveBtn) {
            responsiveBtn.click();
            return true;
        }
        return false;
    }

    /**
     * Show a standalone tooltip (no field highlight).
     *
     * @param {Object} step - { action: 'show-tooltip', target, title, body }.
     * @returns {boolean}
     */
    showTooltip(step) {
        let targetEl;
        if (step.target) {
            targetEl = document.querySelector(step.target);
        }
        if (!targetEl) {
            // Default: show near the settings modal.
            targetEl = document.querySelector('.et-fb-settings-modal') || document.body;
        }

        this.overlay.show(targetEl, step.title || '', step.body || '', {
            autoDismiss: 6000,
        });
        return true;
    }

    /**
     * Map tab name to index.
     *
     * @param {string} name - 'general' | 'design' | 'advanced'.
     * @returns {number}
     */
    tabNameToIndex(name) {
        const map = { general: 0, design: 1, advanced: 2 };
        return map[name] != null ? map[name] : 0;
    }

    /**
     * Promise-based delay.
     *
     * @param {number} ms - Milliseconds.
     * @returns {Promise<void>}
     */
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Clean up all active feedback.
     */
    cleanup() {
        this.executing = false;
        this.highlighter.clearAll();
        this.overlay.dismiss();
    }
}
