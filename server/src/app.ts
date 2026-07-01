/**
 * Express application factory. Kept separate from `index.ts` so tests can
 * construct an app (with a fresh `Store`) without binding a network port.
 */
import express, { type Express } from 'express';
import cors from 'cors';
import { Store } from './store.js';
import { createRouter } from './routes.js';

export function createApp(store: Store = new Store()): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api', createRouter(store));

  return app;
}
