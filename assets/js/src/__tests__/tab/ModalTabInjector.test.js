/**
 * Tests for ModalTabInjector.
 */

import { ModalTabInjector } from '../../tab/ModalTabInjector';

describe('ModalTabInjector', () => {
    let injector;
    let callbacks;

    beforeEach(() => {
        callbacks = {
            onModalOpen: jest.fn(),
            onModalClose: jest.fn(),
            onModuleChange: jest.fn(),
        };
        injector = new ModalTabInjector(callbacks);
    });

    afterEach(() => {
        injector.destroy();
        // Clean up any modals left in DOM.
        document.querySelectorAll('.et-fb-settings-modal').forEach((el) => el.remove());
    });

    /**
     * Helper: create a fake Divi settings modal with tab bar.
     */
    function createFakeModal() {
        const modal = document.createElement('div');
        modal.className = 'et-fb-settings-modal';

        const tabBar = document.createElement('div');
        tabBar.className = 'et-fb-tabs';

        ['Content', 'Design', 'Advanced'].forEach((label) => {
            const tab = document.createElement('div');
            tab.className = 'et-fb-tabs__item';
            tab.textContent = label;
            tabBar.appendChild(tab);
        });

        // Mark first tab as active.
        tabBar.children[0].classList.add('et-fb-tabs__item--active');

        modal.appendChild(tabBar);

        const form = document.createElement('div');
        form.className = 'et-fb-form';
        modal.appendChild(form);

        return modal;
    }

    // --- init ---

    describe('init', () => {
        test('creates a MutationObserver', () => {
            injector.init();
            expect(injector._observer).not.toBeNull();
        });

        test('detects existing modal on init', async () => {
            const modal = createFakeModal();
            document.body.appendChild(modal);

            injector.init();

            // Give the retry interval time to inject.
            await new Promise((r) => setTimeout(r, 200));

            expect(callbacks.onModalOpen).toHaveBeenCalled();
        });
    });

    // --- tab injection ---

    describe('tab injection', () => {
        test('injects AI tab when modal appears', async () => {
            injector.init();

            const modal = createFakeModal();
            document.body.appendChild(modal);

            // Wait for MutationObserver + retry.
            await new Promise((r) => setTimeout(r, 300));

            const aiTab = modal.querySelector('[data-da-tab="ai"]');
            expect(aiTab).not.toBeNull();
            expect(aiTab.textContent).toBe('AI');
        });

        test('creates AI content container', async () => {
            injector.init();

            const modal = createFakeModal();
            document.body.appendChild(modal);

            await new Promise((r) => setTimeout(r, 300));

            const aiContent = modal.querySelector('.da-ai-tab-content');
            expect(aiContent).not.toBeNull();
            expect(aiContent.style.display).toBe('none');
        });

        test('total tabs becomes 4', async () => {
            injector.init();

            const modal = createFakeModal();
            document.body.appendChild(modal);

            await new Promise((r) => setTimeout(r, 300));

            const tabs = modal.querySelectorAll('.et-fb-tabs__item');
            expect(tabs.length).toBe(4);
        });

        test('does not inject duplicate AI tabs', async () => {
            injector.init();

            const modal = createFakeModal();
            document.body.appendChild(modal);

            await new Promise((r) => setTimeout(r, 300));

            // Trigger injection attempt again — should not duplicate.
            injector._tryInjectTab(modal, null);

            const aiTabs = modal.querySelectorAll('[data-da-tab="ai"]');
            expect(aiTabs.length).toBe(1);
        });
    });

    // --- tab switching ---

    describe('tab switching', () => {
        test('clicking AI tab hides native content and shows AI content', async () => {
            injector.init();

            const modal = createFakeModal();
            document.body.appendChild(modal);

            await new Promise((r) => setTimeout(r, 300));

            const aiTab = modal.querySelector('[data-da-tab="ai"]');
            aiTab.click();

            const form = modal.querySelector('.et-fb-form');
            const aiContent = modal.querySelector('.da-ai-tab-content');

            expect(form.style.display).toBe('none');
            expect(aiContent.style.display).toBe('');
            expect(aiTab.classList.contains('et-fb-tabs__item--active')).toBe(true);
        });

        test('activating native tab hides AI content', async () => {
            injector.init();

            const modal = createFakeModal();
            document.body.appendChild(modal);

            await new Promise((r) => setTimeout(r, 300));

            // Activate AI tab first.
            const aiTab = modal.querySelector('[data-da-tab="ai"]');
            aiTab.click();

            // Simulate a native tab becoming active (Divi would do this).
            const nativeTab = modal.querySelectorAll('.et-fb-tabs__item')[1];
            nativeTab.classList.add('et-fb-tabs__item--active');

            // MutationObserver is async — wait for it.
            await new Promise((r) => setTimeout(r, 50));

            expect(aiTab.classList.contains('et-fb-tabs__item--active')).toBe(false);
            const aiContent = modal.querySelector('.da-ai-tab-content');
            expect(aiContent.style.display).toBe('none');
        });
    });

    // --- modal lifecycle ---

    describe('modal lifecycle', () => {
        test('calls onModalClose when modal is removed', async () => {
            injector.init();

            const modal = createFakeModal();
            document.body.appendChild(modal);

            await new Promise((r) => setTimeout(r, 300));

            document.body.removeChild(modal);

            await new Promise((r) => setTimeout(r, 50));

            expect(callbacks.onModalClose).toHaveBeenCalled();
        });
    });

    // --- destroy ---

    describe('destroy', () => {
        test('disconnects observer', () => {
            injector.init();
            injector.destroy();
            expect(injector._observer).toBeNull();
        });
    });
});
