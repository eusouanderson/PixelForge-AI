# Sistema de Alimentação Individual e Medicamentos (`FEEDING_SYSTEM.md`)

## 1. Visão Geral

Implementado em [`src/domains/feeding/domain/feeding-engine.ts`](../src/domains/feeding/domain/feeding-engine.ts).

Cada espécie possui listas declarativas de dieta:
- **`favoriteFoodIds`**: Multiplicador nutricional de `1.35x`, estado `ecstatic`, `+10 XP` e bônus de atributos permanentes da refeição.
- **`acceptedFoodIds`**: Nutrição padrão `1.0x`, satisfação `satisfied` e `+5 XP`.
- **`forbiddenFoodIds`**: Rejeição biológica (`accepted: false`, `satisfactionLevel: 'poisoned'`), penalidade de saúde (`-18`) e felicidade (`-20`), `0 XP`, e contrai **Intoxicação por Dieta Incompatível** (`food_poisoning`).
- **Travas de Moderação**:
  - Dar comida sólida com `hunger >= 95` causa **Congestão por Excesso de Comida** (`overeating_indigestion`).
  - Dar hidratação com `thirst >= 95` recusa o excesso com empanturramento (`-10` Felicidade, `-5` Energia).
  - Administrar remédio específico sem que o dinossauro possua a doença correspondente rejeita o medicamento (`-10` Felicidade, `-5` Saúde/Energia, `0 XP`). Medicamentos válidos concedem `+8 XP` e curam a enfermidade alvo.

---

## 2. Catálogo Completo (`FOOD_CATALOG` — 17 Itens)

### Alimentos Elementais e Hidratação
1. `volcanic-roast-meat` — **Pernil Vulcânico Assado** (`25¢` · Favorito: `ignisauro`)
2. `frosted-crystal-berry` — **Fruta-Cristal da Tundra** (`25¢` · Favorito: `glacissauro`)
3. `plasma-thunder-fruit` — **Fruta-Trovão de Plasma** (`30¢` · Favorito: `electrossauro`, `astrassauro`)
4. `glowing-swamp-mushroom` — **Cogumelo Bioluminescente** (`25¢` · Favorito: `toxissauro`)
5. `emerald-crystal-geode` — **Geodo Crocante de Esmeralda** (`30¢` · Favorito: `terrassauro`, `cristalissauro`)
6. `sky-winged-cloudberry` — **Fruta-Nuvem Alada de Zéfiro** (`28¢` · Favorito: `aerossauro`, `astrassauro`)
7. `crimson-shadow-soulfruit` — **Fruto Abissal de Rubi** (`35¢` · Favorito: `umbrassauro`)
8. `golden-starburst-sunpeach` — **Pêssego Solar Dourado** (`35¢` · Favorito: `solassauro`, `rosassauro`)
9. `thermal-spring-water` — **Água Cristalina da Nascente** (`12¢` · Hidratação universal · Favorito de `cristalissauro`)

### Medicamentos Específicos e Panaceia
10. `nutri-vital-serum` — **Soro Nutri-Vital Concentrado** (`45¢` · Cura `malnutrition`)
11. `isotonic-hydra-elixir` — **Elixir Isotônico de Hidratação** (`45¢` · Cura `severe_dehydration`)
12. `enzymatic-digest-tonic` — **Tônico Digestivo Enzimático** (`45¢` · Cura `overeating_indigestion`)
13. `antitoxin-charcoal-extract` — **Extrato Antitoxina de Carvão Vulcânico** (`55¢` · Cura `food_poisoning`)
14. `antiseptic-spore-salve` — **Bálsamo Antisséptico Purificador** (`45¢` · Cura `parasitic_infection`)
15. `adrenal-stamina-ampoule` — **Ampola Revitalizante de Vigor** (`50¢` · Cura `chronic_exhaustion`)
16. `serotonin-aura-nectar` — **Néctar Floral da Serenidade** (`50¢` · Cura `elemental_melancholy`; favorito alimentar de `rosassauro`)
17. `vitality-herbal-elixir` — **Elixir Herbal de Vitalidade (Panaceia)** (`120¢` · Cura todas as doenças simultaneamente + `+1 Resistência`)
