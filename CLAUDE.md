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
- **Banco de imagens (Google Drive):** pasta "Imagens do hotel cabanas" (dentro de "Hotel Cabanas"), https://drive.google.com/drive/folders/1j2JGPBtyArVGkrOpj-ZdwmJ5w0qHlsO5 (ID `1j2JGPBtyArVGkrOpj-ZdwmJ5w0qHlsO5`). Só fotos reais do hotel. Mapa das subpastas: `contexto/banco-de-imagens.md`.
- `contexto/social-e-trafego.md`: base técnica de Instagram, Meta Ads e Google para hotéis (com fontes e data; revisar a cada 3 meses).
- `marketing/`: rascunhos produzidos pelo Especialista em Marketing e Anúncios.
- `design/`: kit do Designer de Criativos (`modelos/`, `ferramentas/`) e peças prontas em `pecas/`.
- `social/`: planos e análises do Estrategista de Social Media e Tráfego.
- `.claude/skills/aprender-youtube/`: skill que lê as transcrições de vídeos/canais do YouTube (`ferramentas/youtube/transcrever.py`) e gera cadernos em `contexto/aprendizados/` para a RH aplicar nos funcionários. Acione com `/aprender-youtube <link>`. Requer `www.youtube.com` liberado na rede do ambiente.
- **Produção de conteúdo do Instagram (skills que orquestram a equipe):**
  - `.claude/skills/conteudo-mensal/`: `/conteudo-mensal <mês>`: pauta (Estrategista) → OK do dono → textos (Marketing) → artes (Designer) → publicação no Drive (pasta "Conteúdo Instagram"). Perfil de voz e plano de postagem em `references/perfil-cabanas.md`.
  - `.claude/skills/alterar-conteudo/`: `/alterar-conteudo`: refaz posts existentes, com proposta + OK antes de reescrever.
  - `.claude/skills/relatorio-metricas/`: `/relatorio-metricas <mês>`: prints do Insights → PDF na identidade do Cabanas, com a leitura do Estrategista.
  - Conteúdo do mês em `social/conteudo/AAAA-MM/`; relatórios em `social/relatorios/`.
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
