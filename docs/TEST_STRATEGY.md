# Estratégia de Testes e TDD (`TEST_STRATEGY.md`)

## 1. Fluxo Obrigatório de TDD

Todo código de domínio, aplicação e infraestrutura segue o ciclo estrito:
1. Escrever o teste unitário ou de integração em `*.spec.ts`.
2. Executar `pnpm test:run` e confirmar a falha inicial.
3. Implementar o código mínimo com TypeScript Strict.
4. Executar `pnpm test:coverage` e confirmar **100% em Statements, Branches, Functions e Lines**.
5. Refatorar mantendo todos os testes e o linter verdes.

---

## 2. Metas e Thresholds de Cobertura (100%)

Configurados em [`vitest.config.ts`](../vitest.config.ts):

- **Statements**: `100%`
- **Branches**: `100%`
- **Functions**: `100%`
- **Lines**: `100%`

### Exclusões Justificadas da Cobertura:
- `src/**/*.{spec,test}.ts`: Arquivos de teste.
- `src/**/types.ts` e `src/**/interfaces.ts`: Declarações puras de tipos TypeScript sem código executável em runtime.
- `src/**/index.ts`: Barrels de re-exportação.

---

## 3. Camadas de Teste

1. **Testes Unitários de Domínio e Infraestrutura**: Validam cálculos de necessidades, dietas, atributos, progressão, economia, genética, protocolo P2P (`Commit-Reveal`), notificações críticas, atualizador OTA, simulação temporal determinística (`ClockPort`), migrações de save e rasterização/upscaling `PixelBuffer`/`Canvas2dRenderer`.
2. **Testes de Validação de Assets ([`examples.spec.ts`](../src/core/domain/validation/examples.spec.ts))**: Validam todos os **594 arquivos JSON** das **11 espécies** contra o schema Zod.
3. **Testes de Simulação P2P e UI ([`two-peer-nearby-simulation.spec.ts`](../src/domains/breeding/tests/two-peer-nearby-simulation.spec.ts) e [`virtual-creatures-game.spec.ts`](../src/domains/characters/tests/virtual-creatures-game.spec.ts))**: Exercitam pareamento Nearby simulado entre dois aparelhos, geração do ovo, incubação, nascimento na coleção e troca de dinossauro ativo.
4. **Testes de Arquitetura ([`architecture.spec.ts`](../src/shared/architecture.spec.ts) + `dependency-cruiser`)**: Garantem a existência do `types.ts` em cada domínio, ausência de `any`, zero dependências circulares e respeito às fronteiras DDD.
5. **Testes E2E Mobile e Acessibilidade (`Playwright` + `@axe-core/playwright`)**:
   - [`e2e/virtual-creatures.spec.ts`](../e2e/virtual-creatures.spec.ts): Valida viewport mobile (`412×915`), ovo inicial, modo dev, cuidados, ficha individual e acessibilidade.
   - [`e2e/breeding-lifecycle.spec.ts`](../e2e/breeding-lifecycle.spec.ts): Valida em duas abas reais de Chromium via `BroadcastChannel` o cruzamento P2P, incubação do ovo ganho, eclosão para `baby`, alimentação, troca entre criatura inicial e filhote no modal do HUD e persistência pós-reload.
