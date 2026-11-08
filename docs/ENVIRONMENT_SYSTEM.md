# Sistema de Cenários 3D Individuais com Babylon.js (`ENVIRONMENT_SYSTEM.md`)

## 1. Arquitetura do Motor Gráfico

Implementado em [`src/game-engine/babylon/scene-controller.ts`](file:///home/bob/PixelForge-AI/src/game-engine/babylon/scene-controller.ts) e configurado declarativamente em [`src/domains/environments/domain/environment-registry.ts`](file:///home/bob/PixelForge-AI/src/domains/environments/domain/environment-registry.ts).

### Características Técnicas:
1. **Preservação Estrita da Pixel Art (`32×32`)**:
   - Os personagens utilizam seus JSONs declarativos originais rasterizados via [`rasterizeSpriteToRgbaBytes`](file:///home/bob/PixelForge-AI/src/game-engine/babylon/pixel-texture-adapter.ts) em `RawTexture` RGBA com `Texture.NEAREST_SAMPLINGMODE` aplicados a um plano 3D orientado para a câmera (`Mesh.BILLBOARDMODE_ALL`).
2. **8 Ambientes 3D Exclusivos**:
   - Cada personagem carrega iluminação hemisférica, luz de recorte (*rim light*), neblina exponencial (`FOGMODE_EXP2`), pedestal elemental e elementos 3D animados (`monolith`, `crystal-pillar`, `lava-pool`, `mushroom`, `floating-ring`, `obsidian-arch`, `solar-obelisk`).
3. **Gerenciamento Estrito de Memória e Dispose**:
   - Ao trocar de personagem, `clearCurrentEnvironmentResources()` descarta todas as malhas, materiais, texturas, luzes e sistemas de partículas do ambiente anterior antes de instanciar o novo cenário, verificável por `getActiveResourceMetrics()`.

