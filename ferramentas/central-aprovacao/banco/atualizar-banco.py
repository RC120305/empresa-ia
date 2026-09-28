"""Atualiza o banco da Central a partir de uma varredura do Drive.

Uso: python3 atualizar-banco.py <drive-scan.json>
drive-scan.json: lista de {id, nome, pasta, pastaId, caminho} com TODAS as imagens
da pasta "Imagens do hotel cabanas" (varredura recursiva feita pelo Drive MCP).
- Mantém a ordem e os dados das fotos que já estavam em banco.json.
- Acrescenta as novas (as que têm miniatura em mini/<id>.jpg) e marca "novaEm".
- Tira do banco as fotos que não existem mais no Drive.
- Grava novas-AAAA-MM-DD.md com a lista das fotos acrescentadas (para o inventário).
Depois: regenerar e republicar a Central (gerar.py junta as miniaturas em folhas).
"""
import datetime, json, os, sys

aqui = os.path.dirname(os.path.abspath(__file__))
scan = json.load(open(sys.argv[1], encoding="utf-8"))
banco = json.load(open(f"{aqui}/banco.json", encoding="utf-8"))
no_drive = {x["id"]: x for x in scan}
hoje = datetime.date.today().isoformat()

mantidas = [b for b in banco if b["id"] in no_drive]
removidas = [b for b in banco if b["id"] not in no_drive]
ja = {b["id"] for b in banco}
novas, sem_mini = [], []
for x in scan:
    if x["id"] in ja:
        continue
    if not os.path.exists(f"{aqui}/mini/{x['id']}.jpg"):
        sem_mini.append(x); continue
    pasta = x.get("pasta") or "Outras"
    novas.append({"id": x["id"], "nome": x["nome"], "pasta": pasta, "novaEm": hoje})

json.dump(novas + mantidas, open(f"{aqui}/banco.json", "w", encoding="utf-8"), ensure_ascii=False, indent=0)
with open(f"{aqui}/novas-{hoje}.md", "w", encoding="utf-8") as f:
    f.write(f"# Fotos acrescentadas ao banco em {hoje}\n\n| Arquivo | ID | Pasta |\n|---|---|---|\n")
    for n in novas:
        f.write(f"| {n['nome']} | `{n['id']}` | {n['pasta']} |\n")
print(f"banco: {len(novas) + len(mantidas)} fotos ({len(novas)} novas, {len(removidas)} removidas, {len(sem_mini)} novas sem miniatura)")
for x in sem_mini:
    print("  sem miniatura:", x["id"], x["nome"])
