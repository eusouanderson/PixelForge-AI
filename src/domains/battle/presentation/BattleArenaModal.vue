<template>
  <div
    :class="
      embedded
        ? 'w-full flex flex-col space-y-3'
        : 'fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto'
    "
    data-testid="battle-arena-modal"
  >
    <div
      class="relative w-full rounded-2xl border shadow-xl overflow-hidden flex flex-col text-slate-100 select-none transition-colors duration-500"
      :style="{
        backgroundColor: theme.cardBackground,
        borderColor: theme.borderColor
      }"
      :class="{ 'max-w-lg mx-auto': !embedded }"
    >
      <!-- Modal / Panel Header -->
      <div
        class="w-full px-3.5 py-2.5 border-b flex items-center justify-between transition-colors duration-500"
        :style="{
          backgroundColor: theme.headerBackground,
          borderBottomColor: theme.borderSubtleColor
        }"
      >
        <div class="flex items-center gap-2">
          <span class="text-xl animate-pulse">⚔️</span>
          <div>
            <h2 class="text-xs sm:text-sm font-black tracking-wide" :style="{ color: theme.primaryColor }">
              Arena de Batalha P2P
            </h2>
            <p class="text-[10px] text-slate-300">Duelos automatizados valendo Moedas Âmbar</p>
          </div>
        </div>

        <div class="flex items-center gap-1.5">
          <button
            type="button"
            class="px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1 active:scale-95"
            :style="{
              backgroundColor: theme.cardDarkBackground,
              borderColor: theme.borderSubtleColor,
              color: theme.primaryColor
            }"
            data-testid="open-history-btn"
            @click="showHistoryModal = true"
          >
            <span>📜</span> Ficha
          </button>
          <button
            v-if="!embedded"
            type="button"
            class="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
            data-testid="close-battle-modal-btn"
            @click="handleClose"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Content Views based on Phase -->
      <div class="p-3 sm:p-4 flex flex-col gap-3">
        <!-- Error Banner -->
        <div
          v-if="sessionState.errorMessage"
          class="p-2.5 rounded-xl bg-rose-950/80 border border-rose-700/50 text-rose-200 text-xs font-semibold flex items-center gap-2"
          data-testid="battle-error-banner"
        >
          <span>⚠️</span> {{ sessionState.errorMessage }}
        </div>

        <!-- 1. Discovery & Setup View (idle or discovering or selecting_creature) -->
        <div v-if="sessionState.phase === 'idle' || sessionState.phase === 'discovering' || sessionState.phase === 'opponent_found' || sessionState.phase === 'selecting_creature'" class="flex flex-col gap-3">
          <!-- Room Channel & Search -->
          <div
            class="border rounded-xl p-3 flex flex-col gap-2 transition-colors duration-500"
            :style="{
              backgroundColor: theme.cardDarkBackground,
              borderColor: theme.borderSubtleColor
            }"
          >
            <label class="text-[11px] font-bold uppercase tracking-wider" :style="{ color: theme.highlightColor }">
              Código da Sala da Arena
            </label>
            <div class="flex items-center gap-2">
              <input
                v-model="roomChannelCode"
                type="text"
                class="flex-1 min-w-0 bg-slate-900/90 border rounded-lg px-3 py-1.5 text-xs text-white font-mono uppercase focus:outline-none"
                :style="{ borderColor: theme.borderSubtleColor }"
                placeholder="BATALHA-777"
                data-testid="battle-channel-input"
              />
              <button
                type="button"
                class="px-3 py-1.5 rounded-lg text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 shrink-0 active:scale-95"
                :style="{ backgroundColor: theme.primaryColor }"
                data-testid="start-battle-discovery-btn"
                @click="startDiscovery"
              >
                <span>🔍</span> Buscar
              </button>
            </div>
          </div>

          <!-- Active Fighter Card -->
          <div
            class="border rounded-xl p-3 flex items-center justify-between gap-2 transition-colors duration-500"
            :style="{
              backgroundColor: theme.cardDarkBackground,
              borderColor: theme.borderSubtleColor
            }"
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <div
                class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl border flex items-center justify-center text-lg sm:text-xl shrink-0"
                :style="{
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.borderColor
                }"
              >
                🦖
              </div>
              <div class="flex flex-col min-w-0">
                <div class="flex items-center gap-1.5 truncate">
                  <span class="font-bold text-xs sm:text-sm truncate" :style="{ color: theme.primaryColor }">
                    {{ activeParticipant.speciesName }}
                  </span>
                  <span
                    class="text-[9px] px-1.5 py-0.2 rounded border uppercase font-mono shrink-0"
                    :style="{
                      backgroundColor: theme.cardBackground,
                      borderColor: theme.borderSubtleColor,
                      color: theme.highlightColor
                    }"
                  >
                    {{ activeParticipant.stage }}
                  </span>
                </div>
                <span class="text-[10px] text-slate-300 truncate">
                  Nível {{ activeParticipant.level }} · {{ activeParticipant.element }}
                </span>
              </div>
            </div>

            <div class="flex flex-col text-right font-mono text-[9px] sm:text-[10px] text-slate-300 shrink-0">
              <span>FOR {{ activeParticipant.attributes.strength }} · AGI {{ activeParticipant.attributes.agility }}</span>
              <span>DEF {{ activeParticipant.attributes.defense }} · RES {{ activeParticipant.attributes.endurance }}</span>
            </div>
          </div>

          <!-- Wager Selector -->
          <div
            class="border rounded-xl p-3 flex flex-col gap-2 transition-colors duration-500"
            :style="{
              backgroundColor: theme.cardDarkBackground,
              borderColor: theme.borderSubtleColor
            }"
          >
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold" :style="{ color: theme.highlightColor }">Aposta em Moedas Âmbar</span>
              <span class="font-mono text-amber-400 font-bold text-[11px]" data-testid="current-wallet-display">
                Saldo: {{ wallet.amberCoins }} Âmbar
              </span>
            </div>
            <div class="grid grid-cols-4 gap-1.5 sm:gap-2">
              <button
                v-for="amt in [10, 25, 50, 100]"
                :key="amt"
                type="button"
                class="py-1.5 rounded-lg text-xs font-bold border transition-all text-center active:scale-95"
                :style="
                  selectedWager === amt
                    ? {
                        backgroundColor: theme.primaryColor,
                        color: '#ffffff',
                        borderColor: theme.highlightColor,
                        boxShadow: theme.accentGlow
                      }
                    : {
                        backgroundColor: theme.cardBackground,
                        color: '#cbd5e1',
                        borderColor: theme.borderSubtleColor
                      }
                "
                :disabled="wallet.amberCoins < amt"
                :data-testid="`wager-btn-${amt}`"
                @click="selectedWager = amt"
              >
                {{ amt }}¢
              </button>
            </div>
          </div>

          <!-- Incoming Invite Alert -->
          <div
            v-if="sessionState.phase === 'selecting_creature' && sessionState.remoteParticipant"
            class="p-3 border-2 rounded-xl flex flex-col gap-2 text-xs transition-colors duration-500"
            :style="{
              backgroundColor: theme.cardDarkBackground,
              borderColor: theme.primaryColor
            }"
            data-testid="incoming-invite-card"
          >
            <div class="flex items-center justify-between">
              <span class="font-bold" :style="{ color: theme.primaryColor }">⚔️ Desafio Recebido!</span>
              <span class="font-mono text-amber-400 font-bold">{{ sessionState.wagerAmount }} Âmbar em jogo</span>
            </div>
            <p class="text-slate-200 text-[11px]">
              <strong :style="{ color: theme.highlightColor }">{{ sessionState.remoteParticipant.playerName }}</strong> desafiou seu dinossauro com um
              <strong class="text-cyan-300">{{ sessionState.remoteParticipant.speciesName }}</strong> ({{ sessionState.remoteParticipant.stage }})!
            </p>
            <div class="flex items-center gap-2 mt-1">
              <button
                type="button"
                class="flex-1 py-1.5 rounded-lg font-bold text-white shadow-md transition-colors active:scale-95"
                :style="{ backgroundColor: theme.primaryColor }"
                data-testid="accept-battle-invite-btn"
                @click="acceptInvite"
              >
                Aceitar Duelo
              </button>
              <button
                type="button"
                class="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 font-semibold text-slate-300 transition-colors active:scale-95"
                data-testid="reject-battle-invite-btn"
                @click="rejectInvite"
              >
                Recusar
              </button>
            </div>
          </div>

          <!-- Discovered Opponents List -->
          <div v-else class="flex flex-col gap-2">
            <span class="text-xs font-bold uppercase tracking-wider" :style="{ color: theme.highlightColor }">
              Treinadores Próximos ({{ discoveredOpponents.length }})
            </span>
            <div
              v-if="discoveredOpponents.length === 0"
              class="p-4 border rounded-xl text-center text-xs text-slate-400 italic"
              :style="{
                backgroundColor: theme.cardDarkBackground,
                borderColor: theme.borderSubtleColor
              }"
            >
              Buscando desafiantes próximos na mesma sala...
            </div>
            <div v-else class="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-0.5">
              <div
                v-for="opp in discoveredOpponents"
                :key="opp.peerId"
                class="p-2.5 border rounded-xl flex items-center justify-between text-xs transition-colors"
                :style="{
                  backgroundColor: theme.cardDarkBackground,
                  borderColor: theme.borderSubtleColor
                }"
              >
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full animate-pulse" :style="{ backgroundColor: theme.primaryColor }"></span>
                  <span class="font-bold text-slate-200">{{ opp.playerName }}</span>
                </div>
                <button
                  type="button"
                  class="px-3 py-1 rounded-lg font-bold text-white shadow-sm transition-all active:scale-95"
                  :style="{ backgroundColor: theme.primaryColor }"
                  :data-testid="`challenge-peer-${opp.peerId}`"
                  @click="sendInvite(opp.peerId)"
                >
                  Desafiar
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Awaiting Confirmation View -->
        <div
          v-else-if="sessionState.phase === 'awaiting_confirmation'"
          class="flex flex-col items-center justify-center p-6 gap-3 text-center border rounded-xl"
          :style="{
            backgroundColor: theme.cardDarkBackground,
            borderColor: theme.borderSubtleColor
          }"
          data-testid="awaiting-confirmation-view"
        >
          <div
            class="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
            :style="{ borderColor: theme.primaryColor, borderTopColor: 'transparent' }"
          ></div>
          <span class="font-bold text-sm" :style="{ color: theme.primaryColor }">Aguardando resposta do adversário...</span>
          <p class="text-xs text-slate-300">O convite para o duelo com aposta de {{ sessionState.wagerAmount }} Âmbar foi enviado.</p>
          <button
            type="button"
            class="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors mt-1 active:scale-95"
            @click="cancelBattle"
          >
            Cancelar Convite
          </button>
        </div>

        <!-- 3. Battle In Progress View (Battle Canvas) -->
        <div v-else-if="sessionState.phase === 'battle_running' && sessionState.localParticipant && sessionState.remoteParticipant && sessionState.simulationResult" class="flex flex-col gap-2">
          <BattleArenaCanvas
            :fighter1="sessionState.localParticipant"
            :fighter2="sessionState.remoteParticipant"
            :simulation-result="sessionState.simulationResult"
            :theme="theme"
            @completed="onBattleFinished"
          />
        </div>

        <!-- 4. Result & Reward Claim View -->
        <div
          v-else-if="sessionState.phase === 'battle_completed' || sessionState.phase === 'reward_claimed'"
          class="flex flex-col items-center justify-center p-4 sm:p-5 gap-3 text-center border rounded-xl transition-colors duration-500"
          :style="{
            backgroundColor: theme.cardDarkBackground,
            borderColor: theme.borderColor
          }"
          data-testid="battle-result-view"
        >
          <div class="text-4xl animate-bounce">
            {{ isLocalWinner ? '🏆' : isDraw ? '🤝' : '💀' }}
          </div>
          <h3
            class="text-base font-black uppercase tracking-wider"
            :style="{ color: isLocalWinner ? theme.primaryColor : isDraw ? '#e2e8f0' : '#fb7185' }"
          >
            {{ isLocalWinner ? 'Vitória Gloriosa!' : isDraw ? 'Empate Tenso!' : 'Derrota na Arena' }}
          </h3>

          <p class="text-xs text-slate-300">
            {{ isLocalWinner ? `Parabéns! Você faturou o pote da arena.` : isDraw ? `As apostas foram devolvidas integralmente.` : `Seu oponente levou o prêmio desta vez.` }}
          </p>

          <div
            class="p-3 border rounded-xl flex items-center justify-around w-full text-xs font-mono"
            :style="{
              backgroundColor: theme.cardBackground,
              borderColor: theme.borderSubtleColor
            }"
          >
            <div class="flex flex-col">
              <span class="text-slate-400 text-[10px]">RECOMPENSA</span>
              <span class="font-bold text-amber-400 text-sm">
                {{ isLocalWinner ? `+${sessionState.historyRecord?.rewardCoins ?? Math.round(sessionState.wagerAmount * 1.8)} Âmbar` : isDraw ? `+${sessionState.wagerAmount} Âmbar` : `0 Âmbar` }}
              </span>
            </div>
            <div class="flex flex-col">
              <span class="text-slate-400 text-[10px]">XP DE COMBATE</span>
              <span class="font-bold text-cyan-300 text-sm">
                +{{ isLocalWinner ? 120 : isDraw ? 40 : 25 }} XP
              </span>
            </div>
          </div>

          <button
            type="button"
            class="w-full mt-2 py-2 rounded-xl text-white font-bold text-xs shadow-md transition-all active:scale-98"
            :style="{
              backgroundColor: theme.primaryColor,
              boxShadow: theme.accentGlow
            }"
            data-testid="finish-and-claim-btn"
            @click="claimAndFinish"
          >
            Coletar e Concluir
          </button>
        </div>
      </div>
    </div>

    <!-- Submodal Ficha de Histórico -->
    <BattleHistoryModal
      v-if="showHistoryModal"
      :battle-record="activeParticipantRecord"
      :available-attacks="availableAttacks"
      :recent-battles="recentBattles"
      :theme="theme"
      @close="showHistoryModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import type { WalletState } from '@/domains/economy/types';
import type { CharacterSaveRecord } from '@/domains/persistence/types';
import type { CreatureTheme } from '@/domains/characters/types';
import { getCharacterSpeciesById } from '@/domains/characters/domain/character-registry';
import { generateCreatureTheme } from '@/domains/characters/domain/creature-theme-engine';
import type {
  BattleDiscoveredOpponent,
  BattleHistoryRecord,
  BattleParticipant,
  BattleSessionState,
  BattleSimulationResult,
  BattleTransportPort,
  CharacterBattleRecord
} from '../types';
import { BattleService } from '../application/battle-service';
import { BattleP2PAdapter } from '../infrastructure/battle-p2p-adapter';
import { resolveAvailableAttacks } from '../domain/attacks-catalog';
import BattleArenaCanvas from './BattleArenaCanvas.vue';
import BattleHistoryModal from './BattleHistoryModal.vue';

const props = withDefaults(
  defineProps<{
    readonly activeCreature: CharacterSaveRecord;
    readonly wallet: WalletState;
    readonly transportOverride?: BattleTransportPort;
    readonly battleArchive?: readonly BattleHistoryRecord[];
    readonly theme?: CreatureTheme;
    readonly embedded?: boolean;
  }>(),
  {
    embedded: false
  }
);

const theme = computed<CreatureTheme>(() => {
  if (props.theme) return props.theme;
  const genetics = props.activeCreature.genetics as { phenotype?: { colors?: { base?: string; crest?: string } } } | undefined;
  if (genetics?.phenotype?.colors?.base) {
    return generateCreatureTheme(genetics.phenotype.colors.base, genetics.phenotype.colors.crest);
  }
  const rawId = props.activeCreature.runtime?.characterId ?? props.activeCreature.id ?? 'ignisauro';
  try {
    const species = getCharacterSpeciesById(rawId as import('@/domains/characters/types').CharacterId);
    if (species?.visualTraits?.primaryColors) {
      return generateCreatureTheme(
        species.visualTraits.primaryColors.base,
        species.visualTraits.primaryColors.highlight
      );
    }
  } catch {
    // fallback
  }
  return generateCreatureTheme('#f59e0b', '#fde68a');
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'settleBattle', payload: {
    readonly historyRecord: BattleHistoryRecord;
    readonly nextWallet: WalletState;
  }): void;
}>();

const showHistoryModal = ref(false);
const roomChannelCode = ref('BATALHA-777');
const selectedWager = ref(50);

const transport: BattleTransportPort =
  props.transportOverride ??
  new BattleP2PAdapter({
    playerName: 'Treinador Pixel'
  });

const battleService = new BattleService(transport);
const sessionState = ref<BattleSessionState>(battleService.getState());
const discoveredOpponents = ref<readonly BattleDiscoveredOpponent[]>([]);

battleService.subscribe((next) => {
  sessionState.value = next;
});

if (transport.onPeersChange) {
  transport.onPeersChange((peers) => {
    discoveredOpponents.value = peers;
  });
}

const activeParticipant = computed<BattleParticipant>(() => {
  const rec = props.activeCreature;
  return {
    peerId: transport.localPeerId,
    playerName: 'Treinador Pixel',
    creatureInstanceId: rec.id ?? rec.runtime.characterId,
    speciesId: rec.runtime.characterId,
    speciesName: rec.runtime.characterId.toUpperCase(),
    customNickname: rec.runtime.customNickname,
    stage: rec.runtime.currentStage,
    level: rec.progression.level,
    ageHours: rec.runtime.ageHours,
    attributes: rec.attributes,
    needs: rec.needs,
    personalityTemper: 'ferocious',
    element: 'fire',
    unlockedAttackIds: [],
    combatLevel: rec.battleRecord?.combatLevel ?? 1,
    combatXp: rec.battleRecord?.combatXp ?? 0,
    isReady: true,
    hasConfirmedWager: true
  };
});

const activeParticipantRecord = computed<CharacterBattleRecord>(() => {
  return (
    props.activeCreature.battleRecord ?? {
      totalBattles: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      currentStreak: 0,
      bestStreak: 0,
      combatXp: 0,
      combatLevel: 1,
      unlockedAttacks: [],
      recentOpponents: []
    }
  );
});

const availableAttacks = computed(() => resolveAvailableAttacks(activeParticipant.value));
const recentBattles = computed(() => props.battleArchive ?? []);

const isLocalWinner = computed(() => {
  return sessionState.value.simulationResult?.winnerPeerId === transport.localPeerId;
});

const isDraw = computed(() => {
  return Boolean(sessionState.value.simulationResult?.isDraw);
});

async function startDiscovery(): Promise<void> {
  await battleService.startDiscovery(roomChannelCode.value);
}

function sendInvite(targetPeerId: string): void {
  battleService.sendBattleInvite(activeParticipant.value, selectedWager.value, targetPeerId);
}

function acceptInvite(): void {
  battleService.acceptBattleInvite(activeParticipant.value);
}

function rejectInvite(): void {
  battleService.rejectBattleInvite();
}

function cancelBattle(): void {
  battleService.cancelOrForfeit();
}

function onBattleFinished(_result: BattleSimulationResult): void {
  // Passa para estado de reivindicação de prêmio
  const claimRes = battleService.claimReward(props.wallet, new Set());
  if (claimRes.success && claimRes.history) {
    emit('settleBattle', {
      historyRecord: claimRes.history,
      nextWallet: claimRes.nextWallet
    });
  }
}

function claimAndFinish(): void {
  emit('close');
}

function handleClose(): void {
  battleService.dispose();
  emit('close');
}

onBeforeUnmount(() => {
  battleService.dispose();
});
</script>
