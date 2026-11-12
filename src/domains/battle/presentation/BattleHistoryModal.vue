<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
    data-testid="battle-history-modal"
  >
    <div
      class="relative w-full max-w-md rounded-2xl border shadow-2xl p-4 sm:p-5 flex flex-col gap-3.5 text-slate-100 select-none transition-colors duration-500"
      :style="{
        backgroundColor: activeTheme.cardBackground,
        borderColor: activeTheme.borderColor
      }"
    >
      <!-- Modal Header -->
      <div
        class="flex items-center justify-between border-b pb-2.5"
        :style="{ borderBottomColor: activeTheme.borderSubtleColor }"
      >
        <div class="flex items-center gap-2">
          <span class="text-xl">📜</span>
          <h2 class="text-sm sm:text-base font-bold" :style="{ color: activeTheme.primaryColor }">
            Ficha e Histórico de Combate
          </h2>
        </div>
        <button
          type="button"
          class="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
          data-testid="close-battle-history-btn"
          @click="$emit('close')"
        >
          ✕
        </button>
      </div>

      <!-- Combat Record Career Summary -->
      <div
        class="grid grid-cols-4 gap-1.5 sm:gap-2 border rounded-xl p-2.5 text-center text-xs"
        :style="{
          backgroundColor: activeTheme.cardDarkBackground,
          borderColor: activeTheme.borderSubtleColor
        }"
      >
        <div class="flex flex-col">
          <span class="text-slate-400 font-mono text-[9px] sm:text-[10px]">LUTAS</span>
          <span class="text-sm font-bold text-white" data-testid="stat-total-battles">{{ battleRecord.totalBattles }}</span>
        </div>
        <div class="flex flex-col">
          <span class="text-emerald-400 font-mono text-[9px] sm:text-[10px]">VITÓRIAS</span>
          <span class="text-sm font-bold text-emerald-300" data-testid="stat-wins">{{ battleRecord.wins }}</span>
        </div>
        <div class="flex flex-col">
          <span class="text-rose-400 font-mono text-[9px] sm:text-[10px]">DERROTAS</span>
          <span class="text-sm font-bold text-rose-300" data-testid="stat-losses">{{ battleRecord.losses }}</span>
        </div>
        <div class="flex flex-col">
          <span class="font-mono text-[9px] sm:text-[10px]" :style="{ color: activeTheme.highlightColor }">TAXA VIT.</span>
          <span class="text-sm font-bold" :style="{ color: activeTheme.primaryColor }" data-testid="stat-win-rate">{{ winRatePercent }}%</span>
        </div>
      </div>

      <!-- Streaks & Combat Level -->
      <div
        class="flex items-center justify-between border rounded-xl px-3 py-2 text-xs"
        :style="{
          backgroundColor: activeTheme.cardDarkBackground,
          borderColor: activeTheme.borderSubtleColor
        }"
      >
        <div class="flex items-center gap-2">
          <span class="text-base">🔥</span>
          <div class="flex flex-col">
            <span class="text-[9px] sm:text-[10px] text-slate-400">SEQUÊNCIA ATUAL</span>
            <span class="font-bold text-amber-300">{{ battleRecord.currentStreak }} (Melhor: {{ battleRecord.bestStreak }})</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-base">⭐</span>
          <div class="flex flex-col text-right">
            <span class="text-[9px] sm:text-[10px] text-slate-400">NÍVEL DE COMBATE</span>
            <span class="font-bold text-cyan-300">Nível {{ battleRecord.combatLevel }} ({{ battleRecord.combatXp }} XP)</span>
          </div>
        </div>
      </div>

      <!-- Unlocked Attacks List -->
      <div class="flex flex-col gap-2">
        <h3 class="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" :style="{ color: activeTheme.highlightColor }">
          <span>⚔️</span> Golpes Desbloqueados ({{ availableAttacks.length }})
        </h3>
        <div class="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-0.5" tabindex="0" role="region" aria-label="Lista de golpes desbloqueados">
          <div
            v-for="atk in availableAttacks"
            :key="atk.id"
            class="border rounded-lg p-2 flex items-center justify-between text-xs"
            :style="{
              backgroundColor: activeTheme.cardDarkBackground,
              borderColor: activeTheme.borderSubtleColor
            }"
          >
            <div class="flex flex-col min-w-0 pr-2">
              <span class="font-bold truncate" :style="{ color: activeTheme.primaryColor }">{{ atk.name }}</span>
              <span class="text-[10px] text-slate-400 line-clamp-1">{{ atk.description }}</span>
            </div>
            <div class="flex items-center gap-1 text-[10px] font-mono shrink-0">
              <span class="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                {{ atk.baseDamage }} Dano
              </span>
              <span class="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                -{{ atk.staminaCost }} Sta
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Opponents History -->
      <div class="flex flex-col gap-2">
        <h3 class="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" :style="{ color: activeTheme.highlightColor }">
          <span>🛡️</span> Últimos Confrontos ({{ recentBattles.length }})
        </h3>
        <div
          v-if="recentBattles.length === 0"
          class="text-center text-xs text-slate-400 py-3 italic border rounded-xl"
          :style="{
            backgroundColor: activeTheme.cardDarkBackground,
            borderColor: activeTheme.borderSubtleColor
          }"
        >
          Nenhuma batalha registrada ainda.
        </div>
        <div v-else class="flex flex-col gap-1.5 max-h-32 overflow-y-auto pr-0.5" tabindex="0" role="region" aria-label="Histórico de confrontos recentes">
          <div
            v-for="b in recentBattles"
            :key="b.id"
            class="border rounded-lg px-2.5 py-1.5 flex items-center justify-between text-xs font-mono"
            :style="{
              backgroundColor: activeTheme.cardDarkBackground,
              borderColor: activeTheme.borderSubtleColor
            }"
          >
            <div class="flex items-center gap-2 truncate">
              <span
                class="px-1.5 py-0.5 text-[9px] font-bold rounded uppercase shrink-0"
                :class="b.result === 'victory' ? 'bg-emerald-950 text-emerald-400 border border-emerald-700' : b.result === 'defeat' ? 'bg-rose-950 text-rose-400 border border-rose-700' : 'bg-slate-800 text-slate-300'"
              >
                {{ b.result === 'victory' ? 'Vitória' : b.result === 'defeat' ? 'Derrota' : 'Empate' }}
              </span>
              <span class="text-slate-300 truncate">vs {{ b.opponentCreatureSpecies }}</span>
            </div>
            <span class="text-amber-400 text-[11px] font-bold shrink-0">
              {{ b.result === 'victory' ? `+${b.rewardCoins} Âmbar` : `-${b.wagerAmount} Âmbar` }}
            </span>
          </div>
        </div>
      </div>

      <!-- Close Action -->
      <button
        type="button"
        class="w-full mt-1 py-2 rounded-xl text-white text-xs font-bold transition-all shadow-md active:scale-98"
        :style="{
          backgroundColor: activeTheme.primaryColor,
          boxShadow: activeTheme.accentGlow
        }"
        @click="$emit('close')"
      >
        Fechar Ficha
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { BattleHistoryRecord, CharacterBattleRecord, BattleAttackDefinition } from '../types';
import type { CreatureTheme } from '@/domains/characters/types';

const props = defineProps<{
  readonly battleRecord: CharacterBattleRecord;
  readonly availableAttacks: readonly BattleAttackDefinition[];
  readonly recentBattles: readonly BattleHistoryRecord[];
  readonly theme?: CreatureTheme;
}>();

defineEmits<{
  (e: 'close'): void;
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

const winRatePercent = computed(() => {
  if (props.battleRecord.totalBattles === 0) return 0;
  return Math.round((props.battleRecord.wins / props.battleRecord.totalBattles) * 100);
});
</script>
