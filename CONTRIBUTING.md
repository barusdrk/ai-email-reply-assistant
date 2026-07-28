# Contributing

Thank you for your interest in contributing to AI Email Reply Assistant.

## Getting Started

1. Fork the repository.
2. Clone your fork.
3. Install dependencies.
4. Create a feature branch.
5. Make your changes.
6. Run tests.
7. Submit a pull request.

---

## Development

Install dependencies.

```bash
npm install

cd client
npm install

cd ../server
npm install
```

Run the frontend.

```bash
cd client
npm run dev
```

Run the backend.

```bash
cd server
npm run dev
```

---

## Branch Naming

```
feature/add-gmail-search

feature/improve-ai-prompts

bugfix/login-validation

hotfix/oauth-callback
```

---

## Commit Messages

Examples

```
feat: add Outlook synchronization

fix: correct JWT validation

refactor: simplify draft service

docs: update deployment guide

test: add approval route tests
```

---

## Coding Standards

- Use TypeScript.
- Keep functions focused and small.
- Prefer async/await over promise chains.
- Avoid `any`.
- Use ESLint and Prettier.
- Write descriptive variable names.

---

## Pull Requests

Please ensure that your pull request:

- Builds successfully
- Passes all tests
- Includes documentation updates if needed
- Keeps unrelated changes out of the same PR

---

## Reporting Issues

When opening an issue, include:

- Operating system
- Node.js version
- Browser (if applicable)
- Steps to reproduce
- Expected behavior
- Actual behavior
- Error messages or logs

---

## Questions

Open a GitHub Discussion or Issue if you have questions about the project.

Thank you for contributing!
