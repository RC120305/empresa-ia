---
name: diaria-pousada
description: Calcula e interpreta a diária ideal de pousada, hotel boutique, hostel ou casa de temporada a partir dos custos fixos, custos variáveis, ocupação, impostos, taxas de canal e margem desejada, com ponto de equilíbrio e tarifa por tipo de quarto e por canal. Use quando o usuário pedir para calcular a diária, "quanto cobrar", precificar quartos, achar a diária mínima ou o ponto de equilíbrio, saber se a diária atual está abaixo do custo, separar custo fixo de variável, definir tarifa de baixa, média e alta temporada ou rever preços (ex.: "calcula minha diária ideal", "estou cobrando R$300, está certo?", "quanto devo cobrar no Booking?").
---

# Diária ideal de pousada

Método de precificação pelo custo: descobre a diária mínima real, o preço com lucro, o preço por canal e o ponto de equilíbrio, e diz o que fazer com o resultado. Funciona sem planilha: você calcula com os dados e as fórmulas abaixo.

## Fluxo
1. **Levante os dados** (peça só o que faltar; aceite estimativa e marque "estimado"):
   - quartos e tipos (nome, quantidade, capacidade, preço atual de cada);
   - ocupação média anual (sem dado: últimos 3 meses; sem nada: 30%);
   - dias de alta temporada (20 a 30) e de baixa;
   - diária atual do quarto duplo padrão;
   - margem de lucro desejada (padrão 20%, mínimo 10%, nunca zero);
   - custos fixos mensais, custos variáveis por diária, percentuais (comissão de canal, cartão, parcelas, imposto).
   Para classificar custo fixo ou variável, ou separar o pessoal do negócio, leia `references/custos.md`.
2. **Calcule** (fórmulas em `references/metodo.md`): diária amigo, diária limpa, diária com imposto, com cartão, por canal; ponto de equilíbrio; lucro mensal estimado.
3. **Compare com a diária atual** e classifique em um dos três casos. Para o que fazer em cada um, leia `references/interpretacao.md`.
4. **Monte a tarifa por quarto** com multiplicadores e a faixa baixa, média e alta.
5. **Entregue**: tabela com os números, os 3 maiores problemas encontrados e as ações em ordem.

## Regras que não mudam
- Pró-labore nunca fica zerado: use quanto o dono precisaria retirar.
- Misturou custo pessoal com o do negócio? Estime uma proporção, anote a regra e refine depois.
- Ponto de equilíbrio acima de 50% da ocupação é frágil; o ideal é de 10% a 20%.
- Diária muito acima do que o mercado paga: primeiro revise custos e ocupação, depois reposicione. Não mande cobrar o triplo de uma hora para outra.
- Preço por canal: o mesmo preço no site e no Booking come a margem; use o valor calculado de cada canal.
- Preço novo vai ao ar sem esperar perfeição; reestudar 1 vez por ano e revisar a cada 3 meses.

## Erros comuns
Ocupação superestimada (a diária sai baixa demais); esquecer custos acessórios no variável; pró-labore alto demais; percentual digitado como número cheio (13 em vez de 13%).

## O que esta skill não faz
Não substitui a planilha original do curso, não vê o mercado local (preço de concorrentes é decisão do dono), não resolve ocupação baixa só com preço e não faz gestão, marketing ou atendimento.

Baseada no curso "CDR – Calculadora da Diária Rentável" (Viver de Pousada), estudado em 10/10/2026; síntese própria. Revisar em 3 meses: comissões de Booking e Airbnb (16% em 2026) e outras taxas de plataforma mudam.
