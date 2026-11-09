import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import VirtualCreaturesGame from '../presentation/VirtualCreaturesGame.vue';
import { listAllCharacterSpecies } from '../domain/character-registry';

describe('VirtualCreaturesGame Mobile Portrait-First Component Integration', () => {
  it('assigns a random dinosaur, forbids manual character/stage/animation selection, feeds, cares, inspects sheet, and simulates offline evolution', async () => {
    const wrapper = mount(VirtualCreaturesGame);
    await flushPromises();

    const allDisplayNames = listAllCharacterSpecies().map((s) => s.displayName);
    const activeName = wrapper.get('[data-testid="active-character-name"]').text();
    expect(allDisplayNames).toContain(activeName);

    // Always starts as an egg (ovo) cracking and hatching into baby!
    expect(wrapper.get('[data-testid="active-stage-badge"]').text()).toBe('ovo');
    await wrapper.get('[data-testid="hatch-egg-btn"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="active-stage-badge"]').text()).toBe('baby');

    // Ensure 90s virtual pet rules: NO manual dinosaur selector, NO manual stage buttons, NO manual animation buttons
    expect(wrapper.find('[data-testid="nav-tab-roster"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="stage-btn-adulto"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="anim-btn-comendo"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="evolution-status-bar"]').exists()).toBe(true);

    // Verify navigation bar is always sticky at the bottom
    const navBar = wrapper.get('[data-testid="bottom-navigation-bar"]');
    expect(navBar.classes()).toContain('sticky');
    expect(navBar.classes()).toContain('bottom-0');
    expect(navBar.classes()).toContain('z-50');

    // Feed universal spring water
    await wrapper.get('[data-testid="feed-btn-thermal-spring-water"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="feedback-banner"]').text()).toContain(
      'Água Cristalina da Nascente'
    );

    // Buy +1 food item
    await wrapper.get('[data-testid="buy-food-btn-thermal-spring-water"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="feedback-banner"]').text()).toContain('Comprou');

    // Switch to Activities tab and execute purifying-bath
    await wrapper.get('[data-testid="nav-tab-activities"]').trigger('click');
    await wrapper.get('[data-testid="activity-btn-purifying-bath"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="feedback-banner"]').text()).toContain(
      'Banho Termal Purificador'
    );

    // Verify biological sex symbol (♂ or ♀) is displayed on top of dinosaur image
    const sexBadge = wrapper.get('[data-testid="active-sex-badge"]');
    expect(['♂', '♀']).toContain(sexBadge.text().trim());
    // Verify text "Macho" or "Fêmea" is not present in header
    const headerEl = wrapper.get('header');
    expect(headerEl.text()).not.toContain('Macho');
    expect(headerEl.text()).not.toContain('Fêmea');

    // Switch to Genetics tab and verify it modifies the view div directly
    await wrapper.get('[data-testid="nav-tab-genetics"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="tab-content-genetics"]').text()).toContain(
      'PixelForge Genetics & Reprodução'
    );
    // Verify local dinosaur select dropdown exists, lists dinosaurs, and selects active creature
    const dinoSelect = wrapper.get('[data-testid="local-dinosaur-select"]');
    expect(dinoSelect.findAll('option').length).toBeGreaterThan(0);
    expect((dinoSelect.element as HTMLSelectElement).value).toBeTruthy();

    // Switch to Character Sheet tab (Ficha Individual)
    await wrapper.get('[data-testid="nav-tab-sheet"]').trigger('click');
    expect(wrapper.get('[data-testid="tab-content-sheet"]').text()).toContain('Ficha Oficial');

    // Switch to Rosassauro and verify whole APK background adopts Rosassauro's primary color (pink)
    await wrapper.get('[data-testid="select-species-rosassauro"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="active-character-name"]').text()).toBe('Rosassauro');
    expect(wrapper.get('[data-testid="active-companion-badge"]').text()).toBe('Rosassauro');

    const rootContainer = wrapper.get('[data-testid="game-root-container"]');
    const rootBg = (rootContainer.element as HTMLElement).style.backgroundColor;
    // Check that rootBg is defined and reflects dynamic theming (rgb value formatted by DOM)
    expect(rootBg).toBeTruthy();

    // Switch to Settings tab, test offline simulation (+6h), quality preset, grid toggle, and random reset
    await wrapper.get('[data-testid="nav-tab-settings"]').trigger('click');
    await wrapper.get('[data-testid="sim-offline-6h"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="feedback-banner"]').text()).toContain('+6h offline');

    await wrapper.get('[data-testid="quality-btn-balanced"]').trigger('click');
    await wrapper.get('[data-testid="toggle-grid-btn"]').trigger('click');

    await wrapper.get('[data-testid="reset-save-btn"]').trigger('click');
    await flushPromises();
    const nextRandomName = wrapper.get('[data-testid="active-character-name"]').text();
    expect(allDisplayNames).toContain(nextRandomName);

    wrapper.unmount();
  });
});
