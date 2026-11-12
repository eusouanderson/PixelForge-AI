# Fronteiras de Domínio e Contratos DDD (`DOMAIN_BOUNDARIES.md`)

## 1. Visão Geral do DDD Modular

A arquitetura de **PixelForge Virtual Creatures** organiza o núcleo do jogo em **16 domínios de negócio independentes** sob `src/domains/` e **1 camada de motor gráfico 3D** sob `src/game-engine/babylon/`, além do núcleo determinístico de rasterização e upscaling pixel-art em `src/core/`.

```text
src/
├── core/                        # Motor puro de Pixel Art (PixelBuffer, Color, Upscaler, Schema Zod)
├── domains/
│   ├── activities/              # Brincadeiras, treinos, banho, sono, meditação elemental e anti-farm
│   ├── attributes/              # 6 atributos permanentes (força, defesa, agilidade, inteligência, resistência, afinidade)
│   ├── breeding/                # Máquina de estados, consenso criptográfico P2P e adaptadores Nearby/BroadcastChannel
│   ├── characters/              # Identidade das 11 espécies, registro, estado emocional, doenças e UI principal
│   ├── economy/                 # Carteira de Moedas Âmbar (ganhos em atividades e compras na loja)
│   ├── environments/            # Configuração declarativa dos 11 cenários 3D e iluminação elemental
│   ├── feeding/                 # Dietas por espécie (favoritos, aceitos, proibidos), 17 itens e remédios
│   ├── genetics/                # DNA, compatibilidade, consanguinidade, herança, mutações e genealogia
│   ├── inventory/               # Controle imutável de estoque de alimentos, água e medicamentos
│   ├── notifications/           # Avaliação de alertas críticos de cuidado e agendamento nativo Android
│   ├── particles/               # Identidade de partículas por espécie e gatilhos reativos
│   ├── persistence/             # Contratos ClockPort, GameSaveSnapshot v2, coleção, incubadora e simulação offline
│   ├── pet-needs/               # 6 indicadores (fome, sede, energia, felicidade, higiene, saúde)
│   ├── progression/             # Nível, curva de experiência (XP) e evolução orgânica nas 6 fases
│   ├── settings/                # Qualidade gráfica Android, grade pixel, notificações e modo dev
│   └── updater/                 # Manifestos versionados, integridade SHA-256 e OTA Web / APK Android
└── game-engine/
    └── babylon/                 # Controlador de cena 3D, texturas Nearest-Neighbor, partículas e dispose
```

---

## 2. Regra do Contrato Único (`types.ts`)

Cada um dos 16 domínios expõe um arquivo principal `types.ts` com interfaces, Value Objects e tipos discriminados:

- [`src/domains/activities/types.ts`](../src/domains/activities/types.ts)
- [`src/domains/attributes/types.ts`](../src/domains/attributes/types.ts)
- [`src/domains/breeding/types.ts`](../src/domains/breeding/types.ts)
- [`src/domains/characters/types.ts`](../src/domains/characters/types.ts)
- [`src/domains/economy/types.ts`](../src/domains/economy/types.ts)
- [`src/domains/environments/types.ts`](../src/domains/environments/types.ts)
- [`src/domains/feeding/types.ts`](../src/domains/feeding/types.ts)
- [`src/domains/genetics/types.ts`](../src/domains/genetics/types.ts)
- [`src/domains/inventory/types.ts`](../src/domains/inventory/types.ts)
- [`src/domains/notifications/types.ts`](../src/domains/notifications/types.ts)
- [`src/domains/particles/types.ts`](../src/domains/particles/types.ts)
- [`src/domains/persistence/types.ts`](../src/domains/persistence/types.ts)
- [`src/domains/pet-needs/types.ts`](../src/domains/pet-needs/types.ts)
- [`src/domains/progression/types.ts`](../src/domains/progression/types.ts)
- [`src/domains/settings/types.ts`](../src/domains/settings/types.ts)
- [`src/domains/updater/types.ts`](../src/domains/updater/types.ts)

---

## 3. Regras de Dependência e Isolamento (Verificadas Automatizadamente)

As fronteiras são validadas continuamente por [`.dependency-cruiser.cjs`](../.dependency-cruiser.cjs) e [`src/shared/architecture.spec.ts`](../src/shared/architecture.spec.ts):

1. **Zero Dependências Circulares (`no-circular`)**: Nenhum módulo pode participar de ciclos de importação.
2. **Isolamento do Motor Gráfico (`game-engine-must-not-import-persistence`)**: `src/game-engine/**` jamais importa ou controla `src/domains/persistence/**`.
3. **Pureza do Core (`core-domain-must-not-import-ui-or-engine`)**: `src/core/domain/**` não conhece Vue nem Babylon.js.
4. **Proibição de `any`, `@ts-ignore` e `@ts-nocheck`**: Verificado tanto pelo ESLint Flat Config quanto pelo teste de arquitetura.
