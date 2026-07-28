# Security Policy

## Supported Versions

Security updates are provided for the latest released version of the project.

| Version | Supported |
|---------|-----------|
| Latest | ✅ |
| Older releases | ❌ |

---

## Reporting a Vulnerability

Please do **not** create a public GitHub issue for suspected security vulnerabilities.

Instead, contact the project maintainer privately with:

- Description of the issue
- Steps to reproduce
- Potential impact
- Proof of concept (if available)

The report should include enough information for the issue to be reproduced and verified.

---

## Response Process

After receiving a report, the maintainer will aim to:

1. Acknowledge receipt.
2. Investigate the issue.
3. Develop and test a fix.
4. Release a patched version when appropriate.
5. Publicly disclose the issue after a fix is available, when appropriate.

---

## Security Best Practices

When deploying this project:

- Use HTTPS.
- Keep dependencies updated.
- Store secrets in environment variables.
- Rotate API keys when necessary.
- Use strong JWT secrets.
- Restrict CORS to trusted origins.
- Enable rate limiting.
- Validate all user input.
- Verify webhook signatures.
- Monitor logs for suspicious activity.

---

## Scope

This policy covers:

- Authentication
- Authorization
- API endpoints
- OAuth integrations
- Background workers
- WebSocket connections
- AI request handling
- Third-party service integrations

Thank you for helping improve the security of this project.
