<?php
/**
 * Tests for Divi_Anchor_Changeset.
 *
 * @package Divi_Anchor_AI
 */

use PHPUnit\Framework\TestCase;

class Test_Changeset_Validation extends TestCase {

    /** @var Divi_Anchor_Schema_Registry */
    private $registry;

    /** @var Divi_Anchor_Changeset */
    private $changeset;

    protected function setUp(): void {
        $core_path      = DIVI_ANCHOR_DIR . 'schemas/core/';
        $this->registry = new Divi_Anchor_Schema_Registry( $core_path, '/nonexistent/' );
        $this->changeset = new Divi_Anchor_Changeset( $this->registry );
    }

    public function test_valid_changeset_passes_validation() {
        $changeset = array(
            'module_type' => 'et_pb_text',
            'changes'     => array(
                array(
                    'field'     => 'content',
                    'old_value' => 'Hello',
                    'new_value' => 'World',
                ),
            ),
        );

        $result = $this->changeset->validate( $changeset );
        $this->assertTrue( $result['valid'] );
        $this->assertEmpty( $result['errors'] );
    }

    public function test_missing_module_type_fails() {
        $changeset = array(
            'changes' => array(
                array( 'field' => 'content', 'new_value' => 'test' ),
            ),
        );

        $result = $this->changeset->validate( $changeset );
        $this->assertFalse( $result['valid'] );
    }

    public function test_missing_changes_array_fails() {
        $changeset = array( 'module_type' => 'et_pb_text' );

        $result = $this->changeset->validate( $changeset );
        $this->assertFalse( $result['valid'] );
    }

    public function test_unknown_module_type_fails() {
        $changeset = array(
            'module_type' => 'et_pb_nonexistent',
            'changes'     => array(
                array( 'field' => 'content', 'new_value' => 'test' ),
            ),
        );

        $result = $this->changeset->validate( $changeset );
        $this->assertFalse( $result['valid'] );
    }

    public function test_invalid_select_value_fails() {
        $changeset = array(
            'module_type' => 'et_pb_text',
            'changes'     => array(
                array(
                    'field'     => 'text_orientation',
                    'new_value' => 'diagonal',
                ),
            ),
        );

        $result = $this->changeset->validate( $changeset );
        $this->assertFalse( $result['valid'] );
    }

    public function test_valid_select_value_passes() {
        $changeset = array(
            'module_type' => 'et_pb_text',
            'changes'     => array(
                array(
                    'field'     => 'text_orientation',
                    'new_value' => 'center',
                ),
            ),
        );

        $result = $this->changeset->validate( $changeset );
        $this->assertTrue( $result['valid'] );
    }

    public function test_apply_updates_module_data() {
        $changeset = array(
            'module_type' => 'et_pb_text',
            'changes'     => array(
                array(
                    'field'     => 'content',
                    'old_value' => 'Hello',
                    'new_value' => 'Updated content',
                ),
                array(
                    'field'     => 'text_orientation',
                    'old_value' => 'left',
                    'new_value' => 'center',
                ),
            ),
        );

        $original = array(
            'content'          => 'Hello',
            'text_orientation' => 'left',
            'module_class'     => 'my-class',
        );

        $updated = $this->changeset->apply( $changeset, $original );

        $this->assertEquals( 'Updated content', $updated['content'] );
        $this->assertEquals( 'center', $updated['text_orientation'] );
        $this->assertEquals( 'my-class', $updated['module_class'] ); // Unchanged.
    }

    public function test_diff_generates_entries() {
        $changeset = array(
            'module_type' => 'et_pb_text',
            'changes'     => array(
                array(
                    'field'     => 'content',
                    'new_value' => 'New content',
                ),
            ),
        );

        $original = array( 'content' => 'Old content' );

        $diff = $this->changeset->diff( $changeset, $original );

        $this->assertCount( 1, $diff );
        $this->assertEquals( 'content', $diff[0]['field'] );
        $this->assertEquals( 'Old content', $diff[0]['old_value'] );
        $this->assertEquals( 'New content', $diff[0]['new_value'] );
        $this->assertTrue( $diff[0]['changed'] );
    }

    public function test_diff_detects_no_change() {
        $changeset = array(
            'module_type' => 'et_pb_text',
            'changes'     => array(
                array(
                    'field'     => 'content',
                    'new_value' => 'Same content',
                ),
            ),
        );

        $original = array( 'content' => 'Same content' );

        $diff = $this->changeset->diff( $changeset, $original );

        $this->assertCount( 1, $diff );
        $this->assertFalse( $diff[0]['changed'] );
    }

    public function test_change_missing_field_key_fails() {
        $changeset = array(
            'module_type' => 'et_pb_text',
            'changes'     => array(
                array( 'new_value' => 'test' ),
            ),
        );

        $result = $this->changeset->validate( $changeset );
        $this->assertFalse( $result['valid'] );
    }

    public function test_change_missing_new_value_fails() {
        $changeset = array(
            'module_type' => 'et_pb_text',
            'changes'     => array(
                array( 'field' => 'content' ),
            ),
        );

        $result = $this->changeset->validate( $changeset );
        $this->assertFalse( $result['valid'] );
    }
}
