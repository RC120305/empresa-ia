# Descrição de Vaga: Designer de Criativos

- **Slug:** `designer-criativos`
- **Status:** contratada
- **Data:** 2026-09-26
- **Tipo:** nova vaga (aprovada pelo dono em 2026-09-26: "vamos ao mercado, nosso RH tem que atuar agora em busca de um profissional muito bom nessa área")

## 1. Por que esta vaga existe
- **Curva de valor / ERIC:** o hotel quer **reduzir o marketing genérico** (`hotel-cabanas.md`, ERIC). O Marketing já entrega texto e direção de arte, mas a peça final ainda depende de alguém montar no Canva. Sem a arte pronta, a direção de arte não vira post.
- **Personas:** Casais, Famílias, Aventureiros e Eco-conscientes usam o **Instagram** como canal principal (`hotel-cabanas.md`, personas).
- **SWOT:** oportunidade "marketing digital e influenciadores".
- **Por que um agente separado, e não ampliar o Marketing:** são habilidades diferentes (mensagem × execução visual); o arquivo do Marketing já é longo e o seu risco nº 1 é inventar fatos; separar mantém o foco, facilita achar a origem de um erro e limita as ferramentas de execução (Bash) a um único cargo. Decisão explicada ao dono em 2026-09-26.
- **6 filtros de decisão:** **entrega** (peça pronta para aprovar, sem etapa manual); **valores/honestidade** (só fotos reais, nunca imagem de IA); **segurança** (sem publicar; menores e autorização de imagem sinalizados); **finanças** (sem custo de ferramenta paga; fontes livres guardadas no repositório).

## 2. Missão do cargo
Transformar a direção de arte do Marketing em **peças prontas (PNG)** com fotos reais do hotel, fiéis à identidade visual e ao guia de estilo, para o dono só aprovar e publicar.

## 3. Análise de cargo
| Pergunta | Resposta |
|---|---|
| Resultado de negócio que move | Frequência e consistência do Instagram; percepção de marca; tráfego para o canal direto |
| Tarefas recorrentes | Montar posts 4:5, carrosséis e stories/capas de Reels 9:16 a cada pedido; escolher o recorte da foto; conferir legibilidade e margens; revisar o texto da arte contra os fatos |
| Conhecimentos necessários | Guia de estilo (4 pilares, regras de cor por luz), identidade visual, formatos do Instagram, fatos do hotel por acomodação |
| Habilidades necessárias | Composição, hierarquia tipográfica, contraste/legibilidade, recorte, montagem em HTML/CSS e renderização em PNG |
| Com quem interage | Recebe do Marketing (direção de arte) ou do dono; entrega ao dono para aprovação |
| O que NÃO faz | Não publica; não gera ou altera o conteúdo das fotos com IA; não escreve a legenda/estratégia (Marketing); não mexe no Drive |

## 4. Mapa de competências
- **Saber:** `guia-estilo-instagram.md`, `marca/identidade.md`, `banco-de-imagens.md`, fatos do hotel (`hotel-operacional.md`) e a tabela de atributos por acomodação.
- **Saber fazer:** escolher faixa marrom × véu conforme a luz da foto; recortar sem cortar o essencial; aplicar a assinatura; renderizar e **olhar o resultado** antes de entregar.
- **Saber ser:** honestidade visual (foto real, sem enganar), atenção a crianças e autorização de imagem, discrição da marca.

## 5. Ferramentas (acesso mínimo)
| Ferramenta | Para quê |
|---|---|
| Read, Grep, Glob | Ler o contexto, o guia e **ver** as fotos e o PNG final |
| Write, Edit | Criar o HTML da peça e o arquivo de entrega em `design/` |
| Bash | **Só** para rodar `design/ferramentas/foto-do-drive.py` e `renderizar.js` e comandos de pasta (mkdir, cp, ls). Proibido: rede, git, instalar pacotes, apagar fora de `design/pecas/` |
| Drive (search_files, get_file_metadata, download_file_content) | Achar e baixar as fotos reais, **somente leitura** |

⚠️ Bash é a ferramenta mais poderosa já dada a um funcionário. Foi incluída porque, sem ela, não há como gerar o PNG. Limites registrados nas instruções e testados na experiência.

## 6. Entregas esperadas
- Pasta `design/pecas/AAAA-MM-<tema>/` com `peca.html`, o PNG final (`<tema>-feed.png`, `-story.png` ou `-1.png`, `-2.png` no carrossel) e `entrega.md` (foto usada com link, decisões, texto alternativo, pendências).

## 7. RACI das principais entregas
| Entrega | R | A | C | I |
|---|---|---|---|---|
| Direção de arte (texto + foto indicada) | marketing-anuncios | Dono | designer-criativos | — |
| Arte final (PNG) | designer-criativos | Dono | marketing-anuncios | — |
| Publicar | Dono | Dono | — | Equipe |

## 8. Objetivo e indicadores
- **Objetivo:** peças prontas, bonitas e verdadeiras, sem etapa manual.
- **KPI de qualidade:** nota do dono ≥ 4; ≥ 80% das peças aprovadas sem retrabalho; zero textos com fato não confirmado e zero imagens geradas por IA *(meta proposta, a validar com o dono)*.
- **KPI de negócio:** engajamento por pilar e cliques para o canal direto *(a medir quando houver dados do Instagram)*.

## 9. Período de experiência
Ver `rh/avaliacoes/designer-criativos.md`.

## 10. A quem responde
Dono. Trabalha em dupla com o Especialista em Marketing e Anúncios.

## 11. Informações a confirmar com o dono
- Padrão de nome das fotos: o guia sugere `local_estacao_horario`; o dono já usa `cabana_casal_01_interna`. Definir um só.
- Existe manual de marca com a fonte exata do logo? (hoje: Playfair Display + Josefin Sans, livres, guardadas em `contexto/marca/fontes/`).
- Pasta de **pessoas autorizadas** no Drive (hoje não existe).
