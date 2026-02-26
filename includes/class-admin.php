<?php
/**
 * Admin settings page.
 *
 * Provides the "Divi Anchor AI" settings page under the WordPress admin menu
 * with API key management, provider selection, and feature toggles.
 *
 * @package Divi_Anchor_AI
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Divi_Anchor_Admin {

    /** @var Divi_Anchor_Version_Adapter */
    private $version_adapter;

    /** @var Divi_Anchor_AI_Proxy */
    private $ai_proxy;

    /** @var string Option name for settings. */
    const OPTION_KEY = 'divi_anchor_settings';

    /**
     * Constructor.
     *
     * @param Divi_Anchor_Version_Adapter $version_adapter Version adapter.
     * @param Divi_Anchor_AI_Proxy        $ai_proxy        AI proxy.
     */
    public function __construct( Divi_Anchor_Version_Adapter $version_adapter, Divi_Anchor_AI_Proxy $ai_proxy ) {
        $this->version_adapter = $version_adapter;
        $this->ai_proxy        = $ai_proxy;
    }

    /**
     * Register hooks.
     */
    public function init() {
        add_action( 'admin_menu', array( $this, 'add_menu_page' ) );
        add_action( 'admin_init', array( $this, 'register_settings' ) );
        add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_styles' ) );
    }

    /**
     * Add the admin menu page.
     */
    public function add_menu_page() {
        add_menu_page(
            __( 'Divi Anchor AI', 'divi-anchor-ai' ),
            __( 'Divi Anchor AI', 'divi-anchor-ai' ),
            'manage_options',
            'divi-anchor-ai',
            array( $this, 'render_settings_page' ),
            'dashicons-admin-generic',
            99
        );
    }

    /**
     * Register plugin settings.
     */
    public function register_settings() {
        register_setting( 'divi_anchor_settings_group', self::OPTION_KEY, array(
            'sanitize_callback' => array( $this, 'sanitize_settings' ),
        ) );
    }

    /**
     * Sanitize settings on save.
     *
     * @param array $input Raw input.
     * @return array Sanitized settings.
     */
    public function sanitize_settings( $input ) {
        $sanitized = array();

        // API keys.
        $sanitized['anthropic_api_key'] = isset( $input['anthropic_api_key'] )
            ? sanitize_text_field( $input['anthropic_api_key'] ) : '';
        $sanitized['openai_api_key']    = isset( $input['openai_api_key'] )
            ? sanitize_text_field( $input['openai_api_key'] ) : '';
        $sanitized['gemini_api_key']    = isset( $input['gemini_api_key'] )
            ? sanitize_text_field( $input['gemini_api_key'] ) : '';

        // Active provider.
        $valid_providers = array( 'anthropic', 'openai', 'gemini' );
        $sanitized['active_provider'] = isset( $input['active_provider'] ) && in_array( $input['active_provider'], $valid_providers, true )
            ? $input['active_provider'] : 'anthropic';

        // Feature toggles.
        $sanitized['feature_analysis']  = ! empty( $input['feature_analysis'] ) ? 'on' : 'off';
        $sanitized['feature_changes']   = ! empty( $input['feature_changes'] ) ? 'on' : 'off';
        $sanitized['feature_snapshots'] = ! empty( $input['feature_snapshots'] ) ? 'on' : 'off';

        return $sanitized;
    }

    /**
     * Enqueue admin styles on our settings page.
     *
     * @param string $hook Current admin page hook.
     */
    public function enqueue_styles( $hook ) {
        if ( 'toplevel_page_divi-anchor-ai' !== $hook ) {
            return;
        }

        wp_enqueue_style(
            'divi-anchor-admin',
            DIVI_ANCHOR_URL . 'assets/css/admin.css',
            array(),
            DIVI_ANCHOR_VERSION
        );
    }

    /**
     * Render the settings page.
     */
    public function render_settings_page() {
        if ( ! current_user_can( 'manage_options' ) ) {
            return;
        }

        $settings    = get_option( self::OPTION_KEY, array() );
        $system_info = $this->version_adapter->get_system_info();

        include DIVI_ANCHOR_DIR . 'templates/admin/settings.php';
    }
}
