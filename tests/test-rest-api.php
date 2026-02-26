<?php
/**
 * Tests for Divi_Anchor_REST_API.
 *
 * These tests require the WordPress test framework.
 * They will be skipped in standalone mode.
 *
 * @package Divi_Anchor_AI
 */

if ( ! class_exists( 'WP_UnitTestCase' ) ) {
    // Skip if WP test framework not available.
    class Test_REST_API extends \PHPUnit\Framework\TestCase {
        public function test_skipped_without_wp() {
            $this->markTestSkipped( 'WordPress test framework not available' );
        }
    }
    return;
}

class Test_REST_API extends WP_UnitTestCase {

    /** @var Divi_Anchor_REST_API */
    private $api;

    /** @var int Admin user ID. */
    private $admin_id;

    public function setUp(): void {
        parent::setUp();

        $this->admin_id = $this->factory->user->create( array( 'role' => 'administrator' ) );

        $registry  = new Divi_Anchor_Schema_Registry();
        $ai_proxy  = new Divi_Anchor_AI_Proxy( $registry );
        $changeset = new Divi_Anchor_Changeset( $registry );
        $snapshot  = new Divi_Anchor_Snapshot();

        $this->api = new Divi_Anchor_REST_API( $registry, $ai_proxy, $changeset, $snapshot );

        // Register routes for testing.
        do_action( 'rest_api_init' );
    }

    public function test_routes_are_registered() {
        $routes = rest_get_server()->get_routes();

        $this->assertArrayHasKey( '/divi-anchor/v1/module-types', $routes );
        $this->assertArrayHasKey( '/divi-anchor/v1/analyze-module', $routes );
        $this->assertArrayHasKey( '/divi-anchor/v1/generate-changes', $routes );
        $this->assertArrayHasKey( '/divi-anchor/v1/validate-changes', $routes );
        $this->assertArrayHasKey( '/divi-anchor/v1/module-schema', $routes );
        $this->assertArrayHasKey( '/divi-anchor/v1/save-snapshot', $routes );
        $this->assertArrayHasKey( '/divi-anchor/v1/rollback', $routes );
    }

    public function test_module_types_returns_list() {
        wp_set_current_user( $this->admin_id );

        $request  = new WP_REST_Request( 'GET', '/divi-anchor/v1/module-types' );
        $response = rest_get_server()->dispatch( $request );

        $this->assertEquals( 200, $response->get_status() );

        $data = $response->get_data();
        $this->assertIsArray( $data );
        $this->assertNotEmpty( $data );
    }

    public function test_module_types_requires_auth() {
        wp_set_current_user( 0 ); // Not logged in.

        $request  = new WP_REST_Request( 'GET', '/divi-anchor/v1/module-types' );
        $response = rest_get_server()->dispatch( $request );

        $this->assertEquals( 403, $response->get_status() );
    }

    public function test_module_schema_returns_schema() {
        wp_set_current_user( $this->admin_id );

        $request = new WP_REST_Request( 'POST', '/divi-anchor/v1/module-schema' );
        $request->set_param( 'module_type', 'et_pb_text' );

        $response = rest_get_server()->dispatch( $request );
        $this->assertEquals( 200, $response->get_status() );

        $data = $response->get_data();
        $this->assertEquals( 'et_pb_text', $data['module_type'] );
    }

    public function test_module_schema_404_for_unknown() {
        wp_set_current_user( $this->admin_id );

        $request = new WP_REST_Request( 'POST', '/divi-anchor/v1/module-schema' );
        $request->set_param( 'module_type', 'et_pb_nonexistent' );

        $response = rest_get_server()->dispatch( $request );
        $this->assertEquals( 404, $response->get_status() );
    }

    public function test_validate_changes_with_valid_changeset() {
        wp_set_current_user( $this->admin_id );

        $request = new WP_REST_Request( 'POST', '/divi-anchor/v1/validate-changes' );
        $request->set_param( 'changeset', array(
            'module_type' => 'et_pb_text',
            'changes'     => array(
                array(
                    'field'     => 'content',
                    'new_value' => 'Hello World',
                ),
            ),
        ) );

        $response = rest_get_server()->dispatch( $request );
        $this->assertEquals( 200, $response->get_status() );

        $data = $response->get_data();
        $this->assertTrue( $data['valid'] );
    }
}
