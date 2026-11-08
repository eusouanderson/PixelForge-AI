# Sistema de Personagens, Necessidades e Atributos (`CHARACTER_SYSTEM.md`)

## 1. Visão Geral

Cada um dos **8 dinossauros canônicos** é modelado como uma entidade independente e configurável em [`CHARACTER_SPECIES_REGISTRY`](file:///home/bob/PixelForge-AI/src/domains/characters/domain/character-registry.ts), sem condicionais `if/else` baseadas em nomes espalhadas pela UI.

---

## 2. Os 8 Personagens Canônicos

1. **Ignisauro** (`ignisauro` — *Ignisaurus Rex*): Fogo (`fire`), temperamento `ferocious`, atividade favorita `lava-sprint`.
2. **Glacissauro** (`glacissauro` — *Cryosaurus Glacius*): Gelo (`ice`), temperamento `stoic`, atividade favorita `cryo-meditation`.
3. **Electrossauro** (`electrossauro` — *Fulgursaurus Rex*): Eletricidade (`electric`), temperamento `energetic`, atividade favorita `thunder-dash`.
4. **Toxissauro** (`toxissauro` — *Venomousaurus Titan*): Veneno (`poison`), temperamento `curious`, atividade favorita `spore-exploration`.
5. **Terrassauro** (`terrassauro` — *Geosaurus Titan*): Terra (`earth`), temperamento `gentle`, atividade favorita `monolith-guard`.
6. **Aerossauro** (`aerossauro` — *Zephyrusaurus Rex*): Ar (`air`), temperamento `energetic`, atividade favorita `sky-glide`.
7. **Umbrassauro** (`umbrassauro` — *Nyxosaurus Rex*): Sombra (`shadow`), temperamento `mysterious`, atividade favorita `umbral-meditation`.
8. **Solassauro** (`solassauro` — *Heliosaurus Imperator*): Luz Solar (`light`), temperamento `noble`, atividade favorita `solar-bask`.

---

## 3. Necessidades (`0–100`) vs. Atributos Permanentes

- **Necessidades ([`pet-needs-engine.ts`](file:///home/bob/PixelForge-AI/src/domains/pet-needs/domain/pet-needs-engine.ts))**: `hunger`, `thirst`, `energy`, `happiness`, `hygiene`, `health` normalizadas em `[0, 100]`, com decaimento temporal determinístico e penalidades de saúde em estados críticos.
- **Atributos ([`attributes-engine.ts`](file:///home/bob/PixelForge-AI/src/domains/attributes/domain/attributes-engine.ts))**: `strength`, `defense`, `agility`, `intelligence`, `endurance`, `elementalAffinity`, evoluídos apenas por casos de uso validados (`feeding_bonus`, `activity_training`, `stage_evolution`, `level_up`).

---

## 4. Como Adicionar um Novo Personagem

1. Adicione as 6 pastas de ciclo de vida (`01-ovo` a `06-adulto`, 54 JSONs `32×32`) em `examples/<novo-id>/`.
2. Adicione o identificador em [`CharacterId`](file:///home/bob/PixelForge-AI/src/domains/characters/types.ts).
3. Registre a espécie em [`CHARACTER_SPECIES_REGISTRY`](file:///home/bob/PixelForge-AI/src/domains/characters/domain/character-registry.ts), seu preset de partículas em [`PARTICLE_PRESET_REGISTRY`](file:///home/bob/PixelForge-AI/src/domains/particles/domain/particle-registry.ts) e seu ambiente em [`ENVIRONMENT_REGISTRY`](file:///home/bob/PixelForge-AI/src/domains/environments/domain/environment-registry.ts).

