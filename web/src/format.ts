/** Formatting helpers for the UI boundary. Cents in, display strings out. */

/** Format integer cents as a fixed-2-decimal string, e.g. 123456 -> "1,234.56". */
export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Parse a user-entered dollar amount (e.g. "12.34") into integer cents. */
export function parseDollarsToCents(input: string): number {
  const value = Number(input);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100);
}
