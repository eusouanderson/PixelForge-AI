import { describe, expect, it } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import PixelArtViewer from './PixelArtViewer.vue';

describe('PixelArtViewer Studio Super-Resolution Comparison', () => {
  it('allows switching scale, upscaling algorithm, detail enhancement, and side-by-side compare mode without altering presets', async () => {
    const wrapper = mount(PixelArtViewer);

    expect(wrapper.get('[data-testid="studio-main-canvas"]').attributes('width')).toBe('256');

    await wrapper.get('[data-testid="studio-scale-btn-4"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="studio-main-canvas"]').attributes('width')).toBe('128');

    await wrapper.get('[data-testid="studio-algorithm-select"]').setValue('intelligent');
    await wrapper.get('[data-testid="studio-enhance-btn"]').trigger('click');
    await flushPromises();

    await wrapper.get('[data-testid="studio-compare-btn"]').trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-testid="studio-compare-grid"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="compare-original-canvas"]').attributes('width')).toBe('32');
    expect(wrapper.get('[data-testid="compare-nn-canvas"]').attributes('width')).toBe('128');
    expect(wrapper.get('[data-testid="compare-smart-canvas"]').attributes('width')).toBe('128');

    await wrapper.get('[data-testid="studio-scale-btn-16"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="compare-nn-canvas"]').attributes('width')).toBe('512');
    expect(wrapper.get('[data-testid="compare-smart-canvas"]').attributes('width')).toBe('512');

    wrapper.unmount();
  });
});
