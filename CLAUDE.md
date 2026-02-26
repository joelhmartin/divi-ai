# Divi Anchor AI

AI-powered editing assistant for the Divi Visual Builder. WordPress plugin by Joel Martin.

## Build & Test

```bash
npm run build          # Webpack production build → assets/js/dist/divi-anchor-adapter.js
npm run dev            # Webpack dev watch mode
npm test               # Jest — 153 JS tests (intent, helpers, chat, adapter)
npm run test:watch     # Jest watch mode
vendor/bin/phpunit     # 25 PHP tests (schema registry, changeset validation, REST API)
```

No CSS preprocessor — stylesheets are plain CSS loaded via `wp_enqueue_style`.

## Architecture

### PHP Backend (`includes/`)

Singleton orchestrator pattern. `Divi_Anchor::get_instance()` wires all dependencies.

| Class | Role |
|---|---|
| `class-divi-anchor.php` | Singleton orchestrator, DI, hook registration |
| `class-version-adapter.php` | Divi 4/5 version detection |
| `class-schema-registry.php` | Loads JSON schemas from `schemas/core/`, filter hook for third-party |
| `class-ai-proxy.php` | Multi-provider AI proxy (Anthropic, OpenAI, Gemini) |
| `class-changeset.php` | Changeset validation + apply against schemas |
| `class-snapshot.php` | Transient-based undo stack (24h TTL, max 20 per module) |
| `class-rest-api.php` | 7 REST endpoints under `divi-anchor/v1/` |
| `class-admin.php` | WP admin settings page |

REST namespace: `divi-anchor/v1/`. All endpoints require `edit_pages` capability.

### JS Frontend (`assets/js/src/`)

Single webpack entry point (`index.js`) bundles everything to `assets/js/dist/divi-anchor-adapter.js`.

**Adapter layer** (`adapter/`):
- `DiviBuilderAdapter.js` — REST client + delegates to engine
- `Divi4Engine.js` — Backbone model access, MutationObserver for selection tracking
- `Divi5Engine.js` — `@divi/data` store integration: select/dispatch for module attrs, subscribe for selection tracking, DOM fallback

**Shared helpers** (`helpers.js`):
- Extracted from `index.js` — `isSimpleLocalChange`, `resolveLocalValue`, `needsAI`, `changesetToMap`, `formatMarkdown`, `formatAIError`, `COMPLEX_FIELD_TYPES`

**Guidance Mode** (`chat/`, `feedback/`, `intent/`):
- `IntentClassifier.js` — Local NLP: tokenize → abbreviation expansion → score fields against schema (no API calls)
- `ChangesetBuilder.js` — Intent → step sequence (open-settings → switch-tab → expand-toggle → highlight-field)
- `ChatPanel.js` — Floating, draggable panel (vanilla JS DOM, position persisted to localStorage)
- `MessageList.js` — Message rendering with auto-scroll
- `ChangesetPreview.js` — Diff view for proposed changes
- `VisualFeedback.js` — Executes step sequences with 400ms delays
- `FieldHighlighter.js` — 4-strategy fallback: `data-field-name` → `data-option_name` → `name` → label text
- `GuidanceOverlay.js` — Positioned tooltips with auto-dismiss

### Schema Files (`schemas/core/`)

50 module schemas covering all major Divi modules: text, media, layout, forms, action, and fullwidth variants.

Structure: `{ module_type, label, category, natural_language_aliases, tabs: { general/design/advanced: { toggles: { fields } } } }`.

Field types: `text`, `tiny_mce`, `textarea`, `upload`, `yes_no`, `select`, `color`.

## Conventions

- PHP: WordPress coding standards. Prefixed classes (`Divi_Anchor_*`), no namespaces.
- JS: ES6 modules, classes, `async/await`. No framework — vanilla JS DOM manipulation.
- CSS: BEM-ish with `da-` prefix for all Guidance Mode classes. Z-index: 999900 (panel), 999990 (tooltips).
- All VB assets gated behind `is_visual_builder()` check (Divi 5 `et_builder_is_visual_builder()` / `?et_bfb=1`, Divi 4 `et_core_is_fb_enabled()` / `?et_fb=1`).
- WP config object: `window.diviAnchorConfig` via `wp_localize_script` (restUrl, nonce, diviVersion, pluginVersion).

## What's Not Done Yet

- **Divi 5 real-world testing**: The Divi 5 engine is implemented against the documented `@divi/data` API but has not been tested against a live Divi 5 install. Selector names (`getEditingModuleId`, etc.) may need adjustment once the Divi 5 API stabilizes.
- **End-to-end tests**: JS tests cover units (153 tests); no integration/E2E tests exercising the full chat → classify → apply flow in a browser.
- **Remaining schemas**: 50 of ~70+ total Divi modules are covered. Missing: individual slide/tab items, specialty sections, some WooCommerce modules, and third-party module schemas.
- **AI apply wiring in Divi 5**: The AI pipeline (Phase 3) works with the Divi 4 engine; the Divi 5 engine supports `applyChanges()` but the full AI flow has not been verified end-to-end in Divi 5.
