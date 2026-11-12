<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import {
  Utensils as UtensilsIcon,
  Dumbbell as DumbbellIcon,
  Swords as SwordsIcon,
  FileText as FileTextIcon,
  Dna as DnaIcon,
  Settings as SettingsIcon,
  Sparkles as SparklesIcon,
  Coins as CoinsIcon,
  Clock as ClockIcon,
  RotateCcw as RotateCcwIcon,
  RefreshCw as RefreshCwIcon,
  Bell as BellIcon,
  Code2 as CodeIcon
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
  EGG_INCUBATION_DURATION_MS,
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
  listOwnedCreatures,
  resolveActiveCreatureContext,
  resolveEggStatus,
  simulateOfflineProgressOnSnapshot
} from '@/domains/persistence/domain/persistence-engine';
import { LocalStorageGameSaveRepository } from '@/domains/persistence/infrastructure/local-storage-save-repository';
import {
  advanceAllIncubatingEggsUseCase,
  feedActiveCharacterUseCase,
  hatchCharacterEggUseCase,
  performCharacterActivityUseCase,
  purchaseFoodItemUseCase,
  recordBattleResultUseCase,
  reviveDeceasedCharacterUseCase,
  selectActiveCreatureUseCase,
  updateSettingsUseCase
} from '@/domains/persistence/application/game-session-service';
import type { GameSaveSnapshot } from '@/domains/persistence/types';
import type { GraphicsQualityPreset } from '@/domains/settings/types';
import BreedingModal from '@/domains/breeding/presentation/BreedingModal.vue';
import GenealogyTreeModal from '@/domains/breeding/presentation/GenealogyTreeModal.vue';
import BattleArenaModal from '@/domains/battle/presentation/BattleArenaModal.vue';
import FoodPixelArt from '@/domains/feeding/presentation/FoodPixelArt.vue';
import type { FoodItemDefinition } from '@/domains/feeding/types';
import { playSoundEffect } from '@/shared/audio/sound-effects';
import { formatBiologicalSexLabel, formatBiologicalSexSymbol } from '@/domains/genetics/domain/sex-determination-engine';

const spriteRepo = new CharacterSpriteRepository();
const saveRepo = new LocalStorageGameSaveRepository();
const renderer2d = new Canvas2dRenderer();
const sceneController = new BabylonCreatureSceneController();

const saveState = ref<GameSaveSnapshot>(createNewGameSaveSnapshot(Date.now()));
const activeMobileTab = ref<'feed' | 'activities' | 'arena' | 'sheet' | 'settings' | 'genetics'>('feed');
const breedingInitialTab = ref<'breeding' | 'nursery' | 'lineage'>('breeding');
const isCollectionModalOpen = ref<boolean>(false);
const showGenealogyModal = ref<boolean>(false);
const feedbackBanner = ref<string>(
  '🥚 Um ovo ancestral misterioso surgiu no Santuário Elemental! Aguarde alguns minutos para vê-lo rachar e abrir.'
);
const babylonCanvasRef = ref<HTMLCanvasElement | null>(null);
const spriteOverlayCanvasRef = ref<HTMLCanvasElement | null>(null);
const frameToggle = ref<1 | 2 | 3 | 4>(1);
const manualAnimOverride = ref<CharacterAnimationName | null>(null);
const nowClockMs = ref<number>(Date.now());
const lastIncubationTickMs = ref<number>(Date.now());
const isHatchAnimationPlaying = ref<boolean>(false);

interface ActiveFeedingAnimationState {
  readonly food: FoodItemDefinition;
  readonly isAccepted: boolean;
  readonly satisfactionLevel: 'ecstatic' | 'satisfied' | 'disgusted' | 'poisoned';
  biteStage: number;
  crumbActive: boolean;
}

const activeFeeding = ref<ActiveFeedingAnimationState | null>(null);
let feedingBiteTimer1: ReturnType<typeof setTimeout> | null = null;
let feedingBiteTimer2: ReturnType<typeof setTimeout> | null = null;
let feedingBiteTimer3: ReturnType<typeof setTimeout> | null = null;

let spriteTimer: ReturnType<typeof setInterval> | null = null;
let incubationClockTimer: ReturnType<typeof setInterval> | null = null;
let realTimeDecayTimer: ReturnType<typeof setInterval> | null = null;
let animResetTimeout: ReturnType<typeof setTimeout> | null = null;
let nativeAppStateListener: PluginListenerHandle | null = null;

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
const activeContext = computed(() => resolveActiveCreatureContext(saveState.value));
const activeCharacterId = computed<CharacterId>(() => activeContext.value.speciesId);
const activeCreatureId = computed<string>(() => activeContext.value.creatureId);
const activeSpecies = computed(() => getCharacterSpeciesById(activeCharacterId.value));
const activeRecord = computed(() => activeContext.value.record);
const activeDisplayName = computed(
  () => activeRecord.value.runtime.customNickname || activeSpecies.value.displayName
);
const ownedCreatures = computed(() => listOwnedCreatures(saveState.value));
const activeIncubatorEggs = computed(() =>
  saveState.value.incubator.filter((e) => resolveEggStatus(e) !== 'hatched')
);
const hasReadyNurseryEgg = computed(() =>
  activeIncubatorEggs.value.some((e) => resolveEggStatus(e) === 'ready_to_hatch')
);
const incubatorBannerInfo = computed(() => {
  const activeEggs = activeIncubatorEggs.value;
  if (activeEggs.length === 0) return null;
  const readyEggs = activeEggs.filter((e) => resolveEggStatus(e) === 'ready_to_hatch');
  if (readyEggs.length > 0) {
    const speciesName = getCharacterSpeciesById(readyEggs[0].targetSpecies).displayName;
    return {
      isReady: true,
      text: `🐣 ${readyEggs.length} ovo(s) de ${speciesName} pronto(s) para nascer no Berçário!`
    };
  }
  const incubatingEggs = activeEggs.filter((e) => resolveEggStatus(e) === 'incubating');
  if (incubatingEggs.length > 0) {
    const egg = incubatingEggs[0];
    const pct = Math.min(100, Math.round((egg.incubationProgress / egg.maxIncubationHours) * 100));
    const speciesName = getCharacterSpeciesById(egg.targetSpecies).displayName;
    return {
      isReady: false,
      text: `🔥 Ovo de ${speciesName} incubando (${pct}%)`
    };
  }
  const speciesName = getCharacterSpeciesById(activeEggs[0].targetSpecies).displayName;
  return {
    isReady: false,
    text: `🥚 Ovo de ${speciesName} disponível no Berçário para iniciar incubação`
  };
});
const creatureTheme = computed(() => {
  const genetics = activeRecord.value.genetics;
  if (genetics?.parents) {
    return generateCreatureTheme(genetics.phenotype.colors.base, genetics.phenotype.colors.crest);
  }
  return generateCreatureTheme(
    activeSpecies.value.visualTraits.primaryColors.base,
    activeSpecies.value.visualTraits.primaryColors.highlight
  );
});
const activeEnvironment = computed(() => getCharacterEnvironmentConfig(activeCharacterId.value));
const activeParticles = computed(() => getCharacterParticleConfig(activeCharacterId.value));
const totalPower = computed(() => computeTotalPowerRating(activeRecord.value.attributes));

const displayedStage = computed<CharacterLifeStage>(
  () => activeRecord.value.runtime.currentStage
);

const eggRemainingMs = computed<number>(() => {
  if (displayedStage.value !== 'ovo') return 0;
  const hatchAt = activeRecord.value.runtime.createdAtMs + EGG_INCUBATION_DURATION_MS;
  return Math.max(0, hatchAt - nowClockMs.value);
});

const eggCountdownLabel = computed<string>(() => {
  const totalSeconds = Math.ceil(eggRemainingMs.value / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
});

const nextEvolutionRule = computed(() =>
  activeSpecies.value.evolutionRules.find((r) => r.fromStage === displayedStage.value) ?? null
);

const isSleeping = computed<boolean>(() => activeRecord.value.runtime.sleepState === 'sleeping');
const isCreatureAlive = computed<boolean>(
  () => activeRecord.value.runtime.healthCondition !== 'deceased' && displayedAnimation.value !== 'morte'
);
const sleepSession = computed(() => activeRecord.value.runtime.sleepSession);
const sleepRemainingMs = computed<number>(() => {
  if (!sleepSession.value) return 0;
  return Math.max(0, sleepSession.value.wakeAtMs - nowClockMs.value);
});
const sleepRemainingFormatted = computed<string>(() => {
  const totalSeconds = Math.ceil(sleepRemainingMs.value / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}m ${String(secs).padStart(2, '0')}s`;
});

watch(
  () => isSleeping.value,
  (sleeping, wasSleeping) => {
    if (sleeping && !wasSleeping) {
      playSoundEffect('snoring', 0.5);
    } else if (!sleeping && wasSleeping) {
      playSoundEffect('happy', 0.8);
    }
  }
);

const displayedAnimation = computed<CharacterAnimationName>(() => {
  if (displayedStage.value === 'ovo') return 'eclosao';
  return manualAnimOverride.value ?? activeRecord.value.runtime.currentAnimation;
});

const currentSpriteArt = computed(() => {
  const maxFrames = displayedStage.value === 'ovo' ? 4 : 2;
  const f = ((frameToggle.value - 1) % maxFrames) + 1;
  const geneticColors = activeRecord.value.genetics?.parents
    ? activeRecord.value.genetics.phenotype.colors
    : undefined;
  return spriteRepo.getSpriteFrame(
    activeCharacterId.value,
    displayedStage.value,
    displayedAnimation.value,
    f,
    geneticColors
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

async function persistCurrentState(previousSnapshot?: GameSaveSnapshot): Promise<void> {
  try {
    if (saveState.value.settings.autoSaveEnabled) {
      await saveRepo.saveSnapshot(saveState.value);
    }
    await careNotificationService.syncFromSnapshot(saveState.value, Date.now());
  } catch {
    if (previousSnapshot) {
      saveState.value = previousSnapshot;
    }
    feedbackBanner.value = '⚠ Falha ao salvar os dados localmente. Estado anterior restaurado com segurança.';
  }
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
    activeFeeding.value = null;
  }, durationMs);
}

async function handleFeedCharacter(foodId: string): Promise<void> {
  if (isSleeping.value) {
    feedbackBanner.value = `${activeDisplayName.value} está dormindo profundamente e descansando. Não é possível alimentá-lo agora!`;
    return;
  }
  const res = feedActiveCharacterUseCase(saveState.value, foodId, Date.now());
  saveState.value = res.snapshot;
  feedbackBanner.value = res.message;

  if (res.success && res.reaction) {
    const isAccepted = res.reaction.accepted;
    const foodDef = getFoodById(foodId);

    if (feedingBiteTimer1) clearTimeout(feedingBiteTimer1);
    if (feedingBiteTimer2) clearTimeout(feedingBiteTimer2);
    if (feedingBiteTimer3) clearTimeout(feedingBiteTimer3);

    activeFeeding.value = {
      food: foodDef,
      isAccepted,
      satisfactionLevel: res.reaction.satisfactionLevel,
      biteStage: 0,
      crumbActive: false
    };

    if (isAccepted) {
      playSoundEffect('eat');
      feedingBiteTimer1 = setTimeout(() => {
        if (activeFeeding.value) {
          activeFeeding.value.biteStage = 1;
          activeFeeding.value.crumbActive = true;
          playSoundEffect('eat', 0.6);
        }
      }, 650);

      feedingBiteTimer2 = setTimeout(() => {
        if (activeFeeding.value) {
          activeFeeding.value.biteStage = 2;
          activeFeeding.value.crumbActive = true;
          playSoundEffect('eat', 0.4);
        }
      }, 1350);

      feedingBiteTimer3 = setTimeout(() => {
        if (activeFeeding.value) {
          activeFeeding.value.biteStage = 3;
          activeFeeding.value.crumbActive = false;
        }
      }, 1950);
    } else {
      if (res.reaction.contractedDiseaseId === 'overeating_indigestion') {
        playSoundEffect('burp');
      } else {
        playSoundEffect('sneezing');
      }
    }

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
  if (isSleeping.value) {
    feedbackBanner.value = `${activeDisplayName.value} está dormindo profundamente e descansando. Aguarde ele acordar naturalmente!`;
    return;
  }
  const res = performCharacterActivityUseCase(saveState.value, activityId, Date.now());
  saveState.value = res.snapshot;
  feedbackBanner.value = res.message;

  if (res.success) {
    if (activityId === 'deep-slumber') {
      playSoundEffect('snoring', 0.6);
    } else if (activityId === 'purifying-bath') {
      playSoundEffect('shower');
      triggerTemporaryAnimation('amando', 2400);
    } else {
      playSoundEffect('happy');
      triggerTemporaryAnimation('amando', 2400);
    }
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
  playSoundEffect('happy');
  sceneController.triggerReactiveParticles(createReactiveParticleBurst('evolution'));
  await persistCurrentState();
}

async function handleHatchEgg(): Promise<void> {
  isHatchAnimationPlaying.value = false;
  frameToggle.value = 1;
  saveState.value = hatchCharacterEggUseCase(saveState.value, Date.now());
  feedbackBanner.value = `🐣 O ovo de ${activeSpecies.value.displayName} eclodiu!`;
  playSoundEffect('happy');
  sceneController.triggerReactiveParticles(createReactiveParticleBurst('evolution'));
  await persistCurrentState();
}

function startEggHatchSequence(): void {
  if (displayedStage.value !== 'ovo' || isHatchAnimationPlaying.value) return;
  isHatchAnimationPlaying.value = true;
  frameToggle.value = 1;
  feedbackBanner.value = `✨ O ovo ancestral de ${activeSpecies.value.displayName} está rachando e abrindo!`;
  sceneController.triggerReactiveParticles(createReactiveParticleBurst('evolution'));
}

async function handleSimulateOfflineHours(hours: number): Promise<void> {
  isHatchAnimationPlaying.value = false;
  const simulatedNow = saveState.value.lastSavedAtMs + hours * 3600 * 1000;
  nowClockMs.value = simulatedNow;
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

async function handleToggleDeveloperMode(): Promise<void> {
  const nextDevMode = !saveState.value.settings.developerModeEnabled;
  saveState.value = updateSettingsUseCase(
    saveState.value,
    { developerModeEnabled: nextDevMode },
    Date.now()
  );
  feedbackBanner.value = nextDevMode
    ? 'Modo de Desenvolvimento ativado em Ajustes.'
    : 'Modo de Desenvolvimento desativado.';
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
  const keepDevMode = saveState.value.settings.developerModeEnabled;
  await saveRepo.clearSave();
  manualAnimOverride.value = null;
  isHatchAnimationPlaying.value = false;
  frameToggle.value = 1;
  const now = Date.now();
  nowClockMs.value = now;
  const fresh = createNewGameSaveSnapshot(now);
  saveState.value = updateSettingsUseCase(fresh, { developerModeEnabled: keepDevMode }, now);
  syncBabylonEnvironment();
  feedbackBanner.value = `🥚 Novo ovo sorteado de ${activeSpecies.value.displayName}! Aguarde alguns minutos para vê-lo abrir com animação.`;
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
  if (activeCreatureId.value === speciesId) return;
  const prev = saveState.value;
  saveState.value = selectActiveCreatureUseCase(saveState.value, speciesId, Date.now());
  manualAnimOverride.value = null;
  frameToggle.value = 1;
  syncBabylonEnvironment();
  feedbackBanner.value = `Companheiro alterado para ${activeDisplayName.value}!`;
  await persistCurrentState(prev);
}

async function handleSelectOwnedCreature(creatureId: string): Promise<void> {
  isCollectionModalOpen.value = false;
  if (activeCreatureId.value === creatureId) return;
  const prev = saveState.value;
  saveState.value = selectActiveCreatureUseCase(saveState.value, creatureId, Date.now());
  manualAnimOverride.value = null;
  frameToggle.value = 1;
  syncBabylonEnvironment();
  feedbackBanner.value = `Agora cuidando de ${activeDisplayName.value} (${activeRecord.value.runtime.currentStage})!`;
  await persistCurrentState(prev);
}

function handleOpenNurseryFromCollection(): void {
  isCollectionModalOpen.value = false;
  breedingInitialTab.value = 'nursery';
  activeMobileTab.value = 'genetics';
}

function formatCollectionEggStatus(egg: import('@/domains/breeding/types').BredEggRecord): string {
  const status = resolveEggStatus(egg);
  if (status === 'ready_to_hatch') {
    return '✨ Pronto para nascer!';
  }
  if (status === 'incubating') {
    const pct = Math.min(100, Math.round((egg.incubationProgress / egg.maxIncubationHours) * 100));
    return `🔥 Incubando (${pct}%)`;
  }
  return '🥚 Disponível no Berçário';
}

async function handleFocusHatchedCreature(creatureId: string): Promise<void> {
  isCollectionModalOpen.value = false;
  const prev = saveState.value;
  saveState.value = selectActiveCreatureUseCase(saveState.value, creatureId, Date.now());
  manualAnimOverride.value = null;
  frameToggle.value = 1;
  activeMobileTab.value = 'feed';
  breedingInitialTab.value = 'breeding';
  syncBabylonEnvironment();
  sceneController.triggerReactiveParticles(createReactiveParticleBurst('evolution'));
  feedbackBanner.value = `🐣 Bem-vindo à coleção, ${activeDisplayName.value}! Cuide e alimente seu novo Baby!`;
  await persistCurrentState(prev);
}

async function handleUpdateSave(newSnapshot: GameSaveSnapshot): Promise<void> {
  const prevSnapshot = saveState.value;
  const prevCtx = resolveActiveCreatureContext(prevSnapshot);
  const nextCtx = resolveActiveCreatureContext(newSnapshot);
  saveState.value = newSnapshot;
  if (prevCtx.creatureId !== nextCtx.creatureId || prevCtx.speciesId !== nextCtx.speciesId) {
    manualAnimOverride.value = null;
    frameToggle.value = 1;
    syncBabylonEnvironment();
  }
  await persistCurrentState(prevSnapshot);
}

async function handleSettleBattle(payload: {
  readonly historyRecord: import('@/domains/battle/types').BattleHistoryRecord;
  readonly nextWallet: import('@/domains/economy/types').WalletState;
}): Promise<void> {
  const prev = saveState.value;
  saveState.value = recordBattleResultUseCase(
    saveState.value,
    payload.historyRecord,
    payload.nextWallet,
    Date.now()
  );
  feedbackBanner.value =
    payload.historyRecord.result === 'victory'
      ? `🏆 Vitória na Arena! +${payload.historyRecord.rewardCoins} Moedas Âmbar e +${payload.historyRecord.combatXpGained} XP!`
      : payload.historyRecord.result === 'draw'
        ? '🤝 Empate na Arena! Aposta reembolsada.'
        : 'Derrota na Arena. Mais sorte no próximo combate!';
  await persistCurrentState(prev);
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

async function handleVisibilityOrAppStateChange(isForeground: boolean): Promise<void> {
  const now = Date.now();
  nowClockMs.value = now;
  if (isForeground) {
    const activeWasEgg = resolveActiveCreatureContext(saveState.value).record.runtime.currentStage === 'ovo';
    saveState.value = simulateOfflineProgressOnSnapshot(saveState.value, now, {
      deferActiveEggHatch: activeWasEgg
    });
    await careNotificationService.setAppForeground(true, saveState.value, now);
    if (
      displayedStage.value === 'ovo' &&
      !isHatchAnimationPlaying.value &&
      eggRemainingMs.value <= 0
    ) {
      startEggHatchSequence();
    }

    if (isSleeping.value && sleepRemainingMs.value <= 0) {
      saveState.value = simulateOfflineProgressOnSnapshot(saveState.value, now, {
        deferActiveEggHatch: true
      });
      feedbackBanner.value = `✨ ${activeDisplayName.value} despertou revitalizado com energia total!`;
      playSoundEffect('happy');
      void persistCurrentState();
    }
    return;
  }
  await persistCurrentState();
  await careNotificationService.setAppForeground(false, saveState.value, now);
}

function handleDocumentVisibilityChange(): void {
  void handleVisibilityOrAppStateChange(document.visibilityState !== 'hidden');
}

onMounted(async () => {
  unsubscribeUpdater = updaterService.subscribe((state) => {
    updaterState.value = state;
  });
  unsubscribeNotifications = careNotificationService.subscribe((state) => {
    notificationState.value = state;
  });
  await updaterService.initialize();
  void updaterService.checkForUpdates(false);

  const initialForeground =
    typeof document === 'undefined' ? true : document.visibilityState !== 'hidden';
  await careNotificationService.setAppForeground(initialForeground);

  const nowOnMount = Date.now();
  nowClockMs.value = nowOnMount;
  const loaded = await saveRepo.loadSave();
  if (loaded) {
    const wasEgg = resolveActiveCreatureContext(loaded).record.runtime.currentStage === 'ovo';
    const offlineElapsed = Math.max(0, nowOnMount - loaded.lastSavedAtMs);
    saveState.value = simulateOfflineProgressOnSnapshot(loaded, nowOnMount, {
      deferActiveEggHatch: wasEgg && offlineElapsed < 30 * 60 * 1000
    });
    if (displayedStage.value !== 'ovo') {
      if (activeRecord.value.runtime.healthCondition === 'deceased') {
        feedbackBanner.value = `💀 ${activeDisplayName.value} descansou. Use o botão Reviver para despertar seu companheiro!`;
      } else {
        feedbackBanner.value = `✨ Cuidando de ${activeDisplayName.value} (${displayedStage.value} · Nv. ${activeRecord.value.progression.level})!`;
      }
    }
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

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleDocumentVisibilityChange);
  }
  if (Capacitor.isNativePlatform()) {
    nativeAppStateListener = await CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      void handleVisibilityOrAppStateChange(isActive);
    });
  }

  await nextTick();
  if (babylonCanvasRef.value) {
    sceneController.initialize({
      canvas: babylonCanvasRef.value,
      quality: saveState.value.settings.graphicsQuality
    });
    syncBabylonEnvironment();
  }

  if (displayedStage.value === 'ovo' && eggRemainingMs.value <= 0) {
    startEggHatchSequence();
  }

  lastIncubationTickMs.value = Date.now();
  incubationClockTimer = setInterval(() => {
    const tickNow = Date.now();
    const deltaMs = Math.max(0, tickNow - lastIncubationTickMs.value);
    lastIncubationTickMs.value = tickNow;
    nowClockMs.value = tickNow;

    if (
      displayedStage.value === 'ovo' &&
      !isHatchAnimationPlaying.value &&
      eggRemainingMs.value <= 0
    ) {
      startEggHatchSequence();
    }

    if (isSleeping.value && sleepRemainingMs.value <= 0) {
      saveState.value = simulateOfflineProgressOnSnapshot(saveState.value, tickNow, {
        deferActiveEggHatch: true
      });
      feedbackBanner.value = `✨ ${activeDisplayName.value} despertou revitalizado com energia total!`;
      playSoundEffect('happy');
      void persistCurrentState();
    }

    if (deltaMs > 0 && saveState.value.incubator.some((egg) => resolveEggStatus(egg) === 'incubating')) {
      const prevReadyCount = saveState.value.incubator.filter(
        (egg) => resolveEggStatus(egg) === 'ready_to_hatch'
      ).length;
      const updatedSnap = advanceAllIncubatingEggsUseCase(
        saveState.value,
        deltaMs / 60000,
        tickNow
      );
      if (updatedSnap !== saveState.value) {
        saveState.value = updatedSnap;
        const nextReadyCount = updatedSnap.incubator.filter(
          (egg) => resolveEggStatus(egg) === 'ready_to_hatch'
        ).length;
        if (nextReadyCount > prevReadyCount) {
          feedbackBanner.value = '🐣 Um ovo do Berçário concluiu a incubação e está pronto para nascer!';
          sceneController.triggerReactiveParticles(createReactiveParticleBurst('evolution'));
          void persistCurrentState();
        }
      }
    }
  }, 1000);

  spriteTimer = setInterval(() => {
    /* v8 ignore start */
    if (displayedStage.value === 'ovo') {
      if (isHatchAnimationPlaying.value) {
        if (frameToggle.value >= 4) {
          void handleHatchEgg();
          return;
        }
        frameToggle.value = (frameToggle.value + 1) as 1 | 2 | 3 | 4;
        return;
      }
      if (eggRemainingMs.value <= 0) {
        startEggHatchSequence();
        return;
      }
      frameToggle.value =
        eggRemainingMs.value <= 20_000 ? (frameToggle.value === 1 ? 2 : 1) : 1;
      return;
    }
    frameToggle.value = frameToggle.value === 4 ? 1 : ((frameToggle.value + 1) as 1 | 2 | 3 | 4);
    /* v8 ignore stop */
  }, 650);

  realTimeDecayTimer = setInterval(() => {
    /* v8 ignore start */
    const tickNow = Date.now();
    nowClockMs.value = tickNow;
    saveState.value = simulateOfflineProgressOnSnapshot(saveState.value, tickNow, {
      deferActiveEggHatch: true
    });
    void persistCurrentState();
    /* v8 ignore stop */
  }, 60000);
});

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', handleDocumentVisibilityChange);
  }
  if (nativeAppStateListener) {
    void nativeAppStateListener.remove();
    nativeAppStateListener = null;
  }
  if (unsubscribeUpdater) unsubscribeUpdater();
  if (unsubscribeNotifications) unsubscribeNotifications();
  careNotificationService.dispose();
  if (incubationClockTimer) clearInterval(incubationClockTimer);
  if (spriteTimer) clearInterval(spriteTimer);
  if (realTimeDecayTimer) clearInterval(realTimeDecayTimer);
  if (animResetTimeout) clearTimeout(animResetTimeout);
  if (feedingBiteTimer1) clearTimeout(feedingBiteTimer1);
  if (feedingBiteTimer2) clearTimeout(feedingBiteTimer2);
  if (feedingBiteTimer3) clearTimeout(feedingBiteTimer3);
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
                  {{ activeDisplayName }}
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

          <div class="flex items-center gap-1.5">
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
          tabindex="0"
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

        <!-- Floating Z z z particles overlay during sleep -->
        <div
          v-if="isSleeping"
          data-testid="sleep-particles-overlay"
          class="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center overflow-hidden"
        >
          <div class="relative w-40 h-40">
            <span class="absolute top-2 right-4 text-xl font-bold font-mono text-cyan-300 animate-bounce opacity-90 drop-shadow-md">Z</span>
            <span class="absolute top-8 right-10 text-base font-bold font-mono text-cyan-200 animate-pulse opacity-75 drop-shadow-sm">z</span>
            <span class="absolute top-14 right-14 text-xs font-bold font-mono text-cyan-100 animate-ping opacity-60">z</span>
          </div>
        </div>

        <!-- Active Feeding & Medicine Interactive Animation Overlay -->
        <div
          v-if="activeFeeding"
          data-testid="feeding-animation-overlay"
          class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
        >
          <div
            class="relative flex flex-col items-center"
            :class="activeFeeding.isAccepted ? 'animate-feeding-approach' : 'animate-feeding-recoil'"
          >
            <!-- Floating Food Name & Status Badge -->
            <div
              data-testid="feeding-food-badge"
              class="mb-2 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-lg border backdrop-blur flex items-center gap-1.5 transition-transform"
              :class="activeFeeding.isAccepted ? 'bg-slate-900/90 border-emerald-500/60 text-emerald-300 scale-100' : 'bg-rose-950/95 border-rose-600 text-rose-200'"
            >
              <span v-if="activeFeeding.food.category === 'medicine'">✚</span>
              <span v-else>🍖</span>
              <span data-testid="feeding-food-name">{{ activeFeeding.food.name }}</span>
              <span
                v-if="activeFeeding.biteStage === 1"
                data-testid="feeding-bite-status"
                class="text-[10px] text-amber-300"
              >
                (Mordida!)
              </span>
              <span
                v-else-if="activeFeeding.biteStage === 2"
                data-testid="feeding-bite-status"
                class="text-[10px] text-amber-300"
              >
                (Mastigando...)
              </span>
              <span
                v-else-if="activeFeeding.biteStage >= 3"
                data-testid="feeding-bite-status"
                class="text-[10px] text-emerald-300"
              >
                (Delícia! ✨)
              </span>
            </div>

            <!-- Exact Food / Medicine Pixel Art Sprite -->
            <div
              data-testid="feeding-food-sprite"
              class="relative transition-all duration-200"
              :class="{
                'scale-110 rotate-[-6deg]': activeFeeding.biteStage === 0,
                'scale-95 rotate-[6deg] animate-bite-shake': activeFeeding.biteStage === 1,
                'scale-75 rotate-[-12deg] opacity-80': activeFeeding.biteStage === 2,
                'scale-0 opacity-0': activeFeeding.biteStage >= 3,
                'filter brightness-75 contrast-125 saturate-50': !activeFeeding.isAccepted
              }"
            >
              <food-pixel-art
                :art="activeFeeding.food.pixelArt"
                :size="52"
                :bite-stage="activeFeeding.biteStage"
                :data-testid="`active-feeding-art-${activeFeeding.food.id}`"
              />

              <!-- Bite Crumb Pixel Particles Burst -->
              <div
                v-if="activeFeeding.crumbActive && activeFeeding.biteStage < 3"
                data-testid="feeding-bite-crumbs"
                class="absolute -inset-2 pointer-events-none flex items-center justify-center"
              >
                <span
                  class="absolute w-1.5 h-1.5 rounded-sm animate-crumb-1"
                  :style="{ backgroundColor: activeFeeding.food.pixelColors.primary }"
                />
                <span
                  class="absolute w-1.5 h-1.5 rounded-sm animate-crumb-2"
                  :style="{ backgroundColor: activeFeeding.food.pixelColors.secondary }"
                />
                <span
                  class="absolute w-1 h-1 rounded-sm animate-crumb-3"
                  :style="{ backgroundColor: activeFeeding.food.pixelColors.highlight }"
                />
                <span
                  class="absolute w-1 h-1 rounded-sm animate-crumb-4"
                  :style="{ backgroundColor: activeFeeding.food.pixelColors.primary }"
                />
              </div>

              <!-- Rejection Mark when forbidden or wrong medicine -->
              <div
                v-if="!activeFeeding.isAccepted"
                data-testid="feeding-rejection-mark"
                class="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-rose-600 border border-white text-white flex items-center justify-center text-xs font-black shadow-md animate-bounce"
              >
                ✕
              </div>
            </div>
          </div>
        </div>

        <!-- Environment & Status Overlay Pill -->
        <div
          class="absolute top-2.5 left-2.5 z-20 px-2.5 py-1 rounded-lg bg-slate-900/90 backdrop-blur border border-slate-700 text-[11px] text-slate-200 shadow-sm flex items-center gap-1.5"
        >
          <span class="font-bold text-emerald-400">{{ activeEnvironment.name }}</span>
          <span class="text-slate-500">|</span>
          <span data-testid="active-emotional-state" class="uppercase text-amber-300 font-semibold">
            Estado: {{ isSleeping ? 'dormindo' : activeRecord.runtime.emotionalState }}
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
          <span v-if="displayedStage === 'ovo'" data-testid="egg-countdown-label" class="text-amber-300 font-semibold">
            {{ isHatchAnimationPlaying ? '🥚 Eclosão em andamento...' : `🥚 ${eggCountdownLabel}` }}
          </span>
          <span v-else-if="nextEvolutionRule" class="text-emerald-300 font-semibold">
            Próx. fase ({{ nextEvolutionRule.toStage }}): Nv.{{ nextEvolutionRule.requiredLevel }} e
            {{ nextEvolutionRule.requiredAgeHours }}h
          </span>
          <span v-else class="text-emerald-400 font-bold uppercase">
            Evolução Completa (Adulto)
          </span>
        </div>
      </section>

      <!-- Discreet Update & Status Notification Banners -->
      <section aria-label="Avisos, Atualizações e Feedback" class="shrink-0">
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

        <!-- Sleeping Status & Natural Rest Countdown Banner -->
        <div
          v-if="isSleeping"
          data-testid="sleeping-countdown-banner"
          class="px-3.5 py-2.5 bg-indigo-950/95 border-b border-indigo-600/70 text-xs text-indigo-100 flex items-center justify-between gap-2 shadow-inner transition-colors duration-500"
        >
          <div class="flex items-center gap-2 truncate">
            <span class="text-base animate-pulse">💤</span>
            <div>
              <p class="font-bold text-indigo-200">Dormindo e Recuperando Energia Vital</p>
              <p class="text-[11px] text-indigo-300">
                Energia: <strong class="text-emerald-400">{{ activeRecord.needs.energy }}/100</strong> · Despertar natural em:
                <strong class="text-amber-300 font-mono">{{ sleepRemainingFormatted }}</strong>
              </p>
            </div>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-900 border border-indigo-500/50 text-indigo-200 uppercase">
              Em Repouso
            </span>
          </div>
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
            v-else-if="activeRecord.runtime.currentStage === 'ovo' && saveState.settings.developerModeEnabled"
            type="button"
            data-testid="hatch-egg-btn"
            class="px-2.5 py-1 rounded-md bg-amber-600 hover:bg-amber-500 text-white font-bold uppercase text-[11px] shrink-0 shadow-sm"
            @click="handleHatchEgg"
          >
            Eclodir Agora (Dev)
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

        <!-- Incubator Quick Status Banner -->
        <div
          v-if="incubatorBannerInfo"
          data-testid="incubator-status-banner"
          class="px-3.5 py-2 border-b text-xs flex items-center justify-between gap-2"
          :class="
            incubatorBannerInfo.isReady
              ? 'bg-emerald-950/90 border-emerald-700 text-emerald-200'
              : 'bg-amber-950/80 border-amber-700/70 text-amber-200'
          "
        >
          <span class="truncate font-medium">{{ incubatorBannerInfo.text }}</span>
          <button
            type="button"
            data-testid="open-nursery-banner-btn"
            class="px-2 py-1 rounded bg-slate-900/80 hover:bg-slate-800 border border-current text-[10px] font-bold uppercase shrink-0"
            @click="breedingInitialTab = 'nursery'; activeMobileTab = 'genetics'"
          >
            Berçário
          </button>
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
      </section>

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
          </div>

          <div
            v-if="displayedStage === 'ovo'"
            class="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-2"
          >
            <span>🥚 O ovo ancestral está incubando no santuário! Ecloda-o para alimentar o filhote.</span>
          </div>

          <div
            v-else-if="isSleeping"
            data-testid="sleep-feed-blocked-notice"
            class="p-2.5 rounded-xl bg-indigo-950/80 border border-indigo-700/60 text-indigo-200 text-xs flex items-center justify-between gap-2 shadow-sm"
          >
            <span>💤 {{ activeDisplayName }} está dormindo profundamente. Alimentação e remédios estão bloqueados durante o repouso.</span>
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
                <!-- Exact Crisp Pixel Art Image -->
                <div
                  :data-testid="`food-pixel-card-${food.id}`"
                  class="w-10 h-10 rounded-lg border border-slate-700/80 bg-slate-900/80 p-0.5 shrink-0 flex items-center justify-center shadow-inner"
                >
                  <food-pixel-art
                    :art="food.pixelArt"
                    :size="34"
                    :data-testid="`food-pixel-art-${food.id}`"
                  />
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
                  :disabled="displayedStage === 'ovo' || isSleeping"
                  class="px-2.5 py-1.5 rounded-md text-xs font-bold uppercase shadow-sm transition"
                  :class="displayedStage === 'ovo' || isSleeping ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white'"
                  @click="handleFeedCharacter(food.id)"
                >
                  {{ isSleeping ? 'Dormindo' : 'Dar' }}
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

          <div
            v-else-if="isSleeping"
            data-testid="sleep-activity-blocked-notice"
            class="p-2.5 rounded-xl bg-indigo-950/80 border border-indigo-700/60 text-indigo-200 text-xs flex items-center justify-between gap-2 shadow-sm"
          >
            <span>💤 {{ activeDisplayName }} está dormindo profundamente. Todas as atividades e banhos estão bloqueados durante o descanso.</span>
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
                :disabled="displayedStage === 'ovo' || isSleeping"
                class="px-3 py-2 rounded-md text-xs font-bold uppercase shrink-0 shadow-sm transition"
                :class="displayedStage === 'ovo' || isSleeping ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white'"
                @click="handleExecuteActivity(act.id)"
              >
                {{ isSleeping ? 'Dormindo' : 'Iniciar' }}
              </button>
            </div>
          </div>
        </div>

        <!-- TAB 3: ARENA DE COMBATE P2P -->
        <div
          v-else-if="activeMobileTab === 'arena'"
          data-testid="tab-content-arena"
          class="space-y-3"
        >
          <div
            v-if="displayedStage === 'ovo'"
            class="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-center flex flex-col items-center gap-2"
          >
            <span class="text-2xl">🥚</span>
            <span class="font-bold uppercase tracking-wider">Ovo Ancestral em Repouso</span>
            <p class="text-slate-400 text-[11px]">
              Ovos não podem combater na Arena! Aguarde a eclosão para treinar e duelar.
            </p>
          </div>

          <div
            v-else-if="isSleeping"
            data-testid="sleep-arena-blocked-notice"
            class="p-4 rounded-xl bg-indigo-950/80 border border-indigo-700/60 text-indigo-200 text-xs text-center flex flex-col items-center gap-2"
          >
            <span class="text-2xl">💤</span>
            <span class="font-bold uppercase tracking-wider">{{ activeDisplayName }} está Dormindo</span>
            <p class="text-indigo-300/80 text-[11px]">
              Duelos estão indisponíveis durante o sono restaurador. Aguarde o despertar.
            </p>
          </div>

          <div
            v-else-if="!isCreatureAlive"
            class="p-4 rounded-xl bg-rose-950/80 border border-rose-700/60 text-rose-200 text-xs text-center flex flex-col items-center gap-2"
          >
            <span class="text-2xl">💀</span>
            <span class="font-bold uppercase tracking-wider">Criatura Abatida</span>
            <p class="text-rose-300/80 text-[11px]">
              Recupere a saúde do seu dinossauro com cuidados antes de entrar na Arena.
            </p>
          </div>

          <battle-arena-modal
            v-else
            :active-creature="activeRecord"
            :wallet="saveState.wallet"
            :battle-archive="saveState.battleArchive"
            :theme="creatureTheme"
            :embedded="true"
            @settle-battle="handleSettleBattle"
          />
        </div>

        <!-- TAB 4: FICHA INDIVIDUAL COMPLETA DO PERSONAGEM -->
        <div
          v-else-if="activeMobileTab === 'sheet'"
          data-testid="tab-content-sheet"
          class="space-y-3"
        >
          <!-- Coleção de Dinossauros do Jogador -->
          <div
            data-testid="player-collection-card"
            class="p-3 rounded-xl border space-y-2 transition-colors duration-500"
            :style="{
              backgroundColor: creatureTheme.cardBackground,
              borderColor: creatureTheme.borderSubtleColor
            }"
          >
            <div class="flex items-center justify-between">
              <h2 class="text-xs font-bold uppercase text-emerald-400">
                Minha Coleção de Dinossauros
              </h2>
              <div class="flex items-center gap-2">
                <span class="text-[11px] font-mono text-amber-300">
                  {{ ownedCreatures.length }} criatura(s)
                </span>
                <button
                  type="button"
                  data-testid="open-collection-modal-btn"
                  class="px-2 py-0.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700 transition"
                  title="Expandir Coleção Completa"
                  @click="isCollectionModalOpen = true"
                >
                  <span>🐉</span>
                  <span>{{ ownedCreatures.length }}</span>
                  <span
                    v-if="hasReadyNurseryEgg"
                    class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"
                  />
                </button>
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-0.5">
              <button
                v-for="entry in ownedCreatures"
                :key="entry.creatureId"
                type="button"
                :data-testid="`collection-creature-${entry.creatureId}`"
                class="p-2 rounded-lg border text-left flex items-center justify-between gap-2 transition"
                :style="{
                  backgroundColor: activeCreatureId === entry.creatureId ? creatureTheme.cardDarkBackground : 'transparent',
                  borderColor: activeCreatureId === entry.creatureId ? creatureTheme.primaryColor : creatureTheme.borderSubtleColor
                }"
                @click="handleSelectOwnedCreature(entry.creatureId)"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <div
                    class="w-4 h-4 rounded-full shrink-0 border border-white/20"
                    :style="{ backgroundColor: entry.record.genetics.phenotype.colors.base }"
                  />
                  <div class="min-w-0">
                    <div class="text-xs font-bold text-white truncate">
                      {{ entry.record.runtime.customNickname || getCharacterSpeciesById(entry.speciesId).displayName }}
                      ({{ entry.record.genetics.sex === 'male' ? '♂' : '♀' }})
                    </div>
                    <div class="text-[10px] text-slate-400 truncate">
                      {{ entry.record.runtime.currentStage }} · Gen {{ entry.record.genetics.generation }} · Nv.{{ entry.record.progression.level }}
                    </div>
                  </div>
                </div>
                <span
                  class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0"
                  :class="activeCreatureId === entry.creatureId ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-300'"
                >
                  {{ activeCreatureId === entry.creatureId ? 'Ativo' : 'Cuidar' }}
                </span>
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
                Ficha Oficial — {{ activeDisplayName }}
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
                <span class="text-slate-400 block text-[10px] uppercase">Espécie · Geração</span>
                <strong>{{ activeSpecies.species }} (Gen {{ activeRecord.genetics.generation }})</strong>
              </div>
              <div
                v-if="activeRecord.originEggId"
                class="p-2 rounded-lg border transition-colors duration-500"
                :style="{
                  backgroundColor: creatureTheme.cardDarkBackground,
                  borderColor: creatureTheme.borderSubtleColor
                }"
              >
                <span class="text-slate-400 block text-[10px] uppercase">Origem Genética</span>
                <strong class="font-mono text-amber-300">
                  {{ activeRecord.genetics.parents ? `${activeRecord.genetics.parents.sireName} × ${activeRecord.genetics.parents.damName}` : activeRecord.originEggId }}
                </strong>
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
            :initial-subtab="breedingInitialTab"
            @update-save="handleUpdateSave"
            @focus-creature="handleFocusHatchedCreature"
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
              Envia alertas no aparelho quando fome, sede, energia, felicidade, higiene ou saúde se aproximarem do nível crítico (somente com o APK fechado ou minimizado).
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

          <!-- Modo de Desenvolvimento -->
          <div
            data-testid="developer-mode-card"
            class="p-3 rounded-xl border space-y-2 transition-colors duration-500"
            :style="{
              backgroundColor: creatureTheme.cardBackground,
              borderColor: creatureTheme.borderSubtleColor
            }"
          >
            <div class="flex items-center justify-between gap-2">
              <div>
                <h2 class="text-xs font-bold uppercase text-amber-300 flex items-center gap-1.5">
                  <code-icon class="w-3.5 h-3.5 text-amber-400" />
                  <span>Modo de Desenvolvimento</span>
                </h2>
                <p class="text-[11px] text-slate-400 mt-0.5">
                  Libera troca de criatura companheira, simulador de tempo offline, eclosão imediata e sorteio de novo bichinho.
                </p>
              </div>
              <button
                type="button"
                data-testid="toggle-dev-mode-btn"
                class="px-2.5 py-1 rounded-md border text-xs font-bold shrink-0 transition"
                :class="
                  saveState.settings.developerModeEnabled
                    ? 'bg-amber-600 text-white border-amber-400'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                "
                @click="handleToggleDeveloperMode"
              >
                {{ saveState.settings.developerModeEnabled ? 'Ativado' : 'Desativado' }}
              </button>
            </div>
          </div>

          <!-- Opções exclusivas do Modo de Desenvolvimento -->
          <div
            v-if="saveState.settings.developerModeEnabled"
            data-testid="developer-tools-section"
            class="space-y-3"
          >
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
                Ferramenta dev: escolha outro companheiro para testar temas, sprites e atributos:
              </p>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-0.5">
                <button
                  v-for="species in allAvailableSpecies"
                  :key="species.id"
                  type="button"
                  :data-testid="`select-species-${species.id}`"
                  class="p-2 rounded-lg border text-left flex items-center gap-2 transition-all duration-200"
                  :style="{
                    backgroundColor: activeCreatureId === species.id ? creatureTheme.cardDarkBackground : 'transparent',
                    borderColor: activeCreatureId === species.id ? creatureTheme.primaryColor : creatureTheme.borderSubtleColor,
                    boxShadow: activeCreatureId === species.id ? creatureTheme.accentGlow : 'none'
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
        </div>
      </main>

      <!-- Bottom Mobile Navigation Bar (6 Game Tabs - Always visible sticky navigation) -->
      <nav
        aria-label="Menu principal do jogo"
        data-testid="bottom-navigation-bar"
        class="sticky bottom-0 z-50 shrink-0 grid grid-cols-6 backdrop-blur border-t shadow-lg transition-colors duration-500"
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
          data-testid="nav-tab-arena"
          class="py-2.5 flex flex-col items-center justify-center gap-1 text-[11px] font-bold uppercase transition"
          :class="
            activeMobileTab === 'arena'
              ? 'text-emerald-400 bg-emerald-500/10 border-t-2 border-emerald-500'
              : 'text-slate-400 hover:text-slate-200'
          "
          @click="activeMobileTab = 'arena'"
        >
          <swords-icon class="w-4 h-4" />
          <span>Arena</span>
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
          @click="breedingInitialTab = 'breeding'; activeMobileTab = 'genetics'"
        >
          <dna-icon class="w-4 h-4" />
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

      <!-- Owned Dinosaur Collection & Egg Nursery Quick Switcher Modal -->
      <section
        v-if="isCollectionModalOpen"
        data-testid="collection-switcher-modal"
        aria-label="Coleção de Dinossauros"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
        @click.self="isCollectionModalOpen = false"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="collection-modal-title"
          class="w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          :style="{
            backgroundColor: creatureTheme.containerBackground,
            borderColor: creatureTheme.borderColor
          }"
        >
          <div
            class="px-4 py-3 border-b flex items-center justify-between"
            :style="{
              backgroundColor: creatureTheme.headerBackground,
              borderBottomColor: creatureTheme.borderColor
            }"
          >
            <div>
              <h2 id="collection-modal-title" class="text-sm font-black uppercase text-white flex items-center gap-1.5">
                <span>🐉</span>
                <span>Meus Dinossauros ({{ ownedCreatures.length }})</span>
              </h2>
              <p class="text-[11px] text-slate-400">
                Troque de dinossauro ativo para alimentar, cuidar e evoluir.
              </p>
            </div>
            <button
              type="button"
              data-testid="close-collection-modal-btn"
              aria-label="Fechar coleção"
              class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700"
              @click="isCollectionModalOpen = false"
            >
              ✕
            </button>
          </div>

          <div class="p-4 overflow-y-auto space-y-3">
            <div class="space-y-2">
              <button
                v-for="entry in ownedCreatures"
                :key="entry.creatureId"
                type="button"
                :data-testid="`modal-collection-creature-${entry.creatureId}`"
                class="w-full p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition hover:brightness-110"
                :style="{
                  backgroundColor:
                    activeCreatureId === entry.creatureId
                      ? creatureTheme.cardDarkBackground
                      : creatureTheme.cardBackground,
                  borderColor:
                    activeCreatureId === entry.creatureId
                      ? creatureTheme.primaryColor
                      : creatureTheme.borderSubtleColor
                }"
                @click="handleSelectOwnedCreature(entry.creatureId)"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <div
                    class="w-6 h-6 rounded-lg shrink-0 border border-white/20"
                    :style="{ backgroundColor: entry.record.genetics.phenotype.colors.base }"
                  />
                  <div class="min-w-0">
                    <div class="text-xs font-bold text-white truncate">
                      {{ entry.record.runtime.customNickname || getCharacterSpeciesById(entry.speciesId).displayName }}
                      ({{ entry.record.genetics.sex === 'male' ? '♂' : '♀' }})
                    </div>
                    <div class="text-[10px] text-slate-300 truncate">
                      Fase: <strong class="capitalize">{{ entry.record.runtime.currentStage }}</strong> · Gen {{ entry.record.genetics.generation }} · Nv.{{ entry.record.progression.level }}
                    </div>
                    <div
                      v-if="entry.record.genetics.parents"
                      class="text-[10px] text-amber-300 truncate"
                    >
                      Pais: {{ entry.record.genetics.parents.sireName }} × {{ entry.record.genetics.parents.damName }}
                    </div>
                  </div>
                </div>
                <span
                  class="px-2 py-1 rounded-lg text-[10px] font-bold uppercase shrink-0"
                  :class="
                    activeCreatureId === entry.creatureId
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-200 border border-slate-700'
                  "
                >
                  {{ activeCreatureId === entry.creatureId ? 'Ativo' : 'Cuidar' }}
                </span>
              </button>
            </div>

            <div
              v-if="activeIncubatorEggs.length > 0"
              data-testid="collection-modal-eggs-section"
              class="pt-2 border-t space-y-2"
              :style="{ borderTopColor: creatureTheme.borderSubtleColor }"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold uppercase text-amber-300">
                  🥚 Ovos no Berçário ({{ activeIncubatorEggs.length }})
                </span>
                <button
                  type="button"
                  data-testid="collection-modal-open-nursery-btn"
                  class="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black uppercase transition"
                  @click="handleOpenNurseryFromCollection"
                >
                  Abrir Berçário
                </button>
              </div>
              <div
                v-for="egg in activeIncubatorEggs"
                :key="egg.id"
                class="p-2 rounded-xl border text-[11px] flex items-center justify-between gap-2"
                :style="{
                  backgroundColor: creatureTheme.cardDarkBackground,
                  borderColor: creatureTheme.borderSubtleColor
                }"
              >
                <span class="font-bold text-white capitalize">
                  🥚 {{ getCharacterSpeciesById(egg.targetSpecies).displayName }} (Gen {{ egg.genome.generation }})
                </span>
                <span class="text-amber-300 font-mono text-[10px]">
                  {{ formatCollectionEggStatus(egg) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Interactive Genealogy Tree Modal -->
      <genealogy-tree-modal
        v-if="showGenealogyModal && activeRecord.genetics"
        :target-genome="activeRecord.genetics"
        @close="showGenealogyModal = false"
      />
    </div>
  </div>
</template>

<style scoped>
@keyframes feeding-approach {
  0% {
    transform: translate(45px, 10px) scale(0.7);
    opacity: 0;
  }
  25% {
    transform: translate(25px, -5px) scale(1.05);
    opacity: 1;
  }
  50% {
    transform: translate(15px, 2px) scale(1);
    opacity: 1;
  }
  75% {
    transform: translate(12px, 0px) scale(0.9);
    opacity: 0.95;
  }
  100% {
    transform: translate(8px, 0px) scale(0.85);
    opacity: 0.9;
  }
}

@keyframes feeding-recoil {
  0% {
    transform: translate(25px, 0) scale(0.8);
    opacity: 0;
  }
  25% {
    transform: translate(15px, 0) scale(1);
    opacity: 1;
  }
  55% {
    transform: translate(25px, 15px) rotate(15deg) scale(0.9);
    opacity: 0.9;
  }
  100% {
    transform: translate(35px, 40px) rotate(30deg) scale(0.6);
    opacity: 0;
  }
}

@keyframes bite-shake {
  0%, 100% {
    transform: scale(0.95) rotate(6deg);
  }
  25% {
    transform: scale(0.9) rotate(-4deg) translateY(-2px);
  }
  75% {
    transform: scale(1) rotate(8deg) translateY(2px);
  }
}

@keyframes crumb-1 {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(-14px, -12px) scale(0.4);
    opacity: 0;
  }
}

@keyframes crumb-2 {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(16px, -10px) scale(0.4);
    opacity: 0;
  }
}

@keyframes crumb-3 {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(-10px, 14px) scale(0.3);
    opacity: 0;
  }
}

@keyframes crumb-4 {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(12px, 12px) scale(0.3);
    opacity: 0;
  }
}

.animate-feeding-approach {
  animation: feeding-approach 2.4s ease-out forwards;
}

.animate-feeding-recoil {
  animation: feeding-recoil 2.4s ease-out forwards;
}

.animate-bite-shake {
  animation: bite-shake 0.3s ease-in-out;
}

.animate-crumb-1 {
  animation: crumb-1 0.6s ease-out forwards;
}

.animate-crumb-2 {
  animation: crumb-2 0.6s ease-out forwards;
}

.animate-crumb-3 {
  animation: crumb-3 0.6s ease-out forwards;
}

.animate-crumb-4 {
  animation: crumb-4 0.6s ease-out forwards;
}
</style>
