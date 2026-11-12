<template>
  <section
    aria-label="Árvore Genealógica"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none"
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="genealogy-modal-title"
      class="relative w-full max-w-xl max-h-[90vh] bg-slate-900 border-2 border-indigo-700/60 rounded-3xl shadow-2xl flex flex-col overflow-hidden font-sans text-slate-100"
    >
      <!-- Modal Header -->
      <div class="px-5 py-4 bg-slate-950/80 border-b border-indigo-800/40 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <span class="text-xl">🧬</span>
          <div>
            <h2 id="genealogy-modal-title" class="text-base font-black tracking-wide text-indigo-300">Árvore Genealógica</h2>
            <p class="text-xs text-slate-400">Linhagem biológica e ancestrais genéticos</p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Fechar árvore genealógica"
          class="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 flex items-center justify-center font-bold text-sm transition-all"
          @click="$emit('close')"
        >
          ✕
        </button>
      </div>

      <!-- Modal Body (Tree View) -->
      <div class="p-6 overflow-y-auto space-y-6">
        <!-- Target Creature Card -->
        <div class="bg-gradient-to-r from-indigo-950/80 via-slate-800 to-indigo-950/80 border-2 border-indigo-500/50 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-xl bg-slate-950/80 border border-indigo-400/30 flex items-center justify-center text-2xl font-bold">
              {{ formatSexSymbol(targetGenome.sex) }}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-black text-lg text-white capitalize">{{ targetSpeciesName }}</span>
                <span
                  class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                  :class="targetGenome.sex === 'male' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'bg-pink-500/20 text-pink-300 border border-pink-500/40'"
                >
                  {{ formatSexLabel(targetGenome.sex) }}
                </span>
              </div>
              <div class="text-xs text-indigo-300 font-mono mt-0.5">
                Geração: Gen {{ targetGenome.generation }} • {{ targetGenome.mutations.length }} mutação(ões)
              </div>
              <div class="text-[10px] text-slate-400 font-mono truncate max-w-[240px]">
                UUID: {{ targetGenome.genomeId }}
              </div>
            </div>
          </div>
        </div>

        <!-- Connection Branch Indicator -->
        <div class="flex flex-col items-center -my-2">
          <div class="w-0.5 h-6 bg-indigo-500/40"></div>
          <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-indigo-950 border border-indigo-500/30 rounded-full text-indigo-300">
            Progenitores (1º Grau)
          </span>
          <div class="w-0.5 h-4 bg-indigo-500/40"></div>
        </div>

        <!-- Parents Row -->
        <div v-if="targetGenome.parents" class="grid grid-cols-2 gap-4">
          <!-- Sire (Father) -->
          <div class="bg-slate-950/70 border border-sky-500/40 rounded-xl p-3 flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-sky-400 flex items-center gap-1">
                <span>♂</span> Pai (Sire)
              </span>
              <span class="text-[10px] text-slate-400 font-mono">Gen {{ Math.max(1, targetGenome.generation - 1) }}</span>
            </div>
            <div class="text-sm font-black text-white capitalize truncate">
              {{ targetGenome.parents.sireName }}
            </div>
            <div class="text-[10px] text-slate-400 font-mono truncate">
              ID: {{ targetGenome.parents.sireGenomeId }}
            </div>
          </div>

          <!-- Dam (Mother) -->
          <div class="bg-slate-950/70 border border-pink-500/40 rounded-xl p-3 flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-pink-400 flex items-center gap-1">
                <span>♀</span> Mãe (Dam)
              </span>
              <span class="text-[10px] text-slate-400 font-mono">Gen {{ Math.max(1, targetGenome.generation - 1) }}</span>
            </div>
            <div class="text-sm font-black text-white capitalize truncate">
              {{ targetGenome.parents.damName }}
            </div>
            <div class="text-[10px] text-slate-400 font-mono truncate">
              ID: {{ targetGenome.parents.damGenomeId }}
            </div>
          </div>
        </div>

        <!-- Founder / Genesis Generation fallback -->
        <div v-else class="text-center p-6 bg-slate-950/40 border border-dashed border-indigo-800/50 rounded-2xl text-xs text-slate-400 space-y-1">
          <p class="font-bold text-indigo-300">Linhagem Primordial (Geração Fundadora)</p>
          <p>Este dinossauro é um progenitor de 1ª Geração original e não descende de cruzamentos prévios.</p>
        </div>

        <!-- Mutations Log List -->
        <div v-if="targetGenome.mutations.length > 0" class="space-y-2">
          <h3 class="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <span>✨</span> Mutações Genéticas Ativas
          </h3>
          <div
            v-for="(mut, i) in targetGenome.mutations"
            :key="i"
            class="p-2.5 rounded-xl bg-amber-950/20 border border-amber-600/30 text-xs flex items-center justify-between"
          >
            <div>
              <div class="font-bold text-amber-200 capitalize">{{ mut.description }}</div>
              <div class="text-[10px] text-slate-400">Característica: {{ mut.trait }} • Multiplicador: {{ mut.multiplier }}x</div>
            </div>
            <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
              {{ mut.rarity }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CreatureGenome, BiologicalSex } from '@/domains/genetics/types';
import { CHARACTER_SPECIES_REGISTRY } from '@/domains/characters/domain/character-registry';
import { formatBiologicalSexLabel, formatBiologicalSexSymbol } from '@/domains/genetics/domain/sex-determination-engine';

const props = defineProps<{
  targetGenome: CreatureGenome;
}>();

defineEmits<{
  (e: 'close'): void;
}>();

const targetSpeciesName = computed(() => {
  return CHARACTER_SPECIES_REGISTRY[props.targetGenome.species]?.displayName ?? props.targetGenome.species;
});

function formatSexLabel(sex: BiologicalSex): string {
  return formatBiologicalSexLabel(sex);
}

function formatSexSymbol(sex: BiologicalSex): string {
  return formatBiologicalSexSymbol(sex);
}
</script>
