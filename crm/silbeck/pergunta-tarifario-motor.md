# Pergunta à Silbeck: tarifário usado pelo Tarifario/Valor (08/10/2026)

Comparação feita pelo dono no motor de reservas (tarifa "Normal") e pela API (`POST /v1/Tarifario/Valor`), 2 adultos:

| Data | Tipo | Motor ("Normal", 1 diária) | API (valor + ISS 5%) |
|---|---|---|---|
| 18 a 19/10/2026 | STD | R$ 1.013,00 | R$ 933,00 + 46,65 = 979,65 |
| 18 a 19/10/2026 | CAB | R$ 1.323,00 | R$ 1.350,00 + 67,50 = 1.417,50 |
| 20/11/2026 (feriado) | CAB | R$ 1.607,00 | R$ 1.350,00 + 67,50 = 1.417,50 |
| 20/11/2026 (feriado) | CABT | R$ 1.905,20 | R$ 1.350,00 + 67,50 = 1.417,50 |
| 20/11/2026 (feriado) | BANG4C | R$ 2.183,80 | R$ 1.833,00 + 91,65 = 1.924,65 |

A API devolve o mesmo valor da Cabana Casal em outubro e no feriado de novembro, e o mesmo valor para CAB e CABT; o motor varia por temporada e por tipo. Conclusão: o `Tarifario/Valor` usa outro tarifário, não o "Normal" do motor. `idTipoPensao` (4, café da manhã) não muda o valor.

## Mensagem (para o suporte@silbeck.com.br)

> Olá, equipe Silbeck! Aqui é o Ricardo, do Hotel Cabanas (Bonito/MS). Estamos integrando o nosso CRM pela API REST do SB Hotel e a consulta `POST /v1/Tarifario/Valor` está devolvendo valores diferentes da tarifa "Normal" do motor de reservas. Exemplos, 2 adultos, 1 diária: Standard em 18/10/2026, motor R$ 1.013,00 e API R$ 933,00; Cabana Casal em 18/10/2026, motor R$ 1.323,00 e API R$ 1.350,00; Cabana Casal em 20/11/2026, motor R$ 1.607,00 e API R$ 1.350,00 (o mesmo valor de outubro). Parece que a API usa outro tarifário, sem as temporadas.
> 1. Qual tarifário o `Tarifario/Valor` usa quando não informamos nenhum?
> 2. Podemos informar o tarifário (ex.: `idTarifario` da tarifa "Normal" do motor) no `Tarifario/Valor`? Se sim, qual o nome do campo e como achamos o ID?
> 3. A promoção do motor (−41% a partir de 2 diárias) pode ser lida pela API, ou ela existe só no motor?
> Obrigado!
