<template>
  <div
    class="relative w-full max-w-lg mx-auto bg-slate-950 rounded-2xl border-2 shadow-2xl overflow-hidden flex flex-col items-center select-none font-sans transition-colors duration-500"
    :style="{ borderColor: activeTheme.borderColor }"
    data-testid="battle-arena-canvas-container"
  >
    <!-- Top HUD: Fighter 1 vs Fighter 2 Health and Stamina Bars -->
    <div
      class="w-full border-b p-2.5 sm:p-3 flex flex-col gap-2 transition-colors duration-500"
      :style="{
        backgroundColor: activeTheme.cardDarkBackground,
        borderBottomColor: activeTheme.borderSubtleColor
      }"
    >
      <!-- Fighter Names & Badges -->
      <div class="flex items-center justify-between text-xs font-bold">
        <!-- Fighter 1 Info -->
        <div class="flex items-center gap-1.5 text-amber-400">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span class="truncate max-w-[120px]">{{ fighter1.speciesName }}</span>
          <span class="text-[10px] px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-700/50 uppercase">
            {{ fighter1.stage }}
          </span>
        </div>

        <span class="text-slate-500 font-mono text-[11px] font-extrabold uppercase">VS</span>

        <!-- Fighter 2 Info -->
        <div class="flex items-center gap-1.5 text-cyan-400">
          <span class="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-700/50 uppercase">
            {{ fighter2.stage }}
          </span>
          <span class="truncate max-w-[120px]">{{ fighter2.speciesName }}</span>
          <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
        </div>
      </div>

      <!-- Health & Stamina Bars Grid -->
      <div class="grid grid-cols-2 gap-3 text-[10px] font-mono">
        <!-- Fighter 1 Bars -->
        <div class="flex flex-col gap-1">
          <div class="flex justify-between text-slate-300">
            <span>HP</span>
            <span data-testid="fighter1-hp">{{ currentHp1 }} / {{ maxHp1 }}</span>
          </div>
          <div class="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div
              class="h-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-300"
              :style="{ width: `${hpPercent1}%` }"
            ></div>
          </div>
          <div class="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              class="h-full bg-amber-400 transition-all duration-300"
              :style="{ width: `${staminaPercent1}%` }"
            ></div>
          </div>
        </div>

        <!-- Fighter 2 Bars -->
        <div class="flex flex-col gap-1">
          <div class="flex justify-between text-slate-300">
            <span>HP</span>
            <span data-testid="fighter2-hp">{{ currentHp2 }} / {{ maxHp2 }}</span>
          </div>
          <div class="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div
              class="h-full bg-gradient-to-r from-cyan-500 to-blue-400 transition-all duration-300 ml-auto"
              :style="{ width: `${hpPercent2}%` }"
            ></div>
          </div>
          <div class="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden ml-auto">
            <div
              class="h-full bg-amber-400 transition-all duration-300 ml-auto"
              :style="{ width: `${staminaPercent2}%` }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Pixel Canvas Viewport -->
    <div class="relative w-full aspect-[4/3] bg-gradient-to-b from-slate-950 via-slate-900 to-amber-950/40 flex items-center justify-center overflow-hidden">
      <canvas
        ref="canvasRef"
        :width="logicalWidth"
        :height="logicalHeight"
        class="w-full h-full object-contain pixelated"
        style="image-rendering: pixelated; image-rendering: -moz-crisp-edges; image-rendering: crisp-edges;"
      ></canvas>

      <!-- Combat Text Popup Overlay -->
      <transition name="fade">
        <div
          v-if="floatingCombatText"
          data-testid="floating-combat-text"
          class="absolute top-8 inset-x-0 mx-auto w-max px-3 py-1 bg-amber-500/90 text-slate-950 font-black text-xs rounded-lg shadow-lg border border-amber-300 transform -translate-y-1 animate-bounce"
        >
          {{ floatingCombatText }}
        </div>
      </transition>

      <!-- Bottom Combat Log Ticker Banner -->
      <div
        class="absolute bottom-2 inset-x-3 bg-slate-950/85 backdrop-blur-sm border border-amber-500/30 rounded-xl px-3 py-1.5 text-center text-xs text-amber-200 pointer-events-none shadow-md truncate font-sans"
        data-testid="battle-ticker-banner"
      >
        {{ currentCombatDescription }}
      </div>
    </div>

    <!-- Playback Controls -->
    <div class="w-full bg-slate-900/95 border-t border-amber-800/40 p-2.5 flex items-center justify-between gap-2 text-xs">
      <button
        type="button"
        class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
        @click="togglePlay"
      >
        <span>{{ isPlaying ? '⏸ Pausar' : '▶ Reproduzir' }}</span>
      </button>

      <button
        type="button"
        class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold transition-colors"
        data-testid="toggle-battle-speed-btn"
        @click="toggleSpeed"
      >
        Velocidade: {{ playbackSpeed }}x
      </button>

      <button
        type="button"
        class="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-md transition-all active:scale-95"
        data-testid="skip-battle-animation-btn"
        @click="skipToEnd"
      >
        ⏩ Pular para o Fim
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { BattleCombatEvent, BattleParticipant, BattleSimulationResult } from '../types';
import type { CreatureTheme } from '@/domains/characters/types';
import type { DeclarativePixelArt } from '@/core/domain/pixel-art/interfaces';
import { CharacterSpriteRepository } from '@/domains/characters/infrastructure/character-sprite-repository';
import { playSoundEffect } from '@/shared/audio/sound-effects';

const props = defineProps<{
  readonly fighter1: BattleParticipant;
  readonly fighter2: BattleParticipant;
  readonly simulationResult: BattleSimulationResult;
  readonly theme?: CreatureTheme;
}>();

const emit = defineEmits<{
  (e: 'completed', result: BattleSimulationResult): void;
}>();

const activeTheme = computed<CreatureTheme>(() => {
  return (
    props.theme ?? {
      primaryColor: '#f59e0b',
      highlightColor: '#fde68a',
      rootBackground: '#020617',
      containerBackground: '#0f172a',
      headerBackground: '#1e293b',
      cardBackground: '#0f172a',
      cardDarkBackground: '#020617',
      borderColor: '#d97706',
      borderSubtleColor: '#92400e',
      ambientGradient: 'none',
      accentGlow: 'none'
    }
  );
});

const logicalWidth = 320;
const logicalHeight = 240;
const canvasRef = ref<HTMLCanvasElement | null>(null);

const spriteRepo = new CharacterSpriteRepository();

const currentEventIndex = ref(0);
const isPlaying = ref(true);
const playbackSpeed = ref<1 | 2>(1);
const floatingCombatText = ref<string | null>(null);

const maxHp1 = ref(100);
const currentHp1 = ref(100);
const maxHp2 = ref(100);
const currentHp2 = ref(100);

const staminaPercent1 = ref(100);
const staminaPercent2 = ref(100);

let timerId: ReturnType<typeof setTimeout> | null = null;

const hpPercent1 = computed(() => Math.max(0, Math.min(100, Math.round((currentHp1.value / Math.max(1, maxHp1.value)) * 100))));
const hpPercent2 = computed(() => Math.max(0, Math.min(100, Math.round((currentHp2.value / Math.max(1, maxHp2.value)) * 100))));

const currentCombatDescription = computed(() => {
  const ev = props.simulationResult.events[currentEventIndex.value];
  return ev?.description ?? 'Combate em andamento...';
});

function drawArenaFrame(
  ctx: CanvasRenderingContext2D,
  f1Action: 'idle' | 'attack' | 'hit' | 'dead',
  f2Action: 'idle' | 'attack' | 'hit' | 'dead',
  f1Offset: number,
  f2Offset: number
): void {
  ctx.clearRect(0, 0, logicalWidth, logicalHeight);

  // 1. Fundo da arena
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, logicalWidth, logicalHeight);

  // Chão de pedra
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 160, logicalWidth, 80);
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 158, logicalWidth, 2);

  // 2. Sprites dos dinossauros
  const anim1 = f1Action === 'attack' ? 'comendo' : f1Action === 'hit' ? 'doente' : f1Action === 'dead' ? 'morte' : 'idle';
  const anim2 = f2Action === 'attack' ? 'comendo' : f2Action === 'hit' ? 'doente' : f2Action === 'dead' ? 'morte' : 'idle';

  const art1 = spriteRepo.getSpriteFrame(props.fighter1.speciesId, props.fighter1.stage, anim1, 0);
  const art2 = spriteRepo.getSpriteFrame(props.fighter2.speciesId, props.fighter2.stage, anim2, 0);

  // Renderiza Lutador 1 (esquerda)
  renderPixelArtOnCanvas(ctx, art1, 40 + f1Offset, 100, 64, 64, false);

  // Renderiza Lutador 2 (direita, espelhado horizontalmente)
  renderPixelArtOnCanvas(ctx, art2, 216 - f2Offset, 100, 64, 64, true);
}

function renderPixelArtOnCanvas(
  ctx: CanvasRenderingContext2D,
  art: DeclarativePixelArt,
  x: number,
  y: number,
  w: number,
  _h: number,
  flipX: boolean
): void {
  ctx.save();
  if (flipX) {
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(x, y);
  }

  const scale = w / Math.max(1, art.logicalDimensions.width);
  for (const layer of art.layers) {
    if (!layer.visible) continue;
    for (const op of layer.operations) {
      if (op.type === 'rect') {
        ctx.fillStyle = art.palette[op.color] ?? '#ffffff';
        ctx.fillRect(op.x * scale, op.y * scale, op.width * scale, op.height * scale);
      } else if (op.type === 'points') {
        ctx.fillStyle = art.palette[op.color] ?? '#ffffff';
        for (const [px, py] of op.coordinates) {
          ctx.fillRect(px * scale, py * scale, scale, scale);
        }
      }
    }
  }
  ctx.restore();
}

function stepSimulation(): void {
  if (!isPlaying.value) return;

  const events = props.simulationResult.events;
  if (currentEventIndex.value >= events.length) {
    emit('completed', props.simulationResult);
    return;
  }

  const ev: BattleCombatEvent = events[currentEventIndex.value];
  currentEventIndex.value++;

  const isF1 = ev.actorId === props.fighter1.peerId;

  if (ev.type === 'match_start') {
    maxHp1.value = ev.actorHp;
    currentHp1.value = ev.actorHp;
    maxHp2.value = ev.targetHp ?? ev.actorHp;
    currentHp2.value = ev.targetHp ?? ev.actorHp;
  } else if (ev.type === 'damage_inflicted') {
    if (isF1) {
      currentHp2.value = ev.targetHp ?? currentHp2.value;
    } else {
      currentHp1.value = ev.targetHp ?? currentHp1.value;
    }
    floatingCombatText.value = `-${ev.damage} Dano!`;
    playSoundEffect('burp', 0.5);
  } else if (ev.type === 'critical_hit') {
    floatingCombatText.value = '⚡ CRÍTICO!';
    playSoundEffect('happy', 0.7);
  } else if (ev.type === 'attack_dodged') {
    floatingCombatText.value = '💨 ESQUIVOU!';
    playSoundEffect('shower', 0.5);
  } else if (ev.type === 'attack_blocked') {
    floatingCombatText.value = `🛡️ BLOQUEADO (-${ev.absorbedDamage})`;
  } else if (ev.type === 'fighter_fainted') {
    playSoundEffect('dead', 0.8);
  }

  // Desenha no canvas
  const canvas = canvasRef.value;
  if (canvas) {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const f1Action = isF1 && ev.type === 'attack_launched' ? 'attack' : (!isF1 && ev.type === 'damage_inflicted' ? 'hit' : (currentHp1.value <= 0 ? 'dead' : 'idle'));
      const f2Action = !isF1 && ev.type === 'attack_launched' ? 'attack' : (isF1 && ev.type === 'damage_inflicted' ? 'hit' : (currentHp2.value <= 0 ? 'dead' : 'idle'));
      const f1Offset = isF1 && ev.type === 'attack_launched' ? 20 : 0;
      const f2Offset = !isF1 && ev.type === 'attack_launched' ? 20 : 0;

      drawArenaFrame(ctx, f1Action, f2Action, f1Offset, f2Offset);
    }
  }

  const delay = Math.round((ev.type === 'critical_hit' ? 600 : 380) / playbackSpeed.value);
  timerId = setTimeout(() => {
    floatingCombatText.value = null;
    stepSimulation();
  }, delay);
}

function togglePlay(): void {
  isPlaying.value = !isPlaying.value;
  if (isPlaying.value) {
    stepSimulation();
  } else if (timerId) {
    clearTimeout(timerId);
    timerId = null;
  }
}

function toggleSpeed(): void {
  playbackSpeed.value = playbackSpeed.value === 1 ? 2 : 1;
}

function skipToEnd(): void {
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
  }
  currentEventIndex.value = props.simulationResult.events.length;
  currentHp1.value = props.simulationResult.fighter1FinalHp;
  currentHp2.value = props.simulationResult.fighter2FinalHp;

  const canvas = canvasRef.value;
  if (canvas) {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      drawArenaFrame(
        ctx,
        currentHp1.value <= 0 ? 'dead' : 'idle',
        currentHp2.value <= 0 ? 'dead' : 'idle',
        0,
        0
      );
    }
  }

  emit('completed', props.simulationResult);
}

onMounted(() => {
  const canvas = canvasRef.value;
  if (canvas) {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      drawArenaFrame(ctx, 'idle', 'idle', 0, 0);
    }
  }
  stepSimulation();
});

onBeforeUnmount(() => {
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
  }
});
</script>

<style scoped>
.pixelated {
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
