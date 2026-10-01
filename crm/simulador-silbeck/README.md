# Simulador da API Hotel v1 da Silbeck (SB Hotel)

> ⚠️ **Aviso:** isto é uma **cópia de mentira** da API do PMS do Hotel Cabanas, feita para construir e testar o CRM **sem tocar no sistema real**.
> - **Nunca** aponte o simulador, os testes ou o CRM em desenvolvimento para o servidor real do hotel (`192.168.132.242:8366`) nem para `cloud.silbeck.com.br`.
> - **Nunca** use `client_id` e `client_secret` reais aqui. O simulador aceita **qualquer** credencial: use `client_id=teste&client_secret=teste`.
> - Todos os dados (IDs, códigos, nomes, documentos, telefones, e-mails, preços) são **fictícios**. Os IDs reais devem ser coletados no Silbeck (`crm/silbeck/mapa-ids.md`).
> - Toda resposta traz o cabeçalho `X-Simulador: silbeck-sim (FICTICIO)`. O CRM pode registrar no log de qual servidor veio cada resposta.

Referência usada: `crm/silbeck/swagger-hotel-v1.yaml` (OpenAPI 3.0.3, versão 1.0.1, 29 endpoints) e `crm/silbeck-api-detalhes.md` (inclusive as respostas da Silbeck de 30/09/2026).

## Como rodar

Requisito: **Node.js 18 ou mais novo**. Não há dependências (`npm install` não é necessário).

```bash
cd crm/simulador-silbeck
node server.js                         # porta 8366, só em 127.0.0.1, estado em memória
node server.js --porta 9000            # outra porta (ou SIM_PORTA=9000)
node server.js --estado estado.json    # salva o estado a cada gravação e recarrega ao subir (ou SIM_ESTADO=...)
node server.js --host 0.0.0.0          # aceitar conexões de outras máquinas (ou SIM_HOST=...); use só em rede de teste
node server.js --silencioso            # sem log no terminal (ou SIM_SILENCIOSO=1)
```

URL base (igual ao real, trocando o host): `http://127.0.0.1:8366/datasnap/rest/v1/...`.
O simulador também aceita `/v1/...` sem o prefixo, mas devolve um aviso: no real, use sempre `/datasnap/rest`.

Exemplo do fluxo:

```bash
B=http://127.0.0.1:8366/datasnap/rest
T=$(curl -s -X POST "$B/v1/Liberar?client_id=teste&client_secret=teste" | node -pe 'JSON.parse(require("fs").readFileSync(0)).access_token')
curl -s -H "Authorization: Bearer $T" "$B/v1/Disponibilidade?dataInicial=2026-11-10&DataFinal=2026-11-12"
curl -s -X POST -H "Authorization: Bearer $T" -H 'Content-Type: application/json' "$B/v1/Tarifario/Valor" \
  -d '{"dataEntrada":"2026-11-10","dataSaida":"2026-11-13","quantidadeAdulto":2,"codigoTipoApartamento":"CBD","idTipoPensao":4}'
```

## Testes automáticos

```bash
cd crm/simulador-silbeck
node --test testes/fluxo.test.js       # ou: npm test
```

O teste sobe o simulador numa porta livre e verifica 24 cenários: token → cadastros → disponibilidade → tarifa → reserva **não confirmada** → adiantamento **Pix** (tipo 8) confirma → **cartão** (tipo 4: só 4 dígitos, NSU, parcelas) → `ListaReserva` por cadastro e status → erros (sem token, token inválido, token expirado, sem vaga, vaga que acaba entre a cotação e a reserva, validações) → agência (`codigoEmpresa`) → cancelamento e alteração **pela equipe** (`/_sim`) → falhas (500, timeout, queda, timeout depois de gravar) → FNRH, check-in, estadia e mapa → paginação → demais rotas → salvar/recarregar estado.

## Dados iniciais (seed)

Arquivo `dados/seed.json`. Ao subir (ou em `POST /_sim/reset`), o simulador carrega:

- **11 tipos e 21 acomodações** com os códigos validados pelo dono: CBD Cabana Casal (3, máx. 2), CBT Cabana Tripla (1, máx. 3), CBM Cabana Master (1, máx. 5), BG Bangalô (2, máx. 4), BGE Bangalô Especial (1, máx. 4), STD Standard duplo/triplo (6, máx. 3), CST Duplo Casa Standard (1, máx. 2), SUP Superior duplo/triplo (2, máx. 3), CJ Conjugado (1, máx. 5), QST Quádruplo Standard (2, máx. 4), QES Quádruplo Superior/Especial (1, máx. 4). Os IDs (1 a 11) e os códigos dos apartamentos (C01…, B01…, 101…) são **fictícios**.
- **10 reservas** com nomes claramente fictícios: 9 em novembro e dezembro de 2026 e 1 hospedada agora (30/09 a 03/10, no apto 101), para `ListaEstadia`, `MapaApartamento` e `ExtratoConta` terem conteúdo. Há reservas confirmadas com Pix e com cartão, não confirmadas aguardando sinal, uma do Booking, uma do motor de reservas, uma de agência (`codigoEmpresa` 901, faturamento Empresa) e uma cancelada.
- **Ocupação parcial:** no Réveillon (29/12 a 02/01) as **3 Cabanas Casal e a Cabana Master estão esgotadas**; no Natal os 2 Bangalôs estão ocupados; o apartamento 106 (STD) está em **manutenção** de 16 a 18/11.
- **Tarifas fictícias** por tipo, com temporada (feriado de 19 a 22/11 ×1,25; Natal e Réveillon de 20/12 a 04/01 ×1,45), +15% nas noites de sexta e sábado, pessoa extra acima de 2 pagantes, ISS de 2% e taxa de serviço 0% (configuráveis).
- **Cadastros:** 4 empresas/agências, 2 fornecedores, 281 hóspedes no cadastro, mais os das reservas (para testar a paginação de 250), produtos, setores, cidades e profissões.

### IDs fictícios do simulador (trocar pelos reais do `mapa-ids.md`)

| O quê | Valor no simulador (FICTÍCIO) |
|---|---|
| Pensão "Só Café" | `idTipoPensao` 4 (padrão); 6 = Meia Pensão (inventada) |
| Tarifário direto/balcão | `idTarifario` 1; agências = 2 |
| Faturamento particular / empresa | `idFaturamento` 1 / 2 |
| Portal "CRM WhatsApp" | `idReservaPortal` 7 (Booking.com = 3, Motor de Reservas = 5) |
| Bandeiras de cartão | `00001` Visa, `00002` Mastercard, `00003` Elo, `00004` Amex, `00005` Hipercard |
| Categorias de hóspede | 1 Adulto (tipo 1), 2 Adulto cortesia (tipo 2), 3 Criança a partir de 5 anos (tipo 3), 4 Criança até 5 anos cortesia (tipo 4) |
| Pix | `tipoFormaPagamento` 8 (conta corrente 3) |
| Agências | `codigoEmpresa` 901, 902, 903, 904 |

## Rotas implementadas × swagger (29 endpoints)

Todas exigem `Authorization: Bearer <access_token>`, menos `/v1/Liberar`. Erros de validação seguem o `StatusCode400`: `{"erro":[{"codigo","mensagem","campoFoco"}]}`, com **todos** os erros juntos.

| # | Método e caminho | Status | Comportamento no simulador |
|---|---|---|---|
| 1 | `POST /v1/Liberar` | completo | `client_id` e `client_secret` na query (como a Silbeck confirmou). Também aceita corpo `x-www-form-urlencoded` e Basic, com aviso. Devolve `access_token`, `token_type: Bearer` e `expires_in: 30`. O token vale 1800 s (30 min, configurável). |
| 2 | `GET /v1/Ocupacao` | completo | Calcula por dia a partir das reservas: pax e aptos (dia anterior, entrada, saída, total, %, diária média), total de diárias, RevPAR e médias do período. `somenteReservaConfirmada` funciona. **Só `tipoLista=0` (geral)**: os outros agrupamentos e os filtros de origem, empresa e portal são ignorados (com aviso). |
| 3 | `GET /v1/Disponibilidade` | completo | Por tipo e por dia (`dataInicial` a `DataFinal`, inclusive): `qtdeDisponivel`, `qtdeOcupado` (reservas não canceladas), `qtdeManutencao`. |
| 4 | `POST /v1/Tarifario/Valor` | completo | Lista por noite com `valor`, `valorTaxaServico`, `valorTaxaISS`. Aceita `quantidadeAdulto`/`quantidadeCrianca` ou `listaCategoriaHospede`; cortesia não paga; recusa acima da capacidade. |
| 5 | `GET /v1/ListaEstadia` | completo | Estadias criadas pelo check-in. Filtros `tipoData` (entrada, ocupacao, saida) e `fechado`. |
| 6 | `GET /v1/ListaReserva` | completo | Todos os campos do `ReservaResultado`, inclusive `listaTotal` (com adiantamento) e `listaAdiantamento`. Filtros `tipoData` (cadastro, efetivacao, entrada, ocupacao, saida), `idReserva`, `status`, `ativo`. |
| 7 | `GET /v1/Lancamento` | dados fixos | Lançamentos fixos do seed (e os criados em `/_sim/lancamento`), filtrados por período, setor, produto e `incluirInativos`. |
| 8 | `GET /v1/Apartamento` | dados fixos | As 21 acomodações do seed. |
| 9 | `PUT /v1/Apartamento/Limpeza` | completo | Muda a limpeza; aparece no `MapaApartamento`. |
| 10 | `GET /v1/TipoApartamento` | dados fixos | Os 11 tipos do seed. |
| 11 | `GET /v1/Produto` | dados fixos | Sem preço (como no real). |
| 12 | `GET /v1/Insumo` | dados fixos | |
| 13 | `GET /v1/Setor` | dados fixos | |
| 14 | `GET /v1/TipoPensao` | dados fixos | |
| 15 | `GET /v1/CategoriaHospede` | dados fixos | |
| 16 | `GET /v1/Cidade` | dados fixos | |
| 17 | `GET /v1/Profissao` | dados fixos | |
| 18 | `GET /v1/Empresa` | completo | 250 por página (`pagina` começa em 1). Cresce com `POST /_sim/empresa` (a equipe cadastrando agência no Silbeck). |
| 19 | `GET /v1/Fornecedor` | dados fixos | Paginado. |
| 20 | `GET /v1/Hospede` | completo | 250 por página. Inclui os hóspedes criados pelas reservas e atualizados pela FNRH. |
| 21 | `POST /v1/Tarifario` | completo | **Bloqueado por padrão (403)**, porque o CRM não deve ter essa permissão. Com `permitirPostTarifario: true` em `/_sim/config`, grava valores que passam a valer no `Tarifario/Valor`. |
| 22 | `POST /v1/FichaHospede` | completo | Grava a FNRH no hóspede do item (`idReservaItemHospede` = `id` do hóspede em `listaHospede`), valida os códigos (sexo, documento, raça, deficiência, motivo, transporte, UF, CPF, datas) e atualiza o cadastro. |
| 23 | `GET /v1/ExtratoConta` | dados fixos | Só por `codigoApartamento`: diárias já geradas da estadia aberta + lançamentos do seed, total, adiantamento e `valorAberto`. Por funcionário, avulsa ou empresa devolve vazio. |
| 24 | `GET /v1/MapaApartamento` | completo | Situação (Livre, Ocupado, Manutenção), limpeza, estadia aberta, manutenção e próxima reserva **com apartamento alocado**. |
| 25 | `POST /v1/reserva` | completo | Valida tudo, confere a vaga de todos os itens juntos e cria a reserva **não confirmada** (status 1). Responde `{"id": "50011"}` (texto, como no swagger). |
| 26 | `POST /v1/reserva/checkin` | completo | Por `idReservaItem` ou `idReserva` + `codigoApartamento`; cria a estadia e passa o item para status 4; 404 se não achar. |
| 27 | `POST /v1/Fechadura/Senha` | dados fixos | Aceita e registra (não guarda a senha); 404 se a reserva não existe. |
| 28 | `POST /v1/Fechadura/Checkin` | dados fixos | Aceita e registra; 404 se a reserva não existe. |
| 29 | `POST /v1/Adiantamento` | completo | Tipos 1, 4, 5, 6 e 8. Cartão: `numeroCartao` **só com 4 dígitos** (16 dígitos é recusado), bandeira cadastrada, 1 a 12 parcelas. **Confirma o item** da reserva (status 1 → 2) e devolve `id`, `confirmado` e `dataDeposito`. Recusa item cancelado ou no-show. |

**Resumo:** 15 completos, 14 com dados fixos, 0 não implementados.

**Não existe na API (como no real):** cancelar, alterar reserva e webhooks. `DELETE`, `PUT` ou `PATCH` em `/v1/reserva` devolvem 405, e caminhos inventados devolvem 404.

## Rotas de administração `/_sim/` (a "equipe" mexendo no Silbeck)

Não exigem token. Por isso o simulador escuta só em `127.0.0.1` por padrão.

| Rota | Para quê |
|---|---|
| `GET /_sim` | Resumo: relógio simulado, falhas armadas, tokens ativos, lista de rotas |
| `GET /_sim/estado` | Estado completo (reservas, estadias, cadastros, sequências) |
| `GET /_sim/log?n=100` | Últimas requisições, com status, tempo e avisos (o `client_secret` aparece mascarado) |
| `POST /_sim/reset` | Volta ao seed. `{"vazio": true}` = sem reservas nem manutenções |
| `POST /_sim/salvar` `{"arquivo": "x.json"}` | Salva o estado em JSON (sem `arquivo`, usa o `--estado`) |
| `POST /_sim/carregar` `{"arquivo": "x.json"}` | Carrega um estado salvo |
| `POST /_sim/config` | Muda a configuração: `tokenTtlSeg`, `expiresInRetornado`, `taxaServicoPercentual`, `taxaISSPercentual`, `idTipoPensaoPadrao`, `idTarifarioPadrao`, `idFaturamentoPadrao`, `permitirPostTarifario`, `maxParcelasCartao`, `registrosPorPagina` |
| `POST /_sim/relogio` | `{"avancarSegundos": 1801}`, `{"agora": "2026-11-10 14:00:00"}` (horário de Bonito) ou `{"real": true}`. Serve para expirar tokens e mudar o "hoje" |
| `POST /_sim/cancelar` | `{"idReserva"}` ou `{"idReservaItem"}`, `motivo`, `devolverAdiantamentos` → status 3 |
| `POST /_sim/alterar` | `{"idReserva" ou "idReservaItem", dataEntrada, dataSaida, idTipoApartamento, quantidadeAdulto, quantidadeCrianca, qtdeApartamento, idApartamento, status, listaData, titular, telefone, email, voucher, observacao, codigoEmpresa, recalcularDiarias, ignorarDisponibilidade}` |
| `POST /_sim/noshow` `{"idReservaItem"}` | Status 5 |
| `POST /_sim/adiantamento-situacao` | `{"idAdiantamento", "situacao": "Estornado"/"Devolvido"/...}` |
| `POST /_sim/reserva-manual` | Reserva feita pela recepção, Booking ou motor: corpo do `POST /v1/reserva` + `nomeUsuario`, `idNoPortal`, `status`, `ignorarDisponibilidade` (overbooking) |
| `POST /_sim/checkout` | `{"idEstadia"}` ou `{"codigoApartamento"}` |
| `POST /_sim/manutencao` / `POST /_sim/manutencao/liberar` | Bloqueia ou libera um apartamento (`codigoApartamento`, `dataInicial`, `dataFinal`, `motivo` / `id`) |
| `POST /_sim/empresa` | Cadastra agência (`codigo`, `nome`, `documento`, `percentualComissao`...) |
| `POST /_sim/lancamento` | Lança consumo num apartamento (`codigoApartamento`, `idProduto`, `idSetor`, `quantidade`, `valorUnitario`) |
| `POST /_sim/falha` | Injeta falha (ver abaixo). `DELETE /_sim/falha` limpa todas |

### Falhas injetáveis (`POST /_sim/falha`)

Campos: `tipo`, `rota` (ex.: `/v1/reserva`; sem ela, vale para a próxima chamada a qualquer rota), `metodo`, `vezes` (padrão 1), `atrasoMs`, `gravar`.

| `tipo` | Efeito |
|---|---|
| `erro500` | Responde 500 `{"error": "..."}` (estilo DataSnap) |
| `timeout` | Não responde; fecha a conexão depois de `atrasoMs` (padrão 60 s). Com `"gravar": true`, **processa a requisição antes** (ex.: a reserva é criada, mas o CRM não recebe o id). Serve para testar a duplicidade ao repetir |
| `queda` | Derruba a conexão na hora (connection reset) |
| `lento` | Responde normalmente depois de `atrasoMs` (padrão 5 s) |
| `token_expirado` | Expira na hora todos os tokens emitidos |
| `sem_vaga` | No próximo `POST /v1/reserva`, "outro canal" (Booking fictício) compra antes as vagas restantes dos tipos e datas pedidos, e a reserva falha com `SEM_DISPONIBILIDADE`. É a vaga que acabou entre a cotação e a reserva |

### Avisos (`X-Sim-Avisos`)

Quando algo funciona no simulador mas pode não funcionar no real, a resposta traz o cabeçalho `X-Sim-Avisos` (URL-encoded). Exemplos: parâmetro com grafia diferente do swagger (`datafinal` em vez de `DataFinal`), caminho sem `/datasnap/rest`, `listaData` não enviada (o simulador calculou as diárias), `valorTotalDiaria` diferente da soma das diárias, reserva de agência sem faturamento "empresa". O CRM deve tratar qualquer aviso como bug a corrigir.

## Regras e suposições do simulador

- **Status:** 1 Não confirmada (ao criar) → 2 Confirmada (ao lançar adiantamento) → 4 Check-in. 3 Cancelada e 5 No-show só pela equipe (`/_sim`). 0 Em andamento não é usado.
- **Vaga:** os status 0, 1, 2 e 4 ocupam vaga; 3 e 5 liberam. Manutenção ativa tira o apartamento do tipo.
- **Capacidade:** `quantidadeAdulto + quantidadeCrianca` (por apartamento) ≤ `maximoOcupantes` do tipo, no `Tarifario/Valor` e na reserva.
- **Preço:** sem `listaCategoriaHospede`, a `quantidadeCrianca` conta como **pagante**. Para cortesia (até 5 anos), use a categoria 4.
- **Regras do hotel que o simulador NÃO aplica**, porque provavelmente o Silbeck também não aplica: Cabana Casal e Tripla não aceitam menores de 5 anos; preço "nunca com desconto". **O CRM tem de validar isso sozinho.**
- **`valorTotalDiaria`** = soma das diárias de **um** apartamento; o `listaTotal.totalGeral` multiplica por `qtdeApartamento`.
- **`listaData`** é opcional no simulador (se faltar, ele calcula e avisa). O CRM deve **sempre** mandar, com os valores do `Tarifario/Valor` da mesma hora.
- **Datas:** só `yyyy-mm-dd`; `dataHora` sai como `yyyy-mm-dd hh:mm:ss`, no horário de Bonito (America/Campo_Grande). Período máximo por consulta: 366 dias.
- **`ListaReserva`** exige `dataInicial` e `dataFinal` mesmo com `idReserva`. É o comportamento mais restritivo, para o CRM não depender de um atalho que talvez não exista.

## Limitações e diferenças conhecidas em relação ao real

1. **Códigos de erro inventados.** O swagger não lista os códigos reais (`codigo` de `StatusCode400`). O CRM deve usar `mensagem` e `campoFoco` para mostrar e registrar o erro, **sem depender do texto de `codigo`**.
2. **Token inválido ou expirado → 401** com o corpo `erro`. O real pode responder 400, 401 ou 403, com outro corpo. O CRM deve tratar qualquer 401 ou 403 (e erros de autenticação vindos em 400) renovando o token **uma vez** e repetindo.
3. **Erro 500** imitando o DataSnap (`{"error": "..."}`). O formato real pode variar.
4. **Ocupação:** só o agrupamento geral; os filtros por UF, cidade, portal etc. são ignorados.
5. **ExtratoConta e Lancamento** usam lançamentos fixos; a API não lança consumo (nem no real).
6. **Um único tarifário de preço:** o `idTarifario` é guardado na reserva mas não muda o valor (o `Tarifario/Valor` não recebe `idTarifario` no swagger).
7. **Sem estadia mínima, sem bloqueio de datas, sem pacotes, sem moeda estrangeira, sem extras (`listaItemExtra` sempre vazio).**
8. **Sem HTTPS** (o real também é só HTTP, que no projeto passa por túnel/VPN) e **sem limite de requisições**.
9. **Alterações feitas pela equipe** não mudam a `dataHora` de cadastro; o simulador não tem "data de alteração", porque o swagger também não tem.
10. **Cadastro de hóspede:** o simulador cria um hóspede no cadastro para cada nome em `listaHospede`. Não sabemos se o real faz isso ou se procura um cadastro existente.

## Ambiguidades do swagger para confirmar com a Silbeck

1. **`expires_in: 30`**: minutos ou segundos? E o erro exato (status HTTP e corpo) de token ausente, inválido ou expirado.
2. **`DataFinal` da `Disponibilidade`**: é inclusiva? E o que vem com `DetalharDiaADia=false` (o simulador devolve uma linha com o pior dia)? `qtdeDisponivel` pode vir negativo em overbooking?
3. **`Tarifario/Valor`**: qual tarifário usa (não há `idTarifario` no corpo)? O `valor` já inclui taxa de serviço e ISS? Sem categorias, a criança conta como pagante? O endpoint recusa acima da capacidade?
4. **`POST /v1/reserva`**: `quantidadeAdulto`/`quantidadeCrianca` são **por apartamento** ou do item inteiro quando `qtdeApartamento > 1`? `valorTotalDiaria` é de um apartamento ou do item? `listaData` é obrigatória? A API **confere a vaga** e recusa (com qual erro), ou permite overbooking? `idTipoPensao` é texto no pedido e número em `listaData`: qual vale? O `id` da resposta é texto, e nos outros lugares é número.
5. **`idReservaPortal` × `IDReservaPortal`**: confirmar que é o **id do portal** ("CRM WhatsApp") e não um id da reserva no portal (a resposta tem também `idNoPortal`).
6. **`Adiantamento`**: numa reserva com **vários itens**, o adiantamento confirma só aquele item ou a reserva toda? O que significa `confirmado` (o adiantamento ou a reserva)? Há limite de parcelas? A bandeira tem de estar cadastrada? O NSU e a autorização não voltam na `ListaReserva`: como conferir depois?
7. **`ListaReserva`**: com `idReserva`, as datas continuam obrigatórias? O que é `ativo` (o simulador trata cancelada e no-show como inativas)? O filtro `status` age por reserva ou por item? `dataHora` vem só com a data ou com a hora? **Como saber que uma reserva foi alterada** (não há data de alteração)? Sem isso, o CRM precisa varrer por `tipoData=ocupacao` os próximos meses, além do `cadastro`.
8. **`FichaHospede`**: a descrição de `idReservaItemHospede` diz "campo 'id' do array 'listaReservaItem'" (id do item?), mas o nome indica o id do hóspede no item. O simulador aceita os dois: com o id do item, inclui um hóspede novo. O que a resposta 200 traz?
9. **Paginação** (`pagina`): começa em 0 ou 1? Como saber que acabou (o simulador devolve lista vazia)?
10. **Maiúsculas e minúsculas** nos caminhos e parâmetros (`DataFinal`, `/v1/reserva` em minúsculas): o real diferencia?
11. **Idempotência:** se a criação de reserva der timeout, como evitar duplicar? Sugestão para o CRM: mandar um identificador único no `voucher` (ex.: `CRM-<id do card>`) e, antes de repetir, procurar com `ListaReserva?tipoData=cadastro`. O teste 19 cobre esse caso.
12. **Check-in** antes da `dataEntrada` é permitido? E sem apartamento alocado?

## Estrutura

```
simulador-silbeck/
├── server.js            ponto de entrada (porta, host, arquivo de estado)
├── package.json         scripts start e test (sem dependências)
├── src/
│   ├── util.js          datas, dinheiro e formato de erro da Silbeck
│   ├── simulador.js     estado e regras (vaga, preço, reserva, adiantamento, FNRH, check-in, ocupação, ações da equipe)
│   └── servidor.js      HTTP: as 29 rotas da API, as rotas /_sim, falhas e avisos
├── dados/seed.json      dados iniciais fictícios
└── testes/fluxo.test.js testes automáticos (node:test)
```
