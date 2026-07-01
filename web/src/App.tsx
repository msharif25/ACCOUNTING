import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Account, TrialBalance } from '@accounting/shared';
import { api } from './api.js';
import { formatCents, parseDollarsToCents } from './format.js';

interface DraftLine {
  accountId: string;
  side: 'debit' | 'credit';
  amount: string; // dollars, as typed
}

const emptyLine = (accountId: string): DraftLine => ({ accountId, side: 'debit', amount: '' });

export function App() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [trialBalance, setTrialBalance] = useState<TrialBalance | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [accts, tb] = await Promise.all([api.listAccounts(), api.trialBalance()]);
      setAccounts(accts);
      setTrialBalance(tb);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="app">
      <h1>Accounting</h1>
      {error && <p className="error">{error}</p>}
      <TrialBalanceTable trialBalance={trialBalance} />
      <NewEntryForm accounts={accounts} onCreated={refresh} onError={setError} />
    </div>
  );
}

function TrialBalanceTable({ trialBalance }: { trialBalance: TrialBalance | null }) {
  if (!trialBalance) return <section>Loading…</section>;
  return (
    <section>
      <h2>Trial balance</h2>
      <table>
        <thead>
          <tr>
            <th>Account</th>
            <th>Type</th>
            <th className="num">Debit</th>
            <th className="num">Credit</th>
          </tr>
        </thead>
        <tbody>
          {trialBalance.rows.map((row) => (
            <tr key={row.accountId}>
              <td>{row.name}</td>
              <td>
                <span className="badge">{row.type}</span>
              </td>
              <td className="num">{row.debit ? formatCents(row.debit) : ''}</td>
              <td className="num">{row.credit ? formatCents(row.credit) : ''}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2}>{trialBalance.balanced ? 'Balanced ✓' : 'Out of balance!'}</td>
            <td className="num">{formatCents(trialBalance.totalDebit)}</td>
            <td className="num">{formatCents(trialBalance.totalCredit)}</td>
          </tr>
        </tfoot>
      </table>
    </section>
  );
}

function NewEntryForm({
  accounts,
  onCreated,
  onError,
}: {
  accounts: Account[];
  onCreated: () => void | Promise<void>;
  onError: (message: string) => void;
}) {
  const [date, setDate] = useState('2026-01-15');
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([]);

  // Seed two blank lines once accounts load.
  useEffect(() => {
    if (accounts.length > 0 && lines.length === 0) {
      setLines([emptyLine(accounts[0].id), emptyLine(accounts[0].id)]);
    }
  }, [accounts, lines.length]);

  const totals = useMemo(() => {
    let debit = 0;
    let credit = 0;
    for (const line of lines) {
      const cents = parseDollarsToCents(line.amount);
      if (line.side === 'debit') debit += cents;
      else credit += cents;
    }
    return { debit, credit, balanced: debit === credit && debit > 0 };
  }, [lines]);

  const updateLine = (index: number, patch: Partial<DraftLine>) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const submit = async () => {
    try {
      await api.createEntry({
        date,
        description,
        lines: lines.map((line) => {
          const cents = parseDollarsToCents(line.amount);
          return {
            accountId: line.accountId,
            debit: line.side === 'debit' ? cents : 0,
            credit: line.side === 'credit' ? cents : 0,
          };
        }),
      });
      setDescription('');
      setLines(accounts.length ? [emptyLine(accounts[0].id), emptyLine(accounts[0].id)] : []);
      await onCreated();
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <section>
      <h2>New journal entry</h2>
      <div className="line-row">
        <div>
          <label htmlFor="date">Date</label>
          <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div style={{ gridColumn: 'span 3' }}>
          <label htmlFor="desc">Description</label>
          <input
            id="desc"
            value={description}
            placeholder="e.g. Cash sale"
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      {lines.map((line, i) => (
        <div className="line-row" key={i}>
          <select
            value={line.accountId}
            onChange={(e) => updateLine(i, { accountId: e.target.value })}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select
            value={line.side}
            onChange={(e) => updateLine(i, { side: e.target.value as DraftLine['side'] })}
          >
            <option value="debit">Debit</option>
            <option value="credit">Credit</option>
          </select>
          <input
            inputMode="decimal"
            placeholder="0.00"
            value={line.amount}
            onChange={(e) => updateLine(i, { amount: e.target.value })}
          />
          <button
            type="button"
            className="secondary"
            onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
            disabled={lines.length <= 2}
            aria-label="Remove line"
          >
            ✕
          </button>
        </div>
      ))}

      <div className="row-actions">
        <button
          type="button"
          className="secondary"
          onClick={() => setLines((prev) => [...prev, emptyLine(accounts[0]?.id ?? '')])}
        >
          Add line
        </button>
        <span className={totals.balanced ? '' : 'error'}>
          Debit {formatCents(totals.debit)} / Credit {formatCents(totals.credit)}
        </span>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!totals.balanced || !description}
        >
          Post entry
        </button>
      </div>
    </section>
  );
}
