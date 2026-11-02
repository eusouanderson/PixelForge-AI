# PixelForge AI — Especificação do Formato Declarativo de Pixel Art

## 1. Visão Geral

O formato declarativo do **PixelForge AI** é uma representação estruturada, versionada e determinística de arte em pixels projetada para ser gerada eficientemente por Modelos de Linguagem (LLM), serializada em JSON e interpretada sem ambiguidades pelo renderizador.

Em vez de representar cada pixel individualmente em uma matriz gigantesca de dados (o que consumiria dezenas de milhares de tokens da LLM), o formato utiliza:
1. **Paleta Semântica**: mapeamento de identificadores curtos para cores hexadecimais padronizadas.
2. **Camadas Lógicas**: divisão em planos (ex.: fundo, base, contorno, iluminação, detalhes).
3. **Primitivas Geométricas e Operações**: instruções determinísticas como retângulos, círculos, linhas rasterizadas, preenchimentos de área (*flood fill*), pixels pontuais e espelhamento simétrico.

---

## 2. Esquema Conceitual

```json
{
  "$schema": "https://pixelforge.ai/schemas/v1/pixel-art.json",
  "version": "1.0.0",
  "name": "Cavaleiro Cósmico",
  "description": "Sprite de guerreiro medieval estilizado em pixel art",
  "logicalDimensions": {
    "width": 32,
    "height": 32
  },
  "palette": {
    "transparent": "#00000000",
    "bg": "#0f172a",
    "armor_dark": "#334155",
    "armor_base": "#64748b",
    "armor_light": "#94a3b8",
    "gold": "#f59e0b",
    "visor": "#38bdf8",
    "outline": "#020617"
  },
  "layers": [
    {
      "id": "layer_background",
      "name": "Fundo",
      "visible": true,
      "opacity": 1.0,
      "zIndex": 0,
      "operations": [
        {
          "type": "fill",
          "color": "bg"
        }
      ]
    },
    {
      "id": "layer_body",
      "name": "Armadura",
      "visible": true,
      "opacity": 1.0,
      "zIndex": 1,
      "operations": [
        {
          "type": "rect",
          "x": 10,
          "y": 8,
          "width": 12,
          "height": 16,
          "color": "armor_base"
        },
        {
          "type": "circle",
          "cx": 16,
          "cy": 10,
          "radius": 4,
          "color": "armor_light",
          "fill": true
        },
        {
          "type": "line",
          "x0": 13,
          "y0": 10,
          "x1": 19,
          "y1": 10,
          "color": "visor"
        },
        {
          "type": "points",
          "color": "gold",
          "coordinates": [
            [11, 8],
            [20, 8],
            [16, 7]
          ]
        }
      ]
    },
    {
      "id": "layer_outline",
      "name": "Contornos",
      "visible": true,
      "opacity": 1.0,
      "zIndex": 2,
      "operations": [
        {
          "type": "stroke_rect",
          "x": 9,
          "y": 7,
          "width": 14,
          "height": 18,
          "color": "outline"
        }
      ]
    }
  ],
  "metadata": {
    "author": "PixelForge LLM Engine",
    "createdAt": "2026-11-02T20:00:00.000Z",
    "tags": ["character", "knight", "rpg", "32x32"]
  }
}
```

---

## 3. Primitivas e Operações Suportadas

Todas as coordenadas operam no espaço de coordenadas da grade lógica, onde `(0, 0)` é o canto superior esquerdo e `(logicalWidth - 1, logicalHeight - 1)` é o canto inferior direito.

### 3.1. `fill`
Preenche toda a camada com a cor especificada.
- `type`: `"fill"`
- `color`: string (chave presente na paleta de cores)

### 3.2. `pixel`
Define um único pixel discreto na coordenada `(x, y)`.
- `type`: `"pixel"`
- `x`: inteiro no intervalo `[0, logicalWidth - 1]`
- `y`: inteiro no intervalo `[0, logicalHeight - 1]`
- `color`: string (chave da paleta)

### 3.3. `points`
Define uma lista de pixels discretos que compartilham a mesma cor.
- `type`: `"points"`
- `coordinates`: array de pares `[x, y]`
- `color`: string (chave da paleta)

### 3.4. `rect`
Desenha um retângulo preenchido.
- `type`: `"rect"`
- `x`: inteiro da borda esquerda
- `y`: inteiro da borda superior
- `width`: largura em pixels lógicos
- `height`: altura em pixels lógicos
- `color`: string (chave da paleta)

### 3.5. `stroke_rect`
Desenha apenas o contorno de um retângulo de 1 pixel de espessura.
- `type`: `"stroke_rect"`
- `x`: inteiro
- `y`: inteiro
- `width`: largura
- `height`: altura
- `color`: string (chave da paleta)

### 3.6. `line`
Desenha um segmento de reta rasterizado através do algoritmo determinístico de Bresenham.
- `type`: `"line"`
- `x0`: coordenada X de início
- `y0`: coordenada Y de início
- `x1`: coordenada X de fim
- `y1`: coordenada Y de fim
- `color`: string (chave da paleta)

### 3.7. `circle`
Desenha um círculo preenchido ou vazado usando o algoritmo de ponto médio de Bresenham.
- `type`: `"circle"`
- `cx`: centro X
- `cy`: centro Y
- `radius`: raio em pixels
- `color`: string (chave da paleta)
- `fill`: booleano (opcional, padrão `true`)

### 3.8. `symmetry_h`
Aplica espelhamento horizontal em um conjunto de operações com relação ao eixo central da arte ou eixo especificado.
- `type`: `"symmetry_h"`
- `axisX`: inteiro opcional (padrão: `floor(logicalWidth / 2)`)
- `operations`: array de operações aninhadas que serão espelhadas automaticamente

---

## 4. Regras de Validação com Zod

1. **Paleta Obrigatória**: Toda cor utilizada em qualquer operação de camada deve existir declarada na seção `palette`.
2. **Limites de Coordenadas**: Coordenadas que extrapolarem os limites da grade lógica são truncadas (*clamped*) de forma segura pelo renderizador para evitar estouro de buffer.
3. **Formatos de Cor Hexadecimal**: As cores na paleta devem atender à expressão regular `^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$`.
4. **Camadas Únicas**: Cada camada possui identificador único (`id`) e valor numérico de `zIndex` para ordenação de composição.

---

## 5. Organização de Sprites e Ciclo de Vida de Criaturas

Para criação de coleções de sprites evolutivos (como criaturas que passam por ovo, filhote, pré-adolescente, adolescente e adulto) e sequências de animação com múltiplos quadros (`eclosao`, `idle`, `walk`), consulte a especificação dedicada em:

- [Convenção de Ciclo de Vida e Sprites](file:///home/eusouanderson/treino/pixel-art-sprite-generate/docs/SPRITE_LIFECYCLE_CONVENTION.md)


