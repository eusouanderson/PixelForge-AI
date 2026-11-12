# Sistema de Cenários 3D Individuais com Babylon.js (`ENVIRONMENT_SYSTEM.md`)

## 1. Arquitetura do Motor Gráfico

Implementado em [`src/game-engine/babylon/scene-controller.ts`](../src/game-engine/babylon/scene-controller.ts) e configurado declarativamente em [`src/domains/environments/domain/environment-registry.ts`](../src/domains/environments/domain/environment-registry.ts).

### Características Técnicas
1. **Preservação Estrita da Pixel Art (`32×32`)**:
   - Os personagens utilizam seus JSONs declarativos originais (com suporte dinâmico a overrides de paleta genética via `applyPaletteOverridesToSprite`) rasterizados via [`rasterizeSpriteToRgbaBytes`](../src/game-engine/babylon/pixel-texture-adapter.ts) em `RawTexture` RGBA com `Texture.NEAREST_SAMPLINGMODE` aplicados ao plano 3D orientado para câmera (`Mesh.BILLBOARDMODE_ALL`).
2. **11 Ambientes 3D Exclusivos**:
   - **Ignisauro**: *Caldeira Vulcânica Ancestral* (`volcanic-caldera`)
   - **Glacissauro**: *Santuário da Geleira Eterna* (`glacial-sanctuary`)
   - **Electrossauro**: *Pico dos Para-Raios de Basalto* (`storm-spire-crag`)
   - **Toxissauro**: *Pântano Bioluminescente de Turfa* (`bioluminescent-bog`)
   - **Terrassauro**: *Cânion Monolítico de Esmeralda* (`emerald-cavern-monolith`)
   - **Aerossauro**: *Altar Flutuante dos Ventos* (`floating-sky-sanctuary`)
   - **Umbrassauro**: *Vale de Obsidiana e Luar Carmesim* (`umbral-obsidian-crypt`)
   - **Solassauro**: *Templo Solar da Aurora Dourada* (`helios-golden-citadel`)
   - **Rosassauro**: *Jardim Encantado de Florescência* (`flowering-meadow`)
   - **Cristalissauro**: *Caverna dos Geodos Prismáticos* (`crystal-cavern`)
   - **Astrassauro**: *Observatório do Véu Estelar* (`cosmic-observatory`)
3. **Gerenciamento Estrito de Memória e Dispose**:
   - Ao trocar de dinossauro, `clearCurrentEnvironmentResources()` descarta todas as malhas, materiais, texturas, luzes e sistemas de partículas do ambiente anterior antes de instanciar o novo cenário, verificável por `getActiveResourceMetrics()`.
