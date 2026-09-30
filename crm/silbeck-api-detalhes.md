# API REST do SB Hotel: leitura completa da especificação

> 30/09/2026. Fonte: arquivo oficial `swagger.yaml` (OpenAPI 3.0.3, versão 1.0.1), baixado pelo dono da documentação da Silbeck. Cópia em `crm/silbeck/swagger-hotel-v1.yaml` (convertida para UTF-8).
> Servidores do arquivo: `http://cloud.silbeck.com.br:30503/datasnap/rest` (nuvem da Silbeck) e `http://localhost:8366/datasnap/rest`. O do hotel é `http://192.168.132.242:8366/datasnap/rest`.
> São **29 endpoints**. Nenhum de cancelamento, alteração de reserva ou aviso automático (webhook).

## 1. Autenticação
- `POST /v1/Liberar` com `client_id` e `client_secret` **na query**. Um comentário no arquivo cita também o corpo `x-www-form-urlencoded`, e o Pedro falou em autenticação básica: testar os três jeitos.
- Resposta: `access_token`, `token_type` (Bearer), `expires_in` (30; unidade a confirmar, provavelmente minutos).
- Credenciais **nunca** no repositório (Secret Manager).

## 2. O que o CRM usa e como

### 2.1 Vagas: `GET /v1/Disponibilidade`
- Parâmetros: `dataInicial`, `DataFinal` (com **D maiúsculo**), `DetalharDiaADia` (padrão true).
- Resposta, por tipo de acomodação: `id`, `codigo`, `nome`, `qtdeMapa` e, **por dia**, `qtdeDisponivel`, `qtdeOcupado`, `qtdeManutencao`.
- **Uso:** mapa de vagas de 60 dias (A4), consulta do Gilberto e do orçamento, datas alternativas e lista de espera (A3). Uma chamada cobre todos os tipos.

### 2.2 Preço: `POST /v1/Tarifario/Valor`
- Corpo: `dataEntrada`, `dataSaida`, `quantidadeAdulto` **ou** `listaCategoriaHospede` [{`id`, `quantidade`}], `quantidadeCrianca`, `idTipoPensao`, `idTipoApartamento` ou `codigoTipoApartamento`.
- Resposta: lista **por dia** com `valor`, `valorTaxaServico`, `valorTaxaISS`.
- **Uso:** o orçamento soma os dias (total e média por noite). **Uma chamada por tipo de acomodação.**
- **Crianças:** a regra fica no Silbeck, pelas **categorias de hóspede** (`GET /v1/CategoriaHospede`: 1 adulto pagante, 2 adulto cortesia, 3 criança pagante, 4 criança cortesia). O CRM manda as idades convertidas nas categorias do hotel, e o preço já vem certo. Falta saber quais categorias o Cabanas tem cadastradas (ex.: "criança até 5 anos, cortesia").

### 2.3 Acomodações: `GET /v1/TipoApartamento` e `GET /v1/Apartamento`
- Tipo: `id`, `codigo`, `nome`, `quantidade`, `maximoOcupantes`. Apartamento: `id`, `codigo`, `codigoTipoApartamento`.
- **Uso:** catálogo do orçamento (capacidade máxima filtra o que comporta o grupo). **Sem fotos nem descrição:** fotos pelo banco de imagens, ligadas ao código (CBD, CBT…).

### 2.4 Criar reserva: `POST /v1/reserva`
- Cabeçalho: `titular` (obrigatório), `numeroDocumento`, `email`, `telefone`, `voucher`, `observacao`, `idReservaPortal`, `codigoEmpresa` (agência), `idFaturamento`, `codigoRegime`.
- Itens (`listaReservaItem`): `idTipoApartamento`, `quantidadeAdulto`, `quantidadeCrianca`, `dataEntrada`, `dataSaida`, `qtdeApartamento`, `idTipoPensao`, `idTarifario`, `valorTotalDiaria`, `listaHospede` [{`nome`, `adulto`, `numeroDocumento`}], `listaData` [{`data`, `valorDiaria`, `idTarifario`, `idTipoPensao`}]. `idApartamento` é opcional (o hotel escolhe o quarto depois).
- Resposta 200: `id` da reserva. Resposta 400: lista de erros com `codigo`, `mensagem`, `campoFoco`, que o CRM mostra à equipe ou ao Gilberto.
- **Agência:** campo **`codigoEmpresa`** (resolve a dúvida de P42).
- **Origem:** não há campo "origem". Caminhos: (a) cadastrar um **portal "CRM/WhatsApp"** no Silbeck e enviar o `idReservaPortal` dele; (b) gravar a origem no `voucher` ou na `observacao`. Perguntar à Silbeck qual é o certo.
- **O CRM manda os valores das diárias** (`listaData.valorDiaria`), então o preço deve vir sempre do `Tarifario/Valor` na mesma hora. Nunca digitado, nunca com desconto.
- **Status inicial** da reserva criada: não informado (provavelmente "Não confirmada"). A confirmação depois do sinal pode ser automática pelo adiantamento (ver 2.5). Confirmar com a Silbeck.

### 2.5 Sinal pago: `POST /v1/Adiantamento`
- Corpo: `valor`, `idConta` (= **id do item da reserva**, vindo do `ListaReserva`), `tipoFormaPagamento` (1 dinheiro, **4 cartão**, 5 outra moeda, 6 cheque, **8 Pix/depósito**), e para cartão: `bandeiraCartao`, `nsuCartao`, `codigoAutorizacaoCartao`, `numeroCartao` (**só os 4 últimos dígitos**), `quantidadeParcelas`; `observacao`.
- Resposta: `id`, `confirmado` (se foi confirmado sozinho), `dataDeposito`.
- **Uso:** Pix BB confirmado → adiantamento tipo 8. Link Cielo pago → tipo 4 com NSU, autorização, bandeira e parcelas (dados que a Cielo devolve; nenhum número de cartão completo passa pelo CRM).

### 2.6 Conferir reservas: `GET /v1/ListaReserva`
- Filtros: `dataInicial`, `dataFinal`, `tipoData` (**cadastro**, efetivacao, entrada, ocupacao, saida), `idReserva`, `status` (0 em andamento, 1 não confirmada, 2 confirmada, **3 cancelada**, 4 check-in, 5 no-show), `ativo`.
- Traz tudo da reserva: titular, **telefone, e-mail**, `nomePortal` e `idNoPortal` (Booking), voucher, empresa e comissão, itens com status, hóspedes (com data de nascimento, cidade, UF), diárias, **totais com adiantamento** e **lista de adiantamentos** (situação ativo/estornado/devolvido), extras.
- **Uso:**
  - consulta a cada 5 min por `tipoData=cadastro`: reservas novas (motor, Booking, balcão) ligadas ao lead **pelo telefone/e-mail no próprio CRM** (a API não busca por telefone);
  - **cancelamentos:** `status=3` (a lacuna "cancelar" continua para *fazer*, mas *saber* do cancelamento é possível);
  - **pago ou não:** total de adiantamento × total da reserva → "Aguardando pagamento" ou "Reservado";
  - origem por portal (Booking, motor) para o faturamento por origem.

### 2.7 Hóspedes no hotel: `GET /v1/ListaEstadia` e `GET /v1/MapaApartamento`
- Estadia: filtro por `tipoData` (entrada, ocupacao, saida) e `fechado`. Traz apartamento, entrada e saída com hora, reserva, portal, pensão, observações e hóspedes com contato.
- Mapa: situação atual de cada apartamento, limpeza, estadia, reserva e manutenção.
- **Uso:** status **Hospedado** (B1), gatilhos da régua (pré-chegada, check-out, pós-estadia e NPS).

### 2.8 Pré-check-in: `POST /v1/FichaHospede`
- Grava a **FNRH completa**: nome, contatos, nascimento, sexo, documento, CPF, endereço, procedência, próximo destino, motivo da viagem, meio de transporte, previsão de entrada e saída. Ligação pelo `idReservaItemHospede` (id do hóspede no item da reserva).
- **Uso:** o hóspede preenche pelo link do WhatsApp e o CRM grava direto no Silbeck (item 7.2).

### 2.9 Conta e consumo: `GET /v1/ExtratoConta` e `GET /v1/Lancamento`
- Extrato por `codigoApartamento` (ou empresa/avulsa): lançamentos por setor, total, adiantamento e **valor em aberto**.
- Lançamento: consumos por período, setor e produto (quantidade, valor, estornos).
- **Somente leitura:** a API **não lança consumo**. Upsell vendido pelo CRM continua como **tarefa de 1 clique** para a equipe lançar no Silbeck (ou pago antes como adiantamento).

### 2.10 Cadastros de apoio
- `GET /v1/Produto` (id, código, nome, **sem preço**), `Setor`, `TipoPensao`, `CategoriaHospede`, `Cidade`, `Profissao`.
- `GET /v1/Empresa`, `Hospede`, `Fornecedor`: **250 por página** (`pagina`). Dados: código, nome, documento (CNPJ/CPF), contatos, endereço.
- **Hóspedes:** sem busca por telefone; o CRM importa a base toda, página por página (A5, D1), e atualiza aos poucos.

### 2.11 Ocupação e indicadores: `GET /v1/Ocupacao`
- Por dia: hóspedes e apartamentos (entrada, saída, total, % de ocupação, diária média), **total de diárias e RevPAR**; médias do período e permanência média.
- 15 formas de agrupar (`tipoLista`): geral, empresa, faturamento, categoria, apartamento, tipo, pensão, **portal**, tipo de reserva etc. Filtros por **UF e cidade de origem**, somente confirmadas etc.
- **Uso:** painel do dono (meta de 60%), ocupação por portal (dependência do Booking), hóspedes de MS × outros estados.

### 2.12 Não usar
- `POST /v1/Tarifario` **altera o tarifário** do hotel: o CRM não usa, e a permissão **não deve** ser liberada nas credenciais.
- `PUT /v1/Apartamento/Limpeza`, `GET /v1/Insumo`, `/Fornecedor`: operação interna.
- `POST /v1/reserva/checkin`, `/Fechadura/Senha`, `/Fechadura/Checkin`: uso futuro (check-in agilizado, senha da fechadura pelo WhatsApp), se o hotel tiver fechadura integrada.

## 3. Lacunas confirmadas
1. **Cancelar ou alterar reserva:** não existe. Fica com a equipe no Silbeck; o CRM só **lê** o cancelamento (`status=3`).
2. **Webhooks:** não existem. O CRM consulta a cada 5 minutos.
3. **Fotos e descrições** das acomodações: não existem na API. Usar o banco de imagens.
4. **Preço de produtos:** não vem no `Produto`. Fica no catálogo do CRM.
5. **Lançar consumo:** não existe. Tarefa para a equipe.
6. **Busca por telefone/e-mail:** não existe. Conciliação no CRM.
7. **Cadastrar agência:** não existe (só leitura). Tarefa para a equipe (P42).
8. **Motor de reservas** (fotos, link, pagamento no motor): não faz parte desta API.

## 4. Perguntas para a Silbeck (Pedro)
1. Quais endpoints ficam **liberados** nas nossas credenciais? Pedimos: Liberar, Disponibilidade, Tarifario/Valor, TipoApartamento, Apartamento, CategoriaHospede, TipoPensao, Produto, Empresa, Hospede, ListaReserva, ListaEstadia, MapaApartamento, ExtratoConta, Lancamento, Ocupacao, **reserva**, **Adiantamento**, **FichaHospede**. **Não** liberar `POST Tarifario`.
2. Unidade do `expires_in` e forma certa de enviar o client_id/secret (query, formulário ou básica).
3. **Origem da reserva:** podemos criar um portal "CRM/WhatsApp" e enviar o `idReservaPortal`? Ou usar outro campo?
4. **Status** da reserva criada pela API e se o adiantamento confirma sozinho (`confirmado`).
5. Qual `idTarifario` e `idTipoPensao` usar nas reservas diretas (balcão).
6. Categorias de hóspede cadastradas no Cabanas (idades das crianças) para o `Tarifario/Valor`.
7. O Cabanas pode usar o acesso pela **nuvem da Silbeck** (`cloud.silbeck.com.br`) em vez de abrir portas na rede do hotel?
8. Documentação da **API do motor de reservas** (a usada pela Asksuite).

## 5. Conferência com a estrutura do CRM (30/09/2026)
| Item do CRM | API atende? | Ajuste |
|---|---|---|
| Mapa de vagas 60 dias, vagas no painel da conversa | ✅ `Disponibilidade` | — |
| Orçamento (equipe e Gilberto) | ✅ `Disponibilidade` + `TipoApartamento` + `Tarifario/Valor` (1 chamada por tipo) | Idades das crianças → categorias do Silbeck |
| Gilberto reserva (5.5) | ✅ `POST reserva` | Guardar `idReserva` e `idReservaItem` no card |
| Sinal Pix BB / Cielo (9.1–9.3) | ✅ `Adiantamento` (tipo 8 Pix, tipo 4 cartão com NSU e parcelas) | Precisa do `idReservaItem`: a reserva tem de existir antes do lançamento |
| Pré-reserva não paga | ⚠️ não há cancelamento pela API | **Decidido (P46):** reserva criada no aceite; o CRM controla o pagamento e alerta; cancelamento manual pela equipe no Silbeck |
| Cliente pede cancelamento no WhatsApp | ⚠️ sem API | Tarefa para a equipe cancelar no Silbeck; o CRM confirma pelo `status=3` |
| Sincronizar motor, Booking, agências (9.4, 9.7) | ✅ `ListaReserva` por data de cadastro (portal, adiantamentos, status) | Ligação ao lead por telefone/e-mail feita no CRM |
| Pago × aguardando pagamento | ✅ totais e lista de adiantamentos | — |
| Faturamento por origem (6.2) | ⚠️ sem campo "origem" | Portal "CRM WhatsApp" ou voucher (pergunta à Silbeck) |
| Histórico do hóspede (2.8, A5, D1) | ✅ `Hospede` (250/página) + `ListaReserva` por períodos | Importação inicial demorada, feita uma vez em segundo plano |
| Agências (2.13) | ✅ `Empresa` (documento = CNPJ) + `codigoEmpresa` na reserva | — |
| Status Hospedado e régua (B1, 7.2) | ✅ `ListaEstadia`, `MapaApartamento` | — |
| Pré-check-in (7.2) | ✅ `FichaHospede` (FNRH completa) | Reserva precisa ter os hóspedes listados |
| Produtos e upsell (10.1, 10.4) | ⚠️ `Produto` sem preço; sem lançamento de consumo | Preço no CRM; lançamento por tarefa de 1 clique |
| Painel (ocupação, RevPAR, por portal, por UF) | ✅ `Ocupacao` | — |
| Fotos das acomodações | ❌ | Banco de imagens por código |
