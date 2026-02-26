/**
 * Chat Panel — Floating, draggable, collapsible panel (vanilla JS DOM).
 *
 * @package Divi_Anchor_AI
 */

import { MessageList } from './MessageList';

export class ChatPanel {
    /**
     * @param {Object} options
     * @param {Function} options.onSend - Callback when user sends a message.
     */
    constructor(options = {}) {
        this.onSend = options.onSend || (() => {});
        this.el = null;
        this.toggleBtn = null;
        this.messageList = null;
        this.inputEl = null;
        this.collapsed = false;
        this.dragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.storageKey = 'da_chat_panel_position';
    }

    /**
     * Create and mount the chat panel to the DOM.
     *
     * @returns {HTMLElement} The panel element.
     */
    mount() {
        // Prevent duplicate panels if script runs twice in the same document.
        const existing = document.querySelector('.da-chat-panel');
        if (existing) {
            existing.remove();
        }

        this.el = document.createElement('div');
        this.el.className = 'da-chat-panel';
        this.el.innerHTML = this.template();

        document.body.appendChild(this.el);

        // Cache references.
        this.headerEl = this.el.querySelector('.da-chat-header');
        this.messagesEl = this.el.querySelector('.da-chat-messages');
        this.inputEl = this.el.querySelector('.da-chat-input');
        this.sendBtn = this.el.querySelector('.da-chat-send-btn');

        // Initialize message list.
        this.messageList = new MessageList(this.messagesEl);

        // Bind events.
        this.bindEvents();

        // Restore saved position.
        this.restorePosition();

        // Create the persistent toggle button.
        this.mountToggleButton();

        // Welcome message.
        this.messageList.addMessage(
            'Hi! Select a Divi module and tell me what you\'d like to change. ' +
            'I\'ll guide you to the right setting.',
            'assistant'
        );

        return this.el;
    }

    /**
     * HTML template for the panel.
     *
     * @returns {string}
     */
    template() {
        return `
            <div class="da-chat-header">
                <span class="da-chat-header-title">Divi Anchor AI</span>
                <div class="da-chat-header-actions">
                    <button class="da-chat-header-btn da-btn-collapse" title="Collapse">&minus;</button>
                    <button class="da-chat-header-btn da-btn-close" title="Close">&times;</button>
                </div>
            </div>
            <div class="da-chat-messages"></div>
            <div class="da-chat-input-area">
                <textarea class="da-chat-input" placeholder="Describe what you want to change..." rows="1"></textarea>
                <button class="da-chat-send-btn">Send</button>
            </div>
        `;
    }

    /**
     * Bind all event listeners.
     */
    bindEvents() {
        // Send button.
        this.sendBtn.addEventListener('click', () => this.handleSend());

        // Enter key sends (Shift+Enter for newline).
        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        });

        // Auto-resize textarea.
        this.inputEl.addEventListener('input', () => {
            this.inputEl.style.height = 'auto';
            this.inputEl.style.height = Math.min(this.inputEl.scrollHeight, 80) + 'px';
        });

        // Collapse button.
        this.el.querySelector('.da-btn-collapse').addEventListener('click', () => {
            this.toggleCollapse();
        });

        // Close button.
        this.el.querySelector('.da-btn-close').addEventListener('click', () => {
            this.hide();
        });

        // Drag support on header.
        this.headerEl.addEventListener('mousedown', (e) => this.onDragStart(e));
        document.addEventListener('mousemove', (e) => this.onDragMove(e));
        document.addEventListener('mouseup', () => this.onDragEnd());
    }

    /**
     * Handle send button click.
     */
    handleSend() {
        const text = this.inputEl.value.trim();
        if (!text) return;

        this.messageList.addMessage(text, 'user');
        this.inputEl.value = '';
        this.inputEl.style.height = 'auto';

        this.onSend(text);
    }

    /**
     * Add an assistant message to the chat.
     *
     * @param {string} text - Message text.
     * @param {string} [type='assistant'] - Message type.
     * @param {Object} [meta] - Optional metadata.
     * @returns {HTMLElement}
     */
    addMessage(text, type = 'assistant', meta = null) {
        return this.messageList.addMessage(text, type, meta);
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
     * Toggle collapsed state.
     */
    toggleCollapse() {
        this.collapsed = !this.collapsed;
        this.el.classList.toggle('da-collapsed', this.collapsed);
        const btn = this.el.querySelector('.da-btn-collapse');
        btn.innerHTML = this.collapsed ? '&#x25A1;' : '&minus;';
        btn.title = this.collapsed ? 'Expand' : 'Collapse';
    }

    /**
     * Create and mount the persistent toggle button.
     */
    mountToggleButton() {
        // Remove any existing toggle button.
        const existing = document.querySelector('.da-chat-toggle');
        if (existing) {
            existing.remove();
        }

        this.toggleBtn = document.createElement('button');
        this.toggleBtn.className = 'da-chat-toggle da-hidden';
        this.toggleBtn.title = 'Open Divi Anchor AI';
        this.toggleBtn.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;

        this.toggleBtn.addEventListener('click', () => {
            this.show();
        });

        document.body.appendChild(this.toggleBtn);
    }

    /**
     * Show the panel, hide the toggle button.
     */
    show() {
        this.el.classList.remove('da-hidden');
        if (this.toggleBtn) {
            this.toggleBtn.classList.add('da-hidden');
        }
    }

    /**
     * Hide the panel, show the toggle button.
     */
    hide() {
        this.el.classList.add('da-hidden');
        if (this.toggleBtn) {
            this.toggleBtn.classList.remove('da-hidden');
        }
    }

    /**
     * Check if the panel is visible.
     *
     * @returns {boolean}
     */
    isVisible() {
        return !this.el.classList.contains('da-hidden');
    }

    /* ─── Drag Support ─── */

    onDragStart(e) {
        // Don't drag if clicking buttons.
        if (e.target.closest('.da-chat-header-btn')) return;

        this.dragging = true;
        this.el.classList.add('da-dragging');
        const rect = this.el.getBoundingClientRect();
        this.dragOffset.x = e.clientX - rect.left;
        this.dragOffset.y = e.clientY - rect.top;
        e.preventDefault();
    }

    onDragMove(e) {
        if (!this.dragging) return;

        const x = e.clientX - this.dragOffset.x;
        const y = e.clientY - this.dragOffset.y;

        // Clamp to viewport.
        const maxX = window.innerWidth - this.el.offsetWidth;
        const maxY = window.innerHeight - this.el.offsetHeight;

        this.el.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
        this.el.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
        this.el.style.right = 'auto';
        this.el.style.bottom = 'auto';
    }

    onDragEnd() {
        if (!this.dragging) return;
        this.dragging = false;
        this.el.classList.remove('da-dragging');
        this.savePosition();
    }

    /**
     * Save current position to localStorage.
     */
    savePosition() {
        try {
            const rect = this.el.getBoundingClientRect();
            localStorage.setItem(this.storageKey, JSON.stringify({
                left: rect.left,
                top: rect.top,
            }));
        } catch (e) {
            // localStorage may be unavailable.
        }
    }

    /**
     * Restore saved position from localStorage.
     */
    restorePosition() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (!saved) return;

            const pos = JSON.parse(saved);
            // Validate position is still within viewport.
            if (
                pos.left >= 0 &&
                pos.top >= 0 &&
                pos.left < window.innerWidth - 100 &&
                pos.top < window.innerHeight - 50
            ) {
                this.el.style.left = pos.left + 'px';
                this.el.style.top = pos.top + 'px';
                this.el.style.right = 'auto';
                this.el.style.bottom = 'auto';
            }
        } catch (e) {
            // Ignore invalid saved data.
        }
    }

    /**
     * Unmount the panel and toggle button from the DOM.
     */
    destroy() {
        if (this.el && this.el.parentNode) {
            this.el.parentNode.removeChild(this.el);
        }
        if (this.toggleBtn && this.toggleBtn.parentNode) {
            this.toggleBtn.parentNode.removeChild(this.toggleBtn);
        }
    }
}
