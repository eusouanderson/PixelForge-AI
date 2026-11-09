<template>
  <div class="space-y-3 font-sans text-slate-100 select-none">
    <div
      class="w-full rounded-2xl shadow-lg flex flex-col overflow-hidden border transition-colors duration-500"
      :style="{
        backgroundColor: theme.containerBackground,
        borderColor: theme.borderColor
      }"
    >
      <!-- Section Header -->
      <div
        class="px-4 py-3 border-b flex items-center justify-between transition-colors duration-500"
        :style="{
          backgroundColor: theme.headerBackground,
          borderBottomColor: theme.borderColor
        }"
      >
        <div class="flex items-center gap-2.5">
          <span class="text-xl">🧬</span>
          <div>
            <h2
              class="text-sm sm:text-base font-black tracking-wide"
              :style="{ color: theme.primaryColor }"
            >
              PixelForge Genetics & Reprodução
            </h2>
            <p class="text-[10px] text-slate-400">Multiplayer P2P Offline • Hereditariedade • Consenso</p>
          </div>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div
        class="flex border-b px-3 pt-2 gap-1 text-xs font-bold overflow-x-auto transition-colors duration-500"
        :style="{
          backgroundColor: theme.cardDarkBackground,
          borderBottomColor: theme.borderSubtleColor
        }"
      >
        <button
          type="button"
          data-testid="subtab-breeding"
          class="px-3 py-2 rounded-t-xl transition-all border-b-2"
          :style="
            activeTab === 'breeding'
              ? { borderBottomColor: theme.primaryColor, color: theme.primaryColor, backgroundColor: theme.cardBackground }
              : { borderBottomColor: 'transparent', color: '#94a3b8' }
          "
          @click="activeTab = 'breeding'"
        >
          💞 Reprodução P2P
        </button>
        <button
          type="button"
          data-testid="subtab-nursery"
          class="px-3 py-2 rounded-t-xl transition-all border-b-2 relative"
          :style="
            activeTab === 'nursery'
              ? { borderBottomColor: '#f59e0b', color: '#fbbf24', backgroundColor: theme.cardBackground }
              : { borderBottomColor: 'transparent', color: '#94a3b8' }
          "
          @click="activeTab = 'nursery'"
        >
          🥚 Berçário de Ovos
          <span
            v-if="incubatorEggs.length > 0"
            class="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-amber-500 text-slate-950 font-black"
          >
            {{ incubatorEggs.length }}
          </span>
        </button>
        <button
          type="button"
          data-testid="subtab-lineage"
          class="px-3 py-2 rounded-t-xl transition-all border-b-2"
          :style="
            activeTab === 'lineage'
              ? { borderBottomColor: '#38bdf8', color: '#7dd3fc', backgroundColor: theme.cardBackground }
              : { borderBottomColor: 'transparent', color: '#94a3b8' }
          "
          @click="activeTab = 'lineage'"
        >
          🌳 Árvore Genealógica
        </button>
      </div>

      <!-- Tab Content Area -->
      <div
        class="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 transition-colors duration-500"
        :style="{ backgroundColor: theme.cardBackground }"
      >
        <!-- TAB 1: BREEDING -->
        <div v-if="activeTab === 'breeding'" class="space-y-4">
          <!-- Connection Bar -->
          <div
            class="p-3 border rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs transition-colors duration-500"
            :style="{
              backgroundColor: theme.cardDarkBackground,
              borderColor: theme.borderSubtleColor
            }"
          >
            <div class="flex items-center gap-2">
              <span
                class="w-2.5 h-2.5 rounded-full"
                :class="
                  isConnected
                    ? 'bg-emerald-400 animate-pulse'
                    : (sessionState.phase === 'failed' || nearbyStatus === 'failed')
                      ? 'bg-rose-500'
                      : 'bg-amber-400'
                "
              ></span>
              <span class="text-slate-300 font-mono">
                Status:
                <strong :class="(sessionState.phase === 'failed' || nearbyStatus === 'failed') ? 'text-rose-400' : 'text-white'">
                  {{ connectionStatusLabel }}
                </strong>
              </span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-slate-400">Canal / Sala:</span>
              <input
                v-model="roomChannelCode"
                type="text"
                class="w-28 px-2 py-1 border rounded-lg font-mono text-center text-xs"
                :style="{
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.borderSubtleColor,
                  color: theme.primaryColor
                }"
                placeholder="SALA-123"
              />
              <button
                type="button"
                data-testid="p2p-connect-btn"
                class="px-3 py-1 font-bold rounded-lg text-xs text-white shadow-sm transition active:scale-95 hover:brightness-110"
                :style="{ backgroundColor: theme.primaryColor }"
                @click="handleConnect"
              >
                {{ (sessionState.phase === 'failed' || nearbyStatus === 'failed') ? 'Tentar Novamente' : 'Conectar' }}
              </button>
            </div>
          </div>

          <!-- Helpful error banner when connection failed -->
          <div
            v-if="sessionState.phase === 'failed' || nearbyStatus === 'failed'"
            data-testid="connection-error-banner"
            class="p-3 rounded-2xl border border-rose-500/40 bg-rose-950/30 text-rose-200 text-xs flex items-start gap-2.5 shadow-inner"
          >
            <span class="text-base leading-none">⚠️</span>
            <div class="space-y-1.5 flex-1">
              <div class="font-bold text-rose-300">Falha ao iniciar conexão P2P:</div>
              <p class="text-[11px] text-rose-100/90 leading-relaxed">
                {{ sessionState.errorMessage || 'Não foi possível iniciar o rádio Nearby. Verifique se o Bluetooth e a Localização (GPS) estão ativados nas configurações rápidas do Android e se as permissões de dispositivos por perto foram concedidas.' }}
              </p>
              <div class="text-[10px] text-slate-300 bg-slate-900/70 p-2 rounded-xl border border-slate-700/60">
                <span class="font-bold text-amber-300">💡 Como resolver no aparelho:</span>
                <ul class="list-disc list-inside mt-1 space-y-0.5 text-slate-300">
                  <li>Ative o <strong>Bluetooth</strong> no painel de atalhos do Android.</li>
                  <li>Ative a <strong>Localização (GPS)</strong> no painel de atalhos.</li>
                  <li>Autorize a permissão de <strong>Dispositivos Próximos</strong> nas permissões do app.</li>
                  <li>Para testar no PC / Navegador Web: abra duas abas com o mesmo código de sala.</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Discovered Nearby Peers List -->
          <div
            v-if="discoveredPeers.length > 0 && !isConnected"
            class="p-3 rounded-2xl border flex flex-col gap-2 text-xs"
            :style="{
              backgroundColor: theme.cardDarkBackground,
              borderColor: theme.borderSubtleColor
            }"
          >
            <div class="flex items-center justify-between text-slate-400">
              <span class="font-semibold text-white">📡 Jogadores Próximos (Google Nearby):</span>
              <span class="font-mono text-emerald-400">{{ discoveredPeers.length }} encontrado(s)</span>
            </div>
            <div class="flex flex-wrap gap-2 pt-1">
              <div
                v-for="peer in discoveredPeers"
                :key="peer.endpointId"
                class="flex items-center justify-between gap-3 px-3 py-1.5 rounded-xl border bg-slate-900/60"
                :style="{ borderColor: theme.borderSubtleColor }"
              >
                <div>
                  <div class="font-bold text-white">{{ peer.playerName }}</div>
                  <div class="text-[10px] text-slate-400 font-mono">v{{ peer.protocolVersion }}</div>
                </div>
                <button
                  type="button"
                  class="px-2.5 py-1 rounded-lg text-xs font-bold text-white shadow-sm transition hover:brightness-110 active:scale-95"
                  :style="{ backgroundColor: theme.primaryColor }"
                  @click="handleConnectToPeer(peer.endpointId)"
                >
                  Parear
                </button>
              </div>
            </div>
          </div>

          <!-- Animation View if running or completed -->
          <div v-if="sessionState.phase === 'breeding_started' || sessionState.phase === 'animation_running' || sessionState.phase === 'completed'" class="my-2">
            <breeding-animation-canvas
              v-if="selectedSire && selectedDam"
              :sire-species="selectedSire.species"
              :sire-genome="selectedSire.genome"
              :dam-species="selectedDam.species"
              :dam-genome="selectedDam.genome"
              :offspring-genome="sessionState.producedEgg?.genome ?? null"
              :ownership="sessionState.ownership"
              :initial-scene="sessionState.animationSceneIndex"
              @scene-change="handleSceneChanged"
            />
          </div>

          <!-- Normal Selection & Compatibility Area -->
          <div v-else class="space-y-4">
            <!-- Selected Progenitors Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Local Dinosaur Selection -->
              <div
                class="p-4 border-2 rounded-2xl flex flex-col gap-3 transition-colors duration-500"
                :style="{
                  backgroundColor: theme.cardDarkBackground,
                  borderColor: localCreature ? theme.primaryColor : theme.borderSubtleColor
                }"
              >
                <div class="flex items-center justify-between">
                  <span
                    class="text-xs font-bold uppercase tracking-wider"
                    :style="{ color: theme.primaryColor }"
                  >
                    Seu Dinossauro
                  </span>
                  <span
                    v-if="localCreature"
                    class="text-xs font-mono px-2 py-0.5 rounded border"
                    :class="localCreature.genetics.sex === 'male' ? 'bg-sky-950/60 text-sky-300 border-sky-600/40' : 'bg-pink-950/60 text-pink-300 border-pink-600/40'"
                  >
                    {{ localCreature.genetics.sex === 'male' ? '♂ Macho' : '♀ Fêmea' }}
                  </span>
                </div>

                <!-- Selector dropdown -->
                <select
                  v-model="selectedLocalSpeciesId"
                  data-testid="local-dinosaur-select"
                  class="w-full border rounded-xl px-3 py-2 text-sm text-white font-bold transition-colors"
                  :style="{
                    backgroundColor: theme.cardBackground,
                    borderColor: theme.borderColor,
                    color: theme.primaryColor
                  }"
                  @change="handleSelectLocalCreature"
                >
                  <option
                    v-for="creature in availableCreatures"
                    :key="creature.speciesId"
                    :value="creature.speciesId"
                  >
                    {{ creature.name }} ({{ creature.genetics.sex === 'male' ? '♂' : '♀' }}) - {{ creature.stageLabel }} (Gen {{ creature.genetics.generation }})
                  </option>
                </select>

                <div
                  v-if="localCreature"
                  class="text-xs text-slate-300 space-y-1 p-2.5 rounded-xl border transition-colors"
                  :style="{
                    backgroundColor: theme.cardBackground,
                    borderColor: theme.borderSubtleColor
                  }"
                >
                  <div>Espécie: <strong class="text-white capitalize">{{ localCreature.name }}</strong></div>
                  <div>Estágio: <span class="capitalize font-semibold text-amber-300">{{ localCreature.stageLabel }}</span></div>
                  <div>Geração: <span class="font-bold" :style="{ color: theme.primaryColor }">Gen {{ localCreature.genetics.generation }}</span></div>
                  <div>Força: {{ localCreature.genetics.phenotype.attributes.strength }} | Defesa: {{ localCreature.genetics.phenotype.attributes.defense }}</div>
                </div>
              </div>

              <!-- Remote Partner Dinosaur -->
              <div
                class="p-4 border-2 rounded-2xl flex flex-col gap-3 transition-colors duration-500"
                :style="{
                  backgroundColor: theme.cardDarkBackground,
                  borderColor: remoteParticipant ? '#f472b6' : theme.borderSubtleColor
                }"
              >
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-pink-400 uppercase tracking-wider">Parceiro P2P</span>
                  <span
                    v-if="remoteParticipant"
                    class="text-xs font-mono px-2 py-0.5 rounded border"
                    :class="remoteParticipant.genome.sex === 'male' ? 'bg-sky-950/60 text-sky-300 border-sky-600/40' : 'bg-pink-950/60 text-pink-300 border-pink-600/40'"
                  >
                    {{ remoteParticipant.genome.sex === 'male' ? '♂ Macho' : '♀ Fêmea' }}
                  </span>
                </div>

                <div
                  v-if="remoteParticipant"
                  class="text-xs text-slate-300 space-y-1 p-3 rounded-xl flex-1 flex flex-col justify-center border transition-colors"
                  :style="{
                    backgroundColor: theme.cardBackground,
                    borderColor: theme.borderSubtleColor
                  }"
                >
                  <div class="font-bold text-white text-sm capitalize">{{ remoteParticipant.playerName }}</div>
                  <div>Espécie: <strong class="text-white capitalize">{{ remoteParticipant.characterId }}</strong></div>
                  <div>Geração: <span class="text-pink-300 font-bold">Gen {{ remoteParticipant.genome.generation }}</span></div>
                  <div class="text-[10px] text-emerald-400 font-bold mt-1">
                    {{ remoteParticipant.isReady ? '✓ Pronto para Reproduzir' : 'Aguardando confirmação...' }}
                  </div>
                </div>

                <div
                  v-else
                  class="text-xs text-slate-400 italic p-6 text-center border border-dashed rounded-xl flex-1 flex items-center justify-center transition-colors"
                  :style="{ borderColor: theme.borderSubtleColor }"
                >
                  Aguardando seleção do parceiro conectado...
                </div>
              </div>
            </div>

            <!-- Compatibility Analysis Card -->
            <div
              v-if="compatibilityResult"
              class="p-4 rounded-2xl border text-xs space-y-2.5 transition-colors duration-500"
              :class="compatibilityResult.compatible ? 'bg-emerald-950/20 border-emerald-600/40' : 'bg-rose-950/20 border-rose-600/40'"
            >
              <div class="flex items-center justify-between">
                <span
                  class="font-bold uppercase tracking-wider"
                  :class="compatibilityResult.compatible ? 'text-emerald-300' : 'text-rose-300'"
                >
                  {{ compatibilityResult.compatible ? '✓ Cruzamento Geneticamente Compatível' : '✕ Cruzamento Bloqueado' }}
                </span>
                <span
                  v-if="compatibilityResult.compatible"
                  class="px-2 py-0.5 rounded-full font-mono text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                >
                  Sinergia: {{ Math.round(compatibilityResult.elementalSynergy * 100) }}%
                </span>
              </div>

              <!-- Reasons List if incompatible -->
              <ul v-if="!compatibilityResult.compatible" class="list-disc pl-4 space-y-1 text-rose-200">
                <li v-for="(reason, rIdx) in compatibilityResult.reasons" :key="rIdx">
                  {{ reason }}
                </li>
              </ul>

              <!-- Projection preview if compatible -->
              <div v-else class="text-slate-300 flex items-center gap-2">
                <span>Possíveis filhotes:</span>
                <span
                  v-for="off in compatibilityResult.projectedOffspringSpeciesOptions"
                  :key="off"
                  class="px-2 py-0.5 rounded uppercase font-mono text-[10px] border"
                  :style="{
                    backgroundColor: theme.cardDarkBackground,
                    borderColor: theme.borderSubtleColor,
                    color: theme.primaryColor
                  }"
                >
                  {{ off }}
                </span>
              </div>
            </div>

            <!-- Action Confirm Button -->
            <div class="pt-2 flex justify-center">
              <button
                type="button"
                data-testid="confirm-breeding-btn"
                class="w-full sm:w-auto px-8 py-3 rounded-2xl text-sm font-black tracking-wide uppercase shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                :class="canConfirmBreeding ? 'text-white cursor-pointer hover:brightness-110 shadow-md' : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'"
                :style="canConfirmBreeding ? { backgroundColor: theme.primaryColor } : {}"
                :disabled="!canConfirmBreeding"
                @click="handleToggleReady"
              >
                <span>{{ isLocalReady ? '✓ Aguardando Parceiro...' : '💞 Confirmar & Iniciar Reprodução' }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- TAB 2: NURSERY (BERÇÁRIO DE OVOS) -->
        <div v-else-if="activeTab === 'nursery'" class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-bold text-amber-300">Ninho Genético & Ovos em Incubação</h2>
            <span class="text-xs text-slate-400 font-mono">{{ incubatorEggs.length }} ovo(s) no ninho</span>
          </div>

          <div
            v-if="incubatorEggs.length === 0"
            class="p-8 text-center border border-dashed rounded-2xl text-xs text-slate-400 space-y-2 transition-colors"
            :style="{
              backgroundColor: theme.cardDarkBackground,
              borderColor: theme.borderSubtleColor
            }"
          >
            <div class="text-3xl">🥚</div>
            <p class="font-bold text-amber-200">Nenhum ovo em incubação no momento.</p>
            <p>Realize um cruzamento no modo P2P para gerar novos descendentes com DNA exclusivo!</p>
          </div>

          <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              v-for="egg in incubatorEggs"
              :key="egg.id"
              class="p-4 border rounded-2xl space-y-3 shadow-md transition-colors"
              :style="{
                backgroundColor: theme.cardDarkBackground,
                borderColor: '#f59e0b'
              }"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="text-2xl">🥚</span>
                  <div>
                    <div class="font-black text-white capitalize text-sm">{{ egg.targetSpecies }}</div>
                    <div class="text-[10px] text-amber-300 font-mono">Geração: Gen {{ egg.genome.generation }}</div>
                  </div>
                </div>
                <span
                  class="px-2 py-0.5 rounded text-[10px] font-bold border"
                  :class="egg.genome.sex === 'male' ? 'bg-sky-500/20 text-sky-300 border-sky-500/30' : 'bg-pink-500/20 text-pink-300 border-pink-500/30'"
                >
                  {{ egg.genome.sex === 'male' ? '♂ Macho' : '♀ Fêmea' }}
                </span>
              </div>

              <!-- Incubation Progress Bar -->
              <div class="space-y-1">
                <div class="flex justify-between text-[10px] text-slate-400">
                  <span>Incubação</span>
                  <span>{{ Math.round((egg.incubationProgress / egg.maxIncubationHours) * 100) }}%</span>
                </div>
                <div class="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    class="h-full bg-amber-400 transition-all duration-300"
                    :style="{ width: `${Math.min(100, (egg.incubationProgress / egg.maxIncubationHours) * 100)}%` }"
                  ></div>
                </div>
              </div>

              <!-- Hatch Action -->
              <button
                type="button"
                class="w-full py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95"
                :class="egg.isReadyToHatch || egg.incubationProgress >= egg.maxIncubationHours ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md animate-bounce' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'"
                @click="handleHatchEgg(egg.id)"
              >
                {{ egg.isReadyToHatch || egg.incubationProgress >= egg.maxIncubationHours ? '✨ Chocar Ovo Agora!' : 'Aqueça e Cuide do Ovo' }}
              </button>
            </div>
          </div>
        </div>

        <!-- TAB 3: LINEAGE -->
        <div v-else-if="activeTab === 'lineage'" class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-bold text-sky-300">Histórico de Linhagens & Reproduções</h2>
            <span class="text-xs text-slate-400 font-mono">{{ genealogyArchive.length }} cruza(s) registrada(s)</span>
          </div>

          <div
            v-if="genealogyArchive.length === 0"
            class="p-8 text-center border border-dashed rounded-2xl text-xs text-slate-400 space-y-2 transition-colors"
            :style="{
              backgroundColor: theme.cardDarkBackground,
              borderColor: theme.borderSubtleColor
            }"
          >
            <div class="text-3xl">📜</div>
            <p class="font-bold text-sky-200">Nenhum registro genealógico arquivado.</p>
            <p>Quando você e seu parceiro realizarem uma reprodução, o histórico genealógico será arquivado permanentemente aqui.</p>
          </div>

          <div v-else class="space-y-2.5">
            <div
              v-for="(rec, idx) in genealogyArchive"
              :key="idx"
              class="p-3 border rounded-xl text-xs flex items-center justify-between transition-colors"
              :style="{
                backgroundColor: theme.cardDarkBackground,
                borderColor: theme.borderSubtleColor
              }"
            >
              <div>
                <div class="font-bold text-white capitalize">
                  {{ rec.sireSpecies }} (♂) × {{ rec.damSpecies }} (♀)
                </div>
                <div class="text-[10px] text-slate-400 font-mono">
                  Descendente: <span class="font-bold capitalize" :style="{ color: theme.primaryColor }">{{ rec.offspringSpecies }}</span> • {{ rec.mutationCount }} mutação(ões)
                </div>
              </div>
              <span
                class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                :class="rec.isLocalWinner ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'"
              >
                {{ rec.isLocalWinner ? 'Ovo Ganho' : 'Arquivado' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import type { CharacterId, CharacterLifeStage, CreatureTheme } from '@/domains/characters/types';
import { CHARACTER_SPECIES_REGISTRY } from '@/domains/characters/domain/character-registry';
import { generateCreatureTheme } from '@/domains/characters/domain/creature-theme-engine';
import type { GameSaveSnapshot } from '@/domains/persistence/types';
import type { BreedingSessionState, DiscoveredPeer, NearbyConnectionStatus } from '@/domains/breeding/types';
import { BreedingService } from '@/domains/breeding/application/breeding-service';
import { NearbyConnectionsP2PAdapter } from '@/domains/breeding/infrastructure/nearby-connections-adapter';
import { hatchBredEggUseCase, recordBreedingResultUseCase } from '@/domains/persistence/application/game-session-service';
import BreedingAnimationCanvas from './BreedingAnimationCanvas.vue';

const props = withDefaults(
  defineProps<{
    saveSnapshot: GameSaveSnapshot;
    creatureTheme?: CreatureTheme;
  }>(),
  {
    creatureTheme: undefined
  }
);

const emit = defineEmits<{
  (e: 'update-save', snapshot: GameSaveSnapshot): void;
}>();

const fallbackTheme = computed<CreatureTheme>(() => {
  const activeId = props.saveSnapshot.activeCharacterId;
  const species = CHARACTER_SPECIES_REGISTRY[activeId];
  if (species) {
    return generateCreatureTheme(
      species.visualTraits.primaryColors.base,
      species.visualTraits.primaryColors.highlight
    );
  }
  return generateCreatureTheme('#0284c7');
});

const theme = computed<CreatureTheme>(() => props.creatureTheme ?? fallbackTheme.value);

const activeTab = ref<'breeding' | 'nursery' | 'lineage'>('breeding');
const roomChannelCode = ref('SALA-777');

const transport = new NearbyConnectionsP2PAdapter({
  playerName: 'Treinador Pixel'
});
const breedingService = new BreedingService(transport);
const sessionState = ref<BreedingSessionState>(breedingService.getState());
const nearbyStatus = ref<NearbyConnectionStatus>(transport.getConnectionStatus());
const discoveredPeers = ref<readonly DiscoveredPeer[]>([]);
const hasPersistedResult = ref(false);

const unsubscribeStatus = transport.onStatusChange((s) => {
  nearbyStatus.value = s;
});
const unsubscribePeers = transport.onPeersChange((peers) => {
  discoveredPeers.value = peers;
});

const unsubscribeService = breedingService.subscribe((state) => {
  sessionState.value = state;
});

const isConnected = computed(() => Boolean(sessionState.value.remotePeerId));
const isLocalReady = computed(() => Boolean(sessionState.value.localParticipant?.isReady));
const compatibilityResult = computed(() => sessionState.value.compatibility);
const remoteParticipant = computed(() => sessionState.value.remoteParticipant);

const incubatorEggs = computed(() => props.saveSnapshot.incubator ?? []);
const genealogyArchive = computed(() => props.saveSnapshot.genealogyArchive ?? []);

const availableCreatures = computed(() => {
  const result: Array<{
    speciesId: CharacterId;
    name: string;
    stage: CharacterLifeStage;
    stageLabel: string;
    genetics: import('@/domains/genetics/types').CreatureGenome;
  }> = [];

  const stageLabels: Record<CharacterLifeStage, string> = {
    ovo: 'Ovo',
    baby: 'Bebê',
    crianca: 'Criança',
    'pre-adolescente': 'Pré-Adolescente',
    adolescente: 'Adolescente',
    adulto: 'Adulto'
  };

  for (const [id, record] of Object.entries(props.saveSnapshot.characters)) {
    if (record.runtime.healthCondition !== 'deceased' && record.genetics) {
      const species = CHARACTER_SPECIES_REGISTRY[id as CharacterId];
      const displayName = record.runtime.customNickname || species?.displayName || id;
      result.push({
        speciesId: id as CharacterId,
        name: displayName,
        stage: record.runtime.currentStage,
        stageLabel: stageLabels[record.runtime.currentStage] ?? record.runtime.currentStage,
        genetics: record.genetics
      });
    }
  }

  // Ensure active character is first
  const activeId = props.saveSnapshot.activeCharacterId;
  result.sort((a, b) => {
    if (a.speciesId === activeId) return -1;
    if (b.speciesId === activeId) return 1;
    return a.name.localeCompare(b.name);
  });

  return result;
});

const selectedLocalSpeciesId = ref<CharacterId | null>(
  props.saveSnapshot.activeCharacterId ?? availableCreatures.value[0]?.speciesId ?? null
);

const localCreature = computed(() => {
  if (!selectedLocalSpeciesId.value) return null;
  const rec = props.saveSnapshot.characters[selectedLocalSpeciesId.value];
  if (!rec || !rec.genetics) return null;
  const species = CHARACTER_SPECIES_REGISTRY[selectedLocalSpeciesId.value];
  const stageLabels: Record<CharacterLifeStage, string> = {
    ovo: 'Ovo',
    baby: 'Bebê',
    crianca: 'Criança',
    'pre-adolescente': 'Pré-Adolescente',
    adolescente: 'Adolescente',
    adulto: 'Adulto'
  };
  return {
    speciesId: selectedLocalSpeciesId.value,
    name: rec.runtime.customNickname || species?.displayName || selectedLocalSpeciesId.value,
    stage: rec.runtime.currentStage,
    stageLabel: stageLabels[rec.runtime.currentStage] ?? rec.runtime.currentStage,
    genetics: rec.genetics
  };
});

function handleSelectLocalCreature(): void {
  if (localCreature.value) {
    breedingService.selectLocalCreature(localCreature.value.speciesId, localCreature.value.genetics);
  }
}

watch(
  () => props.saveSnapshot.activeCharacterId,
  (newId) => {
    if (newId) {
      selectedLocalSpeciesId.value = newId;
      handleSelectLocalCreature();
    }
  },
  { immediate: true }
);

watch(
  availableCreatures,
  (list) => {
    if (!selectedLocalSpeciesId.value && list.length > 0) {
      selectedLocalSpeciesId.value = props.saveSnapshot.activeCharacterId ?? list[0]?.speciesId ?? null;
      handleSelectLocalCreature();
    }
  },
  { immediate: true }
);

const selectedSire = computed(() => {
  const local = sessionState.value.localParticipant;
  const remote = sessionState.value.remoteParticipant;
  if (!local || !remote) return null;
  return local.genome.sex === 'male'
    ? { species: local.characterId, genome: local.genome }
    : { species: remote.characterId, genome: remote.genome };
});

const selectedDam = computed(() => {
  const local = sessionState.value.localParticipant;
  const remote = sessionState.value.remoteParticipant;
  if (!local || !remote) return null;
  return local.genome.sex === 'female'
    ? { species: local.characterId, genome: local.genome }
    : { species: remote.characterId, genome: remote.genome };
});

const canConfirmBreeding = computed(() => {
  return (
    isConnected.value &&
    Boolean(localCreature.value) &&
    Boolean(remoteParticipant.value) &&
    Boolean(compatibilityResult.value?.compatible)
  );
});

const connectionStatusLabel = computed(() => {
  if (sessionState.value.phase === 'discovering' || nearbyStatus.value === 'discovering') {
    return 'Procurando parceiros próximos (Nearby)...';
  }
  if (nearbyStatus.value === 'player_found') {
    return 'Jogador encontrado!';
  }
  if (
    nearbyStatus.value === 'connecting' ||
    nearbyStatus.value === 'connection_requested' ||
    nearbyStatus.value === 'connection_pending'
  ) {
    return 'Conectando ao dispositivo...';
  }
  if (nearbyStatus.value === 'authenticating') {
    return 'Autenticando sessão segura...';
  }
  if (
    sessionState.value.phase === 'pairing' ||
    isConnected.value ||
    nearbyStatus.value === 'connected'
  ) {
    return 'Parceiro Conectado!';
  }
  if (sessionState.value.phase === 'cancelled') return 'Cancelado';
  if (sessionState.value.phase === 'failed' || nearbyStatus.value === 'failed') return 'Falha na conexão';
  return 'Aguardando conexão';
});

async function handleConnect(): Promise<void> {
  if (!selectedLocalSpeciesId.value) {
    selectedLocalSpeciesId.value = props.saveSnapshot.activeCharacterId ?? availableCreatures.value[0]?.speciesId ?? null;
  }
  await breedingService.openDiscovery(roomChannelCode.value);
  if (localCreature.value) {
    breedingService.selectLocalCreature(localCreature.value.speciesId, localCreature.value.genetics);
  }
}

async function handleConnectToPeer(endpointId: string): Promise<void> {
  if (transport.connectToPeer) {
    await transport.connectToPeer(endpointId);
    if (localCreature.value) {
      breedingService.selectLocalCreature(localCreature.value.speciesId, localCreature.value.genetics);
    }
  }
}

function handleToggleReady(): void {
  breedingService.setLocalReady(!isLocalReady.value);
}

function handleSceneChanged(sceneIndex: number): void {
  breedingService.setAnimationScene(sceneIndex);
}

function handleHatchEgg(eggId: string): void {
  const egg = incubatorEggs.value.find((e) => e.id === eggId);
  if (!egg) return;

  const nextSnapshot = hatchBredEggUseCase(props.saveSnapshot, eggId, Date.now());
  emit('update-save', nextSnapshot);
}

watch(
  () => sessionState.value.phase,
  (phase) => {
    if (phase === 'completed' && !hasPersistedResult.value && sessionState.value.historyRecord) {
      hasPersistedResult.value = true;
      const updated = recordBreedingResultUseCase(
        props.saveSnapshot,
        sessionState.value.historyRecord,
        sessionState.value.producedEgg,
        Date.now()
      );
      emit('update-save', updated);
    }
  }
);

onMounted(() => {
  if (!selectedLocalSpeciesId.value) {
    selectedLocalSpeciesId.value = props.saveSnapshot.activeCharacterId ?? availableCreatures.value[0]?.speciesId ?? null;
  }
  if (localCreature.value) {
    breedingService.selectLocalCreature(localCreature.value.speciesId, localCreature.value.genetics);
  }
});

onBeforeUnmount(() => {
  unsubscribeStatus();
  unsubscribePeers();
  unsubscribeService();
  breedingService.dispose();
  transport.disconnect();
});
</script>
