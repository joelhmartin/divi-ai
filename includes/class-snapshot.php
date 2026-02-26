<?php
/**
 * Module state snapshots.
 *
 * Saves and restores module state using WordPress transients.
 * Provides an undo stack for rolling back changes.
 *
 * @package Divi_Anchor_AI
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Divi_Anchor_Snapshot {

    /** @var string Transient prefix. */
    const PREFIX = 'divi_anchor_snap_';

    /** @var int Maximum snapshots per module. */
    const MAX_STACK = 20;

    /** @var int Transient TTL in seconds (24 hours). */
    const TTL = 86400;

    /**
     * Save a snapshot of module state.
     *
     * @param string $module_id   Unique module identifier.
     * @param string $module_type Module type.
     * @param array  $module_data Module data to save.
     * @param string $label       Optional label for the snapshot.
     * @return string Snapshot ID.
     */
    public function save( $module_id, $module_type, $module_data, $label = '' ) {
        $snapshot_id = wp_generate_uuid4();

        $snapshot = array(
            'id'          => $snapshot_id,
            'module_id'   => $module_id,
            'module_type' => $module_type,
            'data'        => $module_data,
            'label'       => $label,
            'timestamp'   => current_time( 'timestamp' ),
        );

        // Save individual snapshot.
        set_transient( self::PREFIX . $snapshot_id, $snapshot, self::TTL );

        // Add to the module's undo stack.
        $this->push_to_stack( $module_id, $snapshot_id );

        return $snapshot_id;
    }

    /**
     * Restore a snapshot by ID.
     *
     * @param string $snapshot_id Snapshot UUID.
     * @return array|null Snapshot data or null if not found.
     */
    public function restore( $snapshot_id ) {
        $snapshot = get_transient( self::PREFIX . $snapshot_id );

        if ( ! $snapshot || ! is_array( $snapshot ) ) {
            return null;
        }

        return $snapshot;
    }

    /**
     * Get the most recent snapshot for a module (undo).
     *
     * @param string $module_id Module identifier.
     * @return array|null Snapshot data or null.
     */
    public function get_latest( $module_id ) {
        $stack = $this->get_stack( $module_id );

        if ( empty( $stack ) ) {
            return null;
        }

        $snapshot_id = end( $stack );
        return $this->restore( $snapshot_id );
    }

    /**
     * Pop the most recent snapshot from the undo stack.
     *
     * @param string $module_id Module identifier.
     * @return array|null The popped snapshot or null.
     */
    public function pop( $module_id ) {
        $stack = $this->get_stack( $module_id );

        if ( empty( $stack ) ) {
            return null;
        }

        $snapshot_id = array_pop( $stack );
        $this->set_stack( $module_id, $stack );

        $snapshot = $this->restore( $snapshot_id );

        // Clean up the transient.
        delete_transient( self::PREFIX . $snapshot_id );

        return $snapshot;
    }

    /**
     * Get the undo stack for a module.
     *
     * @param string $module_id Module identifier.
     * @return array List of snapshot IDs.
     */
    public function get_stack( $module_id ) {
        $stack = get_transient( self::PREFIX . 'stack_' . md5( $module_id ) );
        return is_array( $stack ) ? $stack : array();
    }

    /**
     * Clear all snapshots for a module.
     *
     * @param string $module_id Module identifier.
     */
    public function clear( $module_id ) {
        $stack = $this->get_stack( $module_id );

        foreach ( $stack as $snapshot_id ) {
            delete_transient( self::PREFIX . $snapshot_id );
        }

        delete_transient( self::PREFIX . 'stack_' . md5( $module_id ) );
    }

    /**
     * Push a snapshot ID onto the module's undo stack.
     *
     * @param string $module_id   Module identifier.
     * @param string $snapshot_id Snapshot UUID.
     */
    private function push_to_stack( $module_id, $snapshot_id ) {
        $stack   = $this->get_stack( $module_id );
        $stack[] = $snapshot_id;

        // Trim stack to max size.
        if ( count( $stack ) > self::MAX_STACK ) {
            $removed = array_splice( $stack, 0, count( $stack ) - self::MAX_STACK );
            foreach ( $removed as $old_id ) {
                delete_transient( self::PREFIX . $old_id );
            }
        }

        $this->set_stack( $module_id, $stack );
    }

    /**
     * Save the undo stack for a module.
     *
     * @param string $module_id Module identifier.
     * @param array  $stack     List of snapshot IDs.
     */
    private function set_stack( $module_id, $stack ) {
        set_transient( self::PREFIX . 'stack_' . md5( $module_id ), $stack, self::TTL );
    }
}
