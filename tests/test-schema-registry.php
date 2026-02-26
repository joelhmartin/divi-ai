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

    public function test_has_fifty_core_modules() {
        $types = $this->registry->get_types();
        $this->assertCount( 50, $types, 'Should have 50 core module schemas' );
    }

    public function test_expected_module_types_exist() {
        $expected = array(
            // Original 10.
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
            // Phase 4: Media.
            'et_pb_video',
            'et_pb_video_slider',
            'et_pb_audio',
            'et_pb_gallery',
            'et_pb_fullwidth_image',
            // Phase 4: Content.
            'et_pb_heading',
            'et_pb_divider',
            'et_pb_cta',
            'et_pb_toggle',
            'et_pb_testimonial',
            // Phase 4: Counters.
            'et_pb_number_counter',
            'et_pb_circle_counter',
            'et_pb_bar_counters',
            'et_pb_bar_counters_item',
            // Phase 4: Social/Timer.
            'et_pb_countdown_timer',
            'et_pb_social_media_follow',
            'et_pb_social_media_follow_network',
            // Phase 4: Maps.
            'et_pb_map',
            'et_pb_map_pin',
            // Phase 4: Dynamic.
            'et_pb_sidebar',
            'et_pb_blog',
            'et_pb_shop',
            'et_pb_filterable_portfolio',
            'et_pb_portfolio',
            // Phase 4: Pricing/Team.
            'et_pb_pricing_tables',
            'et_pb_pricing_table',
            'et_pb_team_member',
            // Phase 4: Post.
            'et_pb_comments',
            'et_pb_post_title',
            'et_pb_post_nav',
            'et_pb_post_slider',
            // Phase 4: Forms/Auth.
            'et_pb_search',
            'et_pb_login',
            'et_pb_menu',
            // Phase 4: Fullwidth.
            'et_pb_fullwidth_header',
            'et_pb_fullwidth_code',
            'et_pb_fullwidth_slider',
            'et_pb_fullwidth_menu',
            'et_pb_fullwidth_post_slider',
            'et_pb_fullwidth_portfolio',
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
