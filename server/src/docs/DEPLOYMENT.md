````md
# Deployment Guide

## Requirements

- Node.js 22+
- MongoDB Atlas
- OpenAI API Key
- Google Cloud OAuth
- Microsoft Azure OAuth
- Redis
- Render or Railway
- Vercel (client)

---

## Environment Variables

```env
PORT=3001

CLIENT_URL=http://localhost:5173

MONGODB_URI=

JWT_SECRET=

OPENAI_API_KEY=

REDIS_URL=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=

MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_CALLBACK_URL=
```

---

## Install

```bash
npm install
```

---

## Development

```bash
npm run dev
```

---

## Build

```bash
npm run build
```

---

## Production

```bash
npm start
```

---

## Render

Build Command

```bash
npm install && npm run build
```

Start Command

```bash
npm start
```

---

## Vercel

Environment Variables

- VITE_API_URL
- VITE_SOCKET_URL

Build

```bash
npm run build
```

Output

```
dist
```

---

## Redis

Required for

- BullMQ
- Background jobs
- Inbox synchronization
- Automatic AI drafts

---

## MongoDB

Collections

- users
- connectedaccounts
- emails
- drafts
- approvals
- notifications
- auditlogs

---

## Background Jobs

- Inbox Sync (5 minutes)
- Auto Draft (2 minutes)
- Cleanup (daily)

---

## Health Check

GET

```
/health
```

Expected

```json
{
  "status":"ok"
}
```
````
