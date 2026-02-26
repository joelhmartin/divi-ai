<?php
/**
 * Admin settings page template.
 *
 * @package Divi_Anchor_AI
 *
 * @var array $settings    Plugin settings.
 * @var array $system_info System info from version adapter.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

$active_provider = isset( $settings['active_provider'] ) ? $settings['active_provider'] : 'anthropic';
?>
<div class="wrap divi-anchor-settings">
    <h1><?php esc_html_e( 'Divi Anchor AI Settings', 'divi-anchor-ai' ); ?></h1>

    <form method="post" action="options.php">
        <?php settings_fields( 'divi_anchor_settings_group' ); ?>

        <!-- AI Providers -->
        <div class="divi-anchor-card">
            <h2><?php esc_html_e( 'AI Providers', 'divi-anchor-ai' ); ?></h2>
            <p class="description"><?php esc_html_e( 'Enter your API keys and select the active provider.', 'divi-anchor-ai' ); ?></p>

            <table class="form-table">
                <tr>
                    <th scope="row">
                        <label for="anthropic_api_key"><?php esc_html_e( 'Anthropic API Key', 'divi-anchor-ai' ); ?></label>
                    </th>
                    <td>
                        <div class="divi-anchor-key-field">
                            <input
                                type="password"
                                id="anthropic_api_key"
                                name="divi_anchor_settings[anthropic_api_key]"
                                value="<?php echo esc_attr( isset( $settings['anthropic_api_key'] ) ? $settings['anthropic_api_key'] : '' ); ?>"
                                class="regular-text"
                                autocomplete="off"
                            />
                            <button type="button" class="button divi-anchor-toggle-key" data-target="anthropic_api_key">
                                <?php esc_html_e( 'Show', 'divi-anchor-ai' ); ?>
                            </button>
                        </div>
                    </td>
                </tr>
                <tr>
                    <th scope="row">
                        <label for="openai_api_key"><?php esc_html_e( 'OpenAI API Key', 'divi-anchor-ai' ); ?></label>
                    </th>
                    <td>
                        <div class="divi-anchor-key-field">
                            <input
                                type="password"
                                id="openai_api_key"
                                name="divi_anchor_settings[openai_api_key]"
                                value="<?php echo esc_attr( isset( $settings['openai_api_key'] ) ? $settings['openai_api_key'] : '' ); ?>"
                                class="regular-text"
                                autocomplete="off"
                            />
                            <button type="button" class="button divi-anchor-toggle-key" data-target="openai_api_key">
                                <?php esc_html_e( 'Show', 'divi-anchor-ai' ); ?>
                            </button>
                        </div>
                    </td>
                </tr>
                <tr>
                    <th scope="row">
                        <label for="gemini_api_key"><?php esc_html_e( 'Gemini API Key', 'divi-anchor-ai' ); ?></label>
                    </th>
                    <td>
                        <div class="divi-anchor-key-field">
                            <input
                                type="password"
                                id="gemini_api_key"
                                name="divi_anchor_settings[gemini_api_key]"
                                value="<?php echo esc_attr( isset( $settings['gemini_api_key'] ) ? $settings['gemini_api_key'] : '' ); ?>"
                                class="regular-text"
                                autocomplete="off"
                            />
                            <button type="button" class="button divi-anchor-toggle-key" data-target="gemini_api_key">
                                <?php esc_html_e( 'Show', 'divi-anchor-ai' ); ?>
                            </button>
                        </div>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><?php esc_html_e( 'Active Provider', 'divi-anchor-ai' ); ?></th>
                    <td>
                        <fieldset>
                            <?php
                            $providers = array(
                                'anthropic' => __( 'Anthropic Claude', 'divi-anchor-ai' ),
                                'openai'    => __( 'OpenAI', 'divi-anchor-ai' ),
                                'gemini'    => __( 'Google Gemini', 'divi-anchor-ai' ),
                            );
                            $key_fields = array(
                                'anthropic' => 'anthropic_api_key',
                                'openai'    => 'openai_api_key',
                                'gemini'    => 'gemini_api_key',
                            );
                            foreach ( $providers as $value => $label ) :
                                $has_key  = ! empty( $settings[ $key_fields[ $value ] ] );
                                $disabled = ! $has_key ? 'disabled' : '';
                            ?>
                                <label style="display: block; margin-bottom: 6px;">
                                    <input
                                        type="radio"
                                        name="divi_anchor_settings[active_provider]"
                                        value="<?php echo esc_attr( $value ); ?>"
                                        <?php checked( $active_provider, $value ); ?>
                                        <?php echo esc_attr( $disabled ); ?>
                                    />
                                    <?php echo esc_html( $label ); ?>
                                    <?php if ( ! $has_key ) : ?>
                                        <span class="description">(<?php esc_html_e( 'no key entered', 'divi-anchor-ai' ); ?>)</span>
                                    <?php endif; ?>
                                </label>
                            <?php endforeach; ?>
                        </fieldset>
                    </td>
                </tr>
            </table>
        </div>

        <!-- Feature Toggles -->
        <div class="divi-anchor-card">
            <h2><?php esc_html_e( 'Features', 'divi-anchor-ai' ); ?></h2>

            <table class="form-table">
                <tr>
                    <th scope="row"><?php esc_html_e( 'Module Analysis', 'divi-anchor-ai' ); ?></th>
                    <td>
                        <label>
                            <input
                                type="checkbox"
                                name="divi_anchor_settings[feature_analysis]"
                                value="on"
                                <?php checked( isset( $settings['feature_analysis'] ) ? $settings['feature_analysis'] : 'on', 'on' ); ?>
                            />
                            <?php esc_html_e( 'Enable AI-powered module analysis', 'divi-anchor-ai' ); ?>
                        </label>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><?php esc_html_e( 'Change Generation', 'divi-anchor-ai' ); ?></th>
                    <td>
                        <label>
                            <input
                                type="checkbox"
                                name="divi_anchor_settings[feature_changes]"
                                value="on"
                                <?php checked( isset( $settings['feature_changes'] ) ? $settings['feature_changes'] : 'on', 'on' ); ?>
                            />
                            <?php esc_html_e( 'Enable AI-generated changesets', 'divi-anchor-ai' ); ?>
                        </label>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><?php esc_html_e( 'Snapshots', 'divi-anchor-ai' ); ?></th>
                    <td>
                        <label>
                            <input
                                type="checkbox"
                                name="divi_anchor_settings[feature_snapshots]"
                                value="on"
                                <?php checked( isset( $settings['feature_snapshots'] ) ? $settings['feature_snapshots'] : 'on', 'on' ); ?>
                            />
                            <?php esc_html_e( 'Enable module state snapshots and undo', 'divi-anchor-ai' ); ?>
                        </label>
                    </td>
                </tr>
            </table>
        </div>

        <?php submit_button( __( 'Save Settings', 'divi-anchor-ai' ) ); ?>
    </form>

    <!-- System Info (read-only) -->
    <div class="divi-anchor-card">
        <h2><?php esc_html_e( 'System Information', 'divi-anchor-ai' ); ?></h2>
        <table class="divi-anchor-sysinfo">
            <tr>
                <td><?php esc_html_e( 'Plugin Version', 'divi-anchor-ai' ); ?></td>
                <td><?php echo esc_html( DIVI_ANCHOR_VERSION ); ?></td>
            </tr>
            <tr>
                <td><?php esc_html_e( 'Divi Detected', 'divi-anchor-ai' ); ?></td>
                <td>
                    <?php if ( $system_info['divi_active'] ) : ?>
                        <?php
                        printf(
                            '%s %s',
                            esc_html__( 'Yes — Version', 'divi-anchor-ai' ),
                            esc_html( $system_info['divi_full'] ?: $system_info['divi_version'] )
                        );
                        ?>
                    <?php else : ?>
                        <span style="color: #d63638;"><?php esc_html_e( 'Divi not detected', 'divi-anchor-ai' ); ?></span>
                    <?php endif; ?>
                </td>
            </tr>
            <tr>
                <td><?php esc_html_e( 'Divi Major Version', 'divi-anchor-ai' ); ?></td>
                <td><?php echo esc_html( $system_info['divi_version'] ?: '—' ); ?></td>
            </tr>
            <tr>
                <td><?php esc_html_e( 'PHP Version', 'divi-anchor-ai' ); ?></td>
                <td><?php echo esc_html( $system_info['php_version'] ); ?></td>
            </tr>
            <tr>
                <td><?php esc_html_e( 'WordPress Version', 'divi-anchor-ai' ); ?></td>
                <td><?php echo esc_html( $system_info['wp_version'] ); ?></td>
            </tr>
            <tr>
                <td><?php esc_html_e( 'Active AI Provider', 'divi-anchor-ai' ); ?></td>
                <td>
                    <?php
                    $provider_labels = array(
                        'anthropic' => 'Anthropic Claude',
                        'openai'    => 'OpenAI',
                        'gemini'    => 'Google Gemini',
                    );
                    $current = isset( $settings['active_provider'] ) ? $settings['active_provider'] : 'anthropic';
                    echo esc_html( isset( $provider_labels[ $current ] ) ? $provider_labels[ $current ] : $current );
                    ?>
                </td>
            </tr>
            <tr>
                <td><?php esc_html_e( 'API Usage', 'divi-anchor-ai' ); ?></td>
                <td><em><?php esc_html_e( 'Coming in Phase 2', 'divi-anchor-ai' ); ?></em></td>
            </tr>
        </table>
    </div>
</div>

<script>
document.querySelectorAll('.divi-anchor-toggle-key').forEach(function(btn) {
    btn.addEventListener('click', function() {
        var input = document.getElementById(this.dataset.target);
        if (input.type === 'password') {
            input.type = 'text';
            this.textContent = '<?php echo esc_js( __( 'Hide', 'divi-anchor-ai' ) ); ?>';
        } else {
            input.type = 'password';
            this.textContent = '<?php echo esc_js( __( 'Show', 'divi-anchor-ai' ) ); ?>';
        }
    });
});
</script>
