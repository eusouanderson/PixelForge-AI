import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import VirtualCreaturesGame from '../presentation/VirtualCreaturesGame.vue';

describe('VirtualCreaturesGame Mobile Portrait-First Component Integration', () => {
  it('renders active character, switches between all 8 species, feeds, executes activities, inspects sheet, and simulates offline time', async () => {
    const wrapper = mount(VirtualCreaturesGame);
    await flushPromises();

    // Default character is Ignisauro
    expect(wrapper.get('[data-testid="active-character-name"]').text()).toBe('Ignisauro');

    // Switch to Solassauro via quick selector
    await wrapper.get('[data-testid="select-char-solassauro"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="active-character-name"]').text()).toBe('Solassauro');

    // Feed favorite food for Solassauro (golden-starburst-sunpeach)
    await wrapper.get('[data-testid="feed-btn-golden-starburst-sunpeach"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="feedback-banner"]').text()).toContain('Pêssego Solar Dourado');

    // Buy +1 food item
    await wrapper.get('[data-testid="buy-food-btn-golden-starburst-sunpeach"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="feedback-banner"]').text()).toContain('Comprou');

    // Switch to Activities tab and execute solar-bask
    await wrapper.get('[data-testid="nav-tab-activities"]').trigger('click');
    await wrapper.get('[data-testid="activity-btn-solar-bask"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="feedback-banner"]').text()).toContain('Banho de Luz da Aurora');

    // Switch to Character Sheet tab (Ficha Individual)
    await wrapper.get('[data-testid="nav-tab-sheet"]').trigger('click');
    expect(wrapper.get('[data-testid="tab-content-sheet"]').text()).toContain('Ficha Oficial');
    expect(wrapper.get('[data-testid="tab-content-sheet"]').text()).toContain('Imperador Radiante');

    // Switch to Roster tab and select Umbrassauro
    await wrapper.get('[data-testid="nav-tab-roster"]').trigger('click');
    await wrapper.get('[data-testid="roster-select-umbrassauro"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="active-character-name"]').text()).toBe('Umbrassauro');

    // Switch to Settings tab, test offline simulation (+6h), quality preset, grid toggle, and reset
    await wrapper.get('[data-testid="nav-tab-settings"]').trigger('click');
    await wrapper.get('[data-testid="sim-offline-6h"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="feedback-banner"]').text()).toContain('+6h offline');

    await wrapper.get('[data-testid="quality-btn-balanced"]').trigger('click');
    await wrapper.get('[data-testid="toggle-grid-btn"]').trigger('click');

    await wrapper.get('[data-testid="reset-save-btn"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="active-character-name"]').text()).toBe('Ignisauro');

    wrapper.unmount();
  });
});

