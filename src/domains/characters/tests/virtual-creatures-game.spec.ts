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

    // Ensure 90s virtual pet rules: NO manual dinosaur selector, NO manual stage buttons, NO manual animation buttons
    expect(wrapper.find('[data-testid="nav-tab-roster"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="stage-btn-adulto"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="anim-btn-comendo"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="evolution-status-bar"]').exists()).toBe(true);

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

    // Switch to Character Sheet tab (Ficha Individual)
    await wrapper.get('[data-testid="nav-tab-sheet"]').trigger('click');
    expect(wrapper.get('[data-testid="tab-content-sheet"]').text()).toContain('Ficha Oficial');

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
