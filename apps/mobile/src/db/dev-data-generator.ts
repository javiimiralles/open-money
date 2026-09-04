/**
 * Deterministic fake-data generator for manual testing.
 *
 * Builds a self-contained dataset (accounts, transactions, recurring rules,
 * exchange rates) from a seeded PRNG, so the same seed always produces the
 * same data. Pure module: no SQLite, no React. The writer lives in
 * db/dev-seed, which maps account keys to real row ids on insert.
 *
 * Category ids reference the base catalog from db/seed (stable by design).
 */

import type { AccountInput } from '@/db/repositories/accounts-repo';
import type { RecurrenceFrequency, RecurringRuleInput } from '@/db/repositories/recurring-rules-repo';
import type { TransactionInput } from '@/db/repositories/transactions-repo';
import { dateToIso, todayIso } from '@/utils/dates';
import { roundToCents } from '@/utils/transfer';

export const DEV_SEED_DEFAULT = 20260904;
export const MONTHS_OF_HISTORY = 12;
export const MIN_DAILY_SPENDS_PER_MONTH = 50;
export const MAX_DAILY_SPENDS_PER_MONTH = 90;

/** Stored rates against EUR (same semantics as the exchange_rates table). */
export const DEV_RATES_TO_EUR: Record<string, number> = {
  USD: 0.92,
  GBP: 1.17,
};

export interface DevSeedOptions {
  seed?: number;
  /** ISO YYYY-MM-DD "today" the dataset is generated against. */
  today?: string;
  monthsOfHistory?: number;
}

export interface DevAccountSpec {
  key: string;
  input: AccountInput;
}

export interface DevTransactionDraft {
  type: 'income' | 'expense' | 'transfer';
  date: string;
  amount: number;
  currency: string;
  accountKey: string;
  destinationAccountKey: string | null;
  destinationAmount: number | null;
  fxRate: number | null;
  categoryId: number | null;
  notes: string | null;
}

export interface DevRecurringRuleDraft {
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  currency: string;
  accountKey: string;
  destinationAccountKey: string | null;
  categoryId: number | null;
  notes: string | null;
  frequency: RecurrenceFrequency;
  intervalDays: number | null;
  nextExecution: string;
  active: boolean;
  fxRate: number | null;
}

export interface DevExchangeRateDraft {
  currency: string;
  rateToEur: number;
}

export interface DevDataset {
  accounts: DevAccountSpec[];
  transactions: DevTransactionDraft[];
  recurringRules: DevRecurringRuleDraft[];
  exchangeRates: DevExchangeRateDraft[];
}

// Colors mirror the ACCOUNT_COLORS palette in theme/account-colors.
const DEV_ACCOUNTS: DevAccountSpec[] = [
  {
    key: 'primary',
    input: {
      name: 'Cuenta principal',
      identifier: 'ES12 2100 **** 1234',
      currency: 'EUR',
      initialBalance: 1250,
      color: '#4f9cf9',
      isPrimary: true,
    },
  },
  {
    key: 'savings',
    input: { name: 'Ahorro', identifier: null, currency: 'EUR', initialBalance: 5200, color: '#2ead4b' },
  },
  {
    key: 'card',
    input: {
      name: 'Tarjeta',
      identifier: '**** 5678',
      currency: 'EUR',
      initialBalance: 300,
      color: '#ffc091',
    },
  },
  {
    key: 'cash',
    input: { name: 'Efectivo', identifier: null, currency: 'EUR', initialBalance: 150, color: '#ffd11a' },
  },
  {
    key: 'usd',
    input: { name: 'Cuenta USD', identifier: null, currency: 'USD', initialBalance: 800, color: '#38c8ff' },
  },
  {
    key: 'gbp',
    input: { name: 'Ahorro GBP', identifier: null, currency: 'GBP', initialBalance: 400, color: '#b691ff' },
  },
];

interface SpendTemplate {
  categoryId: number;
  merchants: readonly string[];
  min: number;
  max: number;
  weight: number;
}

const EXPENSE_SPENDS: readonly SpendTemplate[] = [
  { categoryId: 8, merchants: ['Mercadona', 'Carrefour', 'Lidl', 'Día', 'Frutería'], min: 12, max: 95, weight: 22 },
  { categoryId: 18, merchants: ['Menú del día', 'Pizzería Da Vinci', 'Bar Manolo', 'Sushi'], min: 9, max: 65, weight: 10 },
  { categoryId: 9, merchants: ['Gasolinera', 'Metro', 'Parking centro', 'Peaje'], min: 2, max: 75, weight: 10 },
  { categoryId: 10, merchants: ['Luz', 'Agua', 'Gas', 'Internet'], min: 18, max: 95, weight: 4 },
  { categoryId: 11, merchants: ['Cine', 'Steam', 'Concierto'], min: 8, max: 55, weight: 6 },
  { categoryId: 12, merchants: ['Farmacia', 'Dentista', 'Fisio'], min: 4, max: 90, weight: 4 },
  { categoryId: 13, merchants: ['Zara', 'H&M', 'Decathlon'], min: 15, max: 130, weight: 4 },
  { categoryId: 14, merchants: ['Libros', 'Curso online'], min: 8, max: 45, weight: 2 },
  { categoryId: 15, merchants: ['Pienso', 'Veterinario'], min: 12, max: 60, weight: 2 },
  { categoryId: 16, merchants: ['Regalo cumple'], min: 15, max: 90, weight: 2 },
  { categoryId: 17, merchants: ['Hotel', 'Vuelo', 'Apartamento'], min: 120, max: 850, weight: 1 },
  { categoryId: 25, merchants: ['Ikea', 'Ferretería', 'Bazar'], min: 8, max: 160, weight: 3 },
  { categoryId: 22, merchants: ['Pádel', 'Piscina'], min: 6, max: 14, weight: 2 },
  { categoryId: 23, merchants: ['Teatro', 'Museo', 'Exposición'], min: 8, max: 35, weight: 2 },
  { categoryId: 26, merchants: ['Varios', 'Bizum'], min: 3, max: 45, weight: 6 },
];

const INCOME_SOURCES: readonly SpendTemplate[] = [
  { categoryId: 5, merchants: ['Wallapop', 'Venta bici', 'Clases particulares'], min: 20, max: 150, weight: 5 },
  { categoryId: 6, merchants: ['Devolución', 'Reembolso'], min: 15, max: 120, weight: 2 },
];

const SPEND_ACCOUNTS: readonly { key: string; weight: number }[] = [
  { key: 'primary', weight: 55 },
  { key: 'card', weight: 28 },
  { key: 'cash', weight: 12 },
  { key: 'usd', weight: 5 },
];

interface Rng {
  int(min: number, max: number): number;
  amount(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  chance(probability: number): boolean;
  weighted<T extends { weight: number }>(items: readonly T[]): T;
}

function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    amount: (min, max) => roundToCents(min + next() * (max - min)),
    pick: (items) => items[Math.floor(next() * items.length)],
    chance: (probability) => next() < probability,
    weighted: (items) => {
      const total = items.reduce((sum, item) => sum + item.weight, 0);
      let roll = next() * total;
      for (const item of items) {
        roll -= item.weight;
        if (roll <= 0) return item;
      }
      return items[items.length - 1];
    },
  };
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function isoDate(year: number, monthIndex: number, day: number): string {
  const paddedDay = Math.min(day, daysInMonth(year, monthIndex));
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(paddedDay).padStart(2, '0')}`;
}

function shiftMonth(year: number, monthIndex: number, delta: number): [number, number] {
  const total = year * 12 + monthIndex + delta;
  return [Math.floor(total / 12), ((total % 12) + 12) % 12];
}

function shiftDays(iso: string, delta: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const shifted = new Date(year, month - 1, day + delta);
  return dateToIso(shifted);
}

const currencyByAccountKey = new Map(DEV_ACCOUNTS.map((account) => [account.key, account.input.currency]));

function currencyOf(accountKey: string): string {
  const currency = currencyByAccountKey.get(accountKey);
  if (!currency) throw new Error(`Unknown dev account key: ${accountKey}`);
  return currency;
}

interface MonthContext {
  rng: Rng;
  transactions: DevTransactionDraft[];
  year: number;
  monthIndex: number;
  maxDay: number;
  monthOffset: number;
}

function pushTransaction(context: MonthContext, draft: Omit<DevTransactionDraft, 'date'>, day: number): void {
  context.transactions.push({ ...draft, date: isoDate(context.year, context.monthIndex, Math.min(day, context.maxDay)) });
}

function pushMonthlyFixed(context: MonthContext): void {
  const { rng } = context;
  pushTransaction(
    context,
    { type: 'income', amount: 2400, currency: 'EUR', accountKey: 'primary', destinationAccountKey: null, destinationAmount: null, fxRate: null, categoryId: 1, notes: 'Nómina mensual' },
    1,
  );
  pushTransaction(
    context,
    { type: 'expense', amount: 850, currency: 'EUR', accountKey: 'primary', destinationAccountKey: null, destinationAmount: null, fxRate: null, categoryId: 7, notes: 'Alquiler piso' },
    5,
  );
  pushTransaction(
    context,
    { type: 'expense', amount: 12.99, currency: 'EUR', accountKey: 'primary', destinationAccountKey: null, destinationAmount: null, fxRate: null, categoryId: 19, notes: 'Netflix' },
    12,
  );
  pushTransaction(
    context,
    { type: 'expense', amount: 10.99, currency: 'EUR', accountKey: 'primary', destinationAccountKey: null, destinationAmount: null, fxRate: null, categoryId: 19, notes: 'Spotify' },
    18,
  );
  pushTransaction(
    context,
    { type: 'expense', amount: 35, currency: 'EUR', accountKey: 'card', destinationAccountKey: null, destinationAmount: null, fxRate: null, categoryId: 22, notes: 'Gimnasio' },
    3,
  );
  pushTransaction(
    context,
    { type: 'expense', amount: 19.95, currency: 'EUR', accountKey: 'primary', destinationAccountKey: null, destinationAmount: null, fxRate: null, categoryId: 24, notes: 'Tarifa móvil' },
    20,
  );
  pushTransaction(
    context,
    {
      type: 'income',
      amount: rng.amount(2.5, 7.5),
      currency: 'EUR',
      accountKey: 'savings',
      destinationAccountKey: null,
      destinationAmount: null,
      fxRate: null,
      categoryId: 3,
      notes: 'Intereses',
    },
    25,
  );
  pushTransaction(
    context,
    {
      type: 'income',
      amount: rng.amount(700, 1100),
      currency: 'USD',
      accountKey: 'usd',
      destinationAccountKey: null,
      destinationAmount: null,
      fxRate: null,
      categoryId: 5,
      notes: 'Freelance',
    },
    10,
  );
  pushTransaction(
    context,
    { type: 'transfer', amount: 200, currency: 'EUR', accountKey: 'primary', destinationAccountKey: 'savings', destinationAmount: 200, fxRate: null, categoryId: null, notes: 'Ahorro mensual' },
    2,
  );
  pushTransaction(
    context,
    { type: 'transfer', amount: 300, currency: 'EUR', accountKey: 'primary', destinationAccountKey: 'card', destinationAmount: 300, fxRate: null, categoryId: null, notes: 'Pago tarjeta' },
    28,
  );
  pushTransaction(
    context,
    { type: 'transfer', amount: 100, currency: 'EUR', accountKey: 'primary', destinationAccountKey: 'cash', destinationAmount: 100, fxRate: null, categoryId: null, notes: 'Retirada cajero' },
    10,
  );
  const eurToGbp = roundToCents(100 / DEV_RATES_TO_EUR.GBP);
  pushTransaction(
    context,
    {
      type: 'transfer',
      amount: 100,
      currency: 'EUR',
      accountKey: 'primary',
      destinationAccountKey: 'gbp',
      destinationAmount: eurToGbp,
      fxRate: roundToCents(eurToGbp / 100),
      categoryId: null,
      notes: 'Ahorro en libras',
    },
    8,
  );
  if (context.monthOffset % 3 === 0) {
    pushTransaction(
      context,
      { type: 'income', amount: 350, currency: 'EUR', accountKey: 'primary', destinationAccountKey: null, destinationAmount: null, fxRate: null, categoryId: 2, notes: 'Bonus trimestral' },
      15,
    );
    pushTransaction(
      context,
      {
        type: 'transfer',
        amount: 400,
        currency: 'USD',
        accountKey: 'usd',
        destinationAccountKey: 'primary',
        destinationAmount: roundToCents(400 * DEV_RATES_TO_EUR.USD),
        fxRate: DEV_RATES_TO_EUR.USD,
        categoryId: null,
        notes: 'Repatriar dólares',
      },
      15,
    );
  }
  if (context.monthOffset % 3 === 1) {
    pushTransaction(
      context,
      { type: 'expense', amount: 65, currency: 'EUR', accountKey: 'primary', destinationAccountKey: null, destinationAmount: null, fxRate: null, categoryId: 20, notes: 'Tasa de basuras' },
      22,
    );
  }
  if (context.monthOffset === 6) {
    pushTransaction(
      context,
      { type: 'expense', amount: 285, currency: 'EUR', accountKey: 'primary', destinationAccountKey: null, destinationAmount: null, fxRate: null, categoryId: 21, notes: 'Seguro coche' },
      9,
    );
  }
  if ([5, 6, 7].includes(context.monthIndex)) {
    pushTransaction(
      context,
      {
        type: 'expense',
        amount: rng.amount(400, 900),
        currency: 'EUR',
        accountKey: 'primary',
        destinationAccountKey: null,
        destinationAmount: null,
        fxRate: null,
        categoryId: 17,
        notes: rng.pick(['Hotel', 'Vuelo', 'Apartamento'] as const),
      },
      rng.int(5, 25),
    );
  }
}

function pushDailySpends(context: MonthContext): void {
  const { rng } = context;
  const count = rng.int(MIN_DAILY_SPENDS_PER_MONTH, MAX_DAILY_SPENDS_PER_MONTH);
  for (let i = 0; i < count; i += 1) {
    const template = rng.weighted(EXPENSE_SPENDS);
    const accountKey = rng.weighted(SPEND_ACCOUNTS).key;
    pushTransaction(
      context,
      {
        type: 'expense',
        amount: rng.amount(template.min, template.max),
        currency: currencyOf(accountKey),
        accountKey,
        destinationAccountKey: null,
        destinationAmount: null,
        fxRate: null,
        categoryId: template.categoryId,
        notes: rng.chance(0.1) ? null : rng.pick(template.merchants),
      },
      rng.int(1, context.maxDay),
    );
  }
  const extraIncomes = rng.int(1, 3);
  for (let i = 0; i < extraIncomes; i += 1) {
    const template = rng.weighted(INCOME_SOURCES);
    pushTransaction(
      context,
      {
        type: 'income',
        amount: rng.amount(template.min, template.max),
        currency: 'EUR',
        accountKey: rng.chance(0.7) ? 'primary' : 'card',
        destinationAccountKey: null,
        destinationAmount: null,
        fxRate: null,
        categoryId: template.categoryId,
        notes: rng.pick(template.merchants),
      },
      rng.int(1, context.maxDay),
    );
  }
}

function buildRecurringRules(today: string): DevRecurringRuleDraft[] {
  const [year, month] = today.split('-').map(Number);
  const [nextYear, nextMonthIndex] = shiftMonth(year, month - 1, 1);
  const nextMonthDay = (day: number): string => isoDate(nextYear, nextMonthIndex, day);
  return [
    { type: 'income', amount: 2400, currency: 'EUR', accountKey: 'primary', destinationAccountKey: null, categoryId: 1, notes: 'Nómina mensual', frequency: 'monthly', intervalDays: null, nextExecution: nextMonthDay(1), active: true, fxRate: null },
    { type: 'expense', amount: 850, currency: 'EUR', accountKey: 'primary', destinationAccountKey: null, categoryId: 7, notes: 'Alquiler piso', frequency: 'monthly', intervalDays: null, nextExecution: nextMonthDay(5), active: true, fxRate: null },
    { type: 'expense', amount: 12.99, currency: 'EUR', accountKey: 'primary', destinationAccountKey: null, categoryId: 19, notes: 'Netflix', frequency: 'monthly', intervalDays: null, nextExecution: nextMonthDay(12), active: true, fxRate: null },
    { type: 'transfer', amount: 200, currency: 'EUR', accountKey: 'primary', destinationAccountKey: 'savings', categoryId: null, notes: 'Ahorro mensual', frequency: 'monthly', intervalDays: null, nextExecution: nextMonthDay(2), active: true, fxRate: null },
    { type: 'expense', amount: 35, currency: 'EUR', accountKey: 'card', destinationAccountKey: null, categoryId: 22, notes: 'Gimnasio', frequency: 'every_n_days', intervalDays: 30, nextExecution: shiftDays(today, -20), active: true, fxRate: null },
    { type: 'income', amount: 120, currency: 'EUR', accountKey: 'card', destinationAccountKey: null, categoryId: 5, notes: 'Venta Wallapop', frequency: 'weekly', intervalDays: null, nextExecution: shiftDays(today, 7), active: true, fxRate: null },
    { type: 'transfer', amount: 300, currency: 'USD', accountKey: 'usd', destinationAccountKey: 'primary', categoryId: null, notes: 'Repatriar dólares', frequency: 'monthly', intervalDays: null, nextExecution: shiftDays(today, 15), active: false, fxRate: DEV_RATES_TO_EUR.USD },
    { type: 'expense', amount: 285, currency: 'EUR', accountKey: 'primary', destinationAccountKey: null, categoryId: 21, notes: 'Seguro coche', frequency: 'yearly', intervalDays: null, nextExecution: shiftDays(today, 300), active: true, fxRate: null },
  ];
}

export function generateDevDataset(options: DevSeedOptions = {}): DevDataset {
  const { seed = DEV_SEED_DEFAULT, today = todayIso(), monthsOfHistory = MONTHS_OF_HISTORY } = options;
  const rng = createRng(seed);
  const [todayYear, todayMonth, todayDay] = today.split('-').map(Number);
  const transactions: DevTransactionDraft[] = [];

  for (let offset = monthsOfHistory - 1; offset >= 0; offset -= 1) {
    const [year, monthIndex] = shiftMonth(todayYear, todayMonth - 1, -offset);
    const maxDay = offset === 0 ? todayDay : daysInMonth(year, monthIndex);
    const context: MonthContext = { rng, transactions, year, monthIndex, maxDay, monthOffset: offset };
    pushMonthlyFixed(context);
    pushDailySpends(context);
  }

  return {
    accounts: DEV_ACCOUNTS,
    transactions,
    recurringRules: buildRecurringRules(today),
    exchangeRates: Object.entries(DEV_RATES_TO_EUR).map(([currency, rateToEur]) => ({ currency, rateToEur })),
  };
}

export function toTransactionInputs(
  dataset: Pick<DevDataset, 'transactions'>,
  accountIds: Map<string, number>,
): TransactionInput[] {
  return dataset.transactions.map((draft) => {
    const accountId = accountIds.get(draft.accountKey);
    if (accountId === undefined) throw new Error(`Unknown dev account key: ${draft.accountKey}`);
    if (draft.type === 'transfer') {
      const destinationAccountId = draft.destinationAccountKey ? accountIds.get(draft.destinationAccountKey) : undefined;
      if (destinationAccountId === undefined) throw new Error('Transfer draft is missing a destination account');
      return {
        type: 'transfer',
        date: draft.date,
        amount: draft.amount,
        currency: draft.currency,
        accountId,
        destinationAccountId,
        destinationAmount: draft.destinationAmount ?? draft.amount,
        fxRate: draft.fxRate,
        notes: draft.notes,
      } satisfies TransactionInput;
    }
    return {
      type: draft.type,
      date: draft.date,
      amount: draft.amount,
      currency: draft.currency,
      accountId,
      categoryId: draft.categoryId,
      notes: draft.notes,
    } satisfies TransactionInput;
  });
}

export function toRecurringRuleInputs(
  dataset: Pick<DevDataset, 'recurringRules'>,
  accountIds: Map<string, number>,
): RecurringRuleInput[] {
  return dataset.recurringRules.map((draft) => {
    const accountId = accountIds.get(draft.accountKey);
    if (accountId === undefined) throw new Error(`Unknown dev account key: ${draft.accountKey}`);
    const destinationAccountId =
      draft.destinationAccountKey === null ? null : (accountIds.get(draft.destinationAccountKey ?? '') ?? null);
    if (draft.destinationAccountKey !== null && destinationAccountId === null) {
      throw new Error('Recurring rule draft is missing a destination account');
    }
    return {
      type: draft.type,
      amount: draft.amount,
      currency: draft.currency,
      accountId,
      destinationAccountId,
      categoryId: draft.categoryId,
      notes: draft.notes,
      frequency: draft.frequency,
      intervalDays: draft.intervalDays,
      nextExecution: draft.nextExecution,
      active: draft.active,
      fxRate: draft.fxRate,
    } satisfies RecurringRuleInput;
  });
}
