# Accounting

A small double-entry accounting web app: a React + TypeScript frontend, an
Express + TypeScript REST API, and shared types. Amounts are stored as integer
cents; the ledger enforces that every journal entry balances (debits = credits).

## Quick start

```bash
npm install          # install all workspaces
npm run dev          # start API (:3001) and web (:5173) together
```

Then open http://localhost:5173.

## Workspace layout

| Path      | What it is                                              |
| --------- | ------------------------------------------------------- |
| `shared/` | Types shared by server and web (`@accounting/shared`)   |
| `server/` | Express REST API and the pure double-entry ledger logic |
| `web/`    | Vite + React single-page app                            |

## Common commands

```bash
npm run dev          # run server + web
npm test             # run all workspace tests (vitest)
npm run typecheck    # type-check every workspace
npm run build        # type-check server + build web bundle
npm run format       # format with Prettier
```

See [CLAUDE.md](./CLAUDE.md) for architecture and conventions.
