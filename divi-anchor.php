<?php
/**
 * Plugin Name: Divi Anchor AI
 * Plugin URI:  https://github.com/joelhmartin/divi-ai
 * Description: AI-powered editing assistant for the Divi Visual Builder.
 * Version:     1.0.1
 * Author:      Joel Martin
 * Author URI:  https://github.com/joelhmartin
 * License:     GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: divi-anchor-ai
 * Requires at least: 5.8
 * Requires PHP: 7.4
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Plugin constants.
define( 'DIVI_ANCHOR_VERSION', '1.0.0' );
define( 'DIVI_ANCHOR_FILE', __FILE__ );
define( 'DIVI_ANCHOR_DIR', plugin_dir_path( __FILE__ ) );
define( 'DIVI_ANCHOR_URL', plugin_dir_url( __FILE__ ) );
define( 'DIVI_ANCHOR_BASENAME', plugin_basename( __FILE__ ) );

// Autoload Composer dependencies.
if ( file_exists( DIVI_ANCHOR_DIR . 'vendor/autoload.php' ) ) {
    require_once DIVI_ANCHOR_DIR . 'vendor/autoload.php';
}

// Plugin Update Checker — GitHub repo.
if ( class_exists( 'YahnisElsts\\PluginUpdateChecker\\v5\\PucFactory' ) ) {
    divi_anchor_setup_update_checker();
}

/**
 * Initialize the Plugin Update Checker.
 */
function divi_anchor_setup_update_checker() {
    $update_checker = YahnisElsts\PluginUpdateChecker\v5\PucFactory::buildUpdateChecker(
        'https://github.com/joelhmartin/divi-ai/',
        __FILE__,
        'divi-anchor-ai'
    );

    $update_checker->setBranch( 'main' );

    // Optional GitHub token for private repos / rate limits.
    $token = divi_anchor_get_github_token();
    if ( $token ) {
        $update_checker->setAuthentication( $token );
    }

    $update_checker->getVcsApi()->enableReleaseAssets();
}

/**
 * Resolve a GitHub access token from environment, constant, or .env file.
 *
 * @return string|null
 */
function divi_anchor_get_github_token() {
    // 1. PHP constant.
    if ( defined( 'GITHUB_ACCESS_TOKEN' ) ) {
        return GITHUB_ACCESS_TOKEN;
    }

    // 2. Environment variable.
    $env = getenv( 'GITHUB_ACCESS_TOKEN' );
    if ( $env ) {
        return $env;
    }

    // 3. .env file in plugin root.
    $env_file = DIVI_ANCHOR_DIR . '.env';
    if ( file_exists( $env_file ) ) {
        $lines = file( $env_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES );
        foreach ( $lines as $line ) {
            if ( strpos( $line, '#' ) === 0 ) {
                continue;
            }
            if ( strpos( $line, 'GITHUB_ACCESS_TOKEN=' ) === 0 ) {
                return trim( substr( $line, strlen( 'GITHUB_ACCESS_TOKEN=' ) ) );
            }
        }
    }

    return null;
}

// Bootstrap on plugins_loaded.
add_action( 'plugins_loaded', 'divi_anchor_init' );

/**
 * Initialize the plugin.
 */
function divi_anchor_init() {
    // Load plugin classes.
    require_once DIVI_ANCHOR_DIR . 'includes/class-version-adapter.php';
    require_once DIVI_ANCHOR_DIR . 'includes/class-schema-registry.php';
    require_once DIVI_ANCHOR_DIR . 'includes/class-ai-proxy.php';
    require_once DIVI_ANCHOR_DIR . 'includes/class-changeset.php';
    require_once DIVI_ANCHOR_DIR . 'includes/class-snapshot.php';
    require_once DIVI_ANCHOR_DIR . 'includes/class-rest-api.php';
    require_once DIVI_ANCHOR_DIR . 'includes/class-admin.php';
    require_once DIVI_ANCHOR_DIR . 'includes/class-divi-anchor.php';

    // Boot the plugin.
    Divi_Anchor::get_instance();
}
