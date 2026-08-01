````md
# Architecture

## Overview

The AI Email Reply Assistant follows a layered architecture.

```
React
    │
    ▼
Express Routes
    │
    ▼
Services
    │
    ▼
Repositories
    │
    ▼
MongoDB (Mongoose)
```

Background processing is handled by BullMQ.

```
Redis
   │
   ▼
BullMQ Queue
   │
   ▼
Jobs
```

Real-time updates use Socket.IO.

```
Server
   │
Socket.IO
   │
React Client
```

---

## Folder Structure

```
server/
├── config/
├── database/
├── docs/
├── dto/
├── jobs/
├── middleware/
├── models/
├── prompts/
├── queues/
├── repositories/
├── routes/
├── services/
├── templates/
├── types/
├── utils/
├── websocket/
└── index.ts
```

---

## Request Flow

```
HTTP Request
      │
      ▼
Authentication
      │
      ▼
Route
      │
      ▼
Validation
      │
      ▼
Service
      │
      ▼
Repository
      │
      ▼
MongoDB
```

---

## AI Reply Flow

```
Inbox Email
      │
      ▼
Prompt Builder
      │
      ▼
OpenAI GPT-5
      │
      ▼
Draft
      │
      ▼
Approval
      │
      ▼
Send
```

---

## Inbox Synchronization

```
Cron
 │
 ▼
Inbox Sync Job
 │
 ▼
Gmail / Outlook
 │
 ▼
MongoDB
 │
 ▼
Socket.IO
```

---

## Technologies

- TypeScript
- Express
- MongoDB
- Mongoose
- Redis
- BullMQ
- Socket.IO
- JWT
- OpenAI API
- Gmail API
- Microsoft Graph API
````
