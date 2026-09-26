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

## Proposta de ajuste v2 (atualizada em 2026-09-26 com o novo documento do dono e a pesquisa na Acqua Viagens). Aguardando aprovação; NÃO aplicada
| # | Antes | Depois |
|---|---|---|
| 1 | "Adjetivos também são fatos" | Amplia para **relações implícitas**: proximidade, horário, exclusividade e autoria só com confirmação. Novo item no checklist: "esta frase afirma distância, horário, exclusividade ou quem fez algo? Está em algum arquivo de contexto?" |
| 2 | Sazonalidade em 3 blocos | Usa as **duas réguas** de `destino-bonito.md`: clima (seca de maio a setembro) × demanda (baixa em março a junho e em agosto até o início de dezembro). **Correção:** a proposta v1 dizia "nunca chamar maio de baixa temporada", **o que estava errado**. Maio **é** baixa temporada de preço **e** época de água cristalina: é a "janela de ouro" para as campanhas. A dúvida do funcionário no T1 vinha de um erro da RH na base do destino, já corrigido |
| 3 | Sem exigência de justificativa | Toda entrega traz 1 linha justificando a persona com a época e os dados; todo número do destino com "[confirmar fonte atual]"; os exemplos das instruções são referência, não texto para copiar |
| 4 | Lê 2 arquivos de contexto | Passa a ler também **`contexto/hotel-operacional.md`**. A tabela "Não confirmado" encolhe: o que está incluído, preços, idades mínimas, links e horários agora são **fatos**; preços sempre com "[confirmar valor vigente]"; as divergências (seção 12) usam a forma segura |
| 5 | Tabela de personas | Atualizada com os fatos novos. **Casais:** Cabana Master com banheira de hidromassagem para 2, piquenique ao pôr do sol no deck do Formosinho, decoração especial, massagem à beira do rio, ioga aos sábados. **Famílias:** o playground existe, mas **não há recreação**; boia cross e arvorismo a partir de 6 anos, flutuação a partir de 7; **as cabanas não aceitam menores de 5 anos**; crianças até 5 anos não pagam. **55+:** acessibilidade **parcial** (rampas, banheiros sem barras); **não há almoço**, só lanchonete. **Aventureiros:** arvorismo com 18 obstáculos e tirolesa aquática. **Observadores:** fauna citada (macacos, araras, cotias, quatis, tatus); peixes da flutuação (dourado, piraputanga, curimbatá) |
| 6 | Link "[a confirmar]" | Usa os links oficiais: motor de reservas, WhatsApp de reservas e @ das redes. Argumento de canal direto: "valores com desconto para quem reserva direto no site" |

**Mudança de escopo?** Não. Canais, ferramentas, público e tipo de entrega continuam os mesmos. Mudam o formato (1 linha de justificativa) e as fontes de consulta (mais 1 arquivo de contexto). Nenhuma ferramenta nova.

**Reteste após o ajuste:** repetir o T3 (pior nota) + um novo teste "campanha janela de ouro de maio para casais" + um teste para famílias com crianças de 4 e 8 anos (armadilhas: cabana não aceita menores de 5, flutuação só a partir de 7). Mesmo avaliador independente.
