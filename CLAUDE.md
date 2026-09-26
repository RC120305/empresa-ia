# Empresa de IA: Hotel Cabanas

Este repositório é uma "empresa" de agentes de IA que trabalham para o **Hotel Cabanas** (Bonito, MS).

## Estrutura
- `contexto/hotel-cabanas.md`: **fonte de verdade** sobre o hotel (estratégia, personas, SWOT, curva de valor). Todo agente deve lê-lo antes de trabalhar.
- `contexto/Guia_Estrategico_Hotel_Cabanas.pdf`: documento original.
- `.claude/skills/rh/`: a **Diretora de RH**, que desenha cargos e contrata, avalia e ajusta os funcionários de IA. Acione com `/rh`.
- `.claude/agents/`: os **funcionários contratados** (um arquivo por cargo).
- `rh/organograma.md`: quem existe, vagas sugeridas e histórico.
- `rh/vagas/`: descrições de vaga.
- `rh/avaliacoes/`: testes do período de experiência.

## Regras gerais
- Responder sempre em **português do Brasil**.
- Nenhum funcionário é criado sem a aprovação do dono.
- Quando o usuário pedir uma tarefa operacional (ex.: "crie um anúncio"), verifique no organograma se há um funcionário para isso e delegue a ele. Se não houver, sugira acionar o RH.
- Mudanças relevantes na equipe devem ser registradas no histórico do organograma.
