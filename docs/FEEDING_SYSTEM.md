# Sistema de Alimentação Individual (`FEEDING_SYSTEM.md`)

## 1. Visão Geral

Implementado em [`src/domains/feeding/domain/feeding-engine.ts`](file:///home/bob/PixelForge-AI/src/domains/feeding/domain/feeding-engine.ts).

Cada personagem possui listas declarativas de:
- `favoriteFoodIds`: Multiplicador nutricional de `1.35x`, satisfação `ecstatic`, `+35 XP` e bônus de atributos permanentes da refeição.
- `acceptedFoodIds`: Nutrição padrão `1.0x`, satisfação `satisfied` e `+20 XP`.
- `forbiddenFoodIds`: Rejeição biológica (`accepted: false`, `satisfactionLevel: 'poisoned'`), penalidade de saúde (`-14`) e felicidade (`-18`), sem ganho de atributos.

---

## 2. Catálogo de Alimentos (`FOOD_CATALOG`)

1. `volcanic-roast-meat` — **Pernil Vulcânico Assado** (Favorito: `ignisauro`)
2. `frosted-crystal-berry` — **Fruta-Cristal da Tundra** (Favorito: `glacissauro`)
3. `plasma-thunder-fruit` — **Fruta-Trovão de Plasma** (Favorito: `electrossauro`)
4. `glowing-swamp-mushroom` — **Cogumelo Bioluminescente** (Favorito: `toxissauro`)
5. `emerald-crystal-geode` — **Geodo Crocante de Esmeralda** (Favorito: `terrassauro`)
6. `sky-winged-cloudberry` — **Fruta-Nuvem Alada de Zéfiro** (Favorito: `aerossauro`)
7. `crimson-shadow-soulfruit` — **Fruto Abissal de Rubi** (Favorito: `umbrassauro`)
8. `golden-starburst-sunpeach` — **Pêssego Solar Dourado** (Favorito: `solassauro`)
9. `thermal-spring-water` — **Água Cristalina da Nascente** (Hidratação universal)
10. `vitality-herbal-elixir` — **Elixir Herbal de Vitalidade** (Medicina restauradora universal)

