# PixelForge AI

Plataforma profissional de criação, edição e renderização determinística de Pixel Art, potencializada por Modelos de Linguagem (LLM) com controle milimétrico de coordenadas, cores, camadas e composição.

---

## Destaques

- **Pixel Real como Informação**: Cada pixel é uma unidade discreta de dado com coordenada, camada e índice de cor.
- **Resolução Independente**:
  - Resolução de saída padronizada em **1024 × 1024** (exportação PNG pura).
  - Resolução lógica configurável (16×16, 32×32, 48×48, 64×64, 128×128).
  - Algoritmo de escala *nearest-neighbor* sem interpolação ou borramento.
- **Renderizador Determinístico**: Motor puro em Canvas 2D nativo e `Uint32Array` de alto desempenho, desacoplado de IA e frameworks.
- **Geração Declarativa com LLM**: Formato intermediário compacto validado via Zod, evitando alucinações de coordenadas e eliminando JSONs massivos de pixels individuais.
- **Editor Profissional**:
  - Zoom de 1x a 64x e Pan fluido.
  - Grade lógica alinhada aos pixels.
  - Ferramentas: Lápis, Borracha, Balde de Tinta (Flood Fill), Linha (Bresenham), Retângulo, Conta-gotas.
  - Histórico completo de Undo/Redo (Command Pattern).
  - Gerenciador de camadas com visibilidade, opacidade e ordenação.
  - Paletas clássicas integradas (PICO-8, Game Boy, Endesga).
- **Persistência Segura**: Armazenamento local no navegador via IndexedDB, com importação e exportação de projetos em JSON e PNG.
- **Arquitetura Desacoplada**: Clean Architecture e Hexagonal Architecture (Ports and Adapters). Provedores de IA são intercambiáveis sem impactar o domínio.

---

## Documentação Técnica

- [Plano de Projeto](file:///home/eusouanderson/treino/pixel-art-sprite-generate/docs/PROJECT_PLAN.md)
- [Arquitetura de Software](file:///home/eusouanderson/treino/pixel-art-sprite-generate/docs/ARCHITECTURE.md)
- [Decisões Tecnológicas](file:///home/eusouanderson/treino/pixel-art-sprite-generate/docs/TECHNOLOGY_DECISIONS.md)
- [Especificação do Formato Declarativo](file:///home/eusouanderson/treino/pixel-art-sprite-generate/docs/PIXEL_ART_FORMAT.md)
- [Estratégia de Geração com LLM](file:///home/eusouanderson/treino/pixel-art-sprite-generate/docs/AI_GENERATION.md)
- [Especificação do Renderizador](file:///home/eusouanderson/treino/pixel-art-sprite-generate/docs/RENDERER.md)
- [Convenção de Ciclo de Vida e Sprites](file:///home/eusouanderson/treino/pixel-art-sprite-generate/docs/SPRITE_LIFECYCLE_CONVENTION.md)
- [Estratégia de Testes e Qualidade](file:///home/eusouanderson/treino/pixel-art-sprite-generate/docs/TESTING.md)

---

## Stack Tecnológica

- **Linguagem**: TypeScript 5 (Strict Mode, sem `any`)
- **Framework UI**: Vue 3 (Composition API) + Vite
- **Validação de Esquemas**: Zod
- **Manipulação Gráfica**: Canvas 2D Nativo + TypedArrays (`Uint8ClampedArray`, `Uint32Array`)
- **Persistência Local**: IndexedDB (`idb`)
- **Testes**: Vitest + Coverage V8
- **Padronização**: ESLint estrito + Prettier

---

## Como Executar

```bash
# Instalar dependências
pnpm install

# Iniciar servidor de desenvolvimento
pnpm dev

# Executar testes unitários e de integração
pnpm test

# Executar cobertura de testes
pnpm test:coverage

# Verificar tipos TypeScript
pnpm typecheck

# Executar linter
pnpm lint
```

