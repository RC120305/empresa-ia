# E-mail de acesso ao CRM (Supabase Auth)

## SMTP do hotel (pendente: Márcio)
1. Criar a caixa **crm@hotelcabanas.com.br** (ou naoresponda@) só para o sistema.
2. Supabase → Authentication → Emails → **SMTP Settings** → Enable Custom SMTP: sender `crm@hotelcabanas.com.br`, nome "Hotel Cabanas", host/porta do provedor, usuário = e-mail completo, senha digitada direto no Supabase (nunca no chat nem no repositório).
3. Authentication → **Rate Limits** → e-mails por hora: 30.

## Modelos em português (Authentication → Emails → Templates)

**Magic Link** — Assunto: `Seu link de acesso ao CRM Cabanas`
```html
<h2>Acesso ao CRM Cabanas</h2>
<p>Olá! Para entrar na caixa de entrada do Hotel Cabanas, toque no botão abaixo.</p>
<p><a href="{{ .ConfirmationURL }}">Entrar no CRM</a></p>
<p>Ou digite este código na tela de entrada (no iPhone, use o código para entrar pelo CRM instalado na tela inicial):</p>
<p style="font-size:24px;font-weight:bold;letter-spacing:4px">{{ .Token }}</p>
<p>O link e o código valem por pouco tempo e só o mais recente funciona. Se você não pediu este acesso, ignore este e-mail.</p>
```

**Invite user** — Assunto: `Você foi convidado para o CRM Cabanas`
```html
<h2>Bem-vindo ao CRM Cabanas</h2>
<p>Você foi convidado para a equipe de atendimento do Hotel Cabanas.</p>
<p><a href="{{ .ConfirmationURL }}">Aceitar o convite e entrar</a></p>
<p>Depois do primeiro acesso, é só abrir https://crm-377803250649.southamerica-east1.run.app/caixa e pedir o link pelo seu e-mail.</p>
```
