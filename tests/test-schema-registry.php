<?php
/**
 * Tests for Divi_Anchor_Schema_Registry.
 *
 * @package Divi_Anchor_AI
 */

use PHPUnit\Framework\TestCase;

class Test_Schema_Registry extends TestCase {

    /** @var Divi_Anchor_Schema_Registry */
    private $registry;

    protected function setUp(): void {
        $core_path = DIVI_ANCHOR_DIR . 'schemas/core/';
        $this->registry = new Divi_Anchor_Schema_Registry( $core_path, '/nonexistent/' );
    }

    public function test_loads_core_schemas() {
        $types = $this->registry->get_types();
        $this->assertNotEmpty( $types, 'Should load at least one schema' );
    }

    public function test_has_ten_core_modules() {
        $types = $this->registry->get_types();
        $this->assertCount( 10, $types, 'Should have 10 core module schemas' );
    }

    public function test_expected_module_types_exist() {
        $expected = array(
            'et_pb_text',
            'et_pb_blurb',
            'et_pb_button',
            'et_pb_accordion',
            'et_pb_tabs',
            'et_pb_slider',
            'et_pb_image',
            'et_pb_code',
            'et_pb_contact_form',
            'et_pb_signup',
        );

        foreach ( $expected as $type ) {
            $this->assertTrue( $this->registry->has( $type ), "Module type {$type} should be registered" );
        }
    }

    public function test_get_returns_schema_with_required_keys() {
        $schema = $this->registry->get( 'et_pb_text' );

        $this->assertNotNull( $schema );
        $this->assertArrayHasKey( 'module_type', $schema );
        $this->assertArrayHasKey( 'label', $schema );
        $this->assertArrayHasKey( 'tabs', $schema );
        $this->assertEquals( 'et_pb_text', $schema['module_type'] );
    }

    public function test_get_returns_null_for_unknown_type() {
        $this->assertNull( $this->registry->get( 'et_pb_nonexistent' ) );
    }

    public function test_has_returns_false_for_unknown_type() {
        $this->assertFalse( $this->registry->has( 'et_pb_nonexistent' ) );
    }

    public function test_get_type_list_returns_summaries() {
        $list = $this->registry->get_type_list();

        $this->assertNotEmpty( $list );

        $first = $list[0];
        $this->assertArrayHasKey( 'module_type', $first );
        $this->assertArrayHasKey( 'label', $first );
        $this->assertArrayHasKey( 'category', $first );
    }

    public function test_validate_yes_no_field() {
        $result = $this->registry->validate_field( 'et_pb_blurb', 'use_icon', 'on' );
        $this->assertTrue( $result['valid'] );

        $result = $this->registry->validate_field( 'et_pb_blurb', 'use_icon', 'invalid' );
        $this->assertFalse( $result['valid'] );
    }

    public function test_validate_select_field() {
        $result = $this->registry->validate_field( 'et_pb_text', 'text_orientation', 'center' );
        $this->assertTrue( $result['valid'] );

        $result = $this->registry->validate_field( 'et_pb_text', 'text_orientation', 'diagonal' );
        $this->assertFalse( $result['valid'] );
    }

    public function test_validate_unknown_field() {
        $result = $this->registry->validate_field( 'et_pb_text', 'nonexistent_field', 'value' );
        $this->assertFalse( $result['valid'] );
    }

    public function test_validate_unknown_module() {
        $result = $this->registry->validate_field( 'et_pb_fake', 'content', 'value' );
        $this->assertFalse( $result['valid'] );
    }

    public function test_find_field_across_tabs() {
        $schema    = $this->registry->get( 'et_pb_text' );
        $field_def = $this->registry->find_field( $schema, 'module_class' );

        $this->assertNotNull( $field_def );
        $this->assertEquals( 'text', $field_def['type'] );
    }

    public function test_register_custom_schema() {
        $custom = array(
            'module_type' => 'et_pb_custom',
            'label'       => 'Custom Module',
            'tabs'        => array(),
        );

        $result = $this->registry->register( $custom );
        $this->assertTrue( $result );
        $this->assertTrue( $this->registry->has( 'et_pb_custom' ) );
    }
}
