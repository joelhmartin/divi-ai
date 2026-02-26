/**
 * Tests for ChatPanel.
 */

import { ChatPanel } from '../../chat/ChatPanel';

describe('ChatPanel', () => {
    let panel;
    let onSend;

    beforeEach(() => {
        onSend = jest.fn();
        panel = new ChatPanel({ onSend });
    });

    afterEach(() => {
        if (panel.el && panel.el.parentNode) {
            panel.destroy();
        }
    });

    // --- mount ---

    describe('mount', () => {
        test('creates panel element', () => {
            panel.mount();
            expect(panel.el).toBeInstanceOf(HTMLElement);
            expect(panel.el.className).toBe('da-chat-panel');
        });

        test('appends to document body', () => {
            panel.mount();
            expect(document.body.contains(panel.el)).toBe(true);
        });

        test('initializes messageList', () => {
            panel.mount();
            expect(panel.messageList).not.toBeNull();
        });

        test('shows welcome message', () => {
            panel.mount();
            const messages = panel.el.querySelectorAll('.da-message');
            expect(messages.length).toBe(1);
            expect(messages[0].textContent).toContain('Select a Divi module');
        });
    });

    // --- handleSend ---

    describe('handleSend', () => {
        test('calls onSend callback with text', () => {
            panel.mount();
            panel.inputEl.value = 'change color';
            panel.handleSend();
            expect(onSend).toHaveBeenCalledWith('change color');
        });

        test('does not send empty input', () => {
            panel.mount();
            panel.inputEl.value = '   ';
            panel.handleSend();
            expect(onSend).not.toHaveBeenCalled();
        });

        test('clears input after send', () => {
            panel.mount();
            panel.inputEl.value = 'test';
            panel.handleSend();
            expect(panel.inputEl.value).toBe('');
        });

        test('adds user message to chat', () => {
            panel.mount();
            panel.inputEl.value = 'hello';
            panel.handleSend();
            const userMessages = panel.el.querySelectorAll('.da-message-user');
            expect(userMessages.length).toBe(1);
        });
    });

    // --- addMessage ---

    describe('addMessage', () => {
        test('delegates to messageList', () => {
            panel.mount();
            const el = panel.addMessage('test', 'assistant');
            expect(el).toBeInstanceOf(HTMLElement);
        });
    });

    // --- appendUndoButton ---

    describe('appendUndoButton', () => {
        test('appends undo button to message element', () => {
            panel.mount();
            const msgEl = panel.addMessage('test', 'guidance');
            panel.appendUndoButton(msgEl, jest.fn());
            expect(msgEl.querySelector('.da-undo-btn')).not.toBeNull();
        });

        test('undo button text is "Undo"', () => {
            panel.mount();
            const msgEl = panel.addMessage('test', 'guidance');
            panel.appendUndoButton(msgEl, jest.fn());
            expect(msgEl.querySelector('.da-undo-btn').textContent).toBe('Undo');
        });
    });

    // --- toggleCollapse ---

    describe('toggleCollapse', () => {
        test('toggles collapsed state', () => {
            panel.mount();
            expect(panel.collapsed).toBe(false);
            panel.toggleCollapse();
            expect(panel.collapsed).toBe(true);
            expect(panel.el.classList.contains('da-collapsed')).toBe(true);
        });

        test('toggles back', () => {
            panel.mount();
            panel.toggleCollapse();
            panel.toggleCollapse();
            expect(panel.collapsed).toBe(false);
        });
    });

    // --- show / hide ---

    describe('show / hide', () => {
        test('hide adds da-hidden class', () => {
            panel.mount();
            panel.hide();
            expect(panel.el.classList.contains('da-hidden')).toBe(true);
        });

        test('show removes da-hidden class', () => {
            panel.mount();
            panel.hide();
            panel.show();
            expect(panel.el.classList.contains('da-hidden')).toBe(false);
        });

        test('isVisible returns correct state', () => {
            panel.mount();
            expect(panel.isVisible()).toBe(true);
            panel.hide();
            expect(panel.isVisible()).toBe(false);
        });
    });

    // --- destroy ---

    describe('destroy', () => {
        test('removes panel from DOM', () => {
            panel.mount();
            panel.destroy();
            expect(document.body.contains(panel.el)).toBe(false);
        });
    });
});
