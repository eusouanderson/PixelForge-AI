# Sistema de Partículas por Personagem (`PARTICLE_SYSTEM.md`)

## 1. Identidade Individual de Partículas

Definido em [`src/domains/particles/domain/particle-registry.ts`](../src/domains/particles/domain/particle-registry.ts) e renderizado em 3D pelo [`BabylonCreatureSceneController`](../src/game-engine/babylon/scene-controller.ts).

Cada uma das **11 espécies** possui textura matricial pixelada (`NEAREST_SAMPLINGMODE` via [`rasterizeParticlePatternToRgbaBytes`](../src/game-engine/babylon/pixel-texture-adapter.ts)) e comportamento físico próprio:

- `ignisauro` (`rising-embers`): Brasas quadradas ascendentes (`#fb923c` / `#fde047`).
- `glacissauro` (`falling-crystals`): Cristais de gelo em losango com gravidade negativa suave (`#38bdf8` / `#e0f2fe`).
- `electrossauro` (`voltaic-sparks`): Centelhas rápidas em zigue-zague (`#fde047` / `#22d3ee`).
- `toxissauro` (`rising-bubbles`): Bolhas ácidas ocas ascendentes (`#a3e635` / `#a855f7`).
- `terrassauro` (`floating-shards`): Fragmentos minerais de esmeralda (`#34d399` / `#d97706`).
- `aerossauro` (`swirling-feathers`): Plumas celestes em deriva lateral (`#7dd3fc` / `#f8fafc`).
- `umbrassauro` (`shadow-wisps`): Fogo-fátuo carmesim e cinzas (`#f43f5e` / `#52525b`).
- `solassauro` (`solar-corona`): Estrelas solares douradas (`#fde047` / `#fffbeb`).
- `rosassauro` (`fairy-petals`): Corações e pétalas encantadas (`#f472b6` / `#fbcfe8` / `#c084fc`).
- `cristalissauro` (`crystal-prisms`): Estilhaços prismáticos de safira (`#38bdf8` / `#e0f2fe` / `#0284c7`).
- `astrassauro` (`cosmic-starlight`): Estrelas cósmicas douradas e índigo (`#fbbf24` / `#fef08a` / `#818cf8`).

---

## 2. Partículas Reativas e Ciclo de Vida

O método [`createReactiveParticleBurst`](../src/domains/particles/domain/particle-registry.ts) dispara emissões controladas (`manualEmitCount`) para:
- `happy`, `sad`, `feeding`, `sleeping`, `playing`, `sick`, `evolution`, `level-up`, `special`.
- Ao trocar de personagem ou desmontar a cena, `dispose()` libera integralmente o `ParticleSystem` e sua `RawTexture`.
