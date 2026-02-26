# Divi Anchor AI

AI-powered editing assistant for the Divi Visual Builder. WordPress plugin by Joel Martin.

## Build & Test

```bash
npm run build          # Webpack production build → assets/js/dist/divi-anchor-adapter.js
npm run dev            # Webpack dev watch mode
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
- `Divi5Engine.js` — Stub (not yet implemented)

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

10 module schemas: `et_pb_text`, `et_pb_button`, `et_pb_image`, `et_pb_blurb`, `et_pb_code`, `et_pb_accordion`, `et_pb_tabs`, `et_pb_slider`, `et_pb_contact_form`, `et_pb_signup`.

Structure: `{ module_type, label, category, natural_language_aliases, tabs: { general/design/advanced: { toggles: { fields } } } }`.

Field types: `text`, `tiny_mce`, `textarea`, `upload`, `yes_no`, `select`, `color`.

## Conventions

- PHP: WordPress coding standards. Prefixed classes (`Divi_Anchor_*`), no namespaces.
- JS: ES6 modules, classes, `async/await`. No framework — vanilla JS DOM manipulation.
- CSS: BEM-ish with `da-` prefix for all Guidance Mode classes. Z-index: 999900 (panel), 999990 (tooltips).
- All VB assets gated behind `is_visual_builder()` check (Divi 4 `et_core_is_fb_enabled()` or `?et_fb=1`).
- WP config object: `window.diviAnchorConfig` via `wp_localize_script` (restUrl, nonce, diviVersion, pluginVersion).

## What's Not Done Yet

- **AI apply mode**: The AI proxy and changeset engine (Phase 1) are built but not yet wired into the chat flow. Guidance Mode (Phase 2) only navigates to fields — it doesn't apply changes.
- **Divi 5 engine**: `Divi5Engine.js` is a stub. Needs React store integration when Divi 5 API stabilizes.
- **JS tests**: No JS test framework yet. Only PHP tests exist.
- **More schemas**: Divi has 40+ modules; only 10 are covered.
