/**
 * AI Tab Content — Chat interface rendered inside the Divi settings modal tab.
 *
 * Provides the same public API as ChatPanel so handler functions work unchanged.
 *
 * @package Divi_Anchor_AI
 */

import { MessageList } from '../chat/MessageList';

export class AITabContent {
    /**
     * @param {Object}   options
     * @param {Function} options.onSend - Callback when user sends a message.
     */
    constructor(options = {}) {
        this.onSend = options.onSend || (() => {});
        this.el = null;
        this.messageList = null;
        this.inputEl = null;
        this.messagesEl = null;
        this.headerEl = null;
    }

    /**
     * Render the chat UI into the given container element.
     *
     * @param {HTMLElement} container - The .da-ai-tab-content div from ModalTabInjector.
     * @returns {HTMLElement} The container element.
     */
    render(container) {
        this.el = container;
        this.el.innerHTML = this._template();

        // Cache references.
        this.headerEl = this.el.querySelector('.da-tab-header');
        this.messagesEl = this.el.querySelector('.da-tab-messages');
        this.inputEl = this.el.querySelector('.da-tab-input');
        this.sendBtn = this.el.querySelector('.da-tab-send-btn');

        // Initialize message list.
        this.messageList = new MessageList(this.messagesEl);

        // Bind events.
        this._bindEvents();

        // Welcome message.
        this.messageList.addMessage(
            'Hi! Tell me what you\'d like to change on this module.',
            'assistant'
        );

        return this.el;
    }

    /**
     * HTML template for the tab content.
     *
     * @returns {string}
     */
    _template() {
        return `
            <div class="da-tab-header">
                <span class="da-tab-module-info"></span>
            </div>
            <div class="da-tab-messages"></div>
            <div class="da-tab-input-area">
                <textarea class="da-tab-input" placeholder="Describe what you'd like to change..." rows="2"></textarea>
                <button class="da-tab-send-btn">Send</button>
            </div>
        `;
    }

    /**
     * Bind event listeners.
     */
    _bindEvents() {
        this.sendBtn.addEventListener('click', () => this._handleSend());

        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this._handleSend();
            }
        });

        // Auto-resize textarea.
        this.inputEl.addEventListener('input', () => {
            this.inputEl.style.height = 'auto';
            this.inputEl.style.height = Math.min(this.inputEl.scrollHeight, 80) + 'px';
        });
    }

    /**
     * Handle send action.
     */
    _handleSend() {
        const text = this.inputEl.value.trim();
        if (!text) return;

        this.messageList.addMessage(text, 'user');
        this.inputEl.value = '';
        this.inputEl.style.height = 'auto';

        this.onSend(text);
    }

    /**
     * Add a message to the chat.
     *
     * @param {string} text  - Message text.
     * @param {string} [type='assistant'] - Message type.
     * @param {Object} [meta] - Optional metadata.
     * @returns {HTMLElement}
     */
    addMessage(text, type = 'assistant', meta = null) {
        return this.messageList.addMessage(text, type, meta);
    }

    /**
     * Show the typing indicator.
     */
    showTyping() {
        this.messageList.showTyping();
    }

    /**
     * Remove the typing indicator.
     */
    removeTyping() {
        this.messageList.removeTyping();
    }

    /**
     * Append an undo button to a message element.
     *
     * @param {HTMLElement} msgEl  - The message element to append to.
     * @param {Function}    onUndo - Async callback when undo is clicked.
     */
    appendUndoButton(msgEl, onUndo) {
        const btn = document.createElement('button');
        btn.className = 'da-undo-btn';
        btn.textContent = 'Undo';

        btn.addEventListener('click', async () => {
            btn.disabled = true;
            btn.textContent = 'Undoing...';
            try {
                await onUndo();
                btn.textContent = 'Undone';
            } catch (e) {
                btn.textContent = 'Undo failed';
                btn.disabled = false;
            }
        });

        msgEl.appendChild(btn);
        this.messageList.scrollToBottom();
    }

    /**
     * Update the header with module context info.
     *
     * @param {Object} context - { moduleId, moduleType, moduleData }.
     */
    setModuleContext(context) {
        if (!this.headerEl) return;
        const infoEl = this.headerEl.querySelector('.da-tab-module-info');
        if (infoEl && context) {
            const label = this._formatModuleType(context.moduleType);
            infoEl.textContent = label ? `${label} (${context.moduleType})` : '';
        }
    }

    /**
     * Clear all messages (e.g. on module switch).
     */
    clear() {
        if (this.messageList) {
            this.messageList.clear();
        }
    }

    /**
     * Focus the input field when tab becomes active.
     */
    focus() {
        if (this.inputEl) {
            this.inputEl.focus();
        }
    }

    /**
     * Format a module type slug into a readable label.
     *
     * @param {string} type - e.g. 'et_pb_text'.
     * @returns {string} e.g. 'Text Module'.
     */
    _formatModuleType(type) {
        if (!type) return '';
        return type
            .replace(/^et_pb_/, '')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase())
            + ' Module';
    }
}
