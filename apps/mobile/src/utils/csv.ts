/**
 * Transactions CSV export.
 *
 * Pure builder over transaction rows. Columns are exactly the specified
 * ones: date, type, amount, currency, account, category, notes. Transfers
 * render as a single row with "Origin → Destination" in the account
 * column, mirroring the single-entity transfer model and the app UI.
 */

import type { TransactionWithDetails } from '@/db/repositories/transactions-repo';

const CSV_HEADER = 'date,type,amount,currency,account,category,notes';

function escapeCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function accountCell(transaction: TransactionWithDetails): string {
  if (transaction.type === 'transfer' && transaction.destinationAccountName) {
    return `${transaction.accountName} → ${transaction.destinationAccountName}`;
  }
  return transaction.accountName;
}

export function buildTransactionsCsv(rows: TransactionWithDetails[]): string {
  const lines = rows.map((transaction) =>
    [
      transaction.date,
      transaction.type,
      String(transaction.amount),
      transaction.currency,
      accountCell(transaction),
      transaction.categoryName ?? '',
      transaction.notes ?? '',
    ]
      .map(escapeCell)
      .join(','),
  );
  return [CSV_HEADER, ...lines].join('\r\n') + '\r\n';
}
