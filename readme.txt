=== Divi Anchor AI ===
Contributors: joelhmartin
Tags: divi, ai, builder, editing, assistant
Requires at least: 5.8
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

AI-powered editing assistant for the Divi Visual Builder.

== Description ==

Divi Anchor AI is an intelligent editing assistant that works inside the Divi Visual Builder. It reads, modifies, adds, and removes module content and settings through natural language instructions.

**Features:**

* Multi-provider AI support (Anthropic Claude, OpenAI, Google Gemini)
* Module schema registry with 10 core Divi modules
* Two-stage AI prompting: intent analysis and changeset generation
* Schema-validated changesets
* Module state snapshots with undo support
* REST API for builder integration
* Automatic Divi 4/5 version detection

**Requirements:**

* WordPress 5.8+
* PHP 7.4+
* Divi Theme or Divi Builder Plugin

== Installation ==

1. Upload the `divi-anchor-ai` folder to `/wp-content/plugins/`.
2. Activate the plugin through the 'Plugins' menu in WordPress.
3. Go to **Divi Anchor AI** in the admin menu to configure API keys.
4. Select your preferred AI provider and enter your API key.
5. Open a page in the Divi Visual Builder to start using the assistant.

== Changelog ==

= 1.0.0 =
* Initial release — Phase 1 foundation.
* Plugin boilerplate with update checker.
* Module schema registry (10 core modules).
* Multi-provider AI proxy (Anthropic, OpenAI, Gemini).
* Changeset validation and application.
* Module state snapshots and undo.
* REST API (7 endpoints).
* Admin settings page.
* Divi 4 builder adapter with DOM observation.
* Divi 5 engine stub.
