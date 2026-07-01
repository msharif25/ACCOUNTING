# CLAUDE.md

Guidance for AI assistants (and humans) working in this repository.

## What this project is

A small **double-entry accounting** web app. It has three TypeScript
workspaces wired together with npm workspaces:

- **`shared/`** — the domain types shared by the server and the web client,
  published internally as `@accounting/shared`.
- **`server/`** — an Express REST API plus the pure ledger logic that enforces
  accounting rules.
- **`web/`** — a Vite + React single-page app that talks to the API.

The core invariant of the whole system: **every journal entry must balance —
total debits equal total credits** — and **money is always integer cents**,
never floating-point dollars.

## Repository layout

```
ACCOUNTING/
├── package.json            # workspaces root; the scripts you run live here
├── tsconfig.base.json      # shared compiler options; each workspace extends it
├── .claude/settings.json   # SessionStart hook: runs `npm install` on web sessions
├── shared/
│   └── src/index.ts        # AccountType, Account, JournalEntry, TrialBalance, ...
├── server/
│   └── src/
│       ├── index.ts        # entry point: starts the HTTP listener
│       ├── app.ts          # createApp() factory (no port binding — used by tests)
│       ├── routes.ts       # HTTP routes + zod request validation
│       ├── store.ts        # in-memory data store + seed data (the ONLY mutable state)
│       └── domain/
│           ├── ledger.ts       # pure accounting logic (validate, balances, trial balance)
│           └── ledger.test.ts   # vitest unit tests for the ledger
└── web/
    ├── vite.config.ts      # dev server + `/api` proxy to :3001
    └── src/
        ├── main.tsx        # React root
        ├── App.tsx         # UI: trial balance + new-entry form
        ├── api.ts          # typed fetch wrapper over the REST API
        └── format.ts       # cents <-> display-string helpers
```

## Commands

Run all of these from the repository root.

| Command              | What it does                                              |
| -------------------- | --------------------------------------------------------- |
| `npm install`        | Install every workspace's dependencies                    |
| `npm run dev`        | Run the API (`:3001`) and web app (`:5173`) together      |
| `npm run dev:server` | Run only the API (tsx watch)                              |
| `npm run dev:web`    | Run only the web app (Vite)                               |
| `npm test`           | Run all workspace tests (vitest)                          |
| `npm run typecheck`  | Type-check every workspace with `tsc --noEmit`            |
| `npm run build`      | Type-check the server + produce the web production bundle |
| `npm run format`     | Format the repo with Prettier                             |

**Before committing, run `npm run typecheck` and `npm test`** — both must pass.
There is no separate lint step; type-checking + Prettier are the gate.

## Architecture and conventions

### Money is integer cents

All amounts — in the types, the store, the API payloads, and the ledger — are
**integer numbers of cents** (`$1,234.56` → `123456`). Never introduce
floating-point dollars into the domain or the wire format. Convert to/from a
decimal string **only at the UI boundary** using `web/src/format.ts`
(`formatCents`, `parseDollarsToCents`).

### Double-entry rules live in `server/src/domain/ledger.ts`

`ledger.ts` is **pure**: no Express types, no I/O, no dates-from-the-clock. It
owns the accounting rules and is the natural home for new logic (income
statements, balance sheets, account balances as-of a date, etc.). It is
directly unit-tested — add or update tests in `ledger.test.ts` alongside any
change here. Key pieces:

- `validateLines(lines)` → list of error strings (empty = valid). Enforces: ≥2
  lines, non-negative integer amounts, exactly one of debit/credit per line,
  and balanced totals.
- `accountBalance(account, entries)` → signed balance in the account's
  normal-balance direction.
- `trialBalance(accounts, entries)` → per-account net debit/credit rows plus
  totals and a `balanced` flag.

Account "normal balance" direction: **assets and expenses are debit-normal;
liabilities, equity, and income are credit-normal** (`DEBIT_NORMAL` /
`isDebitNormal`).

### Layering (keep these boundaries)

```
routes.ts   HTTP + zod validation  ── translates HTTP <-> domain, no business logic
   │
   ├─ domain/ledger.ts   pure accounting rules (unit-tested)
   └─ store.ts           the only mutable state; swap-in point for a real DB
```

- **Routes** validate input with zod and return `{ errors: string[] }` with a
  `400` on bad input; they never contain accounting math.
- **Store** is the single source of mutable state. It is in-memory today and
  reseeds on every restart; replacing it with SQLite/Postgres should not
  require touching `ledger.ts` or the routes' shapes.
- `app.ts` exposes `createApp(store?)` so tests can build an app with a fresh
  store and no open port.

### Shared types are the contract

`@accounting/shared` (`shared/src/index.ts`) is imported by both server and web.
When you change an API shape, update the type there **first**, then follow the
type errors through both sides. `New*` types (e.g. `NewJournalEntry`) are the
POST payloads where the server assigns the `id`.

### API surface

Base path `/api` (the web dev server proxies it to `:3001`):

| Method + path                     | Purpose                                     |
| --------------------------------- | ------------------------------------------- |
| `GET  /api/health`                | Liveness check                              |
| `GET  /api/accounts`              | List accounts                               |
| `POST /api/accounts`              | Create an account (`NewAccount`)            |
| `GET  /api/entries`               | List journal entries                        |
| `POST /api/entries`               | Create a balanced entry (`NewJournalEntry`) |
| `GET  /api/reports/trial-balance` | Trial balance report                        |

### TypeScript / module conventions

- ESM everywhere (`"type": "module"`). Relative imports use a **`.js`
  extension** even though the source is `.ts` (required by
  `verbatimModuleSyntax` + bundler resolution) — e.g.
  `import { Store } from './store.js'`.
- Import **types** with `import type { ... }`.
- `strict` mode plus `noUnusedLocals`/`noUnusedParameters` are on — keep the
  tree clean or type-checking fails.
- The server runs directly from TypeScript via `tsx`; there is no compiled
  `dist/` for it. `server`'s `build`/`typecheck` are both just `tsc --noEmit`.

## Adding things (quick recipes)

- **New report/calculation** → add a pure function to `domain/ledger.ts` + a
  test in `ledger.test.ts`, expose it via a `GET /api/reports/...` route, and
  render it in `web/src/App.tsx`.
- **New API field** → update the type in `shared/src/index.ts`, then the zod
  schema in `routes.ts`, then the store, then the web `api.ts`/UI.
- **New persisted entity** → extend `Store` (keep it the only mutable state)
  and add types to `shared`.

## Environment notes

- Node ≥ 20 (developed on Node 22). npm workspaces — always run scripts from
  the root.
- Web sessions auto-install dependencies via the `SessionStart` hook in
  `.claude/settings.json`.
- Data is in-memory and resets on server restart; there is no database or auth
  yet.
