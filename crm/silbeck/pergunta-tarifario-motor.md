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

## Teste das variações (08/10/2026)
O `Tarifario/Valor` ignorou todos os campos não documentados: `idTarifario` 27/28, `codigoTarifario` 000027/000028, `idAgendamentoTarifa`/`idAgendamento` 3, `codigoAgendamento` 000003 e outros. Sempre R$ 1.350 (CAB), em 18/10 e em 20/11.
No Silbeck do hotel: tarifários "TARIFA MOTOR DE RESERVAS BT 2026" (000027) e "AT 2026" (000028); agendamentos "AGENDAMENTO PADRÃO" (000001) e "AGENDAMENTO RESERVA ONLINE" (000003), que escolhe o tarifário do motor por período.

## Mensagem (para o suporte@silbeck.com.br)

> Olá, equipe Silbeck! Aqui é o Ricardo, do Hotel Cabanas (Bonito/MS). Estamos integrando o nosso CRM pela API REST do SB Hotel. A consulta `POST /v1/Tarifario/Valor` devolve sempre o mesmo valor (ex.: Cabana Casal, 2 adultos, R$ 1.350,00 em 18/10/2026 e em 20/11/2026), enquanto o motor de reservas, pelo "AGENDAMENTO RESERVA ONLINE" (000003), usa a "TARIFA MOTOR DE RESERVAS BT 2026" (000027) e a "AT 2026" (000028) e mostra R$ 1.323,00 em 18/10 e R$ 1.607,00 em 20/11.
> 1. Qual agendamento/tarifário o `Tarifario/Valor` usa? É o "AGENDAMENTO PADRÃO" (000001)?
> 2. Existe um campo no `Tarifario/Valor` para informar o agendamento (000003) ou o tarifário (000027/000028)? Testamos `idTarifario`, `codigoTarifario`, `idAgendamento` e `codigoAgendamento` e o valor não mudou.
> 3. A promoção do motor (−41% a partir de 2 diárias) pode ser lida pela API?
> Obrigado!

## Causa encontrada (08/10/2026)
O **"AGENDAMENTO PADRÃO" (000001)** termina com "000017 ALTA 2025" de 13/12/25 em diante, sem data final. A API usa esse agendamento: por isso devolve o mesmo valor (ALTA 2025) para qualquer data futura. O hotel só usa o "AGENDAMENTO RESERVA ONLINE" (000003), com os tarifários do motor BT/AT 2026 por período; segundo o Márcio, o desconto do motor está configurado na própria tarifa.
**Correção (no Silbeck, pelo hotel):** encerrar a linha ALTA 2025 do Padrão e copiar para ele os mesmos períodos e tarifários do Reserva Online. Depois, conferir em `/saude/silbeck-tarifario` (1 e 2 diárias).
