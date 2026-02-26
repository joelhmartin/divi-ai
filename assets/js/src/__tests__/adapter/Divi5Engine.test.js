/**
 * Tests for Divi5Engine.
 */

import { Divi5Engine } from '../../adapter/Divi5Engine';

describe('Divi5Engine', () => {
    let engine;
    let mockSelect;
    let mockDispatch;

    beforeEach(() => {
        // Mock the Divi 5 global store API.
        mockSelect = {
            getModuleType: jest.fn(),
            getModuleAttrs: jest.fn(),
            getEditingModuleId: jest.fn(),
        };
        mockDispatch = {
            editModuleAttribute: jest.fn(),
        };

        window.divi = {
            data: {
                select: jest.fn().mockReturnValue(mockSelect),
                dispatch: jest.fn().mockReturnValue(mockDispatch),
                subscribe: jest.fn().mockReturnValue(jest.fn()), // returns unsubscribe
            },
        };

        engine = new Divi5Engine();
    });

    afterEach(() => {
        engine.destroy();
        delete window.divi;
    });

    // --- init ---

    describe('init', () => {
        test('initializes when window.divi.data exists', () => {
            engine.init();
            expect(window.divi.data.select).toHaveBeenCalledWith('divi/edit-post');
            expect(window.divi.data.dispatch).toHaveBeenCalledWith('divi/edit-post');
        });

        test('subscribes to store changes', () => {
            engine.init();
            expect(window.divi.data.subscribe).toHaveBeenCalled();
        });

        test('handles missing window.divi gracefully', () => {
            delete window.divi;
            expect(() => engine.init()).not.toThrow();
        });

        test('handles missing window.divi.data gracefully', () => {
            window.divi = {};
            expect(() => engine.init()).not.toThrow();
        });
    });

    // --- getSelectedModule ---

    describe('getSelectedModule', () => {
        test('returns null when not initialized', () => {
            expect(engine.getSelectedModule()).toBeNull();
        });

        test('returns null when no module selected', () => {
            engine.init();
            mockSelect.getEditingModuleId.mockReturnValue(null);
            expect(engine.getSelectedModule()).toBeNull();
        });

        test('returns module data when module is selected', () => {
            engine.init();
            // Simulate a selection via the store subscription
            engine.selectedModuleId = 'mod-123';
            mockSelect.getModuleType.mockReturnValue('et_pb_text');
            mockSelect.getModuleAttrs.mockReturnValue({ content: 'hello' });

            const result = engine.getSelectedModule();
            expect(result).toEqual({
                moduleId: 'mod-123',
                moduleType: 'et_pb_text',
                moduleData: { content: 'hello' },
            });
        });
    });

    // --- applyChanges ---

    describe('applyChanges', () => {
        test('returns false when not initialized', () => {
            expect(engine.applyChanges('mod-1', { color: 'red' })).toBe(false);
        });

        test('calls editModuleAttribute for each change', () => {
            engine.init();
            engine.applyChanges('mod-1', { color: 'red', size: '14px' });
            expect(mockDispatch.editModuleAttribute).toHaveBeenCalledWith('mod-1', 'color', 'red');
            expect(mockDispatch.editModuleAttribute).toHaveBeenCalledWith('mod-1', 'size', '14px');
        });

        test('returns true on success', () => {
            engine.init();
            expect(engine.applyChanges('mod-1', { color: 'red' })).toBe(true);
        });
    });

    // --- destroy ---

    describe('destroy', () => {
        test('calls unsubscribe if subscribed', () => {
            const unsubscribe = jest.fn();
            window.divi.data.subscribe.mockReturnValue(unsubscribe);
            engine.init();
            engine.destroy();
            expect(unsubscribe).toHaveBeenCalled();
        });

        test('clears selectedModuleId', () => {
            engine.init();
            engine.selectedModuleId = 'mod-1';
            engine.destroy();
            expect(engine.selectedModuleId).toBeNull();
        });

        test('does not throw if never initialized', () => {
            expect(() => engine.destroy()).not.toThrow();
        });
    });
});
