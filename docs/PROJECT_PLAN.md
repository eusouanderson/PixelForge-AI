# PixelForge AI — Plano de Projeto

## 1. Visão Geral

O **PixelForge AI** é uma plataforma profissional de criação, edição e renderização determinística de Pixel Art, potencializada por Modelos de Linguagem (LLM). A plataforma separa rigorosamente a **resolução lógica** da arte (ex.: 16x16, 32x32, 64x64, 128x128) da **resolução de saída/exportação** (inicialmente 1024x1024 com redimensionamento sem interpolação).

Diferente de geradores de imagem generativos convencionais baseados em difusão, o PixelForge AI trata cada pixel como uma unidade discreta de dado: posição exata, camada e índice de cor. A geração via LLM produz representações determinísticas, estruturadas e auditáveis.

---

## 2. Metas e Critérios de Aceite

1. **Nome Centralizado**: O nome da plataforma (`PixelForge AI`) deve estar centralizado em arquivo de configuração (`APP_CONFIG`), permitindo renomeações sem refatorações espalhadas.
2. **Resolução Independente**:
   - Resolução de saída: 1024x1024 (exportação em PNG puro, sem antialiasing).
   - Resolução lógica configurável: 16x16, 32x32, 48x48, 64x64, 128x128.
   - Algoritmo de escala: Vizinho mais próximo (*nearest-neighbor*).
3. **Formato Declarativo Intermediário**: Esquema versionado e validado via Zod com suporte a primitivas geométricas e operações por camada.
4. **Renderizador Determinístico**: Motor puro desacoplado de frameworks e de IA, garantindo que a mesma estrutura gere exatamente a mesma imagem.
5. **Editor Interativo Completo**:
   - Canvas com Zoom (1x a 64x) e Pan.
   - Grid configurável alinhado aos pixels lógicos.
   - Ferramentas: Lápis, Borracha, Conta-gotas, Balde de Tinta (Flood Fill), Linha, Retângulo, Seleção.
   - Histórico: Undo/Redo com padrão Command.
   - Gerenciamento de Camadas: visibilidade, opacidade, reordenação e mesclagem.
   - Paleta de Cores: gestão de cores, importação de paletas clássicas (PICO-8, Game Boy, Endesga, etc.).
6. **Persistência Local**: Repositório IndexedDB assíncrono para salvar, carregar, duplicar e excluir projetos, com exportação/importação em JSON e exportação em PNG.
7. **Integração Desacoplada com LLM**: Arquitetura Ports & Adapters para provedores de IA, garantindo isolamento total e segurança de credenciais.
8. **Qualidade e Cobertura**:
   - TypeScript estrito, sem `any`.
   - 100% de cobertura nos módulos de domínio, validação, renderer e casos de uso.
   - ESLint e Prettier ativos sem pendências.

---

## 3. Fases de Execução

### Fase 1: Planejamento e Documentação Técnica
- Investigação do ambiente e ferramentas.
- Análise comparativa de bibliotecas de renderização e arquiteturas.
- Elaboração dos documentos de especificação técnica e arquitetura.
- **Critério de conclusão**: Documentação completa e aprovada (`PROJECT_PLAN.md`, `ARCHITECTURE.md`, `TECHNOLOGY_DECISIONS.md`, `PIXEL_ART_FORMAT.md`, `AI_GENERATION.md`, `RENDERER.md`, `TESTING.md`, `SPRITE_LIFECYCLE_CONVENTION.md`, `README.md`).

### Fase 2: Fundação, Setup e Domínio
- Configuração do projeto com Vite, Vue 3 (Composition API), TypeScript strict mode, Vitest, Zod, ESLint, Prettier.
- Configuração centralizada de variáveis do aplicativo (`APP_CONFIG`).
- Definição do núcleo de domínio (`core/domain`): `PixelArtProject`, `PixelArtLayer`, `ColorPalette`, `Dimensions`, `PixelBuffer`.
- Implementação de buffers compactos baseados em `Uint8ClampedArray` / `Uint32Array`.
- Esquema de validação Zod para o formato declarativo intermediário (`core/domain/validation`).
- Testes unitários com 100% de cobertura das entidades e validações.
- **Critério de conclusão**: Domínio compilando com tipagem estrita e cobertura de testes em 100%.

### Fase 3: Renderizador Determinístico
- Implementação do motor de renderização `Canvas2dRenderer` em `infrastructure/renderer`.
- Implementação de algoritmos de rasterização discreta (Bresenham para linhas e círculos, Flood Fill otimizado com scanline stack).
- Composição de camadas considerando opacidade e zIndex.
- Escalador *nearest-neighbor* para resolução final (1024x1024).
- Exportador de PNG determinístico (`CanvasPngExporter`).
- Testes automatizados do renderizador com validação de pixels de saída.
- **Critério de conclusão**: 100% de cobertura no renderer e garantia de determinismo.

### Fase 4: Editor de Pixel Art e Camada de Aplicação
- Implementação dos casos de uso de edição em `core/application/use-cases`.
- Sistema de Undo/Redo com Command Pattern.
- Componentes do editor de tela: `PixelCanvas`, `Toolbox`, `LayerManager`, `PalettePicker`, `ZoomControls`, `TopBar`.
- Suporte a eventos de mouse/toque com coordenadas convertidas da tela para a grade lógica.
- Atalhos de teclado ergonômicos e acessíveis.
- Testes de casos de uso e componentes de interface.
- **Critério de conclusão**: Editor interativo funcional permitindo desenhar, apagar, preencher, trocar camadas e paletas.

### Fase 5: Persistência e Gestão de Projetos
- Implementação do repositório IndexedDB (`infrastructure/persistence/IndexedDbProjectRepository`).
- Casos de uso: salvar projeto, carregar projeto, listar projetos, excluir projeto, importar JSON, exportar JSON, exportar PNG.
- Interface de gerenciamento de projetos (modal/sidebar de projetos salvos).
- Testes automatizados com mock de IndexedDB cobrindo todos os fluxos.
- **Critério de conclusão**: Projetos persistidos localmente com integridade garantida.

### Fase 6: Integração com Provedores de IA (LLM)
- Definição das portas de IA (`core/ports/ai-provider`).
- Implementação do adapter de teste determinístico (`MockPixelArtAIProvider`).
- Implementação do adapter HTTP para serviço seguro / backend proxy (`HttpProxyAIProvider`).
- Implementação do pipeline de geração progressiva (análise, paleta, camadas, refinamento).
- Interface de geração assistida por IA integrada ao editor.
- Testes unitários e de integração com provedores de IA mockados.
- **Critério de conclusão**: Usuário gera arte a partir de prompt de texto com validação pré-renderização.

### Fase 7: Refinamento, Desempenho e Qualidade
- Otimizações de renderização (dirty rects, OffscreenCanvas).
- Auditoria de acessibilidade e responsividade.
- Verificação rigorosa de TypeScript e ESLint.
- Auditoria de cobertura de testes (garantindo 100% nos módulos críticos).
- Atualização e consolidação da documentação final.
- **Critério de conclusão**: Plataforma robusta, performática e pronta para uso.

---

## 4. Matriz de Riscos e Mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Gargalo de memória com milhões de pixels | Alto | Utilização de TypedArrays (`Uint32Array` / `Uint8ClampedArray`) em vez de objetos soltos. |
| LLM retornar JSON inválido ou incompleto | Alto | Validação rigorosa em tempo de execução via Zod antes de entregar os dados ao renderizador. |
| Alucinação geométrica da LLM fora dos limites | Médio | Clamping automático de coordenadas e descarte seguro de operações fora da grade lógica. |
| Inconsistência na renderização entre navegadores | Médio | Desativação estrita de interpolação (`imageSmoothingEnabled = false`) e rasterização algorítmica própria. |
| Vazamento de chaves de API | Crítico | Frontend nunca armazena chaves privadas; arquitetura prevê adaptador para proxy backend ou chaves locais opcionais em sandbox. |

