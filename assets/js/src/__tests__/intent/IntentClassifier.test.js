/**
 * Tests for IntentClassifier.
 */

import { IntentClassifier } from '../../intent/IntentClassifier';

describe('IntentClassifier', () => {
    let classifier;

    const textSchema = {
        et_pb_text: {
            module_type: 'et_pb_text',
            label: 'Text',
            natural_language_aliases: ['text', 'paragraph', 'content block'],
            tabs: {
                general: {
                    toggles: {
                        main_content: {
                            label: 'Text',
                            fields: {
                                content: {
                                    type: 'tiny_mce',
                                    label: 'Body',
                                    default: '',
                                    responsive: false,
                                },
                            },
                        },
                    },
                },
                design: {
                    toggles: {
                        text: {
                            label: 'Text',
                            fields: {
                                text_orientation: {
                                    type: 'select',
                                    label: 'Text Alignment',
                                    default: 'left',
                                    responsive: true,
                                    options: {
                                        left: 'Left',
                                        center: 'Center',
                                        right: 'Right',
                                        justified: 'Justified',
                                    },
                                },
                            },
                        },
                        header: {
                            label: 'Title Text',
                            fields: {
                                header_level: {
                                    type: 'select',
                                    label: 'Title Heading Level',
                                    default: 'h2',
                                    responsive: false,
                                    options: {
                                        h1: 'H1', h2: 'H2', h3: 'H3',
                                        h4: 'H4', h5: 'H5', h6: 'H6',
                                    },
                                },
                            },
                        },
                    },
                },
                advanced: {
                    toggles: {
                        css: {
                            label: 'Custom CSS',
                            fields: {
                                module_class: {
                                    type: 'text',
                                    label: 'CSS Class',
                                    default: '',
                                    responsive: false,
                                },
                                module_id: {
                                    type: 'text',
                                    label: 'CSS ID',
                                    default: '',
                                    responsive: false,
                                },
                            },
                        },
                    },
                },
            },
        },
    };

    beforeEach(() => {
        classifier = new IntentClassifier();
        classifier.buildIndex(textSchema);
    });

    // --- normalize ---

    describe('normalize', () => {
        test('converts to lowercase', () => {
            expect(classifier.normalize('HELLO World')).toBe('hello world');
        });

        test('expands abbreviations', () => {
            expect(classifier.normalize('change bg color')).toBe('change background color');
        });

        test('expands multiple abbreviations', () => {
            const result = classifier.normalize('set btn txt to red');
            expect(result).toContain('button');
            expect(result).toContain('text');
        });

        test('trims whitespace', () => {
            expect(classifier.normalize('  hello  ')).toBe('hello');
        });
    });

    // --- tokenize ---

    describe('tokenize', () => {
        test('splits on whitespace', () => {
            expect(classifier.tokenize('change the color')).toEqual(['change', 'the', 'color']);
        });

        test('removes punctuation', () => {
            expect(classifier.tokenize('hello, world!')).toEqual(['hello', 'world']);
        });

        test('filters empty tokens', () => {
            expect(classifier.tokenize('  a   b  ')).toEqual(['a', 'b']);
        });
    });

    // --- detectAction ---

    describe('detectAction', () => {
        test('detects change action', () => {
            expect(classifier.detectAction('change the color')).toBe('change');
        });

        test('detects set as change', () => {
            expect(classifier.detectAction('set alignment to center')).toBe('change');
        });

        test('detects find action', () => {
            expect(classifier.detectAction('where is the alignment')).toBe('find');
        });

        test('detects enable action', () => {
            expect(classifier.detectAction('enable the toggle')).toBe('enable');
        });

        test('detects disable action', () => {
            expect(classifier.detectAction('disable the option')).toBe('disable');
        });

        test('detects turn on as enable', () => {
            expect(classifier.detectAction('turn on the feature')).toBe('enable');
        });

        test('defaults to find for unrecognized input', () => {
            expect(classifier.detectAction('the alignment option')).toBe('find');
        });
    });

    // --- detectBreakpoint ---

    describe('detectBreakpoint', () => {
        test('detects phone breakpoint', () => {
            expect(classifier.detectBreakpoint(['change', 'on', 'phone'])).toBe('phone');
        });

        test('detects mobile as phone', () => {
            expect(classifier.detectBreakpoint(['mobile', 'alignment'])).toBe('phone');
        });

        test('detects tablet breakpoint', () => {
            expect(classifier.detectBreakpoint(['tablet', 'view'])).toBe('tablet');
        });

        test('detects desktop breakpoint', () => {
            expect(classifier.detectBreakpoint(['desktop', 'only'])).toBe('desktop');
        });

        test('returns null when no breakpoint', () => {
            expect(classifier.detectBreakpoint(['change', 'color'])).toBeNull();
        });
    });

    // --- detectValue ---

    describe('detectValue', () => {
        test('detects "to <value>" pattern', () => {
            expect(classifier.detectValue('change alignment to center', ['change', 'alignment', 'to', 'center'])).toBe('center');
        });

        test('detects "= <value>" pattern', () => {
            expect(classifier.detectValue('color = red', ['color', 'red'])).toBe('red');
        });

        test('detects ": <value>" pattern', () => {
            expect(classifier.detectValue('alignment: right', ['alignment', 'right'])).toBe('right');
        });

        test('returns null when no value pattern', () => {
            expect(classifier.detectValue('where is alignment', ['where', 'is', 'alignment'])).toBeNull();
        });
    });

    // --- scoreFields ---

    describe('scoreFields', () => {
        test('scores label word match at 20', () => {
            const results = classifier.scoreFields(['alignment'], classifier.schemaIndex.et_pb_text);
            const textAlign = results.find((f) => f.fieldName === 'text_orientation');
            expect(textAlign.score).toBeGreaterThanOrEqual(20);
        });

        test('scores option value match at 30', () => {
            const results = classifier.scoreFields(['center'], classifier.schemaIndex.et_pb_text);
            const textAlign = results.find((f) => f.fieldName === 'text_orientation');
            expect(textAlign.score).toBeGreaterThanOrEqual(30);
        });

        test('returns results sorted by score descending', () => {
            const results = classifier.scoreFields(['text', 'alignment'], classifier.schemaIndex.et_pb_text);
            for (let i = 0; i < results.length - 1; i++) {
                expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
            }
        });

        test('includes field metadata in results', () => {
            const results = classifier.scoreFields(['alignment'], classifier.schemaIndex.et_pb_text);
            const textAlign = results.find((f) => f.fieldName === 'text_orientation');
            expect(textAlign.tab).toBe('design');
            expect(textAlign.toggleName).toBe('text');
            expect(textAlign.type).toBe('select');
        });
    });

    // --- classify ---

    describe('classify', () => {
        test('classifies high-confidence field match', () => {
            const result = classifier.classify('change text alignment to center', 'et_pb_text');
            expect(result.action).toBe('change');
            expect(result.value).toBe('center');
            expect(result.fields.length).toBeGreaterThan(0);
            expect(result.fields[0].fieldName).toBe('text_orientation');
            expect(result.confidence).toBe('high');
        });

        test('classifies find action', () => {
            const result = classifier.classify('where is the alignment', 'et_pb_text');
            expect(result.action).toBe('find');
        });

        test('returns low confidence for unmatched text', () => {
            const result = classifier.classify('xyzzy foobar', 'et_pb_text');
            expect(result.confidence).toBe('low');
            expect(result.fields.length).toBe(0);
        });

        test('returns none confidence without module type', () => {
            const result = classifier.classify('change color', null);
            expect(result.confidence).toBe('none');
        });

        test('preserves raw input', () => {
            const result = classifier.classify('Change BG Color', 'et_pb_text');
            expect(result.raw).toBe('Change BG Color');
        });

        test('detects breakpoint in classify', () => {
            const result = classifier.classify('change alignment on phone', 'et_pb_text');
            expect(result.breakpoint).toBe('phone');
        });

        test('returns module type in result', () => {
            const result = classifier.classify('change alignment', 'et_pb_text');
            expect(result.module).toBe('et_pb_text');
        });
    });
});
