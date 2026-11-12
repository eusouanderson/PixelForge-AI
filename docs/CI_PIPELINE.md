# Pipeline de Qualidade, E2E e Release (`CI_PIPELINE.md`)

## 1. Visão Geral

A pipeline automatizada está definida em [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) e espelhada localmente pelo script `pnpm check` em [`package.json`](../package.json).

---

## 2. Etapas e Jobs Executados

1. **`quality`**:
   - Instalação reproduzível (`pnpm install --frozen-lockfile`) e auditoria (`pnpm audit --audit-level=critical || true`).
   - Cálculo/bump semântico de versão na `main` (`scripts/bump-version.mjs`).
   - `pnpm typecheck` (`vue-tsc --noEmit`) + `pnpm lint` (`eslint src/`).
   - `pnpm test:architecture` (`dependency-cruiser` + `architecture.spec.ts`).
   - `pnpm test:coverage` (**100% em Statements, Branches, Functions e Lines**).
   - `pnpm build` (gera `dist/` + `web-bundle.zip` + manifesto `version.json`).
2. **`build-android-apk`** (paralelo ao `e2e`, após `quality`):
   - Sincroniza Capacitor (`pnpm cap sync android`) e compila o APK assinado (`./gradlew assembleRelease --no-daemon` com keystore persistente via GitHub Secrets e retry automático em falhas transitórias de rede).
3. **`e2e`** (paralelo ao `build-android-apk`, após `quality`):
   - Baixa `web-dist`, instala Chromium (`pnpm exec playwright install --with-deps chromium`) e executa `pnpm test:e2e` (cobrindo ciclo inicial, acessibilidade `@axe-core/playwright` e reprodução P2P entre duas abas até eclosão e coleção).
4. **`release`** & **`deploy-pages`** (após aprovação de `quality`, `build-android-apk` e `e2e` na `main`):
   - Recalcula checksum real do APK em `version.json`, publica GitHub Release com APK + `web-bundle.zip` + `version.json` e faz deploy no GitHub Pages.

---

## 3. Comandos Disponíveis

| Script | Descrição |
|---|---|
| `pnpm dev:game` | Inicia o servidor Vite configurado para testar o jogo em modo mobile/APK |
| `pnpm build` | Compila e empacota a aplicação para produção (`dist/` e `web-bundle.zip`) |
| `pnpm typecheck` | Valida tipos TypeScript e templates Vue (`vue-tsc --noEmit`) |
| `pnpm lint` | Executa o ESLint Flat Config em `src/` |
| `pnpm lint:fix` | Corrige problemas automáticos de lint |
| `pnpm test` | Executa a suíte Vitest |
| `pnpm test:watch` | Executa o Vitest em modo interativo watch |
| `pnpm test:coverage` | Executa os testes com verificação obrigatória de 100% de cobertura |
| `pnpm test:architecture` | Executa o `dependency-cruiser` e os testes de fronteira DDD |
| `pnpm test:e2e` | Executa a suíte E2E mobile e de reprodução P2P no Playwright |
| `pnpm check` | Executa todas as verificações obrigatórias de código e build |
| `pnpm android:sync` | Gera o build web e sincroniza com o projeto Capacitor Android |
| `pnpm android:build` | Sincroniza e compila o APK Android via Gradle (`assembleDebug`) |
