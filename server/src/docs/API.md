````md
# AI Email Reply Assistant API

## Authentication

### POST /api/auth/register

Registers a user.

### POST /api/auth/login

Returns

```json
{
  "token":"JWT_TOKEN",
  "user":{}
}
```

---

## User

### GET /api/users/me

Returns current user.

### PATCH /api/users/me

Updates profile.

---

## Gmail

GET /api/gmail/connect

GET /api/gmail/callback

POST /api/gmail/sync

---

## Outlook

GET /api/outlook/connect

GET /api/outlook/callback

POST /api/outlook/sync

---

## Emails

GET /api/email

GET /api/email/:id

DELETE /api/email/:id

---

## AI Reply

POST /api/reply

Request

```json
{
  "email":"Customer email",
  "tone":"professional",
  "length":"medium"
}
```

Response

```json
{
  "reply":"Generated reply..."
}
```

---

## Drafts

GET /api/drafts

POST /api/drafts

PATCH /api/drafts/:id

DELETE /api/drafts/:id

---

## Approvals

GET /api/approval

POST /api/approval/:id/approve

POST /api/approval/:id/reject

---

## Webhooks

POST /api/webhook/gmail

POST /api/webhook/outlook

---

## WebSocket Events

Server

- notification
- draft:ready
- approval:update
- inbox:sync

Client

- inbox:sync
- draft:generate
- draft:approve
- ping
````
