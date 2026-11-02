# Ignisauro (*Ignisaurus Rex*) — Coleção Oficial de Sprites

## 1. Identificação da Criatura

- **Identificador Canônico**: `ignisauro`
- **Nome Formal**: Ignisauro (*Ignisaurus Rex*)
- **Arquétipo**: Dinossauro réptil ígneo de escamas terracota/laranja, ventre creme/amarelado, crista dorsal esmeralda vibrante, garras pálidas e olhos dourados.

---

## 2. Estrutura de Diretórios por Fase da Vida

```text
examples/ignisauro/
├── 01-ovo/                 # Estágio embrionário e eclosão completa (4 quadros)
├── 02-baby/                # Filhote recém-eclodido na casca em animação idle (2 quadros)
├── 03-crianca/             # Criança pequena bípede fofa com barriguinha amarela (2 quadros idle)
├── 04-pre-adolescente/     # Jovem ágil com postura bípede e cauda desenvolvida (2 quadros idle)
├── 05-adolescente/         # Sub-adulto atlético hiperdetalhado com escamas e brasas (2 quadros idle)
└── 06-adulto/              # Forma titânica ápice com carapaça vulcânica e magma (2 quadros idle)
```

---

## 3. Arquivos e Quadros de Animação

### `01-ovo/` (Sequência de Eclosão — 4 Quadros)
- `ignisauro-ovo-eclosao-frame-1.json`: Ovo verde intacto repousando no ninho de galhos.
- `ignisauro-ovo-eclosao-frame-2.json`: Primeiras fissuras no centro da casca com energia luminescente.
- `ignisauro-ovo-eclosao-frame-3.json`: Fraturas profundas e fendas douradas energizadas.
- `ignisauro-ovo-eclosao-frame-4.json`: Casca superior aberta, emergindo crista esmeralda e olhos dourados do filhote.

### `02-baby/` (Animação Idle do Filhote — 2 Quadros)
- `ignisauro-baby-idle-frame-1.json`: Filhote sentado na casca com postura ereta, olhos atentos e crista erguida.
- `ignisauro-baby-idle-frame-2.json`: Ciclo respiratório com elevação torácica de 1px, piscar alegre, chilreio e abanar de cauda.

### `03-crianca/` (Animação Idle Criança — 2 Quadros)
- `ignisauro-crianca-idle-frame-1.json`: Postura bípede infantil frontal relaxada com olhar curioso, barriguinha redonda e crista brotando.
- `ignisauro-crianca-idle-frame-2.json`: Ciclo respiratório com elevação torácica de 1px, piscar de olhos e ponta da cauda abanando.

### `04-pre-adolescente/` (Animação Idle Jovem — 2 Quadros)
- `ignisauro-pre-adolescente-idle-frame-1.json`: Postura bípede ágil fora da casca, garras afiadas, cauda estendida e crista em expansão.
- `ignisauro-pre-adolescente-idle-frame-2.json`: Ciclo respiratório jovem com elevação torácica de 1px, reflexo nas garras e leve oscilação da crista.

### `05-adolescente/` (Animação Idle Atlética Hiperdetalhada — 2 Quadros)
- `ignisauro-adolescente-idle-frame-1.json`: Postura predatória robusta e veloz, crista dorsal estendida, placas dérmicas e brasas nos flancos.
- `ignisauro-adolescente-idle-frame-2.json`: Ciclo respiratório atlético com arco torácico elevado em 1px, fulgor nas placas e ondulação da cauda.

### `06-adulto/` (Animação Idle Titânica Ancestral — 2 Quadros)
- `ignisauro-adulto-idle-frame-1.json`: Ignisaurus Rex ápice em imponência titânica, carapaça vulcânica, crista esmeralda energizada e mandíbula potente.
- `ignisauro-adulto-idle-frame-2.json`: Ciclo de respiração profunda com elevação torácica massiva de 1px, brasas incandescentes de magma e cauda pesada de combate.

---

## 4. Regras de Renderização e Transparência

- Resolução Lógica: 32 × 32 pixels.
- Resolução de Saída: 1024 × 1024 pixels (*nearest-neighbor*).
- Fundo: 100% transparente (`#00000000`).
- Esquema de validação: Zod `DeclarativePixelArtSchema` v1.0.0.
