# AI Email Reply Assistant

AI Email Reply Assistant is a full-stack AI SaaS application that generates professional customer email replies, uses conversation context and knowledge-base information, evaluates reply confidence and policy compliance, and routes drafts through automated approval or human-review workflows. Users can connect email providers, manage drafts, submit replies for approval, and upgrade subscription plans.

---

## Features

* AI-powered email reply generation
* Multiple reply tones:

  * Professional
  * Friendly
  * Formal
  * Concise
  * Empathetic
  * Enthusiastic
* Short, medium, and long reply lengths
* User authentication
* Gmail integration
* Outlook integration
* Inbox synchronization
* Email thread and conversation memory
* Knowledge-base context
* AI confidence scoring
* Policy compliance checking
* Human approval queue
* Automatic escalation
* Automatic actions
* Draft creation and editing
* Draft approval and rejection
* Email sending
* Audit logging
* Notifications
* Dark mode
* Responsive interface
* TypeScript backend and frontend
* MongoDB persistence
* Automated tests

## AI Workflow

```text
Customer Email
      ↓
Conversation Memory
      ↓
Knowledge Base
      ↓
AI Reply Generation
      ↓
Confidence Scoring
      ↓
Policy Check
      ↓
Automatic Action
      ↓
┌─────────────┬─────────┬───────────┬─────────┐
│ Auto Approve│ Pending │ Escalate  │ Blocked │
└──────┬──────┴────┬────┴─────┬─────┴─────────┘
       ↓           ↓          ↓
   Approved     Human      Human Review
       ↓         Review         ↓
     Send       Required      Rejected
```

The system is designed so that low-confidence, sensitive, or policy-related messages can be prevented from being sent automatically.

## 10-Step Roadmap

### 1. AI Email Reply Generation

Generate replies from customer emails using configurable tone and length.

Supported tones include professional, friendly, formal, concise, empathetic, and enthusiastic.

### 2. Authentication

Protect user-specific functionality with authentication and user-scoped data.

### 3. Gmail and Outlook Integration

Connect supported email providers and synchronize inbox messages.

### 4. Draft Management

Create, edit, approve, reject, send, and delete generated drafts.

### 5. Knowledge Base

Retrieve relevant knowledge-base information and provide it as context for AI-generated replies.

### 6. Confidence Scoring

Evaluate generated replies and assign:

```text
High
Medium
Low
```

The confidence result includes a score and supporting reasons.

### 7. Human Approval Queue

Allow generated drafts to enter a human review workflow before they are sent.

### 8. Automatic Escalation

Automatically escalate messages containing conditions such as:

* Low-confidence replies
* Refund requests
* Chargeback disputes
* Cancellation requests
* Legal issues
* Potential lawsuits
* Customer complaints
* Account security issues
* Account access issues
* Privacy requests
* Billing issues
* Policy warnings

### 9. Conversation Memory

Use previous messages from the same email thread to provide conversational context when generating a reply.

### 10. Automatic Actions

Determine the appropriate action after confidence and policy evaluation:

```text
auto_approve
pending
escalate
blocked
```

Policy violations take priority over automatic approval, while sensitive or escalation conditions take priority over high confidence.

## Safety and Review

The application does not treat AI confidence as the only decision factor.

The workflow evaluates:

1. Customer email
2. Conversation history
3. Knowledge-base context
4. Generated reply
5. Confidence score
6. Policy compliance
7. Escalation conditions
8. Automatic action

For example:

```text
High confidence + compliant
        ↓
    Auto approve

Medium confidence
        ↓
      Pending

Low confidence
        ↓
     Escalate

Policy violation
        ↓
      Block

Sensitive request
        ↓
     Escalate
```

This creates a human-in-the-loop workflow for situations where automated responses may be inappropriate.

## Tech Stack

### Frontend

* React
* TypeScript
* Vite
* React Router
* Tailwind CSS
* Lucide React

### Backend

* Node.js
* Express
* TypeScript
* MongoDB
* Mongoose
* JWT authentication

### AI

The application uses an AI provider abstraction that supports multiple providers and selects a provider based on the user's subscription plan.

Supported provider architecture:

```text
AI Provider Factory
        ↓
┌────────┬────────┬────────┬────────┐
│ OpenAI │ Gemini │  Groq  │ Claude │
└────────┴────────┴────────┴────────┘
```

### Integrations

* Gmail
* Outlook
* Email synchronization
* Email thread handling

### Testing

* Node.js test runner
* Automated confidence tests
* Policy tests
* Escalation tests
* Automatic-action tests

## Project Structure

```text
ai-email-reply-assistant/
├── client/
│   └── src/
│       ├── components/
│       ├── hooks/
│       ├── pages/
│       ├── services/
│       ├── types/
│       └── index.css
├── server/
│   └── src/
│       ├── ai/
│       │   ├── prompts/
│       │   ├── factory.ts
│       │   └── types.ts
│       ├── middleware/
│       ├── models/
│       ├── repositories/
│       ├── routes/
│       ├── services/
│       │   ├── confidenceScoring.ts
│       │   ├── conversationMemory.ts
│       │   ├── escalation.ts
│       │   ├── automaticActions.ts
│       │   ├── knowledgeBase.ts
│       │   ├── policyChecker.ts
│       │   └── drafts.ts
│       └── types/
├── package.json
└── README.md
```

## Automatic Action Logic

The automatic-action system evaluates policy before confidence-based automation.

```text
Policy violation
      ↓
    Block

Escalation condition
      ↓
   Escalate

High confidence + compliant
      ↓
  Auto approve

Otherwise
      ↓
   Pending
```

This prevents a high confidence score from overriding a policy violation or escalation condition.

## Testing

The project currently has **26 automated tests passing**.

```text
ℹ tests 26
ℹ pass 26
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

The tests cover:

* High-confidence automatic approval
* Medium-confidence pending status
* Low-confidence escalation
* Refund escalation
* Chargeback disputes
* Cancellation requests
* Legal issues
* Potential lawsuits
* Customer complaints
* Account security
* Account access
* Privacy requests
* Billing issues
* Policy warnings
* Policy violations
* Multiple escalation reasons
* Case-insensitive escalation matching
* Automatic-action priority rules

## Environment Variables

Create environment files for the client and server according to the deployment environment.

Typical server configuration includes:

```env
PORT=3001
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
```

Provider-specific OAuth and AI configuration should also be supplied through environment variables.

**Do not commit secrets, OAuth credentials, API keys, or production tokens to Git.**

## Portfolio Highlights

This project demonstrates practical full-stack development beyond a simple AI API integration.

### Frontend

* React application architecture
* TypeScript
* Reusable components
* Custom hooks
* API service layer
* Routing
* Responsive UI
* Dark mode
* Form and state management

### Backend

* REST API architecture
* Express middleware
* Authentication
* Repository pattern
* MongoDB/Mongoose data modeling
* Service-layer architecture
* Provider abstraction
* Email integrations
* Background workflows

### AI Engineering

* Prompt engineering
* Context injection
* Knowledge-base retrieval
* Conversation memory
* Confidence scoring
* Policy validation
* Human-in-the-loop AI
* Automatic escalation
* Automatic decision workflows

### Software Engineering

* Type-safe interfaces
* Separation of concerns
* Validation
* Error handling
* Automated testing
* Audit logging
* Production-oriented architecture

---

# Installation

Fork and clone the repository.

```bash
git clone https://github.com/YOUR_USERNAME/ai-email-reply-assistant.git

cd ai-email-reply-assistant
```

Install dependencies.

```bash
npm install
```

Install frontend dependencies. From root directory:

```bash
cd client

npm install
```

Install backend dependencies. From client directory:

```bash
cd ../server

npm install
```

---

# Environment Variables

From server directory, create:

```bash
cp .env.example .env
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

## Test

Run the test suite:

```bash
npm test
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

* Bring your own OpenAI key
* Bring your own Gemini key
* Unlimited AI usage using your own keys

---

## Starter

* Platform-managed API keys
* Higher usage limits
* Faster responses

---

## Pro

* Unlimited platform AI
* Priority processing
* Premium support
* Advanced analytics

---

# License

MIT License

---

## Author

**Derek Barus**

GitHub: [@barusdrk](https://github.com/barusdrk)
