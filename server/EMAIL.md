# SMTP Email Setup (Forever Faded)

The app uses **Nodemailer** with any SMTP provider. If SMTP is not configured, `sendMail` does nothing (no errors).

## Env vars (in `.env`)

| Variable     | Example        | Notes                          |
|-------------|----------------|---------------------------------|
| `SMTP_HOST` | `smtp.resend.com` | Provider’s SMTP host           |
| `SMTP_PORT` | `587`          | Usually 587 (TLS) or 465 (SSL)  |
| `SMTP_SECURE` | `false`      | `true` for port 465             |
| `SMTP_USER` | your login     | Often your API key or email     |
| `SMTP_PASS` | your secret    | API key or app password         |
| `MAIL_FROM` | `noreply@foreverfaded.com` | From address            |

## Updating the SMTP API key

1. Open **`server/.env`** in your editor.
2. Change **`SMTP_PASS`** to the new key (e.g. a new Resend API key from [resend.com/api-keys](https://resend.com/api-keys)):
   ```env
   SMTP_PASS=re_YourNewKeyHere
   ```
3. Save the file.
4. **Restart the server** (Ctrl+C, then `npm run dev` in the server folder) so it loads the new value.

`.env` is in `.gitignore`, so the key is not committed to git. Do not put the real key in `.env.example`.

## Recommended providers

### Resend (good default)
- **Free tier:** 3,000 emails/month  
- **SMTP:** `smtp.resend.com`, port `465`, secure `true`  
- **User:** `resend`  
- **Pass:** your [Resend API key](https://resend.com/api-keys)  
- **From:** must be a [verified domain](https://resend.com/domains) (e.g. `noreply@yourdomain.com`).  
  Resend requires domain verification to send; `onboarding@resend.dev` only works for testing to the account owner’s email.  

### SendGrid
- **Free tier:** 100 emails/day  
- **SMTP:** `smtp.sendgrid.net`, port `587`  
- **User:** `apikey`  
- **Pass:** your [SendGrid API key](https://app.sendgrid.com/settings/api_keys)  

### Gmail (dev / low volume)
- **Limit:** ~500/day (Gmail), 2000 (Workspace)  
- **SMTP:** `smtp.gmail.com`, port `587`  
- **User:** your Gmail address  
- **Pass:** [App Password](https://support.google.com/accounts/answer/185833) (2-Step Verification required)  
- Not ideal for production; use Resend/SendGrid for that.  

### Brevo (Sendinblue)
- **Free tier:** 300 emails/day  
- **SMTP:** `smtp-relay.brevo.com`, port `587`  
- **User/Pass:** from [SMTP & API](https://app.brevo.com/settings/keys/api)  

## Usage in code

```js
import { sendMail, isEmailConfigured } from './lib/email.js';

// Send (no-op if SMTP not set)
const result = await sendMail({
  to: 'client@example.com',
  subject: 'Appointment confirmed',
  text: 'Your cut is on Friday at 10am.',
});
if (result.sent) { /* ok */ } else { /* log result.error */ }

// Optional feature gate
if (isEmailConfigured()) {
  await sendMail({ to: user.email, subject: '...', text: '...' });
}
```

## Example `.env` (Resend)

```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=resend
SMTP_PASS=re_xxxxxxxxxxxx
MAIL_FROM=Forever Faded <noreply@yourdomain.com>
```

After editing `.env`, restart the server.

## Resend: email not sending?

1. **Verify a domain** at [resend.com/domains](https://resend.com/domains), then set `MAIL_FROM=noreply@yourdomain.com` (use your verified domain).
2. **Check server logs** when you book: you’ll see either `[appointments] confirmation email sent to …` or `[appointments] confirmation email failed: …` with the SMTP error.
3. **API key** must have “Send” permission; rotate the key if it was ever committed to git.

## Test from PowerShell (Windows)

In PowerShell, `curl` is an alias for `Invoke-WebRequest` and uses different syntax. Use one of these:

**Option A — Invoke-RestMethod (replace `YOUR_JWT` with a real token):**

```powershell
$headers = @{
  "Content-Type" = "application/json"
  "Authorization" = "Bearer YOUR_JWT"
}
$body = '{"to":"you@example.com"}'
Invoke-RestMethod -Uri "http://localhost:3001/api/admin/test-email" -Method POST -Headers $headers -Body $body
```

**Option B — curl with a JSON file (avoids PowerShell quoting issues):**

1. In the `server` folder, create `test-email-body.json` with: `{"to":"you@example.com"}`
2. Run (replace `YOUR_JWT` with your real JWT from browser `ff_token`):

```powershell
cd server
curl.exe -X POST http://localhost:3001/api/admin/test-email -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_JWT" -d "@test-email-body.json"
```
