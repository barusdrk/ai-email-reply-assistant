````md
# Contributing

## Requirements

- Node.js 22+
- npm
- MongoDB
- Redis

---

## Installation

```
npm install
```

---

## Development

Client

```
npm run dev
```

Server

```
npm run dev
```

---

## Coding Standards

- TypeScript
- ESLint
- Prettier

Use

- async/await
- strict typing
- Repository pattern

Avoid

- any
- duplicated code
- business logic in routes

---

## Branches

- main
- develop
- feature/*
- bugfix/*
- hotfix/*

---

## Commit Style

Examples

```
feat: add gmail sync

fix: websocket authentication

refactor: approval service

docs: update deployment guide
```

---

## Pull Requests

Every PR should

- Build successfully
- Pass tests
- Include documentation updates when applicable
- Include screenshots for UI changes

---

## Testing

Recommended

```
npm test
```

Coverage

- Services
- Routes
- Repositories
- Utilities

---

## Project Structure

```
Routes
    │
Services
    │
Repositories
    │
Models
```

Business logic belongs only in services.

---

## Code Review Checklist

- No secrets committed
- Strong typing
- Error handling
- Logging
- Validation
- Tests updated
- Documentation updated
````
