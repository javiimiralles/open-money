/**
 * Base category catalog seeded on first launch (Spanish).
 * Runs inside migration v1 with explicit ids and INSERT OR IGNORE so it is
 * idempotent across re-installs and app updates.
 *
 * Each entry also carries the default identifying icon; migration v8
 * backfills those icons by id (see seedCategoryIconsSql).
 *
 * Investment categories live in a separate catalog: they are seeded by
 * migration v10, once the categories CHECK allows the 'investment' kind.
 * Keeping them out of BASE_CATEGORIES preserves the v1 seed SQL verbatim.
 */

import type { CategoryIconName } from '@/utils/category-icons';

export interface SeedCategory {
  id: number;
  name: string;
  kind: 'income' | 'expense' | 'investment';
  icon: CategoryIconName;
}

export const BASE_CATEGORIES: SeedCategory[] = [
  // Income (~6)
  { id: 1, name: 'Nómina', kind: 'income', icon: 'briefcase' },
  { id: 2, name: 'Bonus', kind: 'income', icon: 'cash-plus' },
  { id: 3, name: 'Intereses', kind: 'income', icon: 'percent' },
  { id: 4, name: 'Alquileres', kind: 'income', icon: 'home-city' },
  { id: 5, name: 'Ventas', kind: 'income', icon: 'storefront' },
  { id: 6, name: 'Otros ingresos', kind: 'income', icon: 'cash-multiple' },
  // Expense (~20)
  { id: 7, name: 'Vivienda', kind: 'expense', icon: 'home' },
  { id: 8, name: 'Alimentación', kind: 'expense', icon: 'cart' },
  { id: 9, name: 'Transporte', kind: 'expense', icon: 'bus' },
  { id: 10, name: 'Facturas', kind: 'expense', icon: 'receipt-text' },
  { id: 11, name: 'Ocio', kind: 'expense', icon: 'gamepad-variant' },
  { id: 12, name: 'Salud', kind: 'expense', icon: 'heart-pulse' },
  { id: 13, name: 'Ropa', kind: 'expense', icon: 'tshirt-crew' },
  { id: 14, name: 'Educación', kind: 'expense', icon: 'school' },
  { id: 15, name: 'Mascotas', kind: 'expense', icon: 'dog' },
  { id: 16, name: 'Regalos', kind: 'expense', icon: 'gift' },
  { id: 17, name: 'Viajes', kind: 'expense', icon: 'airplane' },
  { id: 18, name: 'Restaurantes', kind: 'expense', icon: 'silverware-fork-knife' },
  { id: 19, name: 'Suscripciones', kind: 'expense', icon: 'autorenew' },
  { id: 20, name: 'Impuestos', kind: 'expense', icon: 'bank' },
  { id: 21, name: 'Seguro del coche', kind: 'expense', icon: 'car' },
  { id: 22, name: 'Deporte', kind: 'expense', icon: 'dumbbell' },
  { id: 23, name: 'Cultura', kind: 'expense', icon: 'theater' },
  { id: 24, name: 'Telefonía', kind: 'expense', icon: 'cellphone' },
  { id: 25, name: 'Hogar', kind: 'expense', icon: 'lamp' },
  { id: 26, name: 'Otros gastos', kind: 'expense', icon: 'dots-horizontal' },
];

export function seedCategoriesSql(): string {
  const values = BASE_CATEGORIES.map(
    (c) => `(${c.id}, '${c.name.replace(/'/g, "''")}', '${c.kind}')`,
  ).join(',\n');
  return `
INSERT OR IGNORE INTO categories (id, name, kind) VALUES
${values};
`;
}

export function seedCategoryIconsSql(): string {
  return BASE_CATEGORIES.map((c) => `UPDATE categories SET icon = '${c.icon}' WHERE id = ${c.id};`).join(
    '\n',
  );
}

/**
 * Investment base categories. Ids are the documented references on fresh
 * installs (v1 seeds 1-26, so these land on 27-32) and dev datasets rely on
 * them; on upgraded databases with colliding user-created categories the
 * seed below assigns free ids instead of silently dropping rows.
 */
export const INVESTMENT_CATEGORIES: SeedCategory[] = [
  { id: 27, name: 'Fondos indexados', kind: 'investment', icon: 'chart-line' },
  { id: 28, name: 'Acciones', kind: 'investment', icon: 'trending-up' },
  { id: 29, name: 'Criptomonedas', kind: 'investment', icon: 'chart-pie' },
  { id: 30, name: 'Inmobiliario', kind: 'investment', icon: 'key-variant' },
  { id: 31, name: 'Plan de pensiones', kind: 'investment', icon: 'piggy-bank' },
  { id: 32, name: 'Otras inversiones', kind: 'investment', icon: 'dots-horizontal' },
];

/**
 * Seeds the investment catalog matched by (kind, name) instead of explicit
 * ids: INSERT OR IGNORE would silently skip rows whose id is already taken
 * by a user-created category. On fresh installs the rows still land on
 * 27-32 via AUTOINCREMENT.
 */
export function seedInvestmentCategoriesSql(): string {
  const union = INVESTMENT_CATEGORIES.map(
    (c) => `SELECT '${c.name.replace(/'/g, "''")}' AS name, '${c.kind}' AS kind`,
  ).join('\nUNION ALL\n');
  return `
INSERT INTO categories (name, kind)
SELECT seed.name, seed.kind FROM (
${union}
) AS seed
WHERE NOT EXISTS (
  SELECT 1 FROM categories AS existing
  WHERE existing.kind = seed.kind AND existing.name = seed.name
);
`;
}

export function seedInvestmentCategoryIconsSql(): string {
  return INVESTMENT_CATEGORIES.map(
    (c) =>
      `UPDATE categories SET icon = '${c.icon}' WHERE kind = 'investment' AND name = '${c.name.replace(/'/g, "''")}';`,
  ).join('\n');
}