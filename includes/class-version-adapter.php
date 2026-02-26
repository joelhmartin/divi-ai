<?php
/**
 * Divi version detection adapter.
 *
 * Detects whether the active Divi installation is version 4 or 5.
 *
 * @package Divi_Anchor_AI
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Divi_Anchor_Version_Adapter {

    /** @var string|null Cached version string ('4'|'5'|null). */
    private $version = null;

    /** @var bool Whether detection has run. */
    private $detected = false;

    /**
     * Detect the active Divi version.
     *
     * @return string|null '4', '5', or null if Divi is not active.
     */
    public function detect() {
        if ( $this->detected ) {
            return $this->version;
        }

        $this->detected = true;

        // Divi 5 detection — check for D5 constant first.
        if ( defined( 'ET_BUILDER_5_VERSION' ) ) {
            $this->version = '5';
            return $this->version;
        }

        // Divi 4 detection.
        if ( $this->is_divi4() ) {
            $this->version = '4';
            return $this->version;
        }

        $this->version = null;
        return $this->version;
    }

    /**
     * Get the detected Divi major version.
     *
     * @return string|null
     */
    public function get_version() {
        return $this->detect();
    }

    /**
     * Get the full Divi version string if available.
     *
     * @return string|null
     */
    public function get_full_version() {
        $this->detect();

        if ( $this->version === '5' && defined( 'ET_BUILDER_5_VERSION' ) ) {
            return ET_BUILDER_5_VERSION;
        }

        if ( defined( 'ET_BUILDER_VERSION' ) ) {
            return ET_BUILDER_VERSION;
        }

        // Try theme version.
        $theme = wp_get_theme();
        if ( strtolower( $theme->get( 'Name' ) ) === 'divi' ) {
            return $theme->get( 'Version' );
        }

        return null;
    }

    /**
     * Whether Divi is active at all.
     *
     * @return bool
     */
    public function is_divi_active() {
        return $this->detect() !== null;
    }

    /**
     * Whether running Divi 4.
     *
     * @return bool
     */
    public function is_divi4() {
        // Builder plugin constant.
        if ( defined( 'ET_BUILDER_PLUGIN_VERSION' ) ) {
            return true;
        }

        // Theme constant.
        if ( defined( 'ET_BUILDER_VERSION' ) ) {
            return true;
        }

        // Classic builder element class.
        if ( class_exists( 'ET_Builder_Element' ) ) {
            return true;
        }

        // Check active theme name.
        if ( function_exists( 'wp_get_theme' ) ) {
            $theme = wp_get_theme();
            $name  = strtolower( $theme->get( 'Name' ) );
            if ( in_array( $name, array( 'divi', 'extra' ), true ) ) {
                return true;
            }
        }

        return false;
    }

    /**
     * Whether running Divi 5.
     *
     * @return bool
     */
    public function is_divi5() {
        return $this->detect() === '5';
    }

    /**
     * Get system info array for admin display.
     *
     * @return array
     */
    public function get_system_info() {
        return array(
            'divi_active'  => $this->is_divi_active(),
            'divi_version' => $this->get_version(),
            'divi_full'    => $this->get_full_version(),
            'php_version'  => phpversion(),
            'wp_version'   => get_bloginfo( 'version' ),
        );
    }
}
