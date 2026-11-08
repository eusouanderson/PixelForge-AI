# Auditoria Completa do Projeto e Catálogo de Assets (`ASSET_AUDIT.md`)

## 1. Inventário Geral do Projeto Existente

### 1.1. Estrutura Atual de Diretórios
A inspeção integral do repositório `/home/bob/PixelForge-AI` revelou a seguinte estrutura real:

```text
PixelForge-AI/
├── .husky/
│   └── pre-commit                           # Executa `pnpm typecheck` e `pnpm test:run`
├── docs/
│   ├── AI_GENERATION.md                     # Estratégia e contratos de geração declarativa via LLM
│   ├── ARCHITECTURE.md                      # Arquitetura Hexagonal / Clean Architecture original
│   ├── ASSET_AUDIT.md                       # Este documento de auditoria
│   ├── PIXEL_ART_FORMAT.md                  # Especificação do formato JSON declarativo v1.0.0
│   ├── PROJECT_PLAN.md                      # Plano original da plataforma PixelForge AI
│   ├── RENDERER.md                          # Especificação do motor Canvas2D + PixelBuffer
│   ├── SPRITE_LIFECYCLE_CONVENTION.md       # Convenção das 6 fases de vida e 8 espécies canônicas
│   ├── TECHNOLOGY_DECISIONS.md              # ADRs originais
│   └── TESTING.md                           # Estratégia de testes com Vitest
├── examples/                                # 432 arquivos JSON declarativos (8 criaturas × 54 quadros) + READMEs
│   ├── aerossauro/                          # 01-ovo .. 06-adulto (54 JSONs + 7 README.md)
│   ├── electrossauro/                       # 01-ovo .. 06-adulto (54 JSONs + 7 README.md)
│   ├── glacissauro/                         # 01-ovo .. 06-adulto (54 JSONs + 7 README.md)
│   ├── ignisauro/                           # 01-ovo .. 06-adulto (54 JSONs + 1 README.md)
│   ├── solassauro/                          # 01-ovo .. 06-adulto (54 JSONs + 7 README.md)
│   ├── terrassauro/                         # 01-ovo .. 06-adulto (54 JSONs + 7 README.md)
│   ├── toxissauro/                          # 01-ovo .. 06-adulto (54 JSONs + 7 README.md)
│   └── umbrassauro/                         # 01-ovo .. 06-adulto (54 JSONs + 7 README.md)
├── public/
│   ├── favicon.svg                          # Ícone vetorial da aplicação
│   └── assets/
│       └── manifest/
│           └── characters.json              # Manifesto estruturado e validado dos 8 personagens (432 assets)
├── src/
│   ├── App.vue                              # Componente raiz atual
│   ├── main.ts                              # Bootstrap Vue 3
│   ├── style.css                            # Estilos globais (Tailwind CSS v4)
│   ├── core/
│   │   └── domain/
│   │       ├── canvas/
│   │       │   ├── color.ts                 # Conversão HEX <-> RGBA <-> Uint32 Little-Endian + Alpha Blending
│   │       │   ├── color.spec.ts            # Testes unitários de cor (9 testes)
│   │       │   ├── pixel-buffer.ts          # Buffer binário O(1) sobre ArrayBuffer/Uint32Array/Uint8ClampedArray
│   │       │   └── pixel-buffer.spec.ts     # Testes unitários de buffer (6 testes)
│   │       ├── pixel-art/
│   │       │   └── interfaces.ts            # Contratos DeclarativePixelArt, camadas e primitivas geométricas
│   │       └── validation/
│   │           ├── pixel-art-schema.ts      # Validador Zod estrito (superRefine de paleta + operações recursivas)
│   │           ├── pixel-art-schema.spec.ts # Testes unitários do schema Zod (4 testes)
│   │           └── examples.spec.ts         # Teste que valida todos os 432 JSONs em examples/ contra o schema Zod
│   ├── features/
│   │   └── pixel-art-viewer/
│   │       ├── interfaces.ts                # Tipos de estado e modos de animação do visualizador
│   │       └── PixelArtViewer.vue           # Visualizador interativo de sprites, camadas, paleta e animações
│   ├── infrastructure/
│   │   └── renderer/
│   │       ├── canvas-2d-renderer.ts        # Rasterizador determinístico (Bresenham line/circle, rect, symmetry_h)
│   │       └── canvas-2d-renderer.spec.ts   # Testes unitários do renderizador (4 testes)
│   └── shared/
│       └── constants/
│           ├── app-config.ts                # Configurações globais (APP_CONFIG)
│           └── presets/
│               └── index.ts                 # Carregador eager via import.meta.glob('../../../../examples/**/*.json')
├── .npmrc
├── index.html
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

### 1.2. Stack e Dependências Atualmente Instaladas
- **Gerenciador de pacotes**: `pnpm` (consolidado via `pnpm-lock.yaml` e `pnpm-workspace.yaml`).
- **Dependências de Produção (`dependencies`)**:
  - `vue`: `^3.5.13`
  - `zod`: `^3.24.2`
  - `lucide-vue-next`: `^1.0.0`
- **Dependências de Desenvolvimento (`devDependencies`)**:
  - `typescript`: `^5.7.3` (`strict: true`, `noImplicitAny: true`, `strictNullChecks: true`, `noUnusedLocals: true`, `noUnusedParameters: true`)
  - `vite`: `^6.2.0` + `@vitejs/plugin-vue`: `^5.2.1`
  - `tailwindcss`: `^4.0.9` + `@tailwindcss/vite`: `^4.0.9`
  - `vitest`: `^3.0.7` + `@vitest/coverage-v8`: `^3.0.7` + `happy-dom`: `^21.0.4`
  - `vue-tsc`: `^2.2.8`
  - `husky`: `^9.1.7`
- **Dependências Ausentes (a instalar na Etapa 2)**:
  - `@babylonjs/core` (motor 3D para cenários, câmera, iluminação, planos/sprites nearest-neighbor e sistemas de partículas).
  - `@capacitor/core`, `@capacitor/cli`, `@capacitor/android` (empacotamento mobile Android e ciclo de vida nativo).
  - `@vue/test-utils` (testes de componentes Vue).
  - `@playwright/test` + `@axe-core/playwright` (testes E2E e acessibilidade).
  - `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-vue`, `prettier` (análise estática rigorosa Flat Config).
  - `dependency-cruiser` / `knip` (validação de fronteiras arquiteturais, dependências circulares e código morto).

### 1.3. Inventário de Mídia (Imagens, Spritesheets, Áudios, Configs de MCP)
- **Assets de Pixel Art**: Não são armazenados como arquivos binários `.png` estáticos no repositório; todos os **432 quadros de animação** são armazenados no formato declarativo determinístico `.json` em `examples/<criatura>/<estagio>/<arquivo>.json` e rasterizados em tempo real para `PixelBuffer` (`Uint32Array` / `ImageData` / `HTMLCanvasElement` / `Blob PNG`) pelo [`Canvas2dRenderer`](file:///home/bob/PixelForge-AI/src/infrastructure/renderer/canvas-2d-renderer.ts).
- **Ícones estáticos**: Apenas `public/favicon.svg`.
- **Áudios**: Nenhum arquivo de áudio (`.mp3`, `.wav`, `.ogg`) existe atualmente no repositório.
- **Configurações de MCP**: Não há arquivos `.mcp.json` ou servidores MCP configurados no diretório do projeto.

---

## 2. Investigação do Sistema de Geração de Pixel Art por LLM

### 2.1. Como Funciona o Mecanismo Existente
O projeto possui uma arquitetura de geração e representação de Pixel Art por LLM altamente estruturada e determinística:

1. **Formato Declarativo Intermediário (`DeclarativePixelArt`)**:
   - Definido em [`src/core/domain/pixel-art/interfaces.ts`](file:///home/bob/PixelForge-AI/src/core/domain/pixel-art/interfaces.ts) e documentado em [`docs/PIXEL_ART_FORMAT.md`](file:///home/bob/PixelForge-AI/docs/PIXEL_ART_FORMAT.md).
   - Em vez de solicitar matrizes cruas de pixels para a LLM, utiliza uma **paleta semântica** (`Record<string, string>` em formato `#RRGGBB` ou `#RRGGBBAA`, com `"transparent": "#00000000"`), **camadas ordenadas** por `zIndex` e `opacity`, e **8 primitivas geométricas determinísticas**:
     - `rect` (retângulo preenchido)
     - `stroke_rect` (contorno retangular de 1px)
     - `line` (segmento de reta rasterizado por Bresenham)
     - `circle` (círculo preenchido ou vazado por ponto médio de Bresenham)
     - `points` (lista de coordenadas discretas `[x, y]`)
     - `pixel` (ponto único `(x, y)`)
     - `fill` (preenchimento integral da camada)
     - `symmetry_h` (espelhamento recursivo horizontal em torno de `axisX`)

2. **Validação Estrutural e Semântica via Zod (`pixelArtSchema`)**:
   - Implementada em [`src/core/domain/validation/pixel-art-schema.ts`](file:///home/bob/PixelForge-AI/src/core/domain/validation/pixel-art-schema.ts).
   - Valida formato hexadecimal de todas as cores da paleta e executa `superRefine` recursivo (incluindo sub-operações dentro de `symmetry_h`) garantindo que **nenhuma operação referencie uma chave de cor inexistente na paleta**.

3. **Motor de Rasterização Determinística (`Canvas2dRenderer` + `PixelBuffer`)**:
   - Implementado em [`src/infrastructure/renderer/canvas-2d-renderer.ts`](file:///home/bob/PixelForge-AI/src/infrastructure/renderer/canvas-2d-renderer.ts), [`src/core/domain/canvas/pixel-buffer.ts`](file:///home/bob/PixelForge-AI/src/core/domain/canvas/pixel-buffer.ts) e [`src/core/domain/canvas/color.ts`](file:///home/bob/PixelForge-AI/src/core/domain/canvas/color.ts).
   - Converte qualquer `DeclarativePixelArt` em um `PixelBuffer` (`Uint32Array` / `Uint8ClampedArray` em `32×32`) com composição alfa exata (`blendUint32Colors`) e projeta em Canvas ou textura com `imageSmoothingEnabled = false` (*nearest-neighbor*).

4. **Convenção de Ciclo de Vida e Genética Visual (`SPRITE_LIFECYCLE_CONVENTION.md`)**:
   - Documentada em [`docs/SPRITE_LIFECYCLE_CONVENTION.md`](file:///home/bob/PixelForge-AI/docs/SPRITE_LIFECYCLE_CONVENTION.md).
   - Estabelece orientação **estritamente frontal**, **genética ocular binocular permanente** (`dino_eye`, `dino_pupil`, `specular` visíveis nos dois olhos em todas as fases), **fundo 100% transparente** (`#00000000`), resolução lógica `32×32` e organização em 6 pastas (`01-ovo`, `02-baby`, `03-crianca`, `04-pre-adolescente`, `05-adolescente`, `06-adulto`).

5. **Status das Portas de IA (`PixelArtAIProvider`)**:
   - Os contratos `PixelArtAIProvider`, `MockPixelArtAIProvider` e `HttpProxyAIProvider` estão especificados em [`docs/AI_GENERATION.md`](file:///home/bob/PixelForge-AI/docs/AI_GENERATION.md) e [`docs/ARCHITECTURE.md`](file:///home/bob/PixelForge-AI/docs/ARCHITECTURE.md), mas **ainda não possuem arquivos `.ts` criados em `src/`**.
   - Todos os 432 arquivos JSON em `examples/` seguem 100% o contrato `DeclarativePixelArt` e passam pelo teste automatizado [`src/core/domain/validation/examples.spec.ts`](file:///home/bob/PixelForge-AI/src/core/domain/validation/examples.spec.ts).

---

## 3. Catálogo Verificado de Personagens (`examples/`)

Foram auditados **8 personagens canônicos**, cada um contendo **54 arquivos JSON validados** (totalizando **432 arquivos JSON**), todos em resolução lógica `32×32` e fundo transparente (`#00000000`).

O manifesto completo com todos os 432 caminhos verificados encontra-se em [`public/assets/manifest/characters.json`](file:///home/bob/PixelForge-AI/public/assets/manifest/characters.json).

### Resumo Consolidado dos 8 Personagens

| ID (`kebab-case`) | Nome / Espécie Científica | Arquétipo Anatômico | Elemento | Genética Ocular (`eye` / `pupil`) | Alimento Favorito (presente nos sprites `comendo`) | Partículas Nativas | Cenário 3D Babylon.js Associado |
|---|---|---|---|---|---|---|---|
| `ignisauro` | **Ignisauro** (*Ignisaurus Rex*) | T-Rex / Dragão Vulcânico com coroa de chamas esmeralda, 3 chifres vulcânicos, ombros de basalto com espinhos e peitoral de magma | Fogo (`fire`) | `#fde047` / `#0f172a` | **Pernil Vulcânico Assado** (`volcanic-roast-meat`) — carne assada no osso | Brasas de magma (`#fb923c`), fagulhas douradas (`#fde047`) e fumaça | **Caldeira Vulcânica Ancestral** (`volcanic-caldera`) |
| `glacissauro` | **Glacissauro** (*Cryosaurus Glacius*) | Triceratops / Anquilossauro Glacial com escudo craniano hexagonal de gelo, 3 chifres de cristal ciano e cauda clava (*ice-mace*) | Gelo (`ice`) | `#38bdf8` / `#082f49` | **Fruta-Cristal da Tundra** (`frosted-crystal-berry`) — fruto azul congelado | Flocos de neve pixelados (`#e0f2fe`) e cristais ciano (`#38bdf8`) | **Santuário da Geleira Eterna** (`glacial-sanctuary`) |
| `electrossauro` | **Electrossauro** (*Fulgursaurus Rex*) | Dilofossauro / Velociraptor Galvânico com babado lateral elétrico (*frill*), antenas para-raios duplas e cauda em zigue-zague | Eletricidade (`electric`) | `#06b6d4` / `#083344` | **Fruta-Trovão de Plasma** (`plasma-thunder-fruit`) — fruto losangular bioelétrico | Centelhas voltaicas (`#fde047`) e pulsos de plasma ciano (`#22d3ee`) | **Pico dos Para-Raios de Basalto** (`storm-spire-crag`) |
| `toxissauro` | **Toxissauro** (*Venomousaurus Titan*) | Braquiossauro / Anfíbio-Mutante com bolsas de gás tóxico nas bochechas, 3 chifres-cogumelo, pústulas ácidas e cauda de escorpião | Veneno (`poison`) | `#84cc16` / `#14532d` | **Cogumelo Bioluminescente do Pântano** (`glowing-swamp-mushroom`) — fungo violeta com pintas verde-limão | Bolhas ácidas (`#a3e635`) e esporos bioluminescentes (`#a855f7`) | **Pântano Bioluminescente de Turfa** (`bioluminescent-bog`) |
| `terrassauro` | **Terrassauro** (*Geosaurus Titan*) | Paquicefalossauro / Estegossauro / Golem com domo craniano rochoso, placas dorsais esmeralda, manoplas de golem e cauda *Thagomizer* | Terra (`earth`) | `#f59e0b` / `#1c1917` | **Geodo Crocante de Esmeralda** (`emerald-crystal-geode`) — drusa mineral verde-esmeralda | Fragmentos de esmeralda (`#34d399`) e poeira telúrica âmbar (`#d97706`) | **Santuário Monolítico de Esmeralda** (`emerald-cavern-monolith`) |
| `aerossauro` | **Aerossauro** (*Zephyrusaurus Rex*) | Pteranodon / Archaeopteryx Celeste com crista de 3 plumas altas, bico dourado, asas emplumadas abertas, gola nívea e cauda em leque | Ar (`air`) | `#fde047` / `#042f2e` | **Fruta-Nuvem Alada de Zéfiro** (`sky-winged-cloudberry`) — fruto celeste com pequenas asas brancas | Plumas celestes (`#f8fafc`) e vórtices de vento turquesa (`#7dd3fc`) | **Altar Flutuante dos Ventos** (`floating-sky-sanctuary`) |
| `umbrassauro` | **Umbrassauro** (*Nyxosaurus Rex*) | Carnotauro / Ceifador Abissal com chifres taurinos horizontais, máscara craniana óssea com joia carmesim, costelas externas e foice caudal | Sombra (`shadow`) | `#f43f5e` / `#09090b` | **Fruto Abissal de Rubi** (`crimson-shadow-soulfruit`) — fruto sombrio com núcleo carmesim | Fogo-fátuo carmesim (`#f43f5e`) e névoa de obsidiana (`#52525b`) | **Vale de Obsidiana e Luar Carmesim** (`umbral-obsidian-crypt`) |
| `solassauro` | **Solassauro** (*Heliosaurus Imperator*) | Amargassauro / Dragão-Leão Solar com juba radiante de 360° (10 raios solares), armadura branco-platina/ouro com brasão solar e cauda maça-solar | Luz Solar (`light`) | `#38bdf8` / `#0c4a6e` | **Pêssego Solar Dourado** (`golden-starburst-sunpeach`) — fruto dourado radiante | Fagulhas solares douradas (`#fde047`) e halos de platina (`#fffbeb`) | **Templo Solar da Aurora Dourada** (`helios-golden-citadel`) |

### Estrutura de Animações por Personagem (54 Arquivos por Criatura)
- **`01-ovo/`**:
  - `eclosao`: 4 frames (`frame-1` ovo intacto, `frame-2` rachando, `frame-3` fraturando com brilho elemental, `frame-4` casca abrindo com olhos e topo da cabeça visíveis).
- **`02-baby/`, `03-crianca/`, `04-pre-adolescente/`, `05-adolescente/`, `06-adulto/`** (5 estágios vivos × 5 animações × 2 frames = 50 frames):
  - `idle` (2 frames): Respiração torácica de 1px, piscar / movimento sutil e partículas elementais nativas na camada `layer_sparks` (`zIndex: 7`).
  - `comendo` (2 frames): Frame 1 com boca aberta diante do alimento favorito inteiro; Frame 2 mastigando de bochechas cheias com o alimento mordido e migalhas na camada `layer_comendo_fx` (`zIndex: 8`).
  - `amando` (2 frames): Bochechas rosadas, sorriso afetuoso e corações em pixel art flutuando ao redor na camada `layer_amando_fx` (`zIndex: 8`).
  - `doente` (2 frames): Pálpebras caídas sobre os olhos binoculares, bochechas esverdeadas (`#86efac`), termômetro clínico na boca, gota de suor azul e nuvens de febre na camada `layer_doente_fx` (`zIndex: 8`).
  - `morte` (2 frames): Memorial pixel art universal com cruz de pedra chanfrada, flores na base e fantasminha com auréola dourada subindo aos céus (`zIndex: 1` a `4`).

---

## 4. Diagnóstico Arquitetural e Lacunas para o Jogo Mobile

1. **Preservação do Motor de Pixel Art Existente**:
   - `PixelBuffer`, `color.ts`, `pixel-art-schema.ts` e `Canvas2dRenderer` possuem 100% de testes passando e determinismo comprovado.
   - Em vez de descartá-los, o `Canvas2dRenderer` será a ponte oficial para gerar texturas `DynamicTexture` / `RawTexture` RGBA `32×32` com filtro `NEAREST_SAMPLINGMODE` diretamente para os planos/sprites do **Babylon.js**, preservando 100% das pixel arts declarativas existentes sem qualquer borramento.
2. **Transição para DDD Modular (`src/domains/*` e `src/game-engine/babylon/*`)**:
   - Atualmente o projeto possui apenas `src/core/`, `src/features/pixel-art-viewer/` e `src/infrastructure/renderer/`.
   - Na **Etapa 2**, estruturaremos os domínios independentes (`characters`, `pet-needs`, `attributes`, `feeding`, `inventory`, `activities`, `particles`, `environments`, `progression`, `economy`, `persistence`, `settings`), cada um com seu `types.ts` único, casos de uso, regras de negócio puras e pasta `tests/`.
3. **Qualidade, Cobertura 100% e Pipeline**:
   - Atualmente `vitest.config.ts` não impõe thresholds de 100% e não há configuração de ESLint Flat Config, Playwright ou GitHub Actions CI. Tudo isso será configurado na **Etapa 2**.

