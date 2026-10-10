---
name: aprender-curso
description: Entra em um curso online que o dono comprou (com a sessão de login dele), lê todas as aulas (transcrição, texto da página, PDFs) e transforma o conhecimento em uma SKILL portátil, pronta para usar em qualquer projeto. Use quando o dono pedir para "fazer o curso", "estudar o curso que comprei", "absorver o conteúdo do curso", "transformar o curso em skill" ou passar o link de uma área de membros (Hotmart, Kajabi, Eduzz, Teachable, Udemy, plataforma própria etc.) — ex.: "/aprender-curso <link do curso>". Para vídeos públicos do YouTube use aprender-youtube.
---

# Aprender um curso e virar skill

Pipeline: **sessão de login → mapa das aulas → extração → síntese → skill portátil**. A ferramenta é `ferramentas/curso/estudar_curso.py`.

## Regras de ouro
- **Senha nunca passa pelo chat nem é guardada.** O dono faz o login no navegador (subcomando `sessao`); só o arquivo de cookies fica salvo em `conhecimento/cursos/_sessoes/` (fora do git, trate como senha).
- **Só cursos que o dono comprou/tem acesso**, para estudo próprio. Sem burlar DRM, paywall, captcha ou limite da plataforma; sem baixar nem republicar vídeos.
- **Síntese, não cópia.** A skill gerada tem os métodos e princípios com palavras próprias, curtos e citando a origem (aula/módulo). Nunca cole aulas, apostilas ou slides inteiros: é material protegido do autor.
- Aula sem transcrição: avise e marque como lacuna. **Não invente conteúdo.**

## Passo a passo

### 1. Combinar com o dono (antes de rodar)
Pergunte só o que falta: link da página do curso, nome curto (`<nome>`) e **para que a skill servirá** (isso decide o que é relevante e o formato).

### 2. Sessão de login
O navegador com tela precisa de um computador de verdade, então o dono roda **no computador dele** (o ambiente em nuvem não tem tela):
```bash
pip install playwright && playwright install chromium
python3 ferramentas/curso/estudar_curso.py sessao <nome> <url-de-login>
```
Ele faz login (com código/2FA, se houver), abre o curso e aperta ENTER. Depois leva o arquivo `conhecimento/cursos/_sessoes/<nome>.json` para o ambiente em nuvem como **segredo/arquivo privado** (nunca no chat nem no git). Se o ambiente for o próprio computador dele, nada precisa ser movido.
- Rede: o domínio da plataforma (e o CDN dos vídeos/legendas) precisa estar liberado em Network access do ambiente. Se der 403/proxy, explique em 2 linhas e pare; não contorne.
- Sessão expira: se o `mapear` avisar, repita este passo.

### 3. Mapear
```bash
python3 ferramentas/curso/estudar_curso.py mapear <nome> <url-do-curso> [--todos]
```
**Abra `conhecimento/cursos/<nome>/indice.json` e confira** com o dono: ordem, módulos, links sobrando (FAQ, certificado). Edite o JSON. Plataformas que carregam o menu por JavaScript lento podem vir vazias: use `--todos` e limpe a mão.

### 4. Extrair
```bash
python3 ferramentas/curso/estudar_curso.py extrair <nome> [--limite N --inicio K --espera 6]
```
Rode em lotes (ex.: 20 aulas). Cada aula vira `aulas/NN-titulo.md` com situação: `transcrição`, `só texto` ou `SEM TRANSCRIÇÃO`. Anexos (PDF etc.) ficam em `anexos/`; leia-os (skill `pdf`).
- **Vídeo sem legenda:** liste as aulas ao dono. Opções: ele cola a transcrição/anotações; ou, se autorizar, transcrever o áudio localmente com Whisper (`pip install openai-whisper`) a partir de arquivo que ele próprio baixou. Não tente baixar streams protegidos.
- Vídeo embutido do YouTube/Vimeo público: use a skill `aprender-youtube` no link.

### 5. Ler e sintetizar
Leia **todas** as aulas extraídas (em subagentes por módulo, se forem muitas, devolvendo notas curtas). Monte primeiro `conhecimento/cursos/<nome>/notas.md`:
- Promessa do curso e público; mapa dos módulos.
- Por módulo: conceitos, passo a passo/métodos, fórmulas, exemplos, erros comuns, ferramentas.
- Separar **princípio** (dura) de **tática/regra de plataforma** (envelhece: anote a data).
- Contradições, lacunas e o que é só opinião/promessa de venda do autor.

### 6. Gerar a skill portátil
Crie `.claude/skills/<nome-da-skill>/` **autossuficiente** (funciona copiada para `~/.claude/skills/` ou para qualquer repositório; nada de caminhos do Hotel Cabanas, a menos que o dono peça uma versão aplicada):
```
<nome-da-skill>/
  SKILL.md              # enxuto (< 500 linhas)
  references/
    <modulo>.md         # detalhes por módulo, carregados só quando necessário
    checklists.md       # listas de passos prontas
  scripts/ (opcional)   # só se o curso ensina algo automatizável
```
`SKILL.md`:
- Frontmatter: `name` (minúsculas e hífens) e `description` **específica e "pushy"**: o que faz + quando acionar (verbos e situações reais do dono), sem generalidades.
- Corpo imperativo: quando usar, fluxo passo a passo, decisões ("se X, faça Y"), formatos de saída, erros comuns, e **o que a skill NÃO faz**.
- Aponte para `references/` com instruções de quando ler cada arquivo (divulgação progressiva).
- Crédito discreto: "Baseada no curso <título> de <autor>, estudado em <data>; síntese própria."
- Revisão sugerida em 3 meses para o que for tática de plataforma.

### 7. Testar e entregar
1. Teste a skill com 2 ou 3 pedidos reais do dono e ajuste o que falhar (use a skill `skill-creator` para evals mais formais).
2. Mostre ao dono, em até ~150 palavras: o que a skill faz, as 3 ideias mais valiosas, lacunas (aulas sem transcrição) e como levá-la a outro lugar:
   - Outro projeto: copiar a pasta para `.claude/skills/` dele.
   - Todos os projetos: copiar para `~/.claude/skills/`.
3. Se fizer sentido, ofereça ligar a skill a um funcionário (**só via `/rh`, com o "sim" do dono**).
4. Commit só da skill e da ferramenta. `conhecimento/cursos/` (aulas, anexos, sessão) **nunca** vai para o git.

## Limites
- Não entra em conta sem a sessão que o dono criou; não quebra captcha, 2FA nem DRM.
- Não republica, revende nem distribui o conteúdo do curso.
- Se os Termos da plataforma proibirem extração automática, avise o dono do risco antes de rodar.
