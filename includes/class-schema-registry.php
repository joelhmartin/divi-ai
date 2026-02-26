<?php
/**
 * Module schema registry.
 *
 * Loads, caches, and serves JSON schemas for Divi modules.
 * Provides field-level validation against schema definitions.
 *
 * @package Divi_Anchor_AI
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Divi_Anchor_Schema_Registry {

    /** @var array Loaded schemas keyed by module_type. */
    private $schemas = array();

    /** @var bool Whether schemas have been loaded. */
    private $loaded = false;

    /** @var string Path to core schemas directory. */
    private $core_path;

    /** @var string Path to third-party schemas directory. */
    private $third_party_path;

    /**
     * Constructor.
     *
     * @param string|null $core_path        Override path to core schemas.
     * @param string|null $third_party_path Override path to third-party schemas.
     */
    public function __construct( $core_path = null, $third_party_path = null ) {
        $this->core_path        = $core_path ?: DIVI_ANCHOR_DIR . 'schemas/core/';
        $this->third_party_path = $third_party_path ?: DIVI_ANCHOR_DIR . 'schemas/third-party/';
    }

    /**
     * Load all schemas from disk.
     *
     * @return void
     */
    public function load() {
        if ( $this->loaded ) {
            return;
        }

        $this->load_from_directory( $this->core_path );
        $this->load_from_directory( $this->third_party_path );

        /**
         * Filter to register additional schemas programmatically.
         *
         * @param array $schemas Current schemas array.
         */
        $this->schemas = apply_filters( 'divi_anchor_schemas', $this->schemas );

        $this->loaded = true;
    }

    /**
     * Load JSON schema files from a directory.
     *
     * @param string $dir Directory path.
     */
    private function load_from_directory( $dir ) {
        if ( ! is_dir( $dir ) ) {
            return;
        }

        $files = glob( $dir . '*.json' );
        if ( ! $files ) {
            return;
        }

        foreach ( $files as $file ) {
            $json = file_get_contents( $file );
            $data = json_decode( $json, true );

            if ( $data && isset( $data['module_type'] ) ) {
                $this->schemas[ $data['module_type'] ] = $data;
            }
        }
    }

    /**
     * Get schema for a specific module type.
     *
     * @param string $module_type e.g. 'et_pb_text'.
     * @return array|null Schema data or null.
     */
    public function get( $module_type ) {
        $this->load();
        return isset( $this->schemas[ $module_type ] ) ? $this->schemas[ $module_type ] : null;
    }

    /**
     * Get all registered module types.
     *
     * @return array List of module type strings.
     */
    public function get_types() {
        $this->load();
        return array_keys( $this->schemas );
    }

    /**
     * Get all schemas.
     *
     * @return array All loaded schemas.
     */
    public function get_all() {
        $this->load();
        return $this->schemas;
    }

    /**
     * Get summary list of modules (type + label + category).
     *
     * @return array
     */
    public function get_type_list() {
        $this->load();
        $list = array();

        foreach ( $this->schemas as $type => $schema ) {
            $list[] = array(
                'module_type' => $type,
                'label'       => isset( $schema['label'] ) ? $schema['label'] : $type,
                'category'    => isset( $schema['category'] ) ? $schema['category'] : 'unknown',
                'has_children' => ! empty( $schema['has_children'] ),
            );
        }

        return $list;
    }

    /**
     * Check if a module type is registered.
     *
     * @param string $module_type Module type string.
     * @return bool
     */
    public function has( $module_type ) {
        $this->load();
        return isset( $this->schemas[ $module_type ] );
    }

    /**
     * Validate a single field value against the schema.
     *
     * @param string $module_type Module type.
     * @param string $field_name  Field name.
     * @param mixed  $value       The value to validate.
     * @return array { valid: bool, message: string }
     */
    public function validate_field( $module_type, $field_name, $value ) {
        $schema = $this->get( $module_type );

        if ( ! $schema ) {
            return array(
                'valid'   => false,
                'message' => sprintf( 'Unknown module type: %s', $module_type ),
            );
        }

        $field_def = $this->find_field( $schema, $field_name );

        if ( ! $field_def ) {
            return array(
                'valid'   => false,
                'message' => sprintf( 'Unknown field "%s" in module "%s"', $field_name, $module_type ),
            );
        }

        return $this->validate_value( $value, $field_def, $field_name );
    }

    /**
     * Find a field definition within a schema.
     *
     * @param array  $schema     Module schema.
     * @param string $field_name Field name to find.
     * @return array|null Field definition or null.
     */
    public function find_field( $schema, $field_name ) {
        if ( ! isset( $schema['tabs'] ) ) {
            return null;
        }

        foreach ( $schema['tabs'] as $tab ) {
            if ( ! isset( $tab['toggles'] ) ) {
                continue;
            }
            foreach ( $tab['toggles'] as $toggle ) {
                if ( isset( $toggle['fields'][ $field_name ] ) ) {
                    return $toggle['fields'][ $field_name ];
                }
            }
        }

        return null;
    }

    /**
     * Validate a value against a field definition.
     *
     * @param mixed  $value      The value.
     * @param array  $field_def  Field definition from schema.
     * @param string $field_name Field name for error messages.
     * @return array { valid: bool, message: string }
     */
    private function validate_value( $value, $field_def, $field_name ) {
        $type = isset( $field_def['type'] ) ? $field_def['type'] : 'text';

        switch ( $type ) {
            case 'yes_no':
                if ( ! in_array( $value, array( 'on', 'off' ), true ) ) {
                    return array(
                        'valid'   => false,
                        'message' => sprintf( 'Field "%s" must be "on" or "off"', $field_name ),
                    );
                }
                break;

            case 'select':
                if ( isset( $field_def['options'] ) && ! isset( $field_def['options'][ $value ] ) ) {
                    return array(
                        'valid'   => false,
                        'message' => sprintf(
                            'Field "%s" must be one of: %s',
                            $field_name,
                            implode( ', ', array_keys( $field_def['options'] ) )
                        ),
                    );
                }
                break;

            case 'color':
                if ( ! empty( $value ) && ! preg_match( '/^(#[0-9a-fA-F]{3,8}|rgba?\(.+\)|transparent|inherit)$/i', $value ) ) {
                    return array(
                        'valid'   => false,
                        'message' => sprintf( 'Field "%s" must be a valid color value', $field_name ),
                    );
                }
                break;
        }

        return array(
            'valid'   => true,
            'message' => 'OK',
        );
    }

    /**
     * Register a schema programmatically.
     *
     * @param array $schema Schema data with 'module_type' key.
     * @return bool True if registered successfully.
     */
    public function register( $schema ) {
        if ( ! isset( $schema['module_type'] ) ) {
            return false;
        }

        $this->schemas[ $schema['module_type'] ] = $schema;
        return true;
    }
}
