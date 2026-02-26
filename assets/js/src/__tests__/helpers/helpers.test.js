/**
 * Tests for shared helper functions.
 */

import {
    COMPLEX_FIELD_TYPES,
    isSimpleLocalChange,
    resolveLocalValue,
    needsAI,
    changesetToMap,
    formatMarkdown,
    formatAIError,
} from '../../helpers';

describe('helpers', () => {

    // --- COMPLEX_FIELD_TYPES ---

    describe('COMPLEX_FIELD_TYPES', () => {
        test('includes tiny_mce', () => {
            expect(COMPLEX_FIELD_TYPES).toContain('tiny_mce');
        });

        test('includes codemirror', () => {
            expect(COMPLEX_FIELD_TYPES).toContain('codemirror');
        });

        test('includes custom_css', () => {
            expect(COMPLEX_FIELD_TYPES).toContain('custom_css');
        });

        test('has exactly 3 entries', () => {
            expect(COMPLEX_FIELD_TYPES).toHaveLength(3);
        });
    });

    // --- resolveLocalValue ---

    describe('resolveLocalValue', () => {
        test('returns "on" for enable action', () => {
            expect(resolveLocalValue({ action: 'enable' })).toBe('on');
        });

        test('returns "off" for disable action', () => {
            expect(resolveLocalValue({ action: 'disable' })).toBe('off');
        });

        test('returns intent.value for change action', () => {
            expect(resolveLocalValue({ action: 'change', value: 'center' })).toBe('center');
        });

        test('returns null when no value on change', () => {
            expect(resolveLocalValue({ action: 'change', value: null })).toBeNull();
        });

        test('returns null for empty value string', () => {
            expect(resolveLocalValue({ action: 'change', value: '' })).toBeNull();
        });
    });

    // --- isSimpleLocalChange ---

    describe('isSimpleLocalChange', () => {
        const makeIntent = (overrides = {}) => ({
            action: 'change',
            confidence: 'high',
            fields: [{ fieldName: 'text_orientation', type: 'select' }],
            value: 'center',
            ...overrides,
        });

        test('returns true for simple change', () => {
            expect(isSimpleLocalChange(makeIntent())).toBe(true);
        });

        test('returns true for enable action', () => {
            expect(isSimpleLocalChange(makeIntent({
                action: 'enable',
                fields: [{ fieldName: 'use_icon', type: 'yes_no' }],
            }))).toBe(true);
        });

        test('returns true for disable action', () => {
            expect(isSimpleLocalChange(makeIntent({
                action: 'disable',
                fields: [{ fieldName: 'use_icon', type: 'yes_no' }],
            }))).toBe(true);
        });

        test('returns false for find action', () => {
            expect(isSimpleLocalChange(makeIntent({ action: 'find' }))).toBe(false);
        });

        test('returns false for low confidence', () => {
            expect(isSimpleLocalChange(makeIntent({ confidence: 'low' }))).toBe(false);
        });

        test('returns false for multiple fields', () => {
            expect(isSimpleLocalChange(makeIntent({
                fields: [
                    { fieldName: 'a', type: 'text' },
                    { fieldName: 'b', type: 'text' },
                ],
            }))).toBe(false);
        });

        test('returns false for no fields', () => {
            expect(isSimpleLocalChange(makeIntent({ fields: [] }))).toBe(false);
        });

        test('returns false for complex field type (tiny_mce)', () => {
            expect(isSimpleLocalChange(makeIntent({
                fields: [{ fieldName: 'content', type: 'tiny_mce' }],
            }))).toBe(false);
        });

        test('returns false when no value on change', () => {
            expect(isSimpleLocalChange(makeIntent({ value: null }))).toBe(false);
        });
    });

    // --- needsAI ---

    describe('needsAI', () => {
        test('returns true for change with low confidence', () => {
            expect(needsAI({
                action: 'change',
                confidence: 'low',
                fields: [{ fieldName: 'a', type: 'text' }],
                value: 'x',
            })).toBe(true);
        });

        test('returns false for find action', () => {
            expect(needsAI({ action: 'find', confidence: 'high', fields: [], value: null })).toBe(false);
        });

        test('returns false when isSimpleLocalChange', () => {
            expect(needsAI({
                action: 'enable',
                confidence: 'high',
                fields: [{ fieldName: 'use_icon', type: 'yes_no' }],
            })).toBe(false);
        });

        test('returns true for change with complex field type', () => {
            expect(needsAI({
                action: 'change',
                confidence: 'high',
                fields: [{ fieldName: 'content', type: 'tiny_mce' }],
                value: 'hello',
            })).toBe(true);
        });
    });

    // --- changesetToMap ---

    describe('changesetToMap', () => {
        test('converts changes array to map', () => {
            const changes = [
                { field: 'color', new_value: 'red' },
                { field: 'size', new_value: '14px' },
            ];
            expect(changesetToMap(changes)).toEqual({ color: 'red', size: '14px' });
        });

        test('returns empty object for empty array', () => {
            expect(changesetToMap([])).toEqual({});
        });

        test('last value wins for duplicate fields', () => {
            const changes = [
                { field: 'color', new_value: 'red' },
                { field: 'color', new_value: 'blue' },
            ];
            expect(changesetToMap(changes)).toEqual({ color: 'blue' });
        });
    });

    // --- formatMarkdown ---

    describe('formatMarkdown', () => {
        test('converts **bold** to <strong>', () => {
            expect(formatMarkdown('hello **world**')).toContain('<strong>world</strong>');
        });

        test('converts `code` to <code>', () => {
            expect(formatMarkdown('use `center`')).toContain('<code>center</code>');
        });

        test('converts newlines to <br>', () => {
            expect(formatMarkdown('line1\nline2')).toContain('<br>');
        });

        test('escapes HTML entities', () => {
            expect(formatMarkdown('<script>alert(1)</script>')).not.toContain('<script>');
        });
    });

    // --- formatAIError ---

    describe('formatAIError', () => {
        test('handles feature_disabled error', () => {
            const msg = formatAIError('analysis', new Error('feature_disabled'));
            expect(msg).toContain('not enabled');
            expect(msg).toContain('Settings');
        });

        test('handles no_api_key error', () => {
            const msg = formatAIError('generation', new Error('no_api_key'));
            expect(msg).toContain('API key');
        });

        test('handles parse_error', () => {
            const msg = formatAIError('analysis', new Error('parse_error'));
            expect(msg).toContain('unexpected response');
        });

        test('handles generic error', () => {
            const msg = formatAIError('generation', new Error('timeout'));
            expect(msg).toContain('generation failed');
            expect(msg).toContain('timeout');
        });

        test('handles string error', () => {
            const msg = formatAIError('analysis', 'some error');
            expect(msg).toContain('some error');
        });

        test('handles null error', () => {
            const msg = formatAIError('analysis', null);
            expect(msg).toBe('AI analysis failed: null');
        });
    });
});
