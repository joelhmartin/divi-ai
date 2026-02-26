<?php
/**
 * REST API controller.
 *
 * Registers 7 endpoints under the divi-anchor/v1 namespace.
 *
 * @package Divi_Anchor_AI
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Divi_Anchor_REST_API {

    const NAMESPACE = 'divi-anchor/v1';

    /** @var Divi_Anchor_Schema_Registry */
    private $schema_registry;

    /** @var Divi_Anchor_AI_Proxy */
    private $ai_proxy;

    /** @var Divi_Anchor_Changeset */
    private $changeset;

    /** @var Divi_Anchor_Snapshot */
    private $snapshot;

    /**
     * Constructor.
     *
     * @param Divi_Anchor_Schema_Registry $schema_registry Schema registry.
     * @param Divi_Anchor_AI_Proxy        $ai_proxy        AI proxy.
     * @param Divi_Anchor_Changeset       $changeset       Changeset handler.
     * @param Divi_Anchor_Snapshot        $snapshot         Snapshot handler.
     */
    public function __construct(
        Divi_Anchor_Schema_Registry $schema_registry,
        Divi_Anchor_AI_Proxy $ai_proxy,
        Divi_Anchor_Changeset $changeset,
        Divi_Anchor_Snapshot $snapshot
    ) {
        $this->schema_registry = $schema_registry;
        $this->ai_proxy        = $ai_proxy;
        $this->changeset       = $changeset;
        $this->snapshot         = $snapshot;
    }

    /**
     * Register REST routes.
     */
    public function register_routes() {
        register_rest_route( self::NAMESPACE, '/analyze-module', array(
            'methods'             => 'POST',
            'callback'            => array( $this, 'analyze_module' ),
            'permission_callback' => array( $this, 'check_permission' ),
            'args'                => array(
                'prompt'      => array( 'required' => true, 'type' => 'string', 'sanitize_callback' => 'sanitize_text_field' ),
                'module_type' => array( 'required' => true, 'type' => 'string', 'sanitize_callback' => 'sanitize_text_field' ),
                'module_data' => array( 'required' => true, 'type' => 'object' ),
            ),
        ) );

        register_rest_route( self::NAMESPACE, '/generate-changes', array(
            'methods'             => 'POST',
            'callback'            => array( $this, 'generate_changes' ),
            'permission_callback' => array( $this, 'check_permission' ),
            'args'                => array(
                'intent'      => array( 'required' => true, 'type' => 'object' ),
                'module_type' => array( 'required' => true, 'type' => 'string', 'sanitize_callback' => 'sanitize_text_field' ),
                'module_data' => array( 'required' => true, 'type' => 'object' ),
            ),
        ) );

        register_rest_route( self::NAMESPACE, '/validate-changes', array(
            'methods'             => 'POST',
            'callback'            => array( $this, 'validate_changes' ),
            'permission_callback' => array( $this, 'check_permission' ),
            'args'                => array(
                'changeset' => array( 'required' => true, 'type' => 'object' ),
            ),
        ) );

        register_rest_route( self::NAMESPACE, '/module-schema', array(
            'methods'             => 'POST',
            'callback'            => array( $this, 'get_module_schema' ),
            'permission_callback' => array( $this, 'check_permission' ),
            'args'                => array(
                'module_type' => array( 'required' => true, 'type' => 'string', 'sanitize_callback' => 'sanitize_text_field' ),
            ),
        ) );

        register_rest_route( self::NAMESPACE, '/module-types', array(
            'methods'             => 'GET',
            'callback'            => array( $this, 'get_module_types' ),
            'permission_callback' => array( $this, 'check_permission' ),
        ) );

        register_rest_route( self::NAMESPACE, '/save-snapshot', array(
            'methods'             => 'POST',
            'callback'            => array( $this, 'save_snapshot' ),
            'permission_callback' => array( $this, 'check_permission' ),
            'args'                => array(
                'module_id'   => array( 'required' => true, 'type' => 'string', 'sanitize_callback' => 'sanitize_text_field' ),
                'module_type' => array( 'required' => true, 'type' => 'string', 'sanitize_callback' => 'sanitize_text_field' ),
                'module_data' => array( 'required' => true, 'type' => 'object' ),
                'label'       => array( 'required' => false, 'type' => 'string', 'sanitize_callback' => 'sanitize_text_field', 'default' => '' ),
            ),
        ) );

        register_rest_route( self::NAMESPACE, '/rollback', array(
            'methods'             => 'POST',
            'callback'            => array( $this, 'rollback' ),
            'permission_callback' => array( $this, 'check_permission' ),
            'args'                => array(
                'snapshot_id' => array( 'required' => false, 'type' => 'string', 'sanitize_callback' => 'sanitize_text_field' ),
                'module_id'   => array( 'required' => false, 'type' => 'string', 'sanitize_callback' => 'sanitize_text_field' ),
            ),
        ) );
    }

    /**
     * Permission check — user must be able to edit pages.
     *
     * @return bool
     */
    public function check_permission() {
        return current_user_can( 'edit_pages' );
    }

    /**
     * POST /analyze-module — Send prompt + module context to AI for intent analysis.
     *
     * @param WP_REST_Request $request Request.
     * @return WP_REST_Response|WP_Error
     */
    public function analyze_module( WP_REST_Request $request ) {
        $settings = get_option( 'divi_anchor_settings', array() );
        if ( empty( $settings['feature_analysis'] ) || $settings['feature_analysis'] !== 'on' ) {
            return new WP_Error( 'feature_disabled', 'Module analysis is disabled', array( 'status' => 403 ) );
        }

        $result = $this->ai_proxy->analyze_intent(
            $request->get_param( 'prompt' ),
            $request->get_param( 'module_data' ),
            $request->get_param( 'module_type' )
        );

        if ( is_wp_error( $result ) ) {
            return $result;
        }

        return rest_ensure_response( $result );
    }

    /**
     * POST /generate-changes — Generate changeset from analyzed intent.
     *
     * @param WP_REST_Request $request Request.
     * @return WP_REST_Response|WP_Error
     */
    public function generate_changes( WP_REST_Request $request ) {
        $settings = get_option( 'divi_anchor_settings', array() );
        if ( empty( $settings['feature_changes'] ) || $settings['feature_changes'] !== 'on' ) {
            return new WP_Error( 'feature_disabled', 'Change generation is disabled', array( 'status' => 403 ) );
        }

        $result = $this->ai_proxy->generate_changeset(
            $request->get_param( 'intent' ),
            $request->get_param( 'module_data' ),
            $request->get_param( 'module_type' )
        );

        if ( is_wp_error( $result ) ) {
            return $result;
        }

        return rest_ensure_response( $result );
    }

    /**
     * POST /validate-changes — Validate changeset against schema.
     *
     * @param WP_REST_Request $request Request.
     * @return WP_REST_Response
     */
    public function validate_changes( WP_REST_Request $request ) {
        $result = $this->changeset->validate( $request->get_param( 'changeset' ) );
        return rest_ensure_response( $result );
    }

    /**
     * POST /module-schema — Get schema for a module type.
     *
     * @param WP_REST_Request $request Request.
     * @return WP_REST_Response|WP_Error
     */
    public function get_module_schema( WP_REST_Request $request ) {
        $module_type = $request->get_param( 'module_type' );
        $schema      = $this->schema_registry->get( $module_type );

        if ( ! $schema ) {
            return new WP_Error( 'not_found', 'Module type not found: ' . $module_type, array( 'status' => 404 ) );
        }

        return rest_ensure_response( $schema );
    }

    /**
     * GET /module-types — List all registered module types.
     *
     * @return WP_REST_Response
     */
    public function get_module_types() {
        return rest_ensure_response( $this->schema_registry->get_type_list() );
    }

    /**
     * POST /save-snapshot — Save module state for undo.
     *
     * @param WP_REST_Request $request Request.
     * @return WP_REST_Response
     */
    public function save_snapshot( WP_REST_Request $request ) {
        $settings = get_option( 'divi_anchor_settings', array() );
        if ( empty( $settings['feature_snapshots'] ) || $settings['feature_snapshots'] !== 'on' ) {
            return new WP_Error( 'feature_disabled', 'Snapshots are disabled', array( 'status' => 403 ) );
        }

        $snapshot_id = $this->snapshot->save(
            $request->get_param( 'module_id' ),
            $request->get_param( 'module_type' ),
            $request->get_param( 'module_data' ),
            $request->get_param( 'label' )
        );

        return rest_ensure_response( array(
            'snapshot_id' => $snapshot_id,
            'message'     => 'Snapshot saved',
        ) );
    }

    /**
     * POST /rollback — Restore a saved snapshot.
     *
     * @param WP_REST_Request $request Request.
     * @return WP_REST_Response|WP_Error
     */
    public function rollback( WP_REST_Request $request ) {
        $snapshot_id = $request->get_param( 'snapshot_id' );
        $module_id   = $request->get_param( 'module_id' );

        if ( $snapshot_id ) {
            $snapshot = $this->snapshot->restore( $snapshot_id );
        } elseif ( $module_id ) {
            $snapshot = $this->snapshot->pop( $module_id );
        } else {
            return new WP_Error( 'missing_param', 'Provide either snapshot_id or module_id', array( 'status' => 400 ) );
        }

        if ( ! $snapshot ) {
            return new WP_Error( 'not_found', 'Snapshot not found', array( 'status' => 404 ) );
        }

        return rest_ensure_response( array(
            'snapshot'    => $snapshot,
            'message'     => 'Snapshot restored',
        ) );
    }
}
