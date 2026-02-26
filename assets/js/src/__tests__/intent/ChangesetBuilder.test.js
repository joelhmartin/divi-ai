/**
 * Tests for ChangesetBuilder.
 */

import { ChangesetBuilder } from '../../intent/ChangesetBuilder';

describe('ChangesetBuilder', () => {
    let builder;

    beforeEach(() => {
        builder = new ChangesetBuilder();
    });

    // --- buildGuidancePlan ---

    describe('buildGuidancePlan', () => {
        test('returns failure when no module', () => {
            const result = builder.buildGuidancePlan({
                module: null,
                fields: [],
                confidence: 'none',
                action: 'find',
            });
            expect(result.success).toBe(false);
            expect(result.message).toContain('select a module');
        });

        test('returns failure for no fields with low confidence', () => {
            const result = builder.buildGuidancePlan({
                module: 'et_pb_text',
                fields: [],
                confidence: 'low',
                action: 'find',
            });
            expect(result.success).toBe(false);
            expect(result.message).toContain('couldn\'t find');
        });

        test('builds successful plan for matched field', () => {
            const result = builder.buildGuidancePlan({
                module: 'et_pb_text',
                fields: [{
                    fieldName: 'text_orientation',
                    label: 'Text Alignment',
                    tab: 'design',
                    toggleName: 'text',
                    toggleLabel: 'Text',
                    type: 'select',
                    options: { left: 'Left', center: 'Center' },
                    responsive: false,
                }],
                confidence: 'high',
                action: 'find',
            });
            expect(result.success).toBe(true);
            expect(result.steps.length).toBeGreaterThan(0);
            expect(result.message).toContain('Text Alignment');
        });

        test('includes responsive step when breakpoint provided', () => {
            const result = builder.buildGuidancePlan({
                module: 'et_pb_text',
                fields: [{
                    fieldName: 'text_orientation',
                    label: 'Text Alignment',
                    tab: 'design',
                    toggleName: 'text',
                    toggleLabel: 'Text',
                    type: 'select',
                    responsive: true,
                }],
                confidence: 'high',
                action: 'change',
                value: 'center',
                breakpoint: 'phone',
            });
            const responsiveStep = result.steps.find((s) => s.action === 'show-responsive');
            expect(responsiveStep).toBeDefined();
            expect(responsiveStep.breakpoint).toBe('phone');
        });
    });

    // --- buildStepsForField ---

    describe('buildStepsForField', () => {
        const field = {
            fieldName: 'text_orientation',
            label: 'Text Alignment',
            tab: 'design',
            toggleName: 'text',
            toggleLabel: 'Text',
            type: 'select',
            responsive: false,
        };

        test('generates 4 steps for standard field', () => {
            const steps = builder.buildStepsForField(field, { action: 'find' });
            expect(steps).toHaveLength(4);
            expect(steps[0].action).toBe('open-settings');
            expect(steps[1].action).toBe('switch-tab');
            expect(steps[2].action).toBe('expand-toggle');
            expect(steps[3].action).toBe('highlight-field');
        });

        test('includes correct tab index', () => {
            const steps = builder.buildStepsForField(field, { action: 'find' });
            expect(steps[1].tabIndex).toBe(1); // design = 1
        });

        test('includes toggle name in expand step', () => {
            const steps = builder.buildStepsForField(field, { action: 'find' });
            expect(steps[2].toggleName).toBe('text');
        });
    });

    // --- buildTooltip ---

    describe('buildTooltip', () => {
        const field = {
            label: 'Text Alignment',
            options: { left: 'Left', center: 'Center' },
            responsive: false,
        };

        test('builds change tooltip with value', () => {
            const tooltip = builder.buildTooltip(field, { action: 'change', value: 'center' });
            expect(tooltip.title).toBe('Text Alignment');
            expect(tooltip.body).toContain('Center');
        });

        test('builds find tooltip with options', () => {
            const tooltip = builder.buildTooltip(field, { action: 'find' });
            expect(tooltip.body).toContain('Left');
            expect(tooltip.body).toContain('Center');
        });

        test('builds enable tooltip', () => {
            const tooltip = builder.buildTooltip({ label: 'Use Icon', responsive: false }, { action: 'enable' });
            expect(tooltip.body).toContain('Yes');
        });

        test('builds disable tooltip', () => {
            const tooltip = builder.buildTooltip({ label: 'Use Icon', responsive: false }, { action: 'disable' });
            expect(tooltip.body).toContain('No');
        });
    });

    // --- buildMessage ---

    describe('buildMessage', () => {
        test('includes field label and tab name', () => {
            const msg = builder.buildMessage(
                { action: 'find', fields: [{ label: 'Alignment' }] },
                { label: 'Text Alignment', tab: 'design', toggleLabel: 'Text' }
            );
            expect(msg).toContain('Text Alignment');
            expect(msg).toContain('Design');
        });

        test('mentions other matches', () => {
            const msg = builder.buildMessage(
                { action: 'find', fields: [
                    { label: 'Text Alignment' },
                    { label: 'CSS Class' },
                    { label: 'CSS ID' },
                ] },
                { label: 'Text Alignment', tab: 'design', toggleLabel: 'Text' }
            );
            expect(msg).toContain('CSS Class');
        });
    });

    // --- tabNameToIndex ---

    describe('tabNameToIndex', () => {
        test('maps general to 0', () => expect(builder.tabNameToIndex('general')).toBe(0));
        test('maps design to 1', () => expect(builder.tabNameToIndex('design')).toBe(1));
        test('maps advanced to 2', () => expect(builder.tabNameToIndex('advanced')).toBe(2));
        test('defaults to 0 for unknown', () => expect(builder.tabNameToIndex('unknown')).toBe(0));
    });

    // --- capitalize ---

    describe('capitalize', () => {
        test('capitalizes first letter', () => expect(builder.capitalize('design')).toBe('Design'));
        test('handles empty string', () => expect(builder.capitalize('')).toBe(''));
        test('handles null', () => expect(builder.capitalize(null)).toBe(''));
    });
});
