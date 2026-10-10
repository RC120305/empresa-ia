# Calculadora de diária ideal no CRM: especificação

Origem: estudo do curso "CDR – Calculadora da Diária Rentável" (Viver de Pousada), em 10/10/2026, a partir das aulas, da planilha modelo (v6, 02/08/2026) e da planilha de exemplo preenchida. **Implementação própria**: copiamos a *lógica* (que é matemática de precificação), não a planilha, o texto nem a identidade do autor. Linguagem, layout e nomes dos campos são nossos.

## 1. Como a planilha original funciona (4 abas)
1. **Preencha aqui** (única que se digita): dados da pousada, custos fixos mensais, custos variáveis por diária, taxas/comissões/impostos, tipos de quarto.
2. **Resultado da diária**: base de cálculo e os preços do quarto duplo padrão.
3. **Dashboard**: alerta (abaixo/ok), três preços de destaque e indicadores.
4. **Preços por quarto**: tabela por tipo de quarto × temporada × canal.

## 2. Entradas (o que o usuário cadastra)
**Dados do hotel:** nome, tipo de hospedagem, nº de quartos (soma automática da tabela de tipos), ocupação média anual, dias de alta e de baixa temporada, diária atual do duplo padrão, margem de lucro desejada (padrão 20%).

**Custos fixos mensais (23 linhas):** tarifas bancárias; parcelas de empréstimo; aluguel; salários; pró-labore; provisão de férias e 13º; FGTS; INSS; outros custos de pessoal; contador; marketing; reserva de manutenção; sistemas; material de limpeza; água (parte fixa); energia (parte fixa); telefone; internet; TV; IPTU/taxas; jardinagem; cursos; outros.

**Custos variáveis por diária, quarto de 2 pessoas (10 linhas):** café da manhã; água; energia; limpeza e piscina; lavanderia; reposição de enxoval; manutenção corretiva; amenities; hora extra; outros.

**Taxas e impostos:** comissão Booking, Airbnb, agências; taxa de cartão de crédito e de débito; nº de parcelas e juros ao mês; imposto (Simples/receita); outros.

**Tipos de quarto (até 12):** nome, quantidade, capacidade, multiplicador (duplo padrão = 1,00). Referências do modelo: single 0,55–0,65; varanda 1,05–1,15; vista 1,15–1,25; hidro 1,30–1,50; triplo 1,25–1,35; 4 pessoas 1,45–1,60; suíte master 1,55–1,80; 5–6 pessoas 1,70–2,00; banheiro compartilhado 0,40–0,55.

## 3. Cálculo (todas as fórmulas conferidas, centavo a centavo, contra o exemplo preenchido)
```
F  = soma dos custos fixos mensais          V = soma dos custos variáveis por diária (duplo)
disponíveis = quartos × 30                  vendidas = disponíveis × ocupação
custo_total = F / vendidas + V              # DIÁRIA AMIGO (lucro zero; "nunca venda abaixo disso")
limpa   = custo_total × (1 + margem)        # markup sobre o custo
base    = limpa / (1 − imposto)             # imposto, sem cartão (à vista)
padrão  = limpa / (1 − imposto − cartão)    # preço de tabela
booking = limpa / (1 − imposto − comissão_booking − cartão)
airbnb  = limpa / (1 − imposto − comissão_airbnb)             # sem taxa de cartão
parcelada = limpa / (1 − imposto − cartão − juros_mês × parcelas)
débito  = limpa / (1 − imposto − taxa_débito)
(agência: mesmo padrão do Booking, com a comissão da agência)

diferença = atual − padrão ; % = diferença / padrão ; situação: atual < padrão → "abaixo do padrão"
faturamento_potencial = disponíveis × padrão ; estimado = vendidas × atual
custo_variável_mensal = V × vendidas ; custo_total_mensal = F + V × vendidas
margem_de_contribuição = atual − V ; % = margem / atual
ponto_de_equilíbrio_diárias = F / margem ; em % = diárias / disponíveis      # ignora o imposto
lucro_mensal = vendidas × (atual × (1 − imposto) − V) − F ; sobra_por_diária = lucro / vendidas
```
Observação: os percentuais **somam no denominador** (não em cascata).

### Preço por tipo de quarto e temporada
```
preço(quarto, canal, temporada) = preço_do_canal × multiplicador_do_quarto × multiplicador_da_temporada
diária mínima do quarto = custo_total × multiplicador_do_quarto
médio anual do quarto  = padrão × multiplicador_do_quarto
```
Temporadas: dias baixa e alta são informados; média = 365 − baixa − alta. Os três multiplicadores são normalizados para a **média ponderada pelos dias ser 1,00** (a receita anual do quarto não muda; só se distribui entre as temporadas). No exemplo: baixa 0,5594 (150 dias), média 1,2375 (185), alta 1,7387 (30). Quartos vazios da tabela são ignorados.

### Casos de teste (o código novo só vale se reproduzir estes números)
Entrada: 6 quartos (3 Duplo Standard 1,00; 2 Vista Mar 1,20; 1 Família 1,55); ocupação 35%; baixa 150 dias, alta 30; diária atual 300; margem 20%; imposto 6%; cartão 3,8%; débito 2%; Booking 13%; Airbnb 10%; 5 parcelas a 2,5%; F = 11.354 (23 linhas); V = 62 (10 linhas).

| Saída | Esperado |
|---|---|
| disponíveis / vendidas | 180 / 63 |
| custo fixo por diária / total (amigo) | 180,22 / **242,22** |
| limpa / base / padrão | 290,67 / 309,22 / **322,25** |
| Booking / Airbnb | 376,51 / 346,03 |
| parcelada / débito | 374,09 / 315,94 |
| diferença vs padrão | −22,25 (−6,9%), abaixo do padrão |
| faturamento potencial / estimado | 58.004,43 / 18.900,00 |
| custo variável mensal / custo total mensal | 3.906 / 15.260 |
| margem de contribuição | 238,00 (79,3%) |
| ponto de equilíbrio | 47,7 diárias (26,5%) |
| lucro mensal / sobra por diária | 2.506,00 / 39,78 |
| Duplo Standard, venda direta: baixa/média/alta | 180,25 / 398,78 / 560,29 |
| Duplo Vista Mar, venda direta | 216,30 / 478,54 / 672,34 |
| Família, venda direta | 279,39 / 618,11 / 868,44 |
| Duplo Standard, Booking | 210,60 / 465,93 / 654,63 |
| mínima / médio anual (Standard, Vista, Família) | 242,22/322,25; 290,67/386,70; 375,44/499,48 |

(Diferenças de 1 centavo são aceitáveis: a planilha arredonda os multiplicadores antes.)

## 4. Saídas da tela
- **Cabeçalho do resultado:** alerta (abaixo/ok), diária amigo, padrão e atual.
- **Indicadores:** ponto de equilíbrio (% e diárias), lucro mensal, custos fixo e variável por diária, faturamento potencial e estimado.
- **Preço recomendado por canal:** venda direta (base), Booking, Airbnb (e agência, parcelada e débito).
- **Tabela por quarto:** baixa/média/alta em venda direta e Booking, mínima e médio anual.
- **Comparar cenários** (extra nosso, o original não tem).

## 5. Como encaixar no CRM (proposta)
**Status (10/10/2026):** pronto e testado, falta só o dono usar com os números reais do hotel.
- **Cálculo:** `crm/app/calculadora.js` (função pura) com os casos da seção 3 em `crm/app/teste-calculadora.js`.
- **Rotas (só o dono):** `GET /api/calculadora-diaria` (preenchimento salvo, cenários e a estrutura do formulário), `POST .../calcular`, `POST .../salvar` (preenchimento atual, e opcionalmente um cenário com nome; até 30), `POST .../apagar-cenario` e `GET .../silbeck` (sugestões: tipos de quarto, ocupação e diária média dos últimos 12 meses, comissão típica das agências). Tudo é guardado na tabela `config` (chave `calculadora_diaria`): **não há migração nova para rodar**.
- **Tela:** menu "Diária ideal" (💲), com formulário em seis blocos (dados do hotel, custos fixos, custos variáveis, impostos e comissões, tipos de quarto, temporadas), resultado ao vivo, botão "Puxar do Silbeck", "Salvar" e cenários para comparar. Percentuais são digitados como o dono pensa (13 = 13%) e viajam como fração (0,13).
- **Custos que variam (10/10/2026):** cada linha de custo e de taxa mostra "atualizado há N dias" (laranja depois de 45 dias; a data só muda quando o valor muda); no topo, aviso de que os custos nunca foram preenchidos ou de que faz mais de 30 dias que não são revisados; o bloco "Histórico dos custos" registra, a cada salvamento com valores diferentes, o total de fixos e de variáveis com a variação contra o registro anterior (até 36 registros, com "Abrir" para rever os valores daquela data). Digitar "3.800" ou "3.800,50" vale milhar; "3800.5" vale decimal.
- **Formulário de custos para preencher fora do CRM:** página com as mesmas linhas, salvamento automático e botão "Copiar para o CRM"; no CRM, "Importar preenchimento" lê esse texto (percentuais já na convenção do CRM) e preenche a tela, sem salvar até o dono confirmar.
- **Mix de quartos (10/10/2026):** o preço calculado é a média necessária por diária vendida. Com quartos de preços muito diferentes (no Hotel Cabanas, de R$ 598 a R$ 1.435 no tarifário), o quarto base precisa sair por *preço ÷ multiplicador médio dos quartos*, senão a média de todos passa do necessário. A tela traz a caixa "Ajustar o preço pelo mix de quartos" (ligada por padrão; a planilha original não faz esse ajuste e o teste dela usa desligado).
- **Ocupação por temporada (10/10/2026):** se o dono informar a ocupação das três temporadas (baixa, média, alta), a ocupação média do ano sai dos dias de cada uma, e o peso dos multiplicadores de preço passa a ser dias × ocupação (diárias vendidas), de modo que o preço médio por diária vendida fecha no preço necessário. Sem isso, vale a ocupação única do ano e o peso é só os dias. No Hotel Cabanas: alta 94 dias a 85%, baixa (maio e junho fora dos feriados) 54 dias a 35%, média 217 dias a 55%, o que dá 59,8% no ano.
- **Testes:** 12 verificações das rotas no `teste.js` (acesso só do dono, cálculo do exemplo, erros em português, salvar e apagar cenários, sugestões do Silbeck).

- **Onde:** nova tela no Painel do hotel ("Calculadora de diária"), na área do dono. Back-end no `crm/app/server.js` (rotas `GET/POST /api/calculadora-diaria`), cálculo em módulo puro `crm/app/calculadora.js` com os testes da seção 3; migração `030_calculadora_diaria.sql` para salvar cenários (nome, data, entradas e resultados em JSON).
- **Dados que já temos para pré-preencher:** quartos e tipos (acomodações, migração 026), ocupação, diária média e diárias vendidas (Painel/Silbeck, `GET /api/painel-hotel`), comissões e condições das agências (migrações 027–029). Custos fixos e variáveis o dono informa uma vez e o sistema guarda.
- **Cenários:** guardar versões ("hoje", "se a ocupação subir 10 pontos", "com margem de 30%") e comparar lado a lado; reestudo sugerido a cada 3 meses (aviso no sino).
- **Gilberto/vendas:** a diária amigo do tipo de quarto e da temporada pode servir de piso para descontos (nunca abaixo sem aprovação do dono).
- **Regras:** só o dono vê e edita; a calculadora recomenda, o dono decide; nada muda tarifa no Silbeck sozinho.

## 6. Decisões em aberto
1. **Multiplicadores de temporada:** a planilha mostra 0,56× / 1,24× / 1,74× (ocupações esperadas 10% / 35% / 70%), mas não deu para deduzir a regra que os gera. Proposta nossa: o dono informa a relação entre temporadas (sugestão do exemplo: baixa ≈ 0,45 e alta ≈ 1,40 da média) e o sistema normaliza para média ponderada 1,00. Melhor ainda: sugerir a partir das ocupações reais por mês do Silbeck.
2. **Custos do Hotel Cabanas:** fixos (23 linhas), variáveis por diária (10 linhas) e taxas efetivas de cada canal.
3. **Impostos e canais próprios:** o regime tributário e as comissões reais (Booking, Airbnb, agências, Expedia, Decolar...) podem ser mais que os da planilha.
