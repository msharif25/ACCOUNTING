/**
 * HTTP routes. Request bodies are validated with zod; accounting invariants are
 * enforced by the pure `ledger` functions. Handlers translate between HTTP and
 * the `Store` — they contain no business logic themselves.
 */
import { Router } from 'express';
import { z } from 'zod';
import { ACCOUNT_TYPES } from '@accounting/shared';
import type { Store } from './store.js';
import { trialBalance, validateLines } from './domain/ledger.js';

const newAccountSchema = z.object({
  name: z.string().trim().min(1, 'name is required'),
  type: z.enum(ACCOUNT_TYPES as unknown as [string, ...string[]]),
});

const lineSchema = z.object({
  accountId: z.string().min(1),
  debit: z.number().int().nonnegative(),
  credit: z.number().int().nonnegative(),
});

const newEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  description: z.string().trim().min(1, 'description is required'),
  lines: z.array(lineSchema).min(2, 'an entry needs at least two lines'),
});

export function createRouter(store: Store): Router {
  const router = Router();

  router.get('/accounts', (_req, res) => {
    res.json(store.listAccounts());
  });

  router.post('/accounts', (req, res) => {
    const parsed = newAccountSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.issues.map((i) => i.message) });
    }
    const account = store.createAccount(parsed.data as Parameters<Store['createAccount']>[0]);
    res.status(201).json(account);
  });

  router.get('/entries', (_req, res) => {
    res.json(store.listEntries());
  });

  router.post('/entries', (req, res) => {
    const parsed = newEntrySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.issues.map((i) => i.message) });
    }

    // Every referenced account must exist.
    const unknown = parsed.data.lines.map((l) => l.accountId).filter((id) => !store.getAccount(id));
    if (unknown.length > 0) {
      return res.status(400).json({ errors: [`unknown account id(s): ${unknown.join(', ')}`] });
    }

    // Enforce double-entry invariants.
    const ledgerErrors = validateLines(parsed.data.lines);
    if (ledgerErrors.length > 0) {
      return res.status(400).json({ errors: ledgerErrors });
    }

    const entry = store.createEntry(parsed.data);
    res.status(201).json(entry);
  });

  router.get('/reports/trial-balance', (_req, res) => {
    res.json(trialBalance(store.listAccounts(), store.listEntries()));
  });

  return router;
}
