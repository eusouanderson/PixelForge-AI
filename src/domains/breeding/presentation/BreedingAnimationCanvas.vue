<template>
  <div class="relative w-full max-w-lg mx-auto bg-slate-950 rounded-2xl border-2 border-indigo-900/50 shadow-2xl overflow-hidden flex flex-col items-center select-none font-sans">
    <!-- Top Scene Progress Header -->
    <div class="w-full bg-slate-900/90 border-b border-indigo-800/40 px-4 py-2.5 flex items-center justify-between text-xs">
      <div class="flex items-center gap-2">
        <span class="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
        <span class="font-bold uppercase tracking-wider text-indigo-300">
          Cena {{ currentSceneIndex + 1 }}/6: {{ currentSceneTitle }}
        </span>
      </div>
      <div class="flex items-center gap-1.5 text-slate-400">
        <span
          v-for="idx in 6"
          :key="idx"
          class="w-2 h-2 rounded-full transition-all duration-300"
          :class="idx - 1 === currentSceneIndex ? 'bg-indigo-400 w-4 shadow-sm' : idx - 1 < currentSceneIndex ? 'bg-indigo-700' : 'bg-slate-700'"
        ></span>
      </div>
    </div>

    <!-- Main Pixel Canvas Viewport -->
    <div class="relative w-full aspect-[4/3] bg-gradient-to-b from-slate-950 via-indigo-950/40 to-slate-950 flex items-center justify-center overflow-hidden">
      <canvas
        ref="canvasRef"
        :width="logicalWidth"
        :height="logicalHeight"
        class="w-full h-full object-contain pixelated"
        style="image-rendering: pixelated; image-rendering: -moz-crisp-edges; image-rendering: crisp-edges;"
      ></canvas>

      <!-- Overlay scene description banner -->
      <div class="absolute bottom-3 inset-x-4 bg-slate-900/80 backdrop-blur-sm border border-indigo-500/30 rounded-xl px-3 py-2 text-center text-xs text-indigo-200 pointer-events-none shadow-lg">
        {{ currentSceneDescription }}
      </div>
    </div>

    <!-- Scene Controls & Progression -->
    <div class="w-full bg-slate-900/95 border-t border-indigo-800/40 p-3 flex items-center justify-between gap-2">
      <button
        type="button"
        class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold disabled:opacity-40 transition-colors"
        :disabled="currentSceneIndex <= 0"
        @click="goToScene(currentSceneIndex - 1)"
      >
        ◀ Anterior
      </button>

      <button
        type="button"
        class="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
        @click="togglePlay"
      >
        <span>{{ isPlaying ? '⏸ Pausar' : '▶ Reproduzir' }}</span>
      </button>

      <button
        type="button"
        class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold disabled:opacity-40 transition-colors"
        :disabled="currentSceneIndex >= 5"
        @click="goToScene(currentSceneIndex + 1)"
      >
        Próxima ▶
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import type { CharacterId } from '@/domains/characters/types';
import type { CreatureGenome } from '@/domains/genetics/types';
import type { OwnershipResolution } from '@/domains/breeding/types';
import { CharacterSpriteRepository } from '@/domains/characters/infrastructure/character-sprite-repository';
import { Canvas2dRenderer } from '@/infrastructure/renderer/canvas-2d-renderer';
import { APP_CONFIG, resolveOutputDimensions } from '@/shared/constants/app-config';

const props = withDefaults(
  defineProps<{
    sireSpecies: CharacterId;
    sireGenome: CreatureGenome;
    damSpecies: CharacterId;
    damGenome: CreatureGenome;
    offspringGenome?: CreatureGenome | null;
    ownership?: OwnershipResolution | null;
    autoPlay?: boolean;
    initialScene?: number;
  }>(),
  {
    offspringGenome: null,
    ownership: null,
    autoPlay: true,
    initialScene: 0
  }
);

const emit = defineEmits<{
  (e: 'scene-change', sceneIndex: number): void;
  (e: 'animation-completed'): void;
}>();

const logicalWidth = 320;
const logicalHeight = 240;
const canvasRef = ref<HTMLCanvasElement | null>(null);

const currentSceneIndex = ref(props.initialScene);
const isPlaying = ref(props.autoPlay);

const spriteRepo = new CharacterSpriteRepository();
const renderer2d = new Canvas2dRenderer();

// Offscreen sprite caches
let sireCanvas: HTMLCanvasElement | null = null;
let damCanvas: HTMLCanvasElement | null = null;
let eggCanvas: HTMLCanvasElement | null = null;

let animationFrameId: number | null = null;
let sceneTimer: ReturnType<typeof setTimeout> | null = null;
let startTimeMs = Date.now();

const SCENES = [
  {
    title: 'Aproximação',
    desc: 'Os dinossauros entram na clareira ancestral e caminham um em direção ao outro.'
  },
  {
    title: 'Reconhecimento',
    desc: 'Troca de olhares atentos, curiosidade biológica e inclinação amigável de cabeça.'
  },
  {
    title: 'Ritual de Acasalamento',
    desc: 'Dança sincronizada de cortejo, pequenos saltos festivos e ressonância elemental.'
  },
  {
    title: 'União Genética',
    desc: 'Partículas de DNA e energia cromática dos progenitores formam um duplo-hélice cósmico.'
  },
  {
    title: 'Formação do Ovo',
    desc: 'A energia converge e se condensa num novo ovo sagrado com padrões herdados.'
  },
  {
    title: 'Revelação Genética',
    desc: 'O ovo surge radiante! O consenso criptográfico revela o proprietário e a linhagem.'
  }
];

const currentSceneTitle = computed(() => SCENES[currentSceneIndex.value]?.title ?? '');
const currentSceneDescription = computed(() => SCENES[currentSceneIndex.value]?.desc ?? '');

function rasterizeSpriteToOffscreen(
  art: ReturnType<typeof spriteRepo.getSpriteFrame>
): HTMLCanvasElement {
  const dims = resolveOutputDimensions(
    art.logicalDimensions,
    APP_CONFIG.rendering.surfaceScales.breeding
  );
  const canvas = document.createElement('canvas');
  canvas.width = dims.width;
  canvas.height = dims.height;
  renderer2d.renderToCanvas(canvas, art, dims.width, dims.height, false, {
    algorithm: APP_CONFIG.rendering.upscalingAlgorithm,
    detailEnhancement: APP_CONFIG.rendering.detailEnhancement
  });
  return canvas;
}

function initSpriteCaches(): void {
  const sireArt = spriteRepo.getSpriteFrame(props.sireSpecies, 'adulto', 'idle', 1);
  const damArt = spriteRepo.getSpriteFrame(props.damSpecies, 'adulto', 'idle', 1);
  const eggSpecies = props.offspringGenome?.species ?? props.sireSpecies;
  const eggArt = spriteRepo.getSpriteFrame(eggSpecies, 'ovo', 'eclosao', 1);

  sireCanvas = rasterizeSpriteToOffscreen(sireArt);
  damCanvas = rasterizeSpriteToOffscreen(damArt);
  eggCanvas = rasterizeSpriteToOffscreen(eggArt);
}

function renderFrame(): void {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;

  const now = Date.now();
  const elapsed = (now - startTimeMs) / 1000;
  const scene = currentSceneIndex.value;

  // Clear Canvas
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, logicalWidth, logicalHeight);

  // Background Ground & Stars
  drawEnvironment(ctx, elapsed);

  switch (scene) {
    case 0:
      renderSceneApproaching(ctx, elapsed);
      break;
    case 1:
      renderSceneRecognition(ctx, elapsed);
      break;
    case 2:
      renderSceneCourtship(ctx, elapsed);
      break;
    case 3:
      renderSceneGeneticUnion(ctx, elapsed);
      break;
    case 4:
      renderSceneEggFormation(ctx, elapsed);
      break;
    case 5:
      renderSceneRevelation(ctx, elapsed);
      break;
  }

  if (isPlaying.value) {
    animationFrameId = requestAnimationFrame(renderFrame);
  }
}

function drawEnvironment(ctx: CanvasRenderingContext2D, time: number): void {
  // Distant stars / magical spores
  ctx.fillStyle = '#4f46e5';
  for (let i = 0; i < 20; i++) {
    const sx = (i * 37 + Math.sin(time + i) * 6) % logicalWidth;
    const sy = (i * 23 + Math.cos(time + i) * 4) % 150;
    ctx.fillRect(Math.floor(sx), Math.floor(sy), 2, 2);
  }

  // Ground plane
  ctx.fillStyle = '#1e1b4b';
  ctx.fillRect(0, 180, logicalWidth, logicalHeight - 180);

  // Grass / stone rim line
  ctx.fillStyle = '#4338ca';
  ctx.fillRect(0, 178, logicalWidth, 2);
}

// Scene 0: Aproximação
function renderSceneApproaching(ctx: CanvasRenderingContext2D, time: number): void {
  const t = Math.min(1, (time % 2.5) / 2.5);
  const sireX = -50 + t * 110; // moves from -50 to 60
  const damX = logicalWidth + 50 - t * 110; // moves from 370 to 260
  const bobY = Math.sin(time * 10) * 3;

  if (sireCanvas) {
    ctx.drawImage(sireCanvas, Math.floor(sireX), Math.floor(130 + bobY), 64, 64);
  }
  if (damCanvas) {
    ctx.save();
    ctx.translate(Math.floor(damX), Math.floor(130 + bobY));
    ctx.scale(-1, 1);
    ctx.drawImage(damCanvas, -64, 0, 64, 64);
    ctx.restore();
  }

  drawNameTag(ctx, 'Pai (♂)', sireX + 32, 120, '#38bdf8');
  drawNameTag(ctx, 'Mãe (♀)', damX - 32, 120, '#f472b6');
}

// Scene 1: Reconhecimento
function renderSceneRecognition(ctx: CanvasRenderingContext2D, time: number): void {
  const sireX = 70;
  const damX = 250;
  const breathe = Math.sin(time * 4) * 2;

  if (sireCanvas) {
    ctx.drawImage(sireCanvas, sireX, 130 + breathe, 64, 64);
  }
  if (damCanvas) {
    ctx.save();
    ctx.translate(damX, 130 + breathe);
    ctx.scale(-1, 1);
    ctx.drawImage(damCanvas, -64, 0, 64, 64);
    ctx.restore();
  }

  // Floating curiosity sparks
  const sparkY = 135 - ((time * 20) % 25);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(145, sparkY, 3, 3);
  ctx.fillStyle = '#f472b6';
  ctx.fillRect(175, sparkY, 3, 3);

  drawNameTag(ctx, '♂ Olhar Atento', sireX + 32, 120, '#38bdf8');
  drawNameTag(ctx, '♀ Reconhecimento', damX - 32, 120, '#f472b6');
}

// Scene 2: Ritual de Acasalamento
function renderSceneCourtship(ctx: CanvasRenderingContext2D, time: number): void {
  const sireX = 85;
  const damX = 235;
  const jumpSire = Math.max(0, Math.sin(time * 6) * 8);
  const jumpDam = Math.max(0, Math.sin(time * 6 + Math.PI) * 8);

  if (sireCanvas) {
    ctx.drawImage(sireCanvas, sireX, 130 - jumpSire, 64, 64);
  }
  if (damCanvas) {
    ctx.save();
    ctx.translate(damX, 130 - jumpDam);
    ctx.scale(-1, 1);
    ctx.drawImage(damCanvas, -64, 0, 64, 64);
    ctx.restore();
  }

  // Heart particle in the center
  const heartY = 125 + Math.sin(time * 5) * 4;
  drawPixelHeart(ctx, 160, heartY, '#fb7185');
}

// Scene 3: União Genética
function renderSceneGeneticUnion(ctx: CanvasRenderingContext2D, time: number): void {
  const sireX = 95;
  const damX = 225;

  if (sireCanvas) {
    ctx.drawImage(sireCanvas, sireX, 130, 64, 64);
  }
  if (damCanvas) {
    ctx.save();
    ctx.translate(damX, 130);
    ctx.scale(-1, 1);
    ctx.drawImage(damCanvas, -64, 0, 64, 64);
    ctx.restore();
  }

  // Double helix DNA energy stream swirling into center (160, 140)
  const sireColor = props.sireGenome.phenotype.colors.base || '#38bdf8';
  const damColor = props.damGenome.phenotype.colors.base || '#f472b6';

  for (let i = 0; i < 16; i++) {
    const angle = time * 5 + (i * Math.PI) / 8;
    const radius = 12 + Math.sin(time * 3 + i) * 4;

    const xSire = 125 + (35 * (i / 16)) + Math.cos(angle) * radius;
    const ySire = 145 + Math.sin(angle) * radius;

    const xDam = 195 - (35 * (i / 16)) + Math.cos(angle + Math.PI) * radius;
    const yDam = 145 + Math.sin(angle + Math.PI) * radius;

    ctx.fillStyle = sireColor;
    ctx.fillRect(Math.floor(xSire), Math.floor(ySire), 3, 3);

    ctx.fillStyle = damColor;
    ctx.fillRect(Math.floor(xDam), Math.floor(yDam), 3, 3);
  }

  // Central DNA spark
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(158, 143, 4, 4);
}

// Scene 4: Formação do Ovo
function renderSceneEggFormation(ctx: CanvasRenderingContext2D, time: number): void {
  // Parents at borders
  if (sireCanvas) ctx.drawImage(sireCanvas, 40, 135, 64, 64);
  if (damCanvas) {
    ctx.save();
    ctx.translate(280, 135);
    ctx.scale(-1, 1);
    ctx.drawImage(damCanvas, -64, 0, 64, 64);
    ctx.restore();
  }

  // Concentric convergence particles
  const pulseScale = 0.8 + Math.sin(time * 8) * 0.15;
  const eggX = 160 - 32 * pulseScale;
  const eggY = 135 - 32 * pulseScale;

  // Swirling glowing ring
  ctx.strokeStyle = '#a855f7';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(160, 145, 24 + Math.sin(time * 6) * 4, 0, Math.PI * 2);
  ctx.stroke();

  if (eggCanvas) {
    ctx.save();
    ctx.translate(eggX, eggY);
    ctx.scale(pulseScale, pulseScale);
    ctx.drawImage(eggCanvas, 0, 0, 64, 64);
    ctx.restore();
  }
}

// Scene 5: Revelação
function renderSceneRevelation(ctx: CanvasRenderingContext2D, time: number): void {
  const eggPulse = Math.sin(time * 4) * 2;

  // Render centered glowing Egg
  if (eggCanvas) {
    ctx.drawImage(eggCanvas, 128, 105 + eggPulse, 64, 64);
  }

  // Glitter sparkles around egg
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4 + time * 2;
    const dist = 38 + Math.sin(time * 4 + i) * 6;
    const px = 160 + Math.cos(angle) * dist;
    const py = 137 + Math.sin(angle) * dist;

    ctx.fillStyle = i % 2 === 0 ? '#fbbf24' : '#67e8f9';
    ctx.fillRect(Math.floor(px), Math.floor(py), 3, 3);
  }

  // Revelation Banner at Top
  const isLocal = props.ownership?.isLocalWinner ?? false;
  ctx.fillStyle = isLocal ? '#059669' : '#0284c7';
  ctx.fillRect(30, 20, logicalWidth - 60, 36);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(
    isLocal ? 'VOCÊ RECEBEU O OVO!' : 'PARCEIRO RECEBEU O OVO!',
    logicalWidth / 2,
    36
  );

  ctx.font = '10px monospace';
  ctx.fillText(
    `Espécie: ${props.offspringGenome?.species ?? 'Descendente'} | Gen ${props.offspringGenome?.generation ?? 2}`,
    logicalWidth / 2,
    50
  );
}

function drawNameTag(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string): void {
  ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
  ctx.fillRect(x - 30, y - 10, 60, 14);
  ctx.fillStyle = color;
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y);
}

function drawPixelHeart(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string): void {
  ctx.fillStyle = color;
  // Simple 8x7 pixel art heart centered at cx, cy
  const coords = [
    [-3, -3], [-2, -3], [2, -3], [3, -3],
    [-4, -2], [-3, -2], [-2, -2], [-1, -2], [1, -2], [2, -2], [3, -2], [4, -2],
    [-4, -1], [-3, -1], [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1], [3, -1], [4, -1],
    [-3, 0], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [3, 0],
    [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1],
    [-1, 2], [0, 2], [1, 2],
    [0, 3]
  ];
  for (const [dx, dy] of coords) {
    ctx.fillRect(cx + dx * 2, cy + dy * 2, 2, 2);
  }
}

function goToScene(sceneIndex: number): void {
  const bounded = Math.max(0, Math.min(5, sceneIndex));
  currentSceneIndex.value = bounded;
  startTimeMs = Date.now();
  emit('scene-change', bounded);

  if (sceneTimer) {
    clearTimeout(sceneTimer);
    sceneTimer = null;
  }

  if (isPlaying.value && bounded < 5) {
    scheduleNextSceneAutoPlay();
  } else if (bounded === 5) {
    emit('animation-completed');
  }
}

function scheduleNextSceneAutoPlay(): void {
  if (sceneTimer) clearTimeout(sceneTimer);
  sceneTimer = setTimeout(() => {
    if (isPlaying.value && currentSceneIndex.value < 5) {
      goToScene(currentSceneIndex.value + 1);
    }
  }, 2500);
}

function togglePlay(): void {
  isPlaying.value = !isPlaying.value;
  if (isPlaying.value) {
    startTimeMs = Date.now();
    renderFrame();
    scheduleNextSceneAutoPlay();
  } else {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    if (sceneTimer) {
      clearTimeout(sceneTimer);
      sceneTimer = null;
    }
  }
}

watch(
  () => [props.sireSpecies, props.damSpecies, props.offspringGenome],
  () => {
    initSpriteCaches();
  }
);

onMounted(() => {
  initSpriteCaches();
  renderFrame();
  if (isPlaying.value) {
    scheduleNextSceneAutoPlay();
  }
});

onBeforeUnmount(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  if (sceneTimer) {
    clearTimeout(sceneTimer);
    sceneTimer = null;
  }
});
</script>
