---
name: aws-ses-setup
description: Use this skill when the user asks to "configurar SES", "setup SES", "habilitar SES", "enable SES", "configurar email con AWS", "setup email sending", "agregar dominio a SES", "verify domain SES", "sacar SES de sandbox", "SES production access", or any variation involving setting up AWS SES for sending emails from a domain.
version: 0.1.0
---

# AWS SES Setup Skill

Configure AWS SES end-to-end for a domain: verify domain, set up DKIM/SPF/DMARC, configure MAIL FROM, and request production access. Fully automated via CLI — no AWS Console needed.

## Prerequisites

- AWS CLI v2 installed and configured with a named profile
- The domain/subdomain must have a Route 53 hosted zone in the same AWS account (for automatic DNS record creation)
- `aws sesv2` commands available (included in AWS CLI v2)

## Flujo de ejecución

### Paso 1: Recolectar configuración

If the user provided all parameters in their invocation message, extract them directly. Otherwise, use `AskUserQuestion` to gather what's missing (combine into 1–2 questions max):

| Variable | Pregunta | Default | Required |
|----------|---------|---------|----------|
| `{{DOMAIN}}` | ¿Qué dominio o subdominio querés configurar para enviar emails? | — | Yes |
| `{{MAIL_TYPE}}` | ¿Qué tipo de emails vas a enviar? (TRANSACTIONAL / MARKETING / MIXED) | TRANSACTIONAL | Yes |
| `{{AWS_PROFILE}}` | ¿Qué perfil de AWS CLI usar? | `default` | Yes |
| `{{AWS_REGION}}` | ¿En qué región de AWS configurar SES? | `us-east-1` | No |
| `{{CONTACT_EMAIL}}` | Email de contacto para la solicitud de producción y reportes DMARC | — | Yes |
| `{{WEBSITE_URL}}` | URL del sitio web (para la solicitud de producción) | `https://{{DOMAIN}}` | No |
| `{{USE_CASE}}` | Descripción breve del caso de uso (1-2 oraciones) | — | Yes |
| `{{DAILY_VOLUME}}` | Volumen estimado de emails por día | `100` | No |

**Examples of invocation with inline parameters:**
- `/ses-setup tele-medicina.curf.com.ar transactional profile:docnear` → extracts domain, mail type, and profile
- `/ses-setup example.com marketing emails for newsletter, ~500/day, contact: admin@example.com` → extracts all params from natural language

### Paso 2: Verificar estado actual

Before executing anything, check what already exists. Run ALL these checks in parallel:

```bash
# 2a — Check if domain identity already exists in SES
aws sesv2 get-email-identity --email-identity {{DOMAIN}} \
  --profile {{AWS_PROFILE}} --region {{AWS_REGION}} 2>&1

# 2b — Check account sandbox status
aws sesv2 get-account --profile {{AWS_PROFILE}} --region {{AWS_REGION}} \
  --query '{ProductionAccessEnabled: ProductionAccessEnabled, SendingEnabled: SendingEnabled}'

# 2c — Find Route 53 hosted zone for the domain
aws route53 list-hosted-zones --profile {{AWS_PROFILE}} \
  --query "HostedZones[?Name=='{{DOMAIN}}.']"

# 2d — List existing DNS records in the zone
aws route53 list-resource-record-sets \
  --hosted-zone-id {{HOSTED_ZONE_ID}} \
  --profile {{AWS_PROFILE}}
```

From these results, determine:
- `IDENTITY_EXISTS`: whether the SES identity already exists and its verification/DKIM status
- `SANDBOX_MODE`: whether the account is in sandbox (ProductionAccessEnabled = false)
- `HOSTED_ZONE_ID`: the Route 53 hosted zone ID for the domain
- `EXISTING_DNS`: which SES-related DNS records already exist (_domainkey, mail., _dmarc)

**If no Route 53 hosted zone found:** Inform the user that DNS records must be created manually and provide the records they need to add. Then continue with SES configuration only.

### Paso 3: Crear identidad del dominio en SES

**Check:** If `IDENTITY_EXISTS` is true and DKIM status is SUCCESS → skip this step and Paso 4.

**If identity does not exist:**
```bash
aws sesv2 create-email-identity \
  --email-identity {{DOMAIN}} \
  --profile {{AWS_PROFILE}} --region {{AWS_REGION}}
```

Save the 3 DKIM tokens from the response: `DkimAttributes.Tokens[]`.

**If identity exists but DKIM is PENDING or FAILED:** Extract tokens from existing identity:
```bash
aws sesv2 get-email-identity --email-identity {{DOMAIN}} \
  --profile {{AWS_PROFILE}} --region {{AWS_REGION}} \
  --query 'DkimAttributes.Tokens'
```

### Paso 4: Crear registros DKIM en Route 53

**Check:** For each of the 3 DKIM tokens, check if `<token>._domainkey.{{DOMAIN}}` CNAME already exists in `EXISTING_DNS`. Only create missing ones.

**For each missing DKIM record:**
```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id {{HOSTED_ZONE_ID}} \
  --profile {{AWS_PROFILE}} \
  --change-batch '{
    "Changes": [
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "<token>._domainkey.{{DOMAIN}}",
          "Type": "CNAME",
          "TTL": 300,
          "ResourceRecords": [{"Value": "<token>.dkim.amazonses.com"}]
        }
      }
    ]
  }'
```

Combine all missing DKIM records into a single `change-resource-record-sets` call.

### Paso 5: Configurar MAIL FROM personalizado

**Check:** If `IDENTITY_EXISTS` and `MailFromAttributes.MailFromDomain` is already `mail.{{DOMAIN}}` with status SUCCESS → skip.

**5a — Set MAIL FROM domain:**
```bash
aws sesv2 put-email-identity-mail-from-attributes \
  --email-identity {{DOMAIN}} \
  --mail-from-domain mail.{{DOMAIN}} \
  --profile {{AWS_PROFILE}} --region {{AWS_REGION}}
```

**5b — Create DNS records (if not already present):**

Check `EXISTING_DNS` for existing MX and TXT records on `mail.{{DOMAIN}}`. Only create missing ones:

```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id {{HOSTED_ZONE_ID}} \
  --profile {{AWS_PROFILE}} \
  --change-batch '{
    "Changes": [
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "mail.{{DOMAIN}}",
          "Type": "MX",
          "TTL": 300,
          "ResourceRecords": [{"Value": "10 feedback-smtp.{{AWS_REGION}}.amazonses.com"}]
        }
      },
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "mail.{{DOMAIN}}",
          "Type": "TXT",
          "TTL": 300,
          "ResourceRecords": [{"Value": "\"v=spf1 include:amazonses.com ~all\""}]
        }
      }
    ]
  }'
```

### Paso 6: Crear registro DMARC

**Check:** If `_dmarc.{{DOMAIN}}` TXT record already exists in `EXISTING_DNS` → skip.

```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id {{HOSTED_ZONE_ID}} \
  --profile {{AWS_PROFILE}} \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "_dmarc.{{DOMAIN}}",
        "Type": "TXT",
        "TTL": 300,
        "ResourceRecords": [{"Value": "\"v=DMARC1; p=none; rua=mailto:{{CONTACT_EMAIL}}\""}]
      }
    }]
  }'
```

### Paso 7: Esperar verificación DKIM

Poll every 30 seconds until DKIM status is SUCCESS (typically 1–5 minutes):

```bash
aws sesv2 get-email-identity --email-identity {{DOMAIN}} \
  --profile {{AWS_PROFILE}} --region {{AWS_REGION}} \
  --query 'DkimAttributes.Status' --output text
```

- If `SUCCESS` → continue
- If `PENDING` after 5 minutes → inform user it may take longer and continue with remaining steps
- If `FAILED` → stop and report the error

### Paso 8: Solicitar salida del sandbox

**Check:** If `SANDBOX_MODE` is false (ProductionAccessEnabled = true) → skip, inform user account is already in production.

```bash
aws sesv2 put-account-details \
  --production-access-enabled \
  --mail-type {{MAIL_TYPE}} \
  --website-url "{{WEBSITE_URL}}" \
  --use-case-description "{{USE_CASE}} Recipients are registered users of the platform. Bounces and complaints are handled via SES suppression lists. Expected volume: ~{{DAILY_VOLUME}} emails/day." \
  --additional-contact-email-addresses "{{CONTACT_EMAIL}}" \
  --contact-language EN \
  --profile {{AWS_PROFILE}} --region {{AWS_REGION}}
```

Inform user: AWS reviews this manually and takes **24–48 hours** to approve. While in sandbox, emails can only be sent to verified addresses.

### Paso 9: Verificar emails de test (sandbox only)

**Only if in sandbox.** Ask the user which email addresses to verify for testing:

```bash
aws sesv2 create-email-identity \
  --email-identity {{TEST_EMAIL}} \
  --profile {{AWS_PROFILE}} --region {{AWS_REGION}}
```

Inform user they'll receive a verification email they need to click.

### Paso 10: Test de envío

Send a test email to verify everything works:

```bash
aws sesv2 send-email \
  --from-email-address "no-reply@{{DOMAIN}}" \
  --destination '{"ToAddresses":["{{CONTACT_EMAIL}}"]}' \
  --content '{"Simple":{"Subject":{"Data":"SES Test - {{DOMAIN}}"},"Body":{"Text":{"Data":"This is a test email sent from AWS SES for {{DOMAIN}}. If you received this, SES is configured correctly."}}}}' \
  --profile {{AWS_PROFILE}} --region {{AWS_REGION}}
```

If in sandbox, the destination must be a verified email.

### Paso 11: Reportar resultado

Show a summary:

```
✅ AWS SES configured for {{DOMAIN}}

📧 Configuration:
  - Domain: {{DOMAIN}} (verified)
  - DKIM: ✓ enabled
  - SPF: ✓ (via MAIL FROM mail.{{DOMAIN}})
  - DMARC: ✓ (p=none, reports → {{CONTACT_EMAIL}})
  - MAIL FROM: mail.{{DOMAIN}}

🔒 Account status:
  - Production access: [enabled / pending approval (24-48h)]
  - Sandbox limits: 200 emails/day, 1/sec (until approved)

📋 DNS records created:
  - CNAME: <token1>._domainkey.{{DOMAIN}}
  - CNAME: <token2>._domainkey.{{DOMAIN}}
  - CNAME: <token3>._domainkey.{{DOMAIN}}
  - MX: mail.{{DOMAIN}} → feedback-smtp.{{AWS_REGION}}.amazonses.com
  - TXT: mail.{{DOMAIN}} → v=spf1 include:amazonses.com ~all
  - TXT: _dmarc.{{DOMAIN}} → v=DMARC1; p=none

🔜 Next steps:
  - [If sandbox] Wait for production access approval (24-48h)
  - Configure your application to send via SES (SMTP or AWS SDK)
  - SMTP endpoint: email-smtp.{{AWS_REGION}}.amazonaws.com (port 587/TLS)
  - To create SMTP credentials: aws sesv2 create-email-identity ...
```

## What this skill does NOT configure (and why)

- **VDM (Virtual Deliverability Manager)**: Optional paid feature for advanced deliverability monitoring. Not needed for <10k emails/day.
- **Dedicated IPs**: Only useful for very high volume (>100k/day). Shared IPs are fine for typical usage.
- **Mail Manager**: Enterprise email infrastructure management. Overkill for standard transactional email.
- **Configuration Sets**: Useful for tracking/metrics. Can be added later if needed.
- **SMTP credentials**: Application-specific, varies by integration method. Mentioned in next steps.

## Idempotency

Every step checks if the resource/record already exists before creating it. Running this skill multiple times on the same domain is safe — it will skip already-configured steps and only execute what's missing.
