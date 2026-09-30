# API REST do SB Hotel: detalhes dos endpoints (prints da documentação)

> Fonte: prints do Swagger enviados pelo dono (30/09/2026). Especificação **OpenAPI 3 (OAS3), versão 1.0.1**, arquivo `swagger.yaml`.
> Servidor de exemplo da documentação: `http://cloud.silbeck.com.br:30503/datasnap/rest` (nuvem da Silbeck). O do hotel é o local `http://192.168.132.242:8366/datasnap/rest`.
> Respostas padrão: **200 Sucesso** / **400 Erro**.

## Geral
### POST /v1/Liberar (token)
- Parâmetros **na query**: `client_id` (obrigatório), `client_secret` (obrigatório). O Pedro citou autenticação básica; testar os dois jeitos.
- Resposta: `{ "access_token": string, "token_type": string, "expires_in": int }`. `expires_in` = 30 (unidade a confirmar).

## Cadastros
### PUT /v1/Apartamento/Limpeza
- Corpo: `{ "codigo": string, "limpeza": bool }`. Altera o status de limpeza do apartamento. Sem uso no CRM.

### GET /v1/TipoApartamento
- Sem parâmetros. Resposta: `listaTipoApartamento[]`: `id`, `codigo`, `nome`, `quantidade`, `maximoOcupantes`.
- **Uso:** montar o catálogo de acomodações do orçamento (código, quantidade de unidades e capacidade máxima). **Não traz fotos nem descrição**: fotos vêm do banco de imagens (plano B confirmado).

### GET /v1/Produto
- Sem parâmetros. Resposta: `listaProduto[]`: `id`, `codigo`, `nome`. **Não traz preço**: o preço dos produtos (boia cross, arvorismo, combo) fica no catálogo do CRM.

### GET /v1/Insumo
- Sem parâmetros. `listaInsumo[]`: `id`, `codigo`, `nome`. Sem uso no CRM.

## A detalhar (próximos prints)
Ocupacao, Disponibilidade, Tarifario/Valor, ListaEstadia, Lancamento, FichaHospede, ExtratoConta, MapaApartamento, Fechadura/Senha e Checkin, Apartamento, Setor, TipoPensao, Empresa, Hospede, Tarifario, ListaReserva, POST reserva, reserva/checkin, Adiantamento.
