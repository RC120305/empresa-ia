-- 028: condições comerciais de cada agência/operadora (dono, 10/10/2026)
-- Comissão já existe (agencias.comissao). Aqui: se cobra sinal e quanto, se fatura o restante e em quantos dias.
-- Pode rodar de novo sem estragar nada.
alter table agencias add column if not exists cobra_sinal boolean not null default true;   -- pede sinal para garantir a reserva
alter table agencias add column if not exists sinal_percentual numeric(5,2);               -- % do total (ex.: 30)
alter table agencias add column if not exists fatura boolean not null default false;       -- o restante é faturado para a agência
alter table agencias add column if not exists fatura_prazo_dias int;                       -- vencimento da fatura: dias depois do check-out
