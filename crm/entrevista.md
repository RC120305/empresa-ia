# Entrevista do CRM: Hotel Cabanas

> Registro das respostas do dono para estruturar o CRM. Uma pergunta por vez; cada resposta vira fato do projeto.
> Início: 29/09/2026. Briefing de origem: dores (origem dos leads, métricas por canal, upsell e follow-up), sistemas (Silbeck PMS + motor + channel manager; Asksuite chatbot + CRM; RD Station Marketing; RD Advisor no marketing desde set/2024) e o princípio "o CRM não duplica o PMS" (cuida do antes e do depois da estadia; a chave de ligação é o telefone ou o e-mail do hóspede).

## Respostas

### P1. Qual número está na Asksuite e qual é o WhatsApp Business comum? (29/09/2026)
- **(67) 99110-7635:** número **oficial na Asksuite** (API da Meta).
- **(67) 99117-1648:** **WhatsApp Business comum**, fora da Asksuite.

**Consequência (achado da equipe):** o 99117-1648 é o número divulgado como "WhatsApp de reservas" em **todo o marketing**: botão de WhatsApp da Página do Facebook (número principal), anúncios do Meta, robô "comente RESERVA" (`wa.me/5567991171648`), legendas, banco de objeções, manual de voz e calendário. Ou seja, **o tráfego pago e o orgânico caem hoje no número sem funil e sem métrica**, e não só as agências, os hóspedes antigos e a recepção. O 99110-7635 aparece nos materiais só como "Telefone".
- O 3º número ligado à Página, (67) 8166-9955, ainda não tem papel definido.

### P2. Qual número vira a porta única de entrada? (29/09/2026)
**Decisão do dono:** a **Asksuite não será mantida**. Os **dois números** (99110-7635 e 99117-1648) serão **integrados ao CRM que vamos construir**.

**Consequências para o projeto (a validar nas próximas perguntas):**
- O CRM passa a ser também a **caixa de entrada do WhatsApp**, e não só o registro de leads. Isso exige a **API oficial do WhatsApp (Cloud API da Meta)** nos dois números.
- **99110-7635:** já está na API, via Asksuite. Precisa ser **migrado da Asksuite para a conta do hotel** (a Meta permite migrar o número entre provedores), sem perder o número.
- **99117-1648:** hoje é o app WhatsApp Business. Opção a checar: a **"coexistência"** da Meta, que liga o número à API e mantém o app no celular funcionando ao mesmo tempo (as mensagens chegam ao CRM e a recepção continua no celular). Confirmar se está disponível para o número antes de decidir.
- **O que a Asksuite faz hoje e precisa de substituto ou decisão:** o chatbot (atendimento automático fora do horário), o AskFlow (follow-up automático e instruções de check-in e check-out) e o módulo de atribuição (conversa → reserva no PMS).
- **Antes de cancelar:** exportar da Asksuite os contatos e o histórico de conversas (a base de hóspedes para recompra), e ver o prazo do contrato.

### P3. "Construir" = sistema próprio ou CRM pronto configurado? (29/09/2026)
**Decisão do dono: opção A, sistema sob medida, feito por nós** (app web próprio, ligado direto à API do WhatsApp e ao Silbeck).
- O hotel **não usa mais o RD Station** (corrige o briefing: não há integração Silbeck → RD em uso).
- **Novo escopo, pedido pelo dono:** um **agente de IA que responde o WhatsApp**, treinado para responder **como um humano** (natural, no tom da casa) e que **faz reservas** no Silbeck **via API**.

**Pontos de desenho que isso cria (propostas, a confirmar):**
- **Honestidade (Código de Cultura: Integridade e Transparência):** o agente escreve com naturalidade e no tom do Cabanas, mas **não se passa por pessoa**: se o hóspede perguntar se está falando com um robô, ele diz a verdade e oferece a equipe. As regras da Meta para o WhatsApp Business também pedem que o atendimento automatizado seja do próprio negócio e que haja caminho para um humano.
- **Reserva pelo agente:** depende de a Silbeck liberar uma **API de disponibilidade, tarifa e criação de reserva** (a confirmar). Pagamento: 50% antecipado; cartão (até 6x), débito ou depósito; sem boleto (`hotel-operacional.md`).
- **Limites do agente:** não dá desconto (só o dono), não promete o que o hotel não entrega, passa para a equipe os casos sensíveis (reclamação, grupo grande, agência, exceção de política).
- O agente é um novo "funcionário" de IA: o cargo passa pela RH e pela aprovação do dono (regra do `CLAUDE.md`).

### P4. Situação da API da Silbeck (29/09/2026)
- Dono **concorda** com as regras do agente (tom humano sem se passar por pessoa; limites claros; sem desconto).
- O hotel **tem a documentação completa**: https://developers.silbeck.com.br/api/hotel/v1/ (o domínio está bloqueado na rede deste ambiente; liberar para a equipe ler).
- O hotel **tem credenciais JWT** (client ID e secret). ⚠️ **Não ficam registradas no repositório**; vão só nas configurações seguras do ambiente/servidor. Como foram coladas no chat, recomenda-se **pedir à Silbeck a troca do client secret**.
- Fluxo informado: `POST .../datasnap/rest/v1/liberar?client_id=...&client_secret=...` → `access_token` (Bearer, `expires_in: 30`) → `GET .../datasnap/rest/v1/Ocupacao?dataInicial=AAAA-MM-DD&dataFinal=AAAA-MM-DD`.

**Achados técnicos:**
- O endereço é **192.168.132.242:8366**, um **IP de rede interna** (DataSnap, servidor local). Um CRM na nuvem **não alcança** esse endereço sem uma ponte: VPN/túnel, um conector instalado num computador do hotel, ou um endereço público fornecido pela Silbeck.
- O exemplo usa **HTTP sem criptografia** e passa o secret na URL: aceitável só dentro da rede local; na ponte com a nuvem, tudo precisa ir criptografado.
- "Endpoint liberado" sugere que cada endpoint é liberado individualmente: confirmar se disponibilidade, tarifas e **criação de reserva** estão liberados, além de "Ocupacao".
- `expires_in: 30`: confirmar a unidade (segundos ou minutos); o CRM renova o token a cada chamada ou antes de expirar.

### P5. Servidor do Silbeck e TI (29/09/2026)
- **Sim:** o Silbeck roda num servidor **dentro do hotel** (ligado 24h, a confirmar com o Márcio).
- **TI:** o hotel tem um responsável de TI próprio, o **Márcio**. Ele é o contato para montar a ponte segura entre o servidor local da Silbeck e o CRM na nuvem (VPN/túnel ou conector local), confirmar a unidade do `expires_in` e quais endpoints estão liberados.
- Documentação da Silbeck: o dono vai liberar `developers.silbeck.com.br` na rede do ambiente (ainda bloqueado em 29/09).

### P6. Quem atende o WhatsApp hoje (29/09/2026)
- **Normalmente uma pessoa só: Jagles**, nos dois números.
- Consequência: a caixa de entrada precisa ser simples para uma pessoa só (tudo numa fila, com prioridade), e o agente de IA tira dela o volume repetitivo (preço, datas, "o que está incluso") e passa só o que precisa de gente.
- Horários de atendimento e quem cobre fora deles: pergunta seguinte.
- **Correção do dono (29/09/2026):** o **99110-7635 (Asksuite)** é atendido pelo **chatbot da Asksuite**; **Jagles acompanha e intervém** quando precisa. É exatamente o modelo que o agente do CRM vai substituir: **o agente atende, Jagles supervisiona e assume**.
- O histórico de conversas da Asksuite é a melhor base para treinar o agente (perguntas reais, respostas que funcionaram, pontos em que Jagles precisou intervir): **exportar antes de cancelar**.

### P7. Quem responde o 99117-1648 (WhatsApp Business) (29/09/2026)
- **Respondido manualmente**: por Jagles e, quando Jagles não está, **por outras pessoas da equipe** (mesmo aparelho/app).
- Consequência: a caixa de entrada do CRM precisa de **vários usuários** (cada um com seu login), com registro de **quem respondeu** cada conversa e passagem de turno sem perder o fio.

### P8. A origem do hóspede é registrada hoje? (29/09/2026)
- **Hoje não se registra** a origem, e o dono **quer passar a ter**.
- O **Silbeck tem um campo de origem** na reserva (nome exato do campo e se aparece na API: a confirmar na documentação).
- Direção: o CRM descobre a origem na conversa (automaticamente quando possível) e **grava no campo de origem do Silbeck** ao criar a reserva; o faturamento por origem sai do Silbeck.

### P9. Lista de canais de entrada e origens reais (29/09/2026)
**Aprovada pelo dono como está.**
- **Canal de entrada:** WhatsApp 99110 · WhatsApp 99117 · telefone · motor de reservas (site) · Booking · Airbnb · Expedia · Decolar · agência/operadora · direct do Instagram · e-mail.
- **Origem real → como é descoberta:** Anúncio Meta (qual campanha; automático pelo dado de referência do anúncio de clique para WhatsApp) · Instagram orgânico (mensagem pronta do link e robô de comentários) · Google busca/Maps/Hotel (links com UTM; senão o agente pergunta) · Site (botão de WhatsApp com rastreamento) · Hóspede que volta (automático: telefone já no histórico do Silbeck) · Indicação, de quem (o agente pergunta) · Agência X / operadora X (número cadastrado) · OTA (canal da reserva no Silbeck).

### P10. Métricas e quem acompanha (29/09/2026)
- **Métricas aprovadas:** leads por origem · conversão por origem · faturamento e diária média por origem (Silbeck) · reserva direta × OTA (e comissão poupada) · noites de domingo a quinta por origem · motivo de perda · atendimento (tempo de 1ª resposta; resolvido pelo agente × passado para humano).
- **Quem vê o painel:** o dono, **Renata**, **Jagles** e **Márcio**.
- Frequência: não definida; proposta: painel ao vivo no CRM + resumo semanal automático (segunda de manhã) e fechamento mensal.

### P11. Upsell: o que vender, prioridades e regras (29/09/2026)
- **Métricas:** o painel precisa de **filtro por data** (período livre) em todos os indicadores.
- **Preços atualizados:** boia cross **R$ 100** · arvorismo **R$ 120** · **combo boia cross + arvorismo R$ 170** (por pessoa). Atualizado em `contexto/hotel-operacional.md`.
- **Prioridade de venda:** **boia cross e arvorismo** (e o combo).
- **Piquenique Sunset: retirado** da oferta. ⚠️ Ainda aparece no conteúdo de outubro (`social/conteudo/2026-10/conteudo.md`, linha ~444) e no anúncio P02 do plano de mídia (`textos-v3.md`): corrigir antes de publicar/subir.
- **Massagem:** pode ser vendida **antecipadamente**; o hóspede escolhe **um tipo avulso** ou **monta um pacote**. Serviço terceirizado: o CRM tenta **integrar ao sistema de agenda do terceiro**; se não houver integração, gera uma **tarefa para a equipe agendar manualmente** e confirmar ao hóspede.
- **Decoração especial:** só com **no mínimo 3 dias de antecedência** do check-in (tempo para encomendar os itens). O agente não oferece se faltarem menos de 3 dias.
- Flutuação (R$ 100) e upgrade/noite extra: seguem como upsell, sem prioridade definida.

### P12. Follow-up de quem pediu preço e sumiu (29/09/2026)
**Decisão do dono: no máximo 2 tentativas** (cada disparo fora da janela é pago à Meta).
1. **1ª tentativa: dentro da janela de 24 horas** da última mensagem do cliente. Dentro da janela a mensagem é livre (texto do agente, sem modelo aprovado) e **não é cobrada** como disparo de marketing.
2. **2ª tentativa: 3 dias depois**, já fora da janela: exige **modelo (template) aprovado pela Meta**, categoria marketing (**pago**). Vai com **imagem convidativa escolhida pelo perfil do lead**. Ex.: casal → foto de casal na hidromassagem; família → crianças na boia cross ou no rio; 55+ → deck e rede à beira do rio.
3. **Depois disso, para.** Marca como "perdido" com o motivo e guarda o contato para campanhas futuras (só com consentimento).

**Consequências:**
- O agente precisa **classificar o perfil do lead** na conversa (casal, família, grupo de amigos, 55+, observador de aves etc.; personas de `hotel-cabanas.md`).
- Um **kit de modelos de follow-up por persona** (texto do Marketing + foto real do banco de imagens escolhida pelo Designer), submetido à Meta com antecedência. Só fotos reais do banco.
- O painel mostra o **custo dos disparos** e quantas reservas vieram do follow-up.

### P13. O que o agente pode oferecer para fechar; comando do agente; perfil do lead (29/09/2026)
- **Sem descontos.** O hotel não trabalha com desconto; o agente usa só o argumento de sempre ("valores com desconto para quem reserva direto" é o preço do canal direto, não uma oferta) e o valor do que está incluso.
- **Biblioteca de mensagens editável:** um lugar no CRM onde a equipe **cadastra e edita as mensagens** (follow-up, ofertas de upsell, respostas padrão) que o agente dispara **quando estiver no comando**. Nada fica "escondido" no código.
- **Liga/desliga do agente:**
  - **manual**, a qualquer momento, por qualquer usuário autorizado (por conversa e geral);
  - **por horários pré-definidos** em que o agente assume sozinho (ex.: noite, madrugada, fim de semana).
  - Quando o agente está desligado, a conversa fica com a equipe; quando uma pessoa assume uma conversa, o agente não interfere nela.
- **Identificação automática do perfil pela fala do cliente:** "somos em 2", "eu e minha esposa/namorado" → **casal**; "2 adultos e 2 crianças", idades → **família com filhos**; "vamos em 6", "turma" → **grupo**; menções a idade 55+, aves, bike, sustentabilidade → personas específicas. O perfil fica no cadastro do lead (editável pela equipe) e alimenta a acomodação sugerida, o upsell e a imagem do follow-up.

### P14. Horário do agente, banco de argumentos e nível de atendimento (29/09/2026)
- **Horário padrão do agente sozinho: das 17h às 7h30** do dia seguinte. Das 7h30 às 17h a equipe atende (o agente pode sugerir respostas). O liga/desliga manual continua valendo.
- **Desejo do dono:** que o agente atenda **tudo**, mas com o receio de ele não atender tão bem quanto uma pessoa.
- **Banco de argumentos do agente:** quebra de objeções e argumentos de **custo-benefício** (o que está incluso na diária, atividades dentro do hotel, dois rios, notas públicas com fonte). Ponto de partida: `marketing/2026-09-banco-de-objecoes.md` (13 objeções, rascunho do Marketing); precisa de revisão (preços novos, sem piquenique) e aprovação do dono antes de virar base do agente. Fica editável na biblioteca do CRM.
- **Histórico de conversas** para o agente se balizar: sim. Uso proposto: exemplos de **tom e de perguntas reais**, não fonte de fatos (preços e regras antigos ficam de fora). Dados pessoais retirados antes (LGPD).

**Proposta de implantação gradual (resposta ao receio):**
1. **Treino (2 a 4 semanas):** o agente escreve a resposta, Jagles aprova/edita antes de sair. O CRM mede quantas saíram sem edição.
2. **Noite (17h–7h30):** o agente responde sozinho no horário definido; Jagles revisa as conversas da noite de manhã.
3. **Dia inteiro:** só quando as metas forem batidas (ex.: 90% das respostas sem edição, nenhuma informação errada, conversão igual ou maior que a humana). O dono decide cada passo.
- Regras permanentes: responde só com fatos da base (se não sabe, diz que vai confirmar e passa para a equipe); reclamação, grupo, agência e exceções vão para uma pessoa.

### P15. Histórico para treinar o agente e aprovação das respostas (29/09/2026)
- **Asksuite (99110):** o dono não sabe se consegue exportar (citou "Silbeck"; entender como Asksuite). **A verificar** com a Asksuite antes de cancelar.
- **WhatsApp Business (99117):** **dá para exportar** as conversas (uma a uma pelo app). Pedido: 30 a 50 conversas boas, que viraram reserva.
- **Meta de 90% de acerto: aprovada** como critério para o agente ganhar autonomia.
- **Aceite prático das respostas (pedido do dono):** na conversa, a resposta sugerida pelo agente aparece com **3 botões**: **✅ Enviar** (conta como acerto) · **✏️ Editar e enviar** (conta como correção; o CRM guarda o antes e o depois para o agente aprender) · **❌ Descartar** (com motivo de 1 toque: informação errada, tom, faltou vender, outro). Funciona no celular. Para as conversas da noite, uma tela de **revisão da manhã** com 👍/👎 por resposta. O painel mostra a % de acerto da semana.

### P16. Agências, Booking e reservas diretas (29/09/2026)
- **Agências e operadoras:** contato por **e-mail e WhatsApp**; têm **comissão de venda**; representam **menos de 10%** das vendas.
- **Booking:** cerca de **20% a 25%** das vendas.
- **Reservas diretas por WhatsApp** (pelos diferentes canais de origem): o restante, cerca de **65% a 70%**.

**Consequências:**
- O **WhatsApp é o coração do CRM**: é onde está a maior parte da venda, e é onde o agente mais faz diferença.
- **Agências:** cadastro de agência (contatos, comissão, reservas) e conversa sempre com a equipe (o agente não negocia com agência). O **e-mail** entra como canal: avaliar trazer a caixa de reservas para dentro do CRM (fase posterior).
- **Booking (20–25%, com comissão):** a maior oportunidade de margem é o **pós-estadia**: converter o hóspede que veio pelo Booking em **reserva direta na próxima vez** (dentro das regras da Booking e só com consentimento do hóspede).

### P17. Pós-estadia e pré-chegada (29/09/2026)
- **Pós-estadia: fazer tudo** (organizar como disparos programados): pedido de avaliação (Google/TripAdvisor, só para satisfeitos) · NPS (nota baixa vira alerta) · convite para voltar (baixa temporada e domingo a quinta, foco no hóspede de MS) · converter o hóspede do Booking em reserva direta.
- **Pré-chegada: necessário.** Hoje o hotel envia um **link de pré-check-in**, **localização/como chegar** e **o que trazer**.
- **Pedido do dono:** um **lugar para cadastrar todos os tipos de mensagem** e **configurar o momento de envio** de cada uma.

**Desenho: "Régua de mensagens" (tela do CRM)** — cada mensagem cadastrada tem:
- **Gatilho/momento:** evento da reserva no Silbeck (reserva confirmada, X dias antes do check-in, dia do check-in, check-out, X dias depois do check-out) ou evento do lead (sem resposta há X horas/dias).
- **Público:** filtros por perfil (casal, família...), origem (Booking, direto, agência), estado (MS/fora), acomodação.
- **Conteúdo:** texto com campos automáticos (nome, datas, acomodação), imagem/link opcional; número de envio (99110 ou 99117).
- **Tipo na Meta:** utilidade (pré-check-in, instruções: mais barato) ou marketing (convite para voltar, follow-up: mais caro e exige consentimento); o CRM mostra o status de aprovação do modelo na Meta.
- **Liga/desliga** por mensagem, e o painel mostra envios, custo, respostas e reservas geradas.

**Régua inicial proposta (a validar):** reserva confirmada → boas-vindas + resumo · 7 dias antes → link de pré-check-in · 3 dias antes → como chegar + o que trazer + oferta de boia cross/arvorismo/combo (decoração só até 3 dias antes) · check-out + 1 dia → NPS · nota alta → pedido de avaliação · 30–60 dias depois → convite para voltar (baixa/dom–qui) · hóspede Booking → "na próxima, reserve direto".

### P18. Ordem das fases e identidade visual (29/09/2026)
- **Ordem aprovada:** (1) caixa de entrada única com os 2 números, origem e funil → (2) agente em modo treino (✅ ✏️ ❌) + painel de métricas → (3) integração Silbeck (disponibilidade e reserva) + régua de mensagens → (4) agente sozinho à noite (17h–7h30) após os 90%.
- **Antes do layout:** usar a identidade visual do hotel. Ela já existe para o Instagram (`contexto/marca/identidade.md`); o **Designer de Criativos** foi acionado para estendê-la à interface do sistema (`crm/identidade-ui.md` e `crm/tokens.css`).
- **Prazo:** não há data de saída da Asksuite definida; **há tempo para trabalhar**. A Asksuite segue ativa até o CRM passar pelos testes (sem corrida; migração do 99110 só no fim).

### P19. Direct do Instagram e Messenger na caixa de entrada (29/09/2026)
- **Sim, já na fase 1**: a caixa de entrada única recebe **WhatsApp 99110 + WhatsApp 99117 + direct do Instagram + Messenger do Facebook**, com origem, funil e agente.
- Base técnica: a chave da Meta do hotel já tem `instagram_manage_messages` (direct listado em 28/09); falta assinar os webhooks de mensagens da Página/Instagram. O Messenger usa a mesma Página (158244147578036).
- Regra das duas plataformas: resposta livre dentro de 24 horas da última mensagem do cliente; fora disso, só nos casos permitidos pela Meta (o agente não "persegue" o cliente pelo direct).
- Identidade única: a mesma pessoa pode falar pelo direct e depois pelo WhatsApp; o CRM tenta juntar os contatos (pelo telefone informado na conversa) para não duplicar o lead e não perder a origem.

### P20. Custo mensal (29/09/2026)
- A **Asksuite custa cerca de R$ 800/mês** hoje. É o parâmetro de comparação: o custo mensal do CRM (servidor + banco + mensagens pagas da Meta + uso da IA) deve ficar **nessa faixa ou abaixo**, e o painel mostra o custo real do mês.
- Pedido do dono: um **exemplo visual do layout** para visualizar (protótipo estático com a identidade de `crm/identidade-ui.md`).
