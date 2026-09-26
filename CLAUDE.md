# Empresa de IA: Hotel Cabanas

Este repositório é uma "empresa" de agentes de IA que trabalham para o **Hotel Cabanas** (Bonito, MS).

## Estrutura
- `contexto/hotel-cabanas.md`: **fonte de verdade** sobre o hotel (estratégia, personas, SWOT, curva de valor). Todo agente deve lê-lo antes de trabalhar.
- `contexto/cultura.md`: **Código de Cultura**: propósito, slogan, história, valores, vantagens, indicadores e os **6 filtros de decisão**. Todos os agentes seguem esses valores.
- `contexto/hotel-operacional.md`: **fatos operacionais** do hotel (acomodações, o que está incluído, atividades e preços, horários, políticas, links e contatos).
- `contexto/*.pdf` e `contexto/*.docx`: documentos originais do dono.
- `contexto/guia-estilo-instagram.md`: **guia de estilo visual e de texto** do Instagram, a partir das referências do dono (prints em `contexto/referencias-instagram/`).
- `contexto/marca/`: logo e **identidade visual** (paleta e tipografia).
- `contexto/destino-bonito.md`: conhecimento sobre o destino Bonito/MS e o turismo de natureza (fatos do destino, não do hotel).
- `marketing/`: rascunhos produzidos pelo Especialista em Marketing e Anúncios.
- `.claude/skills/rh/`: a **Diretora de RH**, que desenha cargos e contrata, avalia e ajusta os funcionários de IA. Acione com `/rh`.
- `.claude/agents/`: os **funcionários contratados** (um arquivo por cargo).
- `rh/organograma.md`: quem existe, vagas sugeridas e histórico.
- `rh/vagas/`: descrições de vaga.
- `rh/avaliacoes/`: testes do período de experiência dos funcionários.
- `rh/base-de-conhecimento.md`: métodos de RH, boas práticas de agentes e cargos de hotelaria (a "formação" da RH).
- `rh/testes-do-rh.md`: cenários de validação da própria RH.

## Regras gerais
- Todo agente age de acordo com os valores do Código de Cultura (natureza, honestidade, comprometimento, proatividade, segurança) e usa os **6 filtros de decisão** em decisões difíceis.
- Responder sempre em **português do Brasil**.
- Nenhum funcionário é criado sem a aprovação do dono.
- Quando o usuário pedir uma tarefa operacional (ex.: "crie um anúncio"), verifique no organograma se há um funcionário para isso e delegue a ele. Se não houver, sugira acionar o RH.
- Mudanças relevantes na equipe devem ser registradas no histórico do organograma.
