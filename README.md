# AI Email Reply Assistant

An AI-powered email assistant built with React, Express, TypeScript, MongoDB, BullMQ, Redis, Socket.IO, and the OpenAI API.

The application connects to Gmail and Outlook, synchronizes inboxes, generates AI-powered replies, supports approval workflows, and sends emails after approval.

---

## Features

### Authentication

- JWT authentication
- User registration
- User login
- Protected routes

### Email

- Gmail OAuth
- Outlook OAuth
- Inbox synchronization
- Read emails
- Search emails

### AI

- GPT-5 reply generation
- Multiple reply tones
- Multiple reply lengths
- Custom signatures
- Prompt templates

### Drafts

- AI draft generation
- Draft editing
- Save drafts
- Delete drafts

### Approval Workflow

- Request approval
- Approve drafts
- Reject drafts
- Reviewer comments

### Notifications

- Socket.IO
- Real-time updates
- Inbox synchronization
- Approval notifications

### Background Jobs

- BullMQ
- Redis
- Scheduled inbox synchronization
- Automatic draft generation
- Cleanup jobs

### Export

- PDF
- Microsoft Word (.docx)

---

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Axios
- React Router

### Backend

- Node.js
- Express
- TypeScript
- MongoDB
- Mongoose
- Redis
- BullMQ
- Socket.IO

### AI

- OpenAI API
- GPT-5

---

## Project Structure

```
client/
server/
README.md
LICENSE
```

---

## Installation

Clone the repository.

```bash
git clone https://github.com/barusdrk/ai-email-reply-assistant
```

Install dependencies.

```bash
npm install
```

Install client.

```bash
cd client
npm install
```

Install server.

```bash
cd ../server
npm install
```

---

## Environment Variables

Create a `.env` file inside the `server` directory.

```env
PORT=3001

CLIENT_URL=http://localhost:5173

MONGODB_URI=

JWT_SECRET=

OPENAI_API_KEY=

OPENAI_MODEL=gpt-5

REDIS_URL=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=

MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_CALLBACK_URL=
```

---

## Running

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

---

## Build

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

## API

| Method | Endpoint | Description |
|---------|----------|-------------|
| POST | /api/auth/register | Register |
| POST | /api/auth/login | Login |
| GET | /api/users/me | Current user |
| GET | /api/email | Inbox |
| POST | /api/reply | Generate AI reply |
| GET | /api/drafts | Drafts |
| GET | /api/approval | Approvals |

---

## WebSocket Events

### Server

- notification
- draft:ready
- approval:update
- inbox:sync

### Client

- draft:generate
- draft:approve
- inbox:sync

---

## Documentation

See:

- `server/docs/API.md`
- `server/docs/ARCHITECTURE.md`
- `server/docs/DEPLOYMENT.md`
- `server/docs/SECURITY.md`
- `server/docs/TESTING.md`
- `server/docs/PERFORMANCE.md`
- `server/docs/TROUBLESHOOTING.md`
- `server/docs/ROADMAP.md`
- `server/docs/CHANGELOG.md`
- `server/docs/CONTRIBUTING.md`

---

## Deployment

Frontend

- Vercel

Backend

- Render
- Railway

Database

- MongoDB Atlas

Queue

- Redis

---

## License

This project is licensed under the MIT License.

See the `LICENSE` file for details.

---

## Author

Derek Barus

GitHub: https://github.com/barusdrk
