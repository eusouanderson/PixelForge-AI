# Pipeline de Qualidade e Integração Contínua (`CI_PIPELINE.md`)

## 1. Visão Geral

A pipeline automatizada está definida em [`.github/workflows/ci.yml`](file:///home/bob/PixelForge-AI/.github/workflows/ci.yml) e espelhada localmente pelo script `pnpm check` em [`package.json`](file:///home/bob/PixelForge-AI/package.json).

---

## 2. Etapas Executadas

1. **Instalação Reproduzível**: `pnpm install --frozen-lockfile`.
2. **Auditoria de Segurança**: `pnpm audit`.
3. **Typecheck Estrito**: `pnpm typecheck` (`vue-tsc --noEmit`).
4. **Linting Type-Aware e Vue**: `pnpm lint` (`eslint src/` com Flat Config em [`eslint.config.js`](file:///home/bob/PixelForge-AI/eslint.config.js)).
5. **Verificação Arquitetural e Dependências Circulares**: `pnpm test:architecture` (`depcruise src --config .dependency-cruiser.cjs && vitest run src/shared/architecture.spec.ts`).
6. **Testes Automatizados + Cobertura 100%**: `pnpm test:coverage` (`vitest run --coverage` com thresholds de 100% em todas as 4 métricas).
7. **Build de Produção**: `pnpm build` (`vue-tsc --noEmit && vite build`).

---

## 3. Comandos Disponíveis

| Script | Descrição |
|---|---|
| `pnpm dev` | Inicia o servidor Vite em desenvolvimento |
| `pnpm build` | Compila e empacota a aplicação para produção (`dist/`) |
| `pnpm typecheck` | Valida tipos TypeScript e templates Vue (`vue-tsc --noEmit`) |
| `pnpm lint` | Executa o ESLint Flat Config em `src/` |
| `pnpm lint:fix` | Corrige problemas automáticos de lint |
| `pnpm test` | Executa a suíte Vitest em execução única |
| `pnpm test:watch` | Executa o Vitest em modo interativo watch |
| `pnpm test:coverage` | Executa os testes com verificação obrigatória de 100% de cobertura |
| `pnpm test:architecture` | Executa o `dependency-cruiser` e os testes de fronteira DDD |
| `pnpm test:e2e` | Executa a suíte E2E mobile no Playwright |
| `pnpm check` | Executa todas as verificações obrigatórias em sequência |
| `pnpm android:sync` | Gera o build web e sincroniza com o projeto Capacitor Android |
| `pnpm android:build` | Sincroniza e compila o APK Android via Gradle (`assembleDebug`) |

