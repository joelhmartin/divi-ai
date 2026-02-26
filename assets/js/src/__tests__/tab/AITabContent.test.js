/**
 * Tests for AITabContent.
 */

import { AITabContent } from '../../tab/AITabContent';

describe('AITabContent', () => {
    let tabContent;
    let container;
    let onSend;

    beforeEach(() => {
        onSend = jest.fn();
        tabContent = new AITabContent({ onSend });
        container = document.createElement('div');
        container.className = 'da-ai-tab-content';
        document.body.appendChild(container);
    });

    afterEach(() => {
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
    });

    // --- render ---

    describe('render', () => {
        test('renders into the container', () => {
            tabContent.render(container);
            expect(tabContent.el).toBe(container);
        });

        test('creates header element', () => {
            tabContent.render(container);
            expect(container.querySelector('.da-tab-header')).not.toBeNull();
        });

        test('creates messages area', () => {
            tabContent.render(container);
            expect(container.querySelector('.da-tab-messages')).not.toBeNull();
        });

        test('creates input area', () => {
            tabContent.render(container);
            expect(container.querySelector('.da-tab-input')).not.toBeNull();
            expect(container.querySelector('.da-tab-send-btn')).not.toBeNull();
        });

        test('shows welcome message', () => {
            tabContent.render(container);
            const messages = container.querySelectorAll('.da-message');
            expect(messages.length).toBe(1);
            expect(messages[0].textContent).toContain('Tell me what');
        });

        test('initializes messageList', () => {
            tabContent.render(container);
            expect(tabContent.messageList).not.toBeNull();
        });
    });

    // --- send ---

    describe('send', () => {
        test('calls onSend callback with text', () => {
            tabContent.render(container);
            tabContent.inputEl.value = 'change color';
            tabContent._handleSend();
            expect(onSend).toHaveBeenCalledWith('change color');
        });

        test('does not send empty input', () => {
            tabContent.render(container);
            tabContent.inputEl.value = '   ';
            tabContent._handleSend();
            expect(onSend).not.toHaveBeenCalled();
        });

        test('clears input after send', () => {
            tabContent.render(container);
            tabContent.inputEl.value = 'test';
            tabContent._handleSend();
            expect(tabContent.inputEl.value).toBe('');
        });

        test('adds user message to chat', () => {
            tabContent.render(container);
            tabContent.inputEl.value = 'hello';
            tabContent._handleSend();
            const userMessages = container.querySelectorAll('.da-message-user');
            expect(userMessages.length).toBe(1);
        });

        test('Enter key sends message', () => {
            tabContent.render(container);
            tabContent.inputEl.value = 'test message';
            const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: false });
            tabContent.inputEl.dispatchEvent(event);
            expect(onSend).toHaveBeenCalledWith('test message');
        });

        test('Shift+Enter does not send', () => {
            tabContent.render(container);
            tabContent.inputEl.value = 'test';
            const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true });
            tabContent.inputEl.dispatchEvent(event);
            expect(onSend).not.toHaveBeenCalled();
        });
    });

    // --- addMessage ---

    describe('addMessage', () => {
        test('adds a message and returns the element', () => {
            tabContent.render(container);
            const el = tabContent.addMessage('test message', 'assistant');
            expect(el).toBeInstanceOf(HTMLElement);
            expect(el.classList.contains('da-message-assistant')).toBe(true);
        });

        test('adds error messages', () => {
            tabContent.render(container);
            const el = tabContent.addMessage('error!', 'error');
            expect(el.classList.contains('da-message-error')).toBe(true);
        });

        test('adds guidance messages', () => {
            tabContent.render(container);
            const el = tabContent.addMessage('found it', 'guidance');
            expect(el.classList.contains('da-message-guidance')).toBe(true);
        });
    });

    // --- showTyping / removeTyping ---

    describe('typing indicator', () => {
        test('showTyping adds typing indicator', () => {
            tabContent.render(container);
            tabContent.showTyping();
            expect(container.querySelector('#da-typing')).not.toBeNull();
        });

        test('removeTyping removes typing indicator', () => {
            tabContent.render(container);
            tabContent.showTyping();
            tabContent.removeTyping();
            expect(container.querySelector('#da-typing')).toBeNull();
        });
    });

    // --- appendUndoButton ---

    describe('appendUndoButton', () => {
        test('appends undo button to message element', () => {
            tabContent.render(container);
            const msgEl = tabContent.addMessage('test', 'guidance');
            tabContent.appendUndoButton(msgEl, jest.fn());
            expect(msgEl.querySelector('.da-undo-btn')).not.toBeNull();
        });

        test('undo button text is "Undo"', () => {
            tabContent.render(container);
            const msgEl = tabContent.addMessage('test', 'guidance');
            tabContent.appendUndoButton(msgEl, jest.fn());
            expect(msgEl.querySelector('.da-undo-btn').textContent).toBe('Undo');
        });

        test('clicking undo calls callback and changes text', async () => {
            tabContent.render(container);
            const msgEl = tabContent.addMessage('test', 'guidance');
            const undoFn = jest.fn().mockResolvedValue();
            tabContent.appendUndoButton(msgEl, undoFn);
            const btn = msgEl.querySelector('.da-undo-btn');
            btn.click();
            // Wait for async handler.
            await new Promise((r) => setTimeout(r, 10));
            expect(undoFn).toHaveBeenCalled();
            expect(btn.textContent).toBe('Undone');
        });
    });

    // --- setModuleContext ---

    describe('setModuleContext', () => {
        test('updates header with module info', () => {
            tabContent.render(container);
            tabContent.setModuleContext({ moduleType: 'et_pb_text', moduleId: '123' });
            const info = container.querySelector('.da-tab-module-info');
            expect(info.textContent).toContain('Text Module');
            expect(info.textContent).toContain('et_pb_text');
        });

        test('handles null context', () => {
            tabContent.render(container);
            tabContent.setModuleContext(null);
            const info = container.querySelector('.da-tab-module-info');
            expect(info.textContent).toBe('');
        });
    });

    // --- clear ---

    describe('clear', () => {
        test('removes all messages', () => {
            tabContent.render(container);
            tabContent.addMessage('msg 1', 'assistant');
            tabContent.addMessage('msg 2', 'user');
            tabContent.clear();
            const messages = container.querySelectorAll('.da-message');
            expect(messages.length).toBe(0);
        });
    });

    // --- focus ---

    describe('focus', () => {
        test('focuses the input element', () => {
            tabContent.render(container);
            const spy = jest.spyOn(tabContent.inputEl, 'focus');
            tabContent.focus();
            expect(spy).toHaveBeenCalled();
        });
    });
});
