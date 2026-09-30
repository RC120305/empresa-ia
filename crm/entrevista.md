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
- **Protótipo visual v1** (29/09/2026): `crm/prototipo/crm-cabanas.html`, publicado em https://claude.ai/artifact/6Pz2wqMU9oJQYJZZVCN2Uh (privado). Telas: Conversas (resposta sugerida com ✅ ✏️ ❌, ficha do lead com perfil detectado e oferta prioritária), Funil, Painel (filtro por data, resultado por origem, direta × OTA, noites por dia, motivos de perda, acerto do agente, custo × R$ 800) e Régua de mensagens. Dados fictícios.

### P21. Ajustes após o protótipo v1 (29/09/2026)
- **Cor do agente:** o dono **não gostou do azul (índigo)** nos balões do agente. Trocar por uma cor da paleta da marca: **verde folha suave** (balão `#EEF3E1`, texto/rótulo `#5A7026`; no escuro, `#90AB49`). A mensagem da equipe continua no marrom suave.
- **Fluxo do agente muda:** o agente **responde direto, sem esperar aprovação** (senão a conversa trava e alguém precisa ficar vigiando). A revisão é **depois**, numa aba própria.
  - Substitui o "modo treino com aprovação antes de enviar" (P14/P15). A meta de **90% de acerto** continua, medida pelas revisões feitas depois.
  - Mitigação do risco de responder ao vivo: responder só com a fonte de conhecimento; se não souber, dizer que vai confirmar e passar para a equipe; casos sensíveis vão para uma pessoa; horários do agente configuráveis (padrão 17h–7h30, com o dono podendo ampliar).
- **Nova aba "Ajustes do agente"** com:
  1. **Revisão de conversas:** escolher uma conversa atendida pelo agente e, em cada resposta, **✅ Aprovar · ✏️ Corrigir · ❌ Reprovar** (com motivo). A resposta corrigida vira **resposta de referência** e é **incorporada** ao agente para as próximas conversas.
  2. **Fonte de conhecimento:** lugar para **subir material de apoio** (arquivos, textos e links) e ir incluindo, organizado por tema: política de cancelamento, horários de funcionamento, atividades oferecidas, link do cardápio, link de localização, distâncias entre cidades, passeios de Bonito, transporte etc. Cada item mostra quem incluiu, a data e se está em uso. Ponto de partida: os arquivos que a equipe já mantém (`contexto/hotel-operacional.md`, `contexto/destino-bonito.md`, `marketing/2026-09-banco-de-objecoes.md` depois de revisado).
  3. **Regras do agente:** horários, liga/desliga e o que sempre vai para uma pessoa.

### P22. O protótipo não é final; observações do Funil (29/09/2026)
- Esclarecido ao dono: o protótipo é **rascunho visual** (nada ligado ao WhatsApp nem ao Silbeck). Caminho: protótipo → especificação → construção por fases → testes → saída da Asksuite.
- **Funil: o dono sentiu falta de muita coisa.** Pedidos:
  - **Clicar no card abre a ficha completa do cliente** numa área própria (painel/aba), com **edição dos dados** do cliente.
  - **Agendar atividades/tarefas** no lead (ex.: ligar, enviar proposta, lembrete de follow-up).
  - **Trocar o responsável** (qual usuário assume o lead).
  - **Mudar a etapa dentro do card**, e o card **se move sozinho** para a coluna nova.
  - **Arrastar e soltar** os cards com o mouse entre as etapas.
- Não estava previsto no protótipo v1/v2 (a ficha existia só na tela de Conversas). Para não depender da memória do dono, a equipe montou a lista completa de funcionalidades em `crm/funcionalidades.md` para ele marcar.

### P23. Banco de imagens e vídeos na fonte de conhecimento (29/09/2026)
- **Pedido do dono:** a fonte de conhecimento precisa de um **banco de imagens e vídeos para enviar aos clientes**.
- **Base que já existe:** as pastas do Google Drive "Imagens do hotel cabanas" (por acomodação, atividade, infraestrutura, café) e "Vídeos do hotel cabanas" (mapa em `contexto/banco-de-imagens.md`). Só fotos e vídeos reais, todos autorizados.
- **Desenho proposto:**
  - Importar do Drive para o CRM, organizado pelas mesmas pastas, com **etiquetas** (acomodação, atividade, perfil: casal, família, 55+) e uma **descrição da cena** (os nomes dos arquivos hoje não dizem o que aparece).
  - **Envio manual:** na conversa, botão "Enviar foto/vídeo do banco" com busca por etiqueta.
  - **Envio pelo agente:** quando o cliente pergunta de uma acomodação ou atividade, o agente envia 2 ou 3 fotos certas (ex.: pergunta da Cabana Master → fotos da Master). Também alimenta a 2ª tentativa do follow-up (foto por perfil).
  - Marcar as mídias **favoritas** por tema, para o agente usar primeiro; e poder desativar uma mídia sem apagar.
  - Limites do WhatsApp: vídeo até **16 MB** e imagem até **5 MB** por envio; o CRM guarda uma versão leve de cada vídeo para envio.

### P24. Banco de dados e hospedagem (29/09/2026)
- **Recomendação da equipe:** banco **PostgreSQL no Supabase** (região São Paulo) + aplicativo na **Vercel** (região São Paulo) + **ponte com o Silbeck** por um conector no hotel que só faz conexões de saída (ex.: Cloudflare Tunnel, sem abrir portas). App web instalável no celular (sem loja). Endereço sugerido: `crm.hotelcabanas.com.br`.
- Custo estimado da infraestrutura: Supabase Pro ~US$ 25 + Vercel Pro ~US$ 20 ≈ R$ 250/mês (confirmar preços atuais); sobra ~R$ 550 do teto de R$ 800 para Meta e IA.
- O banco do CRM **não substitui o Silbeck**: guarda o vínculo com a reserva e os números do painel.
- **O dono já tem conta no Supabase.** Recomendação: criar um **projeto novo e exclusivo** para o CRM, na **região São Paulo** (a região não muda depois de criado). Chaves e senhas **nunca no chat**: vão direto nas configurações seguras.

### P25. Decisão de infraestrutura (29/09/2026)
**Decisão do dono: Supabase + Google Cloud Run.**
- **Aplicativo, recebimento de mensagens da Meta e agente:** **Google Cloud Run**, região **São Paulo** (`southamerica-east1`). O dono tem **Google AI Ultra**, que inclui **US$ 100/mês em créditos do Google Cloud** (benefício do Google Developer Program, ativar no painel do programa); o Cloud Run do CRM deve ficar coberto pelos créditos. O projeto do Google Cloud exige conta de faturamento com cartão.
- **Banco, login, arquivos (banco de imagens e vídeos) e tempo real:** **Supabase** (PostgreSQL + pgvector), projeto novo e exclusivo, região **São Paulo**; plano gratuito para construir, **Pro (~US$ 25/mês)** antes de ir para produção. O dono já tem conta.
- **Ponte com o Silbeck:** conector no hotel só com conexões de saída (ex.: Cloudflare Tunnel), montado pelo Márcio.
- Alternativas avaliadas e descartadas: Vercel, Railway, Render, Netlify, Cloudflare (tudo), Cloud SQL e Firestore (relatórios exigiriam BigQuery como peça extra).
- Custo estimado da infraestrutura: **~US$ 25/mês (~R$ 140)**; o resto do teto de R$ 800 fica para mensagens da Meta e IA do agente.
- **Pendente:** o projeto do Google Cloud fica na conta pessoal do Ultra ou numa conta do hotel (recomendação: conta do hotel, com dono, Renata e Márcio como administradores; os créditos do Ultra só valem na conta do assinante).
- **Página de validação** (29/09/2026): `crm/prototipo/validacao-funcionalidades.html`, publicada em https://claude.ai/artifact/Su6tvj37TXkJ4wjoievfSq. O dono marca Mantém/Corta/Muda + comentário em cada item e adiciona o que falta; as respostas ficam no banco da página (coleções `respostas` e `faltas`) e a equipe lê de lá.

### P26. Validação da lista de funcionalidades (29/09/2026)
Respostas lidas da página de validação: **62 de 62 itens avaliados** — **61 mantidos**, **1 cortado** (1.12, funis separados); nenhum item novo em "O que está faltando".
Comentários do dono:
- **1.6** Integração pela API: quando o usuário faz a reserva no Silbeck, o sistema busca os dados e **concilia com o lead do CRM**.
- **5.2** Fonte de conhecimento: **todos os campos editáveis**, poder **acrescentar informações dentro de cada tema** e **criar novos temas**.
- **5.5** Reserva pelo agente: "via a[PI]" (comentário cortado; entendido como via API da Silbeck).
- **7.2** Régua: **cada mensagem com seu campo de edição** e possibilidade de **cadastrar outras** (comentário cortado no fim).
Próximo passo: protótipo v3 com a lista validada (funil completo com arrastar e soltar, ficha do cliente, tarefas, etc.).
- **Protótipo v3** (29/09/2026), mesmo link: Funil com arrastar e soltar, etapa mudada no card, motivo obrigatório ao ir para Perdido, busca e filtros, alerta de lead parado, soma por coluna, "Novo lead"; **ficha do cliente** em gaveta com abas Dados (tudo editável, inclusive responsável), Atividades (agendar com tipo, data e responsável) e Histórico; aba **Tarefas** (atrasadas, hoje, próximas); **fonte de conhecimento editável** (editar/excluir itens, adicionar informação no tema, criar e renomear temas); **régua editável** (editar cada mensagem e criar novas).

### P27. Análise crítica pedida pelo dono (29/09/2026)
- A equipe fez a análise crítica do CRM v3: `crm/analise-critica.md` (18 pontos: venda e receita, operação, riscos, implantação). Aguardando o dono escolher o que entra.
- Página para aprovar a análise crítica: `crm/prototipo/analise-critica.html`, publicada em https://claude.ai/artifact/Ddk3P3MPsVBMRHugViZU5g (botões Aprova/Reprova/Ajusta + observação; gravados internamente como mantem/corta/muda nas coleções `respostas` e `faltas`).

### P28. Resultado da análise crítica (29/09/2026)
Lido da página de aprovação: **18 de 18 avaliados — 14 aprovados, 4 com "Ajusta"** (A1, A7, B1, B2), nenhum reprovado, nada acrescentado.
- **Aprovados:** A2, A3, A4, A5, A6, A8, B3, B4, C1, C2, C3, C4, D1, D2.
- **A1 (Aguardando pagamento):** o hotel **lança o pagamento da reserva no Silbeck**; hoje os **links de pagamento são feitos à mão**. Pergunta do dono: dá para automatizar os links com segurança e **lançar o pagamento na conta do cliente no Silbeck pela API**? → respondido no chat (P29); depende da documentação da Silbeck.
- **A2 (orçamento):** puxar do **motor de reservas do Silbeck**, que já tem os apartamentos, os valores e as imagens. Checar na documentação da Silbeck.
- **A3 (lista de espera):** aprovado; exige acesso prático ao **mapa de vagas** (A4).
- **A7, B1, B2:** o dono pediu **explicação com exemplos** antes de decidir.

### P29. Tentativa de ler a documentação da Silbeck (29/09/2026)
- A rede do ambiente já alcança o domínio, mas o site `developers.silbeck.com.br` fica atrás do **Cloudflare, que bloqueia acesso vindo de servidores de nuvem** (HTTP 403 "Attention Required"), inclusive por navegador automatizado e pela busca. Não é problema de permissão do ambiente.
- Alternativas pedidas ao dono: salvar a documentação em PDF no PC (Ctrl+P → Salvar como PDF) e colocar no Google Drive ou anexar no chat; ou pedir à Silbeck o arquivo Swagger/OpenAPI ou a coleção do Postman.
- **Perguntas a responder com a documentação:** (1) disponibilidade por data e tipo de acomodação; (2) tarifas por data/ocupação; (3) cadastro de acomodações com fotos (motor); (4) criar, consultar, alterar e cancelar reserva; (5) consultar reserva por telefone/e-mail do hóspede (conciliação com o lead); (6) lançar pagamento/sinal na conta do cliente; (7) status do hóspede (hospedado, check-in, check-out); (8) campo de origem/segmento da reserva; (9) avisos automáticos (webhooks) ou só consulta periódica; (10) histórico de hóspedes para importação; (11) link do motor com datas e acomodação preenchidas e se o motor cobra só o sinal; (12) unidade do `expires_in` e quais endpoints estão liberados para o hotel.

### P30. Prints da documentação da Silbeck (29/09/2026)
- O dono enviou os prints com a **lista de endpoints** (Geral, Cadastros, Reserva). Mapa completo e lacunas em `crm/silbeck-api.md`.
- Destaques: existe `POST /v1/reserva` (o agente pode reservar), `POST /v1/Adiantamento` (lançar o sinal na conta do cliente: responde ao A1), `GET /v1/Disponibilidade`, `POST /v1/Tarifario/Valor`, `GET /v1/ListaReserva`, `GET /v1/ListaEstadia`, `GET /v1/Hospede`, `POST /v1/FichaHospede` (pré-check-in) e `GET /v1/ExtratoConta`.
- Lacunas: sem endpoint visível de cancelar/alterar reserva e sem webhooks (o CRM consulta periodicamente); link de pagamento vem de uma empresa de pagamentos, não da Silbeck.
- Pendente: prints dos detalhes (parâmetros e respostas) dos 9 endpoints prioritários.

### P31. Pagamentos hoje e automação do Pix (29/09/2026)
**Como é hoje (dono):**
- **Motor de reservas da Silbeck:** o **cartão** é cobrado no fim da compra e a reserva já cai **confirmada** (só falha se o cartão não passar). No **Pix**, o motor gera QR code e copia-e-cola, mas **não confirma sozinho**: a equipe entra no **Banco do Brasil**, confere e só então confirma no Silbeck (e na planilha).
- **Venda pelo WhatsApp:** **tudo manual**: a equipe envia a chave Pix ou um link de pagamento e depois confere no banco.
- **Pedido do dono:** automatizar dentro do CRM, usando a **API Pix do Banco do Brasil** (portal developers do BB) para confirmar a entrada.

**Desenho proposto:**
1. **Pix pelo WhatsApp (automático):** o CRM gera uma **cobrança Pix dinâmica no BB** (valor exato do sinal, identificador único ligado ao lead, validade ex. 24 h) → envia QR + copia-e-cola → o BB avisa o CRM quando o Pix cai (webhook, ou consulta a cada poucos minutos) → o CRM cria/atualiza a reserva no Silbeck (`POST reserva` + `POST Adiantamento`) → confirma ao cliente pelo WhatsApp → card vai para **Reservado**. Sem conferência manual e sem confusão de "de quem é este Pix".
2. **Cartão pelo WhatsApp:** enviar o **link do motor da Silbeck** (já cobra e confirma sozinho). Verificar se o motor aceita link com datas e acomodação preenchidas.
3. **Pix do motor (bônus):** o CRM lê os Pix recebidos no BB e **sugere o casamento** com as reservas do motor pendentes (valor, data, nome); a equipe confirma com 1 clique.
- **Segurança:** o acesso do CRM ao BB fica **só com permissão de criar cobranças e ler Pix recebidos**, **nunca de enviar dinheiro**. Credenciais e certificado digital guardados no cofre de segredos do Cloud Run, nunca no chat nem no repositório.
- **A verificar com o BB (gerente PJ + Márcio):** cadastro no portal developers, aplicação da API Pix em produção, **certificado digital** exigido pelo BB, tarifa por Pix recebido/cobrança, e se a chave Pix do hotel é da conta BB.

### P32. Link de pagamento pela Cielo (29/09/2026)
- **Pedido do dono:** quando o cliente quiser pagar por **link**, integrar a **Cielo** para o CRM gerar o link.
- **Desenho:** a Cielo tem **API de Link de Pagamento** (a confirmar com a Cielo se o contrato do hotel inclui o e-commerce/link). O CRM cria o link com o valor do sinal (ou total), descrição da reserva, **parcelamento até 6x** (regra do hotel) e validade → envia no WhatsApp → a Cielo avisa o CRM quando o pagamento é aprovado (URL de notificação) → o CRM lança o **Adiantamento no Silbeck**, confirma ao cliente e move o card para **Reservado**. Pagamento recusado: o CRM avisa a equipe e o agente oferece Pix.
- Dados do cartão **nunca** passam pelo CRM (página da própria Cielo). Credenciais da Cielo no cofre de segredos.
- Com isso, pelo WhatsApp o cliente escolhe: **Pix (API do BB)** ou **cartão por link (Cielo)**; o link do motor da Silbeck fica como alternativa.
- **A verificar com a Cielo:** se o link de pagamento/e-commerce está habilitado no contrato, credenciais de API, taxas do link × maquininha, parcelamento e prazo de recebimento.
- **Confirmado pelo dono (29/09/2026):** o **link de pagamento da Cielo já está habilitado** e é usado **todos os dias, de forma manual**. O dono **sabe gerar as credenciais no portal developer da Cielo**; elas serão cadastradas direto no cofre de segredos na fase de construção (nunca no chat).

### P33. Reservas que chegam pelo motor da Silbeck (29/09/2026)
- Lembrete do dono: reservas também chegam **direto pelo motor da Silbeck**, com pagamento **no próprio motor** (cartão confirma na hora; Pix gera QR e fica pendente). O CRM precisa **sincronizar** e mostrar o lead como **pago** ou **pendente de pagamento**.
**Desenho da sincronização:**
1. **Leitura periódica** (a cada ~5 min) de `GET /v1/ListaReserva` (a API não tem aviso automático): toda reserva nova entra no CRM.
2. **Casamento com o lead:** procura pelo telefone/e-mail. Se a pessoa já conversou no WhatsApp/direct, a reserva entra **no mesmo card** (mantém a origem real: anúncio, Instagram…). Se não existe, cria o contato com origem **Site/motor** (ou a origem do link rastreável, se veio por um link do CRM).
3. **Status de pagamento:**
   - **Cartão** → card direto em **Reservado · pago**.
   - **Pix** → card em **Aguardando pagamento · Pix do motor**, com prazo. O CRM lê os **Pix recebidos no BB** e confirma sozinho quando o casamento é único (valor + data + nome/identificador); se houver dúvida, sugere e a equipe confirma com 1 clique. Confere o saldo em `GET /v1/ExtratoConta`.
   - Sem pagamento no prazo → **lembrete pelo WhatsApp** com o QR/copia-e-cola; vencido o prazo final → alerta para a equipe decidir (cancelar é manual no Silbeck, sem endpoint).
4. **Reservas do Booking e das agências** entram pela mesma sincronização (via channel manager → Silbeck), com origem OTA/agência, para o pré-chegada e o pós-estadia.
- **A confirmar na documentação:** campo de canal/origem e status (confirmada, pré-reserva, pendente) no `ListaReserva`; filtros por data de criação; se o Pix do motor usa a chave da conta do BB e se traz identificador.

### P34. Reservas do Booking: cobrança (29/09/2026)
- Reservas do **Booking entram no Silbeck como não pagas**; a equipe **cobra manualmente no cartão**, com os **dados do cartão que o Booking disponibiliza** ao hotel.
**Decisão de desenho (segurança):** o CRM **não recebe, não mostra e não guarda dados de cartão** (nem o agente de IA). Guardar ou trafegar número de cartão exige certificação PCI e cria risco de vazamento e fraude. A cobrança continua **no ambiente atual** (extranet do Booking + maquininha/terminal da Cielo ou Silbeck).
**O que o CRM faz:**
- Reserva do Booking sincronizada → card em **Reservado · a cobrar (Booking)** + **tarefa "Cobrar reserva do Booking"** com prazo (conforme a política da tarifa no Booking) e responsável.
- Painel/lista **"Cobranças do Booking pendentes"** (hoje, atrasadas).
- Quando o pagamento aparece no Silbeck (`GET /v1/ExtratoConta`), a tarefa fecha sozinha e o card vira **pago**. Cartão recusado → a equipe marca e o CRM registra o prazo que o Booking dá para o hotel pedir outro cartão.
- A avaliar depois: **pagamentos pelo próprio Booking** (Payments by Booking.com / cartão virtual), que tira a cobrança manual do hotel.
- **Confirmado (29/09/2026):** (1) o Pix do motor **cai na mesma conta do Banco do Brasil**; (2) a reserva do motor com Pix fica no Silbeck como **"pré-reserva aguardando pagamento"**. O CRM usa esse status para pôr o card em "Aguardando pagamento · Pix do motor".
- **A confirmar na documentação:** como passar a pré-reserva para **confirmada** pela API depois do Pix (se o `POST /v1/Adiantamento` já confirma ou se há outro passo). Se não houver, o CRM lança o adiantamento e cria uma tarefa de 1 clique para a equipe confirmar no Silbeck.

### P35. A7, B1 e B2 aprovados; inspiração nas telas da Asksuite (29/09/2026)
- **Aprovados pelo dono:** **A7** (links rastreáveis, alimentando as etiquetas coloridas de origem; etiqueta manual com 1 toque quando não houver código), **B1** (hóspede durante a estadia) e **B2** (passagem da madrugada com aviso às 7h30 e escalonamento). Análise crítica: **18 de 18 aprovados** (A1 com o desenho de pagamentos de P31–P34).
- O dono enviou prints do **LiveChat da Asksuite** como **inspiração, não para copiar** (os prints têm dados de hóspedes: não guardados no repositório). Pontos observados:
  - Lista de atendimentos com filtros rápidos (**Atribuídos, Não respondidos, Não lidos**), filtro de período, busca, contador de mensagens não lidas, ícone do canal, etiquetas coloridas no card (ex.: Cotação, Solicitado atendimento, Follow-up) e avatar de quem atende.
  - Cabeçalho da conversa com **Etiquetas**, **Robô ativo** (liga/desliga por conversa), **status do atendimento**, **responsável**, **Histórico** e busca.
  - Botão **"Assumir atendimento"** quando o robô está no comando.
  - Robô com nome (**"Sophia"**) e link **"Ver fonte da resposta"** em cada mensagem do robô.
  - **Formulário dentro do chat** (nome, e-mail, telefone, datas, interesse em passeio) e **botões de resposta rápida** (Quero comprar, Localização, Perguntas frequentes).
  - Painel lateral **"Reservas nesta conversa"** com **"Registrar reserva"**.
  - Alternância **lista × modo Kanban**.
- Aguardando mais telas e explicações do dono.
- **Modo Kanban da Asksuite (inspiração):** funil e conversa **na mesma tela** (colunas à esquerda, a conversa aberta num painel à direita, sem trocar de página); filtros no topo (empresa, atendentes, etiquetas, canais, busca); abas de status (**Aberto, Resolvido, Arquivado**) e atalhos (Atribuídos a mim, Não respondidos, Não lidos), período e **Exportar**; colunas com **quantidade e valor total** (ex.: "32 · R$ 77 mil"); no card, a **data da última mensagem**, contador de não lidas e o aviso **"A janela de 24h expirou"** (lembra que ali só sai mensagem paga, por modelo aprovado).
- **Alimentação do agente na Asksuite ("Data hub", inspiração):**
  - Três abas: **Fonte de dados**, **Questionário** e **Ensinar robô**.
  - **Questionário por tópicos** (Configurações, Reservas, Sobre o hotel, Localização, **Pré-chegada**, Atividades, Respostas especiais) com **barra de progresso** (ex.: 97%), perguntas-padrão com campo de resposta e "marcar como respondido" (ex.: "O que levar durante a estadia?", "Como é o tempo e a temperatura na cidade?").
  - **Ensinar robô / biblioteca de ensinamentos:** tabela **pergunta → resposta**, com data da última alteração, editar e excluir; botão "Novo treinamento".
  - **Rascunho × publicado:** "Descartar alterações" e **"Publicar alterações"** (mudança só vale depois de publicada).
  - **"Testar conteúdo":** chat de teste ao lado, com **"Ver fontes"**, para conferir a resposta antes de publicar.
  - O robô se apresenta como **"Gilberto"** (nome do fundador do hotel).
  - **Ação:** exportar/copiar as respostas do questionário e a biblioteca de ensinamentos da Asksuite antes de cancelar: elas preenchem lacunas da nossa fonte (ex.: "o que trazer", clima, check-in/check-out).
- **Protótipo v4** (29/09/2026), mesmo link: **Conversas** refeita com inspiração no LiveChat (abas Abertas/Resolvidas/Arquivadas; filtros Aguardando a equipe, Não lidas, Minhas, Com o agente, Hospedados, Janela 24 h expirada; canal, etiquetas de origem e etapa, não lidas; cabeçalho com agente liga/desliga por conversa, status e responsável; "Ver fonte da resposta"; "Assumir atendimento"; respostas rápidas, banco de fotos e **Cobrar** (Pix BB, link Cielo, motor); painel lateral com origem detalhada, **reservas nesta conversa**, pagamentos e oferta); exemplos de **hóspede no Bangalô 3** (B1) e **passagem da madrugada** (B2). Funil com etapa **Aguardando pagamento** e selos de pagamento e janela 24 h. Novas abas **Vagas** (60 dias, dom–qui, lista de espera, campanha por data) e **Pagamentos** (Pix do motor com casamento, cobranças do Booking, cobranças enviadas). **Ajustes do agente**: Questionário por tópicos com progresso, Biblioteca de respostas, **Testar o agente** com fonte, e barra **Publicar alterações** com a bateria de 30 testes.
- **Protótipo v5** (29/09/2026): a pedido do dono, **"Testar o agente"** saiu das abas e virou **painel à direita**, dividindo a tela com as funções de Ajustes do agente (revisão, questionário, biblioteca, regras), com botão **mostrar/esconder** (lembra a escolha), "Ver/Ocultar fontes" e "Limpar". Em telas estreitas, o painel desce para baixo do conteúdo.
- **Protótipo v6** (29/09/2026), a partir de prints da Asksuite (painéis Reservas, Histórico do viajante e Tarefas): na tela de **Conversas**, o painel da direita virou um **trilho de ícones** (Reservas e pagamentos · Histórico do cliente e origem · Tarefas) que **abre e recolhe** um painel por vez; recolhido, a conversa ocupa o espaço. **Tarefas** permite adicionar tarefa ali mesmo (vai também para a aba Tarefas). O **menu da esquerda** ganhou botão para **recolher**, ficando só com ícones (com os contadores). As duas escolhas ficam lembradas.

### P36. Biblioteca de respostas: funcionamento e melhorias (29/09/2026)
- **Como funciona (explicado ao dono):** itens "quando perguntarem X → responder Y". Entram por (1) **correções da Revisão de conversas** (fonte principal), (2) cadastro manual, (3) importação da biblioteca da Asksuite. O agente reconhece a pergunta **pelo sentido** e adapta o texto à conversa. **Prioridade das fontes:** Silbeck ao vivo (preço e vaga) > Biblioteca > Questionário > arquivos de apoio; sem resposta → passa para a equipe. Ciclo: rascunho → testar → publicar (bateria de 30 testes).
- **Melhorias aprovadas pelo dono:**
  1. **Resposta fixa:** marcação para textos que devem sair **exatamente iguais** (ex.: política de cancelamento); o agente não reescreve.
  2. **Validade:** data "válida até" para respostas temporárias (pacotes, promoções); depois da data o agente deixa de usar.
  3. **Usos e conflitos:** contador de quantas vezes cada resposta foi usada e **alerta de contradição** entre fontes (ex.: dois horários de café diferentes).
- Protótipo **v7** com as três melhorias na aba Biblioteca de respostas.
- **Protótipo v8** (29/09/2026): a pedido do dono, o **cabeçalho da conversa** (nome, canal, etiquetas, agente liga/desliga, status, responsável, ficha) saiu da área de rolagem e ficou **fixo no topo**, como na Asksuite. A tela de Conversas ocupa a altura da janela: **só as mensagens rolam** (e a lista de conversas rola à parte); a caixa de resposta fica fixa embaixo; a conversa abre já no fim.
- **Protótipo v9** (29/09/2026): **barra de rolagem sempre visível** dentro do chat (e na lista de conversas e no painel lateral), mais larga e na cor da marca, e botão **"↓" para ir à última mensagem** quando o atendente sobe na conversa.

### P37. Vagas por tipo de acomodação no painel da conversa (29/09/2026)
- **Pedido do dono:** as vagas também como **atalho no trilho da direita** da conversa (junto de reservas, histórico e tarefas), abrindo um painel que divide a tela, **com códigos por tipo de acomodação**.
- **Inventário informado pelo dono (quantidade de cada tipo, total 20):** cabana duplo (3), cabana tripla (1), bangalô (2), bangalô especial (1), apartamento standard duplo/triplo (6), duplo casa standard (1), duplo/triplo superior (2), conjugado (1), quádruplo standard (2), quádruplo especial (1).
- **Códigos propostos (a validar):** CBD cabana duplo · CBT cabana tripla · BG bangalô · BGE bangalô especial · STD apto standard duplo/triplo · CST duplo casa standard · SUP duplo/triplo superior · CJ conjugado · QST quádruplo standard · QES quádruplo especial. Se o Silbeck já tiver códigos próprios (`GET /v1/TipoApartamento`), usar os dele.
- **A esclarecer:** onde entra a **Cabana Master** (85 m², 2 a 5 pessoas) nessa lista.
- **Protótipo v10:** 4º ícone no trilho ("Vagas por acomodação"): tabela tipo × 7 noites com livres por noite, zero em vermelho, sexta/sábado marcados, **colunas das datas pedidas pelo cliente destacadas**, coluna "Período" (menor número de livres na estadia do cliente), total por noite, navegação ‹ 7 dias ›, "Datas do cliente" e "Hoje". A aba Vagas (calendário 60 dias) continua e agora usa o total de 20 acomodações.

### P38. Upsell: catálogo de produtos e reserva de atividades (29/09/2026)
- **Aprovado pelo dono:** catálogo de produtos + três caminhos de oferta (agente automático, equipe com 1 clique, régua) + **no máximo 1 oferta por conversa**.
- **Novo fato:** a **boia cross e o arvorismo são reservados num sistema interno do hotel que aceita API**; a equipe poderá **reservar pelo CRM via API**. Pedido: desenhar isso.
- Desenho completo em `crm/upsell-catalogo.md` (campos do produto, catálogo inicial, reserva pelo sistema interno, pagamento, regras do agente, métricas e pendências).
- **Protótipo v11:** nova aba **Produtos** (catálogo com preço, tipo de reserva, regras, momento de oferta, prioridade ▲, ativo/inativo, "+ Novo produto", "Importar do Silbeck"); no painel **Reservas e pagamentos** da conversa, **Produtos sugeridos** pelo perfil do cliente com **Oferecer** (cartão com preço e regras), **Reservar horário** (data, pessoas e horários com vagas vindos do sistema interno; lotado riscado; combo pede os dois horários) e, para a massagem, **Criar tarefa de agendamento**.
- **Pendências:** o agente pode **confirmar a reserva do horário sozinho** ou só propõe? · documentação da **API do sistema interno** · horários/capacidade por saída e se a flutuação está no sistema · preços da decoração e da massagem · lançar o consumo no Silbeck pela API (até agora só leitura: tarefa de 1 clique).

### P39. Cabana Master, atividades e massagem (29/09/2026)
- **Cabana Master** entra na lista de acomodações: **1 unidade** (código proposto **CBM**). Total do inventário: **21 acomodações**.
- A **API do sistema interno** das atividades é com o **Márcio**; o sistema **já controla horários e limite de pessoas por horário**.
- **Flutuação: o hotel não oferece mais.** Atualizado em `contexto/hotel-operacional.md` e no catálogo (inativa). ⚠️ Materiais de marketing antigos que citam flutuação precisam de revisão antes de publicar.
- **O agente pode confirmar sozinho:** **decoração, boia cross e arvorismo**.
- **Massagem (terceiro):** o CRM **envia uma mensagem no WhatsApp do parceiro** pedindo o horário, com botões [Confirmo] [Não posso] [Outro horário]; quando o parceiro responde, **o agente/sistema confirma ao hóspede** sozinho. Sem resposta → alerta para a equipe. Desenho em `crm/upsell-catalogo.md` (2b).
- **Protótipo v12:** Cabana Master no painel de vagas; flutuação inativa; na conversa, massagem com "Pedir horário ao parceiro" e simulação da resposta.

### P40. Códigos das acomodações validados e parceira da massagem (29/09/2026)
- **Códigos validados pelo dono:** CBD cabana duplo (3) · CBT cabana tripla (1) · CBM Cabana Master (1) · BG bangalô (2) · BGE bangalô especial (1) · STD apto standard duplo/triplo (6) · CST duplo casa standard (1) · SUP duplo/triplo superior (2) · CJ conjugado (1) · QST quádruplo standard (2) · QES quádruplo especial (1). **Total: 21.** Na integração, mapear cada código ao tipo correspondente do Silbeck (`GET /v1/TipoApartamento`).
- **Parceira da massagem:** **Natália**, massoterapeuta, WhatsApp **+55 67 99228-6365** (cadastro de parceiros em `crm/upsell-catalogo.md`). Antes de ligar o fluxo automático, avisar a Natália de que passará a receber pedidos do número oficial do hotel com botões.

### P41. Nome do agente (29/09/2026)
- **Decisão do dono:** o agente se chama **Gilberto** (mesmo nome usado na Asksuite, em homenagem ao fundador). Protótipo atualizado.
- Regra de honestidade mantida (P3): o Gilberto escreve com naturalidade, mas **se o cliente perguntar se está falando com uma pessoa, diz que é o assistente virtual do hotel** e oferece a equipe.

### P42. Cadastro de agências e operadoras sincronizado com o Silbeck (29/09/2026)
- **Pedido do dono:** um lugar para cadastrar agências e operadoras, **sincronizado com o Silbeck**, para que reservas feitas pelo CRM (equipe ou Gilberto) saiam com a empresa certa.
- **Desenho:**
  - **O Silbeck é a fonte do cadastro** (razão social, CNPJ, código da empresa). O CRM lê com `GET /v1/Empresa` a cada hora e no botão "Sincronizar", e guarda o **ID do Silbeck** em cada agência. A ligação entre os dois é pelo **CNPJ**.
  - **O CRM guarda o que o Silbeck não tem:** contatos (WhatsApp e e-mail de cada pessoa da agência), comissão combinada, código do link rastreável (AG-…), observações, histórico de conversas e reservas.
  - **Agência nova:** a API vista **só lê empresas** (não há POST Empresa). O CRM faz um **pré-cadastro** e cria a **tarefa "cadastrar no Silbeck"**; na próxima sincronização, liga os dois pelo CNPJ. Até lá, reserva para essa agência **não é enviada** ao Silbeck pela API (fica em tarefa).
  - **Diferença de dados:** o **Silbeck prevalece**; o CRM mostra o aviso e o botão "Usar dados do Silbeck". CNPJ repetido vira alerta de duplicidade.
  - **Na reserva via API** (`POST /v1/reserva`), o CRM envia o **ID da empresa do Silbeck** (confirmar na documentação o nome do campo) e a comissão sai certa.
  - **Mensagem de agência:** os telefones cadastrados identificam a conversa como da agência sozinhos (etiqueta, funil, e o Gilberto passa para a equipe, regra já aprovada).
- **Protótipo v15:** nova aba **Agências** (status sincronizado / diferença / pendente, CNPJ, contatos, comissão, link rastreável, reservas; "+ Nova agência", "Sincronizar com o Silbeck").

### P43. Montagem de orçamento (proposta em avaliação, 29/09/2026)
- **Pergunta do dono:** como montar o orçamento pela equipe e pelo Gilberto.
- **Proposta (aguardando aprovação):** um único "motor de orçamento" usado pelos dois:
  1. **Dados de entrada:** datas, adultos, crianças com idades, preferências (casal, acomodação desejada) — vindos da conversa/ficha.
  2. **Busca no Silbeck:** `GET Disponibilidade` + `POST Tarifario/Valor` para cada tipo que **comporta o grupo** (capacidade por código: CBD, CBT, CBM, BG, BGE, STD, CST, SUP, CJ, QST, QES).
  3. **Até 3 opções**, da mais indicada ao perfil; sem vaga no fim de semana → sugere datas de domingo a quinta.
  4. **Cada opção:** acomodação + foto, noites, valor total e por noite, o que está incluso, opcional sugerido (combo), condições (50% de sinal, cartão até 6x ou Pix, cancelamento) e **validade**.
  5. **Envio:** mensagem formatada no WhatsApp + fotos; opcional: **página do orçamento** com fotos e botão "Quero reservar".
  6. **Aceite:** o cliente escolhe → pré-reserva no Silbeck (`POST reserva`) → cobrança (Pix BB ou link Cielo) → etapa "Aguardando pagamento".
  - **Equipe:** botão "Montar orçamento" na conversa (dados já preenchidos, opções marcáveis, prévia e envio). **Gilberto:** mesmo motor, automático, sempre com preço do Silbeck e sem desconto.
  - Cada orçamento fica salvo no card (versões), para saber qual opção foi escolhida e medir perdas por preço.
- **Perguntas ao dono:** validade do orçamento; política de crianças (até que idade não paga); página do orçamento ou só mensagem; tarifa de agência (comissionada ou líquida).

### P44. Orçamento: motor de reservas, Gilberto sem formulário e tela da equipe (30/09/2026)
- **Como a Asksuite faz hoje (prints do dono):** o robô manda um **link de formulário** (forms.asksuite.com) com datas, "pessoas maiores de 5 anos" e "pessoas até 5 anos", e avisa "só podemos reservar com 1 noite de antecedência". A Asksuite **puxa valores, fotos e tipos de acomodação do motor de reservas da Silbeck**.
- **Decisão do dono:** o Gilberto **não usa formulário**: **extrai datas e pessoas da própria conversa**, como um humano, e só pergunta o que faltar (uma coisa de cada vez), confirmando o entendimento antes de cotar.
- **Motor de reservas:** a lista de endpoints recebida é da **API Hotel v1 (PMS)**; o motor (sbreserva) parece ser outro produto. Como a **Asksuite já integra com o motor**, deve existir uma **API do motor** (ou de distribuição) com tipos, tarifas e fotos. **Ação:** pedir à Silbeck (via Márcio) a documentação dessa API do motor, a mesma usada pela Asksuite. Plano B: tarifas pela API Hotel (`Tarifario/Valor`, `TipoApartamento`) e fotos do nosso banco de imagens por código de acomodação.
- **Sinais a confirmar:** crianças **até 5 anos** contadas à parte (provável gratuidade ou tarifa diferente) e **antecedência mínima de 1 noite** para reservar.
- **Protótipo v16:** ícone **"Montar orçamento"** no trilho da conversa: dados **extraídos da conversa pelo Gilberto** (editáveis: entrada, saída, adultos, idades das crianças) → **"Buscar no motor"** → acomodações que comportam o grupo, com foto, capacidade, vagas no período, total e média por noite (sem vaga aparece esmaecida) → escolhe até 3 → sugere o combo → **prévia editável da mensagem** → "Enviar orçamento" (vai com as fotos, fica salvo no card, etapa "Orçamento enviado"). O Gilberto usa o mesmo motor automaticamente.
- Perguntas de P43 ainda abertas: validade do orçamento, regra de crianças, página do orçamento, tarifa de agência.

### P45. Conexão do WhatsApp oficial (Meta) com o CRM (30/09/2026)
- **Pergunta do dono:** ligar o WhatsApp oficial pelo "MCP oficial da Meta"?
- **Resposta/decisão:** o canal de produção liga **direto na API oficial do WhatsApp (Cloud API da Meta)**, sem MCP e sem intermediário:
  - **Envio:** o servidor do CRM (Cloud Run) chama `graph.facebook.com/{versão}/{phone_number_id}/messages` (texto, mídia, botões, modelos).
  - **Recebimento:** a Meta avisa o CRM por **webhook** (endpoint no Cloud Run, com verificação de assinatura) a cada mensagem, leitura, entrega e resposta de botão.
  - **Chave:** token **permanente de Usuário do Sistema** (portfólio Hotel Cabanas), guardado só no **Secret Manager** do Google Cloud. Nunca no chat nem no repositório.
- **Por que não MCP:** MCP é uma forma de um **assistente de IA** usar ferramentas; não recebe webhooks, não garante entrega nem guarda histórico. Serve para o **Gilberto** usar ferramentas do **próprio CRM** (consultar vaga, montar orçamento, reservar), e não para ligar o canal. Qualquer "MCP oficial da Meta" só entra depois de conferido (não consta como produto oficial para WhatsApp em produção).
- **Passos:** (1) **verificação da empresa**: **concluída** (portfólio Hotel Cabanas, ID 531727826009907, conferido pela API em 30/09/2026); (2) conta **WhatsApp Business (WABA)** do hotel no portfólio; (3) **99110:** pedir à Asksuite a liberação do número (desligar o 2FA/migrar) e registrá-lo na WABA do hotel; (4) **99117:** modo **coexistência** (app WhatsApp Business + API juntos, histórico de até 6 meses importado); (5) app da Meta com produto WhatsApp (usar o 1043672718685119 ou um app dedicado "Cabanas CRM"); (6) forma de pagamento na WABA; (7) **modelos** aprovados (follow-up, pré-chegada, massagem ao parceiro, cobrança); (8) Instagram Direct e Messenger pelo mesmo app (webhooks da Página 158244147578036).
- **Custos:** conversas dentro da janela de 24 h iniciadas pelo cliente são gratuitas; modelos fora da janela são cobrados por mensagem (utilidade barata, marketing mais caro). Entra no teto de R$ 800.

### P46. Reserva criada no aceite; o CRM controla o pagamento (30/09/2026)
- **Decisão do dono:** a reserva entra no Silbeck **assim que o cliente aceita** (equipe ou Gilberto), para a vaga não ser vendida por outro canal (Booking, telefone, balcão) enquanto o cliente paga. O CRM **controla o pagamento** e **alerta** as reservas não pagas; se for preciso cancelar, **a equipe cancela manualmente no Silbeck** (a API não cancela).
- **Fluxo:** aceite → confere a vaga → `POST reserva` (guarda `idReserva` e `idReservaItem`) → cobrança do sinal de 50% (Pix BB ou link Cielo) → card em **Aguardando pagamento** com contagem regressiva → pagamento confirmado → `POST Adiantamento` → card em **Reservado** e confirmação ao cliente.
- **Alertas (prazos editáveis em Ajustes):**
  - **Prazo para pagar:** contado **a partir da criação da reserva** (hora em que a cobrança é enviada): 24 h; se o check-in for em até 3 dias, **2 h**. O prazo nunca passa do dia do check-in. Ex.: reserva às 10h de segunda para daqui a 20 dias → vence às 10h de terça.
  - **Lembretes ao cliente** (pelo Gilberto, tom gentil): no meio do prazo e 2 h antes de vencer.
  - **Venceu sem pagamento:** alerta para a equipe (no CRM e no celular, em horário comercial) e **tarefa "Cancelar no Silbeck"** com o número da reserva, o valor e o histórico; botões **Dar mais prazo** (com novo lembrete) ou **Vou cancelar**.
  - **Pagamento parcial** (menos de 50%) ou valor diferente: alerta para conferência.
  - **Depois do cancelamento:** o CRM vê o `status=3` no Silbeck, fecha a tarefa sozinho, move o card para **Perdido** (motivo "não pagou") e **avisa a lista de espera** daquelas datas (A3).
  - **Tarefa esquecida:** se a reserva vencida continuar ativa no Silbeck depois de X horas, o alerta sobe para Renata/dono.
- **Prazos aprovados pelo dono (30/09/2026):** 24 h e 2 h (check-in em até 3 dias), contados da criação da reserva.
- **Painel "Reservas a receber":** todas as reservas sem sinal (do CRM, do motor com Pix e do Booking), com valor, prazo e cor (no prazo, vence hoje, vencida), para o dia a dia da equipe.

### P47. Análise da jornada do lead e teste de cenários (30/09/2026)
- **Pedido do dono:** analisar a trajetória completa do lead, testar se as ferramentas estão conectadas e achar lacunas.
- **Feito:** teste automático do protótipo v16 (10 telas, 7 conversas × 5 painéis, fluxo orçamento → reserva → cobrança; sem erros) e **24 cenários** percorridos passo a passo: **7 cobertos, 12 com lacuna, 5 não cobertos**. Documento: `crm/analise-jornada.md`.
- **16 lacunas (G1–G16)**, 7 para resolver antes de construir: pagamento depois do prazo (G1), overbooking pela API (G2), orçamento com várias acomodações (G3), alteração e cancelamento depois de pagar (G4), contato × negócio (G5), dados para reservar e aceite da política (G6), regras de venda que a API não traz (G7).
- **Página de aprovação:** `crm/prototipo/analise-jornada.html`, https://claude.ai/artifact/5v2KBzG1zgW42rezdU723K (coleções `respostas` e `faltas`). 4 perguntas novas para a Silbeck acrescentadas em `crm/silbeck/mensagem-pedro.md`.

### P48. Respostas do dono à análise da jornada (30/09/2026)
Lido da página (16 de 16 avaliadas; nada acrescentado): **9 aprovadas, 6 com "Ajusta", 1 reprovada**.
- **Aprovadas:** G2 (overbooking), G5 (contato × negócio), G6 (dados para reservar e política), G8 (consentimento), G10 (modelos da Meta), G11 (efeito cascata), G12 (setores; pergunta: haverá local de configuração → **sim**, tela "Setores" em Ajustes), G15 (**pedir o WhatsApp do cliente** à agência).
- **G1 aprovado com acréscimo:** cobrança vence junto com o prazo, mas o cancelamento é manual e a equipe costuma **falar com o cliente antes** (ele pode ter esquecido). Por isso, na reserva vencida, botão **"Enviar novo link"** (Pix ou Cielo, com novo prazo) ao lado de "Vou cancelar".
- **G16 reprovado:** o saldo é **cobrado no check-out**; a pré-chegada não fala de saldo.
- **G3 ajustado:** no aceite, o Gilberto ou a equipe **pergunta se a reserva fica em nome de uma pessoa só ou separada** (um titular com vários quartos ou uma reserva por família). O orçamento com várias acomodações continua.
- **G7 ajustado:** estadia mínima, feriados, idade que paga e pessoas por unidade **são controladas pelo Silbeck**; o CRM só informa. **Validade do orçamento: dispensada** (o CRM recota no aceite e avisa se mudou). A confirmar com a Silbeck se a API aplica essas regras (pergunta 7c já enviada).
- **G13 ajustado:** a equipe usa o **WhatsApp Web**, não o celular; a regra vale igual (mensagem enviada fora do CRM pausa o Gilberto). Conferir se a coexistência da Meta sincroniza as mensagens do WhatsApp Web.
- **G4, G9 e G14:** o dono pediu explicação com exemplos (respondido no chat).

### P49. Alteração e cancelamento pedidos pelo cliente (G4 revisto) e G9 aprovado (30/09/2026)
- **G9 aprovado:** o Gilberto pede o WhatsApp logo no início de conversas pelo direct ou Messenger.
- **G4, decisão do dono:** como a API não altera nem cancela, o Gilberto **não confirma** nada ao cliente antes de a equipe executar no Silbeck.
  1. Cliente pede alteração → o Gilberto **confere a vaga** e o valor das novas datas (só para informar a equipe; ao cliente diz que vai verificar).
  2. **Alerta** para **Jagles, Márcio e Ricardo**: no CRM (faixa de alerta na tela, com **aviso sonoro**) e no **WhatsApp** de cada um (modelo de utilidade interno), com reserva, pedido, vaga e diferença.
  3. Um deles **confirma a alteração** no CRM, a equipe executa no Silbeck e marca "Feito". O CRM confere a reserva nova (`ListaReserva`) e **só então** o Gilberto (ou a equipe) envia a **confirmação ao cliente** e a cobrança da diferença; remarca atividades e régua.
  4. **Fora do expediente:** o Gilberto responde "Recebemos seu pedido; logo pela manhã nossa equipe verifica e te confirma." O alerta fica na fila da manhã.
  5. **Cancelamento:** mesmo fluxo (alerta, execução no Silbeck, conferência do `status=3`, e então confirmação ao cliente com o valor a devolver pela política).
  - Sem ação em X minutos no expediente, o alerta repete.
- **Protótipo v17** (30/09/2026), mesmo link: no painel "Reservas e pagamentos" da conversa, **"Cliente aceitou esta opção"** (reserva criada no Silbeck, Pix do sinal com prazo de 24 h, política enviada, outras opções marcadas como não escolhidas) → **"Simular pagamento confirmado"** (adiantamento lançado, card em Reservado, confirmação ao cliente) → **"Pedir alteração" / "Pedir cancelamento"** (Gilberto responde conforme o expediente; **alerta com som** no canto da tela para Jagles, Márcio e Ricardo; "Assumir e fazer no Silbeck" → "Feito no Silbeck" → só então a confirmação ao cliente). Funil com **contagem regressiva** do pagamento. Aba Pagamentos com **"Reservas a receber"** (vence em X h, vencida, "Enviar novo link", "Vou cancelar" com cobrança anulada e tarefa, "Feito no Silbeck").
- **Protótipo v18** (30/09/2026), pedidos do dono: **Produtos** e **Agências** com **Editar** e **Excluir** em cada card (exclusão com confirmação no próprio card; agência sincronizada é excluída só do CRM, e o CNPJ vindo do Silbeck fica travado na edição; agência ganhou campo de e-mail). **Conversas:** a página não rola mais; a lista de leads à esquerda, as mensagens e o painel da direita rolam cada um por dentro, com barra própria.
- **Protótipo v19** (30/09/2026), pedido do dono: **filtros na tela de Pagamentos**: botões de tipo (Todos, Reservas a receber, Pix do motor, Booking, Cobranças do CRM; dá para marcar um, vários ou todos), busca por **nome ou nº da reserva** (pelo começo das palavras) e **data da estadia** (mostra as reservas cujo período inclui o dia), com "Limpar filtros", contador por bloco ("2 de 4") e aviso quando nada bate.

### P50. Banco de imagens com miniaturas e respostas rápidas com "/" (30/09/2026)
- **Pedido do dono:** ao assumir o atendimento, o **banco de imagens** deve mostrar **miniaturas** das fotos (vindas do Drive) para orientar quem atende.
  - **Protótipo v20:** "Banco de fotos e vídeos" abre uma galeria com **36 miniaturas reais** do Drive (as mesmas já baixadas para a Central de Aprovação, `ferramentas/central-aprovacao/banco/`), com código da acomodação, busca, categorias (Acomodações, Atividades, Rio e natureza, Café e lanchonete, Lazer e relaxamento) e **"Sugeridas para esta conversa"** (pelo que o cliente falou e pelo perfil). Escolhe até 5 e envia; as fotos aparecem na conversa.
  - **No CRM real:** o banco inteiro é importado do Drive com miniaturas e etiquetas (5.7); o Gilberto usa o mesmo banco para enviar fotos sozinho (5.8).
- **Pedido do dono:** respostas rápidas no estilo **"/"**: a pessoa digita o começo do atalho e o sistema busca.
  - **Onde se cadastram:** na **Biblioteca de respostas** (Ajustes do agente), com o novo campo **"Atalho para a equipe"** (ex.: `/local`). Um lugar só para a equipe e o Gilberto; `{nome}` vira o primeiro nome do cliente.
  - **O Gilberto usa?** Sim, a mesma biblioteca: ele reconhece a pergunta **pelo sentido** (não precisa do atalho) e, se a resposta for **fixa**, envia o texto exato. O atalho é só um jeito rápido da equipe chamar a resposta.
  - **Protótipo v20:** digitar `/` na caixa de mensagem abre a lista; `/lo` filtra; setas e Enter inserem o texto (com o nome do cliente); o contador de usos sobe.

### P51. Banco de imagens completo na versão final (30/09/2026)
- O protótipo fica com a **amostra de 36 fotos** (suficiente para entender a galeria).
- **Versão final: todas as imagens do banco do Drive** (476 hoje), sincronizadas quando entrarem fotos novas, com miniaturas no armazenamento do CRM (Supabase) e carregamento conforme a rolagem. Para a busca e as sugestões funcionarem em todo o banco, cada foto precisa de **descrição e etiquetas** (a maioria dos nomes de arquivo não descreve a cena): etapa de implantação da fase 2, feita com ajuda da IA e revisada pela equipe.

### P52. Passagem para a equipe e alertas unificados (30/09/2026)
- **Pedido do dono:** prever os casos em que o Gilberto sugere passar para uma pessoa ou o cliente pede; o card da conversa em **destaque** e **alerta no sino de notificações**, como em cancelamento e alteração.
- **Casos que geram alerta (prioridade):** 1) **reclamação** (sobretudo durante a estadia); 2) **pedido de cancelamento**; 3) **cliente pede atendimento humano**; 4) **Gilberto não sabe ou é pedido especial** (fora da base, exceção de política, grupo grande, agência, evento); 5) **pedido de alteração**.
- **Protótipo v21:** botão **Simular** no topo com os 5 casos. Cada um: mensagem do cliente + resposta honesta do Gilberto (no expediente: "a equipe continua em instantes"; fora: "a partir das 7h30") → **card em destaque** no topo da lista de conversas (borda vermelha, faixa com o motivo e o tempo; laranja para alteração; cinza quando alguém já assumiu) → **sino** com contador e som → painel de alertas ordenado por prioridade, com **Assumir atendimento** (o Gilberto sai da conversa) ou, para alteração e cancelamento, **Assumir e fazer no Silbeck → Feito no Silbeck**; **Silenciar som** e **Minimizar**.
- **Regras propostas (a validar):** sem ninguém assumir em 10 min no expediente, o alerta repete e sobe para a Renata; notificação no celular (app instalável) para quem está de plantão; o Gilberto nunca fica calado: avisa o cliente do prazo.
- **Aprovado pelo dono e implementado no protótipo v22 (30/09/2026):**
  1. **Escalonamento:** alerta sem dono por 10 min no expediente repete o som e sobe para **Renata e Ricardo** (selo "Escalado" no painel). Simulação: "⏱ Passar 10 minutos sem ninguém assumir".
  2. **Plantão:** seletor **"De plantão agora"** no menu lateral (Jagles, Márcio, Ricardo, Renata ou todos); o alerta vai primeiro para quem está de plantão, e quem assume aparece no card.
  3. **Notificação no celular:** o CRM instalado no celular mostra a notificação mesmo fechado (no protótipo, o aviso aparece no canto inferior esquerdo).
  4. **Métrica no Painel:** "Tempo até a equipe assumir" por tipo de pedido, com meta de 10 min (vermelho quando acima).
  5. **Aprender com as passagens:** quando o Gilberto passa por não saber, a pergunta do cliente entra na **Biblioteca de respostas** como "Sem resposta · veio de uma passagem para a equipe", com botão "Cadastrar resposta"; depois de cadastrada e publicada, o Gilberto responde sozinho.

### P53. Iniciar conversa e completar o contato do Instagram (30/09/2026)
- **Pedido do dono (com telas da Asksuite como referência):** iniciar conversa com lead novo pelo painel do chat; e inserir WhatsApp e e-mail de quem chega pelo Instagram sem esses dados.
- **Protótipo v23:**
  - **"+ Nova conversa"** no topo da lista → "Iniciar conversa no WhatsApp" (e "Novo e-mail", fase 2). Janela com celular (+55, validação), aviso quando o número **já é de um contato** (abre a conversa existente em vez de duplicar), nome, número de envio (99117/99110), **modelo aprovado pela Meta** com categoria (utilidade: mais barata; marketing: exige consentimento marcado) e **prévia no estilo WhatsApp**; "+ Cadastrar novo modelo" leva à Régua (aprovação da Meta). Depois de enviar, a conversa fica "aguardando resposta" e só abre para texto livre quando o cliente responde.
  - **Cabeçalho da conversa:** WhatsApp e e-mail com ✎ para inserir/editar (validação). Em conversa do Instagram/Messenger sem telefone, aviso "Sem WhatsApp: follow-up só dentro de 24 h"; com telefone, botão **"Continuar pelo WhatsApp"** (modelo "Continuação do atendimento do Instagram"), mantendo a origem e o perfil. Número que já existe → os contatos são juntados.
- **Protótipo v24** (30/09/2026): o dono não encontrou as simulações (ficavam só no botão Simular). Agora a tela de Conversas **já abre com 3 alertas de exemplo**: atendimento humano (Cláudia), cancelamento (Rafael) e alteração (João), com cards em destaque, sino com contador e painel aberto. O botão **Simular ▾** continua para criar outros casos.
- **Protótipo v25** (30/09/2026): botão **✓ Resolvido** em cada aviso (tira o aviso da lista, o destaque do card e o número do sino; registra na conversa quem resolveu). **Som mais forte** (3 notas) e botão **🔊 Testar som**; como o navegador só libera áudio depois do primeiro clique na página, o som toca nesse primeiro clique se houver aviso sem dono. No CRM real (app instalado), a notificação do celular também toca.
- **Protótipo v26** (30/09/2026), pedido do dono: no **Montar orçamento**, campo **Crianças** (0 a 6) que abre **um seletor de idade para cada criança** (de "menos de 1 ano" a 17). "Buscar no motor" só libera com todas as idades preenchidas (a idade define preço e capacidade; se o cliente não disse, o Gilberto pergunta). O número de pessoas no quarto passa a contar as crianças na hora. Ajuste: WhatsApp e e-mail do cabeçalho quebram linha em telas estreitas.

### P54. Página de decisões pendentes (30/09/2026)
- A pedido do dono, as escolhas que faltam para fechar o desenho viraram uma página com botões: `crm/prototipo/decisoes.html`, https://claude.ai/artifact/YaY1Gqk3AiNH7mohfYFSRp (coleções `respostas` e `faltas`; cada resposta guarda o índice e o texto da opção).
- **16 decisões:** crianças (idade que paga, capacidade), tarifa de agência, preços de decoração e massagem, envio do orçamento, grupos em vários quartos, limite de grupo para a equipe, expediente, tempo e destino do escalonamento, plantão, setores, e-mail no CRM, acesso ao faturamento, guarda das conversas (LGPD) e conta do Google Cloud.

### P55. Decisões do dono (página de decisões, 30/09/2026)
Lido da página (16 de 16; nada acrescentado):
| # | Decisão |
|---|---|
| D1 | Crianças **até 5 anos** não pagam (regra controlada pelo Silbeck; registrada aqui para o Gilberto explicar) |
| D2 | Capacidade do quarto: **segue o cadastro do Silbeck** |
| D3 | Agências: **tarifa comissionada** (tarifa cheia; o hotel paga a comissão) |
| D4 | Preço da decoração e da massagem: **cadastrar depois na tela Produtos** |
| D5 | Orçamento: **mensagem + página do orçamento** (fotos e "Quero reservar"); o dono pediu um exemplo |
| D6 | Grupos/famílias: **perguntar sempre** se é uma reserva só ou separada por família |
| D7 | Grupo vai direto para a equipe **acima de 10 pessoas** |
| D8 | Expediente da equipe: **7h30 às 17h** |
| D9 | Alerta sem dono escala em **10 minutos** |
| D10 | **Confirmado pelo dono:** alertas só para **Márcio, Jagles e Ricardo** (o de plantão primeiro; sem dono em 10 min, os três). A Renata não recebe alertas e saiu do plantão |
| D11 | Plantão **escolhido manualmente no CRM** |
| D12 | Pedidos do hóspede aos setores: **a recepção recebe tudo e repassa** (a tela Setores fica simples: só a recepção como destino) |
| D13 | **E-mail de reservas dentro do CRM** (fase 2) |
| D14 | Faturamento visível para **dono, Renata e Márcio** |
| D15 | Guardar conversas por **5 anos** (exclusão antes, se o cliente pedir) |
| D16 | Google Cloud na **conta pessoal do dono** (créditos do Google AI Ultra); recomendação: incluir Renata e Márcio como administradores do projeto para não depender de uma pessoa só |
- **Exemplo da página do orçamento (D5):** `crm/prototipo/orcamento-exemplo.html`, https://claude.ai/artifact/DfYcXJAbqr3ZaXyZyHKDU8. Página de celular na identidade do Cabanas: saudação do Gilberto, 3 opções com fotos reais que deslizam, destaques, total e média por noite, "Quero reservar esta"; incluso na diária; combo boia cross + arvorismo com opção de incluir; condições (sinal 50%, 6x, check-in/out, cancelamento, distância); ao reservar, resumo com sinal e saldo no check-out e escolha Pix ou cartão (Cielo), criando a reserva e enviando a cobrança no WhatsApp.

### P56. Página do orçamento aprovada (30/09/2026)
- **Dono aprovou** a página do exemplo e pediu para implementar.
- **Como é gerada:** o mesmo motor de orçamento monta a página a partir das opções escolhidas (valores do Silbeck na hora, fotos do banco de imagens pelo código da acomodação, textos de incluso/condições da Biblioteca, combo do catálogo). Cada orçamento ganha um **link único** (ex.: `crm.hotelcabanas.com.br/o/…`) enviado junto com a mensagem no WhatsApp; o card guarda a versão.
- **O Gilberto também gera:** extrai datas e pessoas da conversa, escolhe até 3 opções pelo perfil, envia mensagem + link sozinho. A equipe faz o mesmo pelo botão "Montar orçamento".
- **Na página:** o cliente vê as opções e clica "Quero reservar esta" → o CRM **confere vaga e preço de novo**, cria a reserva no Silbeck (P46) e manda a cobrança (Pix ou Cielo) no WhatsApp. Se o preço mudou, a página mostra o valor novo antes de confirmar.
- **Sinal para a equipe:** o CRM registra quando o cliente **abre** a página e qual opção olhou; isso aparece na conversa e alimenta o follow-up ("vi que você gostou da Cabana Casal…").
- **Protótipo v27:** ao enviar o orçamento, a mensagem leva o link, a conversa registra a página criada e, segundos depois, "Mariana abriu a página do orçamento"; no painel, "Ver como a cliente vê a página".
