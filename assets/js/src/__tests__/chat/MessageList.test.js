/**
 * Tests for MessageList.
 */

import { MessageList } from '../../chat/MessageList';

describe('MessageList', () => {
    let container;
    let messageList;

    beforeEach(() => {
        container = document.createElement('div');
        messageList = new MessageList(container);
    });

    // --- addMessage ---

    describe('addMessage', () => {
        test('adds message to internal array', () => {
            messageList.addMessage('hello', 'user');
            expect(messageList.messages).toHaveLength(1);
            expect(messageList.messages[0].text).toBe('hello');
        });

        test('renders message to container', () => {
            messageList.addMessage('hello', 'user');
            expect(container.children.length).toBe(1);
        });

        test('returns the created element', () => {
            const el = messageList.addMessage('hello', 'user');
            expect(el).toBeInstanceOf(HTMLElement);
            expect(el.className).toContain('da-message-user');
        });

        test('assigns correct type class', () => {
            messageList.addMessage('test', 'error');
            expect(container.firstChild.className).toContain('da-message-error');
        });

        test('sets data attribute for changeset meta', () => {
            messageList.addMessage('test', 'assistant', { changeset: true });
            expect(container.firstChild.getAttribute('data-has-changeset')).toBe('true');
        });

        test('records timestamp', () => {
            messageList.addMessage('test', 'user');
            expect(messageList.messages[0].timestamp).toBeInstanceOf(Date);
        });
    });

    // --- formatText ---

    describe('formatText', () => {
        test('converts **bold** to <strong>', () => {
            expect(messageList.formatText('**hello**')).toContain('<strong>hello</strong>');
        });

        test('converts `code` to <code>', () => {
            expect(messageList.formatText('`code`')).toContain('<code>code</code>');
        });

        test('converts newlines to <br>', () => {
            expect(messageList.formatText('a\nb')).toContain('<br>');
        });
    });

    // --- escapeHtml ---

    describe('escapeHtml', () => {
        test('escapes angle brackets', () => {
            const result = messageList.escapeHtml('<div>test</div>');
            expect(result).not.toContain('<div>');
            expect(result).toContain('&lt;');
        });

        test('escapes ampersands', () => {
            expect(messageList.escapeHtml('a & b')).toContain('&amp;');
        });

        test('passes plain text through', () => {
            expect(messageList.escapeHtml('hello world')).toBe('hello world');
        });
    });

    // --- showTyping / removeTyping ---

    describe('showTyping', () => {
        test('creates typing indicator', () => {
            messageList.showTyping();
            expect(container.querySelector('#da-typing')).not.toBeNull();
        });

        test('creates 3 dots', () => {
            messageList.showTyping();
            const dots = container.querySelectorAll('.da-typing-dot');
            expect(dots.length).toBe(3);
        });

        test('removes previous indicator before adding new one', () => {
            messageList.showTyping();
            messageList.showTyping();
            expect(container.querySelectorAll('#da-typing').length).toBe(1);
        });
    });

    describe('removeTyping', () => {
        test('removes typing indicator', () => {
            messageList.showTyping();
            messageList.removeTyping();
            expect(container.querySelector('#da-typing')).toBeNull();
        });

        test('does nothing if no indicator exists', () => {
            expect(() => messageList.removeTyping()).not.toThrow();
        });
    });

    // --- clear ---

    describe('clear', () => {
        test('empties messages array', () => {
            messageList.addMessage('a', 'user');
            messageList.addMessage('b', 'user');
            messageList.clear();
            expect(messageList.messages).toHaveLength(0);
        });

        test('empties container DOM', () => {
            messageList.addMessage('a', 'user');
            messageList.clear();
            expect(container.innerHTML).toBe('');
        });
    });
});
