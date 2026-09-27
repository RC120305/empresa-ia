---
name: relatorio-metricas
description: >-
  Gera o Relatório Mensal de Métricas do Instagram do Hotel Cabanas (PDF de 2 a 3
  páginas, na identidade visual do hotel) a partir dos prints do Instagram
  Insights, com a leitura do Estrategista de Social Media e Tráfego ligada aos
  indicadores do hotel. Use SEMPRE que o dono enviar prints de métricas do
  Instagram e pedir relatório, análise do mês, desempenho ou "como foi o
  Instagram" — ex.: "monta o relatório de agosto", "/relatorio-metricas
  setembro", "analisa esses prints". Cobre o Top 5 conteúdos do mês. NÃO usar
  para criar conteúdo (ver conteudo-mensal) nem para alterar posts (ver
  alterar-conteudo).
---

# Relatório de Métricas do Instagram — Hotel Cabanas

Transforma prints do Instagram Insights num PDF com a identidade do Cabanas
(marrom `#847059`, verde `#90AB49`, creme, Playfair Display + Josefin Sans):
página 1 visão geral, página 2 comparativo por formato com destaques e
recomendações, página 3 opcional com o **Top 5 conteúdos do mês**.

## O que o dono fornece
1. **Prints do Instagram Insights** do mês: visão geral, seguidores × não
   seguidores, alcance, interações por formato e o "Conteúdo principal" (Top 5).
   Os prints chegam anexados na conversa (ficam em `/root/.claude/uploads/...`).
2. **Mês de referência** (ex.: "agosto 2026").
3. O @ do perfil vai em `perfil` no JSON: **@hotelcabanasbonito**.

Se faltar o mês ou prints essenciais, pergunte em 1 linha. **Nunca invente
números**: sem print, sem número.

## Fluxo
1. **Leia este arquivo inteiro** e depois `references/data_schema.md`.
2. **Extraia as métricas dos prints** (abra cada imagem com Read). Use a tabela
   de mapeamento abaixo. Mantenha os números **exatamente** como aparecem.
   Valores lidos de gráfico ou arredondados vão como string com til (`"~35"`).
3. **Top 5:** use os conteúdos que o dono indicar, **ordenados por
   visualizações**. `link` só se for real (o dono envia ou você confirma);
   **nunca invente URL**. Sem Top 5, omita o campo (PDF de 2 páginas).
4. **Leitura do Estrategista (obrigatória):** acione o funcionário
   `social-media-trafego` (ferramenta Agent) com os números extraídos e peça:
   - 3 a 4 **destaques** e 3 a 4 **recomendações**, uma frase cada, ligadas aos
     indicadores do hotel (`contexto/cultura.md`: ocupação, diária média,
     reservas diretas) e às **duas réguas de sazonalidade**;
   - regra do caderno da Bárbara Bruna: olhar **envios por alcance** e tempo de
     exibição, não só curtidas; identificar o **post vencedor** do mês para virar
     anúncio (atalho "post vencedor → anúncio" da skill `campanha-anuncios`);
   - o que **não** dá para concluir sem dados (ex.: reservas vindas do Instagram).
   Coloque as frases em `destaques` e `recomendacoes` no JSON.
5. **Escreva o JSON** em `social/relatorios/AAAA-MM-dados.json` (molde:
   `references/exemplo_dados.json`, que é **fictício**). `"variante": "pt-BR"`.
6. **Gere o PDF:**
   ```bash
   pip install -q reportlab 2>/dev/null
   python3 .claude/skills/relatorio-metricas/scripts/generate_report.py \
     social/relatorios/AAAA-MM-dados.json social/relatorios/AAAA-MM-relatorio-instagram.pdf
   ```
7. **Confira o PDF** (converta 1 página em imagem se precisar:
   `pip install -q pymupdf` e renderize) e **envie ao dono** com `SendUserFile`,
   com um resumo de 3 linhas: o destaque do mês, o alerta do mês e a
   recomendação nº 1.
8. **Salve no repositório** (commit) e, se o dono quiser, publique uma cópia do
   resumo em texto na pasta do mês no Drive (ver `conteudo-mensal`,
   `references/estrutura-drive.md`). O PDF em si não sobe para o Drive por limite
   da ferramenta: ele fica no repositório e é enviado na conversa.

## Mapeamento de métricas (Insights → JSON)
| No print procure… | Campo |
|---|---|
| Visualizações totais | `views_total` |
| Interações totais | `interacoes_total` |
| Contas alcançadas (e a variação) | `contas_alcancadas` (`contas_alcancadas_var`) |
| Total de seguidores | `total_seguidores` |
| Novos seguidores / seguiram / deixaram de seguir | `novos_seguidores` / `follows` / `unfollows` (`net` = follows − unfollows) |
| Nº de publicações no período | `publicacoes` |
| % views e % interações de seguidores × não seguidores | `views_seg_pct`, `views_nonseg_pct`, `inter_seg_pct`, `inter_nonseg_pct` |
| % views e % interações por formato (Posts, Reels, Stories) | `views_formato`, `inter_formato` |

Regras: pares de % somam ~100%; cada grupo por formato soma ~100% (se não somar,
releia o print); números no JSON com ponto decimal e sem separador de milhar; o
índice de engajamento por formato é calculado pelo gerador.

## Cuidados do Cabanas
- **Honestidade com números:** o relatório mostra o que o Instagram mediu. Não
  afirme "o Instagram trouxe X reservas" sem medição (UTM, pergunta "como nos
  conheceu?"); diga "[a medir]".
- Recomendações seguem os limites da equipe: só se publica o que o dono aprovou e ninguém gasta verba; a
  verba sai em cenários para o dono decidir.
- Compare com o mesmo mês do ano anterior só se o dono enviar esses prints.

## Estrutura
```
relatorio-metricas/
├── SKILL.md
├── scripts/generate_report.py   # gerador ReportLab (JSON → PDF), identidade Cabanas
├── references/data_schema.md    # campos do JSON
├── references/exemplo_dados.json# molde FICTÍCIO
└── assets/fonts/                # Playfair Display, Josefin Sans (OFL) e DejaVu (símbolos)
```
Origem: adaptado do modelo "instagram-metrics-report" do curso de social media
com Claude do dono (layout e lógica); paleta, fontes, idioma e fluxo trocados
para o Cabanas.
