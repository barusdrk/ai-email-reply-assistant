# AI Email Reply Assistant

AI Email Reply Assistant is a full-stack AI SaaS application that generates professional customer email replies using either OpenAI or Google Gemini. Users can connect email providers, manage drafts, submit replies for approval, and upgrade subscription plans.

---

# Features

## AI

- AI-generated customer email replies
- OpenAI support
- Google Gemini support
- Custom tone selection
- Reply length selection
- Email summarization
- Email classification
- User-provided API keys
- Switch AI provider

---

## Authentication

- Register
- Login
- JWT authentication
- Password hashing
- User profile
- Logout

---

## Email

- Gmail OAuth
- Outlook OAuth
- Inbox
- Read email
- Sent emails
- Drafts
- Reply generation

---

## Draft Workflow

- Save draft
- Edit draft
- Delete draft
- Submit for approval
- Approve draft
- Reject draft

---

## Billing

- Free plan
- Starter plan
- Pro plan
- Subscription management
- Plan limits
- Bring Your Own API Key support

---

## Settings

- AI provider selection
- OpenAI API Key
- Gemini API Key
- Default tone
- Default reply length
- Temperature
- Signature

---

## Realtime

- Socket.IO
- Live draft updates
- Approval notifications

---

## UI

- React
- TypeScript
- Vite
- Tailwind CSS
- Dark mode
- Responsive layout

---

# Tech Stack

## Frontend

- React 19
- TypeScript
- Vite
- Axios
- React Router
- Tailwind CSS
- Socket.IO Client

---

## Backend

- Node.js
- Express
- TypeScript
- MongoDB
- Mongoose
- JWT
- Socket.IO
- BullMQ
- Redis

---

## AI

- OpenAI Responses API
- Google Gemini API

---

# Project Structure

```
ai-email-reply-assistant/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── types/
│   │   └── App.tsx
│   │
│   ├── package.json
│   └── vite.config.ts
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── repositories/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── templates/
│   │   └── index.ts
│   │
│   ├── .env.example
│   └── package.json
│
└── README.md
```

---

# Installation

Clone the repository.

```bash
git clone https://github.com/YOUR_USERNAME/ai-email-reply-assistant.git

cd ai-email-reply-assistant
```

Install dependencies.

```bash
npm install
```

Install frontend dependencies.

```bash
cd client

npm install
```

Install backend dependencies.

```bash
cd ../server

npm install
```

---

# Environment Variables

Create:

```
server/.env
```

using:

```
server/.env.example
```

---

# Run Locally

Backend

```bash
cd server

npm run dev
```

Frontend

```bash
cd client

npm run dev
```

Frontend:

```
http://localhost:5173
```

Backend:

```
http://localhost:3001
```

---

# Build

Frontend

```bash
cd client

npm run build
```

Backend

```bash
cd server

npm run build
```

---

# Production Deployment

## Frontend

Deploy to:

- Vercel
- Netlify

Required environment variables:

```
VITE_API_URL
```

Example:

```
VITE_API_URL=https://your-api.onrender.com/api
```

---

## Backend

Deploy to:

- Render
- Railway
- Fly.io

Required environment variables include:

```
NODE_ENV
PORT
CLIENT_URL
MONGODB_URI
REDIS_URL
JWT_SECRET

OPENAI_API_KEY
OPENAI_MODEL

GOOGLE_AI_API_KEY

GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_CALLBACK_URL

MICROSOFT_CLIENT_ID
MICROSOFT_CLIENT_SECRET
MICROSOFT_CALLBACK_URL

ENCRYPTION_KEY
```

---

# API

## Authentication

```
POST /api/auth/register
```

```
POST /api/auth/login
```

```
GET /api/auth/me
```

---

## Reply

```
POST /api/reply
```

---

## Emails

```
GET /api/emails
```

```
GET /api/emails/:id
```

```
POST /api/emails/send/:draftId
```

---

## Drafts

```
GET /api/drafts
```

```
POST /api/drafts
```

```
PUT /api/drafts/:id
```

```
DELETE /api/drafts/:id
```

---

## Approvals

```
POST /api/drafts/:id/submit
```

```
POST /api/drafts/:id/approve
```

```
POST /api/drafts/:id/reject
```

---

## Settings

```
GET /api/settings
```

```
PUT /api/settings
```

---

## Billing

```
GET /api/billing
```

```
POST /api/billing/upgrade
```

---

# Plans

## Free

- Bring your own OpenAI key
- Bring your own Gemini key
- Unlimited AI usage using your own keys

---

## Starter

- Platform-managed API keys
- Higher usage limits
- Faster responses

---

## Pro

- Unlimited platform AI
- Priority processing
- Premium support
- Advanced analytics

---

# License

MIT License

---

## Author

Derek Barus

GitHub: https://github.com/barusdrk
