<?php
/**
 * Multi-provider AI proxy.
 *
 * Abstracts communication with Anthropic Claude, OpenAI, and Google Gemini.
 * Implements two-stage prompting: intent analysis → changeset generation.
 *
 * @package Divi_Anchor_AI
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Divi_Anchor_AI_Proxy {

    /** @var array Plugin settings. */
    private $settings;

    /** @var Divi_Anchor_Schema_Registry */
    private $schema_registry;

    /** Provider configuration. */
    const PROVIDERS = array(
        'anthropic' => array(
            'label'   => 'Anthropic Claude',
            'url'     => 'https://api.anthropic.com/v1/messages',
            'model'   => 'claude-sonnet-4-20250514',
            'key'     => 'anthropic_api_key',
        ),
        'openai' => array(
            'label'   => 'OpenAI',
            'url'     => 'https://api.openai.com/v1/chat/completions',
            'model'   => 'gpt-4o',
            'key'     => 'openai_api_key',
        ),
        'gemini' => array(
            'label'   => 'Google Gemini',
            'url'     => 'https://generativelanguage.googleapis.com/v1beta/models/',
            'model'   => 'gemini-2.0-flash',
            'key'     => 'gemini_api_key',
        ),
    );

    /**
     * Constructor.
     *
     * @param Divi_Anchor_Schema_Registry $schema_registry Schema registry instance.
     */
    public function __construct( Divi_Anchor_Schema_Registry $schema_registry ) {
        $this->schema_registry = $schema_registry;
        $this->settings        = get_option( 'divi_anchor_settings', array() );
    }

    /**
     * Get the active provider name.
     *
     * @return string Provider key.
     */
    public function get_active_provider() {
        return isset( $this->settings['active_provider'] ) ? $this->settings['active_provider'] : 'anthropic';
    }

    /**
     * Check if the active provider has a valid API key configured.
     *
     * @return bool
     */
    public function is_configured() {
        $provider = $this->get_active_provider();
        $key_name = self::PROVIDERS[ $provider ]['key'];
        return ! empty( $this->settings[ $key_name ] );
    }

    /**
     * Stage 1: Analyze user intent from a natural-language prompt.
     *
     * @param string $prompt       User's natural language instruction.
     * @param array  $module_data  Current module data context.
     * @param string $module_type  Module type identifier.
     * @return array|WP_Error Parsed intent or error.
     */
    public function analyze_intent( $prompt, $module_data, $module_type ) {
        $schema = $this->schema_registry->get( $module_type );
        if ( ! $schema ) {
            return new WP_Error( 'unknown_module', 'Unknown module type: ' . $module_type );
        }

        $system_prompt = $this->build_intent_system_prompt( $schema );
        $user_message  = $this->build_intent_user_message( $prompt, $module_data, $module_type );

        $response = $this->send_request( $system_prompt, $user_message );

        if ( is_wp_error( $response ) ) {
            return $response;
        }

        $parsed = json_decode( $response, true );
        if ( ! $parsed ) {
            return new WP_Error( 'parse_error', 'Failed to parse AI intent response' );
        }

        return $parsed;
    }

    /**
     * Stage 2: Generate a changeset from analyzed intent.
     *
     * @param array  $intent      Analyzed intent from stage 1.
     * @param array  $module_data Current module data.
     * @param string $module_type Module type identifier.
     * @return array|WP_Error Changeset array or error.
     */
    public function generate_changeset( $intent, $module_data, $module_type ) {
        $schema = $this->schema_registry->get( $module_type );
        if ( ! $schema ) {
            return new WP_Error( 'unknown_module', 'Unknown module type: ' . $module_type );
        }

        $system_prompt = $this->build_changeset_system_prompt( $schema );
        $user_message  = $this->build_changeset_user_message( $intent, $module_data );

        $response = $this->send_request( $system_prompt, $user_message );

        if ( is_wp_error( $response ) ) {
            return $response;
        }

        $parsed = json_decode( $response, true );
        if ( ! $parsed ) {
            return new WP_Error( 'parse_error', 'Failed to parse AI changeset response' );
        }

        return $parsed;
    }

    /**
     * Send a request to the active AI provider.
     *
     * @param string $system_prompt System prompt.
     * @param string $user_message  User message.
     * @return string|WP_Error Response text or error.
     */
    private function send_request( $system_prompt, $user_message ) {
        $provider = $this->get_active_provider();

        if ( ! isset( self::PROVIDERS[ $provider ] ) ) {
            return new WP_Error( 'invalid_provider', 'Unknown AI provider: ' . $provider );
        }

        if ( ! $this->is_configured() ) {
            return new WP_Error( 'no_api_key', 'No API key configured for provider: ' . $provider );
        }

        $key_name = self::PROVIDERS[ $provider ]['key'];
        $api_key  = $this->settings[ $key_name ];

        switch ( $provider ) {
            case 'anthropic':
                return $this->send_anthropic( $api_key, $system_prompt, $user_message );
            case 'openai':
                return $this->send_openai( $api_key, $system_prompt, $user_message );
            case 'gemini':
                return $this->send_gemini( $api_key, $system_prompt, $user_message );
            default:
                return new WP_Error( 'invalid_provider', 'Unsupported provider: ' . $provider );
        }
    }

    /**
     * Send request to Anthropic API.
     *
     * @param string $api_key       API key.
     * @param string $system_prompt System prompt.
     * @param string $user_message  User message.
     * @return string|WP_Error
     */
    private function send_anthropic( $api_key, $system_prompt, $user_message ) {
        $config = self::PROVIDERS['anthropic'];

        $response = wp_remote_post( $config['url'], array(
            'timeout' => 60,
            'headers' => array(
                'Content-Type'      => 'application/json',
                'x-api-key'         => $api_key,
                'anthropic-version' => '2023-06-01',
            ),
            'body' => wp_json_encode( array(
                'model'      => $config['model'],
                'max_tokens' => 4096,
                'system'     => $system_prompt,
                'messages'   => array(
                    array(
                        'role'    => 'user',
                        'content' => $user_message,
                    ),
                ),
            ) ),
        ) );

        if ( is_wp_error( $response ) ) {
            return $response;
        }

        $code = wp_remote_retrieve_response_code( $response );
        $body = json_decode( wp_remote_retrieve_body( $response ), true );

        if ( $code !== 200 ) {
            $msg = isset( $body['error']['message'] ) ? $body['error']['message'] : 'Anthropic API error';
            return new WP_Error( 'anthropic_error', $msg, array( 'status' => $code ) );
        }

        return isset( $body['content'][0]['text'] ) ? $body['content'][0]['text'] : '';
    }

    /**
     * Send request to OpenAI API.
     *
     * @param string $api_key       API key.
     * @param string $system_prompt System prompt.
     * @param string $user_message  User message.
     * @return string|WP_Error
     */
    private function send_openai( $api_key, $system_prompt, $user_message ) {
        $config = self::PROVIDERS['openai'];

        $response = wp_remote_post( $config['url'], array(
            'timeout' => 60,
            'headers' => array(
                'Content-Type'  => 'application/json',
                'Authorization' => 'Bearer ' . $api_key,
            ),
            'body' => wp_json_encode( array(
                'model'    => $config['model'],
                'messages' => array(
                    array(
                        'role'    => 'system',
                        'content' => $system_prompt,
                    ),
                    array(
                        'role'    => 'user',
                        'content' => $user_message,
                    ),
                ),
                'max_tokens'  => 4096,
                'temperature' => 0.2,
            ) ),
        ) );

        if ( is_wp_error( $response ) ) {
            return $response;
        }

        $code = wp_remote_retrieve_response_code( $response );
        $body = json_decode( wp_remote_retrieve_body( $response ), true );

        if ( $code !== 200 ) {
            $msg = isset( $body['error']['message'] ) ? $body['error']['message'] : 'OpenAI API error';
            return new WP_Error( 'openai_error', $msg, array( 'status' => $code ) );
        }

        return isset( $body['choices'][0]['message']['content'] ) ? $body['choices'][0]['message']['content'] : '';
    }

    /**
     * Send request to Gemini API.
     *
     * @param string $api_key       API key.
     * @param string $system_prompt System prompt.
     * @param string $user_message  User message.
     * @return string|WP_Error
     */
    private function send_gemini( $api_key, $system_prompt, $user_message ) {
        $config = self::PROVIDERS['gemini'];
        $url    = $config['url'] . $config['model'] . ':generateContent';

        $response = wp_remote_post( $url, array(
            'timeout' => 60,
            'headers' => array(
                'Content-Type'  => 'application/json',
                'x-goog-api-key' => $api_key,
            ),
            'body' => wp_json_encode( array(
                'system_instruction' => array(
                    'parts' => array(
                        array( 'text' => $system_prompt ),
                    ),
                ),
                'contents' => array(
                    array(
                        'parts' => array(
                            array( 'text' => $user_message ),
                        ),
                    ),
                ),
                'generationConfig' => array(
                    'temperature'   => 0.2,
                    'maxOutputTokens' => 4096,
                ),
            ) ),
        ) );

        if ( is_wp_error( $response ) ) {
            return $response;
        }

        $code = wp_remote_retrieve_response_code( $response );
        $body = json_decode( wp_remote_retrieve_body( $response ), true );

        if ( $code !== 200 ) {
            $msg = isset( $body['error']['message'] ) ? $body['error']['message'] : 'Gemini API error';
            return new WP_Error( 'gemini_error', $msg, array( 'status' => $code ) );
        }

        return isset( $body['candidates'][0]['content']['parts'][0]['text'] )
            ? $body['candidates'][0]['content']['parts'][0]['text']
            : '';
    }

    /**
     * Build the system prompt for intent analysis (Stage 1).
     *
     * @param array $schema Module schema.
     * @return string
     */
    private function build_intent_system_prompt( $schema ) {
        $fields_json = wp_json_encode( $this->extract_field_names( $schema ), JSON_PRETTY_PRINT );

        return <<<PROMPT
You are an intent classifier for the Divi Visual Builder. Analyze the user's editing instruction and classify it as a structured intent.

Module type: {$schema['module_type']}
Module label: {$schema['label']}
Available fields:
{$fields_json}

Respond with ONLY valid JSON in this format:
{
    "action": "modify|add|remove|rewrite",
    "module_type": "{$schema['module_type']}",
    "target_fields": ["field_name_1", "field_name_2"],
    "description": "Brief description of what the user wants",
    "confidence": 0.0-1.0
}
PROMPT;
    }

    /**
     * Build the user message for intent analysis.
     *
     * @param string $prompt      User prompt.
     * @param array  $module_data Current module data.
     * @param string $module_type Module type.
     * @return string
     */
    private function build_intent_user_message( $prompt, $module_data, $module_type ) {
        $data_json = wp_json_encode( $module_data, JSON_PRETTY_PRINT );

        return <<<MSG
User instruction: {$prompt}

Current module data ({$module_type}):
{$data_json}
MSG;
    }

    /**
     * Build the system prompt for changeset generation (Stage 2).
     *
     * @param array $schema Module schema.
     * @return string
     */
    private function build_changeset_system_prompt( $schema ) {
        $schema_json = wp_json_encode( $schema, JSON_PRETTY_PRINT );

        return <<<PROMPT
You are a changeset generator for the Divi Visual Builder. Generate precise field changes based on the analyzed intent.

Module schema:
{$schema_json}

Respond with ONLY valid JSON in this format:
{
    "module_type": "{$schema['module_type']}",
    "changes": [
        {
            "field": "field_name",
            "old_value": "current value or null",
            "new_value": "new value"
        }
    ],
    "summary": "Human-readable summary of changes"
}

Rules:
- Only modify fields that exist in the schema.
- Use the correct value format for each field type (e.g., "on"/"off" for yes_no fields).
- For select fields, only use values from the options list.
- Include old_value when modifying existing fields.
PROMPT;
    }

    /**
     * Build the user message for changeset generation.
     *
     * @param array $intent      Analyzed intent.
     * @param array $module_data Current module data.
     * @return string
     */
    private function build_changeset_user_message( $intent, $module_data ) {
        $intent_json = wp_json_encode( $intent, JSON_PRETTY_PRINT );
        $data_json   = wp_json_encode( $module_data, JSON_PRETTY_PRINT );

        return <<<MSG
Analyzed intent:
{$intent_json}

Current module data:
{$data_json}

Generate the changeset.
MSG;
    }

    /**
     * Extract all field names from a schema for prompt context.
     *
     * @param array $schema Module schema.
     * @return array Field names with types.
     */
    private function extract_field_names( $schema ) {
        $fields = array();

        if ( ! isset( $schema['tabs'] ) ) {
            return $fields;
        }

        foreach ( $schema['tabs'] as $tab_name => $tab ) {
            if ( ! isset( $tab['toggles'] ) ) {
                continue;
            }
            foreach ( $tab['toggles'] as $toggle ) {
                if ( ! isset( $toggle['fields'] ) ) {
                    continue;
                }
                foreach ( $toggle['fields'] as $name => $def ) {
                    $fields[ $name ] = array(
                        'type'  => isset( $def['type'] ) ? $def['type'] : 'text',
                        'label' => isset( $def['label'] ) ? $def['label'] : $name,
                        'tab'   => $tab_name,
                    );
                }
            }
        }

        return $fields;
    }
}
