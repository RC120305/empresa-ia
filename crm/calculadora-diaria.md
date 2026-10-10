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

## 3. Cálculo (conferido contra o exemplo preenchido)
```
F  = soma dos custos fixos mensais
V  = soma dos custos variáveis por diária
disponíveis = quartos × 30
vendidas    = disponíveis × ocupação
custo_fixo_por_diária = F / vendidas
custo_total = custo_fixo_por_diária + V          # "diária amigo" (lucro zero)
diária_limpa = custo_total × (1 + margem)
preço_com_taxas(p) = diária_limpa / (1 − imposto − p)   # p = taxa do cartão, comissão do canal etc.
ponto_de_equilíbrio(%) = F / (diária_atual − V) / disponíveis
lucro_mensal = vendidas × (diária_atual × (1 − imposto) − V) − F
faturamento_potencial = disponíveis × diária_atual ; estimado = vendidas × diária_atual
```
**Caso de teste (exemplo do curso, hostel de 6 quartos):** F = 11.354, V = 62, ocupação 35%, margem 20%, imposto 6%, cartão 3,8%, diária atual 300 → disponíveis 180; vendidas 63; fixo/diária 180,22; custo total **242,22**; padrão com cartão **322,25**; ponto de equilíbrio **26,5%**; lucro mensal **R$ 2.506**. O código novo só vale se reproduzir esses números.

Observações do método: as taxas somam *no denominador* (não em cascata); o ponto de equilíbrio usa a diária atual e **ignora** o imposto; o lucro usa a diária atual **com** imposto. Alerta do dashboard: "abaixo do padrão" quando diária atual < preço padrão.

## 4. Saídas
- Diária amigo, limpa, só com imposto, com cartão (padrão), por canal (Booking, Airbnb, agência), parcelada (com juros) e no débito. A fórmula exata de canal, parcelado e débito não foi vista na planilha: usar o mesmo padrão do cartão (`preço_com_taxas`) e, no parcelado, acrescentar o juros; **validar quando tivermos os números do exemplo**.
- Indicadores: ponto de equilíbrio (ocupação e nº de diárias), lucro mensal, custo fixo e variável por diária, margem de contribuição, faturamento potencial e estimado.
- Temporadas (baixa/média/alta): dias, ocupação esperada (exemplo: 10%, 35%, 70%) e multiplicador de preço (exemplo: 0,56×, 1,24×, 1,74×; média ponderada pelos dias ≈ 1). **A fórmula dos multiplicadores não ficou clara.** Proposta própria: o usuário informa o multiplicador de cada temporada (com sugestão) e o sistema normaliza para a média ponderada pelos dias ser 1, de modo que a receita anual não mude.
- Preço por tipo de quarto: `preço = diária_do_canal × multiplicador_do_quarto × multiplicador_da_temporada`, com piso ("mínima") e média anual. Arredondar para o inteiro mais próximo.

## 5. Como encaixar no CRM (proposta)
- **Onde:** nova tela no Painel do hotel ("Calculadora de diária"), na área do dono. Back-end no `crm/app/server.js` (rotas `GET/POST /api/calculadora-diaria`), cálculo em módulo puro `crm/app/calculadora.js` com testes do caso acima; migração `030_calculadora_diaria.sql` para salvar cenários (nome, data, entradas e resultados em JSON).
- **Dados que já temos para pré-preencher** (não digitar de novo): quartos e tipos (cadastro de acomodações, migração 026), ocupação, diária média e diárias vendidas (Painel/Silbeck, `GET /api/painel-hotel`), taxas e comissões de agência (cadastro de agências, migrações 027–029). Custos fixos e variáveis o dono informa uma vez e o sistema guarda.
- **Cenários:** guardar versões ("hoje", "se a ocupação subir 10 pontos", "com margem de 30%") e comparar lado a lado; reestudo sugerido a cada 3 meses (aviso no sino).
- **Gilberto/vendas:** o piso por temporada pode alimentar a política de desconto (não oferecer abaixo da "diária amigo" sem aprovação do dono).
- **Regras:** só o dono vê e edita; nada é publicado nem muda tarifa no Silbeck sozinho: a calculadora recomenda, o dono decide.

## 6. O que falta para fechar
1. Fórmulas de canal, parcelado, débito e dos multiplicadores de temporada (abas 2 e 4 da planilha): confirmar com números do exemplo.
2. Custos reais do Hotel Cabanas (fixos e variáveis) e as taxas efetivas de cada canal.
3. Decisão do dono sobre os multiplicadores de temporada que quer usar.
