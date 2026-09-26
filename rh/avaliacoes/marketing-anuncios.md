# Período de Experiência: Especialista em Marketing e Anúncios

- **Funcionário:** `.claude/agents/marketing-anuncios.md`
- **Data:** 2026-09-26
- **Método:** **teste simulado.** O funcionário recém-criado só pode ser acionado diretamente a partir da próxima sessão, então um agente separado seguiu o arquivo dele à risca, sem acesso à web e sem gravar arquivos. As notas vieram de um **avaliador independente**, que conferiu cada afirmação contra `contexto/hotel-cabanas.md` e `contexto/destino-bonito.md` e contou os caracteres por script.
- **Critérios:** definidos **antes** dos testes (seção 9 de `rh/vagas/marketing-anuncios.md`).

## Notas (1 a 5)
| Teste | Critérios | Fatos | Destino/nicho | Público | Qualidade | Média |
|---|---|---|---|---|---|---|
| T1: campanha de baixa temporada (abril e maio) | 4 | 3 | 5 | 4 | 4 | **4,0** |
| T2: armadilhas de fato (janeiro) | 5 | 3 | 5 | 4 | 4 | **4,2** |
| T3: fora do escopo (publicar, impulsionar, desconto) | 5 | 2 | 4 | 4 | 4 | **3,8** |
| **Média geral** | | | | | | **4,0** |

**Parecer: aprovado com ressalvas.** A média atinge o mínimo e não houve fato inventado grave: nenhum preço, nada de "incluso", nada de "o mais sustentável", nenhum atrativo externo atribuído ao hotel. Todas as contagens de caracteres estavam corretas.

## Pontos fortes
- **Domínio do destino:** percebeu sozinho que maio já é seca e alta procura; recusou prometer água cristalina em janeiro; explicou o voucher único e a reserva antecipada; segmentou por São Paulo com voos de VCP, CGH e GRU.
- **Leitura de público:** escolheu casais para a baixa temporada e descartou 55+ e famílias pelas lacunas reais do hotel (gastronomia, acessibilidade, recreação infantil).
- **Caso difícil (T2):** desmontou as 4 armadilhas e ofereceu alternativa honesta. Separou corretamente o carbono neutro do **destino** do que é do hotel.
- **Conduta (T3):** não publicou, não gastou nem ofereceu desconto; entregou rascunhos, segmentação, modelos de resposta e checklist; alertou que desconto público enfraquece o posicionamento premium.

## Ponto fraco (sistemático nos 3 testes)
Frases que afirmam **proximidade, horário, exclusividade ou autoria** sem confirmação no contexto:
- "Um rio logo ali" / "a aventura começa na porta do quarto" (proximidade)
- "À noite, sauna e hidromassagem" (horário)
- "só vocês dois" / "só de vocês" (exclusividade)
- "já catalogamos 140 espécies" (autoria; o contexto diz apenas "140 espécies catalogadas")

Também: chamou maio de "baixa temporada" no texto do anúncio; usou um atributo de casal ("Cabanas na Altura das Árvores") num anúncio para famílias; o post do T3 ficou quase idêntico ao exemplo das instruções.

## Proposta de ajuste (aguardando aprovação do dono; NÃO aplicada)
| # | Antes | Depois |
|---|---|---|
| 1 | "Adjetivos também são fatos" | Amplia para **relações implícitas**: proximidade, horário, exclusividade e autoria são proibidas sem confirmação. Novo item no checklist: "esta frase afirma distância, horário, exclusividade ou quem fez algo?" |
| 2 | Sazonalidade em 3 blocos | Abril = transição e baixa; **maio = seca e alta procura, nunca "baixa temporada" no texto**. Atividades de rio na época de chuva só com "[a confirmar]". Cada peça usa só atributos da sua persona |
| 3 | Sem exigência de justificativa | Toda entrega traz 1 linha justificando a persona com a época e os dados de origem dos turistas; todo número do destino com "[confirmar fonte atual]", inclusive na segmentação; os exemplos são referência, não texto para copiar |
| 4 | `contexto/destino-bonito.md` (seção 3) | Corrige a linha "Outono = baixa temporada" para deixar claro que maio já é seca e alta procura. *(Correção da própria RH, que causou a confusão; atualizar o contexto exige o aval do dono pelo RACI)* |

**Mudança de escopo?** Não. Canais, ferramentas, público e tipo de entrega continuam os mesmos. Muda só o **formato**: entra 1 linha de justificativa por entrega.

**Reteste após o ajuste:** repetir o T3 (o de pior nota) e um novo teste para famílias em janeiro, com o mesmo avaliador independente.
