import { migrate } from '@/db/client';
import { insertAccount } from '@/db/repositories/accounts-repo';
import {
  getRecurringRuleById,
  insertRecurringRule,
  listDueRecurringRules,
  listRecurringRules,
  setRecurringRuleActive,
  updateRecurringRule,
  updateRecurringRuleSchedule,
  deleteRecurringRule,
  type RecurringRuleInput,
} from '@/db/repositories/recurring-rules-repo';
import { BetterSqliteExecutor } from '@/test/better-sqlite-executor';

describe('recurring-rules-repo', () => {
  async function createDb() {
    const db = new BetterSqliteExecutor();
    await migrate(db);
    return db;
  }

  async function createAccount(db: BetterSqliteExecutor, name = 'Banco') {
    return insertAccount(db, { name, identifier: null, currency: 'EUR', initialBalance: 100 });
  }

  function ruleInput(overrides: Partial<RecurringRuleInput> = {}): RecurringRuleInput {
    return {
      type: 'expense',
      amount: 50,
      currency: 'EUR',
      accountId: 1,
      destinationAccountId: null,
      categoryId: null,
      notes: 'Alquiler',
      frequency: 'monthly',
      intervalDays: null,
      nextExecution: '2026-09-01',
      active: true,
      fxRate: null,
      ...overrides,
    };
  }

  it('inserts and retrieves a rule with details', async () => {
    const db = await createDb();
    const accountId = await createAccount(db);
    const id = await insertRecurringRule(db, ruleInput({ accountId }));
    const rule = await getRecurringRuleById(db, id);
    expect(rule).toMatchObject({ id, type: 'expense', amount: 50, accountName: 'Banco', nextExecution: '2026-09-01' });
    db.close();
  });

  it('lists rules ordered by next_execution', async () => {
    const db = await createDb();
    const accountId = await createAccount(db);
    await insertRecurringRule(db, ruleInput({ accountId, nextExecution: '2026-10-01' }));
    await insertRecurringRule(db, ruleInput({ accountId, nextExecution: '2026-09-01' }));
    const rules = await listRecurringRules(db);
    expect(rules.map((r) => r.nextExecution)).toEqual(['2026-09-01', '2026-10-01']);
    db.close();
  });

  it('updates a rule', async () => {
    const db = await createDb();
    const accountId = await createAccount(db);
    const id = await insertRecurringRule(db, ruleInput({ accountId, amount: 50 }));
    await updateRecurringRule(db, id, ruleInput({ accountId, amount: 80, frequency: 'weekly' }));
    const rule = await getRecurringRuleById(db, id);
    expect(rule).toMatchObject({ amount: 80, frequency: 'weekly' });
    db.close();
  });

  it('deletes a rule and keeps already generated transactions (SET NULL)', async () => {
    const db = await createDb();
    const accountId = await createAccount(db);
    const ruleId = await insertRecurringRule(db, ruleInput({ accountId }));
    await db.runAsync(
      `INSERT INTO transactions (type, date, amount, currency, account_id, source, recurring_rule_id) VALUES ('expense', '2026-09-01', 50, 'EUR', ?, 'recurring', ?)`,
      [accountId, ruleId],
    );
    await deleteRecurringRule(db, ruleId);
    const rows = await db.getAllAsync<{ recurring_rule_id: number | null }>('SELECT recurring_rule_id FROM transactions');
    expect(rows[0].recurring_rule_id).toBeNull();
    db.close();
  });

  it('lists due rules (active and next_execution <= asOf)', async () => {
    const db = await createDb();
    const accountId = await createAccount(db);
    await insertRecurringRule(db, ruleInput({ accountId, nextExecution: '2026-09-01', active: true }));
    await insertRecurringRule(db, ruleInput({ accountId, nextExecution: '2026-10-01', active: true }));
    await insertRecurringRule(db, ruleInput({ accountId, nextExecution: '2026-09-01', active: false }));
    const due = await listDueRecurringRules(db, '2026-09-15');
    expect(due).toHaveLength(1);
    expect(due[0].nextExecution).toBe('2026-09-01');
    db.close();
  });

  it('toggles active flag', async () => {
    const db = await createDb();
    const accountId = await createAccount(db);
    const id = await insertRecurringRule(db, ruleInput({ accountId, active: true }));
    await setRecurringRuleActive(db, id, false);
    const rule = await getRecurringRuleById(db, id);
    expect(rule?.active).toBe(false);
    db.close();
  });

  it('updates schedule fields', async () => {
    const db = await createDb();
    const accountId = await createAccount(db);
    const id = await insertRecurringRule(db, ruleInput({ accountId, nextExecution: '2026-09-01' }));
    await updateRecurringRuleSchedule(db, id, '2026-10-01', '2026-09-01');
    const rule = await getRecurringRuleById(db, id);
    expect(rule).toMatchObject({ nextExecution: '2026-10-01', lastRunDate: '2026-09-01' });
    db.close();
  });

  it('supports transfer rules with fx_rate and destination account', async () => {
    const db = await createDb();
    const origin = await createAccount(db, 'Banco');
    const destination = await insertAccount(db, { name: 'Ahorros', identifier: null, currency: 'USD', initialBalance: 0 });
    const id = await insertRecurringRule(
      db,
      ruleInput({ type: 'transfer', accountId: origin, destinationAccountId: destination, fxRate: 1.1 }),
    );
    const rule = await getRecurringRuleById(db, id);
    expect(rule).toMatchObject({ type: 'transfer', fxRate: 1.1, destinationAccountName: 'Ahorros' });
    db.close();
  });

  it('supports every_n_days with interval_days', async () => {
    const db = await createDb();
    const accountId = await createAccount(db);
    const id = await insertRecurringRule(
      db,
      ruleInput({ accountId, frequency: 'every_n_days', intervalDays: 14, nextExecution: '2026-09-01' }),
    );
    const rule = await getRecurringRuleById(db, id);
    expect(rule).toMatchObject({ frequency: 'every_n_days', intervalDays: 14 });
    db.close();
  });
});
