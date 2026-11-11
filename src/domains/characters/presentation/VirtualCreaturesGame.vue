<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import {
  Utensils as UtensilsIcon,
  Dumbbell as DumbbellIcon,
  FileText as FileTextIcon,
  Settings as SettingsIcon,
  Sparkles as SparklesIcon,
  Coins as CoinsIcon,
  Clock as ClockIcon,
  RotateCcw as RotateCcwIcon,
  RefreshCw as RefreshCwIcon,
  Bell as BellIcon
} from 'lucide-vue-next';
import { UpdateManagerService } from '@/domains/updater/application/update-manager-service';
import type { UpdaterState } from '@/domains/updater/types';
import { CareNotificationService } from '@/domains/notifications/application/care-notification-service';
import type { CareNotificationManagerState } from '@/domains/notifications/types';
import { Canvas2dRenderer } from '@/infrastructure/renderer/canvas-2d-renderer';
import { BabylonCreatureSceneController } from '@/game-engine/babylon/scene-controller';
import { APP_CONFIG, resolveOutputDimensions } from '@/shared/constants/app-config';
import type {
  CharacterAnimationName,
  CharacterId,
  CharacterLifeStage
} from '@/domains/characters/types';
import {
  MAX_NATURAL_LIFESPAN_HOURS,
  getCharacterSpeciesById,
  listAllCharacterSpecies
} from '@/domains/characters/domain/character-registry';
import { generateCreatureTheme } from '@/domains/characters/domain/creature-theme-engine';
import { CharacterSpriteRepository } from '@/domains/characters/infrastructure/character-sprite-repository';
import { computeTotalPowerRating } from '@/domains/attributes/domain/attributes-engine';
import {
  evaluateDietaryPreference,
  getFoodById,
  listAllFoods
} from '@/domains/feeding/domain/feeding-engine';
import { getItemQuantity } from '@/domains/inventory/domain/inventory-engine';
import { listAllActivities } from '@/domains/activities/domain/activities-engine';
import {
  createReactiveParticleBurst,
  getCharacterParticleConfig
} from '@/domains/particles/domain/particle-registry';
import { getCharacterEnvironmentConfig } from '@/domains/environments/domain/environment-registry';
import {
  createNewGameSaveSnapshot,
  simulateOfflineProgressOnSnapshot
} from '@/domains/persistence/domain/persistence-engine';
import { LocalStorageGameSaveRepository } from '@/domains/persistence/infrastructure/local-storage-save-repository';
import {
  feedActiveCharacterUseCase,
  hatchCharacterEggUseCase,
  performCharacterActivityUseCase,
  purchaseFoodItemUseCase,
  reviveDeceasedCharacterUseCase,
  updateSettingsUseCase
} from '@/domains/persistence/application/game-session-service';
import type { GameSaveSnapshot } from '@/domains/persistence/types';
import type { GraphicsQualityPreset } from '@/domains/settings/types';
import BreedingModal from '@/domains/breeding/presentation/BreedingModal.vue';
import GenealogyTreeModal from '@/domains/breeding/presentation/GenealogyTreeModal.vue';
import { formatBiologicalSexLabel, formatBiologicalSexSymbol } from '@/domains/genetics/domain/sex-determination-engine';

const spriteRepo = new CharacterSpriteRepository();
const saveRepo = new LocalStorageGameSaveRepository();
const renderer2d = new Canvas2dRenderer();
const sceneController = new BabylonCreatureSceneController();

const saveState = ref<GameSaveSnapshot>(createNewGameSaveSnapshot(Date.now()));
const activeMobileTab = ref<'feed' | 'activities' | 'sheet' | 'settings' | 'genetics'>('feed');
const showGenealogyModal = ref<boolean>(false);
const feedbackBanner = ref<string>(
  'O ovo ancestral está rachando no Santuário Elemental! Aguarde o nascimento ou toque em Eclodir.'
);
const babylonCanvasRef = ref<HTMLCanvasElement | null>(null);
const spriteOverlayCanvasRef = ref<HTMLCanvasElement | null>(null);
const frameToggle = ref<1 | 2 | 3 | 4>(1);
const manualAnimOverride = ref<CharacterAnimationName | null>(null);

let spriteTimer: ReturnType<typeof setInterval> | null = null;
let realTimeDecayTimer: ReturnType<typeof setInterval> | null = null;
let animResetTimeout: ReturnType<typeof setTimeout> | null = null;

const updaterService = new UpdateManagerService();
const updaterState = ref<UpdaterState>(updaterService.getState());
const isChangelogOpen = ref<boolean>(false);
let unsubscribeUpdater: (() => void) | null = null;

const careNotificationService = new CareNotificationService();
const notificationState = ref<CareNotificationManagerState>(careNotificationService.getState());
let unsubscribeNotifications: (() => void) | null = null;

const allFoods = listAllFoods();
const allActivities = listAllActivities();

const allAvailableSpecies = listAllCharacterSpecies();
const activeCharacterId = computed<CharacterId>(() => saveState.value.activeCharacterId);
const activeSpecies = computed(() => getCharacterSpeciesById(activeCharacterId.value));
const creatureTheme = computed(() =>
  generateCreatureTheme(
    activeSpecies.value.visualTraits.primaryColors.base,
    activeSpecies.value.visualTraits.primaryColors.highlight
  )
);
const activeRecord = computed(() => saveState.value.characters[activeCharacterId.value]);
const activeEnvironment = computed(() => getCharacterEnvironmentConfig(activeCharacterId.value));
const activeParticles = computed(() => getCharacterParticleConfig(activeCharacterId.value));
const totalPower = computed(() => computeTotalPowerRating(activeRecord.value.attributes));

const displayedStage = computed<CharacterLifeStage>(
  () => activeRecord.value.runtime.currentStage
);

const nextEvolutionRule = computed(() =>
  activeSpecies.value.evolutionRules.find((r) => r.fromStage === displayedStage.value) ?? null
);

const displayedAnimation = computed<CharacterAnimationName>(() => {
  if (displayedStage.value === 'ovo') return 'eclosao';
  return manualAnimOverride.value ?? activeRecord.value.runtime.currentAnimation;
});

const currentSpriteArt = computed(() => {
  const maxFrames = displayedStage.value === 'ovo' ? 4 : 2;
  const f = ((frameToggle.value - 1) % maxFrames) + 1;
  return spriteRepo.getSpriteFrame(
    activeCharacterId.value,
    displayedStage.value,
    displayedAnimation.value,
    f
  );
});

const needBars = computed(() => {
  const n = activeRecord.value.needs;
  return [
    { key: 'hunger', label: 'Fome', value: n.hunger, color: 'bg-orange-500' },
    { key: 'thirst', label: 'Sede', value: n.thirst, color: 'bg-sky-400' },
    { key: 'energy', label: 'Energia', value: n.energy, color: 'bg-amber-400' },
    { key: 'happiness', label: 'Felicidade', value: n.happiness, color: 'bg-rose-500' },
    { key: 'hygiene', label: 'Higiene', value: n.hygiene, color: 'bg-teal-400' },
    { key: 'health', label: 'Saúde', value: n.health, color: 'bg-emerald-500' }
  ] as const;
});

const attributeEntries = computed(() => {
  const a = activeRecord.value.attributes;
  return [
    { label: 'Força', value: a.strength },
    { label: 'Defesa', value: a.defense },
    { label: 'Agilidade', value: a.agility },
    { label: 'Inteligência', value: a.intelligence },
    { label: 'Resistência', value: a.endurance },
    { label: 'Afinidade Elemental', value: a.elementalAffinity }
  ] as const;
});

async function persistCurrentState(): Promise<void> {
  if (saveState.value.settings.autoSaveEnabled) {
    await saveRepo.saveSnapshot(saveState.value);
  }
  await careNotificationService.syncFromSnapshot(saveState.value, Date.now());
}

const overlayDimensions = computed(() =>
  resolveOutputDimensions(
    currentSpriteArt.value.logicalDimensions,
    APP_CONFIG.rendering.surfaceScales.overlay2d
  )
);

function renderCurrentSpriteToOverlay(): void {
  const art = currentSpriteArt.value;
  const showGrid = saveState.value.settings.showPixelGrid;
  const renderOpts = {
    algorithm: APP_CONFIG.rendering.upscalingAlgorithm,
    detailEnhancement: APP_CONFIG.rendering.detailEnhancement
  };
  if (spriteOverlayCanvasRef.value) {
    renderer2d.renderToCanvas(
      spriteOverlayCanvasRef.value,
      art,
      overlayDimensions.value.width,
      overlayDimensions.value.height,
      showGrid,
      renderOpts
    );
  }
  sceneController.updateCreatureSprite(art, showGrid, {
    ...renderOpts,
    scale: APP_CONFIG.rendering.surfaceScales.texture3d
  });
}

function syncBabylonEnvironment(): void {
  sceneController.loadCharacterEnvironment(
    activeCharacterId.value,
    activeEnvironment.value,
    activeParticles.value,
    currentSpriteArt.value
  );
  renderCurrentSpriteToOverlay();
}

function triggerTemporaryAnimation(anim: CharacterAnimationName, durationMs: number = 2200): void {
  manualAnimOverride.value = anim;
  if (animResetTimeout) clearTimeout(animResetTimeout);
  animResetTimeout = setTimeout(() => {
    manualAnimOverride.value = null;
  }, durationMs);
}

async function handleFeedCharacter(foodId: string): Promise<void> {
  const res = feedActiveCharacterUseCase(saveState.value, foodId, Date.now());
  saveState.value = res.snapshot;
  feedbackBanner.value = res.message;

  if (res.success && res.reaction) {
    const isAccepted = res.reaction.accepted;
    triggerTemporaryAnimation(isAccepted ? 'comendo' : 'doente', 2400);
    sceneController.triggerReactiveParticles(
      createReactiveParticleBurst(isAccepted ? 'feeding' : 'sick')
    );
  }
  await persistCurrentState();
}

async function handlePurchaseFood(foodId: string): Promise<void> {
  const res = purchaseFoodItemUseCase(saveState.value, foodId, 1, Date.now());
  saveState.value = res.snapshot;
  feedbackBanner.value = res.message;
  await persistCurrentState();
}

async function handleExecuteActivity(activityId: string): Promise<void> {
  const res = performCharacterActivityUseCase(saveState.value, activityId, Date.now());
  saveState.value = res.snapshot;
  feedbackBanner.value = res.message;

  if (res.success) {
    triggerTemporaryAnimation('amando', 2400);
    if (res.evolvedToStage) {
      sceneController.triggerReactiveParticles(createReactiveParticleBurst('evolution'));
    } else if (res.leveledUp) {
      sceneController.triggerReactiveParticles(createReactiveParticleBurst('level-up'));
    } else {
      sceneController.triggerReactiveParticles(createReactiveParticleBurst('playing'));
    }
  }
  await persistCurrentState();
}

async function handleReviveCharacter(): Promise<void> {
  manualAnimOverride.value = null;
  saveState.value = reviveDeceasedCharacterUseCase(saveState.value, Date.now());
  feedbackBanner.value = `${activeSpecies.value.displayName} renasceu com saúde total!`;
  sceneController.triggerReactiveParticles(createReactiveParticleBurst('evolution'));
  await persistCurrentState();
}

async function handleHatchEgg(): Promise<void> {
  saveState.value = hatchCharacterEggUseCase(saveState.value, Date.now());
  feedbackBanner.value = `O ovo de ${activeSpecies.value.displayName} eclodiu!`;
  sceneController.triggerReactiveParticles(createReactiveParticleBurst('evolution'));
  await persistCurrentState();
}

async function handleSimulateOfflineHours(hours: number): Promise<void> {
  const simulatedNow = saveState.value.lastSavedAtMs + hours * 3600 * 1000;
  saveState.value = simulateOfflineProgressOnSnapshot(saveState.value, simulatedNow);
  feedbackBanner.value = `Simuladas +${hours}h offline! As necessidades e evolução avançaram conforme o tempo.`;
  renderCurrentSpriteToOverlay();
  await persistCurrentState();
}

async function handleQualityChange(quality: GraphicsQualityPreset): Promise<void> {
  saveState.value = updateSettingsUseCase(saveState.value, { graphicsQuality: quality }, Date.now());
  sceneController.setQualityPreset(quality);
  feedbackBanner.value = `Qualidade gráfica alterada para: ${quality}.`;
  await persistCurrentState();
}

async function handleTogglePixelGrid(): Promise<void> {
  const nextGrid = !saveState.value.settings.showPixelGrid;
  saveState.value = updateSettingsUseCase(
    saveState.value,
    { showPixelGrid: nextGrid },
    Date.now()
  );
  renderCurrentSpriteToOverlay();
  await persistCurrentState();
}

async function handleToggleNotifications(): Promise<void> {
  const nextEnabled = !saveState.value.settings.notificationsEnabled;
  saveState.value = updateSettingsUseCase(
    saveState.value,
    { notificationsEnabled: nextEnabled },
    Date.now()
  );
  if (nextEnabled && notificationState.value.permission === 'prompt') {
    await careNotificationService.requestPermissionAndSync(saveState.value, Date.now());
  }
  feedbackBanner.value = nextEnabled
    ? 'Notificações de cuidado crítico ativadas!'
    : 'Notificações de cuidado crítico desativadas.';
  await persistCurrentState();
}

async function handleRequestNotificationPermission(): Promise<void> {
  const state = await careNotificationService.requestPermissionAndSync(saveState.value, Date.now());
  feedbackBanner.value =
    state.permission === 'granted'
      ? 'Permissão de notificações concedida com sucesso!'
      : 'Permissão de notificações não concedida. Verifique as permissões do aplicativo.';
}

async function handleSendTestNotification(): Promise<void> {
  const sent = await careNotificationService.sendTestNotification(saveState.value, Date.now());
  feedbackBanner.value = sent
    ? 'Notificação de teste enviada para a barra do sistema!'
    : 'Não foi possível exibir a notificação (verifique a permissão do sistema).';
}

async function handleResetSave(): Promise<void> {
  await saveRepo.clearSave();
  manualAnimOverride.value = null;
  frameToggle.value = 1;
  saveState.value = createNewGameSaveSnapshot(Date.now());
  syncBabylonEnvironment();
  feedbackBanner.value = `Novo ovo sorteado de ${activeSpecies.value.displayName}! Ele já está rachando para nascer.`;
  await persistCurrentState();
}

async function handleManualCheckForUpdates(): Promise<void> {
  await updaterService.checkForUpdates(true);
}

function handleApplyWebReload(): void {
  updaterService.reloadApp();
}

async function handleInstallApk(): Promise<void> {
  await updaterService.downloadAndInstallApk();
}

async function handleResetToBundledVersion(): Promise<void> {
  await updaterService.resetToBundledVersion();
  updaterService.reloadApp();
}

async function handleSelectActiveSpecies(speciesId: CharacterId): Promise<void> {
  if (saveState.value.activeCharacterId === speciesId) return;
  saveState.value = {
    ...saveState.value,
    activeCharacterId: speciesId
  };
  manualAnimOverride.value = null;
  frameToggle.value = 1;
  syncBabylonEnvironment();
  feedbackBanner.value = `Companheiro alterado para ${activeSpecies.value.displayName}!`;
  await persistCurrentState();
}

async function handleUpdateSave(newSnapshot: GameSaveSnapshot): Promise<void> {
  saveState.value = newSnapshot;
  await persistCurrentState();
}

watch(
  creatureTheme,
  (theme) => {
    if (typeof document !== 'undefined') {
      document.body.style.backgroundColor = theme.rootBackground;
      let metaTheme = document.querySelector('meta[name="theme-color"]');
      if (!metaTheme) {
        metaTheme = document.createElement('meta');
        metaTheme.setAttribute('name', 'theme-color');
        document.head.appendChild(metaTheme);
      }
      metaTheme.setAttribute('content', theme.headerBackground);
    }
  },
  { immediate: true }
);

watch([currentSpriteArt, () => saveState.value.settings.showPixelGrid], () => {
  renderCurrentSpriteToOverlay();
});

onMounted(async () => {
  unsubscribeUpdater = updaterService.subscribe((state) => {
    updaterState.value = state;
  });
  unsubscribeNotifications = careNotificationService.subscribe((state) => {
    notificationState.value = state;
  });
  await updaterService.initialize();
  void updaterService.checkForUpdates(false);

  const loaded = await saveRepo.loadSave();
  if (loaded) {
    saveState.value = simulateOfflineProgressOnSnapshot(loaded, Date.now());
  } else {
    await persistCurrentState();
  }

  await careNotificationService.initialize(saveState.value, Date.now());
  if (
    saveState.value.settings.notificationsEnabled &&
    notificationState.value.permission === 'prompt'
  ) {
    await careNotificationService.requestPermissionAndSync(saveState.value, Date.now());
  }

  await nextTick();
  if (babylonCanvasRef.value) {
    sceneController.initialize({
      canvas: babylonCanvasRef.value,
      quality: saveState.value.settings.graphicsQuality
    });
    syncBabylonEnvironment();
  }

  spriteTimer = setInterval(() => {
    /* v8 ignore start */
    if (displayedStage.value === 'ovo' && frameToggle.value === 4) {
      frameToggle.value = 1;
      void handleHatchEgg();
      return;
    }
    frameToggle.value = frameToggle.value === 4 ? 1 : ((frameToggle.value + 1) as 1 | 2 | 3 | 4);
    /* v8 ignore stop */
  }, 650);

  realTimeDecayTimer = setInterval(() => {
    /* v8 ignore start */
    saveState.value = simulateOfflineProgressOnSnapshot(saveState.value, Date.now());
    void persistCurrentState();
    /* v8 ignore stop */
  }, 60000);
});

onUnmounted(() => {
  if (unsubscribeUpdater) unsubscribeUpdater();
  if (unsubscribeNotifications) unsubscribeNotifications();
  careNotificationService.dispose();
  if (spriteTimer) clearInterval(spriteTimer);
  if (realTimeDecayTimer) clearInterval(realTimeDecayTimer);
  if (animResetTimeout) clearTimeout(animResetTimeout);
  renderer2d.clearCaches();
  sceneController.dispose();
});
</script>

<template>
  <div
    data-testid="game-root-container"
    class="min-h-screen text-slate-100 font-sans flex flex-col items-center select-none transition-colors duration-500"
    :style="{ backgroundColor: creatureTheme.rootBackground }"
  >
    <!-- Mobile Portrait Container Styled with Dynamic Active Creature Theme -->
    <div
      data-testid="game-mobile-shell"
      class="w-full max-w-md min-h-screen flex flex-col justify-between shadow-2xl relative transition-colors duration-500"
      :style="{
        backgroundColor: creatureTheme.containerBackground,
        borderLeftColor: creatureTheme.borderColor,
        borderRightColor: creatureTheme.borderColor,
        borderLeftWidth: '1px',
        borderRightWidth: '1px'
      }"
    >
      <!-- Atmospheric creature aura overlay -->
      <div
        class="pointer-events-none absolute inset-0 z-0 opacity-80 transition-opacity duration-500"
        :style="{ background: creatureTheme.ambientGradient }"
      />

      <!-- Top HUD Header -->
      <header
        class="relative z-10 px-4 py-3 backdrop-blur border-b space-y-2 transition-colors duration-500"
        :style="{
          backgroundColor: creatureTheme.headerBackground,
          borderBottomColor: creatureTheme.borderColor
        }"
      >
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2.5">
            <div
              class="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm shrink-0 border"
              :style="{
                backgroundColor: creatureTheme.cardDarkBackground,
                borderColor: creatureTheme.borderColor,
                color: creatureTheme.primaryColor
              }"
            >
              <sparkles-icon class="w-4 h-4" />
            </div>
            <div>
              <div class="flex items-center gap-1.5">
                <h1
                  data-testid="active-character-name"
                  class="text-sm font-bold tracking-tight uppercase text-white"
                >
                  {{ activeSpecies.displayName }}
                </h1>
                <span
                  class="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-full border"
                  :style="{
                    backgroundColor: creatureTheme.cardDarkBackground,
                    borderColor: creatureTheme.borderColor,
                    color: creatureTheme.primaryColor
                  }"
                >
                  Nv. {{ activeRecord.progression.level }}
                </span>
                <span
                  data-testid="active-stage-badge"
                  class="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-full border"
                  :style="{
                    backgroundColor: creatureTheme.cardBackground,
                    borderColor: creatureTheme.borderSubtleColor,
                    color: '#facc15'
                  }"
                >
                  {{ displayedStage }}
                </span>
              </div>
              <p class="text-[11px] text-slate-400">
                {{ activeSpecies.scientificName }} · {{ activeSpecies.elementLabel }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <div
              data-testid="wallet-coins"
              class="flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-bold shadow-sm"
              :style="{
                backgroundColor: creatureTheme.cardBackground,
                borderColor: creatureTheme.borderSubtleColor,
                color: '#34d399'
              }"
              title="Moedas Âmbar"
            >
              <coins-icon class="w-3.5 h-3.5 text-amber-400" />
              <span>{{ saveState.wallet.amberCoins }}</span>
            </div>
          </div>
        </div>
      </header>

      <!-- Babylon.js 3D Environment + Crisp Nearest-Neighbor Pixel Art Viewport -->
      <section
        aria-label="Cenário 3D e Criatura"
        class="relative w-full h-64 border-b overflow-hidden flex items-center justify-center transition-colors duration-500"
        :style="{
          backgroundColor: creatureTheme.cardDarkBackground,
          borderBottomColor: creatureTheme.borderColor
        }"
      >
        <canvas
          ref="babylonCanvasRef"
          data-testid="babylon-viewport-canvas"
          class="absolute inset-0 w-full h-full block"
        />

        <!-- Synchronized Expanded Pixel Art 2D Overlay Canvas on Pedestal -->
        <canvas
          ref="spriteOverlayCanvasRef"
          data-testid="creature-pixel-canvas"
          :width="overlayDimensions.width"
          :height="overlayDimensions.height"
          class="relative z-10 w-40 h-40"
          style="image-rendering: pixelated"
        />

        <!-- Environment & Status Overlay Pill -->
        <div
          class="absolute top-2.5 left-2.5 z-20 px-2.5 py-1 rounded-lg bg-slate-900/90 backdrop-blur border border-slate-700 text-[11px] text-slate-200 shadow-sm flex items-center gap-1.5"
        >
          <span class="font-bold text-emerald-400">{{ activeEnvironment.name }}</span>
          <span class="text-slate-500">|</span>
          <span data-testid="active-emotional-state" class="uppercase text-amber-300 font-semibold">
            Estado: {{ activeRecord.runtime.emotionalState }}
          </span>
          <template v-if="activeRecord.genetics">
            <span class="text-slate-500">|</span>
            <span
              data-testid="active-sex-badge"
              class="font-black text-sm cursor-pointer transition-transform active:scale-95 flex items-center"
              :class="activeRecord.genetics.sex === 'male' ? 'text-sky-400' : 'text-pink-400'"
              :title="formatBiologicalSexLabel(activeRecord.genetics.sex)"
              @click="showGenealogyModal = true"
            >
              {{ formatBiologicalSexSymbol(activeRecord.genetics.sex) }}
            </span>
          </template>
        </div>

        <!-- 90s Virtual Pet Organic Evolution & Age Bar (Read-Only Status) -->
        <div
          data-testid="evolution-status-bar"
          class="absolute bottom-2 inset-x-2.5 z-20 flex items-center justify-between gap-2 rounded-lg bg-slate-900/90 backdrop-blur border border-slate-700 px-2.5 py-1 text-[10px] text-slate-300 shadow-sm"
        >
          <span>
            Idade:
            <strong class="text-emerald-400">
              {{ activeRecord.runtime.ageHours }}h / {{ MAX_NATURAL_LIFESPAN_HOURS }}h (30d)
            </strong>
            · XP:
            <strong class="text-amber-300">
              {{ activeRecord.progression.currentXp }}/{{ activeRecord.progression.nextLevelXp }}
            </strong>
          </span>
          <span v-if="nextEvolutionRule" class="text-emerald-300 font-semibold">
            Próx. fase ({{ nextEvolutionRule.toStage }}): Nv.{{ nextEvolutionRule.requiredLevel }} e
            {{ nextEvolutionRule.requiredAgeHours }}h
          </span>
          <span v-else class="text-emerald-400 font-bold uppercase">
            Evolução Completa (Adulto)
          </span>
        </div>
      </section>

      <!-- Discreet Update Notification Banners -->
      <div
        v-if="updaterState.status === 'ready_to_reload'"
        data-testid="web-update-ready-banner"
        class="px-3.5 py-2 bg-emerald-950/90 border-b border-emerald-700 text-xs text-emerald-200 flex items-center justify-between gap-2 shadow-sm"
      >
        <div class="flex items-center gap-1.5 truncate">
          <sparkles-icon class="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span class="truncate">Atualização {{ updaterState.availableManifest?.version }} pronta para aplicar!</span>
        </div>
        <button
          type="button"
          data-testid="reload-to-apply-btn"
          class="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase text-[10px] shrink-0 shadow-sm"
          @click="handleApplyWebReload"
        >
          Reiniciar
        </button>
      </div>

      <div
        v-else-if="updaterState.status === 'ready_to_install_apk' || updaterState.status === 'native_update_required'"
        data-testid="apk-update-banner"
        class="px-3.5 py-2 bg-amber-950/90 border-b border-amber-700 text-xs text-amber-200 flex items-center justify-between gap-2 shadow-sm"
      >
        <div class="flex items-center gap-1.5 truncate">
          <sparkles-icon class="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span class="truncate">APK Android {{ updaterState.availableManifest?.version }} disponível!</span>
        </div>
        <button
          type="button"
          data-testid="install-apk-btn"
          class="px-2.5 py-1 rounded-md bg-amber-600 hover:bg-amber-500 text-white font-bold uppercase text-[10px] shrink-0 shadow-sm"
          @click="handleInstallApk"
        >
          Instalar
        </button>
      </div>

      <!-- Feedback Banner & Emergency Actions -->
      <!-- Dynamic Feedback Action Banner -->
      <div
        data-testid="feedback-banner"
        class="px-3.5 py-2 border-b text-xs text-emerald-300 flex items-center justify-between gap-2 transition-colors duration-500"
        :style="{
          backgroundColor: creatureTheme.cardDarkBackground,
          borderBottomColor: creatureTheme.borderSubtleColor
        }"
      >
        <span>{{ feedbackBanner }}</span>
        <button
          v-if="activeRecord.runtime.healthCondition === 'deceased' || displayedAnimation === 'morte'"
          type="button"
          data-testid="revive-creature-btn"
          class="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase text-[11px] shrink-0 shadow-sm"
          @click="handleReviveCharacter"
        >
          Reviver
        </button>
        <button
          v-else-if="activeRecord.runtime.currentStage === 'ovo'"
          type="button"
          data-testid="hatch-egg-btn"
          class="px-2.5 py-1 rounded-md bg-amber-600 hover:bg-amber-500 text-white font-bold uppercase text-[11px] shrink-0 shadow-sm"
          @click="handleHatchEgg"
        >
          Eclodir Ovo
        </button>
      </div>

      <!-- Clinical Alert Box for Active Diseases -->
      <div
        v-if="activeRecord.runtime.activeDiseases.length > 0"
        data-testid="active-diseases-alert"
        class="px-3.5 py-2 bg-rose-950/90 border-b border-rose-800 text-xs text-rose-200 space-y-1"
      >
        <div class="font-bold uppercase text-rose-300 text-[11px]">
          ⚠ Enfermidades Diagnosticadas — Tratamento Necessário:
        </div>
        <div
          v-for="disease in activeRecord.runtime.activeDiseases"
          :key="disease.id"
          class="text-[11px] flex flex-col p-1.5 rounded border border-rose-800/70"
          :style="{ backgroundColor: creatureTheme.cardDarkBackground }"
        >
          <span class="font-bold text-rose-300">{{ disease.name }}</span>
          <span class="text-slate-300 text-[10px]">{{ disease.description }}</span>
          <span class="text-amber-300 font-semibold text-[10px] mt-0.5">
            Remédio indicado: {{ getFoodById(disease.remedyFoodId).name }}
          </span>
        </div>
      </div>

      <!-- Discreet Urgent Care Banner When Near or At Critical Level -->
      <div
        v-if="notificationState.activeBannerText"
        data-testid="care-alert-banner"
        class="px-3.5 py-2 border-b text-xs flex items-center justify-between gap-2"
        :class="
          notificationState.evaluation.activeCriticalCount > 0
            ? 'bg-rose-950/90 border-rose-700 text-rose-200'
            : 'bg-amber-950/85 border-amber-700 text-amber-200'
        "
      >
        <div class="flex items-center gap-1.5 min-w-0">
          <bell-icon class="w-3.5 h-3.5 shrink-0" />
          <span class="text-[11px] font-medium truncate">{{ notificationState.activeBannerText }}</span>
        </div>
        <button
          type="button"
          data-testid="care-alert-action-btn"
          class="px-2 py-1 rounded bg-slate-900/80 hover:bg-slate-800 border border-current text-[10px] font-bold uppercase shrink-0"
          @click="
            activeMobileTab =
              notificationState.evaluation.immediateAlerts[0]?.reason === 'energy' ||
              notificationState.evaluation.immediateAlerts[0]?.reason === 'happiness' ||
              notificationState.evaluation.immediateAlerts[0]?.reason === 'hygiene'
                ? 'activities'
                : 'feed'
          "
        >
          Cuidar
        </button>
      </div>

      <!-- 6 Normalized Need Bars (0 to 100) -->
      <section
        aria-label="Indicadores de Necessidades"
        class="p-3 border-b grid grid-cols-3 gap-2 transition-colors duration-500"
        :style="{
          backgroundColor: creatureTheme.containerBackground,
          borderBottomColor: creatureTheme.borderSubtleColor
        }"
      >
        <div
          v-for="need in needBars"
          :key="need.key"
          :data-testid="`need-bar-${need.key}`"
          class="rounded-lg border p-1.5 transition-colors duration-500"
          :style="{
            backgroundColor: creatureTheme.cardDarkBackground,
            borderColor: creatureTheme.borderSubtleColor
          }"
        >
          <div class="flex items-center justify-between text-[11px] font-semibold mb-1">
            <span class="text-slate-300">{{ need.label }}</span>
            <span
              :class="
                need.value <= 15
                  ? 'text-rose-400 font-bold'
                  : need.value <= 25
                    ? 'text-amber-300 font-bold'
                    : 'text-emerald-300'
              "
            >
              {{ need.value }}%
            </span>
          </div>
          <div class="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-300"
              :class="need.value <= 15 ? 'bg-rose-600' : need.value <= 25 ? 'bg-amber-500' : need.color"
              :style="{ width: `${need.value}%` }"
            />
          </div>
        </div>
      </section>

      <!-- Main Tab Content Area -->
      <main
        class="flex-1 overflow-y-auto p-3 pb-6 space-y-3 transition-colors duration-500"
        :style="{ backgroundColor: creatureTheme.cardDarkBackground }"
      >
        <!-- TAB 1: ALIMENTAÇÃO E CUIDADOS -->
        <div v-if="activeMobileTab === 'feed'" data-testid="tab-content-feed" class="space-y-2.5">
          <div class="flex items-center justify-between">
            <h2 class="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Dieta Individual de {{ activeSpecies.displayName }}
            </h2>
            <span class="text-[11px] text-slate-400">
              Favorito: {{ activeSpecies.favoriteFoodIds[0] }}
            </span>
          </div>

          <div
            v-if="displayedStage === 'ovo'"
            class="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-2"
          >
            <span>🥚 O ovo ancestral está incubando no santuário! Ecloda-o para alimentar o filhote.</span>
          </div>

          <div class="space-y-2">
            <div
              v-for="food in allFoods"
              :key="food.id"
              :data-testid="`food-card-${food.id}`"
              class="p-2.5 rounded-xl border flex items-center justify-between gap-2 shadow-sm transition-colors duration-500"
              :style="{
                backgroundColor: creatureTheme.cardBackground,
                borderColor: creatureTheme.borderSubtleColor
              }"
            >
              <div class="flex items-center gap-2.5">
                <!-- Pixel Art Color Swatch Icon -->
                <div
                  class="w-9 h-9 rounded-md border border-slate-700 shrink-0 grid grid-cols-2 grid-rows-2 p-0.5"
                  :style="{ backgroundColor: food.pixelColors.secondary }"
                >
                  <div :style="{ backgroundColor: food.pixelColors.primary }" />
                  <div :style="{ backgroundColor: food.pixelColors.highlight }" />
                  <div :style="{ backgroundColor: food.pixelColors.primary }" />
                  <div :style="{ backgroundColor: food.pixelColors.secondary }" />
                </div>

                <div>
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-xs font-bold text-slate-100">{{ food.name }}</span>
                    <span
                      v-if="food.category === 'medicine'"
                      class="px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-teal-500/20 border border-teal-500/50 text-teal-300"
                    >
                      ✚ Remédio
                    </span>
                    <span
                      v-else-if="evaluateDietaryPreference(activeSpecies, food.id) === 'favorite'"
                      class="px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 border border-amber-500/50 text-amber-300"
                    >
                      ★ Favorito
                    </span>
                    <span
                      v-else-if="evaluateDietaryPreference(activeSpecies, food.id) === 'forbidden'"
                      class="px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-950 border border-rose-700 text-rose-300"
                    >
                      ✕ Proibido
                    </span>
                    <span
                      v-else
                      class="px-1.5 py-0.5 rounded-full text-[10px] uppercase bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
                    >
                      Aceito
                    </span>
                  </div>
                  <p class="text-[11px] text-slate-400">{{ food.description }}</p>
                  <p class="text-[10px] text-emerald-400 mt-0.5">
                    Estoque:
                    <strong :data-testid="`food-stock-${food.id}`">
                      {{ getItemQuantity(saveState.inventory, food.id) }}
                    </strong>
                    · Fome +{{ food.nutrition.hungerRestore }} · Saúde +{{ food.nutrition.healthDelta }}
                  </p>
                </div>
              </div>

              <div class="flex flex-col gap-1 shrink-0">
                <button
                  type="button"
                  :data-testid="`feed-btn-${food.id}`"
                  :disabled="displayedStage === 'ovo'"
                  class="px-2.5 py-1.5 rounded-md text-xs font-bold uppercase shadow-sm transition"
                  :class="displayedStage === 'ovo' ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white'"
                  @click="handleFeedCharacter(food.id)"
                >
                  Dar
                </button>
                <button
                  type="button"
                  :data-testid="`buy-food-btn-${food.id}`"
                  class="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 text-[10px] font-bold transition"
                  @click="handlePurchaseFood(food.id)"
                >
                  +1 ({{ food.priceCoins }}¢)
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 2: ATIVIDADES E CUIDADOS -->
        <div
          v-else-if="activeMobileTab === 'activities'"
          data-testid="tab-content-activities"
          class="space-y-2.5"
        >
          <h2 class="text-xs font-bold uppercase tracking-wider text-emerald-400">
            Atividades, Treinos e Higiene
          </h2>

          <div
            v-if="displayedStage === 'ovo'"
            class="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-2"
          >
            <span>🥚 O ovo ancestral está em repouso no ninho! Ecloda-o para iniciar treinos e atividades.</span>
          </div>

          <div class="space-y-2">
            <div
              v-for="act in allActivities"
              :key="act.id"
              :data-testid="`activity-card-${act.id}`"
              class="p-2.5 rounded-xl border flex items-center justify-between gap-2 shadow-sm transition-colors duration-500"
              :style="{
                backgroundColor: creatureTheme.cardBackground,
                borderColor: creatureTheme.borderSubtleColor
              }"
            >
              <div>
                <div class="flex items-center gap-1.5">
                  <span class="text-xs font-bold text-slate-100">{{ act.name }}</span>
                  <span
                    v-if="activeSpecies.personality.favoriteActivityId === act.id"
                    class="px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 border border-amber-500/50 text-amber-300"
                  >
                    ★ Favorita
                  </span>
                </div>
                <p class="text-[11px] text-slate-400">{{ act.description }}</p>
                <p class="text-[10px] text-emerald-400 mt-0.5">
                  Energia mín: {{ act.minEnergyRequired }} · Recompensa: +{{ act.experienceReward }} XP{{ act.coinReward > 0 ? ` / +${act.coinReward} Moedas` : ' (sem moedas)' }}
                </p>
              </div>

              <button
                type="button"
                :data-testid="`activity-btn-${act.id}`"
                :disabled="displayedStage === 'ovo'"
                class="px-3 py-2 rounded-md text-xs font-bold uppercase shrink-0 shadow-sm transition"
                :class="displayedStage === 'ovo' ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white'"
                @click="handleExecuteActivity(act.id)"
              >
                Iniciar
              </button>
            </div>
          </div>
        </div>

        <!-- TAB 3: FICHA INDIVIDUAL COMPLETA DO PERSONAGEM -->
        <div
          v-else-if="activeMobileTab === 'sheet'"
          data-testid="tab-content-sheet"
          class="space-y-3"
        >
          <!-- Creature Companion Switcher & Active Animal Theme Indicator -->
          <div
            data-testid="companion-selector-card"
            class="p-3 rounded-xl border space-y-2.5 transition-colors duration-500"
            :style="{
              backgroundColor: creatureTheme.cardBackground,
              borderColor: creatureTheme.borderSubtleColor
            }"
          >
            <div class="flex items-center justify-between">
              <h2
                class="text-xs font-bold uppercase flex items-center gap-1.5"
                :style="{ color: creatureTheme.primaryColor }"
              >
                <sparkles-icon class="w-3.5 h-3.5" />
                <span>Trocar Criatura Companheira</span>
              </h2>
              <span
                data-testid="active-companion-badge"
                class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border"
                :style="{
                  backgroundColor: creatureTheme.cardDarkBackground,
                  color: creatureTheme.primaryColor,
                  borderColor: creatureTheme.borderColor
                }"
              >
                {{ activeSpecies.displayName }}
              </span>
            </div>
            <p class="text-[11px] text-slate-300">
              Escolha seu companheiro. O tema e as cores de todo o APK se adaptam automaticamente à cor principal do animal:
            </p>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-0.5">
              <button
                v-for="species in allAvailableSpecies"
                :key="species.id"
                type="button"
                :data-testid="`select-species-${species.id}`"
                class="p-2 rounded-lg border text-left flex items-center gap-2 transition-all duration-200"
                :style="{
                  backgroundColor: activeCharacterId === species.id ? creatureTheme.cardDarkBackground : 'transparent',
                  borderColor: activeCharacterId === species.id ? creatureTheme.primaryColor : creatureTheme.borderSubtleColor,
                  boxShadow: activeCharacterId === species.id ? creatureTheme.accentGlow : 'none'
                }"
                @click="handleSelectActiveSpecies(species.id)"
              >
                <div
                  class="w-4 h-4 rounded-full shrink-0 border border-white/20"
                  :style="{ backgroundColor: species.visualTraits.primaryColors.base }"
                />
                <div class="truncate">
                  <span class="block text-xs font-bold text-white truncate">{{ species.displayName }}</span>
                  <span class="block text-[9px] text-slate-400 capitalize truncate">{{ species.element }}</span>
                </div>
              </button>
            </div>
          </div>

          <div
            class="p-3 rounded-xl border space-y-1.5 transition-colors duration-500"
            :style="{
              backgroundColor: creatureTheme.cardBackground,
              borderColor: creatureTheme.borderSubtleColor
            }"
          >
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-bold uppercase text-emerald-400">
                Ficha Oficial — {{ activeSpecies.displayName }}
              </h2>
              <span class="text-xs font-bold text-amber-300">
                Poder Total: {{ totalPower }}
              </span>
            </div>
            <p class="text-xs text-slate-300">{{ activeSpecies.description }}</p>
            <p class="text-[11px] text-slate-400 italic">{{ activeSpecies.lore }}</p>

            <div class="grid grid-cols-2 gap-2 pt-2 text-xs">
              <div
                class="p-2 rounded-lg border transition-colors duration-500"
                :style="{
                  backgroundColor: creatureTheme.cardDarkBackground,
                  borderColor: creatureTheme.borderSubtleColor
                }"
              >
                <span class="text-slate-400 block text-[10px] uppercase">Espécie</span>
                <strong>{{ activeSpecies.species }}</strong>
              </div>
              <div
                class="p-2 rounded-lg border transition-colors duration-500"
                :style="{
                  backgroundColor: creatureTheme.cardDarkBackground,
                  borderColor: creatureTheme.borderSubtleColor
                }"
              >
                <span class="text-slate-400 block text-[10px] uppercase">Idade / Fase</span>
                <strong>{{ activeRecord.runtime.ageHours }}h · {{ activeRecord.runtime.currentStage }}</strong>
              </div>
              <div
                class="p-2 rounded-lg border transition-colors duration-500"
                :style="{
                  backgroundColor: creatureTheme.cardDarkBackground,
                  borderColor: creatureTheme.borderSubtleColor
                }"
              >
                <span class="text-slate-400 block text-[10px] uppercase">Personalidade</span>
                <strong>{{ activeSpecies.personality.archetype }}</strong>
              </div>
              <div
                class="p-2 rounded-lg border transition-colors duration-500"
                :style="{
                  backgroundColor: creatureTheme.cardDarkBackground,
                  borderColor: creatureTheme.borderSubtleColor
                }"
              >
                <span class="text-slate-400 block text-[10px] uppercase">Experiência (XP)</span>
                <strong>
                  Nv. {{ activeRecord.progression.level }} ({{ activeRecord.progression.currentXp }}/{{ activeRecord.progression.nextLevelXp }})
                </strong>
              </div>
              <div
                class="p-2 rounded-lg border transition-colors duration-500"
                :style="{
                  backgroundColor: creatureTheme.cardDarkBackground,
                  borderColor: creatureTheme.borderSubtleColor
                }"
              >
                <span class="text-slate-400 block text-[10px] uppercase">Versão do App</span>
                <strong data-testid="sheet-version-info" class="font-mono text-emerald-400">
                  v{{ updaterState.installedInfo.version }} (b{{ updaterState.installedInfo.build }})
                </strong>
              </div>
            </div>
          </div>

          <!-- Permanent / Evolutionary Attributes -->
          <div
            class="p-3 rounded-xl border space-y-2 transition-colors duration-500"
            :style="{
              backgroundColor: creatureTheme.cardBackground,
              borderColor: creatureTheme.borderSubtleColor
            }"
          >
            <h3 class="text-xs font-bold uppercase text-emerald-400">
              Atributos Permanentes e Evolutivos
            </h3>
            <div class="grid grid-cols-2 gap-2">
              <div
                v-for="attr in attributeEntries"
                :key="attr.label"
                class="p-2 rounded-lg border flex items-center justify-between text-xs transition-colors duration-500"
                :style="{
                  backgroundColor: creatureTheme.cardDarkBackground,
                  borderColor: creatureTheme.borderSubtleColor
                }"
              >
                <span class="text-slate-400">{{ attr.label }}</span>
                <strong class="text-emerald-300">{{ attr.value }}</strong>
              </div>
            </div>
          </div>

          <!-- Care History Log -->
          <div
            class="p-3 rounded-xl border space-y-2 transition-colors duration-500"
            :style="{
              backgroundColor: creatureTheme.cardBackground,
              borderColor: creatureTheme.borderSubtleColor
            }"
          >
            <h3 class="text-xs font-bold uppercase text-emerald-400">
              Histórico Recente de Cuidados
            </h3>
            <ul class="space-y-1 max-h-36 overflow-y-auto text-[11px] text-slate-300">
              <li
                v-for="entry in activeRecord.runtime.careHistory"
                :key="entry.id"
                class="p-1.5 rounded-lg border flex items-center justify-between gap-2 transition-colors duration-500"
                :style="{
                  backgroundColor: creatureTheme.cardDarkBackground,
                  borderColor: creatureTheme.borderSubtleColor
                }"
              >
                <span>{{ entry.summary }}</span>
                <span class="text-[10px] text-emerald-400 uppercase">{{ entry.actionType }}</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- TAB 4: GENÉTICA E REPRODUÇÃO MULTIPLAYER P2P -->
        <div
          v-else-if="activeMobileTab === 'genetics'"
          data-testid="tab-content-genetics"
          class="space-y-3"
        >
          <breeding-modal
            :save-snapshot="saveState"
            :creature-theme="creatureTheme"
            @update-save="handleUpdateSave"
          />
        </div>

        <!-- TAB 5: CONFIGURAÇÕES E SIMULAÇÃO OFFLINE -->
        <div
          v-else-if="activeMobileTab === 'settings'"
          data-testid="tab-content-settings"
          class="space-y-3"
        >
          <!-- Atualizador Automático & Controle de Versão -->
          <div
            data-testid="updater-settings-card"
            class="p-3 rounded-xl border space-y-2.5 transition-colors duration-500"
            :style="{
              backgroundColor: creatureTheme.cardBackground,
              borderColor: creatureTheme.borderSubtleColor
            }"
          >
            <div class="flex items-center justify-between">
              <h2
                class="text-xs font-bold uppercase flex items-center gap-1.5"
                :style="{ color: creatureTheme.primaryColor }"
              >
                <sparkles-icon class="w-3.5 h-3.5" />
                <span>Atualização Automática (OTA)</span>
              </h2>
              <span
                data-testid="updater-status-badge"
                class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border"
                :class="{
                  'bg-emerald-950 text-emerald-300 border-emerald-700': updaterState.status === 'up_to_date' || updaterState.status === 'ready_to_reload',
                  'bg-amber-950 text-amber-300 border-amber-700': updaterState.status === 'checking' || updaterState.status === 'downloading_web' || updaterState.status === 'downloading_apk',
                  'bg-rose-950 text-rose-300 border-rose-700': updaterState.status === 'error',
                  'bg-slate-950 text-slate-400 border-slate-800': updaterState.status === 'idle'
                }"
              >
                {{ updaterState.status }}
              </span>
            </div>

            <div
              class="p-2 rounded-lg border space-y-1 text-xs transition-colors duration-500"
              :style="{
                backgroundColor: creatureTheme.cardDarkBackground,
                borderColor: creatureTheme.borderSubtleColor
              }"
            >
              <div class="flex items-center justify-between text-slate-300">
                <span>Versão Instalada:</span>
                <strong data-testid="installed-version-label" class="font-mono text-emerald-400">
                  v{{ updaterState.installedInfo.version }} (build {{ updaterState.installedInfo.build }})
                </strong>
              </div>
              <div class="flex items-center justify-between text-slate-400 text-[11px]">
                <span>Plataforma:</span>
                <span class="font-mono uppercase">{{ updaterState.installedInfo.platform }}</span>
              </div>
              <div v-if="updaterState.message" class="text-[11px] text-slate-400 pt-0.5">
                {{ updaterState.message }}
              </div>
              <div v-if="updaterState.errorMessage" class="text-[11px] text-rose-400 pt-0.5">
                ⚠ {{ updaterState.errorMessage }}
              </div>
            </div>

            <!-- Progress bar if downloading -->
            <div
              v-if="updaterState.status === 'downloading_web' || updaterState.status === 'downloading_apk'"
              class="space-y-1"
            >
              <div class="flex justify-between text-[10px] text-slate-400">
                <span>Progresso do Download</span>
                <span>{{ updaterState.progress }}%</span>
              </div>
              <div class="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  class="h-full bg-emerald-500 transition-all duration-200"
                  :style="{ width: `${updaterState.progress}%` }"
                />
              </div>
            </div>

            <div class="flex items-center gap-2 pt-1 flex-wrap">
              <button
                type="button"
                data-testid="check-updates-btn"
                :disabled="updaterState.status === 'checking' || updaterState.status === 'downloading_web' || updaterState.status === 'downloading_apk'"
                class="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-50 text-xs font-bold text-slate-200 flex items-center gap-1 transition"
                @click="handleManualCheckForUpdates"
              >
                <refresh-cw-icon class="w-3.5 h-3.5" :class="{ 'animate-spin': updaterState.status === 'checking' }" />
                <span>Verificar Agora</span>
              </button>

              <button
                v-if="updaterState.status === 'ready_to_reload'"
                type="button"
                data-testid="apply-update-btn"
                class="px-2.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition"
                @click="handleApplyWebReload"
              >
                Aplicar & Reiniciar
              </button>

              <button
                v-if="updaterState.status === 'ready_to_install_apk' || updaterState.status === 'native_update_required'"
                type="button"
                data-testid="download-apk-btn"
                class="px-2.5 py-1.5 rounded-md bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white transition"
                @click="handleInstallApk"
              >
                Instalar APK
              </button>

              <button
                v-if="updaterState.availableManifest"
                type="button"
                data-testid="view-changelog-btn"
                class="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 transition"
                @click="isChangelogOpen = !isChangelogOpen"
              >
                Notas da Versão
              </button>
            </div>

            <!-- Changelog Modal -->
            <div
              v-if="isChangelogOpen && updaterState.availableManifest"
              data-testid="changelog-box"
              class="p-2.5 rounded-lg border space-y-1.5 text-xs transition-colors duration-500"
              :style="{
                backgroundColor: creatureTheme.cardDarkBackground,
                borderColor: creatureTheme.borderSubtleColor
              }"
            >
              <div class="font-bold text-emerald-400">
                Novidades da v{{ updaterState.availableManifest.version }}:
              </div>
              <ul class="list-disc list-inside space-y-0.5 text-slate-300 text-[11px]">
                <li v-for="(note, idx) in updaterState.availableManifest.changelog" :key="idx">
                  {{ note }}
                </li>
              </ul>
            </div>

            <!-- Safe Recovery: Reset to Bundled Files -->
            <div v-if="updaterState.installedInfo.serverBasePath" class="pt-1">
              <button
                type="button"
                data-testid="reset-bundle-btn"
                class="text-[11px] text-slate-400 hover:text-amber-300 underline"
                @click="handleResetToBundledVersion"
              >
                Restaurar arquivos de fábrica originais do APK
              </button>
            </div>
          </div>
          <!-- Notificações de Cuidados Críticos -->
          <div
            data-testid="notifications-settings-card"
            class="p-3 rounded-xl border space-y-2 transition-colors duration-500"
            :style="{
              backgroundColor: creatureTheme.cardBackground,
              borderColor: creatureTheme.borderSubtleColor
            }"
          >
            <div class="flex items-center justify-between">
              <h2
                class="text-xs font-bold uppercase flex items-center gap-1.5"
                :style="{ color: creatureTheme.primaryColor }"
              >
                <bell-icon class="w-3.5 h-3.5" />
                <span>Notificações de Cuidados</span>
              </h2>
              <span
                class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border"
                :class="
                  saveState.settings.notificationsEnabled
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                    : 'bg-slate-950 text-slate-400 border-slate-700'
                "
              >
                {{ saveState.settings.notificationsEnabled ? 'Ativadas' : 'Desativadas' }}
              </span>
            </div>
            <p class="text-[11px] text-slate-400">
              Envia alertas no aparelho quando fome, sede, energia, felicidade, higiene ou saúde se aproximarem do nível crítico.
            </p>
            <div class="text-[10px] text-slate-400 flex items-center justify-between font-mono">
              <span>Permissão: {{ notificationState.permission }}</span>
              <span>Agendados: {{ notificationState.evaluation.scheduledAlerts.length }}</span>
            </div>
            <div class="flex items-center gap-2 flex-wrap pt-0.5">
              <button
                type="button"
                data-testid="toggle-notifications-btn"
                class="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-emerald-300 transition"
                @click="handleToggleNotifications"
              >
                {{ saveState.settings.notificationsEnabled ? 'Desativar Alertas' : 'Ativar Alertas' }}
              </button>
              <button
                v-if="notificationState.permission !== 'granted'"
                type="button"
                data-testid="request-notifications-permission-btn"
                class="px-2.5 py-1.5 rounded-md bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white transition"
                @click="handleRequestNotificationPermission"
              >
                Autorizar Notificações
              </button>
              <button
                type="button"
                data-testid="test-notification-btn"
                class="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition"
                @click="handleSendTestNotification"
              >
                Testar Alerta
              </button>
            </div>
          </div>

          <div
            class="p-3 rounded-xl border space-y-2 transition-colors duration-500"
            :style="{
              backgroundColor: creatureTheme.cardBackground,
              borderColor: creatureTheme.borderSubtleColor
            }"
          >
            <h2 class="text-xs font-bold uppercase text-emerald-400 flex items-center gap-1.5">
              <clock-icon class="w-3.5 h-3.5 text-emerald-400" />
              Simulador de Passagem de Tempo Offline
            </h2>
            <p class="text-[11px] text-slate-400">
              Teste deterministicamente o cálculo de tempo decorrido com o app fechado:
            </p>
            <div class="flex items-center gap-2">
              <button
                type="button"
                data-testid="sim-offline-1h"
                class="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition"
                @click="handleSimulateOfflineHours(1)"
              >
                +1 Hora
              </button>
              <button
                type="button"
                data-testid="sim-offline-6h"
                class="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition"
                @click="handleSimulateOfflineHours(6)"
              >
                +6 Horas
              </button>
              <button
                type="button"
                data-testid="sim-offline-24h"
                class="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition"
                @click="handleSimulateOfflineHours(24)"
              >
                +24 Horas
              </button>
            </div>
          </div>

          <div
            class="p-3 rounded-xl border space-y-2 transition-colors duration-500"
            :style="{
              backgroundColor: creatureTheme.cardBackground,
              borderColor: creatureTheme.borderSubtleColor
            }"
          >
            <h2 class="text-xs font-bold uppercase text-emerald-400">
              Desempenho Android & Partículas Babylon.js
            </h2>
            <div class="flex items-center gap-2">
              <button
                v-for="q in (['high', 'balanced', 'battery-saver'] as const)"
                :key="q"
                type="button"
                :data-testid="`quality-btn-${q}`"
                class="px-2.5 py-1.5 rounded-md text-xs font-bold uppercase border transition"
                :class="
                  saveState.settings.graphicsQuality === q
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                    : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-slate-500'
                "
                @click="handleQualityChange(q)"
              >
                {{ q }}
              </button>
            </div>

            <div class="pt-1 flex items-center justify-between">
              <span class="text-xs text-slate-300">Grade de Pixels 32×32 na Criatura</span>
              <button
                type="button"
                data-testid="toggle-grid-btn"
                class="px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-xs font-bold text-emerald-300"
                @click="handleTogglePixelGrid"
              >
                {{ saveState.settings.showPixelGrid ? 'Ativada' : 'Desativada' }}
              </button>
            </div>
          </div>

          <div class="flex items-center justify-between pt-1">
            <button
              type="button"
              data-testid="reset-save-btn"
              class="px-3 py-1.5 rounded-md bg-rose-950 hover:bg-rose-900 border border-rose-700 text-rose-200 text-xs font-bold uppercase flex items-center gap-1"
              @click="handleResetSave"
            >
              <rotate-ccw-icon class="w-3.5 h-3.5" />
              Sortear Novo Bichinho (Resetar Save)
            </button>
          </div>
        </div>
      </main>

      <!-- Bottom Mobile Navigation Bar (5 Pure Game Tabs - Always visible sticky navigation) -->
      <nav
        aria-label="Menu principal do jogo"
        data-testid="bottom-navigation-bar"
        class="sticky bottom-0 z-50 shrink-0 grid grid-cols-5 backdrop-blur border-t shadow-lg transition-colors duration-500"
        :style="{
          backgroundColor: creatureTheme.headerBackground,
          borderTopColor: creatureTheme.borderColor
        }"
      >
        <button
          type="button"
          data-testid="nav-tab-feed"
          class="py-2.5 flex flex-col items-center justify-center gap-1 text-[11px] font-bold uppercase transition"
          :class="
            activeMobileTab === 'feed'
              ? 'text-emerald-400 bg-emerald-500/10 border-t-2 border-emerald-500'
              : 'text-slate-400 hover:text-slate-200'
          "
          @click="activeMobileTab = 'feed'"
        >
          <utensils-icon class="w-4 h-4" />
          <span>Alimentar</span>
        </button>

        <button
          type="button"
          data-testid="nav-tab-activities"
          class="py-2.5 flex flex-col items-center justify-center gap-1 text-[11px] font-bold uppercase transition"
          :class="
            activeMobileTab === 'activities'
              ? 'text-emerald-400 bg-emerald-500/10 border-t-2 border-emerald-500'
              : 'text-slate-400 hover:text-slate-200'
          "
          @click="activeMobileTab = 'activities'"
        >
          <dumbbell-icon class="w-4 h-4" />
          <span>Cuidar</span>
        </button>

        <button
          type="button"
          data-testid="nav-tab-sheet"
          class="py-2.5 flex flex-col items-center justify-center gap-1 text-[11px] font-bold uppercase transition"
          :class="
            activeMobileTab === 'sheet'
              ? 'text-emerald-400 bg-emerald-500/10 border-t-2 border-emerald-500'
              : 'text-slate-400 hover:text-slate-200'
          "
          @click="activeMobileTab = 'sheet'"
        >
          <file-text-icon class="w-4 h-4" />
          <span>Ficha</span>
        </button>

        <button
          type="button"
          data-testid="nav-tab-genetics"
          class="py-2.5 flex flex-col items-center justify-center gap-1 text-[11px] font-bold uppercase transition"
          :class="
            activeMobileTab === 'genetics'
              ? 'text-emerald-400 bg-emerald-500/10 border-t-2 border-emerald-500'
              : 'text-slate-400 hover:text-slate-200'
          "
          
          @click="activeMobileTab = 'genetics'"
        >
          <span class="text-sm leading-none">🧬</span>
          <span>Genética</span>
        </button>

        <button
          type="button"
          data-testid="nav-tab-settings"
          class="py-2.5 flex flex-col items-center justify-center gap-1 text-[11px] font-bold uppercase transition"
          :class="
            activeMobileTab === 'settings'
              ? 'text-emerald-400 bg-emerald-500/10 border-t-2 border-emerald-500'
              : 'text-slate-400 hover:text-slate-200'
          "
          @click="activeMobileTab = 'settings'"
        >
          <settings-icon class="w-4 h-4" />
          <span>Ajustes</span>
        </button>
      </nav>

      <!-- Interactive Genealogy Tree Modal -->
      <genealogy-tree-modal
        v-if="showGenealogyModal && activeRecord.genetics"
        :target-genome="activeRecord.genetics"
        @close="showGenealogyModal = false"
      />
    </div>
  </div>
</template>
