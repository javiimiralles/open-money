/**
 * Base category catalog seeded on first launch (Spanish).
 * Runs inside migration v1 with explicit ids and INSERT OR IGNORE so it is
 * idempotent across re-installs and app updates.
 */

export interface SeedCategory {
  id: number;
  name: string;
  kind: 'income' | 'expense';
}

export const BASE_CATEGORIES: SeedCategory[] = [
  // Income (~6)
  { id: 1, name: 'Nómina', kind: 'income' },
  { id: 2, name: 'Bonus', kind: 'income' },
  { id: 3, name: 'Intereses', kind: 'income' },
  { id: 4, name: 'Alquileres', kind: 'income' },
  { id: 5, name: 'Ventas', kind: 'income' },
  { id: 6, name: 'Otros ingresos', kind: 'income' },
  // Expense (~20)
  { id: 7, name: 'Vivienda', kind: 'expense' },
  { id: 8, name: 'Alimentación', kind: 'expense' },
  { id: 9, name: 'Transporte', kind: 'expense' },
  { id: 10, name: 'Facturas', kind: 'expense' },
  { id: 11, name: 'Ocio', kind: 'expense' },
  { id: 12, name: 'Salud', kind: 'expense' },
  { id: 13, name: 'Ropa', kind: 'expense' },
  { id: 14, name: 'Educación', kind: 'expense' },
  { id: 15, name: 'Mascotas', kind: 'expense' },
  { id: 16, name: 'Regalos', kind: 'expense' },
  { id: 17, name: 'Viajes', kind: 'expense' },
  { id: 18, name: 'Restaurantes', kind: 'expense' },
  { id: 19, name: 'Suscripciones', kind: 'expense' },
  { id: 20, name: 'Impuestos', kind: 'expense' },
  { id: 21, name: 'Seguro del coche', kind: 'expense' },
  { id: 22, name: 'Deporte', kind: 'expense' },
  { id: 23, name: 'Cultura', kind: 'expense' },
  { id: 24, name: 'Telefonía', kind: 'expense' },
  { id: 25, name: 'Hogar', kind: 'expense' },
  { id: 26, name: 'Otros gastos', kind: 'expense' },
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