# Schema de dados — `dados.json`

> Adaptado do modelo do curso. Números no exemplo são **fictícios**.

O gerador (`scripts/generate_report.py`) recebe **um único ficheiro JSON** com os
campos abaixo e produz o PDF. Usa `references/exemplo_dados.json` como molde e
substitui pelos valores reais lidos dos prints.

Convenções:
- **Números no JSON**: ponto decimal (`41.3`), sem separador de milhares
  (`4531557`, não `4.531.557`). O gerador formata para pt (`.` milhares, `,`
  decimais) automaticamente.
- **Valores estimados/lidos de gráfico**: string com til, ex. `"~35"`. O gerador
  mostra o `~` e calcula barras/índices na mesma.
- Campos marcados **(obrigatório)** têm de existir, senão o gerador falha.
  Os restantes são opcionais (têm default ou desativam um bloco se ausentes).

---

## Identificação

| Campo                  | Tipo    | Obrig. | Exemplo              | Notas |
|------------------------|---------|:------:|----------------------|-------|
| `cliente`              | string  | ✅     | `"Hotel Cabanas"`    | Aparece no cabeçalho e rodapé. |
| `perfil`               | string  | —      | `"@hotelcabanas"` [confirmar o @ com o dono] | @ ou link do Instagram. Mostra o @handle clicável no cabeçalho das 3 páginas. |
| `mes_ref`              | string  | ✅     | `"Abril"`            | Mês de referência por extenso. |
| `ano`                  | string  | ✅     | `"2026"`             | |
| `variante`             | string  | —      | `"pt-BR"` (padrão do Cabanas) | Use sempre `"pt-BR"`. |
| `periodo_dias`         | número  | —      | `30` (default)       | Janela do relatório. |
| `periodo_views`        | string  | —      | `"5 Abr → 4 Mai 2026"` | Período de views/interações (rodapé pág. 2/3 e cabeçalho). |
| `periodo_views_curto`  | string  | —      | `"5 Abr → 4 Mai"`    | Versão curta no card de Visualizações (pág. 1). |
| `periodo_seguidores`   | string  | —      | `"1 Abr → 30 Abr 2026"` | Período da contagem de seguidores. |
| `conta_verificada`     | bool    | —      | `true`               | Mostra "conta verificada" no card Total Seguidores. |

## Métricas principais

| Campo                  | Tipo    | Obrig. | Exemplo     | Notas |
|------------------------|---------|:------:|-------------|-------|
| `views_total`          | número  | ✅     | `4531557`   | Visualizações totais do período. |
| `interacoes_total`     | número  | ✅     | `191910`    | Interações totais. |
| `contas_alcancadas`    | número  | ✅     | `495668`    | Contas alcançadas. |
| `total_seguidores`     | número  | ✅     | `241614`    | Total de seguidores (atual). |
| `novos_seguidores`     | número  | ✅     | `4700`      | Novos seguidores no período. |
| `novos_seguidores_var` | string  | —      | `"+1.0% vs Mar 31"` | Variação opcional sob o número. |
| `publicacoes`          | número  | ✅     | `425`       | Nº de publicações no período. |

## Crescimento de seguidores

| Campo       | Tipo   | Obrig. | Exemplo | Notas |
|-------------|--------|:------:|---------|-------|
| `follows`   | número | ✅     | `4872`  | Seguidos no período. |
| `unfollows` | número | ✅     | `2481`  | Deixaram de seguir (valor positivo; o gerador põe o sinal −). |
| `net`       | número | ✅     | `2391`  | follows − unfollows. Calcula e preenche se tiveres dúvida. |

## Origem do público (%)

As percentagens de cada par devem somar ~100%.

| Campo               | Tipo   | Obrig. | Exemplo | Notas |
|---------------------|--------|:------:|---------|-------|
| `views_seg_pct`     | número | ✅     | `55.8`  | % de views de seguidores. |
| `views_nonseg_pct`  | número | ✅     | `44.2`  | % de views de não-seguidores. |
| `inter_seg_pct`     | número | ✅     | `59.0`  | % de interações de seguidores. |
| `inter_nonseg_pct`  | número | ✅     | `41.0`  | % de interações de não-seguidores. |

## Por formato (%)

Objetos `{ "Formato": valor }`. Formatos esperados: `Posts`, `Reels`, `Stories`.
Cada grupo deve somar ~100%. A ordem de apresentação é automática (maior
primeiro). O **índice de engajamento** (% interações ÷ % views) é calculado pelo
gerador — **não** o forneças.

| Campo           | Tipo   | Obrig. | Exemplo |
|-----------------|--------|:------:|---------|
| `views_formato` | objeto | ✅     | `{ "Posts": 41.3, "Reels": "~35", "Stories": "~23.7" }` |
| `inter_formato` | objeto | ✅     | `{ "Reels": 53.6, "Posts": 38.1, "Stories": "~8.3" }` |

| Campo                   | Tipo   | Obrig. | Exemplo    | Notas |
|-------------------------|--------|:------:|------------|-------|
| `contas_alcancadas_var` | string | —      | `"-14.6%"` | Variação do alcance; alimenta uma recomendação automática se presente. |

## Destaques e recomendações (pág. 2)

Listas de strings (1 frase cada). **Se ausentes, o gerador gera-as
automaticamente** a partir dos números. Fornece para personalizar.

| Campo           | Tipo            | Obrig. | Notas |
|-----------------|-----------------|:------:|-------|
| `destaques`     | lista de string | —      | Bloco "Destaques do período". |
| `recomendacoes` | lista de string | —      | Bloco "Recomendações". |

## Top 5 conteúdos (pág. 3 — opcional)

Se `top5` existir e tiver itens, o relatório passa a ter **3 páginas**. Se
ausente/vazio, fica com **2 páginas**. Máximo 5 itens (extras são ignorados).

```jsonc
"top5": [
  {
    "formato": "Reels",                 // Reels | Posts | Carrossel | Stories
    "titulo": "Título curto do conteúdo",
    "link": "https://instagram.com/reel/XXXX/",  // link do post (cartão clicável)
    "obs": "Uma linha a explicar porque se destacou.",
    "metricas": [                        // 2-3 métricas; só o que o print mostrar
      { "label": "views",       "valor": "412K" },
      { "label": "interações",  "valor": "28,4K" },
      { "label": "alcance",     "valor": "380K" }
    ]
  }
  // ... até 5
]
```

Campos por item:

| Campo      | Tipo            | Obrig.* | Notas |
|------------|-----------------|:-------:|-------|
| `formato`  | string          | —       | Define a cor do badge. Default "Post". |
| `titulo`   | string          | recom.  | Tema/gancho, não o caption inteiro. |
| `link`     | string          | recom.  | URL do post. Mostra "Ver publicação →" e torna o cartão clicável. |
| `obs`      | string          | —       | Justificação curta do destaque. |
| `metricas` | lista de objeto | recom.  | Cada um `{ "label", "valor" }`. `valor` é string já formatada (ex. `"412K"`, `"9,8K"`). |

\* "Obrigatório" só dentro de um item já presente; toda a secção `top5` é
opcional. Nunca inventes métricas — omite a métrica/item se o print não a mostrar.

---

## Checklist antes de gerar

- [ ] Todos os campos obrigatórios preenchidos com valores reais dos prints.
- [ ] Pares de % (views seg/não-seg, inter seg/não-seg) somam ~100%.
- [ ] Cada grupo por formato soma ~100%.
- [ ] Valores estimados marcados com `"~"`; exatos como número.
- [ ] `variante` = `"pt-BR"`.
- [ ] `perfil` preenchido (@ ou URL) para o @handle clicável no cabeçalho.
- [ ] `top5` incluído só se houver dados reais do "Conteúdo principal", com o `link` de cada post.
