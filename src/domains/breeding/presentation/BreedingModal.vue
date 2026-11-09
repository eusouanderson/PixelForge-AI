<template>
  <div class="space-y-3 font-sans text-slate-100 select-none">
    <div class="w-full bg-slate-900/90 border border-indigo-700/50 rounded-2xl shadow-lg flex flex-col overflow-hidden">
      <!-- Section Header -->
      <div class="px-4 py-3 bg-slate-950/90 border-b border-indigo-800/40 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <span class="text-xl">🧬</span>
          <div>
            <h2 class="text-sm sm:text-base font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-sky-300 to-pink-300">
              PixelForge Genetics & Reprodução
            </h2>
            <p class="text-[10px] text-slate-400">Multiplayer P2P Offline • Hereditariedade • Consenso</p>
          </div>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex border-b border-indigo-900/40 bg-slate-950/40 px-3 pt-2 gap-1 text-xs font-bold overflow-x-auto">
        <button
          type="button"
          class="px-3 py-2 rounded-t-xl transition-all border-b-2"
          :class="activeTab === 'breeding' ? 'border-indigo-400 text-indigo-300 bg-slate-900' : 'border-transparent text-slate-400 hover:text-slate-200'"
          @click="activeTab = 'breeding'"
        >
          💞 Reprodução P2P
        </button>
        <button
          type="button"
          class="px-3 py-2 rounded-t-xl transition-all border-b-2 relative"
          :class="activeTab === 'nursery' ? 'border-amber-400 text-amber-300 bg-slate-900' : 'border-transparent text-slate-400 hover:text-slate-200'"
          @click="activeTab = 'nursery'"
        >
          🥚 Berçário de Ovos
          <span v-if="incubatorEggs.length > 0" class="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-amber-500 text-slate-950 font-black">
            {{ incubatorEggs.length }}
          </span>
        </button>
        <button
          type="button"
          class="px-3 py-2 rounded-t-xl transition-all border-b-2"
          :class="activeTab === 'lineage' ? 'border-sky-400 text-sky-300 bg-slate-900' : 'border-transparent text-slate-400 hover:text-slate-200'"
          @click="activeTab = 'lineage'"
        >
          🌳 Árvore Genealógica
        </button>
      </div>

      <!-- Tab Content Area -->
      <div class="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
        <!-- TAB 1: BREEDING -->
        <div v-if="activeTab === 'breeding'" class="space-y-4">
          <!-- Connection Bar -->
          <div class="p-3 bg-slate-950/60 border border-indigo-800/40 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
            <div class="flex items-center gap-2">
              <span
                class="w-2.5 h-2.5 rounded-full"
                :class="isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'"
              ></span>
              <span class="text-slate-300 font-mono">
                Status: <strong class="text-white">{{ connectionStatusLabel }}</strong>
              </span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-slate-400">Canal / Sala:</span>
              <input
                v-model="roomChannelCode"
                type="text"
                class="w-28 px-2 py-1 bg-slate-900 border border-indigo-700/50 rounded-lg text-indigo-300 font-mono text-center text-xs"
                placeholder="SALA-123"
              />
              <button
                type="button"
                class="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold rounded-lg text-xs"
                @click="handleConnect"
              >
                Conectar
              </button>
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
              <div class="p-4 bg-slate-950/70 border-2 rounded-2xl flex flex-col gap-3" :class="localCreature ? 'border-sky-500/50' : 'border-slate-800'">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-sky-400 uppercase tracking-wider">Seu Dinossauro</span>
                  <span v-if="localCreature" class="text-xs font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-600/30">
                    {{ localCreature.genetics.sex === 'male' ? '♂ Macho' : '♀ Fêmea' }}
                  </span>
                </div>

                <!-- Selector dropdown -->
                <select
                  v-model="selectedLocalSpeciesId"
                  class="w-full bg-slate-900 border border-indigo-700/50 rounded-xl px-3 py-2 text-sm text-white font-bold"
                  @change="handleSelectLocalCreature"
                >
                  <option v-for="creature in adultCreatures" :key="creature.speciesId" :value="creature.speciesId">
                    {{ creature.name }} ({{ creature.genetics.sex === 'male' ? '♂' : '♀' }}) - Gen {{ creature.genetics.generation }}
                  </option>
                </select>

                <div v-if="localCreature" class="text-xs text-slate-300 space-y-1 bg-slate-900/60 p-2.5 rounded-xl">
                  <div>Espécie: <strong class="text-white capitalize">{{ localCreature.name }}</strong></div>
                  <div>Geração: <span class="text-sky-300 font-bold">Gen {{ localCreature.genetics.generation }}</span></div>
                  <div>Força: {{ localCreature.genetics.phenotype.attributes.strength }} | Defesa: {{ localCreature.genetics.phenotype.attributes.defense }}</div>
                </div>
              </div>

              <!-- Remote Partner Dinosaur -->
              <div class="p-4 bg-slate-950/70 border-2 rounded-2xl flex flex-col gap-3" :class="remoteParticipant ? 'border-pink-500/50' : 'border-slate-800'">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-pink-400 uppercase tracking-wider">Parceiro P2P</span>
                  <span v-if="remoteParticipant" class="text-xs font-mono px-2 py-0.5 rounded bg-pink-950 text-pink-300 border border-pink-600/30">
                    {{ remoteParticipant.genome.sex === 'male' ? '♂ Macho' : '♀ Fêmea' }}
                  </span>
                </div>

                <div v-if="remoteParticipant" class="text-xs text-slate-300 space-y-1 bg-slate-900/60 p-3 rounded-xl flex-1 flex flex-col justify-center">
                  <div class="font-bold text-white text-sm capitalize">{{ remoteParticipant.playerName }}</div>
                  <div>Espécie: <strong class="text-white capitalize">{{ remoteParticipant.characterId }}</strong></div>
                  <div>Geração: <span class="text-pink-300 font-bold">Gen {{ remoteParticipant.genome.generation }}</span></div>
                  <div class="text-[10px] text-emerald-400 font-bold mt-1">
                    {{ remoteParticipant.isReady ? '✓ Pronto para Reproduzir' : 'Aguardando confirmação...' }}
                  </div>
                </div>

                <div v-else class="text-xs text-slate-500 italic p-6 text-center border border-dashed border-slate-800 rounded-xl flex-1 flex items-center justify-center">
                  Aguardando seleção do parceiro conectado...
                </div>
              </div>
            </div>

            <!-- Compatibility Analysis Card -->
            <div v-if="compatibilityResult" class="p-4 rounded-2xl border text-xs space-y-2.5" :class="compatibilityResult.compatible ? 'bg-emerald-950/20 border-emerald-600/40' : 'bg-rose-950/20 border-rose-600/40'">
              <div class="flex items-center justify-between">
                <span class="font-bold uppercase tracking-wider" :class="compatibilityResult.compatible ? 'text-emerald-300' : 'text-rose-300'">
                  {{ compatibilityResult.compatible ? '✓ Cruzamento Geneticamente Compatível' : '✕ Cruzamento Bloqueado' }}
                </span>
                <span v-if="compatibilityResult.compatible" class="px-2 py-0.5 rounded-full font-mono text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
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
                <span v-for="off in compatibilityResult.projectedOffspringSpeciesOptions" :key="off" class="px-2 py-0.5 rounded bg-indigo-950 border border-indigo-700 text-indigo-300 uppercase font-mono text-[10px]">
                  {{ off }}
                </span>
              </div>
            </div>

            <!-- Action Confirm Button -->
            <div class="pt-2 flex justify-center">
              <button
                type="button"
                class="w-full sm:w-auto px-8 py-3 rounded-2xl text-sm font-black tracking-wide uppercase shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                :class="canConfirmBreeding ? 'bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white cursor-pointer' : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'"
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

          <div v-if="incubatorEggs.length === 0" class="p-8 text-center bg-slate-950/40 border border-dashed border-amber-900/40 rounded-2xl text-xs text-slate-400 space-y-2">
            <div class="text-3xl">🥚</div>
            <p class="font-bold text-amber-200">Nenhum ovo em incubação no momento.</p>
            <p>Realize um cruzamento no modo P2P para gerar novos descendentes com DNA exclusivo!</p>
          </div>

          <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              v-for="egg in incubatorEggs"
              :key="egg.id"
              class="p-4 bg-slate-950/80 border border-amber-500/40 rounded-2xl space-y-3 shadow-md"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="text-2xl">🥚</span>
                  <div>
                    <div class="font-black text-white capitalize text-sm">{{ egg.targetSpecies }}</div>
                    <div class="text-[10px] text-amber-300 font-mono">Geração: Gen {{ egg.genome.generation }}</div>
                  </div>
                </div>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold" :class="egg.genome.sex === 'male' ? 'bg-sky-500/20 text-sky-300' : 'bg-pink-500/20 text-pink-300'">
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

          <div v-if="genealogyArchive.length === 0" class="p-8 text-center bg-slate-950/40 border border-dashed border-sky-900/40 rounded-2xl text-xs text-slate-400 space-y-2">
            <div class="text-3xl">📜</div>
            <p class="font-bold text-sky-200">Nenhum registro genealógico arquivado.</p>
            <p>Quando você e seu parceiro realizarem uma reprodução, o histórico genealógico será arquivado permanentemente aqui.</p>
          </div>

          <div v-else class="space-y-2.5">
            <div
              v-for="(rec, idx) in genealogyArchive"
              :key="idx"
              class="p-3 bg-slate-950/70 border border-indigo-800/40 rounded-xl text-xs flex items-center justify-between"
            >
              <div>
                <div class="font-bold text-white capitalize">
                  {{ rec.sireSpecies }} (♂) × {{ rec.damSpecies }} (♀)
                </div>
                <div class="text-[10px] text-slate-400 font-mono">
                  Descendente: <span class="text-indigo-300 font-bold capitalize">{{ rec.offspringSpecies }}</span> • {{ rec.mutationCount }} mutação(ões)
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
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import type { CharacterId } from '@/domains/characters/types';
import type { GameSaveSnapshot } from '@/domains/persistence/types';
import type { BreedingSessionState } from '@/domains/breeding/types';
import { BreedingService } from '@/domains/breeding/application/breeding-service';
import { BroadcastChannelP2PAdapter } from '@/domains/breeding/infrastructure/p2p-channel-adapter';
import { hatchBredEggUseCase } from '@/domains/persistence/application/game-session-service';
import BreedingAnimationCanvas from './BreedingAnimationCanvas.vue';

const props = defineProps<{
  saveSnapshot: GameSaveSnapshot;
}>();

const emit = defineEmits<{
  (e: 'update-save', snapshot: GameSaveSnapshot): void;
}>();

const activeTab = ref<'breeding' | 'nursery' | 'lineage'>('breeding');
const roomChannelCode = ref('SALA-777');

const transport = new BroadcastChannelP2PAdapter();
const breedingService = new BreedingService(transport);
const sessionState = ref<BreedingSessionState>(breedingService.getState());

const unsubscribeService = breedingService.subscribe((state) => {
  sessionState.value = state;
});

const isConnected = computed(() => Boolean(sessionState.value.remotePeerId));
const isLocalReady = computed(() => Boolean(sessionState.value.localParticipant?.isReady));
const compatibilityResult = computed(() => sessionState.value.compatibility);
const remoteParticipant = computed(() => sessionState.value.remoteParticipant);

const incubatorEggs = computed(() => props.saveSnapshot.incubator ?? []);
const genealogyArchive = computed(() => props.saveSnapshot.genealogyArchive ?? []);

const adultCreatures = computed(() => {
  const result: Array<{ speciesId: CharacterId; name: string; genetics: import('@/domains/genetics/types').CreatureGenome }> = [];
  for (const [id, record] of Object.entries(props.saveSnapshot.characters)) {
    if (record.runtime.currentStage === 'adulto' && record.runtime.healthCondition !== 'deceased') {
      result.push({
        speciesId: id as CharacterId,
        name: record.runtime.customNickname || id,
        genetics: record.genetics
      });
    }
  }
  return result;
});

const selectedLocalSpeciesId = ref<CharacterId | null>(adultCreatures.value[0]?.speciesId ?? null);

const localCreature = computed(() => {
  if (!selectedLocalSpeciesId.value) return null;
  const rec = props.saveSnapshot.characters[selectedLocalSpeciesId.value];
  if (!rec) return null;
  return {
    speciesId: selectedLocalSpeciesId.value,
    name: rec.runtime.customNickname || selectedLocalSpeciesId.value,
    genetics: rec.genetics
  };
});

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
  if (sessionState.value.phase === 'discovering') return 'Procurando parceiro...';
  if (sessionState.value.phase === 'pairing' || isConnected.value) return 'Parceiro Conectado!';
  if (sessionState.value.phase === 'cancelled') return 'Cancelado';
  if (sessionState.value.phase === 'failed') return 'Falha na conexão';
  return 'Aguardando conexão';
});

async function handleConnect(): Promise<void> {
  await breedingService.openDiscovery(roomChannelCode.value);
  if (localCreature.value) {
    breedingService.selectLocalCreature(localCreature.value.speciesId, localCreature.value.genetics);
  }
}

function handleSelectLocalCreature(): void {
  if (localCreature.value) {
    breedingService.selectLocalCreature(localCreature.value.speciesId, localCreature.value.genetics);
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

onMounted(() => {
  if (localCreature.value) {
    breedingService.selectLocalCreature(localCreature.value.speciesId, localCreature.value.genetics);
  }
});

onBeforeUnmount(() => {
  unsubscribeService();
  breedingService.dispose();
});
</script>
