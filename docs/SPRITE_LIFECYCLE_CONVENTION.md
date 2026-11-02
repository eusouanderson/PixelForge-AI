# PixelForge AI — Convenção de Ciclo de Vida e Organização de Sprites

## 1. Visão Geral

Este documento estabelece o padrão arquitetural de organização de diretórios, nomenclatura de arquivos e taxonomia de metadados para sprites de criaturas e personagens no **PixelForge AI**.

Esta convenção é a base oficial utilizada pelo motor e pela LLM para gerar coleções completas de sprites evolutivos consistentes.

---

## 2. Identificação da Criatura

Cada espécie de criatura possui um identificador canônico em *kebab-case* e um nome formal exibido na interface:

- **Identificador**: `ignisauro`
- **Nome Formal**: `Ignisauro` (*Ignisaurus Rex*)
- **Arquétipo**: Réptil pré-histórico de escamas alaranjadas, crista dorsal verde esmeralda e afinidade com energia vulcânica/dourada.

---

## 3. Fases da Vida (Life Stages)

O desenvolvimento de cada criatura é particionado em 5 fases cronológicas obrigatórias, representadas por pastas numeradas dentro do diretório da criatura:

```text
examples/
└── <nome-da-criatura>/
    ├── 01-ovo/                 # Estágio embrionário e eclosão
    ├── 02-baby/                # Filhote recém-nascido no ninho
    ├── 03-pre-adolescente/     # Jovem ágil com postura bípede frontal
    ├── 04-adolescente/         # Sub-adulto atlético frontal com crista e faíscas
    └── 05-adulto/              # Forma majestosa madura titânica frontal
```

### 3.1. Fase 1: `01-ovo`
- **Descrição**: O ovo no ninho ancestral passando pelos estágios de maturação e quebra.
- **Animações Típicas**:
  - `eclosao`: sequência de quebra da casca (intacto, rachando, quebrando, abrindo).

### 3.2. Fase 2: `02-baby`
- **Descrição**: O filhote recém-saído da casca, com proporções infantis (cabeça proporcional, olhos expressivos frontais, crista jovem).
- **Animações Típicas**:
  - `idle`: ciclo de respiração sutil, piscada e movimento de cauda.

### 3.3. Fase 3: `03-pre-adolescente`
- **Descrição**: Criatura jovem em postura bípede frontal, pernas ágeis, ventre claro central, dois olhos dourados visíveis e crista esmeralda em expansão.
- **Animações Típicas**:
  - `idle`: postura ereta atenta frontal com ciclo de respiração.
  - `walk`: passos curtos exploratórios frontais.

### 3.4. Fase 4: `04-adolescente`
- **Descrição**: Corpo atlético e musculoso frontal, tórax alargado, dois olhos dourados penetrantes, crista estendida e primeiras faíscas nos flancos.
- **Animações Típicas**:
  - `idle`: postura agressiva frontal com respiração e brasas.
  - `run`: corrida frontal.
  - `ember-bite`: investida com calor vulcânico.

### 3.5. Fase 5: `05-adulto`
- **Descrição**: Porte titânico imponente frontal, placas vulcânicas robustas em ambos os flancos, dois olhos dourados dominantes, cauda pesada e garras maciças.
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
