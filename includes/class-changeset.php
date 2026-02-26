<?php
/**
 * Changeset validation and application.
 *
 * Validates changesets against module schemas, applies changes to module data,
 * and generates human-readable diffs.
 *
 * @package Divi_Anchor_AI
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Divi_Anchor_Changeset {

    /** @var Divi_Anchor_Schema_Registry */
    private $schema_registry;

    /**
     * Constructor.
     *
     * @param Divi_Anchor_Schema_Registry $schema_registry Schema registry instance.
     */
    public function __construct( Divi_Anchor_Schema_Registry $schema_registry ) {
        $this->schema_registry = $schema_registry;
    }

    /**
     * Validate a changeset against the module schema.
     *
     * @param array $changeset Changeset array with module_type and changes.
     * @return array { valid: bool, errors: array }
     */
    public function validate( $changeset ) {
        $errors = array();

        if ( ! isset( $changeset['module_type'] ) ) {
            $errors[] = 'Missing module_type in changeset';
            return array( 'valid' => false, 'errors' => $errors );
        }

        if ( ! isset( $changeset['changes'] ) || ! is_array( $changeset['changes'] ) ) {
            $errors[] = 'Missing or invalid changes array';
            return array( 'valid' => false, 'errors' => $errors );
        }

        $module_type = $changeset['module_type'];

        if ( ! $this->schema_registry->has( $module_type ) ) {
            $errors[] = sprintf( 'Unknown module type: %s', $module_type );
            return array( 'valid' => false, 'errors' => $errors );
        }

        foreach ( $changeset['changes'] as $i => $change ) {
            if ( ! isset( $change['field'] ) ) {
                $errors[] = sprintf( 'Change at index %d is missing "field"', $i );
                continue;
            }

            if ( ! array_key_exists( 'new_value', $change ) ) {
                $errors[] = sprintf( 'Change for field "%s" is missing "new_value"', $change['field'] );
                continue;
            }

            $result = $this->schema_registry->validate_field(
                $module_type,
                $change['field'],
                $change['new_value']
            );

            if ( ! $result['valid'] ) {
                $errors[] = $result['message'];
            }
        }

        return array(
            'valid'  => empty( $errors ),
            'errors' => $errors,
        );
    }

    /**
     * Apply a validated changeset to module data.
     *
     * @param array $changeset   Validated changeset.
     * @param array $module_data Current module data.
     * @return array Updated module data.
     */
    public function apply( $changeset, $module_data ) {
        if ( ! isset( $changeset['changes'] ) || ! is_array( $changeset['changes'] ) ) {
            return $module_data;
        }

        foreach ( $changeset['changes'] as $change ) {
            if ( ! isset( $change['field'] ) || ! array_key_exists( 'new_value', $change ) ) {
                continue;
            }

            $module_data[ $change['field'] ] = $change['new_value'];
        }

        return $module_data;
    }

    /**
     * Generate a human-readable diff from a changeset and module data.
     *
     * @param array $changeset   Changeset with changes.
     * @param array $module_data Original module data (before changes).
     * @return array Diff entries with field, old_value, new_value, and label.
     */
    public function diff( $changeset, $module_data ) {
        $diff = array();

        if ( ! isset( $changeset['changes'] ) || ! is_array( $changeset['changes'] ) ) {
            return $diff;
        }

        $schema = null;
        if ( isset( $changeset['module_type'] ) ) {
            $schema = $this->schema_registry->get( $changeset['module_type'] );
        }

        foreach ( $changeset['changes'] as $change ) {
            if ( ! isset( $change['field'] ) ) {
                continue;
            }

            $field_name = $change['field'];
            $old_value  = isset( $module_data[ $field_name ] ) ? $module_data[ $field_name ] : null;
            $new_value  = isset( $change['new_value'] ) ? $change['new_value'] : null;

            $label = $field_name;
            if ( $schema ) {
                $field_def = $this->schema_registry->find_field( $schema, $field_name );
                if ( $field_def && isset( $field_def['label'] ) ) {
                    $label = $field_def['label'];
                }
            }

            $diff[] = array(
                'field'     => $field_name,
                'label'     => $label,
                'old_value' => $old_value,
                'new_value' => $new_value,
                'changed'   => $old_value !== $new_value,
            );
        }

        return $diff;
    }
}
