# Sistema de Personagens, Necessidades e Coleção (`CHARACTER_SYSTEM.md`)

## 1. Visão Geral

Cada um dos **11 dinossauros elementais canônicos** é modelado declarativamente em [`CHARACTER_SPECIES_REGISTRY`](../src/domains/characters/domain/character-registry.ts), sem condicionais baseadas em nomes espalhadas pela interface.

As criaturas nascidas de ovos de reprodução P2P compartilham exatamente a mesma estrutura [`CharacterSaveRecord`](../src/domains/persistence/types.ts), mantendo `id` próprio, `originEggId`, genoma herdado (`CreatureGenome`), paleta genética aplicada sem mutar os JSONs originais e ciclo completo de evolução e cuidados em `snapshot.collection`.

---

## 2. Os 11 Dinossauros Elementais (`examples/`)

| # | Espécie (`CharacterId`) | Nome Científico | Elemento | Temperamento | Atividade Favorita | Imagem / Assets |
|---|---|---|---|---|---|---|
| 1 | `ignisauro` | *Ignisaurus Rex* | `fire` | `ferocious` | `lava-sprint` | [`Ignissauro.png`](../examples/ignisauro/Ignissauro.png) |
| 2 | `glacissauro` | *Cryosaurus Glacius* | `ice` | `stoic` | `cryo-meditation` | [`Glacissauro.png`](../examples/glacissauro/Glacissauro.png) |
| 3 | `electrossauro` | *Fulgursaurus Rex* | `electric` | `energetic` | `thunder-dash` | [`Electrossauro.png`](../examples/electrossauro/Electrossauro.png) |
| 4 | `toxissauro` | *Venomousaurus Titan* | `poison` | `curious` | `spore-exploration` | [`Toxissauro.png`](../examples/toxissauro/Toxissauro.png) |
| 5 | `terrassauro` | *Geosaurus Titan* | `earth` | `gentle` | `monolith-guard` | [`Terrassauro.png`](../examples/terrassauro/Terrassauro.png) |
| 6 | `aerossauro` | *Zephyrusaurus Rex* | `air` | `energetic` | `sky-glide` | [`Aerossauro.png`](../examples/aerossauro/Aerossauro.png) |
| 7 | `umbrassauro` | *Nyxosaurus Rex* | `shadow` | `mysterious` | `umbral-meditation` | [`Umbrassauro.png`](../examples/umbrassauro/Umbrassauro.png) |
| 8 | `solassauro` | *Heliosaurus Imperator* | `light` | `noble` | `solar-bask` | [`Solassauro.png`](../examples/solassauro/Solassauro.png) |
| 9 | `rosassauro` | *Rosadominus amabilis* | `fairy` | `gentle` | `solar-bask` | [`Rosassauro.png`](../examples/rosassauro/Rosassauro.png) |
| 10 | `astrassauro` | *Astrasaurus celestialis* | `cosmic` | `mysterious` | `sky-glide` | [`Astrassauro.png`](../examples/astrassauro/Astrassauro.png) |
| 11 | `cristalissauro` | *Crystallodraco nobilis* | `crystal` | `stoic` | `monolith-guard` | [`examples/cristalissauro/`](../examples/cristalissauro/README.md) |

---

## 3. Necessidades (`0–100`) vs. Atributos Permanentes

- **Necessidades ([`pet-needs-engine.ts`](../src/domains/pet-needs/domain/pet-needs-engine.ts))**: `hunger`, `thirst`, `energy`, `happiness`, `hygiene`, `health` normalizadas em `[0, 100]`, com decaimento temporal determinístico (`-6/h` fome, `-8/h` sede, `-5/h` energia, `-4/h` felicidade, `-3/h` higiene) e penalidades de saúde em estados críticos.
- **Atributos ([`attributes-engine.ts`](../src/domains/attributes/domain/attributes-engine.ts))**: `strength`, `defense`, `agility`, `intelligence`, `endurance`, `elementalAffinity`, evoluídos apenas por casos de uso validados (`feeding_bonus`, `activity_training`, `stage_evolution`, `level_up`).
- **Estados Emocionais e Enfermidades ([`character-state-engine.ts`](../src/domains/characters/domain/character-state-engine.ts))**: deriva automaticamente `emotionalState` (`radiant`, `happy`, `calm`, `hungry`, `tired`, `sad`, `sick`, `critical`, `deceased`) e diagnostica as 7 doenças (`malnutrition`, `severe_dehydration`, `overeating_indigestion`, `food_poisoning`, `parasitic_infection`, `chronic_exhaustion`, `elemental_melancholy`).

---

## 4. Como Adicionar um Novo Personagem

1. Adicione as 6 pastas de ciclo de vida (`01-ovo` a `06-adulto`, 54 JSONs `32×32`) em `examples/<novo-id>/`.
2. Adicione o identificador em [`CharacterId`](../src/domains/characters/types.ts).
3. Registre a espécie em [`CHARACTER_SPECIES_REGISTRY`](../src/domains/characters/domain/character-registry.ts), seu preset de partículas em [`PARTICLE_PRESET_REGISTRY`](../src/domains/particles/domain/particle-registry.ts) e seu ambiente em [`ENVIRONMENT_REGISTRY`](../src/domains/environments/domain/environment-registry.ts).
