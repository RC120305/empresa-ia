# Meta Ads para o Hotel Cabanas: referência técnica

> Base: `contexto/social-e-trafego.md` (fontes e datas) + guias da Meta. Limites e zonas seguras mudam: **revisar a cada 3 meses** junto com `social-e-trafego.md` (próxima revisão: dez/2026).

## 1. Formatos e tamanhos
| Posicionamento | Tamanho | Modo do renderizador |
|---|---|---|
| Feed (Instagram e Facebook) | **4:5, 1080 × 1350** | `feed45` |
| Stories e Reels | **9:16, 1080 × 1920** | `story` |
| Carrossel | 4:5 ou 1:1 por cartão, 2 a 10 cartões | `feed45` |
| Vídeo | 9:16 (Reels/Stories) e 4:5 (feed), 15 a 30 s, legendas na tela | produtora |

Cada anúncio de imagem sobe com **os dois tamanhos** (4:5 e 9:16) para a Meta usar o certo em cada lugar.

**Zonas seguras no 9:16:** deixar livres de texto e logo os **~250 px do topo** e os **~340 px de baixo** em Stories; em Reels, a parte de baixo é maior (legenda e botões): manter o texto entre **~250 px e ~1250 px** de altura e longe dos **~120 px da direita**.

## 2. Limites de texto (recomendados, com contagem)
| Campo | Recomendado | Observação |
|---|---|---|
| Texto principal | **até ~125 caracteres** visíveis | Gancho na 1ª linha; o resto aparece no "ver mais" |
| Título | **até ~40** | Fato ou benefício concreto |
| Descrição | **até ~30** | Nem todo posicionamento mostra |
| Texto na arte | 3 a 8 palavras no gancho + 1 fato | Arte com pouco texto entrega melhor |

**Botões (CTA) mais usados:** "Enviar mensagem" (WhatsApp de reservas), "Reservar agora" ou "Saiba mais" (motor de reservas).

## 3. Estrutura da campanha (Andromeda, 2025–2026)
- A Meta usa o **criativo** como principal sinal de público: o anúncio "encontra" a persona. **Segmentação = criativo.**
- **1 campanha → 1 conjunto amplo** (Advantage+ de público e posicionamentos) → **10 a 15 criativos realmente diferentes** (persona, ângulo, formato e foto diferentes; trocar só a cor ou uma palavra não conta).
- Localização: Brasil com prioridade para SP, depois PR, RJ e Sul (sugestão como sinal, não como trava). Conjunto separado só para mensagem incompatível (ex.: região de Bonito para boia cross e arvorismo, que atendem não hóspedes).
- **Objetivo:** mensagens (WhatsApp de reservas) ou tráfego/vendas para o motor de reservas. Com pouca verba, preferir **conversas no WhatsApp** (a equipe fecha a venda e mede a qualidade do contato).
- **Antes de gastar:** conta de anúncios, página e Instagram conectados; pixel/conversões configurados se o objetivo for o site; WhatsApp Business ligado; forma de pagamento — checklist do Estrategista.

## 4. Links com UTM
Padrão (minúsculas, sem acento, com hífen):
```
?utm_source=meta&utm_medium=paid-social&utm_campaign=<aaaa-mm>-<campanha>&utm_content=ad<nn>-<persona>
```
Ex.: `https://sbreserva.silbeck.com.br/hotelcabanas?utm_source=meta&utm_medium=paid-social&utm_campaign=2026-11-reveillon&utm_content=ad03-casais`
- Se o motor de reservas não guardar os parâmetros: [a testar]. Para o WhatsApp, usar uma **mensagem pronta** por campanha (ex.: "Olá! Vi o anúncio do Réveillon…") para a equipe identificar a origem.
- A equipe de reservas pergunta **"como nos conheceu?"** e anota: sem isso, não se afirma que o anúncio trouxe reservas.

## 5. Métricas e regras de leitura
| Métrica | Para que serve |
|---|---|
| Custo por resultado (conversa ou clique no motor) | a principal |
| CTR (link) | o criativo chama atenção? |
| CPM | quanto custa alcançar; sobe em feriados e fim de ano |
| Frequência | acima de ~3 a 4 na mesma pessoa em poucos dias = cansaço do criativo |
| Taxa de retenção de vídeo (3 s e 50%) | o gancho funciona? |
| Qualidade do contato | quantas conversas viraram orçamento e reserva (dado da equipe) |

**Regras de otimização**
- Não mexer nos primeiros **3 a 5 dias** (fase de aprendizado), salvo erro evidente (link quebrado, texto errado).
- Pausar criativos que, com gasto relevante, ficam muito piores que a média; **reforçar o vencedor** com variações do mesmo ângulo.
- Frequência alta e custo subindo → **criativos novos**, não público mais estreito.
- Nunca julgar por curtidas; olhar custo por conversa e qualidade do contato.
- Mudar orçamento aos poucos (até ~20% por vez).

## 6. Cuidados do Cabanas em anúncios
- `contexto/cultura.md` §8: sem "segurança absoluta", sem promessa absoluta ou de saúde.
- Preço só com confirmação do dono; pacotes de 4 noites só no Réveillon e no Carnaval.
- Out/dez a mar: atividades de rio "sujeitas às condições do rio" (não funcionam com o rio cheio); nunca "água cristalina garantida".
- Opcionais marcados "(opcional)"; decoração especial (pétalas, LOVE) é opcional.
- Nunca citar concorrentes; notas públicas com fonte e mês.
