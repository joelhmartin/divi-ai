/**
 * Intent Classifier — Local NLP: keyword/alias matching against schemas.
 *
 * Classifies user natural language input against schema data to determine
 * which module fields the user wants to find or change.
 * No AI API calls — all classification is local.
 *
 * @package Divi_Anchor_AI
 */

export class IntentClassifier {
    constructor() {
        this.schemaIndex = {};
        this.abbreviations = {
            bg: 'background',
            btn: 'button',
            txt: 'text',
            clr: 'color',
            colour: 'color',
            img: 'image',
            pic: 'image',
            photo: 'image',
            lnk: 'link',
            href: 'link',
            hdr: 'header',
            fnt: 'font',
            sz: 'size',
            wd: 'width',
            ht: 'height',
            pd: 'padding',
            mg: 'margin',
            bdr: 'border',
            rad: 'radius',
            alg: 'alignment',
            ctr: 'center',
            lft: 'left',
            rgt: 'right',
            desc: 'description',
            nav: 'navigation',
            ico: 'icon',
        };

        this.actionKeywords = {
            change: 'change',
            set: 'change',
            make: 'change',
            update: 'change',
            modify: 'change',
            edit: 'change',
            where: 'find',
            find: 'find',
            show: 'find',
            locate: 'find',
            'how do i': 'find',
            open: 'find',
            enable: 'enable',
            turn_on: 'enable',
            activate: 'enable',
            disable: 'disable',
            turn_off: 'disable',
            hide: 'disable',
            remove: 'disable',
        };

        this.breakpointKeywords = {
            phone: 'phone',
            mobile: 'phone',
            tablet: 'tablet',
            ipad: 'tablet',
            desktop: 'desktop',
            laptop: 'desktop',
            responsive: null, // general responsive reference
        };
    }

    /**
     * Build the search index from all schemas.
     *
     * @param {Object} schemas - Map of module_type → schema object.
     */
    buildIndex(schemas) {
        this.schemaIndex = {};

        for (const [moduleType, schema] of Object.entries(schemas)) {
            const entry = {
                moduleType,
                label: schema.label || '',
                aliases: schema.natural_language_aliases || [],
                fields: [],
            };

            // Walk all tabs → toggles → fields.
            if (schema.tabs) {
                for (const [tabName, tabData] of Object.entries(schema.tabs)) {
                    if (!tabData.toggles) continue;
                    for (const [toggleName, toggleData] of Object.entries(tabData.toggles)) {
                        if (!toggleData.fields) continue;
                        for (const [fieldName, fieldData] of Object.entries(toggleData.fields)) {
                            entry.fields.push({
                                fieldName,
                                label: fieldData.label || fieldName,
                                type: fieldData.type || 'text',
                                tab: tabName,
                                toggleName,
                                toggleLabel: toggleData.label || toggleName,
                                options: fieldData.options || null,
                                responsive: fieldData.responsive || false,
                                default: fieldData.default,
                            });
                        }
                    }
                }
            }

            this.schemaIndex[moduleType] = entry;
        }
    }

    /**
     * Classify user input against the schema of the selected module.
     *
     * @param {string} text          - User's natural language input.
     * @param {string} [moduleType]  - Currently selected module type.
     * @returns {Object} Intent object: { action, module, fields[], breakpoint, value, confidence, raw }.
     */
    classify(text, moduleType = null) {
        const raw = text;
        const normalized = this.normalize(text);
        const tokens = this.tokenize(normalized);

        // Detect action.
        const action = this.detectAction(normalized);

        // Detect breakpoint.
        const breakpoint = this.detectBreakpoint(tokens);

        // Detect value from input.
        const value = this.detectValue(normalized, tokens);

        // If no module selected, try to detect module type from text.
        if (!moduleType) {
            moduleType = this.detectModuleType(tokens);
        }

        if (!moduleType || !this.schemaIndex[moduleType]) {
            return {
                action,
                module: moduleType,
                fields: [],
                breakpoint,
                value,
                confidence: 'none',
                raw,
            };
        }

        // Score fields.
        const scoredFields = this.scoreFields(tokens, this.schemaIndex[moduleType]);
        const matchedFields = scoredFields.filter((f) => f.score >= 15);

        // Determine confidence.
        let confidence;
        if (matchedFields.length > 0 && matchedFields[0].score >= 50) {
            confidence = 'high';
        } else if (matchedFields.length > 0) {
            confidence = 'medium';
        } else if (moduleType) {
            confidence = 'low';
        } else {
            confidence = 'none';
        }

        return {
            action,
            module: moduleType,
            fields: matchedFields.map((f) => ({
                fieldName: f.fieldName,
                label: f.label,
                tab: f.tab,
                toggleName: f.toggleName,
                toggleLabel: f.toggleLabel,
                type: f.type,
                options: f.options,
                responsive: f.responsive,
                score: f.score,
            })),
            breakpoint,
            value,
            confidence,
            raw,
        };
    }

    /**
     * Normalize input: lowercase, expand abbreviations.
     *
     * @param {string} text - Raw input.
     * @returns {string}
     */
    normalize(text) {
        let normalized = text.toLowerCase().trim();

        // Expand abbreviations.
        for (const [abbr, full] of Object.entries(this.abbreviations)) {
            const regex = new RegExp(`\\b${abbr}\\b`, 'g');
            normalized = normalized.replace(regex, full);
        }

        return normalized;
    }

    /**
     * Tokenize normalized text.
     *
     * @param {string} text - Normalized text.
     * @returns {string[]}
     */
    tokenize(text) {
        return text
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter((t) => t.length > 0);
    }

    /**
     * Detect the action type from input.
     *
     * @param {string} normalized - Normalized text.
     * @returns {string} 'change' | 'find' | 'enable' | 'disable' | 'unknown'.
     */
    detectAction(normalized) {
        for (const [keyword, action] of Object.entries(this.actionKeywords)) {
            if (normalized.includes(keyword.replace(/_/g, ' '))) {
                return action;
            }
        }
        return 'find';
    }

    /**
     * Detect breakpoint from tokens.
     *
     * @param {string[]} tokens - Tokenized input.
     * @returns {string|null} 'phone' | 'tablet' | 'desktop' | null.
     */
    detectBreakpoint(tokens) {
        for (const token of tokens) {
            if (this.breakpointKeywords[token] !== undefined) {
                return this.breakpointKeywords[token];
            }
        }
        return null;
    }

    /**
     * Detect a target value from the input (e.g., "to center", "= red").
     *
     * @param {string} normalized - Normalized text.
     * @param {string[]} tokens - Tokenized input.
     * @returns {string|null}
     */
    detectValue(normalized, tokens) {
        // Pattern: "to <value>"
        const toMatch = normalized.match(/\bto\s+(\w+)/);
        if (toMatch) return toMatch[1];

        // Pattern: "= <value>" or ": <value>"
        const eqMatch = normalized.match(/[=:]\s*(\w+)/);
        if (eqMatch) return eqMatch[1];

        return null;
    }

    /**
     * Try to detect module type from tokens.
     *
     * @param {string[]} tokens - Tokenized input.
     * @returns {string|null}
     */
    detectModuleType(tokens) {
        const inputStr = tokens.join(' ');

        for (const [moduleType, entry] of Object.entries(this.schemaIndex)) {
            // Check label match.
            if (tokens.includes(entry.label.toLowerCase())) {
                return moduleType;
            }
            // Check aliases.
            for (const alias of entry.aliases) {
                if (inputStr.includes(alias.toLowerCase())) {
                    return moduleType;
                }
            }
        }
        return null;
    }

    /**
     * Score all fields in a module against the user's tokens.
     *
     * Scoring:
     * - Label word overlap: 20 per matching word.
     * - Field name overlap: 15 per matching token.
     * - Option value match: 30 if a token matches an option key or value.
     * - Toggle label overlap: 10 per matching word.
     *
     * @param {string[]} tokens - Tokenized input.
     * @param {Object} moduleEntry - Schema index entry.
     * @returns {Array} Sorted array of { fieldName, label, score, ... }.
     */
    scoreFields(tokens, moduleEntry) {
        const results = [];

        for (const field of moduleEntry.fields) {
            let score = 0;
            const labelWords = field.label.toLowerCase().split(/\s+/);
            const fieldNameParts = field.fieldName.toLowerCase().split('_');

            // Label word overlap.
            for (const token of tokens) {
                if (labelWords.includes(token)) {
                    score += 20;
                }
            }

            // Field name overlap.
            for (const token of tokens) {
                if (fieldNameParts.includes(token)) {
                    score += 15;
                }
            }

            // Option value match.
            if (field.options) {
                for (const token of tokens) {
                    for (const [key, val] of Object.entries(field.options)) {
                        if (key.toLowerCase() === token || val.toLowerCase() === token) {
                            score += 30;
                        }
                    }
                }
            }

            // Toggle label overlap.
            const toggleWords = field.toggleLabel.toLowerCase().split(/\s+/);
            for (const token of tokens) {
                if (toggleWords.includes(token)) {
                    score += 10;
                }
            }

            results.push({
                ...field,
                score,
            });
        }

        // Sort by score descending.
        results.sort((a, b) => b.score - a.score);
        return results;
    }
}
