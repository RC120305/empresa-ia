# Mensagem para a Silbeck (Pedro), 30/09/2026

Oi, Pedro, tudo bem? Aqui é o Ricardo, do Hotel Cabanas. Obrigado pelas credenciais e pela documentação da API. Estamos montando nosso CRM para integrar com o Silbeck e fiquei com algumas dúvidas:

*1. Acesso*
a) Na documentação aparece o servidor cloud.silbeck.com.br:30503. Ele é um ambiente de testes que podemos usar para desenvolver sem mexer nos dados reais do hotel? Se sim, conseguem liberar um acesso de teste para nós?
b) O Cabanas pode ser acessado pela nuvem de vocês, sem abrir portas no hotel?
c) Se o acesso tiver que ser pelo servidor do hotel: em vez de abrir as portas 8365 a 8367 para a internet, podemos usar um túnel seguro com HTTPS (tipo Cloudflare Tunnel), configurado pelo nosso TI? A API funciona normalmente assim? Tem suporte a HTTPS?
d) No /v1/Liberar, o client_id e o client_secret vão na URL (query), no corpo (form) ou em autenticação básica? E o expires_in de 30 é em minutos ou em segundos?

*2. Endpoints liberados*
Precisamos que fiquem liberados nas nossas credenciais: Liberar, Disponibilidade, Tarifario/Valor, TipoApartamento, Apartamento, CategoriaHospede, TipoPensao, Produto, Empresa, Hospede, ListaReserva, ListaEstadia, MapaApartamento, ExtratoConta, Lancamento, Ocupacao, reserva (POST), Adiantamento e FichaHospede.
Por segurança, *não* precisamos do POST Tarifario (alterar tarifário): pode deixar bloqueado.

*3. Reservas criadas pela API*
a) Com que status a reserva entra (não confirmada, confirmada)? Ela passa para confirmada sozinha quando lançamos o adiantamento?
b) Queremos identificar as reservas que vêm do nosso CRM/WhatsApp (origem). Podemos cadastrar um portal "CRM WhatsApp" e enviar o idReservaPortal? Ou existe outro campo certo para a origem/segmento?
c) Quais idTarifario e idTipoPensao devemos usar nas reservas diretas?
d) Para agências, basta enviar o codigoEmpresa que a comissão sai certa?
e) Existe alguma forma de cancelar ou alterar reserva pela API, ou algum aviso automático (webhook) quando uma reserva é criada ou cancelada?

*4. Preços e crianças*
Quais categorias de hóspede estão cadastradas no Cabanas (ex.: criança até 5 anos cortesia) para usarmos no Tarifario/Valor? E o valor que volta já inclui taxa de serviço e ISS?

*5. Adiantamento*
No tipoFormaPagamento 8 (Pix), precisa informar alguma conta corrente? E, no cartão (tipo 4), qual é o código de cada bandeira no campo bandeiraCartao?

*6. Motor de reservas*
Vocês têm a documentação da API do motor de reservas (sbreserva), com tipos de acomodação, fotos e tarifas? A Asksuite usa essa integração hoje, e precisamos da mesma para substituí-la.

*7. Regras da reserva*
a) O POST reserva recusa a reserva quando não há vaga no período, ou aceita mesmo assim (overbooking)?
b) O maximoOcupantes do tipo de apartamento conta as crianças pequenas?
c) A API respeita estadia mínima ou fechamento de venda por período (feriados, pacotes)? Onde isso fica?
d) O FichaHospede consegue incluir acompanhantes que não foram informados na reserva?

*8. Credenciais*
Quando formos para produção, pedimos que gerem credenciais novas.

Obrigado!
