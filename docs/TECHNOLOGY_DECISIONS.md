# PixelForge AI — Decisões Tecnológicas (ADR / Technology Decisions)

## 1. Sumário Executivo

Este documento registra a avaliação técnica, critérios de escolha e justificativas para cada tecnologia e biblioteca adotada no projeto **PixelForge AI**.

---

## 2. Avaliação do Motor de Renderização e Manipulação Gráfica

### 2.1. Candidatos Avaliados

1. **PixiJS (`pixi.js`)**:
   - *Pontos Fortes*: Excelente para jogos 2D complexos com aceleração WebGL, renderização em lote (*batch rendering*) de milhares de sprites por segundo.
   - *Pontos Fracos*: Foco em computação gráfica e shaders; overhead pesado de bundle (>400 KB); interpolação linear padrão; a leitura e escrita síncrona de pixel a pixel em texturas de GPU (`gl.texSubImage2D` ou `gl.readPixels`) adiciona latência e complexidade desnecessária para uma grade estática de pixels; não é projetado para buffers de desenho discreto.
   - *Decisão*: **Rejeitado**.

2. **Fabric.js / Konva**:
   - *Pontos Fortes*: Manipulação rica de grafos de cena vetoriais, rotação, redimensionamento de caixas de seleção, objetos interativos.
   - *Pontos Fracos*: Modelagem baseada em objetos DOM/Canvas virtuais. Em uma grade de pixel art de 128x128 existem 16.384 pixels. Criar instâncias de objetos para cada pixel causa travamento imediato do navegador, pressão imensa no Garbage Collector (GC thrashing) e degradação severa de performance.
   - *Decisão*: **Rejeitado**.

3. **Sharp**:
   - *Pontos Fortes*: Processamento ultrarrápido de imagens em C++ baseado na biblioteca `libvips`.
   - *Pontos Fracos*: É um módulo nativo de Node.js/C++. Não executa nativamente dentro do ambiente de navegador do cliente (Client-Side).
   - *Decisão*: **Não aplicável ao cliente web** (reservado apenas se houver backend Node.js dedicado).

4. **Canvas 2D Nativo + TypedArrays (`Uint8ClampedArray` e `Uint32Array`)**:
   - *Pontos Fortes*:
     - **Zero dependências externas**: overhead de bundle igual a zero.
     - **Performance máxima**: Acesso a pixels via índices diretos `[y * width + x]` em buffers binários contíguos de 32 bits em O(1).
     - **Consumo de memória mínimo**: Uma grade de 128x128 pixels ocupa exatamente 64 KB de memória RAM por camada.
     - **Determinismo estrito**: Controle total sobre algoritmos de desenho discreto (Bresenham para retas e círculos, scanline flood fill para preenchimento).
     - **Escala nítida (Nearest-Neighbor)**: O suporte nativo a `imageSmoothingEnabled = false` garante redimensionamento perfeito para qualquer resolução (ex.: 1024x1024) sem antialiasing ou borramento.
     - **Compatibilidade com Web Workers**: Buffers de TypedArray podem ser transferidos via `postMessage(buffer, [buffer])` sem cópia de memória (*Transferable Objects*).
   - *Decisão*: **Aprovado como motor oficial de renderização**.

---

## 3. Avaliação de Gerenciamento de Estado

### 3.1. Reatividade do Vue 3 vs. Estado de Baixo Nível

- **Problema**: O mecanismo reativo padrão do Vue 3 (`reactive` / `ref`) envolve os objetos em `Proxy` JavaScript e rastreia mutações profundas. Aplicar `reactive` a uma matriz de 128x128 ou a buffers de pixels causa degradação crítica de taxa de quadros (*FPS drop*) durante o desenho a mão livre com o mouse.
- **Solução Arquitetural**:
  - O estado da interface (zoom, pan, ferramenta ativa, cor selecionada, lista de camadas, metadados) é reativo e gerenciado via `ref` e `computed` da Composition API.
  - Os dados brutos de pixels (`PixelBuffer`) residem fora do rastreamento reativo profundo, utilizando `shallowRef` apenas para emitir notificações de atualização de quadro (*tick*) quando necessário.
- **Pinia**: Será utilizado de forma concisa e modular para persistência de sessão e orquestração do projeto ativo, sem envolver buffers de pixels em reatividade profunda.

---

## 4. Validação de Dados: Zod

- **Motivação**: A LLM gera formatos intermediários em JSON e o usuário pode importar arquivos de projeto externos. Aceitar dados não validados geraria vulnerabilidades de segurança e falhas catastróficas no renderizador.
- **Escolha**: **Zod**.
- **Justificativa**:
  - Validação estrita em tempo de execução com geração automática de tipos TypeScript estáticos (`z.infer`).
  - Permite validação de limites de coordenadas, formatos válidos de cores hexadecimais, integridade de camadas e enumerações de ferramentas.
  - Zero dependências secundárias e excelente desempenho.

---

## 5. Persistência: IndexedDB

### 5.1. Comparativo de Armazenamento Local

| Recurso | `localStorage` | IndexedDB (com `idb`) |
|---|---|---|
| Capacidade | ~5 MB máximo | Centenas de Megabytes (limitado pelo disco) |
| Tipo de Acesso | Síncrono (bloqueia a thread da UI) | Assíncrono (não bloqueia a UI) |
| Suporte a Binários | Apenas strings (exige conversão Base64 cara) | Suporte nativo a Blobs, ArrayBuffers e Objetos |
| Transações | Não | Sim (ACID) |

- **Decisão**: **IndexedDB** como mecanismo de persistência local oficial.
- **Uso de biblioteca**: Wrapper leve `idb` para prover interface baseada em Promises ergonômicas e tipadas.

---

## 6. Provedor de Inteligência Artificial (LLM)

- **Princípio**: Desacoplamento estrito através do padrão **Ports and Adapters**.
- **Segurança de Chaves**: Chaves privadas de API nunca devem ser expostas no código client-side do navegador.
- **Implementações**:
  1. `MockPixelArtAIProvider`: Fornece respostas determinísticas e estruturadas para ambientes de desenvolvimento offline, testes automatizados e demonstrações.
  2. `HttpProxyAIProvider`: Conecta-se a um endpoint de backend seguro ou serviço intermediador que adiciona as credenciais necessárias de forma segura e com suporte a rate limiting.

---

## 7. Ferramentas de Qualidade de Código e Testes

1. **Vitest**:
   - Escolhido por sua integração nativa com o pipeline do Vite, execução extremamente rápida e suporte total a TypeScript e ESM sem necessidade de transpilação pesada do Jest.
   - Suporte a cobertura via `@vitest/coverage-v8`.
2. **ESLint + Prettier**:
   - Regras estritas de TypeScript (`@typescript-eslint/recommended-type-checked` e regras de proibição de `any`).
   - Padrão consistente de formatação sem disputas de estilo.
3. **TypeScript Strict Mode**:
   - `strict: true`, `noImplicitAny: true`, `strictNullChecks: true`, `noUnusedLocals: true`, `noUnusedParameters: true`.

