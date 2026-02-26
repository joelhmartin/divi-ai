/**
 * Guidance Overlay — Positioned tooltips near highlighted fields.
 *
 * @package Divi_Anchor_AI
 */

export class GuidanceOverlay {
    constructor() {
        this.activeOverlay = null;
        this.scrim = null;
    }

    /**
     * Show a tooltip near a target element.
     *
     * @param {HTMLElement} targetEl - The element to anchor the tooltip to.
     * @param {string} title        - Tooltip title text.
     * @param {string} body         - Tooltip body text.
     * @param {Object} [options]    - { showScrim, autoDismiss (ms), position }.
     * @returns {HTMLElement} The tooltip element.
     */
    show(targetEl, title, body, options = {}) {
        const {
            showScrim = false,
            autoDismiss = 8000,
            position = 'auto',
        } = options;

        this.dismiss();

        if (showScrim) {
            this.showScrim();
        }

        const overlay = document.createElement('div');
        overlay.className = 'da-guidance-overlay';
        this.activeOverlay = overlay;

        const tooltip = document.createElement('div');
        tooltip.className = 'da-guidance-tooltip';

        if (title) {
            const titleEl = document.createElement('div');
            titleEl.className = 'da-guidance-tooltip-title';
            titleEl.textContent = title;
            tooltip.appendChild(titleEl);
        }

        if (body) {
            const bodyEl = document.createElement('div');
            bodyEl.className = 'da-guidance-tooltip-body';
            bodyEl.textContent = body;
            tooltip.appendChild(bodyEl);
        }

        const dismissBtn = document.createElement('button');
        dismissBtn.className = 'da-guidance-dismiss';
        dismissBtn.textContent = '\u00d7';
        dismissBtn.addEventListener('click', () => this.dismiss());
        tooltip.appendChild(dismissBtn);

        overlay.appendChild(tooltip);
        document.body.appendChild(overlay);

        this.positionTooltip(tooltip, targetEl, position);

        if (autoDismiss > 0) {
            setTimeout(() => this.dismiss(), autoDismiss);
        }

        return overlay;
    }

    /**
     * Position the tooltip relative to the target element.
     *
     * @param {HTMLElement} tooltip  - The tooltip element.
     * @param {HTMLElement} targetEl - The anchor element.
     * @param {string} preferred     - 'auto' | 'top' | 'bottom' | 'left' | 'right'.
     */
    positionTooltip(tooltip, targetEl, preferred) {
        const rect = targetEl.getBoundingClientRect();
        const pos = preferred === 'auto' ? this.bestPosition(rect) : preferred;

        tooltip.classList.add(`da-tooltip-${pos}`);

        const gap = 12;
        let top, left;

        switch (pos) {
            case 'top':
                top = rect.top - tooltip.offsetHeight - gap;
                left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2;
                break;
            case 'bottom':
                top = rect.bottom + gap;
                left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2;
                break;
            case 'left':
                top = rect.top + rect.height / 2 - tooltip.offsetHeight / 2;
                left = rect.left - tooltip.offsetWidth - gap;
                break;
            case 'right':
                top = rect.top + rect.height / 2 - tooltip.offsetHeight / 2;
                left = rect.right + gap;
                break;
            default:
                top = rect.bottom + gap;
                left = rect.left;
        }

        // Clamp to viewport.
        top = Math.max(8, Math.min(top, window.innerHeight - tooltip.offsetHeight - 8));
        left = Math.max(8, Math.min(left, window.innerWidth - tooltip.offsetWidth - 8));

        tooltip.style.position = 'fixed';
        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
    }

    /**
     * Determine the best tooltip position based on viewport space.
     *
     * @param {DOMRect} rect - Bounding rect of the target element.
     * @returns {string} 'top' | 'bottom' | 'left' | 'right'.
     */
    bestPosition(rect) {
        const spaceAbove = rect.top;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceLeft = rect.left;
        const spaceRight = window.innerWidth - rect.right;

        // Prefer bottom if enough space, otherwise top.
        if (spaceBelow >= 120) return 'bottom';
        if (spaceAbove >= 120) return 'top';
        if (spaceRight >= 280) return 'right';
        if (spaceLeft >= 280) return 'left';
        return 'bottom';
    }

    /**
     * Show a semi-transparent scrim behind the tooltip.
     */
    showScrim() {
        this.removeScrim();
        this.scrim = document.createElement('div');
        this.scrim.className = 'da-guidance-scrim';
        document.body.appendChild(this.scrim);
    }

    /**
     * Remove the scrim.
     */
    removeScrim() {
        if (this.scrim) {
            this.scrim.remove();
            this.scrim = null;
        }
    }

    /**
     * Dismiss the current overlay and scrim.
     */
    dismiss() {
        if (this.activeOverlay) {
            this.activeOverlay.remove();
            this.activeOverlay = null;
        }
        this.removeScrim();
    }
}
