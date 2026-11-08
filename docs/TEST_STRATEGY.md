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

Configurados em [`vitest.config.ts`](file:///home/bob/PixelForge-AI/vitest.config.ts):

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

1. **Testes Unitários de Domínio e Infraestrutura**: Validam cálculos de necessidades, dietas, atributos, progressão, economia, simulação temporal determinística (`ClockPort`), migrações de save e rasterização `PixelBuffer`/`Canvas2dRenderer`.
2. **Testes de Validação de Assets ([`examples.spec.ts`](file:///home/bob/PixelForge-AI/src/core/domain/validation/examples.spec.ts))**: Validam todos os **432 arquivos JSON** das 8 criaturas contra o schema Zod.
3. **Testes de Arquitetura ([`architecture.spec.ts`](file:///home/bob/PixelForge-AI/src/shared/architecture.spec.ts) + `dependency-cruiser`)**: Garantem a existência do `types.ts` em cada domínio, ausência de `any` e respeito às fronteiras entre camadas.
4. **Testes E2E e Acessibilidade (`Playwright` + `@axe-core/playwright`)**: Validam a experiência mobile portrait-first (`412×915`), troca de personagens, alimentação, cuidados, ficha individual e contraste/acessibilidade.

