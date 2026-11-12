import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import VirtualCreaturesGame from '../presentation/VirtualCreaturesGame.vue';
import {
  EGG_INCUBATION_DURATION_MS,
  listAllCharacterSpecies
} from '../domain/character-registry';
import { createNewGameSaveSnapshot } from '@/domains/persistence/domain/persistence-engine';
import { createGenesisGenome } from '@/domains/genetics/domain/dna-engine';
import { crossGenomes } from '@/domains/genetics/domain/inheritance-engine';
import { recordBreedingResultUseCase } from '@/domains/persistence/application/game-session-service';

describe('VirtualCreaturesGame Mobile Portrait-First Component Integration', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with one random egg, waits minutes to play hatch animation, removes switcher from Ficha, and gates dev tools behind developer mode', async () => {
    vi.useFakeTimers();
    const startMs = new Date('2026-11-11T12:00:00Z').getTime();
    vi.setSystemTime(startMs);

    const wrapper = mount(VirtualCreaturesGame);
    await flushPromises();

    const allDisplayNames = listAllCharacterSpecies().map((s) => s.displayName);
    const activeName = wrapper.get('[data-testid="active-character-name"]').text();
    expect(allDisplayNames).toContain(activeName);

    // Always starts as an intact egg (ovo) with countdown before opening animation
    expect(wrapper.get('[data-testid="active-stage-badge"]').text()).toBe('ovo');
    expect(wrapper.get('[data-testid="egg-countdown-label"]').text()).toContain('02:00');
    expect(wrapper.find('[data-testid="hatch-egg-btn"]').exists()).toBe(false);

    // Feeding is disabled while incubating in the egg
    expect(
      (wrapper.get('[data-testid="feed-btn-thermal-spring-water"]').element as HTMLButtonElement)
        .disabled
    ).toBe(true);

    // After ~1 minute (< 2 min incubation), egg is STILL incubating as 'ovo'
    vi.setSystemTime(startMs + 60_000);
    await vi.advanceTimersByTimeAsync(1_000);
    await flushPromises();
    expect(wrapper.get('[data-testid="active-stage-badge"]').text()).toBe('ovo');
    expect(wrapper.get('[data-testid="egg-countdown-label"]').text()).toContain('00:59');

    // Check Ficha tab: companion switcher MUST NOT exist in Ficha!
    await wrapper.get('[data-testid="nav-tab-sheet"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="tab-content-sheet"]').text()).toContain('Ficha Oficial');
    expect(wrapper.find('[data-testid="companion-selector-card"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="select-species-rosassauro"]').exists()).toBe(false);

    // Check Ajustes tab while Developer Mode is OFF: dev tools MUST be hidden!
    await wrapper.get('[data-testid="nav-tab-settings"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="toggle-dev-mode-btn"]').text()).toContain('Desativado');
    expect(wrapper.find('[data-testid="developer-tools-section"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="companion-selector-card"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="sim-offline-6h"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="reset-save-btn"]').exists()).toBe(false);

    // Check Genetics tab in normal mode: only the single active animal is available
    await wrapper.get('[data-testid="nav-tab-genetics"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="tab-content-genetics"]').text()).toContain(
      'PixelForge Genetics & Reprodução'
    );
    const dinoSelectNormal = wrapper.get('[data-testid="local-dinosaur-select"]');
    expect(dinoSelectNormal.findAll('option').length).toBe(1);

    // Reach full 2-minute incubation -> triggers automatic opening animation sequence
    vi.setSystemTime(startMs + EGG_INCUBATION_DURATION_MS);
    await vi.advanceTimersByTimeAsync(1_000);
    await flushPromises();
    expect(wrapper.get('[data-testid="feedback-banner"]').text()).toContain('rachando e abrindo');

    // Step through the 4-frame hatching animation (frames 1 -> 2 -> 3 -> 4 -> baby)
    await vi.advanceTimersByTimeAsync(4 * 700);
    await flushPromises();
    expect(wrapper.get('[data-testid="active-stage-badge"]').text()).toBe('baby');

    // Ensure 90s virtual pet rules: NO manual roster/stage/animation buttons
    expect(wrapper.find('[data-testid="nav-tab-roster"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="stage-btn-adulto"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="anim-btn-comendo"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="evolution-status-bar"]').exists()).toBe(true);

    // Sticky mobile navigation bar
    const navBar = wrapper.get('[data-testid="bottom-navigation-bar"]');
    expect(navBar.classes()).toContain('sticky');
    expect(navBar.classes()).toContain('bottom-0');
    expect(navBar.classes()).toContain('z-50');

    // Switch back to Feed tab & feed/buy now that baby hatched
    await wrapper.get('[data-testid="nav-tab-feed"]').trigger('click');
    await wrapper.get('[data-testid="feed-btn-thermal-spring-water"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="feedback-banner"]').text()).toContain(
      'Água Cristalina da Nascente'
    );

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

    // Biological sex symbol on viewport overlay
    const sexBadge = wrapper.get('[data-testid="active-sex-badge"]');
    expect(['♂', '♀']).toContain(sexBadge.text().trim());
    const headerEl = wrapper.get('header');
    expect(headerEl.text()).not.toContain('Macho');
    expect(headerEl.text()).not.toContain('Fêmea');

    // Enable Developer Mode in Ajustes -> companion switcher, offline simulator & reset save unlock!
    await wrapper.get('[data-testid="nav-tab-settings"]').trigger('click');
    await wrapper.get('[data-testid="toggle-dev-mode-btn"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="toggle-dev-mode-btn"]').text()).toContain('Ativado');
    expect(wrapper.find('[data-testid="developer-tools-section"]').exists()).toBe(true);

    // Switch companion inside Dev Tools in Ajustes
    await wrapper.get('[data-testid="select-species-rosassauro"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="active-character-name"]').text()).toBe('Rosassauro');
    expect(wrapper.get('[data-testid="active-companion-badge"]').text()).toBe('Rosassauro');
    const rootContainer = wrapper.get('[data-testid="game-root-container"]');
    expect((rootContainer.element as HTMLElement).style.backgroundColor).toBeTruthy();

    // Simulate +6h offline via Dev Tools, test quality & grid toggle
    await wrapper.get('[data-testid="sim-offline-6h"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="feedback-banner"]').text()).toContain('+6h offline');

    await wrapper.get('[data-testid="quality-btn-balanced"]').trigger('click');
    await wrapper.get('[data-testid="toggle-grid-btn"]').trigger('click');

    // Toggle notifications & test notification button in Settings
    const toggleNotifBtn = wrapper.get('[data-testid="toggle-notifications-btn"]');
    expect(toggleNotifBtn.text()).toContain('Desativar Alertas');
    await toggleNotifBtn.trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="toggle-notifications-btn"]').text()).toContain(
      'Ativar Alertas'
    );
    await wrapper.get('[data-testid="toggle-notifications-btn"]').trigger('click');
    await flushPromises();
    await wrapper.get('[data-testid="test-notification-btn"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="feedback-banner"]').text()).toContain('notifica');

    // Advance another +6h offline (12h total) -> in-app care alert banner appears while APK is open
    await wrapper.get('[data-testid="sim-offline-6h"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-testid="care-alert-banner"]').exists()).toBe(true);
    await wrapper.get('[data-testid="care-alert-action-btn"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-testid="tab-content-settings"]').exists()).toBe(false);

    // Reset save in Dev Tools spawns a new random egg while keeping Dev Mode active
    await wrapper.get('[data-testid="nav-tab-settings"]').trigger('click');
    await wrapper.get('[data-testid="reset-save-btn"]').trigger('click');
    await flushPromises();
    const nextRandomName = wrapper.get('[data-testid="active-character-name"]').text();
    expect(allDisplayNames).toContain(nextRandomName);
    expect(wrapper.get('[data-testid="active-stage-badge"]').text()).toBe('ovo');
    expect(wrapper.find('[data-testid="hatch-egg-btn"]').exists()).toBe(true);

    // Exercise dev hatch button & visibilitychange background transition
    await wrapper.get('[data-testid="hatch-egg-btn"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="active-stage-badge"]').text()).toBe('baby');

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    await flushPromises();
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    await flushPromises();

    wrapper.unmount();
  });

  it('completes full bred egg lifecycle in game UI: incubator banner -> start -> timer completion -> hatch baby -> care -> reload persistence', async () => {
    vi.useFakeTimers();
    const startMs = new Date('2026-11-11T15:00:00Z').getTime();
    vi.setSystemTime(startMs);

    const storageMap = new Map<string, string>();
    const fakeStorage = {
      getItem: (k: string) => storageMap.get(k) ?? null,
      setItem: (k: string, v: string) => {
        storageMap.set(k, v);
      },
      removeItem: (k: string) => {
        storageMap.delete(k);
      },
      clear: () => {
        storageMap.clear();
      },
      key: () => null,
      length: 0
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: fakeStorage,
      configurable: true
    });

    // Seed save with an adult Ignisauro parent and an available bred egg in incubator
    const base = createNewGameSaveSnapshot(startMs, 'ignisauro');
    const sire = createGenesisGenome('ignisauro', 'male', startMs, 'sire-e2e');
    const dam = createGenesisGenome('terrassauro', 'female', startMs, 'dam-e2e');
    const babyGenome = crossGenomes(sire, dam, startMs, { speciesPickRandom: 0 }, 'child-e2e');

    const adultParentSnap = {
      ...base,
      characters: {
        ...base.characters,
        ignisauro: {
          ...base.characters.ignisauro,
          runtime: {
            ...base.characters.ignisauro.runtime,
            currentStage: 'adulto' as const,
            ageHours: 480,
            currentAnimation: 'idle' as const
          },
          progression: {
            ...base.characters.ignisauro.progression,
            level: 16,
            currentStage: 'adulto' as const
          },
          genetics: sire
        }
      }
    };

    const seededSnap = recordBreedingResultUseCase(
      adultParentSnap,
      {
        sessionId: 'sess-e2e',
        timestampMs: startMs,
        sireGenomeId: sire.genomeId,
        damGenomeId: dam.genomeId,
        sireSpecies: 'ignisauro',
        damSpecies: 'terrassauro',
        offspringGenomeId: babyGenome.genomeId,
        offspringSpecies: babyGenome.species,
        winnerPeerId: 'local-player',
        isLocalWinner: true,
        mutationCount: babyGenome.mutations.length
      },
      {
        id: 'egg-e2e-1',
        ownerId: 'local-player',
        genome: babyGenome,
        targetSpecies: babyGenome.species,
        status: 'available',
        incubationProgress: 0,
        maxIncubationHours: 0.05, // 3 minutes
        isWarm: true,
        createdAtMs: startMs,
        isReadyToHatch: false
      },
      startMs
    );
    storageMap.set('pixelforge_virtual_creatures_save_v1', JSON.stringify(seededSnap));

    // Mount 1: player sees available egg banner -> opens Nursery -> starts incubation
    const wrapper1 = mount(VirtualCreaturesGame);
    await flushPromises();

    expect(wrapper1.find('[data-testid="incubator-status-banner"]').exists()).toBe(true);
    await wrapper1.get('[data-testid="open-nursery-banner-btn"]').trigger('click');
    await flushPromises();

    expect(wrapper1.find('[data-testid="egg-card-egg-e2e-1"]').exists()).toBe(true);
    await wrapper1.get('[data-testid="start-incubation-btn-egg-e2e-1"]').trigger('click');
    await flushPromises();
    expect(wrapper1.get('[data-testid="egg-status-egg-e2e-1"]').text()).toContain('Incubando');

    // Advance live clock +3 minutes so egg finishes incubation via live timer
    vi.setSystemTime(startMs + 3 * 60_000 + 5_000);
    await vi.advanceTimersByTimeAsync(1_000);
    await flushPromises();

    expect(wrapper1.get('[data-testid="egg-status-egg-e2e-1"]').text()).toContain('Pronto');

    // Open hatch preview -> give name -> confirm birth -> go care for baby
    await wrapper1.get('[data-testid="hatch-ready-btn-egg-e2e-1"]').trigger('click');
    await wrapper1.get('[data-testid="hatch-nickname-input-egg-e2e-1"]').setValue('Ignis Filho');
    await wrapper1.get('[data-testid="confirm-hatch-btn-egg-e2e-1"]').trigger('click');
    await flushPromises();

    expect(wrapper1.find('[data-testid="hatch-celebration-card"]').exists()).toBe(true);
    await wrapper1.get('[data-testid="go-to-hatched-baby-btn"]').trigger('click');
    await flushPromises();

    // Active creature is now the newborn BABY with custom name, and can be fed normally!
    expect(wrapper1.get('[data-testid="active-character-name"]').text()).toBe('Ignis Filho');
    expect(wrapper1.get('[data-testid="active-stage-badge"]').text()).toBe('baby');

    await wrapper1.get('[data-testid="feed-btn-thermal-spring-water"]').trigger('click');
    await flushPromises();
    expect(wrapper1.get('[data-testid="feedback-banner"]').text()).toContain('Água Cristalina');

    // Check Ficha tab: BOTH parent Ignisauro AND newborn Ignis Filho appear in Minha Coleção!
    await wrapper1.get('[data-testid="nav-tab-sheet"]').trigger('click');
    await flushPromises();
    const collectionText = wrapper1.get('[data-testid="player-collection-card"]').text();
    expect(collectionText).toContain('Ignisauro');
    expect(collectionText).toContain('Ignis Filho');
    expect(collectionText).toContain('adulto');
    expect(collectionText).toContain('baby');

    // Can switch back to parent Ignisauro in collection
    await wrapper1.get('[data-testid="collection-creature-ignisauro"]').trigger('click');
    await flushPromises();
    expect(wrapper1.get('[data-testid="active-character-name"]').text()).toBe('Ignisauro');
    expect(wrapper1.get('[data-testid="active-stage-badge"]').text()).toBe('adulto');

    // Switch back to newborn and unmount (simulate APK restart / page reload!)
    await wrapper1.get('[data-testid="collection-creature-creature-egg-e2e-1"]').trigger('click');
    await flushPromises();
    wrapper1.unmount();

    // Mount 2 after reload: newborn baby, parent, and 'hatched' egg remain persisted with ZERO duplication!
    const wrapper2 = mount(VirtualCreaturesGame);
    await flushPromises();
    expect(wrapper2.get('[data-testid="active-character-name"]').text()).toBe('Ignis Filho');
    expect(wrapper2.get('[data-testid="active-stage-badge"]').text()).toBe('baby');

    await wrapper2.get('[data-testid="nav-tab-genetics"]').trigger('click');
    await wrapper2.get('[data-testid="subtab-nursery"]').trigger('click');
    await flushPromises();
    expect(wrapper2.find('[data-testid="hatched-egg-record-egg-e2e-1"]').exists()).toBe(true);
    expect(wrapper2.find('[data-testid="confirm-hatch-btn-egg-e2e-1"]').exists()).toBe(false);

    wrapper2.unmount();
  });
});
