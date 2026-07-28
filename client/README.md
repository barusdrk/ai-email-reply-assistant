# AI Email Reply Assistant

An AI-powered full-stack application that generates professional customer email replies.

Users can paste a customer's email, select a preferred tone and reply length, customize their signature, and generate a polished response using AI.

---

## Features

### AI Email Generation

* Generate professional email replies.
* Supports multiple tones:

  * Friendly
  * Formal
  * Concise

### Reply Customization

* Select reply length:

  * Short
  * Medium
  * Long

* Customize email signature.

Example:

```
John Smith
Customer Support Team
```

### Export Replies

Download generated replies as:

* PDF
* DOCX

### Authentication

* JWT-based authentication.
* Protected API routes.
* Login system.
* Logout functionality.

### User Interface

* Responsive React interface.
* Dark mode support.
* Loading states.
* Error handling.

---

# Tech Stack

## Frontend

* React
* TypeScript
* Vite
* Tailwind CSS

## Backend

* Node.js
* Express
* TypeScript
* JWT Authentication

## AI

* OpenAI API

## Utilities

* Zod validation
* DOCX generation
* PDF generation

---

# Project Structure

```text
ai-email-reply-assistant

├── client
│   ├── src
│   │   ├── components
│   │   │   ├── EmailInput.tsx
│   │   │   ├── LengthSelector.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── LoginForm.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── ReplyCard.tsx
│   │   │   ├── SignatureInput.tsx
│   │   │   └── ToneSelector.tsx
│   │   │
│   │   ├── services
│   │   │   ├── api.ts
│   │   │   └── auth.ts
│   │   │
│   │   ├── utils
│   │   │   ├── downloadDocx.ts
│   │   │   └── downloadPdf.ts
│   │   │
│   │   ├── App.tsx
│   │   └── main.tsx
│   │
│   ├── package.json
│   └── vite.config.ts
│
└── server
    ├── middleware
    │   └── auth.ts
    │
    ├── prompts
    │   └── emailPrompt.ts
    │
    ├── routes
    │   ├── auth.ts
    │   └── reply.ts
    │
    ├── services
    │   ├── auth.ts
    │   └── openai.ts
    │
    ├── templates
    │   └── tones.ts
    │
    └── index.ts
```

---

# Installation

## Clone repository

```bash
git clone <repository-url>

cd ai-email-reply-assistant
```

---

# Backend Setup

Go to server:

```bash
cd server
```

Install dependencies:

```bash
npm install
```

Create:

```
server/.env
```

Add:

```env
OPENAI_API_KEY=your_openai_api_key

JWT_SECRET=your_secret_key

PORT=3001
```

Start server:

```bash
npm run dev
```

Server runs:

```
http://localhost:3001
```

---

# Frontend Setup

Open another terminal:

```bash
cd client
```

Install dependencies:

```bash
npm install
```

Start React application:

```bash
npm run dev
```

Frontend runs:

```
http://localhost:5173
```

---

# Authentication

Demo account:

```
Email:
demo@example.com

Password:
password123
```

Login returns a JWT token.

The token is stored in local storage and automatically attached to protected API requests.

---

# API Endpoints

## Health Check

```
GET /
```

Response:

```json
{
  "message": "AI Email Reply Assistant API is running."
}
```

---

## Login

```
POST /api/auth/login
```

Request:

```json
{
  "email": "demo@example.com",
  "password": "password123"
}
```

Response:

```json
{
  "token": "jwt_token"
}
```

---

## Generate Reply

```
POST /api/reply
```

Headers:

```
Authorization: Bearer JWT_TOKEN
```

Request:

```json
{
  "email": "Customer email",
  "tone": "friendly",
  "length": "medium",
  "signature": "Customer Support"
}
```

Response:

```json
{
  "reply": "Generated AI reply"
}
```

---

# Environment Variables

## Server

```
OPENAI_API_KEY
JWT_SECRET
PORT
```

## Client

No environment variables required for development.

---

# Development Commands

## Client

Run:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

---

## Server

Run:

```bash
npm run dev
```

---

## Author

Derek Barus

GitHub: https://github.com/barusdrk
