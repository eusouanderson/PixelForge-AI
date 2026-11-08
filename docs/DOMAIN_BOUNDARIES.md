# Fronteiras de Domínio e Contratos DDD (`DOMAIN_BOUNDARIES.md`)

## 1. Visão Geral do DDD Modular

A arquitetura do **PixelForge Virtual Creatures** organiza o núcleo do jogo em **12 domínios de negócio independentes** sob `src/domains/` e **1 camada de motor gráfico 3D** sob `src/game-engine/babylon/`, além do núcleo determinístico de rasterização de Pixel Art em `src/core/`.

```text
src/
├── core/                        # Motor puro de Pixel Art (PixelBuffer, Color, Schema Zod)
├── domains/
│   ├── characters/              # Identidade, espécie, genética ocular, evolução e estado emocional
│   ├── pet-needs/               # 6 indicadores (fome, sede, energia, felicidade, higiene, saúde)
│   ├── attributes/              # 6 atributos permanentes (força, defesa, agilidade, inteligência, resistência, afinidade)
│   ├── feeding/                 # Dietas por espécie (favoritos, aceitos, proibidos) e reações nutricionais
│   ├── inventory/               # Controle imutável de estoque de alimentos e itens
│   ├── activities/              # Brincadeiras, treinos, banho, sono e meditação elemental
│   ├── particles/               # Identidade de partículas por criatura e gatilhos reativos
│   ├── environments/            # Configuração declarativa dos 8 cenários 3D e iluminação elemental
│   ├── progression/             # Nível, curva de experiência (XP) e gatilhos de evolução de fase
│   ├── economy/                 # Carteira de Moedas Âmbar (ganhos por atividades e compras)
│   ├── persistence/             # Contratos ClockPort, GameSaveSnapshot, migrações e simulação offline
│   └── settings/                # Preferências de qualidade gráfica Android, som, grade e auto-save
└── game-engine/
    └── babylon/                 # Controlador de cena 3D, texturas Nearest-Neighbor, partículas e dispose
```

---

## 2. Regra do Contrato Único (`types.ts`)

Cada domínio possui exatamente um arquivo principal [`types.ts`](file:///home/bob/PixelForge-AI/src/domains/characters/types.ts) que exporta todas as suas interfaces, Value Objects e tipos discriminados:

- [src/domains/characters/types.ts](file:///home/bob/PixelForge-AI/src/domains/characters/types.ts)
- [src/domains/pet-needs/types.ts](file:///home/bob/PixelForge-AI/src/domains/pet-needs/types.ts)
- [src/domains/attributes/types.ts](file:///home/bob/PixelForge-AI/src/domains/attributes/types.ts)
- [src/domains/feeding/types.ts](file:///home/bob/PixelForge-AI/src/domains/feeding/types.ts)
- [src/domains/inventory/types.ts](file:///home/bob/PixelForge-AI/src/domains/inventory/types.ts)
- [src/domains/activities/types.ts](file:///home/bob/PixelForge-AI/src/domains/activities/types.ts)
- [src/domains/particles/types.ts](file:///home/bob/PixelForge-AI/src/domains/particles/types.ts)
- [src/domains/environments/types.ts](file:///home/bob/PixelForge-AI/src/domains/environments/types.ts)
- [src/domains/progression/types.ts](file:///home/bob/PixelForge-AI/src/domains/progression/types.ts)
- [src/domains/economy/types.ts](file:///home/bob/PixelForge-AI/src/domains/economy/types.ts)
- [src/domains/persistence/types.ts](file:///home/bob/PixelForge-AI/src/domains/persistence/types.ts)
- [src/domains/settings/types.ts](file:///home/bob/PixelForge-AI/src/domains/settings/types.ts)

---

## 3. Regras de Dependência e Isolamento (Verificadas Automatizadamente)

As fronteiras são validadas continuamente por [`.dependency-cruiser.cjs`](file:///home/bob/PixelForge-AI/.dependency-cruiser.cjs) e [`src/shared/architecture.spec.ts`](file:///home/bob/PixelForge-AI/src/shared/architecture.spec.ts):

1. **Zero Dependências Circulares (`no-circular`)**: Nenhum módulo pode participar de ciclos de importação.
2. **Isolamento do Motor Gráfico (`game-engine-must-not-import-persistence`)**: `src/game-engine/**` jamais importa ou controla `src/domains/persistence/**`.
3. **Pureza do Core (`core-domain-must-not-import-ui-or-engine`)**: `src/core/domain/**` não conhece Vue nem Babylon.js.
4. **Proibição de `any`, `@ts-ignore` e `@ts-nocheck`**: Verificado tanto pelo ESLint Flat Config quanto pelo teste de arquitetura.

