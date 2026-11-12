# Guia Completo do Jogo — PixelForge Virtual Creatures (`GAME_GUIDE.md`)

Este guia detalha o **objetivo do jogo**, os **11 dinossauros elementais** (com suas artes conceituais de `examples/`), todas as **regras de cuidados, alimentação, atividades e doenças**, a **curva de evolução de 30 dias** e o **ciclo completo de reprodução P2P até a coleção**.

---

## 1. Objetivo Principal e Loop de Jogo

O objetivo de **PixelForge Virtual Creatures** é **chocar, cuidar, evoluir e multiplicar uma linhagem de dinossauros elementais** em tempo real:

1. **Início (`ovo` ancestral):** Um novo jogo sorteia aleatoriamente 1 entre 11 dinossauros em forma de ovo. Ele incuba por **`2 minutos` reais** (`EGG_INCUBATION_DURATION_MS = 120_000 ms`), rachando em animação de 4 quadros até nascer como **`baby`**.
2. **Cuidados contínuos em tempo real:** As barras de **Fome, Sede, Energia, Felicidade, Higiene e Saúde** continuam evoluindo mesmo quando o aplicativo está fechado. Cabe ao jogador equilibrar dieta específica, hidratação, banho, descanso e treinos sem exageros.
3. **Evolução e Atributos:** Ao cumprir requisitos de idade em horas reais, nível de XP, saúde e felicidade — **sem nenhuma doença ativa** — a criatura avança até o estágio **`adulto`**, ganhando `+3` em atributos físicos/mentais e `+4` em afinidade elemental a cada transição evolutiva.
4. **Reprodução Genética P2P e Coleção:** Dinossauros adultos de sexos opostos podem cruzar via P2P offline (**Google Nearby Connections** no Android ou **BroadcastChannel** na Web). O ovo gerado pode ser incubado no **Berçário** (`3 minutos`) e chocado em um **novo dinossauro `baby` com DNA herdado**, passando a integrar sua coleção jogável.
5. **Troca livre de dinossauros:** Pelo botão **`🐉 N`** no cabeçalho superior (ou na aba **📄 Ficha** → *Minha Coleção de Dinossauros*), você alterna a qualquer momento entre seu dinossauro inicial e todos os novos filhotes nascidos para alimentar, treinar e acompanhar o ciclo de vida de cada um.

---

## 2. Catálogo dos 11 Dinossauros e Imagens (`examples/`)

Todos os sprites jogáveis (`32×32`) vivem em `examples/<especie>/01-ovo` a `06-adulto` (54 arquivos JSON por espécie, 594 no total). Dez espécies também possuem ilustrações de referência em alta resolução em `examples/`:

| Espécie | Nome Científico | Elemento | Habitat 3D | Alimento Favorito | Atividade Favorita | Arte em `examples/` |
|---|---|---|---|---|---|---|
| **Ignisauro** | *Ignisaurus Rex* | Fogo (`fire`) | Caldeira Vulcânica Ancestral | Pernil Vulcânico Assado | Corrida nas Rochas Quentes | [`examples/ignisauro/Ignissauro.png`](../examples/ignisauro/Ignissauro.png) |
| **Glacissauro** | *Cryosaurus Glacius* | Gelo (`ice`) | Santuário da Geleira Eterna | Fruta-Cristal da Tundra | Meditação Cristalina | [`examples/glacissauro/Glacissauro.png`](../examples/glacissauro/Glacissauro.png) |
| **Electrossauro** | *Fulgursaurus Rex* | Eletricidade (`electric`) | Pico dos Para-Raios de Basalto | Fruta-Trovão de Plasma | Circuito de Relâmpagos | [`examples/electrossauro/Electrossauro.png`](../examples/electrossauro/Electrossauro.png) |
| **Toxissauro** | *Venomousaurus Titan* | Veneno (`poison`) | Pântano Bioluminescente de Turfa | Cogumelo Bioluminescente | Exploração Bioluminescente | [`examples/toxissauro/Toxissauro.png`](../examples/toxissauro/Toxissauro.png) |
| **Terrassauro** | *Geosaurus Titan* | Terra (`earth`) | Cânion Monolítico de Esmeralda | Geodo Crocante de Esmeralda | Postura do Monólito | [`examples/terrassauro/Terrassauro.png`](../examples/terrassauro/Terrassauro.png) |
| **Aerossauro** | *Zephyrusaurus Rex* | Vento (`air`) | Altar Flutuante dos Ventos | Fruta-Nuvem Alada de Zéfiro | Voo nas Correntes de Zéfiro | [`examples/aerossauro/Aerossauro.png`](../examples/aerossauro/Aerossauro.png) |
| **Umbrassauro** | *Nyxosaurus Rex* | Sombra (`shadow`) | Vale de Obsidiana e Luar Carmesim | Fruto Abissal de Rubi | Comunhão das Chamas Carmesim | [`examples/umbrassauro/Umbrassauro.png`](../examples/umbrassauro/Umbrassauro.png) |
| **Solassauro** | *Heliosaurus Imperator* | Luz Solar (`light`) | Templo Solar da Aurora Dourada | Pêssego Solar Dourado | Banho de Luz da Aurora | [`examples/solassauro/Solassauro.png`](../examples/solassauro/Solassauro.png) |
| **Rosassauro** | *Rosadominus amabilis* | Fada (`fairy`) | Jardim Encantado de Florescência | Néctar Floral da Serenidade / Pêssego Solar Dourado | Banho de Luz da Aurora | [`examples/rosassauro/Rosassauro.png`](../examples/rosassauro/Rosassauro.png) |
| **Astrassauro** | *Astrasaurus celestialis* | Cosmos (`cosmic`) | Observatório do Véu Estelar | Fruta-Trovão de Plasma / Fruta-Nuvem Alada de Zéfiro | Voo nas Correntes de Zéfiro | [`examples/astrassauro/Astrassauro.png`](../examples/astrassauro/Astrassauro.png) |
| **Cristalissauro** | *Crystallodraco nobilis* | Cristal (`crystal`) | Caverna dos Geodos Prismáticos | Geodo Crocante de Esmeralda / Água Cristalina da Nascente | Postura do Monólito | *Somente JSONs 32×32 (`examples/cristalissauro/`)* |

---

## 3. Cuidados em Detalhe

### 3.1. Catálogo Completo de Alimentos, Hidratação e Remédios (`FOOD_CATALOG`)

Todo inventário inicia com **1500 Moedas Âmbar**, **6× Água Cristalina**, **3× de cada alimento elemental**, **2× de cada remédio específico** e **4× Elixir Herbal (Panaceia)**. O limite por item é **99**.

| Item (`id`) | Categoria | Preço | Efeitos Base | Uso / Observação |
|---|---|---|---|---|
| `volcanic-roast-meat` | Carne | `25¢` | Fome `+28`, Sede `-4`, Energia `+10`, Felicidade `+14`, Saúde `+6`, Higiene `-3` | Favorito do Ignisauro (`+1 Força`, `+1 Afinidade`) |
| `frosted-crystal-berry` | Fruta | `25¢` | Fome `+22`, Sede `+10`, Energia `+8`, Felicidade `+14`, Saúde `+6` | Favorito do Glacissauro (`+1 Defesa`, `+1 Resistência`) |
| `plasma-thunder-fruit` | Fruta | `30¢` | Fome `+24`, Sede `+6`, Energia `+20`, Felicidade `+15`, Saúde `+4` | Favorito do Electrossauro e Astrassauro (`+2 Agilidade`) |
| `glowing-swamp-mushroom` | Fungo | `25¢` | Fome `+25`, Sede `-2`, Energia `+9`, Felicidade `+14`, Saúde `+10`, Higiene `-2` | Favorito do Toxissauro (`+1 Inteligência`, `+1 Resistência`) |
| `emerald-crystal-geode` | Cristal | `30¢` | Fome `+30`, Sede `-4`, Energia `+8`, Felicidade `+14`, Saúde `+8` | Favorito do Terrassauro e Cristalissauro (`+2 Defesa`) |
| `sky-winged-cloudberry` | Fruta | `28¢` | Fome `+23`, Sede `+10`, Energia `+14`, Felicidade `+16`, Saúde `+5`, Higiene `+2` | Favorito do Aerossauro e Astrassauro (`+1 Agilidade`, `+1 Inteligência`) |
| `crimson-shadow-soulfruit` | Néctar | `35¢` | Fome `+26`, Sede `+6`, Energia `+14`, Felicidade `+16`, Saúde `+7` | Favorito do Umbrassauro (`+1 Força`, `+1 Afinidade`) |
| `golden-starburst-sunpeach` | Néctar | `35¢` | Fome `+27`, Sede `+8`, Energia `+15`, Felicidade `+18`, Saúde `+9`, Higiene `+2` | Favorito do Solassauro e Rosassauro (`+1 Inteligência`, `+1 Afinidade`) |
| `thermal-spring-water` | Hidratação | `12¢` | Sede `+35`, Energia `+6`, Felicidade `+6`, Saúde `+4`, Higiene `+4` | Aceito por todos; favorito também do Cristalissauro |
| `nutri-vital-serum` | Remédio | `45¢` | Fome `+35`, Sede `+10`, Energia `+15`, Felicidade `+8`, Saúde `+25` | Cura **Desnutrição Aguda** (`malnutrition`) |
| `isotonic-hydra-elixir` | Remédio | `45¢` | Sede `+45`, Energia `+12`, Felicidade `+8`, Saúde `+25` | Cura **Desidratação Severa** (`severe_dehydration`) |
| `enzymatic-digest-tonic` | Remédio | `45¢` | Fome `-15`, Sede `+12`, Energia `+10`, Felicidade `+12`, Saúde `+25` | Cura **Congestão por Excesso de Comida** (`overeating_indigestion`) |
| `antitoxin-charcoal-extract` | Remédio | `55¢` | Fome `+5`, Sede `+15`, Energia `+10`, Felicidade `+10`, Saúde `+30`, Higiene `+5` | Cura **Intoxicação por Dieta Incompatível** (`food_poisoning`) |
| `antiseptic-spore-salve` | Remédio | `45¢` | Sede `+5`, Energia `+8`, Felicidade `+10`, Saúde `+25`, Higiene `+45` | Cura **Infecção Parasitária** (`parasitic_infection`) |
| `adrenal-stamina-ampoule` | Remédio | `50¢` | Fome `+5`, Sede `+10`, Energia `+50`, Felicidade `+10`, Saúde `+25` | Cura **Estafa e Exaustão Crônica** (`chronic_exhaustion`) |
| `serotonin-aura-nectar` | Remédio | `50¢` | Fome `+5`, Sede `+10`, Energia `+15`, Felicidade `+45`, Saúde `+25`, Higiene `+5` | Cura **Melancolia Elemental** (`elemental_melancholy`); também favorito do Rosassauro |
| `vitality-herbal-elixir` | Panaceia | `120¢` | Fome `+8`, Sede `+15`, Energia `+15`, Felicidade `+10`, Saúde `+38`, Higiene `+5` | Cura **todas** as doenças ativas e concede `+1 Resistência` |

**Regras alimentares críticas:**
- Preferência **Favorita** multiplica ganhos nutricionais por `1.35x`, concede `+10 XP` e aplica os bônus de atributos do alimento. Preferência **Aceita** dá `1.0x` e `+5 XP`.
- Alimento **Proibido** não restaura adequadamente, reduz Saúde em `-18` e Felicidade em `-20`, e causa **Intoxicação por Dieta Incompatível**.
- Alimentar sólidos com **Fome `>= 95%`** causa **Congestão por Excesso de Comida** (`overeating_indigestion`).
- Dar água com **Sede `>= 95%`** causa recusa com empanturramento (`-10` Felicidade, `-5` Energia).
- Remédio usado sem a doença correspondente gera rejeição (`-10` Felicidade, `-5` Energia, `-5` Saúde, `0 XP`).

### 3.2. Atividades, Higiene e Descanso (`ACTIVITIES_CATALOG`)

| Atividade (`id`) | Tipo | Energia Mín. | Recompensa Base | Atributos |
|---|---|---|---|---|
| `lava-sprint` | Treino | `18` | `+12 XP` / `+25¢` | `+2 Força`, `+1 Resistência` |
| `cryo-meditation` | Meditação | `10` | `+10 XP` / `+22¢` | `+1 Defesa`, `+2 Inteligência` |
| `thunder-dash` | Brincadeira | `16` | `+12 XP` / `+26¢` | `+2 Agilidade`, `+1 Afinidade` |
| `spore-exploration` | Exploração | `14` | `+10 XP` / `+32¢` | `+2 Inteligência`, `+1 Resistência` |
| `monolith-guard` | Treino | `15` | `+12 XP` / `+25¢` | `+2 Defesa`, `+1 Força` |
| `sky-glide` | Brincadeira | `15` | `+12 XP` / `+26¢` | `+2 Agilidade`, `+1 Inteligência` |
| `umbral-meditation` | Meditação | `12` | `+12 XP` / `+28¢` | `+2 Afinidade`, `+1 Força` |
| `solar-bask` | Meditação | `10` | `+12 XP` / `+28¢` | `+2 Afinidade`, `+1 Defesa` |
| `purifying-bath` | Banho | `10` | `+6 XP` / `+8¢` | Restaura `+45 Higiene` e `+8 Saúde` (bloqueado se Higiene `>= 95%`) |
| `deep-slumber` | Sono | `0` | `+2` a `+6 XP` / `0¢` | Restaura `+48 Energia` e `+12 Saúde`, `+1 Resistência` (bloqueado se Energia `>= 85%`) |

### 3.3. Alertas e Notificações Nativas

- **Alerta antecipado:** disparado em `<= 25%` nas barras de decaimento ou `<= 45%` em Saúde.
- **Alerta crítico:** disparado em `<= 15%` nas barras de decaimento, `<= 35%` em Saúde ou quando há doença ativa.
- Notificações nativas do sistema Android são agendadas automaticamente para disparar **apenas quando o app estiver fechado ou minimizado**, mantendo apenas um banner discreto dentro do jogo enquanto aberto.

---

## 4. Ciclo de Reprodução P2P, Berçário e Coleção

1. **Conectar Parceiros:** Na aba **🧬 Genética** → **💞 Reprodução P2P**, informe o código de sala e toque em **Conectar** nos dois aparelhos (Google Nearby Connections no Android ou `BroadcastChannel` entre abas Web).
2. **Validação Genética:** O sistema verifica sexo oposto (`♂ × ♀`), prevenção de consanguinidade (pais/filhos e irmãos plenos bloqueados; meio-irmãos com aviso de risco elevado) e compatibilidade entre espécies (`toxissauro × rosassauro` é bloqueado; demais pares possuem sinergia entre `75%` e `100%`).
3. **Sorteio Criptográfico e Ovo no Berçário:** Após a animação em 6 cenas, exatamente um dos jogadores vence o ovo via **Commit-Reveal SHA-256** e o recebe no Berçário ligado diretamente ao seu `playerId` local.
4. **Incubação (`3 min` / `0.05h`) e Nascimento:**
   - Clique em **`🔥 Iniciar Incubação no Berçário`** (ou na aba **🥚 Berçário de Ovos**).
   - O progresso avança pelo relógio em tempo real (inclusive com o app fechado) ou `+30s` por clique em **`♨️ Aquecer & Cuidar`**.
   - Ao chegar a `100%` (`✨ Pronto`), clique em **`✨ Chocar Ovo Agora!`**, informe um apelido opcional e confirme.
   - O ovo passa ao registro **`✓ Eclodido`** (sem duplicação possível), o novo **`baby`** é salvo em `collection` preservando o dinossauro progenitor intacto, e você pode alternar entre qualquer criatura sua pelo botão **`🐉 N`** no HUD ou pela **Ficha**.
