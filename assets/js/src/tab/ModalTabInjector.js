/**
 * Modal Tab Injector — Injects an AI tab into Divi's module settings modal.
 *
 * Uses a MutationObserver on document.body to detect when the settings modal
 * appears, then injects a 4th "AI" tab alongside Content/Design/Advanced.
 *
 * @package Divi_Anchor_AI
 */

export class ModalTabInjector {
    /**
     * @param {Object}   callbacks
     * @param {Function} callbacks.onModalOpen   - (container, moduleInfo) => void
     * @param {Function} callbacks.onModalClose  - () => void
     * @param {Function} callbacks.onModuleChange - (moduleInfo) => void
     */
    constructor(callbacks = {}) {
        this.onModalOpen = callbacks.onModalOpen || (() => {});
        this.onModalClose = callbacks.onModalClose || (() => {});
        this.onModuleChange = callbacks.onModuleChange || (() => {});

        this._observer = null;
        this._tabObserver = null;
        this._currentModal = null;
        this._currentModuleCid = null;
        this._aiTabBtn = null;
        this._aiContent = null;
        this._nativeContent = null;
        this._injected = false;
    }

    /**
     * Start observing the DOM for settings modal appearance.
     */
    init() {
        this._observer = new MutationObserver((mutations) => {
            this._handleMutations(mutations);
        });

        this._observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        // Check if modal is already present (e.g. script loaded late).
        const existing = document.querySelector('.et-fb-settings-modal');
        if (existing) {
            this._onModalAppear(existing);
        }
    }

    /**
     * Stop observing and clean up.
     */
    destroy() {
        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }
        this._cleanupTabObserver();
        this._currentModal = null;
        this._injected = false;
    }

    /**
     * Handle DOM mutations — detect modal add/remove.
     *
     * @param {MutationRecord[]} mutations
     */
    _handleMutations(mutations) {
        for (const mutation of mutations) {
            // Check for added modal.
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== Node.ELEMENT_NODE) continue;

                const modal = node.classList && node.classList.contains('et-fb-settings-modal')
                    ? node
                    : node.querySelector && node.querySelector('.et-fb-settings-modal');

                if (modal && modal !== this._currentModal) {
                    this._onModalAppear(modal);
                }
            }

            // Check for removed modal.
            for (const node of mutation.removedNodes) {
                if (node.nodeType !== Node.ELEMENT_NODE) continue;

                if (
                    (node === this._currentModal) ||
                    (node.querySelector && node.querySelector('.et-fb-settings-modal') === this._currentModal)
                ) {
                    this._onModalDisappear();
                }
            }
        }
    }

    /**
     * Called when a settings modal appears in the DOM.
     *
     * @param {HTMLElement} modal
     */
    _onModalAppear(modal) {
        this._currentModal = modal;
        this._injected = false;

        // Detect module info.
        const moduleInfo = this._getModuleInfo();
        const moduleCid = moduleInfo ? moduleInfo.moduleId : null;

        // Check for module change.
        if (this._currentModuleCid && moduleCid !== this._currentModuleCid) {
            this.onModuleChange(moduleInfo);
        }
        this._currentModuleCid = moduleCid;

        // Inject the tab (may need a short delay for Divi to finish rendering tabs).
        this._tryInjectTab(modal, moduleInfo);
    }

    /**
     * Called when the settings modal is removed from the DOM.
     */
    _onModalDisappear() {
        this._cleanupTabObserver();
        this._currentModal = null;
        this._injected = false;
        this._aiTabBtn = null;
        this._aiContent = null;
        this._nativeContent = null;
        this.onModalClose();
    }

    /**
     * Attempt to inject the AI tab into the modal.
     * Retries briefly if tab bar isn't rendered yet.
     *
     * @param {HTMLElement} modal
     * @param {Object}     moduleInfo
     */
    _tryInjectTab(modal, moduleInfo) {
        const inject = () => {
            if (this._injected) return;

            const tabBar = modal.querySelector('.et-fb-tabs');
            if (!tabBar) return false;

            const tabs = tabBar.querySelectorAll('.et-fb-tabs__item');
            if (tabs.length === 0) return false;

            // Don't inject if we already have an AI tab.
            if (tabBar.querySelector('[data-da-tab="ai"]')) {
                this._injected = true;
                return true;
            }

            // Clone structure from the last existing tab for consistent styling.
            const lastTab = tabs[tabs.length - 1];
            this._aiTabBtn = lastTab.cloneNode(true);
            this._aiTabBtn.setAttribute('data-da-tab', 'ai');
            this._aiTabBtn.classList.remove('et-fb-tabs__item--active');
            this._aiTabBtn.textContent = '';

            // Set text — handle inner span if present.
            const inner = document.createElement('span');
            inner.textContent = 'AI';
            this._aiTabBtn.appendChild(inner);

            tabBar.appendChild(this._aiTabBtn);

            // Find native content area.
            this._nativeContent = modal.querySelector('.et-fb-form') ||
                                   modal.querySelector('.et-fb-settings-modal__content');

            // Create AI content container.
            this._aiContent = document.createElement('div');
            this._aiContent.className = 'da-ai-tab-content';
            this._aiContent.style.display = 'none';

            // Insert AI content as sibling of native content.
            if (this._nativeContent && this._nativeContent.parentNode) {
                this._nativeContent.parentNode.insertBefore(
                    this._aiContent,
                    this._nativeContent.nextSibling
                );
            } else {
                modal.appendChild(this._aiContent);
            }

            // Wire click handler on our AI tab.
            this._aiTabBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._activateAITab();
            });

            // Observe native tabs for activation (deactivates AI tab).
            this._observeNativeTabs(tabs);

            this._injected = true;

            // Fire callback.
            this.onModalOpen(this._aiContent, moduleInfo);
            return true;
        };

        // Try immediately, then retry a few times if tab bar isn't ready.
        if (!inject()) {
            let attempts = 0;
            const interval = setInterval(() => {
                attempts++;
                if (inject() || attempts >= 10) {
                    clearInterval(interval);
                }
            }, 100);
        }
    }

    /**
     * Activate the AI tab — hide native content, show AI content.
     */
    _activateAITab() {
        if (!this._currentModal) return;

        // Deactivate all native tabs.
        const tabs = this._currentModal.querySelectorAll('.et-fb-tabs__item');
        tabs.forEach((tab) => {
            if (tab !== this._aiTabBtn) {
                tab.classList.remove('et-fb-tabs__item--active');
            }
        });

        // Activate AI tab.
        this._aiTabBtn.classList.add('et-fb-tabs__item--active');

        // Toggle content visibility.
        if (this._nativeContent) {
            this._nativeContent.style.display = 'none';
        }
        if (this._aiContent) {
            this._aiContent.style.display = '';
        }
    }

    /**
     * Deactivate the AI tab — show native content, hide AI content.
     */
    _deactivateAITab() {
        if (this._aiTabBtn) {
            this._aiTabBtn.classList.remove('et-fb-tabs__item--active');
        }
        if (this._nativeContent) {
            this._nativeContent.style.display = '';
        }
        if (this._aiContent) {
            this._aiContent.style.display = 'none';
        }
    }

    /**
     * Observe native tab buttons for class changes to detect activation.
     *
     * @param {NodeList} tabs - Native tab elements.
     */
    _observeNativeTabs(tabs) {
        this._cleanupTabObserver();

        this._tabObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.attributeName !== 'class') continue;
                const target = mutation.target;
                if (target === this._aiTabBtn) continue;

                // If a native tab became active, deactivate ours.
                if (target.classList.contains('et-fb-tabs__item--active')) {
                    this._deactivateAITab();
                }
            }
        });

        tabs.forEach((tab) => {
            if (tab !== this._aiTabBtn) {
                this._tabObserver.observe(tab, { attributes: true, attributeFilter: ['class'] });
            }
        });
    }

    /**
     * Clean up the tab class observer.
     */
    _cleanupTabObserver() {
        if (this._tabObserver) {
            this._tabObserver.disconnect();
            this._tabObserver = null;
        }
    }

    /**
     * Get info about the currently active module.
     *
     * @returns {Object|null} { moduleId, moduleType, moduleData } or null.
     */
    _getModuleInfo() {
        // Try ET_Builder.ActiveModule (Divi 4 Backbone).
        if (typeof window.ET_Builder !== 'undefined' && window.ET_Builder.ActiveModule) {
            const model = window.ET_Builder.ActiveModule;
            return {
                moduleId: model.cid || model.get('cid'),
                moduleType: model.get('type') || model.get('module_type'),
                moduleData: model.attributes || {},
            };
        }

        // Fallback: look for data on the selected element.
        const selected = document.querySelector('.et_pb_selected');
        if (selected) {
            return {
                moduleId: selected.getAttribute('data-cid') || null,
                moduleType: selected.getAttribute('data-type') || null,
                moduleData: {},
            };
        }

        return null;
    }
}
