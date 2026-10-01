# Perguntas técnicas para a Silbeck: rodada 2 (01/10/2026)

> Surgiram na construção do simulador (`crm/simulador-silbeck/`). As respostas definem detalhes da integração; nenhuma delas impede começar a construir. Texto pronto para encaminhar ao Marcos.

Olá, Marcos! Seguindo com a integração do nosso CRM com a API Hotel v1, ficaram algumas dúvidas sobre a documentação:

1. **Token:** o `expires_in: 30` é em minutos ou em segundos? Quando o token falta, é inválido ou expirou, qual código HTTP e qual corpo vocês devolvem?
2. **Disponibilidade:**
   - a `DataFinal` entra na consulta?
   - o que vem com `DetalharDiaADia=false`?
   - o `qtdeDisponivel` pode vir negativo em caso de overbooking?
3. **Tarifario/Valor:**
   - qual tarifário é usado, já que o pedido não tem `idTarifario`?
   - o valor já inclui taxa de serviço e ISS?
   - criança conta como pagante?
   - a API recusa pedidos acima da capacidade?
4. **POST reserva:**
   - com `qtdeApartamento > 1`, `quantidadeAdulto`, `quantidadeCrianca` e `valorTotalDiaria` são por apartamento ou do item inteiro?
   - a `listaData` é obrigatória?
   - a API confere a vaga ou permite overbooking? Se recusa, com qual erro?
   - `idTipoPensao` vai como texto ou como número?
5. **idReservaPortal:** é o id do portal ("CRM WhatsApp") ou o id da reserva dentro do portal? Qual a diferença para `idNoPortal`?
6. **Adiantamento:**
   - numa reserva com vários itens, ele confirma só o item informado ou a reserva toda?
   - o que significa `confirmado`?
   - há limite de parcelas?
   - a bandeira precisa estar cadastrada?
   - como conferir depois o NSU e a autorização, que não aparecem na `ListaReserva`?
7. **ListaReserva:**
   - com `idReserva`, as datas continuam obrigatórias?
   - o que é `ativo`?
   - o filtro `status` vale para a reserva ou para o item?
   - em que formato vem `dataHora`?
   - existe alguma forma de listar as reservas **alteradas** a partir de uma data?
8. **FichaHospede:** o `idReservaItemHospede` é o id do hóspede no item ou o id do item? O que a resposta 200 traz?
9. **Paginação:** a `pagina` começa em 0 ou em 1? Como saber que acabou?
10. Os caminhos e os parâmetros diferenciam **maiúsculas e minúsculas** (ex.: `/v1/reserva`, `DataFinal`)?
11. **Reserva duplicada:** se a criação der timeout, qual a forma recomendada de evitar duplicar? Podemos usar o `voucher` como identificador único nosso?
12. **Check-in:** é permitido antes da `dataEntrada` ou sem apartamento alocado?
13. A API aplica alguma regra de **idade ou capacidade por tipo de acomodação** (ex.: tipos que não aceitam menores de 5 anos)?

Obrigado!
