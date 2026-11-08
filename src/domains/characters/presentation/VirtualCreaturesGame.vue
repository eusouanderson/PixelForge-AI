<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import {
  Utensils as UtensilsIcon,
  Dumbbell as DumbbellIcon,
  FileText as FileTextIcon,
  Users as UsersIcon,
  Settings as SettingsIcon,
  Coins as CoinsIcon,
  Clock as ClockIcon,
  RotateCcw as RotateCcwIcon
} from 'lucide-vue-next';
import { Canvas2dRenderer } from '@/infrastructure/renderer/canvas-2d-renderer';
import { BabylonCreatureSceneController } from '@/game-engine/babylon/scene-controller';
import type {
  CharacterAnimationName,
  CharacterId,
  CharacterLifeStage
} from '@/domains/characters/types';
import {
  getCharacterSpeciesById,
  listAllCharacterSpecies
} from '@/domains/characters/domain/character-registry';
import { CharacterSpriteRepository } from '@/domains/characters/infrastructure/character-sprite-repository';
import { computeTotalPowerRating } from '@/domains/attributes/domain/attributes-engine';
import {
  evaluateDietaryPreference,
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
  selectActiveCharacterUseCase,
  updateSettingsUseCase
} from '@/domains/persistence/application/game-session-service';
import type { GameSaveSnapshot } from '@/domains/persistence/types';
import type { GraphicsQualityPreset } from '@/domains/settings/types';

const spriteRepo = new CharacterSpriteRepository();
const saveRepo = new LocalStorageGameSaveRepository();
const renderer2d = new Canvas2dRenderer();
const sceneController = new BabylonCreatureSceneController();

const saveState = ref<GameSaveSnapshot>(createNewGameSaveSnapshot(Date.now()));
const activeMobileTab = ref<'feed' | 'activities' | 'sheet' | 'roster' | 'settings'>('feed');
const feedbackBanner = ref<string>('Bem-vindo ao Santuário Elemental! Cuide do seu dinossauro.');
const babylonCanvasRef = ref<HTMLCanvasElement | null>(null);
const spriteOverlayCanvasRef = ref<HTMLCanvasElement | null>(null);
const frameToggle = ref<1 | 2 | 3 | 4>(1);
const manualStageOverride = ref<CharacterLifeStage | null>(null);
const manualAnimOverride = ref<CharacterAnimationName | null>(null);

let spriteTimer: ReturnType<typeof setInterval> | null = null;
let animResetTimeout: ReturnType<typeof setTimeout> | null = null;

const allSpecies = listAllCharacterSpecies();
const allFoods = listAllFoods();
const allActivities = listAllActivities();

const activeCharacterId = computed<CharacterId>(() => saveState.value.activeCharacterId);
const activeSpecies = computed(() => getCharacterSpeciesById(activeCharacterId.value));
const activeRecord = computed(() => saveState.value.characters[activeCharacterId.value]);
const activeEnvironment = computed(() => getCharacterEnvironmentConfig(activeCharacterId.value));
const activeParticles = computed(() => getCharacterParticleConfig(activeCharacterId.value));
const totalPower = computed(() => computeTotalPowerRating(activeRecord.value.attributes));

const displayedStage = computed<CharacterLifeStage>(
  () => manualStageOverride.value ?? activeRecord.value.runtime.currentStage
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
}

function renderCurrentSpriteToOverlay(): void {
  const art = currentSpriteArt.value;
  const showGrid = saveState.value.settings.showPixelGrid;
  if (spriteOverlayCanvasRef.value) {
    renderer2d.renderToCanvas(spriteOverlayCanvasRef.value, art, 192, 192, showGrid);
  }
  sceneController.updateCreatureSprite(art, showGrid);
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

async function handleSelectCharacter(characterId: CharacterId): Promise<void> {
  manualStageOverride.value = null;
  manualAnimOverride.value = null;
  saveState.value = selectActiveCharacterUseCase(saveState.value, characterId, Date.now());
  feedbackBanner.value = `${activeSpecies.value.displayName} entrou em destaque no cenário ${activeEnvironment.value.name}!`;
  syncBabylonEnvironment();
  await persistCurrentState();
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
    manualStageOverride.value = null;
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
  manualStageOverride.value = null;
  saveState.value = hatchCharacterEggUseCase(saveState.value, Date.now());
  feedbackBanner.value = `O ovo de ${activeSpecies.value.displayName} eclodiu!`;
  sceneController.triggerReactiveParticles(createReactiveParticleBurst('evolution'));
  await persistCurrentState();
}

async function handleSimulateOfflineHours(hours: number): Promise<void> {
  const simulatedNow = saveState.value.lastSavedAtMs + hours * 3600 * 1000;
  saveState.value = simulateOfflineProgressOnSnapshot(saveState.value, simulatedNow);
  feedbackBanner.value = `Simuladas +${hours}h offline! As necessidades e idade evoluíram deterministicamente.`;
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

async function handleResetSave(): Promise<void> {
  await saveRepo.clearSave();
  manualStageOverride.value = null;
  manualAnimOverride.value = null;
  saveState.value = createNewGameSaveSnapshot(Date.now());
  syncBabylonEnvironment();
  feedbackBanner.value = 'Progresso reiniciado para o estado inicial de fábrica.';
}

watch([currentSpriteArt, () => saveState.value.settings.showPixelGrid], () => {
  renderCurrentSpriteToOverlay();
});

onMounted(async () => {
  const loaded = await saveRepo.loadSave();
  if (loaded) {
    saveState.value = simulateOfflineProgressOnSnapshot(loaded, Date.now());
  } else {
    await persistCurrentState();
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
    frameToggle.value = frameToggle.value === 4 ? 1 : ((frameToggle.value + 1) as 1 | 2 | 3 | 4);
  }, 550);
});

onUnmounted(() => {
  if (spriteTimer) clearInterval(spriteTimer);
  if (animResetTimeout) clearTimeout(animResetTimeout);
  sceneController.dispose();
});
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center select-none">
    <!-- Mobile Portrait Container -->
    <div
      class="w-full max-w-md min-h-screen bg-slate-900 border-x-2 border-slate-800 flex flex-col justify-between shadow-2xl"
    >
      <!-- Top HUD Header -->
      <header class="p-3 bg-slate-950 border-b-2 border-slate-800 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <div>
            <div class="flex items-center gap-1.5">
              <h1
                data-testid="active-character-name"
                class="text-base font-bold tracking-wider uppercase text-amber-400"
              >
                {{ activeSpecies.displayName }}
              </h1>
              <span
                class="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-slate-800 border border-slate-700 text-cyan-300"
              >
                Nv. {{ activeRecord.progression.level }}
              </span>
              <span
                data-testid="active-stage-badge"
                class="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-indigo-950 border border-indigo-700 text-indigo-200"
              >
                {{ displayedStage }}
              </span>
            </div>
            <p class="text-[11px] text-slate-400">
              {{ activeSpecies.scientificName }} · {{ activeSpecies.elementLabel }}
            </p>
          </div>

          <div class="flex items-center gap-2">
            <div
              data-testid="wallet-coins"
              class="flex items-center gap-1 px-2.5 py-1 bg-amber-950/70 border border-amber-600/60 text-amber-300 text-xs font-bold"
              title="Moedas Âmbar"
            >
              <coins-icon class="w-3.5 h-3.5 text-amber-400" />
              <span>{{ saveState.wallet.amberCoins }}</span>
            </div>
          </div>
        </div>

        <!-- Quick Character Selector Strip (All 8 Real Characters) -->
        <nav
          aria-label="Seleção rápida de personagens"
          class="flex items-center gap-1.5 overflow-x-auto pb-1"
        >
          <button
            v-for="species in allSpecies"
            :key="species.id"
            type="button"
            :data-testid="`select-char-${species.id}`"
            class="px-2.5 py-1.5 text-xs font-bold uppercase tracking-tight border transition-colors shrink-0"
            :class="
              species.id === activeCharacterId
                ? 'bg-amber-500 text-slate-950 border-amber-300'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
            "
            @click="handleSelectCharacter(species.id)"
          >
            {{ species.displayName }}
          </button>
        </nav>
      </header>

      <!-- Babylon.js 3D Environment + Crisp Nearest-Neighbor Pixel Art Viewport -->
      <section
        aria-label="Cenário 3D e Criatura"
        class="relative w-full h-64 bg-slate-950 border-b-2 border-slate-800 overflow-hidden flex items-center justify-center"
      >
        <canvas
          ref="babylonCanvasRef"
          data-testid="babylon-viewport-canvas"
          class="absolute inset-0 w-full h-full block"
        />

        <!-- Synchronized Nearest-Neighbor 2D Sprite Canvas on Pedestal -->
        <canvas
          ref="spriteOverlayCanvasRef"
          data-testid="creature-pixel-canvas"
          width="192"
          height="192"
          class="relative z-10 w-40 h-40"
          style="image-rendering: pixelated"
        />

        <!-- Environment & Status Overlay Pill -->
        <div
          class="absolute top-2 left-2 z-20 px-2 py-1 bg-slate-950/85 border border-slate-700 text-[11px] text-slate-200"
        >
          <span class="font-bold text-amber-300">{{ activeEnvironment.name }}</span>
          <span class="mx-1 text-slate-500">|</span>
          <span data-testid="active-emotional-state" class="uppercase text-emerald-300">
            Estado: {{ activeRecord.runtime.emotionalState }}
          </span>
        </div>

        <!-- Stage & Animation Quick Controls on Viewport Bottom -->
        <div
          class="absolute bottom-2 inset-x-2 z-20 flex flex-wrap items-center justify-between gap-1 bg-slate-950/90 border border-slate-800 px-2 py-1"
        >
          <div class="flex items-center gap-1">
            <button
              v-for="st in (['ovo', 'baby', 'crianca', 'pre-adolescente', 'adolescente', 'adulto'] as const)"
              :key="st"
              type="button"
              :data-testid="`stage-btn-${st}`"
              class="px-1.5 py-0.5 text-[10px] font-bold uppercase border"
              :class="
                displayedStage === st
                  ? 'bg-indigo-600 text-white border-indigo-400'
                  : 'bg-slate-900 text-slate-400 border-slate-700'
              "
              @click="manualStageOverride = st"
            >
              {{ st === 'pre-adolescente' ? 'jovem' : st === 'adolescente' ? 'adolesc' : st }}
            </button>
          </div>

          <div class="flex items-center gap-1">
            <button
              v-for="anim in (['idle', 'comendo', 'amando', 'doente', 'morte'] as const)"
              :key="anim"
              type="button"
              :data-testid="`anim-btn-${anim}`"
              class="px-1.5 py-0.5 text-[10px] font-bold uppercase border"
              :class="
                displayedAnimation === anim
                  ? 'bg-amber-500 text-slate-950 border-amber-300'
                  : 'bg-slate-900 text-slate-400 border-slate-700'
              "
              @click="manualAnimOverride = anim"
            >
              {{ anim }}
            </button>
          </div>
        </div>
      </section>

      <!-- Feedback Banner & Emergency Actions -->
      <div
        data-testid="feedback-banner"
        class="px-3 py-2 bg-slate-950 border-b border-slate-800 text-xs text-amber-200 flex items-center justify-between gap-2"
      >
        <span>{{ feedbackBanner }}</span>
        <button
          v-if="activeRecord.runtime.healthCondition === 'deceased' || displayedAnimation === 'morte'"
          type="button"
          data-testid="revive-creature-btn"
          class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase text-[11px] shrink-0"
          @click="handleReviveCharacter"
        >
          Reviver
        </button>
        <button
          v-else-if="activeRecord.runtime.currentStage === 'ovo'"
          type="button"
          data-testid="hatch-egg-btn"
          class="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold uppercase text-[11px] shrink-0"
          @click="handleHatchEgg"
        >
          Eclodir Ovo
        </button>
      </div>

      <!-- 6 Normalized Need Bars (0 to 100) -->
      <section
        aria-label="Indicadores de Necessidades"
        class="p-3 bg-slate-900 border-b-2 border-slate-800 grid grid-cols-3 gap-2"
      >
        <div
          v-for="need in needBars"
          :key="need.key"
          :data-testid="`need-bar-${need.key}`"
          class="bg-slate-950 border border-slate-800 p-1.5"
        >
          <div class="flex items-center justify-between text-[11px] font-semibold mb-1">
            <span class="text-slate-300">{{ need.label }}</span>
            <span :class="need.value <= 20 ? 'text-rose-400 font-bold' : 'text-slate-200'">
              {{ need.value }}%
            </span>
          </div>
          <div class="w-full h-2 bg-slate-800 overflow-hidden">
            <div
              class="h-full transition-all duration-300"
              :class="need.value <= 20 ? 'bg-rose-600' : need.color"
              :style="{ width: `${need.value}%` }"
            />
          </div>
        </div>
      </section>

      <!-- Main Tab Content Area -->
      <main class="flex-1 overflow-y-auto p-3 space-y-3">
        <!-- TAB 1: ALIMENTAÇÃO E CUIDADOS -->
        <div v-if="activeMobileTab === 'feed'" data-testid="tab-content-feed" class="space-y-2.5">
          <div class="flex items-center justify-between">
            <h2 class="text-xs font-bold uppercase tracking-wider text-slate-300">
              Dieta Individual de {{ activeSpecies.displayName }}
            </h2>
            <span class="text-[11px] text-slate-400">
              Favorito: {{ activeSpecies.favoriteFoodIds[0] }}
            </span>
          </div>

          <div class="space-y-2">
            <div
              v-for="food in allFoods"
              :key="food.id"
              :data-testid="`food-card-${food.id}`"
              class="p-2.5 bg-slate-950 border border-slate-800 flex items-center justify-between gap-2"
            >
              <div class="flex items-center gap-2.5">
                <!-- Pixel Art Color Swatch Icon -->
                <div
                  class="w-9 h-9 border-2 border-slate-700 shrink-0 grid grid-cols-2 grid-rows-2 p-0.5"
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
                      v-if="evaluateDietaryPreference(activeSpecies, food.id) === 'favorite'"
                      class="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-amber-500/20 border border-amber-500 text-amber-300"
                    >
                      ★ Favorito
                    </span>
                    <span
                      v-else-if="evaluateDietaryPreference(activeSpecies, food.id) === 'forbidden'"
                      class="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-rose-950 border border-rose-700 text-rose-300"
                    >
                      ✕ Proibido
                    </span>
                    <span
                      v-else
                      class="px-1.5 py-0.5 text-[10px] uppercase bg-slate-800 text-slate-300"
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
                  class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase"
                  @click="handleFeedCharacter(food.id)"
                >
                  Dar
                </button>
                <button
                  type="button"
                  :data-testid="`buy-food-btn-${food.id}`"
                  class="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 text-[10px] font-bold"
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
          <h2 class="text-xs font-bold uppercase tracking-wider text-slate-300">
            Atividades, Treinos e Higiene
          </h2>

          <div class="space-y-2">
            <div
              v-for="act in allActivities"
              :key="act.id"
              :data-testid="`activity-card-${act.id}`"
              class="p-2.5 bg-slate-950 border border-slate-800 flex items-center justify-between gap-2"
            >
              <div>
                <div class="flex items-center gap-1.5">
                  <span class="text-xs font-bold text-slate-100">{{ act.name }}</span>
                  <span
                    v-if="activeSpecies.personality.favoriteActivityId === act.id"
                    class="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-amber-500/20 border border-amber-500 text-amber-300"
                  >
                    ★ Favorita
                  </span>
                </div>
                <p class="text-[11px] text-slate-400">{{ act.description }}</p>
                <p class="text-[10px] text-cyan-300 mt-0.5">
                  Energia mín: {{ act.minEnergyRequired }} · Recompensa: +{{ act.experienceReward }} XP / +{{ act.coinReward }} Moedas
                </p>
              </div>

              <button
                type="button"
                :data-testid="`activity-btn-${act.id}`"
                class="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase shrink-0"
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
          <div class="p-3 bg-slate-950 border border-slate-800 space-y-1.5">
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-bold uppercase text-amber-400">
                Ficha Oficial — {{ activeSpecies.displayName }}
              </h2>
              <span class="text-xs font-bold text-cyan-300">
                Poder Total: {{ totalPower }}
              </span>
            </div>
            <p class="text-xs text-slate-300">{{ activeSpecies.description }}</p>
            <p class="text-[11px] text-slate-400 italic">{{ activeSpecies.lore }}</p>

            <div class="grid grid-cols-2 gap-2 pt-2 text-xs">
              <div class="bg-slate-900 p-2 border border-slate-800">
                <span class="text-slate-400 block text-[10px] uppercase">Espécie</span>
                <strong>{{ activeSpecies.species }}</strong>
              </div>
              <div class="bg-slate-900 p-2 border border-slate-800">
                <span class="text-slate-400 block text-[10px] uppercase">Idade / Fase</span>
                <strong>{{ activeRecord.runtime.ageHours }}h · {{ activeRecord.runtime.currentStage }}</strong>
              </div>
              <div class="bg-slate-900 p-2 border border-slate-800">
                <span class="text-slate-400 block text-[10px] uppercase">Personalidade</span>
                <strong>{{ activeSpecies.personality.archetype }}</strong>
              </div>
              <div class="bg-slate-900 p-2 border border-slate-800">
                <span class="text-slate-400 block text-[10px] uppercase">Experiência (XP)</span>
                <strong>
                  Nv. {{ activeRecord.progression.level }} ({{ activeRecord.progression.currentXp }}/{{ activeRecord.progression.nextLevelXp }})
                </strong>
              </div>
            </div>
          </div>

          <!-- Permanent / Evolutionary Attributes -->
          <div class="p-3 bg-slate-950 border border-slate-800 space-y-2">
            <h3 class="text-xs font-bold uppercase text-slate-300">
              Atributos Permanentes e Evolutivos
            </h3>
            <div class="grid grid-cols-2 gap-2">
              <div
                v-for="attr in attributeEntries"
                :key="attr.label"
                class="p-2 bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
              >
                <span class="text-slate-400">{{ attr.label }}</span>
                <strong class="text-amber-300">{{ attr.value }}</strong>
              </div>
            </div>
          </div>

          <!-- Care History Log -->
          <div class="p-3 bg-slate-950 border border-slate-800 space-y-2">
            <h3 class="text-xs font-bold uppercase text-slate-300">
              Histórico Recente de Cuidados
            </h3>
            <ul class="space-y-1 max-h-36 overflow-y-auto text-[11px] text-slate-300">
              <li
                v-for="entry in activeRecord.runtime.careHistory"
                :key="entry.id"
                class="p-1.5 bg-slate-900 border border-slate-800 flex items-center justify-between gap-2"
              >
                <span>{{ entry.summary }}</span>
                <span class="text-[10px] text-slate-500 uppercase">{{ entry.actionType }}</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- TAB 4: SELEÇÃO DE PERSONAGENS (CATÁLOGO COMPLETO) -->
        <div
          v-else-if="activeMobileTab === 'roster'"
          data-testid="tab-content-roster"
          class="space-y-2.5"
        >
          <h2 class="text-xs font-bold uppercase tracking-wider text-slate-300">
            Santuário Elemental — 8 Espécies Canônicas
          </h2>
          <div class="grid grid-cols-1 gap-2">
            <div
              v-for="species in allSpecies"
              :key="species.id"
              :data-testid="`roster-card-${species.id}`"
              class="p-3 bg-slate-950 border flex items-center justify-between gap-3"
              :class="
                species.id === activeCharacterId
                  ? 'border-amber-400 bg-slate-900'
                  : 'border-slate-800'
              "
            >
              <div class="space-y-0.5">
                <div class="flex items-center gap-2">
                  <span
                    class="w-3 h-3 inline-block border border-white/40"
                    :style="{ backgroundColor: species.visualTraits.primaryColors.base }"
                  />
                  <strong class="text-xs uppercase text-amber-300">{{ species.displayName }}</strong>
                  <span class="text-[10px] text-slate-400">({{ species.scientificName }})</span>
                </div>
                <p class="text-[11px] text-slate-300">{{ species.species }}</p>
                <p class="text-[10px] text-cyan-300">
                  Elemento: {{ species.elementLabel }} · Fase: {{ saveState.characters[species.id].runtime.currentStage }}
                </p>
              </div>

              <button
                type="button"
                :data-testid="`roster-select-${species.id}`"
                class="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold uppercase shrink-0"
                @click="handleSelectCharacter(species.id)"
              >
                Selecionar
              </button>
            </div>
          </div>
        </div>

        <!-- TAB 5: CONFIGURAÇÕES, SIMULAÇÃO OFFLINE E GERADOR LLM -->
        <div
          v-else-if="activeMobileTab === 'settings'"
          data-testid="tab-content-settings"
          class="space-y-3"
        >
          <div class="p-3 bg-slate-950 border border-slate-800 space-y-2">
            <h2 class="text-xs font-bold uppercase text-slate-300 flex items-center gap-1.5">
              <clock-icon class="w-3.5 h-3.5 text-amber-400" />
              Simulador de Passagem de Tempo Offline
            </h2>
            <p class="text-[11px] text-slate-400">
              Teste deterministicamente o cálculo de tempo decorrido com o app fechado:
            </p>
            <div class="flex items-center gap-2">
              <button
                type="button"
                data-testid="sim-offline-1h"
                class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold"
                @click="handleSimulateOfflineHours(1)"
              >
                +1 Hora
              </button>
              <button
                type="button"
                data-testid="sim-offline-6h"
                class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold"
                @click="handleSimulateOfflineHours(6)"
              >
                +6 Horas
              </button>
              <button
                type="button"
                data-testid="sim-offline-24h"
                class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold"
                @click="handleSimulateOfflineHours(24)"
              >
                +24 Horas
              </button>
            </div>
          </div>

          <div class="p-3 bg-slate-950 border border-slate-800 space-y-2">
            <h2 class="text-xs font-bold uppercase text-slate-300">
              Desempenho Android & Partículas Babylon.js
            </h2>
            <div class="flex items-center gap-2">
              <button
                v-for="q in (['high', 'balanced', 'battery-saver'] as const)"
                :key="q"
                type="button"
                :data-testid="`quality-btn-${q}`"
                class="px-2.5 py-1.5 text-xs font-bold uppercase border"
                :class="
                  saveState.settings.graphicsQuality === q
                    ? 'bg-amber-500 text-slate-950 border-amber-300'
                    : 'bg-slate-900 text-slate-300 border-slate-700'
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
                class="px-2.5 py-1 bg-slate-800 border border-slate-600 text-xs font-bold"
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
              class="px-3 py-1.5 bg-rose-950 hover:bg-rose-900 border border-rose-700 text-rose-200 text-xs font-bold uppercase flex items-center gap-1"
              @click="handleResetSave"
            >
              <rotate-ccw-icon class="w-3.5 h-3.5" />
              Resetar Save
            </button>
          </div>
        </div>
      </main>

      <!-- Bottom Mobile Navigation Bar -->
      <nav
        aria-label="Menu principal do jogo"
        class="grid grid-cols-5 bg-slate-950 border-t-2 border-slate-800"
      >
        <button
          type="button"
          data-testid="nav-tab-feed"
          class="py-2.5 flex flex-col items-center justify-center gap-1 text-[11px] font-bold uppercase"
          :class="activeMobileTab === 'feed' ? 'text-amber-400 bg-slate-900' : 'text-slate-400'"
          @click="activeMobileTab = 'feed'"
        >
          <utensils-icon class="w-4 h-4" />
          <span>Alimentar</span>
        </button>

        <button
          type="button"
          data-testid="nav-tab-activities"
          class="py-2.5 flex flex-col items-center justify-center gap-1 text-[11px] font-bold uppercase"
          :class="activeMobileTab === 'activities' ? 'text-amber-400 bg-slate-900' : 'text-slate-400'"
          @click="activeMobileTab = 'activities'"
        >
          <dumbbell-icon class="w-4 h-4" />
          <span>Cuidar</span>
        </button>

        <button
          type="button"
          data-testid="nav-tab-sheet"
          class="py-2.5 flex flex-col items-center justify-center gap-1 text-[11px] font-bold uppercase"
          :class="activeMobileTab === 'sheet' ? 'text-amber-400 bg-slate-900' : 'text-slate-400'"
          @click="activeMobileTab = 'sheet'"
        >
          <file-text-icon class="w-4 h-4" />
          <span>Ficha</span>
        </button>

        <button
          type="button"
          data-testid="nav-tab-roster"
          class="py-2.5 flex flex-col items-center justify-center gap-1 text-[11px] font-bold uppercase"
          :class="activeMobileTab === 'roster' ? 'text-amber-400 bg-slate-900' : 'text-slate-400'"
          @click="activeMobileTab = 'roster'"
        >
          <users-icon class="w-4 h-4" />
          <span>Dinos</span>
        </button>

        <button
          type="button"
          data-testid="nav-tab-settings"
          class="py-2.5 flex flex-col items-center justify-center gap-1 text-[11px] font-bold uppercase"
          :class="activeMobileTab === 'settings' ? 'text-amber-400 bg-slate-900' : 'text-slate-400'"
          @click="activeMobileTab = 'settings'"
        >
          <settings-icon class="w-4 h-4" />
          <span>Ajustes</span>
        </button>
      </nav>
    </div>
  </div>
</template>
