---
name: aprender-youtube
description: Assiste (lê as transcrições de) vídeos ou canais do YouTube e transforma o conteúdo em um caderno de conhecimento aplicado ao Hotel Cabanas, pronto para a RH aplicar nos funcionários de IA. Use quando o dono passar um link do YouTube e pedir para aprender, estudar, resumir, "capturar o conhecimento" ou treinar a equipe com base em um vídeo, playlist ou canal (ex.: "estuda os 5 últimos vídeos da @babruna", "aprende com este vídeo e aplica no Estrategista", "/aprender-youtube <link>").
---

# Aprender com o YouTube

Transforma vídeos em **conhecimento aplicado ao Cabanas**, não em resumo genérico. O resultado é um caderno em `contexto/aprendizados/` que a RH pode ligar aos funcionários certos, com a aprovação do dono.

## Passo a passo

### 1. Baixar as transcrições
```bash
pip install -q yt-dlp   # se ainda não estiver instalado
python3 ferramentas/youtube/transcrever.py "<url>" --limite <N>
```
- `<url>`: vídeo, playlist ou canal (`https://www.youtube.com/@canal/videos`). Em canal/playlist, `--limite` define quantos vídeos recentes (padrão 5; recomende no máximo 10 por vez).
- As transcrições ficam em `conhecimento/youtube/<canal>/` (**fora do git**: são material de estudo, não vão para o repositório).
- **Se der erro de rede (403 / "Unable to connect to proxy"):** o domínio `www.youtube.com` não está liberado no ambiente. Diga ao dono, em 2 linhas, para adicionar `www.youtube.com` em Network access do ambiente (menu do ambiente → Edit) e abrir uma sessão nova. Não tente contornar o bloqueio.
- Vídeo "SEM LEGENDA": avise; não invente o conteúdo.

### 2. Ler tudo antes de concluir
Leia **cada transcrição inteira**. Legenda automática tem erros de palavra: corrija pelo sentido e, se um trecho for ambíguo, não o use.

### 3. Escrever o caderno de conhecimento
Salve em `contexto/aprendizados/<AAAA-MM-DD>-<fonte>-<tema>.md` com esta estrutura:

```markdown
# <Tema>: aprendizados de <fonte>
> Fonte: <canal> · vídeos estudados: <N> · estudado em <data> · validade: revisar em 3 meses

## 1. Ideias centrais (5 a 10)
Cada ideia em 1 ou 2 frases, com o vídeo de origem (link) e o minuto aproximado, se possível.

## 2. Como aplicar no Hotel Cabanas
| Ideia | Aplicação concreta no Cabanas | Funcionário que usa |
Ligue às personas, às duas réguas de sazonalidade e aos indicadores do hotel (`contexto/cultura.md`).

## 3. O que NÃO se aplica ou exige cuidado
Ex.: táticas de infoproduto/lançamento que não servem para hotel; promessas de resultado; urgência falsa;
qualquer coisa que conflite com os valores (honestidade, sem imagem de IA, sem promessa absoluta).

## 4. Regras práticas (checklist)
3 a 8 regras curtas que um funcionário consegue seguir.

## 5. Fontes
Lista de vídeos: título, data, link.
```

Regras do caderno:
- **Síntese com as suas palavras.** Nunca copie trechos longos da transcrição nem material de curso pago; cite a fonte.
- **Fatos do hotel** continuam vindo só de `contexto/`. Um vídeo nunca vira fato sobre o Cabanas.
- Números do vídeo (ex.: "ROAS de 10x") entram como **opinião da fonte**, nunca como meta ou promessa.
- Separe o que é **regra de plataforma** (muda com o tempo: registre a data) do que é **princípio** (dura mais).

### 4. Propor a aplicação na equipe (via RH)
Ao terminar, mostre ao dono, em até ~150 palavras:
1. As 3 ideias mais úteis.
2. **Quais funcionários** devem receber o caderno e **o que muda** em cada um (ex.: "Estrategista: passa a ler este caderno antes de planos de tráfego").
3. A pergunta: **"Posso aplicar nos funcionários?"**

**Não edite `.claude/agents/` sem o "sim" do dono** (regra da RH). Com o "sim", acrescente o caderno na seção "Antes de qualquer tarefa, leia" do funcionário, guarde a versão anterior em `rh/avaliacoes/versoes/`, rode 1 teste rápido e registre no histórico do `rh/organograma.md`.

## Limites
- Só lê legendas; não baixa nem republica vídeos.
- Não usa o conteúdo para criar peças que imitem a pessoa do vídeo (nome, imagem, frases de efeito dela).
- Respeita a rede do ambiente: sem acesso liberado, para e avisa.
