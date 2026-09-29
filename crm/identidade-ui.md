# Identidade visual do CRM (UI): Hotel Cabanas

> Extensão da marca para a interface do CRM (caixa de entrada do WhatsApp, funil, painel, régua de mensagens, respostas sugeridas pelo agente de IA). **Não é uma marca nova:** parte de `contexto/marca/identidade.md` e só ajusta o que uma tela usada o dia todo exige (legibilidade, contraste, estados).
> Versão 1, 29/09/2026, pelo Designer de Criativos. Variáveis prontas em `crm/tokens.css`.
> Contrastes calculados pela fórmula WCAG 2.x (luminância relativa sRGB), com margem de ±0,05. Se um hex mudar, recalcule antes de usar.

---

## 1. Resumo da marca e o que muda na UI

| Elemento | Na marca (Instagram) | Na UI do CRM | Por quê |
|---|---|---|---|
| Logo | Colorido em fundo claro; branco sobre foto | Colorido no topo (modo claro), branco no modo escuro e na barra lateral marrom | Mesmo critério da marca: colorido no claro, branco no escuro |
| Marrom `#847059` | Faixa atrás do título | **Cor primária**: botões principais, item ativo, links (em versão mais escura) | É a cor principal da marca e a única das três que aguenta texto branco (4,73:1) |
| Verde `#90AB49` | Sustentabilidade, detalhe | **Secundária**: detalhes, ícones, gráficos, "sucesso" | Passa a ter também uma versão escura para texto |
| Laranja `#F58634` | Linha fina, CTA, pouco | **Destaque/CTA**: uma chamada por tela, item ativo na barra lateral | Continua raro; na UI, com texto escuro por cima |
| Creme | Texto sobre foto | Base do **fundo** da aplicação (`#F7F3EC`, um creme mais claro) | Tela branca pura cansa; o creme dá calor sem perder contraste |
| Josefin Sans | Linhas de apoio em caixa alta espaçada | **Rótulos e títulos de seção** em caixa alta | Mantém a "voz" do logo; é fraca em texto pequeno e corrido (item 4) |
| Playfair / Cormorant | Título emocional | Só em telas de boas-vindas e telas vazias | Serifada em tabela e conversa atrapalha a leitura |
| Corpo de texto | (não existia) | **Inter** (livre, OFL) | Feita para tela, ótima em 12–16 px, números alinhados |

**Regras da marca que continuam valendo:** nunca texto branco sobre verde; laranja com moderação; nada de imagem gerada por IA no sistema (fotos, se houver, só do banco oficial).

---

## 2. Tokens de cor

### 2.1 Achados de contraste (a cor original da marca)
AA exige **4,5:1** para texto normal, **3:1** para texto grande (≥ 24 px, ou ≥ 18,7 px em negrito) e para ícones, bordas de campo e anel de foco.

| Combinação | Contraste | Resultado | O que usar |
|---|---|---|---|
| Branco sobre marrom `#847059` | 4,73:1 | Passa AA (justo) | Botão primário com texto branco: ok |
| Marrom `#847059` sobre branco | 4,73:1 | Passa AA | Ok, mas sobre o fundo creme cai para **4,27:1** (reprova) |
| Marrom `#847059` sobre fundo `#F7F3EC` | 4,27:1 | **Reprova** | Texto e link marrom: **`#6E5B47`** (6,46 no branco; 5,84 no fundo) |
| Verde `#90AB49` sobre branco | 2,59:1 | **Reprova** (até como ícone) | Texto verde: **`#5A7026`** (5,55 no branco; 5,02 no fundo) |
| Branco sobre verde `#90AB49` | 2,59:1 | **Reprova** | Confirma a regra: nunca branco sobre verde. Texto escuro `#2E2620` sobre verde: 5,73:1 |
| Laranja `#F58634` sobre branco | 2,52:1 | **Reprova** (até como anel de foco) | Texto laranja: **`#A8520F`** (5,41 no branco; 4,89 no fundo) |
| Branco sobre laranja `#F58634` | 2,52:1 | **Reprova** | Botão laranja com texto **`#2E2620`**: 5,90:1 |
| Laranja `#F58634` sobre marrom escuro `#3B3128` | 5,04:1 | Passa | O laranja original funciona como texto na barra lateral e no modo escuro |
| Verde `#90AB49` sobre marrom escuro `#3B3128` | 4,90:1 | Passa | Idem |

**Resumo:** das três cores da marca, só o marrom serve para texto em fundo claro, e só sobre branco puro. Verde e laranja originais ficam para superfícies, ícones grandes com texto ao lado, gráficos e o modo escuro; para texto em fundo claro usam as versões escuras.

### 2.2 Modo claro

| Token | Hex | Uso | Contraste (texto) |
|---|---|---|---|
| `--cor-fundo` | `#F7F3EC` | Fundo da aplicação | — |
| `--cor-superficie` | `#FFFFFF` | Cartões, listas, balões recebidos | — |
| `--cor-borda` | `#E3DACB` | Divisórias (decorativa) | — |
| `--cor-borda-forte` | `#9C8C7A` | Contorno de campos e caixas de seleção | 3,26 no branco (≥ 3 ok); no fundo creme 2,95, então campos ficam sempre sobre superfície branca |
| `--cor-texto` | `#2E2620` | Texto principal (marrom quase preto, quente) | 14,85 branco · 13,42 fundo |
| `--cor-texto-secundario` | `#6B5D4F` | Metadados, horários, placeholder | 6,36 branco · 5,75 fundo |
| `--cor-primaria` | `#847059` | Fundo do botão primário, item ativo | branco por cima 4,73 |
| `--cor-primaria-hover` / `-texto` | `#6E5B47` | Hover do botão; links (sublinhados) | branco por cima 6,46 · 6,46 branco · 5,84 fundo |
| `--cor-secundaria` | `#90AB49` | Detalhes, gráficos, ícone grande | texto escuro por cima 5,73 |
| `--cor-secundaria-texto` | `#5A7026` | Texto verde | 5,55 branco · 5,02 fundo |
| `--cor-destaque` | `#F58634` | Botão de destaque (1 por tela) | `#2E2620` por cima 5,90 |
| `--cor-destaque-texto` / `--cor-foco` | `#A8520F` | Texto laranja; anel de foco do teclado | 5,41 branco · 4,89 fundo |
| `--cor-sucesso` / suave | `#5A7026` / `#EEF3E1` | Enviado, reservado, conectado | 5,55 branco · 4,90 no suave |
| `--cor-alerta` / suave | `#8A5A00` / `#FBF1DC` | Sem resposta há X h, modelo pendente na Meta | 5,93 branco · 5,28 no suave |
| `--cor-erro` / suave | `#B3372B` / `#FBEAE7` | Falha de envio, descartar | 6,00 branco · 5,15 no suave · branco sobre ele 6,00 |
| `--cor-info` / suave | `#2F6B82` / `#E6F0F3` | Avisos neutros (azul de rio) | 5,92 branco · 5,11 no suave |
| `--cor-lateral-fundo` | `#3B3128` | Barra lateral (marrom de madeira escura) | creme 11,28 · `#BFB3A3` 6,15 · laranja 5,04 |

As cores de estado são tons da própria paleta: sucesso = verde da marca escurecido; alerta = âmbar puxado para o marrom; erro = terracota; informação = azul-esverdeado de rio cristalino.

### 2.3 Modo escuro
Fundo de madeira escura, não preto puro (mais confortável e coerente com a marca).

| Token | Hex | Contraste |
|---|---|---|
| `--cor-fundo` | `#1E1914` | — |
| `--cor-superficie` | `#29221B` | — |
| `--cor-superficie-elevada` | `#342B23` | — |
| `--cor-borda` / `-forte` | `#4A3F34` / `#7A6A58` | forte: 3,01 na superfície |
| `--cor-texto` | `#F2ECE2` | 14,84 fundo · 13,35 superfície · 11,79 elevada |
| `--cor-texto-secundario` | `#BFB3A3` | 7,61 superfície · 6,72 elevada |
| `--cor-primaria` (botão e link) | `#C4A98A` | 7,01 na superfície; texto `#1E1914` sobre o botão 7,80. O marrom original `#847059` teria só 3,32 como texto |
| `--cor-secundaria-texto` | `#90AB49` (original) | 6,06 superfície · 5,35 elevada |
| `--cor-destaque` | `#F58634` (original) | 6,23 superfície; texto `#1E1914` sobre o botão 6,93 |
| `--cor-sucesso` | `#90AB49` | 6,06 / 5,35 (elevada) |
| `--cor-alerta` | `#E8B04A` | 8,02 / 7,09 |
| `--cor-erro` | `#EF8A7A` | 6,41 / 5,66 |
| `--cor-info` | `#7FB8CC` | 7,19 / 6,35 |

No escuro, os avisos de estado usam fundo `--cor-superficie-elevada` com borda esquerda de 3 px na cor do estado (em vez de fundos coloridos).

---

## 3. Cores das categorias do CRM

**Como funcionam:** cada categoria tem uma **cor de marca** (bolinha, borda esquerda do cartão, barra do gráfico) e um **fundo suave** para a etiqueta. **O texto da etiqueta é sempre `--cor-texto`** (≥ 12:1 em todos os fundos suaves). Assim a leitura nunca depende da cor.
Todas as cores de marca têm **≥ 3:1 no branco e ≥ 3:1 na superfície escura** (`#29221B`), então valem nos dois modos. **Nunca só a cor:** sempre o nome escrito, e ícone quando houver (importante para daltonismo, que afeta cerca de 1 em cada 12 homens).

### 3.1 Etapas do funil
| Etapa | Cor | Fundo suave | Branco / escuro | Ícone sugerido (Lucide) |
|---|---|---|---|---|
| Novo | `#3F7F9A` azul de rio | `#E4EDF1` | 4,45 / 3,52 | `sparkle` |
| Em atendimento | `#C0661E` laranja queimado | `#F6EAE0` | 4,07 / 3,85 | `message-circle` |
| Orçamento enviado | `#8566B0` roxo | `#EEEAF4` | 4,64 / 3,38 | `file-text` |
| Reservado | `#6E8A2E` verde | `#EBEFE2` | 3,93 / 3,99 | `check-circle` |
| Perdido | `#8A8078` cinza quente | `#EFEDEC` | 3,86 / 4,06 | `x-circle` |

Os cinco tons estão em famílias diferentes (azul, laranja, roxo, verde, cinza), o que os mantém distinguíveis também para quem tem daltonismo vermelho-verde (verde e laranja diferem em claridade e vêm sempre com ícone e nome).

### 3.2 Origens
| Origem | Cor | Fundo suave | Branco / escuro |
|---|---|---|---|
| Anúncio Meta | `#3B6FB6` azul | `#E4EBF5` | 5,08 / 3,09 |
| Instagram orgânico | `#B0487A` magenta | `#F4E5EC` | 5,18 / 3,03 |
| Google | `#2E8277` verde-azulado | `#E2EEEC` | 4,59 / 3,42 |
| Site | `#847059` marrom da marca | `#EEEBE8` | 4,73 / 3,32 |
| Hóspede que volta | `#6E8A2E` verde | `#EBEFE2` | 3,93 / 3,99 |
| Indicação | `#8566B0` roxo | `#EEEAF4` | 4,64 / 3,38 |
| Agência / operadora | `#9A7B12` mostarda | `#F1ECDE` | 4,03 / 3,90 |
| OTA (Booking etc.) | `#6B7785` cinza-azulado | `#EAECEE` | 4,56 / 3,44 |

Oito cores é o limite do que o olho separa bem. Nos gráficos: rótulo escrito direto na barra ou na fatia (sem depender de legenda), ordem fixa das origens e, no gráfico de pizza, no máximo 5 fatias ("outras" agrupa o resto).
Uma cor se repete entre grupos (ex.: verde em "Reservado" e em "Hóspede que volta"), mas nunca dentro do mesmo grupo, e os grupos não aparecem misturados na mesma legenda.

### 3.3 Quem está no comando da conversa
| Comando | Cor | Fundo suave | Branco / escuro | Sinal |
|---|---|---|---|---|
| Agente de IA | `#6A72BE` índigo | `#EAEBF6` | 4,41 / 3,56 | Ícone `bot` + "Agente Cabanas" |
| Pessoa da equipe | `#C0661E` laranja queimado | `#F6EAE0` | 4,07 / 3,85 | Ícone `user` + nome (ex.: "Jagles") |

O índigo é a única cor "fria e fora da natureza" do sistema, de propósito: a equipe identifica num relance o que foi escrito pela máquina. A **resposta sugerida** pelo agente aparece num cartão de fundo `#EAEBF6` com borda esquerda índigo e o rótulo "Sugestão do agente"; ela só vira balão normal depois de enviada.

---

## 4. Tipografia de UI

**Avaliação da Josefin Sans para UI:** ótima para identidade, fraca para leitura densa. A altura das minúsculas é muito baixa (letras pequenas parecem ainda menores), o traço é fino (some em tela de celular com brilho alto), e o "a", o "g" e o "l/I/1" se confundem em 12–14 px. Em tabelas e conversas isso cansa e gera erro de leitura de número (ex.: telefone, datas, valores).

**Combinação proposta**
| Papel | Fonte | Peso | Tamanho | Observação |
|---|---|---|---|---|
| Logotipo e rótulos de seção ("CAIXA DE ENTRADA", "FUNIL", "ORIGEM") | Josefin Sans | 600 | 13–14 px, caixa alta, espaçamento 0,1em | Onde a marca "aparece" |
| Título de página | Inter | 700 | 22 px (celular 20) | |
| Título de cartão | Inter | 600 | 18 px | |
| Corpo e balões de conversa | Inter | 400 | **16 px** (também no celular), linha 1,5 | 16 px evita o zoom automático do celular nos campos |
| Tabelas, etiquetas, metadados | Inter | 400/500 | 14 px, linha 1,3 | |
| Hora da mensagem, legenda de gráfico | Inter | 500 | 12 px (mínimo absoluto) | Cor `--cor-texto-secundario` |
| Números do painel | Inter com algarismos tabulares | 600 | 36 px computador · 28 px celular | Rótulo acima em Josefin 13 px caixa alta |
| Boas-vindas, tela vazia | Playfair Display itálico | 400 | 24–28 px | Momento emocional; nunca em operação |

Por que **Inter**: livre (OFL, Google Fonts), desenhada para tela, altura de minúscula alta, acentos do português bem resolvidos, algarismos tabulares (valores e percentuais alinham na coluna) e 1/l/I distintos. É neutra o bastante para não competir com a Josefin nos rótulos.
Alternativa também livre: **Source Sans 3** (mais humanista e um pouco mais "quente", números menos claros). Ver item 7.
A Inter ainda **não está no repositório**: baixar os `.woff2` para `crm/fontes/` ao montar o projeto (servir do próprio sistema, sem depender do Google).

---

## 5. Elementos

**Raio de borda:** 8 px em botões e campos; 12 px em cartões e no painel da resposta sugerida; 16 px nos balões de conversa (o canto do lado de quem enviou fica com 6 px, como no WhatsApp); pílula (999 px) nas etiquetas de etapa e origem. Cantos suaves, sem exagero: a marca é orgânica, mas o sistema é de trabalho.

**Sombras:** quentes e discretas (`rgba(46,38,32,…)`), três níveis: 1 (cartões em lista), 2 (cartão em destaque, cabeçalho fixo), 3 (menus e janelas). No escuro, a separação vem mais da cor da superfície do que da sombra.

**Espaçamento:** base de 4 px (4, 8, 12, 16, 24, 32, 48). Margem da tela: 16 px no celular, 24 px no computador. **Alvo de toque mínimo de 44 px** (botões Enviar/Editar/Descartar, linhas da caixa de entrada), porque Jagles vai usar muito no celular.

**Ícones:** família **Lucide** (livre, licença ISC), de contorno, traço 1,75 px, pontas arredondadas: conversa com o traço fino e geométrico do logo. 20 px em botões e listas, 16 px em etiquetas, 24 px na navegação. Ícone sempre com texto ao lado, exceto em ações muito conhecidas (buscar, fechar), que levam rótulo acessível.

**Botões da resposta sugerida** (o componente mais usado):
| Botão | Estilo | Cor |
|---|---|---|
| Enviar | Primário (cheio) | Fundo `#847059`, texto branco (4,73) |
| Editar e enviar | Secundário (contorno) | Borda `#9C8C7A`, texto `#2E2620` |
| Descartar | Fantasma | Texto e ícone `#B3372B` (6,00); abre os motivos de 1 toque: Informação errada · Tom · Faltou vender · Outro |

Os três lado a lado no computador; no celular, uma linha com os três de largura igual, altura 44 px. Recomendo ícone Lucide + palavra (`send`, `pencil`, `x`) em vez dos emojis ✅ ✏️ ❌, porque os emojis mudam de desenho e de cor em cada aparelho e o ✅ verde-claro some no fundo branco (ver item 7).
**Laranja (destaque):** no máximo uma chamada por tela, para a ação de venda mais importante (ex.: "Criar reserva" na conversa, "Assumir conversa" quando o agente está no comando).

**Logo no sistema**
- **Topo (modo claro, computador):** logo colorido, 36 px de altura, à esquerda. Na barra lateral marrom e no modo escuro: logo branco (`logo-hotel-cabanas-branco.png`), mesma altura.
- **Celular:** só o símbolo (árvore-casa), 28 px, porque o logo completo fica ilegível nesse tamanho.
- **Tela de entrada (login):** logo colorido, 96 px, com o slogan "O seu lugar de conexão com a natureza" em Playfair itálico.
- **Ícone do navegador / app no celular:** o símbolo sobre fundo creme.
- Atenção: o logo colorido que temos é um **GIF de 421 × 314 px**; em tela de alta resolução ele fica borrado, e ainda não existe o símbolo isolado. Precisamos da versão vetorial (item 7).

**Tom de voz da interface:** curto, na primeira pessoa do plural, acolhedor, sem jargão técnico, trata o usuário por "você".
| Situação | Evitar | Usar |
|---|---|---|
| Caixa vazia | "Nenhum registro encontrado." | "Tudo respondido por aqui. Bom trabalho!" |
| Falha de envio | "Erro 131047: re-engagement message." | "Essa conversa passou de 24 horas. Para falar com o hóspede, escolha uma mensagem aprovada." |
| Agente no comando | "Bot ativo" | "O agente está conversando. Quer assumir?" |
| Sugestão | "Output do modelo" | "Sugestão do agente" |
| Confirmação | "Operação realizada com sucesso." | "Mensagem enviada." |
| Perda | "Status: churn" | "Marcar como perdido. Qual foi o motivo?" |
Números com vírgula decimal e "R$" (R$ 1.250,00), datas "ter, 14 out", horas "14h30".
Honestidade na tela também: o que foi escrito pelo agente fica sempre marcado como "Agente Cabanas", inclusive no histórico.

---

## 6. Arquivo de variáveis
`crm/tokens.css`: todas as cores (claro e escuro), categorias, tipografia, espaçamento, raios, sombras e tamanhos de ícone e logo. O modo escuro segue o aparelho (`prefers-color-scheme`) ou a escolha do usuário (`data-tema="escuro"` / `"claro"` no `<html>`).

---

## 7. Para você decidir
1. **Fonte do corpo:** Inter (recomendada: mais legível em números e tabelas) ou Source Sans 3 (mais calorosa).
2. **Botões da sugestão:** ícone + palavra (recomendado) ou os emojis ✅ ✏️ ❌ que você citou.
3. **Barra lateral:** marrom escuro `#3B3128` (mais "Cabanas", recomendado) ou clara, igual ao fundo.
4. **Modo escuro:** seguir o aparelho automaticamente (recomendado) ou só quando o usuário escolher.
5. **Logo vetorial:** existe o logo em SVG/AI/PDF e o símbolo (árvore-casa) isolado? E os códigos de cor oficiais? Os hex atuais foram extraídos dos pixels do GIF.
6. **Palavra "lead" na tela:** manter "lead" (termo que você já usa) ou usar "contato"/"interessado" para a equipe.
