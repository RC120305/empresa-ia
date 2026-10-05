-- Documento do Gilberto: Taxa de Conservação Ambiental de Bonito (pedido do dono, 06/10/2026).
-- Fontes: Acqua Viagens, "Taxa de Turismo/Ambiental de Bonito" (atualizado em 08/01/2026), e resultados de busca de out/2026
-- (Prefeitura de Bonito, agências) que confirmam R$ 15 por pessoa por dia de passeio e o portal Turista por Natureza.
-- Entra "aguardando": o dono aprova em Ajustes do agente > 📚 Documentos. Pode rodar de novo (não duplica).
insert into gilberto_documentos (titulo, arquivo, tipo, resumo, conteudo, conflitos, alertas, situacao)
select 'Taxa ambiental de Bonito (TCA)', 'Acqua Viagens, blog (jan/2026) + busca de out/2026', 'texto',
  'A Taxa de Conservação Ambiental da Prefeitura: R$ 15 por pessoa por dia de passeio, quem é isento, como pagar no portal Turista por Natureza, e que o hotel não cobra.',
  $doc$## O que é
- A Taxa de Conservação Ambiental (TCA), também chamada de "taxa de turismo de Bonito", é uma taxa da Prefeitura de Bonito para quem visita a cidade.
- O dinheiro vai para a conservação ambiental do município: gestão de resíduos, reflorestamento, monitoramento dos rios, manutenção de estradas e educação ambiental.
- É da Prefeitura, não do hotel: o Hotel Cabanas não cobra nem recebe essa taxa.

## Valor e quando é cobrada
- R$ 15 por pessoa, por dia de passeio turístico (não por dia de hospedagem).
- Se a pessoa fizer mais de um passeio no mesmo dia, paga uma taxa só naquele dia.
- Exemplo: um casal que fica 4 noites e faz passeios em 2 dias paga 2 x R$ 15 por pessoa, ou seja, R$ 60 no total.

## Quem não paga
- Crianças até 6 anos.
- Moradores de Bonito, com comprovação.
- Trabalhadores em serviço no município.

## Como pagar
- Online, no portal oficial Turista por Natureza: https://turistapornatureza.com.br/
- No portal, a pessoa faz o cadastro, informa o período e os dias de passeio, e paga por Pix ou cartão de crédito ou débito (sem parcelamento).
- O ideal é pagar antes de chegar, para não atrasar a saída para os passeios. A agência de turismo também orienta na hora de reservar.

## Atividades dentro do hotel
- Se a taxa vale para quem fica só no hotel ou faz só a boia cross e o arvorismo daqui, a equipe confirma: não afirme ao cliente. Diga que a taxa é da Prefeitura, cobrada nos dias de passeio turístico, e que a equipe confirma o caso dele.

## Perguntas e respostas
- **P:** Tem taxa de turismo em Bonito?
  **R:** Tem, sim: é a Taxa de Conservação Ambiental, da Prefeitura de Bonito. São R$ 15 por pessoa por dia de passeio turístico (não por dia de hospedagem), e o valor vai para a preservação dos rios e da natureza da região.

- **P:** Como pago a taxa ambiental?
  **R:** É online, no portal oficial Turista por Natureza (turistapornatureza.com.br): você faz o cadastro, informa os dias de passeio e paga por Pix ou cartão. O ideal é pagar antes de chegar.

- **P:** O hotel cobra essa taxa? Ela já vem na diária?
  **R:** Não: a taxa é da Prefeitura e não entra no valor da hospedagem. Ela é paga pelo portal Turista por Natureza, nos dias em que você fizer passeios.

- **P:** Criança paga a taxa?
  **R:** Crianças até 6 anos não pagam. Moradores de Bonito também são isentos.

- **P:** Se eu fizer dois passeios no mesmo dia, pago duas vezes?
  **R:** Não: é uma taxa por pessoa por dia de passeio, mesmo que você faça mais de um passeio naquele dia.
$doc$,
  '["As fontes divergem sobre a data de início da taxa (2021 ou dezembro de 2025): a data ficou de fora."]'::jsonb,
  '["CONFIRMAR: o documento diz que o hotel não cobra a taxa e que ela não entra na diária (ela é paga no portal da Prefeitura). Se o hotel cobrar ou ajudar a cobrar, edite antes de aprovar.", "CONFIRMAR: a taxa vale para hóspede que fica só no hotel ou faz só a boia cross e o arvorismo do hotel? Até a resposta, o Gilberto diz que a equipe confirma.", "A Acqua cita um seguro contra acidentes de até R$ 20 mil incluído na taxa; só uma fonte traz isso, então ficou de fora.", "Valor e regras são da Prefeitura e podem mudar: conferir a cada 6 meses."]'::jsonb,
  'aguardando'
where not exists (select 1 from gilberto_documentos where titulo = 'Taxa ambiental de Bonito (TCA)');
