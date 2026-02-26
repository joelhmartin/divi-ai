<?php
/**
 * PHPUnit bootstrap for Divi Anchor AI tests.
 *
 * Loads the WordPress test framework if available,
 * otherwise sets up minimal stubs for unit testing.
 *
 * @package Divi_Anchor_AI
 */

// Try to load the WP test suite.
$wp_tests_dir = getenv( 'WP_TESTS_DIR' );

if ( ! $wp_tests_dir ) {
    $wp_tests_dir = rtrim( sys_get_temp_dir(), '/\\' ) . '/wordpress-tests-lib';
}

if ( file_exists( $wp_tests_dir . '/includes/functions.php' ) ) {
    // Running inside the WP test framework.
    require_once $wp_tests_dir . '/includes/functions.php';

    tests_add_filter( 'muplugins_loaded', function () {
        require dirname( __DIR__ ) . '/divi-anchor.php';
    } );

    require $wp_tests_dir . '/includes/bootstrap.php';
} else {
    // Standalone mode — define minimal WP stubs for unit-testable classes.
    if ( ! defined( 'ABSPATH' ) ) {
        define( 'ABSPATH', '/tmp/wordpress/' );
    }
    if ( ! defined( 'DIVI_ANCHOR_DIR' ) ) {
        define( 'DIVI_ANCHOR_DIR', dirname( __DIR__ ) . '/' );
    }
    if ( ! defined( 'DIVI_ANCHOR_VERSION' ) ) {
        define( 'DIVI_ANCHOR_VERSION', '1.0.0' );
    }

    // Stub apply_filters for schema registry.
    if ( ! function_exists( 'apply_filters' ) ) {
        function apply_filters( $tag, $value ) {
            return $value;
        }
    }

    // Load testable classes.
    require_once DIVI_ANCHOR_DIR . 'includes/class-schema-registry.php';
    require_once DIVI_ANCHOR_DIR . 'includes/class-changeset.php';
}
