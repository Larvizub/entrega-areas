Firebase Functions HTTP v1 for sending email via Microsoft Graph

Files:
- index.js: HTTP function `v1SendMail` (POST) expecting JSON: { subject, body, to, cc?, bcc?, from? }
- .env.example: example env vars and instructions

How it works:
- Uses OAuth2 client credentials against Azure AD to get an access token.
- Calls Graph API `POST /v1.0/users/{sender}/sendMail` to send mail with application permissions (Mail.Send).

Setup (recommended):
1. Register an app in Azure AD and grant it the **Mail.Send** application permission. Create a client secret.
2. Configure Firebase functions config (or set environment variables):

firebase functions:config:set \
  azure.tenant_id="YOUR_TENANT_ID" \
  azure.client_id="YOUR_CLIENT_ID" \
  azure.client_secret="YOUR_CLIENT_SECRET" \
  ms.from_user="sender@yourdomain.com" \
  security.functions_secret="A_SECRET_TO_PROTECT_ENDPOINT"

3. Deploy the function:

firebase deploy --only functions:v1SendMail

Security notes:
- The function accepts an optional header `x-functions-secret` (or `x-functions-token`) which must match `security.functions_secret` if set.
- Keep your Azure client secret safe and rotate regularly.

Usage example (call from frontend):

POST https://us-central1-YOUR_PROJECT.cloudfunctions.net/v1SendMail
Headers:
  Content-Type: application/json
  x-functions-secret: your-secret
Body:
{
  "subject": "Prueba desde Functions",
  "body": "<p>Hola! Este correo fue enviado desde Firebase Functions via Microsoft Graph.</p>",
  "to": ["dest1@example.com", "dest2@example.com"]
}
