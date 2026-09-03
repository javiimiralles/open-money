import {
  parseBackup,
  serializeBackup,
  validateBackup,
  type BackupData,
  type BackupFile,
} from '@/utils/backup';

const CURRENT_SCHEMA_VERSION = 5;

function validData(): BackupData {
  return {
    accounts: [{ id: 1, name: 'Cash', identifier: null, currency: 'EUR', initial_balance: 100, created_at: '2026-01-01', updated_at: '2026-01-01' }],
    categories: [{ id: 1, name: 'Food', kind: 'expense', created_at: '2026-01-01' }],
    transactions: [
      {
        id: 1,
        type: 'expense',
        date: '2026-02-01',
        amount: 12.5,
        currency: 'EUR',
        account_id: 1,
        category_id: 1,
        notes: 'Lunch',
        destination_account_id: null,
        destination_amount: null,
        fx_rate: null,
        source: 'manual',
        recurring_rule_id: null,
        created_at: '2026-02-01',
        updated_at: '2026-02-01',
        recurring_batch_id: null,
      },
    ],
    recurring_rules: [],
    instruments: [],
    trades: [],
    exchange_rates: [],
    settings: [{ key: 'backend_url', value: 'https://api.example.com' }],
  };
}

function validFile(): BackupFile {
  return {
    app: 'open-money',
    backupVersion: 1,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: '2026-09-03T00:00:00.000Z',
    data: validData(),
  };
}

describe('backup format', () => {
  it('round-trips a valid backup through serialize and parse', () => {
    const file = validFile();
    expect(parseBackup(serializeBackup(file), CURRENT_SCHEMA_VERSION)).toEqual(file);
  });

  it('rejects files that are not valid JSON', () => {
    expect(() => parseBackup('not json{', CURRENT_SCHEMA_VERSION)).toThrow(
      'not valid JSON',
    );
  });

  it('rejects non-object payloads and foreign backup formats', () => {
    expect(() => validateBackup([1, 2], CURRENT_SCHEMA_VERSION)).toThrow('backup object');
    expect(() => validateBackup({ app: 'other-app', backupVersion: 1 }, CURRENT_SCHEMA_VERSION)).toThrow(
      'not an Open Money backup',
    );
  });

  it('rejects missing tables, non-list tables and unknown tables', () => {
    const partial: Record<string, unknown> = { ...validData() };
    delete partial.transactions;
    expect(() =>
      validateBackup({ ...validFile(), data: partial }, CURRENT_SCHEMA_VERSION),
    ).toThrow('table "transactions" is missing');

    expect(() =>
      validateBackup(
        { ...validFile(), data: { ...validData(), accounts: {} } },
        CURRENT_SCHEMA_VERSION,
      ),
    ).toThrow('table "accounts" is missing');

    expect(() =>
      validateBackup(
        { ...validFile(), data: { ...validData(), unknown_table: [] } },
        CURRENT_SCHEMA_VERSION,
      ),
    ).toThrow('unknown table');
  });

  it('rejects rows with unknown columns and non-numeric ids', () => {
    expect(() =>
      validateBackup(
        {
          ...validFile(),
          data: { ...validData(), accounts: [{ id: 1, name: 'Cash', bogus: true }] },
        },
        CURRENT_SCHEMA_VERSION,
      ),
    ).toThrow('unknown column "bogus"');

    expect(() =>
      validateBackup(
        {
          ...validFile(),
          data: { ...validData(), accounts: [{ id: '1', name: 'Cash' }] },
        },
        CURRENT_SCHEMA_VERSION,
      ),
    ).toThrow('without a numeric id');
  });

  it('rejects dangling references', () => {
    const data = validData();
    data.transactions[0] = { ...data.transactions[0], account_id: 99 };
    expect(() => validateBackup({ ...validFile(), data }, CURRENT_SCHEMA_VERSION)).toThrow(
      'transactions.account_id references a missing accounts row',
    );
  });

  it('rejects backups created by a newer app version', () => {
    expect(() =>
      validateBackup({ ...validFile(), schemaVersion: 99 }, CURRENT_SCHEMA_VERSION),
    ).toThrow('newer app version');
  });
});
