# API da Silbeck (Hotel v1): mapa para o CRM

> **30/09/2026: especificação completa recebida** (`crm/silbeck/swagger-hotel-v1.yaml`); leitura detalhada, lacunas confirmadas e perguntas à Silbeck em **`crm/silbeck-api-detalhes.md`**. As seções 3 e 4 abaixo ficam como histórico.
> 29/09/2026. Montado a partir dos prints da documentação enviados pelo dono (o site bloqueia acesso de servidores de nuvem). Só temos **os nomes** dos endpoints; parâmetros e respostas ainda precisam ser vistos (seção 4).
> Servidor **local** do hotel (DataSnap, `http://192.168.132.242:8366/datasnap/rest/v1/...`), acesso só pela ponte segura (Márcio). Credenciais **nunca** no repositório.

## 1. Endpoints e para que servem no CRM

### Geral
| Endpoint | O que parece fazer | Uso no CRM | Itens atendidos |
|---|---|---|---|
| `POST /v1/Liberar` | Gera o token de acesso | Autenticação de todas as chamadas | — |
| `GET /v1/Ocupacao` | Ocupação por período | **Mapa de vagas** dos próximos 60 dias; painel de ocupação | A4, painel |
| `GET /v1/Disponibilidade` | Disponibilidade por data/tipo | O agente **consulta vaga**; datas alternativas; **lista de espera** | 5.5, A3 |
| `POST /v1/Tarifario/Valor` | Valor da diária para datas/tipo | **Orçamento** com tarifa real; o agente cota sempre pelo Silbeck | A2, C2 |
| `GET /v1/ListaEstadia` | Estadias (hóspedes no hotel / por período) | Status **Hospedado**; gatilhos de check-in/check-out da **régua** (pré-chegada, NPS) | B1, 7.2 |
| `GET /v1/Lancamento` | Lançamentos (consumos) | Faturamento e **upsell vendido** (boia cross, combo) por reserva | painel |
| `POST /v1/FichaHospede` | Grava a ficha do hóspede | **Pré-check-in pelo WhatsApp**: o CRM preenche a ficha no Silbeck | 7.2 |
| `GET /v1/ExtratoConta` | Extrato da conta do hóspede | Conferir **sinal pago e saldo** | A1 |
| `GET /v1/MapaApartamento` | Mapa dos apartamentos | Apoio ao mapa de vagas | A4 |
| `POST /v1/Fechadura/Senha` e `/Fechadura/Checkin` | Senha da fechadura eletrônica | Se o hotel usar fechadura integrada: **enviar a senha do quarto pelo WhatsApp** no check-in (ideia futura) | novo |

### Cadastros
| Endpoint | Uso no CRM |
|---|---|
| `GET /v1/Hospede` | **Histórico de hóspedes** (importação, A5); reconhecer o hóspede que volta pelo telefone/e-mail (2.8, D1) |
| `GET /v1/TipoApartamento` / `GET /v1/Apartamento` | Lista das acomodações para orçamento e agente (fotos: a confirmar) |
| `POST /v1/Tarifario` | Tarifário por período (apoio ao orçamento e à demanda não atendida) |
| `GET /v1/Produto` | Produtos e serviços (boia cross, arvorismo, combo?) (só código e nome, **sem preço**)|
| `GET /v1/Setor` | Setores do hotel: **encaminhar pedidos de hóspede** ao setor certo (B1) |
| `GET /v1/Empresa` | **Fonte do cadastro de agências/operadoras**: sincronização a cada hora, ligação por CNPJ, ID usado no `POST reserva` (P42). Sem POST: agência nova é cadastrada no Silbeck pela equipe |
| `GET /v1/CategoriaHospede`, `/Cidade`, `/Profissao`, `/TipoPensao` | Tabelas de apoio para preencher a ficha e a reserva |
| `PUT /v1/Apartamento/Limpeza`, `GET /v1/Insumo`, `GET /v1/Fornecedor` | Operação interna; sem uso previsto no CRM |

### Reserva
| Endpoint | Uso no CRM | Itens |
|---|---|---|
| `GET /v1/ListaReserva` | **Conciliar a reserva com o lead** (1.6); faturamento por origem; reservas do Booking para o pós-estadia | 1.6, 6.2, A5 |
| `POST /v1/reserva` | **O agente cria a reserva** | 5.5 |
| `POST /v1/reserva/checkin` | Check-in (uso futuro, ex.: check-in agilizado) | — |
| `POST /v1/Adiantamento` | **Lançar o sinal pago na conta do cliente** | **A1** |

## 2. Leitura
- **Boa notícia:** a API cobre o essencial: consultar vaga e preço, **criar reserva**, **lançar adiantamento (sinal)**, listar reservas e estadias, ler hóspedes e gravar a ficha. O agente pode, sim, reservar, e o pagamento pode ser lançado no Silbeck sem digitação manual.
- **A1 resolvido no desenho:** link de pagamento gerado por uma **empresa de pagamentos** (Pix/cartão) → aviso automático de pagamento → o CRM chama `POST /v1/Adiantamento` → confere em `GET /v1/ExtratoConta` → card vai para **Reservado**. A API da Silbeck **não gera link de pagamento**; isso fica com a empresa de pagamentos.

## 3. Lacunas (não aparecem nos prints)
1. **Cancelar ou alterar reserva:** não há endpoint visível. Cancelamentos e mudanças ficam com a equipe no Silbeck; o CRM só lê o resultado.
2. **Avisos automáticos (webhooks):** não aparecem. O CRM terá de **consultar de tempos em tempos** (ex.: a cada 5 minutos) para saber de reserva nova, check-in e check-out.
3. **Fotos das acomodações:** não está claro se `TipoApartamento` traz imagens. Plano B: usar o banco de imagens do Drive (5.7).
4. **Campo de origem da reserva:** saber se o `POST /v1/reserva` aceita origem/segmento/canal. Essencial para o faturamento por origem.
5. **Busca por telefone/e-mail:** saber se `Hospede` e `ListaReserva` filtram por telefone ou e-mail (conciliação).
6. **Motor de reservas** (link preenchido e cobrança do sinal) é outro sistema; não está nesta API.
7. Quais endpoints estão **liberados** para as credenciais do hotel (o exemplo inicial só mostrava `Ocupacao`) e a unidade do `expires_in`.

## 4. Próximo passo: detalhes a coletar (prints dos endpoints abertos)
Em ordem de prioridade, abrir cada um na documentação e enviar o print dos **parâmetros** e do **exemplo de resposta**:
1. `POST /v1/reserva` (e o schema **ReservaResultado**)
2. `POST /v1/Adiantamento`
3. `GET /v1/Disponibilidade`
4. `POST /v1/Tarifario/Valor`
5. `GET /v1/ListaReserva` (e **ListaReservaResultado**)
6. `GET /v1/Hospede`
7. `GET /v1/ListaEstadia` (e **ListaEstadiaResultado**)
8. `GET /v1/ExtratoConta`
9. `GET /v1/TipoApartamento` e `GET /v1/Produto`

## 5. Acesso externo à API (orientação da Silbeck, técnico Pedro, 30/09/2026)
- **O link da documentação** mostra o catálogo do que a Silbeck **pode liberar** para o hotel. Cada endpoint é liberado nas credenciais (hoje: `Ocupacao`, pelo exemplo enviado).
- **Credenciais JWT** (Client ID/Secret) já emitidas pela Silbeck e enviadas ao dono. **Não ficam no repositório**; no CRM vão para o Secret Manager. Como passaram pelo chat, pedir **nova geração** antes da produção.
- **Token:** `POST /v1/liberar` com autenticação básica → `access_token` com `expires_in: 30` (unidade a confirmar; o CRM renova o token a cada chamada ou ao expirar).
- **Rede:** hoje só funciona **dentro da rede do hotel**. Proposta da Silbeck: **IP fixo externo** no provedor + redirecionar as portas **8365, 8366 e 8367** para o servidor interno (192.168.132.242).
- **Parecer (segurança):** o servidor fala **HTTP sem criptografia**; abrir as portas deixa o sistema do hotel exposto na internet e o usuário/senha e os dados de hóspedes trafegando em texto aberto. Alternativas, em ordem:
  1. **Recomendado: túnel de saída** (Cloudflare Tunnel, gratuito) num micro/servidor do hotel: nenhuma porta aberta, sem IP fixo, HTTPS de ponta a ponta, acesso só com chave do CRM. Configuração: Márcio.
  2. **VPN** entre o hotel e o Google Cloud (mais cara e complexa).
  3. **IP fixo + portas** (proposta da Silbeck) **só com**: firewall liberando as portas **apenas para o IP fixo de saída do CRM** (Cloud NAT no Google Cloud) e, se a Silbeck suportar, HTTPS na porta. Nunca aberto para qualquer IP.
- **Documentação:** o site segue bloqueado para servidores de nuvem; pedir à Silbeck o arquivo **OpenAPI/Swagger** (e a documentação da API do motor).
