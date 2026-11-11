<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import {
  Pause as PauseIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Grid as GridIcon,
  Layers as LayersIcon,
  Palette as PaletteIcon,
  Eye as EyeIcon,
  EyeOff as EyeOffIcon,
  Sparkles as SparklesIcon,
  Activity as ActivityIcon,
  Film as FilmIcon,
  Play as PlayIcon,
  Utensils as UtensilsIcon,
  Heart as HeartIcon,
  Thermometer as ThermometerIcon,
  Skull as SkullIcon
} from 'lucide-vue-next';
import { APP_CONFIG, resolveOutputDimensions } from '@/shared/constants/app-config';
import { PRESETS, type PresetItem } from '@/shared/constants/presets';
import { Canvas2dRenderer } from '@/infrastructure/renderer/canvas-2d-renderer';
import { validatePixelArt } from '@/core/domain/validation/pixel-art-schema';
import type {
  DeclarativePixelArt,
  UpscalingAlgorithm
} from '@/core/domain/pixel-art/interfaces';
import type { AnimationMode } from './interfaces';

const renderer = new Canvas2dRenderer();
const canvasRef = ref<HTMLCanvasElement | null>(null);
const compareOriginalCanvasRef = ref<HTMLCanvasElement | null>(null);
const compareNnCanvasRef = ref<HTMLCanvasElement | null>(null);
const compareSmartCanvasRef = ref<HTMLCanvasElement | null>(null);

const currentArt = ref<DeclarativePixelArt>(JSON.parse(JSON.stringify(PRESETS[0].data)) as DeclarativePixelArt);
const selectedPresetId = ref<string>(PRESETS[0].id);
const zoomLevel = ref<number>(APP_CONFIG.rendering.surfaceScales.studioPreview);
const upscalingAlgorithm = ref<UpscalingAlgorithm>(APP_CONFIG.rendering.upscalingAlgorithm);
const detailEnhancementEnabled = ref<boolean>(APP_CONFIG.rendering.detailEnhancement.enabled);
const compareMode = ref<boolean>(false);
const showGrid = ref<boolean>(false);
const animationMode = ref<AnimationMode>('none');
const animationSpeedMs = ref<number>(500);
const activeTab = ref<'layers' | 'palette' | 'info'>('layers');
const errorMessage = ref<string | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

let animInterval: ReturnType<typeof setInterval> | null = null;
let currentFrameIndex = 0;

const studioScaleChoices = [2, 3, 4, 6, 8, 16] as const;
const outputDims = computed(() =>
  resolveOutputDimensions(currentArt.value.logicalDimensions, zoomLevel.value)
);
const displayWidth = computed(() => outputDims.value.width);
const displayHeight = computed(() => outputDims.value.height);
const pngExportDims = computed(() =>
  resolveOutputDimensions(
    currentArt.value.logicalDimensions,
    APP_CONFIG.rendering.surfaceScales.pngExport
  )
);
const compareSmartAlgorithm = computed<UpscalingAlgorithm>(() =>
  upscalingAlgorithm.value === 'nearest-neighbor' ? 'intelligent' : upscalingAlgorithm.value
);

const paletteEntries = computed(() => {
  return Object.entries(currentArt.value.palette).filter(([key]) => key !== 'transparent');
});

function draw(): void {
  if (compareMode.value) {
    if (compareOriginalCanvasRef.value) {
      renderer.renderToCanvas(
        compareOriginalCanvasRef.value,
        currentArt.value,
        currentArt.value.logicalDimensions.width,
        currentArt.value.logicalDimensions.height,
        showGrid.value,
        { algorithm: 'nearest-neighbor', detailEnhancement: { enabled: false } }
      );
    }
    if (compareNnCanvasRef.value) {
      renderer.renderToCanvas(
        compareNnCanvasRef.value,
        currentArt.value,
        displayWidth.value,
        displayHeight.value,
        showGrid.value,
        { algorithm: 'nearest-neighbor', detailEnhancement: { enabled: false } }
      );
    }
    if (compareSmartCanvasRef.value) {
      renderer.renderToCanvas(
        compareSmartCanvasRef.value,
        currentArt.value,
        displayWidth.value,
        displayHeight.value,
        showGrid.value,
        {
          algorithm: compareSmartAlgorithm.value,
          detailEnhancement: { enabled: detailEnhancementEnabled.value }
        }
      );
    }
    return;
  }

  if (!canvasRef.value) return;
  renderer.renderToCanvas(
    canvasRef.value,
    currentArt.value,
    displayWidth.value,
    displayHeight.value,
    showGrid.value,
    {
      algorithm: upscalingAlgorithm.value,
      detailEnhancement: { enabled: detailEnhancementEnabled.value }
    }
  );
}

function selectPreset(presetId: string): void {
  const found = PRESETS.find((p) => p.id === presetId);
  if (!found) return;
  selectedPresetId.value = presetId;
  const creature = found.data.metadata?.creatureName;
  if (creature && creature !== selectedCreature.value) {
    selectedCreature.value = creature;
  }
  currentArt.value = JSON.parse(JSON.stringify(found.data)) as DeclarativePixelArt;
  errorMessage.value = null;
  draw();
}

const availableCreatures = computed(() => {
  const set = new Set<string>();
  for (const preset of PRESETS) {
    const creature = preset.data.metadata?.creatureName;
    if (creature) set.add(creature);
  }
  return Array.from(set);
});

const selectedCreature = ref<string>(
  PRESETS[0]?.data.metadata?.creatureName || 'Ignisauro'
);

const visiblePresets = computed(() => {
  return PRESETS.filter(
    (p) => p.data.metadata?.creatureName === selectedCreature.value
  );
});

function selectCreature(creature: string): void {
  selectedCreature.value = creature;
  const firstForCreature = PRESETS.find(
    (p) => p.data.metadata?.creatureName === creature
  );
  if (firstForCreature) {
    selectPreset(firstForCreature.id);
  }
}

function toggleGrid(): void {
  showGrid.value = !showGrid.value;
  draw();
}

function setZoom(newZoom: number): void {
  zoomLevel.value = Math.max(2, Math.min(32, newZoom));
  draw();
}

function toggleDetailEnhancement(): void {
  detailEnhancementEnabled.value = !detailEnhancementEnabled.value;
}

function toggleCompareMode(): void {
  compareMode.value = !compareMode.value;
}

function stopAnimation(): void {
  if (animInterval) {
    clearInterval(animInterval);
    animInterval = null;
  }
  animationMode.value = 'none';
}

function getCurrentCreatureLifecycleFrames(): readonly PresetItem[] {
  const currentItem = PRESETS.find((p) => p.id === selectedPresetId.value);
  const creature = currentItem?.data.metadata?.creatureName;
  const creaturePresets = PRESETS.filter(
    (p) =>
      p.data.metadata?.creatureName === creature &&
      (p.data.metadata?.animation === 'eclosao' || p.data.metadata?.animation === 'idle')
  );
  if (creaturePresets.length > 0) return creaturePresets;
  return PRESETS;
}

function getCurrentCreatureHatchFrames(): readonly PresetItem[] {
  const currentItem = PRESETS.find((p) => p.id === selectedPresetId.value);
  const creature = currentItem?.data.metadata?.creatureName;
  const hatchPresets = PRESETS.filter(
    (p) =>
      p.data.metadata?.creatureName === creature &&
      p.data.metadata?.lifeStage === 'ovo' &&
      p.data.metadata?.animation === 'eclosao'
  ).sort((a, b) => (a.data.metadata?.frame ?? 0) - (b.data.metadata?.frame ?? 0));

  if (hatchPresets.length > 0) return hatchPresets;
  return PRESETS.slice(0, 4);
}

function getCurrentStageAnimationPair(
  targetAnimation: 'idle' | 'comendo' | 'amando' | 'doente' | 'morte'
): readonly [PresetItem, PresetItem] {
  const currentItem = PRESETS.find((p) => p.id === selectedPresetId.value);
  const creature = currentItem?.data.metadata?.creatureName ?? selectedCreature.value;
  const lifeStage = currentItem?.data.metadata?.lifeStage;
  const targetStage = !lifeStage || lifeStage === 'ovo' ? 'baby' : lifeStage;

  const stageAnimPresets = PRESETS.filter(
    (p) =>
      p.data.metadata?.creatureName === creature &&
      p.data.metadata?.lifeStage === targetStage &&
      p.data.metadata?.animation === targetAnimation
  ).sort((a, b) => (a.data.metadata?.frame ?? 0) - (b.data.metadata?.frame ?? 0));

  if (stageAnimPresets.length >= 2) {
    return [stageAnimPresets[0], stageAnimPresets[1]];
  }

  const anyAnimPresets = PRESETS.filter(
    (p) =>
      p.data.metadata?.creatureName === creature &&
      p.data.metadata?.animation === targetAnimation
  );
  if (anyAnimPresets.length >= 2) {
    return [anyAnimPresets[0], anyAnimPresets[1]];
  }

  return [PRESETS[0], PRESETS[1] || PRESETS[0]];
}

const currentStageShortName = computed(() => {
  const currentItem = PRESETS.find((p) => p.id === selectedPresetId.value);
  const stage = currentItem?.data.metadata?.lifeStage;
  if (!stage || stage === 'ovo' || stage === 'baby') return 'Filhote';
  if (stage === 'crianca') return 'Criança';
  if (stage === 'pre-adolescente') return 'Pré-Ado';
  if (stage === 'adolescente') return 'Adolescente';
  if (stage === 'adulto') return 'Adulto';
  return stage;
});

const currentStageIdleLabel = computed(() => `Idle ${currentStageShortName.value}`);

function startAnimation(mode: AnimationMode): void {
  stopAnimation();
  animationMode.value = mode;

  if (mode === 'lifecycle') {
    const lifecycleFrames = getCurrentCreatureLifecycleFrames();
    currentFrameIndex = lifecycleFrames.findIndex((p) => p.id === selectedPresetId.value);
    if (currentFrameIndex === -1) currentFrameIndex = 0;

    animInterval = setInterval(() => {
      currentFrameIndex = (currentFrameIndex + 1) % lifecycleFrames.length;
      selectPreset(lifecycleFrames[currentFrameIndex].id);
    }, animationSpeedMs.value);
  } else if (mode === 'hatching') {
    const hatchPresets = getCurrentCreatureHatchFrames();
    let hatchIndex = hatchPresets.findIndex((p) => p.id === selectedPresetId.value);
    if (hatchIndex === -1) hatchIndex = 0;

    animInterval = setInterval(() => {
      hatchIndex = (hatchIndex + 1) % hatchPresets.length;
      selectPreset(hatchPresets[hatchIndex].id);
    }, animationSpeedMs.value);
  } else if (
    mode === 'idle' ||
    mode === 'comendo' ||
    mode === 'amando' ||
    mode === 'doente' ||
    mode === 'morte'
  ) {
    const pairPresets = getCurrentStageAnimationPair(mode);
    let pairIndex = selectedPresetId.value === pairPresets[1].id ? 1 : 0;
    selectPreset(pairPresets[pairIndex].id);

    animInterval = setInterval(() => {
      pairIndex = (pairIndex + 1) % pairPresets.length;
      selectPreset(pairPresets[pairIndex].id);
    }, Math.max(250, Math.round(animationSpeedMs.value * 0.75)));
  }
}

function setAnimationSpeed(speed: number): void {
  animationSpeedMs.value = speed;
  if (animationMode.value !== 'none') {
    const currentMode = animationMode.value;
    startAnimation(currentMode);
  }
}

function toggleLayer(layerId: string): void {
  const layer = currentArt.value.layers.find((l) => l.id === layerId);
  if (!layer) return;
  layer.visible = !layer.visible;
  draw();
}

function updateLayerOpacity(layerId: string, opacity: number): void {
  const layer = currentArt.value.layers.find((l) => l.id === layerId);
  if (!layer) return;
  layer.opacity = opacity;
  draw();
}

async function exportPng(): Promise<void> {
  try {
    const blob = await renderer.exportPngBlob(
      currentArt.value,
      pngExportDims.value.width,
      pngExportDims.value.height,
      {
        algorithm: upscalingAlgorithm.value,
        detailEnhancement: { enabled: detailEnhancementEnabled.value }
      }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentArt.value.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${pngExportDims.value.width}x${pngExportDims.value.height}.png`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err: unknown) {
    if (err instanceof Error) {
      errorMessage.value = err.message;
    }
  }
}

function exportJson(): void {
  const jsonStr = JSON.stringify(currentArt.value, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${currentArt.value.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function triggerImport(): void {
  if (fileInputRef.value) {
    fileInputRef.value.click();
  }
}

async function handleFileSelected(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text) as unknown;
    const validated = validatePixelArt(parsed);
    stopAnimation();
    currentArt.value = validated;
    selectedPresetId.value = '';
    errorMessage.value = null;
    draw();
  } catch (err: unknown) {
    if (err instanceof Error) {
      errorMessage.value = `Erro de validação: ${err.message}`;
    }
  } finally {
    target.value = '';
  }
}

watch(
  [displayWidth, displayHeight, showGrid, upscalingAlgorithm, detailEnhancementEnabled, compareMode],
  () => {
    void nextTick().then(draw);
  }
);

onMounted(() => {
  draw();
});

onUnmounted(() => {
  if (animInterval) {
    clearInterval(animInterval);
  }
  renderer.clearCaches();
});
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
    <header class="border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20 flex-shrink-0">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-sm">
          <sparkles-icon class="w-4 h-4" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-sm font-bold tracking-tight text-white">{{ APP_CONFIG.appName }}</h1>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">v{{ APP_CONFIG.version }}</span>
          </div>
          <p class="text-[11px] text-slate-400">{{ APP_CONFIG.appSubtitle }}</p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <div class="flex items-center bg-slate-800/80 p-1 rounded-lg border border-slate-700 gap-1">
          <button
            class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer"
            :class="animationMode === 'lifecycle' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'"
            title="Animar ciclo vital completo (12 quadros)"
            @click="animationMode === 'lifecycle' ? stopAnimation() : startAnimation('lifecycle')"
          >
            <pause-icon v-if="animationMode === 'lifecycle'" class="w-3.5 h-3.5" />
            <film-icon v-else class="w-3.5 h-3.5" />
            <span>{{ animationMode === 'lifecycle' ? 'Pausar Ciclo' : 'Ciclo Vital (1-12)' }}</span>
          </button>

          <button
            class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer"
            :class="animationMode === 'hatching' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'"
            title="Animar eclosão do ovo (4 quadros)"
            @click="animationMode === 'hatching' ? stopAnimation() : startAnimation('hatching')"
          >
            <pause-icon v-if="animationMode === 'hatching'" class="w-3.5 h-3.5" />
            <play-icon v-else class="w-3.5 h-3.5" />
            <span>{{ animationMode === 'hatching' ? 'Pausar Eclosão' : 'Eclosão (1-4)' }}</span>
          </button>

          <button
            class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer"
            :class="animationMode === 'idle' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'"
            :title="`Animar idle da fase ativa (${currentStageIdleLabel})`"
            @click="animationMode === 'idle' ? stopAnimation() : startAnimation('idle')"
          >
            <pause-icon v-if="animationMode === 'idle'" class="w-3.5 h-3.5" />
            <activity-icon v-else class="w-3.5 h-3.5" />
            <span>{{ animationMode === 'idle' ? 'Pausar Idle' : currentStageIdleLabel }}</span>
          </button>

          <button
            class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer"
            :class="animationMode === 'comendo' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'"
            :title="`Animar ${currentStageShortName} comendo (2 quadros)`"
            @click="animationMode === 'comendo' ? stopAnimation() : startAnimation('comendo')"
          >
            <pause-icon v-if="animationMode === 'comendo'" class="w-3.5 h-3.5" />
            <utensils-icon v-else class="w-3.5 h-3.5" />
            <span>{{ animationMode === 'comendo' ? 'Pausar Comendo' : `Comendo (${currentStageShortName})` }}</span>
          </button>

          <button
            class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer"
            :class="animationMode === 'amando' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'"
            :title="`Animar ${currentStageShortName} amando (2 quadros)`"
            @click="animationMode === 'amando' ? stopAnimation() : startAnimation('amando')"
          >
            <pause-icon v-if="animationMode === 'amando'" class="w-3.5 h-3.5" />
            <heart-icon v-else class="w-3.5 h-3.5" />
            <span>{{ animationMode === 'amando' ? 'Pausar Amando' : `Amando (${currentStageShortName})` }}</span>
          </button>

          <button
            class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer"
            :class="animationMode === 'doente' ? 'bg-lime-700 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'"
            :title="`Animar ${currentStageShortName} doente (2 quadros)`"
            @click="animationMode === 'doente' ? stopAnimation() : startAnimation('doente')"
          >
            <pause-icon v-if="animationMode === 'doente'" class="w-3.5 h-3.5" />
            <thermometer-icon v-else class="w-3.5 h-3.5" />
            <span>{{ animationMode === 'doente' ? 'Pausar Doente' : `Doente (${currentStageShortName})` }}</span>
          </button>

          <button
            class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer"
            :class="animationMode === 'morte' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'"
            title="Animar memorial de morte com cruz de pedra e espírito ascendente (2 quadros)"
            @click="animationMode === 'morte' ? stopAnimation() : startAnimation('morte')"
          >
            <pause-icon v-if="animationMode === 'morte'" class="w-3.5 h-3.5" />
            <skull-icon v-else class="w-3.5 h-3.5" />
            <span>{{ animationMode === 'morte' ? 'Pausar Morte' : 'Morte' }}</span>
          </button>
        </div>

        <div class="flex items-center bg-slate-800/80 rounded-lg border border-slate-700 p-1">
          <button
            v-for="speed in [250, 500, 800]"
            :key="speed"
            class="px-2 py-0.5 rounded text-[10px] font-mono transition cursor-pointer"
            :class="animationSpeedMs === speed ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-slate-200'"
            @click="setAnimationSpeed(speed)"
          >
            {{ speed }}ms
          </button>
        </div>

        <div class="h-5 w-[1px] bg-slate-800 mx-1 hidden sm:block"></div>

        <input
          ref="fileInputRef"
          type="file"
          accept=".json,application/json"
          class="hidden"
          @change="handleFileSelected"
        />

        <button
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
          @click="triggerImport"
        >
          <upload-icon class="w-3.5 h-3.5" />
          <span>Importar</span>
        </button>

        <button
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
          @click="exportJson"
        >
          <download-icon class="w-3.5 h-3.5" />
          <span>JSON</span>
        </button>

        <button
          class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
          @click="exportPng"
        >
          <download-icon class="w-3.5 h-3.5" />
          <span>PNG Transparente ({{ pngExportDims.width }}×{{ pngExportDims.height }})</span>
        </button>
      </div>
    </header>

    <div class="bg-slate-900 border-b border-slate-800 px-6 py-2 overflow-x-auto flex-shrink-0">
      <div class="flex items-center gap-3 min-w-max">
        <div class="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
          <button
            v-for="creature in availableCreatures"
            :key="creature"
            class="px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer"
            :class="selectedCreature === creature ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'"
            @click="stopAnimation(); selectCreature(creature)"
          >
            {{ creature }}
          </button>
        </div>

        <div class="h-4 w-[1px] bg-slate-800"></div>

        <div class="flex items-center gap-1.5">
          <button
            v-for="preset in visiblePresets"
            :key="preset.id"
            class="px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer border"
            :class="selectedPresetId === preset.id ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 font-semibold shadow-sm' : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-white hover:border-slate-700'"
            @click="stopAnimation(); selectPreset(preset.id)"
          >
            {{ preset.shortLabel }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="errorMessage" class="bg-rose-950/80 border-b border-rose-800 text-rose-200 px-6 py-2.5 text-xs flex items-center justify-between flex-shrink-0">
      <span>{{ errorMessage }}</span>
      <button class="text-rose-400 hover:text-rose-200 font-bold ml-4" @click="errorMessage = null">✕</button>
    </div>

    <div class="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
      <main class="flex-1 min-h-0 flex flex-col bg-slate-950 overflow-hidden relative">
        <div class="p-3 px-6 border-b border-slate-850 flex flex-wrap items-center justify-between gap-3 bg-slate-900/40 flex-shrink-0">
          <div class="flex flex-wrap items-center gap-4 text-xs">
            <span class="text-slate-400">Lógica: <strong class="text-slate-200 font-mono">{{ currentArt.logicalDimensions.width }}×{{ currentArt.logicalDimensions.height }}</strong></span>
            <span class="text-slate-400">Saída: <strong class="text-cyan-300 font-mono">{{ displayWidth }}×{{ displayHeight }}</strong></span>
            <span class="text-slate-400">Fundo: <strong class="text-emerald-400 font-mono">Transparente (Alpha 0)</strong></span>
            <span class="text-slate-400">Escala: <strong class="text-emerald-400 font-mono">{{ zoomLevel }}x</strong></span>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <select
              v-model="upscalingAlgorithm"
              data-testid="studio-algorithm-select"
              aria-label="Algoritmo de Super-Resolution"
              class="px-2 py-1 rounded text-xs font-medium bg-slate-800 border border-slate-700 text-slate-200 cursor-pointer"
            >
              <option value="nearest-neighbor">Nearest-Neighbor</option>
              <option value="scale2x">Scale2x (EPX)</option>
              <option value="scale3x">Scale3x</option>
              <option value="intelligent">Inteligente (Adaptativo)</option>
            </select>

            <button
              data-testid="studio-enhance-btn"
              class="px-2.5 py-1 rounded text-xs font-medium border transition cursor-pointer"
              :class="detailEnhancementEnabled ? 'bg-amber-600/30 border-amber-500 text-amber-200' : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'"
              @click="toggleDetailEnhancement"
            >
              Refinar Detalhes
            </button>

            <button
              data-testid="studio-compare-btn"
              class="px-2.5 py-1 rounded text-xs font-medium border transition cursor-pointer"
              :class="compareMode ? 'bg-indigo-600/40 border-indigo-400 text-indigo-200' : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'"
              @click="toggleCompareMode"
            >
              Comparar
            </button>

            <button
              class="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border transition cursor-pointer"
              :class="showGrid ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'"
              @click="toggleGrid"
            >
              <grid-icon class="w-3 h-3" />
              <span>Grade</span>
            </button>

            <div class="flex items-center bg-slate-800 rounded border border-slate-700 p-0.5">
              <button
                v-for="zoom in studioScaleChoices"
                :key="zoom"
                :data-testid="`studio-scale-btn-${zoom}`"
                class="px-2 py-0.5 rounded text-[11px] font-mono transition cursor-pointer"
                :class="zoomLevel === zoom ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'"
                @click="setZoom(zoom)"
              >
                {{ zoom }}x
              </button>
            </div>
          </div>
        </div>

        <div class="flex-1 min-h-0 flex items-center justify-center p-4 sm:p-8 overflow-auto">
          <div
            v-if="compareMode"
            data-testid="studio-compare-grid"
            class="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl w-full"
          >
            <div class="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-col items-center gap-2">
              <span class="text-[11px] font-bold uppercase text-slate-300">
                Original ({{ currentArt.logicalDimensions.width }}×{{ currentArt.logicalDimensions.height }})
              </span>
              <div class="rounded overflow-hidden bg-checkerboard border border-white/10 p-2 flex items-center justify-center">
                <canvas
                  ref="compareOriginalCanvasRef"
                  data-testid="compare-original-canvas"
                  :width="currentArt.logicalDimensions.width"
                  :height="currentArt.logicalDimensions.height"
                  class="block w-48 h-48"
                  style="image-rendering: pixelated"
                ></canvas>
              </div>
            </div>

            <div class="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-col items-center gap-2">
              <span class="text-[11px] font-bold uppercase text-emerald-300">
                Nearest-Neighbor ({{ zoomLevel }}× · {{ displayWidth }}×{{ displayHeight }})
              </span>
              <div class="rounded overflow-hidden bg-checkerboard border border-white/10 p-2 flex items-center justify-center">
                <canvas
                  ref="compareNnCanvasRef"
                  data-testid="compare-nn-canvas"
                  :width="displayWidth"
                  :height="displayHeight"
                  class="block w-48 h-48"
                  style="image-rendering: pixelated"
                ></canvas>
              </div>
            </div>

            <div class="p-3 bg-slate-900/80 rounded-xl border border-indigo-700/70 flex flex-col items-center gap-2">
              <span class="text-[11px] font-bold uppercase text-indigo-300">
                {{ compareSmartAlgorithm }} ({{ zoomLevel }}×{{ detailEnhancementEnabled ? ' + Refino' : '' }})
              </span>
              <div class="rounded overflow-hidden bg-checkerboard border border-white/10 p-2 flex items-center justify-center">
                <canvas
                  ref="compareSmartCanvasRef"
                  data-testid="compare-smart-canvas"
                  :width="displayWidth"
                  :height="displayHeight"
                  class="block w-48 h-48"
                  style="image-rendering: pixelated"
                ></canvas>
              </div>
            </div>
          </div>

          <div v-else class="p-3 bg-slate-900/80 rounded-xl border border-slate-800 shadow-2xl relative flex-shrink-0">
            <div class="rounded overflow-hidden bg-checkerboard shadow-inner border border-white/5">
              <canvas
                ref="canvasRef"
                data-testid="studio-main-canvas"
                :width="displayWidth"
                :height="displayHeight"
                class="block cursor-crosshair"
                :style="{ width: `${displayWidth}px`, height: `${displayHeight}px`, imageRendering: 'pixelated' }"
              ></canvas>
            </div>
          </div>
        </div>
      </main>

      <aside class="w-full lg:w-96 flex-shrink-0 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900/60 flex flex-col h-full min-h-0 overflow-hidden">
        <div class="flex border-b border-slate-800 text-xs font-medium bg-slate-900">
          <button
            class="flex-1 py-3 px-4 border-b-2 transition flex items-center justify-center gap-2 cursor-pointer"
            :class="activeTab === 'layers' ? 'border-emerald-500 text-emerald-400 bg-slate-850/50' : 'border-transparent text-slate-400 hover:text-slate-200'"
            @click="activeTab = 'layers'"
          >
            <layers-icon class="w-3.5 h-3.5" />
            <span>Camadas ({{ currentArt.layers.length }})</span>
          </button>
          <button
            class="flex-1 py-3 px-4 border-b-2 transition flex items-center justify-center gap-2 cursor-pointer"
            :class="activeTab === 'palette' ? 'border-emerald-500 text-emerald-400 bg-slate-850/50' : 'border-transparent text-slate-400 hover:text-slate-200'"
            @click="activeTab = 'palette'"
          >
            <palette-icon class="w-3.5 h-3.5" />
            <span>Paleta ({{ paletteEntries.length }})</span>
          </button>
          <button
            class="flex-1 py-3 px-4 border-b-2 transition flex items-center justify-center gap-2 cursor-pointer"
            :class="activeTab === 'info' ? 'border-emerald-500 text-emerald-400 bg-slate-850/50' : 'border-transparent text-slate-400 hover:text-slate-200'"
            @click="activeTab = 'info'"
          >
            <span>Info</span>
          </button>
        </div>

        <div class="flex-1 p-5 overflow-y-auto text-xs">
          <div v-if="activeTab === 'layers'" class="space-y-3">
            <div
              v-for="layer in currentArt.layers"
              :key="layer.id"
              class="p-3 rounded-lg border border-slate-800 bg-slate-950/60 hover:border-slate-700 transition space-y-2"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <button
                    class="p-1 rounded text-slate-400 hover:text-white transition cursor-pointer"
                    @click="toggleLayer(layer.id)"
                  >
                    <eye-icon v-if="layer.visible" class="w-3.5 h-3.5 text-emerald-400" />
                    <eye-off-icon v-else class="w-3.5 h-3.5 text-slate-600" />
                  </button>
                  <span class="font-semibold text-slate-200" :class="{ 'line-through text-slate-500': !layer.visible }">
                    {{ layer.name }}
                  </span>
                </div>
                <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                  {{ layer.operations.length }} ops | z:{{ layer.zIndex }}
                </span>
              </div>

              <div class="flex items-center gap-3 pt-1">
                <span class="text-[11px] text-slate-400 w-14">Opacidade:</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  :value="layer.opacity"
                  class="flex-1 accent-emerald-500 h-1 bg-slate-800 rounded cursor-pointer"
                  @input="updateLayerOpacity(layer.id, parseFloat(($event.target as HTMLInputElement).value))"
                />
                <span class="text-[11px] font-mono text-slate-300 w-8 text-right">{{ Math.round(layer.opacity * 100) }}%</span>
              </div>
            </div>
          </div>

          <div v-else-if="activeTab === 'palette'" class="space-y-2">
            <div
              v-for="[colorKey, hexValue] in paletteEntries"
              :key="colorKey"
              class="flex items-center justify-between p-2.5 rounded-lg border border-slate-800 bg-slate-950/60"
            >
              <div class="flex items-center gap-3">
                <span
                  class="w-6 h-6 rounded-md border border-white/20 shadow-sm block"
                  :style="{ backgroundColor: hexValue }"
                ></span>
                <div>
                  <div class="font-medium text-slate-200">{{ colorKey }}</div>
                  <div class="font-mono text-[11px] text-slate-400">{{ hexValue }}</div>
                </div>
              </div>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                HEX
              </span>
            </div>
          </div>

          <div v-else-if="activeTab === 'info'" class="space-y-4">
            <div>
              <label class="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">Título</label>
              <div class="text-sm font-semibold text-slate-100">{{ currentArt.name }}</div>
            </div>

            <div>
              <label class="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">Descrição</label>
              <div class="text-xs text-slate-300 leading-relaxed">{{ currentArt.description }}</div>
            </div>

            <div class="grid grid-cols-2 gap-3 pt-2">
              <div class="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div class="text-[10px] text-slate-400">Versão do Formato</div>
                <div class="font-mono text-xs font-semibold text-slate-200 mt-0.5">{{ currentArt.version }}</div>
              </div>
              <div class="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div class="text-[10px] text-slate-400">Criado Por</div>
                <div class="font-mono text-xs font-semibold text-emerald-400 mt-0.5">{{ currentArt.metadata?.author || 'PixelForge' }}</div>
              </div>
            </div>

            <div v-if="currentArt.metadata?.tags?.length">
              <label class="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block mb-1.5">Tags</label>
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="tag in currentArt.metadata.tags"
                  :key="tag"
                  class="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-mono"
                >
                  #{{ tag }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
