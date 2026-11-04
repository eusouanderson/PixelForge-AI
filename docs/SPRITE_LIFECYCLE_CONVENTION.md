# PixelForge AI — Convenção de Ciclo de Vida e Organização de Sprites

## 1. Visão Geral

Este documento estabelece o padrão arquitetural de organização de diretórios, nomenclatura de arquivos e taxonomia de metadados para sprites de criaturas e personagens no **PixelForge AI**.

Esta convenção é a base oficial utilizada pelo motor e pela LLM para gerar coleções completas de sprites evolutivos consistentes.

---

## 2. Identificação das Criaturas Canônicas

Cada espécie de criatura possui um identificador canônico em *kebab-case*, nome formal e arquétipo elemental:

1. **Ignisauro** (`ignisauro` — *Ignisaurus Rex*):
   - Arquétipo: Réptil pré-histórico vulcânico de escamas alaranjadas, crista verde esmeralda e olhos dourados (`#fde047`).
   - Casca do ovo: Verde reptiliano ancestral com ninho de galhos terrosos.
2. **Glacissauro** (`glacissauro` — *Cryosaurus Glacius*):
   - Arquétipo: Réptil glacial ancestral com escamas cerúleas de gelo, chifres cristalinos e olhos ciano-gelo penetrantes (`#38bdf8`).
   - Casca do ovo: Azul celeste glacial com ninho de pedras árticas escuras.
3. **Electrossauro** (`electrossauro` — *Fulgursaurus Rex*):
   - Arquétipo: Réptil galvânico da tempestade com escamas douradas condutoras, carapaça azul-marinho e olhos elétricos brilhantes (`#06b6d4`).
   - Casca do ovo: Âmbar/ouro reluzente com ninho de basalto vulcânico negro.
4. **Toxissauro** (`toxissauro` — *Venomousaurus Titan*):
   - Arquétipo: Titã pantanoso venenoso com escamas violeta-tóxicas, pústulas ácidas bioluminescentes e olhos verde-limão radioativos (`#84cc16`).
   - Casca do ovo: Violeta abissal com manchas ácidas e ninho de musgo de turfa pantanosa.
5. **Terrassauro** (`terrassauro` — *Geosaurus Titan*):
   - Arquétipo: Paquicefalossauro/Estegossauro de terra ancestral com domo craniano monolítico arredondado, placas dorsais esmeralda pentagonais, manoplas esmagadoras de golem, cauda Thagomizer e olhos âmbar-citrino (`#f59e0b`).
   - Casca do ovo: Terracota rochosa com fissuras de musgo esmeralda em ninho de basalto.
6. **Aerossauro** (`aerossauro` — *Zephyrusaurus Rex*):
   - Arquétipo: Pteranodon/Archaeopteryx celeste com crista real de três plumas altas, bico dourado aerodinâmico, asas emplumadas abertas, gola nívea e olhos ametista-celeste (`#c084fc`).
   - Casca do ovo: Azul-celeste perolado com marcas de vento em ninho de plumas brancas.
7. **Umbrassauro** (`umbrassauro` — *Nyxosaurus Rex*):
   - Arquétipo: Carnotauro ceifador abissal com chifres taurinos horizontais largos, elmo craniano de osso pálido, costelas ósseas aparentes sobre núcleo carmesim, cauda em foice óssea e olhos rubi-sangue (`#ef4444`).
   - Casca do ovo: Obsidiana sombria com suturas ósseas e brilho carmesim em ninho de cinzas.
8. **Solassauro** (`solassauro` — *Heliosaurus Imperator*):
   - Arquétipo: Imperador solar com juba radiante de 360 graus em forma de coroa de raios solares, armadura branco-platina e ouro imperial com brasão do sol, cauda maça-solar e olhos safira-celestial (`#38bdf8`).
   - Casca do ovo: Marfim-platina com raios de ouro solar em ninho de fios dourados.

---

## 3. Fases da Vida (Life Stages)

O desenvolvimento de cada criatura é particionado em 6 fases cronológicas obrigatórias, representadas por pastas numeradas dentro do diretório da criatura:

```text
examples/
└── <nome-da-criatura>/
    ├── 01-ovo/                 # Estágio embrionário e eclosão
    ├── 02-baby/                # Filhote recém-nascido na casca
    ├── 03-crianca/             # Criança pequena bípede fofa com postura ereta
    ├── 04-pre-adolescente/     # Jovem ágil com postura bípede e cauda desenvolvida
    ├── 05-adolescente/         # Sub-adulto atlético hiperdetalhado com escamas e brasas
    └── 06-adulto/              # Forma majestosa madura titânica frontal
```

### 3.1. Fase 1: `01-ovo`
- **Descrição**: O ovo no ninho ancestral passando pelos estágios de maturação e quebra.
- **Animações Típicas**:
  - `eclosao`: sequência de quebra da casca (intacto, rachando, quebrando, abrindo).

### 3.2. Fase 2: `02-baby`
- **Descrição**: O filhote recém-saído da casca no ninho, com proporções de bebê (dois grandes olhos dourados frontais, barriga amarela e crista inicial).
- **Animações Típicas**:
  - `idle`: ciclo de respiração sutil, piscada e movimento de cauda.

### 3.3. Fase 3: `03-crianca`
- **Descrição**: A criatura fora do ninho em seus primeiros passos bípedes, corpo gordinho infantil, barriguinha arredondada, crista brotando no topo e cauda curta.
- **Animações Típicas**:
  - `idle`: postura ereta atenta infantil, curiosa com o ambiente.

### 3.4. Fase 4: `04-pre-adolescente`
- **Descrição**: Criatura jovem em postura bípede ágil frontal, pernas mais firmes, crista esmeralda em expansão e cauda de equilíbrio.
- **Animações Típicas**:
  - `idle`: postura atenta frontal com ciclo de respiração.
  - `walk`: passos curtos exploratórios frontais.

### 3.5. Fase 5: `05-adolescente`
- **Descrição**: Corpo atlético e musculoso frontal com alta densidade de detalhes: escamas dérmicas, tórax alargado com placas ventrais esculpidas, dois olhos dourados penetrantes, crista estendida e primeiras faíscas nos flancos.
- **Animações Típicas**:
  - `idle`: postura agressiva frontal com respiração e brasas.
  - `run`: corrida frontal.
  - `ember-bite`: investida com calor vulcânico.

### 3.6. Fase 6: `06-adulto`
- **Descrição**: Porte titânico imponente frontal de ápice: carapaça vulcânica chanfrada, chifres dérmicos, placas dorsais profundas com fendas de magma, dois olhos dourados dominantes, mandíbula potente e garras maciças.
- **Animações Típicas**:
  - `idle`: respiração pesada dominante frontal com magma.
  - `roar`: rugido sísmico frontal.
  - `magma-breath`: sopro de magma frontal.

---

## 4. Padrão de Nomenclatura de Arquivos JSON

Os arquivos declarativos JSON seguem a sintaxe padronizada:

```text
{criatura}-{fase}-{animacao}-frame-{N}.json
```

### Exemplos:
- `ignisauro-ovo-eclosao-frame-1.json`
- `ignisauro-ovo-eclosao-frame-2.json`
- `ignisauro-ovo-eclosao-frame-3.json`
- `ignisauro-ovo-eclosao-frame-4.json`
- `ignisauro-baby-idle-frame-1.json`
- `ignisauro-baby-idle-frame-2.json`
- `ignisauro-pre-adolescente-idle-frame-1.json`
- `ignisauro-pre-adolescente-idle-frame-2.json`
- `ignisauro-adolescente-idle-frame-1.json`
- `ignisauro-adolescente-idle-frame-2.json`
- `ignisauro-adulto-idle-frame-1.json`
- `ignisauro-adulto-idle-frame-2.json`

---

## 5. Esquema Obrigatório de Metadados

Todo arquivo de arte pertencente a uma criatura deve registrar os campos semânticos em `metadata`:

```json
{
  "$schema": "https://pixelforge.ai/schemas/v1/pixel-art.json",
  "version": "1.0.0",
  "name": "Ignisauro — Eclosão: 1. Ovo Inteiro",
  "description": "Ovo de Ignisauro intacto com casca verde reptiliana repousando em ninho de galhos",
  "logicalDimensions": {
    "width": 32,
    "height": 32
  },
  "metadata": {
    "creatureName": "Ignisauro",
    "lifeStage": "ovo",
    "animation": "eclosao",
    "frame": 1,
    "author": "PixelForge AI",
    "tags": ["ignisauro", "dinosaur", "ovo", "eclosao", "32x32"]
  }
}
```

---

## 6. Diretrizes de Coerência Genética e Visual

1. **Orientação Estritamente Frontal (Proibido Perfil Lateral)**:
   - A Pixel Art das criaturas **NUNCA** deve ser desenhada de lado ou em perfil.
   - A criatura deve estar **sempre virada de frente para o usuário** ("de frente para gente"), com anatomia frontal e simétrica/balanceada.
2. **Genética Ocular Permanente e Binocular (Dois Olhos Visíveis)**:
   - Os dois olhos devem ser **sempre visíveis**, com o formato, anatomia e cores definidos desde o nascimento (`baby`).
   - A paleta ocular (`dino_eye`, `dino_pupil`, `specular`), o posicionamento bilateral em relação ao focinho e o formato geométrico são características biológicas permanentes mantidas por toda a vida até a fase adulta (`adulto`).
   - Modificações futuras permitidas limitam-se unicamente a expressões transitórias (cansaço com pálpebras entreabertas, raiva com sobrancelha inclinada ou fome), mantendo sempre a estrutura ocular binocular frontal.
3. **Paleta Unificada e Progressiva**:
   - As cores fundamentais da criatura (pele `dino_base`, ventre `dino_belly`, crista `dino_crest`, olhos `dino_eye`) mantêm seus valores hexadecimais constantes ao longo das fases, ganhando tons mais profundos de maturação conforme a criatura envelhece.
4. **Fundo Transparente**:
   - Toda arte deve manter fundo 100% transparente (`#00000000`), sem camadas de preenchimento opaco retangulares, viabilizando uso imediato em engines de jogos.
5. **Determinismo**:
   - Cada arquivo é auto-contido e reproduzível pelo renderizador do PixelForge AI em qualquer resolução de saída (*nearest-neighbor*).
