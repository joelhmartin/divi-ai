/**
 * Message List — Renders messages with auto-scroll and text formatting.
 *
 * @package Divi_Anchor_AI
 */

export class MessageList {
    /**
     * @param {HTMLElement} container - The .da-chat-messages element.
     */
    constructor(container) {
        this.container = container;
        this.messages = [];
    }

    /**
     * Add a message and render it.
     *
     * @param {string} text  - Message text.
     * @param {string} type  - 'user' | 'assistant' | 'error' | 'guidance'.
     * @param {Object} [meta] - Optional metadata (changeset, steps, etc.).
     * @returns {HTMLElement} The created message element.
     */
    addMessage(text, type = 'assistant', meta = null) {
        const msg = { text, type, meta, timestamp: new Date() };
        this.messages.push(msg);

        const el = this.renderMessage(msg);
        this.container.appendChild(el);
        this.scrollToBottom();
        return el;
    }

    /**
     * Render a single message to a DOM element.
     *
     * @param {Object} msg - Message object.
     * @returns {HTMLElement}
     */
    renderMessage(msg) {
        const el = document.createElement('div');
        el.className = `da-message da-message-${msg.type}`;
        el.innerHTML = this.formatText(msg.text);

        if (msg.meta && msg.meta.changeset) {
            el.setAttribute('data-has-changeset', 'true');
        }

        return el;
    }

    /**
     * Format plain text with basic markup support.
     * Supports **bold**, `code`, and newlines.
     *
     * @param {string} text - Raw message text.
     * @returns {string} HTML string.
     */
    formatText(text) {
        let html = this.escapeHtml(text);
        // **bold**
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        // `code`
        html = html.replace(/`(.+?)`/g, '<code>$1</code>');
        // newlines
        html = html.replace(/\n/g, '<br>');
        return html;
    }

    /**
     * Escape HTML entities.
     *
     * @param {string} str - Raw string.
     * @returns {string}
     */
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Show the typing indicator.
     *
     * @returns {HTMLElement}
     */
    showTyping() {
        this.removeTyping();
        const el = document.createElement('div');
        el.className = 'da-typing-indicator';
        el.id = 'da-typing';
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('span');
            dot.className = 'da-typing-dot';
            el.appendChild(dot);
        }
        this.container.appendChild(el);
        this.scrollToBottom();
        return el;
    }

    /**
     * Remove the typing indicator.
     */
    removeTyping() {
        const existing = this.container.querySelector('#da-typing');
        if (existing) {
            existing.remove();
        }
    }

    /**
     * Scroll the message container to the bottom.
     */
    scrollToBottom() {
        requestAnimationFrame(() => {
            this.container.scrollTop = this.container.scrollHeight;
        });
    }

    /**
     * Clear all messages.
     */
    clear() {
        this.messages = [];
        this.container.innerHTML = '';
    }
}
