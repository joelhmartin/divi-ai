/**
 * Tests for ChangesetPreview.
 */

import { ChangesetPreview } from '../../chat/ChangesetPreview';

describe('ChangesetPreview', () => {
    let preview;

    beforeEach(() => {
        preview = new ChangesetPreview();
    });

    // --- formatValue ---

    describe('formatValue', () => {
        test('converts "on" to "Yes"', () => {
            expect(preview.formatValue('on')).toBe('Yes');
        });

        test('converts "off" to "No"', () => {
            expect(preview.formatValue('off')).toBe('No');
        });

        test('converts empty string to "(empty)"', () => {
            expect(preview.formatValue('')).toBe('(empty)');
        });

        test('truncates long strings', () => {
            const long = 'a'.repeat(50);
            const result = preview.formatValue(long);
            expect(result.length).toBeLessThanOrEqual(40);
            expect(result).toContain('...');
        });

        test('passes through short strings', () => {
            expect(preview.formatValue('center')).toBe('center');
        });

        test('converts non-string values to string', () => {
            expect(preview.formatValue(42)).toBe('42');
        });
    });

    // --- render ---

    describe('render', () => {
        test('creates wrapper with correct class', () => {
            const el = preview.render([{ field: 'color', label: 'Color', old_value: 'red', new_value: 'blue' }]);
            expect(el.className).toBe('da-changeset-preview');
        });

        test('renders title element', () => {
            const el = preview.render([{ field: 'color', label: 'Color', old_value: '', new_value: 'red' }]);
            const title = el.querySelector('.da-changeset-preview-title');
            expect(title.textContent).toBe('Proposed Changes');
        });

        test('renders correct number of items', () => {
            const changes = [
                { field: 'a', label: 'A', old_value: '1', new_value: '2' },
                { field: 'b', label: 'B', old_value: '3', new_value: '4' },
            ];
            const el = preview.render(changes);
            expect(el.querySelectorAll('.da-changeset-item').length).toBe(2);
        });

        test('shows old value and arrow when old_value exists', () => {
            const el = preview.render([{ field: 'color', label: 'Color', old_value: 'red', new_value: 'blue' }]);
            expect(el.querySelector('.da-changeset-old')).not.toBeNull();
            expect(el.querySelector('.da-changeset-arrow')).not.toBeNull();
        });

        test('omits old value when empty', () => {
            const el = preview.render([{ field: 'color', label: 'Color', old_value: '', new_value: 'blue' }]);
            // old_value is falsy so old element should be absent
            expect(el.querySelector('.da-changeset-old')).toBeNull();
        });
    });

    // --- renderWithActions ---

    describe('renderWithActions', () => {
        test('renders Apply and Cancel buttons', () => {
            const el = preview.renderWithActions(
                [{ field: 'color', label: 'Color', old_value: '', new_value: 'red' }],
                { onApply: jest.fn(), onCancel: jest.fn() }
            );
            expect(el.querySelector('.da-changeset-btn-apply').textContent).toBe('Apply');
            expect(el.querySelector('.da-changeset-btn-cancel').textContent).toBe('Cancel');
        });

        test('calls onApply when Apply clicked', () => {
            const onApply = jest.fn();
            const el = preview.renderWithActions(
                [{ field: 'color', label: 'Color', old_value: '', new_value: 'red' }],
                { onApply, onCancel: jest.fn() }
            );
            el.querySelector('.da-changeset-btn-apply').click();
            expect(onApply).toHaveBeenCalled();
        });

        test('calls onCancel when Cancel clicked', () => {
            const onCancel = jest.fn();
            const el = preview.renderWithActions(
                [{ field: 'color', label: 'Color', old_value: '', new_value: 'red' }],
                { onApply: jest.fn(), onCancel }
            );
            el.querySelector('.da-changeset-btn-cancel').click();
            expect(onCancel).toHaveBeenCalled();
        });

        test('disables both buttons after Apply click', () => {
            const el = preview.renderWithActions(
                [{ field: 'color', label: 'Color', old_value: '', new_value: 'red' }],
                { onApply: jest.fn(), onCancel: jest.fn() }
            );
            el.querySelector('.da-changeset-btn-apply').click();
            expect(el.querySelector('.da-changeset-btn-apply').disabled).toBe(true);
            expect(el.querySelector('.da-changeset-btn-cancel').disabled).toBe(true);
        });
    });
});
