# Sistema de Geração Declarativa de Pixel Art por LLM (`PIXEL_ART_GENERATOR.md`)

## 1. Arquitetura do Gerador Existente

O projeto utiliza um sistema de **Composição Geométrica Declarativa** ([`DeclarativePixelArt`](file:///home/bob/PixelForge-AI/src/core/domain/pixel-art/interfaces.ts)) validado em runtime por Zod ([`pixelArtSchema`](file:///home/bob/PixelForge-AI/src/core/domain/validation/pixel-art-schema.ts)) e rasterizado por [`Canvas2dRenderer`](file:///home/bob/PixelForge-AI/src/infrastructure/renderer/canvas-2d-renderer.ts).

- **Porta de Domínio**: [`PixelArtAIProvider`](file:///home/bob/PixelForge-AI/src/core/ports/ai-provider/interfaces.ts)
- **Adaptador Determinístico**: [`MockPixelArtAIProvider`](file:///home/bob/PixelForge-AI/src/infrastructure/ai/mock-pixel-art-ai-provider.ts)

---

## 2. Como Criar ou Adicionar Novos Personagens e Animações

1. **Estrutura de Pastas**:
   Crie `examples/<id-da-criatura>/` contendo as 6 pastas de ciclo de vida:
   - `01-ovo/` (`eclosao` frames 1 a 4)
   - `02-baby/`, `03-crianca/`, `04-pre-adolescente/`, `05-adolescente/`, `06-adulto/` (`idle`, `comendo`, `amando`, `doente`, `morte` frames 1 e 2)
2. **Regras Visuais Obrigatórias**:
   - Resolução lógica `32×32`.
   - Fundo transparente `"transparent": "#00000000"`.
   - Orientação estritamente frontal com **genética ocular binocular permanente** (`dino_eye`, `dino_pupil`, `specular` constantes em todas as fases).
3. **Validação Automática**:
   Execute `pnpm test:run src/core/domain/validation/examples.spec.ts` para validar todos os JSONs contra o `pixelArtSchema`.

