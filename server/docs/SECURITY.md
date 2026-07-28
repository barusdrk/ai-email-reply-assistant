````md
# Security

## Authentication

- JWT Bearer Tokens
- Password hashing with bcrypt
- OAuth 2.0 for Gmail
- OAuth 2.0 for Outlook

---

## Authorization

Roles

- user
- reviewer
- admin

Protected endpoints require authentication.

---

## Password Storage

Passwords are never stored in plain text.

Use bcrypt with a minimum of 12 salt rounds.

---

## Environment Variables

Never commit:

- JWT_SECRET
- OPENAI_API_KEY
- GOOGLE_CLIENT_SECRET
- MICROSOFT_CLIENT_SECRET
- REDIS_URL
- MONGODB_URI

---

## CORS

Only allow trusted frontend origins.

```
CLIENT_URL=https://your-app.vercel.app
```

---

## Rate Limiting

Recommended

- Login
- Register
- AI Reply Generation
- OAuth Callback
- Webhooks

---

## Input Validation

Validate

- Email
- Tone
- Reply Length
- IDs
- Query Parameters

Recommended libraries

- Zod
- express-validator

---

## OAuth

Always

- Refresh expired access tokens
- Encrypt refresh tokens at rest if your threat model requires it
- Remove disconnected accounts

---

## Webhooks

Verify signatures before processing.

Ignore duplicate events.

---

## Logging

Never log

- Passwords
- JWT tokens
- Refresh tokens
- OpenAI API Keys

---

## HTTPS

Production deployments should always use HTTPS.

---

## Security Headers

Recommended

- Helmet
- HSTS
- CSP
- X-Frame-Options
- X-Content-Type-Options
````
