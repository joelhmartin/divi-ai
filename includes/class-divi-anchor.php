<?php
/**
 * Main plugin orchestrator.
 *
 * Singleton that loads all classes, injects dependencies, and registers hooks.
 *
 * @package Divi_Anchor_AI
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Divi_Anchor {

    /** @var Divi_Anchor|null Singleton instance. */
    private static $instance = null;

    /** @var Divi_Anchor_Version_Adapter */
    private $version_adapter;

    /** @var Divi_Anchor_Schema_Registry */
    private $schema_registry;

    /** @var Divi_Anchor_AI_Proxy */
    private $ai_proxy;

    /** @var Divi_Anchor_Changeset */
    private $changeset;

    /** @var Divi_Anchor_Snapshot */
    private $snapshot;

    /** @var Divi_Anchor_REST_API */
    private $rest_api;

    /** @var Divi_Anchor_Admin */
    private $admin;

    /**
     * Get singleton instance.
     *
     * @return Divi_Anchor
     */
    public static function get_instance() {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Private constructor — use get_instance().
     */
    private function __construct() {
        $this->init_components();
        $this->register_hooks();
    }

    /**
     * Initialize all components with dependency injection.
     */
    private function init_components() {
        // Layer 1: Standalone.
        $this->version_adapter = new Divi_Anchor_Version_Adapter();
        $this->schema_registry = new Divi_Anchor_Schema_Registry();

        // Layer 2: Core (depends on schema registry).
        $this->ai_proxy  = new Divi_Anchor_AI_Proxy( $this->schema_registry );
        $this->changeset = new Divi_Anchor_Changeset( $this->schema_registry );
        $this->snapshot  = new Divi_Anchor_Snapshot();

        // Layer 3: Integration.
        $this->rest_api = new Divi_Anchor_REST_API(
            $this->schema_registry,
            $this->ai_proxy,
            $this->changeset,
            $this->snapshot
        );
        $this->admin = new Divi_Anchor_Admin( $this->version_adapter, $this->ai_proxy );
    }

    /**
     * Register WordPress hooks.
     */
    private function register_hooks() {
        // REST API.
        add_action( 'rest_api_init', array( $this->rest_api, 'register_routes' ) );

        // Admin.
        $this->admin->init();

        // Enqueue builder adapter JS when Divi VB is active.
        add_action( 'wp_enqueue_scripts', array( $this, 'maybe_enqueue_adapter' ) );
    }

    /**
     * Enqueue the builder adapter script when in the Visual Builder.
     */
    public function maybe_enqueue_adapter() {
        if ( ! $this->is_visual_builder() ) {
            return;
        }

        $script_path = DIVI_ANCHOR_DIR . 'assets/js/dist/divi-anchor-adapter.js';
        if ( ! file_exists( $script_path ) ) {
            return;
        }

        wp_enqueue_script(
            'divi-anchor-adapter',
            DIVI_ANCHOR_URL . 'assets/js/dist/divi-anchor-adapter.js',
            array( 'jquery' ),
            DIVI_ANCHOR_VERSION,
            true
        );

        wp_localize_script( 'divi-anchor-adapter', 'diviAnchorConfig', array(
            'restUrl'      => esc_url_raw( rest_url( 'divi-anchor/v1/' ) ),
            'nonce'        => wp_create_nonce( 'wp_rest' ),
            'diviVersion'  => $this->version_adapter->get_version(),
            'pluginVersion' => DIVI_ANCHOR_VERSION,
        ) );

        // AI Tab styles.
        wp_enqueue_style(
            'divi-anchor-ai-tab',
            DIVI_ANCHOR_URL . 'assets/css/ai-tab.css',
            array(),
            DIVI_ANCHOR_VERSION
        );

        wp_enqueue_style(
            'divi-anchor-visual-feedback',
            DIVI_ANCHOR_URL . 'assets/css/visual-feedback.css',
            array(),
            DIVI_ANCHOR_VERSION
        );
    }

    /**
     * Check if the Visual Builder is currently active.
     *
     * @return bool
     */
    private function is_visual_builder() {
        // Divi 5 VB detection.
        if ( function_exists( 'et_builder_is_visual_builder' ) && et_builder_is_visual_builder() ) {
            return true;
        }

        // Divi 5 fallback: BFB query parameter.
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended
        if ( isset( $_GET['et_bfb'] ) && $_GET['et_bfb'] === '1' ) {
            return true;
        }

        // Divi 4 VB detection.
        if ( function_exists( 'et_core_is_fb_enabled' ) && et_core_is_fb_enabled() ) {
            return true;
        }

        // Fallback: check for VB query parameter.
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended
        if ( isset( $_GET['et_fb'] ) && $_GET['et_fb'] === '1' ) {
            return true;
        }

        return false;
    }

    /**
     * Get a component instance.
     *
     * @param string $name Component name.
     * @return object|null
     */
    public function get( $name ) {
        $map = array(
            'version_adapter' => $this->version_adapter,
            'schema_registry' => $this->schema_registry,
            'ai_proxy'        => $this->ai_proxy,
            'changeset'       => $this->changeset,
            'snapshot'        => $this->snapshot,
            'rest_api'        => $this->rest_api,
            'admin'           => $this->admin,
        );

        return isset( $map[ $name ] ) ? $map[ $name ] : null;
    }
}
