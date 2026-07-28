# AI Email Reply Assistant — Agent Instructions

This repository is a TypeScript monorepo with two main workspaces:
- `client/`: React + Vite frontend
- `server/`: Express backend with MongoDB, BullMQ, Redis, OAuth, and OpenAI integration

## What is important for code changes

- Keep changes scoped to the correct workspace. Do not mix frontend-only changes into `server/` and vice versa unless the feature explicitly requires both.
- The backend is CommonJS TypeScript and the frontend is ESM TypeScript.
- Use existing patterns in `server/routes`, `server/services`, `server/repositories`, and `server/models` for API and business logic.
- Use `client/src/components`, `client/src/hooks`, `client/src/services`, and `client/src/pages` for UI and client-side state.
- Background jobs and async services are implemented in `server/jobs`, `server/queues`, and `server/services`.

## Key commands

Run from repo root:
- `npm install` — install workspace dependencies
- `npm run dev` — start client and server concurrently
- `npm run build` — build client and server
- `npm run lint` — run frontend and backend linting
- `npm run test` — run frontend and backend tests
- `npm run format` — format the repo with Prettier

Run workspace-specific commands:
- `npm run dev --workspace client`
- `npm run dev --workspace server`
- `npm run build --workspace client`
- `npm run build --workspace server`

## Project conventions

- Use TypeScript everywhere.
- Prefer `async` / `await` over raw promise chains.
- Avoid `any` unless there is a strong justification.
- Keep functions focused and small.
- Follow ESLint and Prettier formatting.
- For backend routes, validation and auth usually happen via middleware in `server/middleware`.
- The backend uses JWT auth, OAuth connectors, and Socket.IO for realtime notifications.

## Documentation references

Link to existing docs rather than duplicating details:
- Root project overview: [`README.md`](README.md)
- Contribution and coding standards: [`CONTRIBUTING.md`](CONTRIBUTING.md)
- Backend architecture and request flow: [`server/docs/ARCHITECTURE.md`](server/docs/ARCHITECTURE.md)
- Deployment and environment setup: [`server/docs/DEPLOYMENT.md`](server/docs/DEPLOYMENT.md)

## When adding features or fixing bugs

- Check for existing server routes and service functions before adding new ones.
- Reuse prompt/template logic from `server/prompts` and `server/templates` when modifying AI reply generation or draft flows.
- For UI updates, follow existing component and page organization in `client/src`.
- Do not hardcode secrets or API keys in the repository.
- Changes that require environment configuration should mention the necessary `.env` values and any required update to docs.

## Notes for agent behavior

- Prefer minimal, safe changes that match current project structure.
- If unsure how to wire a feature, inspect the existing `server/` and `client/` architecture and use the established route/service/component chain.
- Avoid introducing new architectural layers unless there is a clear need.
- Keep instructions and code aligned with the monorepo workspace layout.
