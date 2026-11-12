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
            v-if="activeIncubatorEggs.length > 0"
            class="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-amber-500 text-slate-950 font-black"
          >
            {{ activeIncubatorEggs.length }}
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
              <button
                type="button"
                data-testid="p2p-logs-toggle-btn"
                class="px-2 py-1 rounded-lg border text-[11px] font-mono text-slate-300 hover:text-white transition"
                :style="{
                  backgroundColor: theme.cardBackground,
                  borderColor: showDiagnosticLogs ? theme.primaryColor : theme.borderSubtleColor
                }"
                @click="showDiagnosticLogs = !showDiagnosticLogs"
              >
                📋 Logs ({{ diagnosticLogs.length }})
              </button>
            </div>
          </div>

          <!-- Collapsible P2P Live Diagnostic Logs -->
          <div
            v-if="showDiagnosticLogs"
            data-testid="p2p-diagnostic-logs"
            class="p-3 rounded-2xl border text-[10px] font-mono space-y-2 transition-colors"
            :style="{
              backgroundColor: theme.cardDarkBackground,
              borderColor: theme.borderSubtleColor
            }"
          >
            <div class="flex items-center justify-between text-slate-400">
              <span class="font-bold text-slate-200">
                🔍 Telemetria P2P ({{ transport.localPeerId.slice(0, 12) }} · fase: {{ sessionState.phase }})
              </span>
              <button
                type="button"
                data-testid="p2p-copy-logs-btn"
                class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                @click="handleCopyLogs"
              >
                {{ copiedLogs ? '✓ Copiado' : 'Copiar' }}
              </button>
            </div>
            <div class="max-h-36 overflow-y-auto space-y-1 bg-slate-950/70 p-2 rounded-xl border border-slate-800">
              <div v-if="diagnosticLogs.length === 0" class="text-slate-500 italic">
                Nenhum evento P2P registrado ainda. Toque em Conectar.
              </div>
              <div
                v-for="(entry, idx) in diagnosticLogs"
                :key="idx"
                :class="
                  entry.level === 'error'
                    ? 'text-rose-400'
                    : entry.level === 'warn'
                      ? 'text-amber-300'
                      : 'text-emerald-300'
                "
              >
                [{{ formatLogTime(entry.timestampMs) }}] {{ entry.message }}
              </div>
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
                  data-testid="peer-pair-btn"
                  class="px-2.5 py-1 rounded-lg text-xs font-bold text-white shadow-sm transition hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  :style="{ backgroundColor: theme.primaryColor }"
                  :disabled="isPairingWithPeer(peer.endpointId)"
                  @click="handleConnectToPeer(peer.endpointId)"
                >
                  {{ isPairingWithPeer(peer.endpointId) ? 'Pareando...' : 'Parear' }}
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
                  v-model="selectedLocalCreatureId"
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
                    :key="creature.creatureId"
                    :value="creature.creatureId"
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
        <div v-else-if="activeTab === 'nursery'" data-testid="nursery-tab-panel" class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-bold text-amber-300">Ninho Genético & Incubadora de Ovos</h2>
            <span class="text-xs text-slate-400 font-mono">
              {{ activeIncubatorEggs.length }} ativo(s) · {{ hatchedIncubatorEggs.length }} eclodido(s)
            </span>
          </div>

          <div
            v-if="nurseryFeedback"
            data-testid="nursery-feedback-banner"
            class="px-3 py-2 rounded-xl border border-amber-500/40 bg-amber-950/30 text-amber-200 text-xs"
          >
            {{ nurseryFeedback }}
          </div>

          <!-- Newborn Celebration Card after Hatching -->
          <div
            v-if="recentlyHatchedInfo"
            data-testid="hatch-celebration-card"
            class="p-4 rounded-2xl border-2 border-emerald-400 bg-emerald-950/30 space-y-3 shadow-lg"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <div
                  class="w-12 h-12 rounded-xl border border-emerald-400/50 flex items-center justify-center text-2xl shadow-inner"
                  :style="{ backgroundColor: recentlyHatchedInfo.colors.base }"
                >
                  🐣
                </div>
                <div>
                  <div class="text-xs font-bold uppercase text-emerald-300">Novo Filhote na Coleção!</div>
                  <div class="text-base font-black text-white capitalize">
                    {{ recentlyHatchedInfo.displayName }}
                  </div>
                  <div class="text-[11px] text-slate-300 font-mono">
                    Fase: Baby · Gen {{ recentlyHatchedInfo.generation }} ·
                    {{ recentlyHatchedInfo.sex === 'male' ? '♂ Macho' : '♀ Fêmea' }}
                  </div>
                </div>
              </div>
              <button
                type="button"
                data-testid="go-to-hatched-baby-btn"
                class="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black uppercase shadow-md transition active:scale-95"
                @click="handleFocusHatchedCreature(recentlyHatchedInfo.creatureId)"
              >
                Cuidar do Filhote
              </button>
            </div>
            <div class="text-[11px] text-emerald-200/90 space-y-0.5">
              <div>
                <strong>ID:</strong> <span class="font-mono">{{ recentlyHatchedInfo.creatureId }}</span> ·
                <strong>Ovo de origem:</strong> <span class="font-mono">{{ recentlyHatchedInfo.originEggId }}</span>
              </div>
              <div v-if="recentlyHatchedInfo.parentsSummary">
                <strong>Pais:</strong> {{ recentlyHatchedInfo.parentsSummary }}
              </div>
              <div>
                <strong>Atributos iniciais:</strong>
                Força {{ recentlyHatchedInfo.attributes.strength }} ·
                Defesa {{ recentlyHatchedInfo.attributes.defense }} ·
                Agilidade {{ recentlyHatchedInfo.attributes.agility }} ·
                Afinidade {{ recentlyHatchedInfo.attributes.elementalAffinity }}
              </div>
            </div>
          </div>

          <div
            v-if="activeIncubatorEggs.length === 0"
            class="p-8 text-center border border-dashed rounded-2xl text-xs text-slate-400 space-y-2 transition-colors"
            :style="{
              backgroundColor: theme.cardDarkBackground,
              borderColor: theme.borderSubtleColor
            }"
          >
            <div class="text-3xl">🥚</div>
            <p class="font-bold text-amber-200">Nenhum ovo aguardando incubação no momento.</p>
            <p>Realize um cruzamento no modo P2P para gerar novos ovos com DNA exclusivo!</p>
          </div>

          <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              v-for="egg in activeIncubatorEggs"
              :key="egg.id"
              :data-testid="`egg-card-${egg.id}`"
              class="p-4 border rounded-2xl space-y-3 shadow-md transition-colors"
              :style="{
                backgroundColor: theme.cardDarkBackground,
                borderColor: getEggStatus(egg) === 'ready_to_hatch' ? '#10b981' : getEggStatus(egg) === 'incubating' ? '#f59e0b' : theme.borderColor
              }"
            >
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <div
                    class="w-9 h-9 rounded-xl border border-white/15 flex items-center justify-center text-lg"
                    :style="{ backgroundColor: egg.genome.phenotype.colors.base }"
                  >
                    🥚
                  </div>
                  <div>
                    <div class="font-black text-white capitalize text-sm">{{ getSpeciesDisplayName(egg.targetSpecies) }}</div>
                    <div class="text-[10px] text-amber-300 font-mono">
                      Gen {{ egg.genome.generation }} · {{ egg.genome.sex === 'male' ? '♂ Macho' : '♀ Fêmea' }}
                    </div>
                  </div>
                </div>
                <span
                  :data-testid="`egg-status-${egg.id}`"
                  class="px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase"
                  :class="
                    getEggStatus(egg) === 'ready_to_hatch'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : getEggStatus(egg) === 'incubating'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                  "
                >
                  {{
                    getEggStatus(egg) === 'ready_to_hatch'
                      ? '✨ Pronto'
                      : getEggStatus(egg) === 'incubating'
                        ? '🔥 Incubando'
                        : 'Disponível'
                  }}
                </span>
              </div>

              <div v-if="egg.genome.parents" class="text-[10px] text-slate-300">
                Pais: <strong>{{ egg.genome.parents.sireName }}</strong> × <strong>{{ egg.genome.parents.damName }}</strong>
              </div>

              <!-- Incubation Progress Bar -->
              <div class="space-y-1">
                <div class="flex justify-between text-[10px] text-slate-400">
                  <span>
                    {{
                      getEggStatus(egg) === 'available'
                        ? 'Aguardando início'
                        : getEggStatus(egg) === 'ready_to_hatch'
                          ? 'Incubação concluída!'
                          : `Restante: ${formatEggRemainingTime(egg)}`
                    }}
                  </span>
                  <span>{{ computeEggProgressPercent(egg) }}%</span>
                </div>
                <div class="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    class="h-full transition-all duration-300"
                    :class="getEggStatus(egg) === 'ready_to_hatch' ? 'bg-emerald-400' : 'bg-amber-400'"
                    :style="{ width: `${computeEggProgressPercent(egg)}%` }"
                  ></div>
                </div>
              </div>

              <!-- Hatch confirmation dialog inline -->
              <div
                v-if="pendingHatchEggId === egg.id && getEggStatus(egg) === 'ready_to_hatch'"
                :data-testid="`hatch-confirm-box-${egg.id}`"
                class="p-2.5 rounded-xl border border-emerald-500/40 bg-emerald-950/30 space-y-2"
              >
                <div class="text-[11px] font-bold text-emerald-200">
                  Confirmar eclosão de {{ getSpeciesDisplayName(egg.targetSpecies) }} (Baby)?
                </div>
                <input
                  v-model="pendingHatchNickname"
                  type="text"
                  maxlength="24"
                  :data-testid="`hatch-nickname-input-${egg.id}`"
                  class="w-full px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                  placeholder="Apelido opcional do filhote..."
                />
                <div class="flex gap-2">
                  <button
                    type="button"
                    :data-testid="`confirm-hatch-btn-${egg.id}`"
                    class="flex-1 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black uppercase"
                    @click="confirmHatchEgg(egg.id)"
                  >
                    🐣 Confirmar Nascimento
                  </button>
                  <button
                    type="button"
                    class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                    @click="cancelHatchPreview"
                  >
                    Cancelar
                  </button>
                </div>
              </div>

              <!-- Egg State Actions -->
              <button
                v-else-if="getEggStatus(egg) === 'available'"
                type="button"
                :data-testid="`start-incubation-btn-${egg.id}`"
                class="w-full py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-sky-600 hover:bg-sky-500 text-white shadow-md transition-all active:scale-95"
                @click="handleStartIncubation(egg.id)"
              >
                🔥 Iniciar Incubação
              </button>

              <button
                v-else-if="getEggStatus(egg) === 'incubating'"
                type="button"
                :data-testid="`warm-egg-btn-${egg.id}`"
                class="w-full py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-amber-600/80 hover:bg-amber-500 text-slate-950 shadow-sm transition-all active:scale-95"
                @click="handleWarmEgg(egg.id)"
              >
                ♨️ Aquecer & Cuidar (+30s)
              </button>

              <button
                v-else
                type="button"
                :data-testid="`hatch-ready-btn-${egg.id}`"
                class="w-full py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md animate-bounce transition-all active:scale-95"
                @click="openHatchPreview(egg.id)"
              >
                ✨ Chocar Ovo Agora!
              </button>
            </div>
          </div>

          <!-- Hatched Eggs Registry (prevents duplicate hatching & preserves origin traceability) -->
          <div v-if="hatchedIncubatorEggs.length > 0" class="pt-2 space-y-2">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">
              Registro de Ovos Eclodidos ({{ hatchedIncubatorEggs.length }})
            </h3>
            <div
              v-for="egg in hatchedIncubatorEggs"
              :key="egg.id"
              :data-testid="`hatched-egg-record-${egg.id}`"
              class="p-3 rounded-xl border flex items-center justify-between text-xs opacity-80"
              :style="{
                backgroundColor: theme.cardDarkBackground,
                borderColor: theme.borderSubtleColor
              }"
            >
              <div>
                <div class="font-bold text-slate-200 capitalize">
                  🐣 {{ getSpeciesDisplayName(egg.targetSpecies) }} · Gen {{ egg.genome.generation }}
                </div>
                <div class="text-[10px] text-slate-400 font-mono">
                  Ovo: {{ egg.id }} → Criatura: {{ egg.hatchedCreatureId ?? 'Registrada' }}
                </div>
              </div>
              <span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 text-[10px] font-bold uppercase">
                ✓ Eclodido
              </span>
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
import type {
  BreedingSessionState,
  DiscoveredPeer,
  NearbyConnectionStatus,
  NearbyDiagnosticLogEntry,
  P2PTransportPort
} from '@/domains/breeding/types';
import { BreedingService } from '@/domains/breeding/application/breeding-service';
import { NearbyConnectionsP2PAdapter } from '@/domains/breeding/infrastructure/nearby-connections-adapter';
import {
  listOwnedCreatures,
  resolveActiveCreatureContext,
  resolveEggStatus
} from '@/domains/persistence/domain/persistence-engine';
import {
  hatchBredEggAtomicUseCase,
  recordBreedingResultUseCase,
  startEggIncubationUseCase,
  warmIncubatingEggUseCase
} from '@/domains/persistence/application/game-session-service';
import BreedingAnimationCanvas from './BreedingAnimationCanvas.vue';

const props = withDefaults(
  defineProps<{
    saveSnapshot: GameSaveSnapshot;
    creatureTheme?: CreatureTheme;
    transportOverride?: P2PTransportPort;
    initialSubtab?: 'breeding' | 'nursery' | 'lineage';
  }>(),
  {
    creatureTheme: undefined,
    transportOverride: undefined,
    initialSubtab: 'breeding'
  }
);

const emit = defineEmits<{
  (e: 'update-save', snapshot: GameSaveSnapshot): void;
  (e: 'focus-creature', creatureId: string): void;
}>();

const fallbackTheme = computed<CreatureTheme>(() => {
  const activeCtx = resolveActiveCreatureContext(props.saveSnapshot);
  const species = CHARACTER_SPECIES_REGISTRY[activeCtx.speciesId];
  if (species) {
    return generateCreatureTheme(
      activeCtx.record.genetics.parents
        ? activeCtx.record.genetics.phenotype.colors.base
        : species.visualTraits.primaryColors.base,
      species.visualTraits.primaryColors.highlight
    );
  }
  return generateCreatureTheme('#0284c7');
});

const theme = computed<CreatureTheme>(() => props.creatureTheme ?? fallbackTheme.value);

const activeTab = ref<'breeding' | 'nursery' | 'lineage'>(props.initialSubtab);
watch(
  () => props.initialSubtab,
  (tab) => {
    if (tab) {
      activeTab.value = tab;
    }
  }
);
const roomChannelCode = ref('SALA-777');

const transport: P2PTransportPort =
  props.transportOverride ??
  new NearbyConnectionsP2PAdapter({
    playerName: 'Treinador Pixel'
  });
const breedingService = new BreedingService(transport);
const sessionState = ref<BreedingSessionState>(breedingService.getState());
const nearbyStatus = ref<NearbyConnectionStatus>(transport.getConnectionStatus?.() ?? 'idle');
const discoveredPeers = ref<readonly DiscoveredPeer[]>([]);
const diagnosticLogs = ref<readonly NearbyDiagnosticLogEntry[]>(transport.getDiagnosticLogs?.() ?? []);
const showDiagnosticLogs = ref(false);
const copiedLogs = ref(false);
const hasPersistedResult = ref(false);
const pendingPeerEndpointId = ref<string | null>(null);

const isPairingWithPeer = (endpointId: string) => {
  return (
    pendingPeerEndpointId.value === endpointId ||
    transport.getActiveEndpointId?.() === endpointId ||
    nearbyStatus.value === 'connection_requested' ||
    nearbyStatus.value === 'connection_pending' ||
    nearbyStatus.value === 'connecting' ||
    nearbyStatus.value === 'authenticating' ||
    nearbyStatus.value === 'connected'
  );
};

const unsubscribeStatus = transport.onStatusChange?.((s) => {
  nearbyStatus.value = s;
  if (s === 'connected' || s === 'failed' || s === 'disconnected' || s === 'idle') {
    pendingPeerEndpointId.value = null;
  }
});
const unsubscribePeers = transport.onPeersChange?.((peers) => {
  discoveredPeers.value = peers;
});
const unsubscribeLogs = transport.onDiagnosticLog?.((logs) => {
  diagnosticLogs.value = logs;
});

const unsubscribeService = breedingService.subscribe((state) => {
  sessionState.value = state;
});

const isConnected = computed(() => Boolean(sessionState.value.remotePeerId));
const isLocalReady = computed(() => Boolean(sessionState.value.localParticipant?.isReady));
const compatibilityResult = computed(() => sessionState.value.compatibility);
const remoteParticipant = computed(() => sessionState.value.remoteParticipant);

const incubatorEggs = computed(() => props.saveSnapshot.incubator ?? []);
const activeIncubatorEggs = computed(() =>
  incubatorEggs.value.filter((egg) => resolveEggStatus(egg) !== 'hatched')
);
const hatchedIncubatorEggs = computed(() =>
  incubatorEggs.value.filter((egg) => resolveEggStatus(egg) === 'hatched')
);
const genealogyArchive = computed(() => props.saveSnapshot.genealogyArchive ?? []);
const nurseryFeedback = ref<string | null>(null);
const pendingHatchEggId = ref<string | null>(null);
const pendingHatchNickname = ref<string>('');
const recentlyHatchedInfo = ref<{
  readonly creatureId: string;
  readonly originEggId: string;
  readonly displayName: string;
  readonly generation: number;
  readonly sex: 'male' | 'female';
  readonly colors: { readonly base: string; readonly crest: string };
  readonly attributes: {
    readonly strength: number;
    readonly defense: number;
    readonly agility: number;
    readonly elementalAffinity: number;
  };
  readonly parentsSummary: string | null;
} | null>(null);

function getEggStatus(egg: import('@/domains/breeding/types').BredEggRecord) {
  return resolveEggStatus(egg);
}

function getSpeciesDisplayName(speciesId: CharacterId): string {
  return CHARACTER_SPECIES_REGISTRY[speciesId]?.displayName ?? speciesId;
}

function computeEggProgressPercent(egg: import('@/domains/breeding/types').BredEggRecord): number {
  if (getEggStatus(egg) === 'ready_to_hatch') return 100;
  return Math.min(100, Math.round((egg.incubationProgress / egg.maxIncubationHours) * 100));
}

function formatEggRemainingTime(egg: import('@/domains/breeding/types').BredEggRecord): string {
  const remainingHours = Math.max(0, egg.maxIncubationHours - egg.incubationProgress);
  const totalSeconds = Math.ceil(remainingHours * 3600);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

const availableCreatures = computed(() => {
  const result: Array<{
    creatureId: string;
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

  const showAllSpecies = Boolean(props.saveSnapshot.settings?.developerModeEnabled);
  const seenIds = new Set<string>();
  const activeCtx = resolveActiveCreatureContext(props.saveSnapshot);

  for (const owned of listOwnedCreatures(props.saveSnapshot)) {
    if (owned.record.runtime.healthCondition === 'deceased') continue;
    seenIds.add(owned.creatureId);
    const species = CHARACTER_SPECIES_REGISTRY[owned.speciesId];
    const displayName = owned.record.runtime.customNickname || species?.displayName || owned.speciesId;
    result.push({
      creatureId: owned.creatureId,
      speciesId: owned.speciesId,
      name: displayName,
      stage: owned.record.runtime.currentStage,
      stageLabel: stageLabels[owned.record.runtime.currentStage] ?? owned.record.runtime.currentStage,
      genetics: owned.record.genetics
    });
  }

  if (showAllSpecies) {
    for (const [id, record] of Object.entries(props.saveSnapshot.characters)) {
      if (seenIds.has(id) || record.runtime.healthCondition === 'deceased' || !record.genetics) continue;
      const species = CHARACTER_SPECIES_REGISTRY[id as CharacterId];
      const displayName = record.runtime.customNickname || species?.displayName || id;
      result.push({
        creatureId: id,
        speciesId: id as CharacterId,
        name: displayName,
        stage: record.runtime.currentStage,
        stageLabel: stageLabels[record.runtime.currentStage] ?? record.runtime.currentStage,
        genetics: record.genetics
      });
    }
  }

  result.sort((a, b) => {
    if (a.creatureId === activeCtx.creatureId) return -1;
    if (b.creatureId === activeCtx.creatureId) return 1;
    return a.name.localeCompare(b.name);
  });

  return result;
});

const selectedLocalCreatureId = ref<string | null>(
  resolveActiveCreatureContext(props.saveSnapshot).creatureId ?? availableCreatures.value[0]?.creatureId ?? null
);

const localCreature = computed(() => {
  if (!selectedLocalCreatureId.value) return null;
  return (
    availableCreatures.value.find((c) => c.creatureId === selectedLocalCreatureId.value) ??
    availableCreatures.value[0] ??
    null
  );
});

function handleSelectLocalCreature(): void {
  if (localCreature.value) {
    breedingService.selectLocalCreature(
      localCreature.value.speciesId,
      localCreature.value.genetics,
      localCreature.value.name
    );
  }
}

watch(
  () => resolveActiveCreatureContext(props.saveSnapshot).creatureId,
  (newId) => {
    if (newId) {
      selectedLocalCreatureId.value = newId;
      handleSelectLocalCreature();
    }
  },
  { immediate: true }
);

watch(
  availableCreatures,
  (list) => {
    if (!selectedLocalCreatureId.value && list.length > 0) {
      selectedLocalCreatureId.value =
        resolveActiveCreatureContext(props.saveSnapshot).creatureId ?? list[0]?.creatureId ?? null;
      handleSelectLocalCreature();
    }
  },
  { immediate: true }
);

watch(nearbyStatus, (status) => {
  if (status === 'connected' && localCreature.value) {
    breedingService.selectLocalCreature(
      localCreature.value.speciesId,
      localCreature.value.genetics,
      localCreature.value.name
    );
  }
});

watch(isConnected, (connected) => {
  if (connected && localCreature.value) {
    breedingService.syncLocalParticipant();
  }
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
  if (sessionState.value.phase === 'failed' || nearbyStatus.value === 'failed') {
    return 'Falha na conexão';
  }
  if (sessionState.value.phase === 'cancelled') {
    return 'Cancelado';
  }
  if (
    nearbyStatus.value === 'connected' ||
    isConnected.value ||
    sessionState.value.phase === 'pairing'
  ) {
    return 'Parceiro Conectado!';
  }
  if (nearbyStatus.value === 'authenticating') {
    return 'Autenticando sessão segura...';
  }
  if (
    nearbyStatus.value === 'connecting' ||
    nearbyStatus.value === 'connection_requested' ||
    nearbyStatus.value === 'connection_pending'
  ) {
    return 'Conectando ao dispositivo...';
  }
  if (nearbyStatus.value === 'player_found') {
    return 'Jogador encontrado!';
  }
  if (
    nearbyStatus.value === 'discovering' ||
    nearbyStatus.value === 'starting_discovery' ||
    nearbyStatus.value === 'checking_environment' ||
    nearbyStatus.value === 'requesting_permissions' ||
    sessionState.value.phase === 'discovering'
  ) {
    return 'Procurando parceiros próximos (Nearby)...';
  }
  return 'Aguardando conexão';
});

function formatLogTime(timestampMs: number): string {
  const date = new Date(timestampMs);
  return date.toTimeString().slice(0, 8);
}

async function handleCopyLogs(): Promise<void> {
  const text = diagnosticLogs.value
    .map((entry) => `[${formatLogTime(entry.timestampMs)}] [${entry.level}] ${entry.message}`)
    .join('\n');
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    }
    copiedLogs.value = true;
    setTimeout(() => {
      copiedLogs.value = false;
    }, 2000);
  } catch {
    copiedLogs.value = false;
  }
}

async function handleConnect(): Promise<void> {
  pendingPeerEndpointId.value = null;
  if (!selectedLocalCreatureId.value) {
    selectedLocalCreatureId.value =
      resolveActiveCreatureContext(props.saveSnapshot).creatureId ?? availableCreatures.value[0]?.creatureId ?? null;
  }
  await breedingService.openDiscovery(roomChannelCode.value);
  if (sessionState.value.phase === 'failed' || nearbyStatus.value === 'failed') {
    return;
  }
  handleSelectLocalCreature();
}

async function handleConnectToPeer(endpointId: string): Promise<void> {
  if (isPairingWithPeer(endpointId)) return;
  pendingPeerEndpointId.value = endpointId;
  if (transport.connectToPeer) {
    try {
      await transport.connectToPeer(endpointId);
      handleSelectLocalCreature();
    } finally {
      if (nearbyStatus.value !== 'connection_requested' && nearbyStatus.value !== 'connecting') {
        pendingPeerEndpointId.value = null;
      }
    }
  }
}

function handleToggleReady(): void {
  breedingService.setLocalReady(!isLocalReady.value);
}

function handleSceneChanged(sceneIndex: number): void {
  breedingService.setAnimationScene(sceneIndex);
}

function handleStartIncubation(eggId: string): void {
  const res = startEggIncubationUseCase(props.saveSnapshot, eggId, Date.now());
  nurseryFeedback.value = res.message;
  if (res.success) {
    emit('update-save', res.snapshot);
  }
}

function handleWarmEgg(eggId: string): void {
  const res = warmIncubatingEggUseCase(props.saveSnapshot, eggId, Date.now());
  nurseryFeedback.value = res.message;
  if (res.success) {
    emit('update-save', res.snapshot);
  }
}

function openHatchPreview(eggId: string): void {
  pendingHatchEggId.value = eggId;
  pendingHatchNickname.value = '';
}

function cancelHatchPreview(): void {
  pendingHatchEggId.value = null;
  pendingHatchNickname.value = '';
}

function confirmHatchEgg(eggId: string): void {
  const res = hatchBredEggAtomicUseCase(props.saveSnapshot, eggId, Date.now(), pendingHatchNickname.value);
  nurseryFeedback.value = res.message;
  if (!res.success || !res.hatchedRecord || !res.hatchedCreatureId) {
    return;
  }

  pendingHatchEggId.value = null;
  pendingHatchNickname.value = '';
  const speciesName = getSpeciesDisplayName(res.hatchedRecord.runtime.characterId);
  const parents = res.hatchedRecord.genetics.parents;
  recentlyHatchedInfo.value = {
    creatureId: res.hatchedCreatureId,
    originEggId: eggId,
    displayName: res.hatchedRecord.runtime.customNickname || speciesName,
    generation: res.hatchedRecord.genetics.generation,
    sex: res.hatchedRecord.genetics.sex,
    colors: {
      base: res.hatchedRecord.genetics.phenotype.colors.base,
      crest: res.hatchedRecord.genetics.phenotype.colors.crest
    },
    attributes: {
      strength: res.hatchedRecord.attributes.strength,
      defense: res.hatchedRecord.attributes.defense,
      agility: res.hatchedRecord.attributes.agility,
      elementalAffinity: res.hatchedRecord.attributes.elementalAffinity
    },
    parentsSummary: parents ? `${parents.sireName} × ${parents.damName}` : null
  };
  emit('update-save', res.snapshot);
}

function handleFocusHatchedCreature(creatureId: string): void {
  emit('focus-creature', creatureId);
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
  if (!selectedLocalCreatureId.value) {
    selectedLocalCreatureId.value =
      resolveActiveCreatureContext(props.saveSnapshot).creatureId ?? availableCreatures.value[0]?.creatureId ?? null;
  }
  handleSelectLocalCreature();
});

onBeforeUnmount(() => {
  unsubscribeStatus?.();
  unsubscribePeers?.();
  unsubscribeLogs?.();
  unsubscribeService();
  breedingService.dispose();
  transport.disconnect();
});
</script>
