import { BASE_CATEGORIES } from '@/db/seed';
import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON, resolveCategoryIcon } from '@/utils/category-icons';

describe('category-icons', () => {
  it('exposes a non-empty catalog without duplicates', async () => {
    expect(CATEGORY_ICONS.length).toBeGreaterThan(0);
    expect(new Set(CATEGORY_ICONS).size).toBe(CATEGORY_ICONS.length);
  });

  it('includes the default icon in the catalog', async () => {
    expect(CATEGORY_ICONS).toContain(DEFAULT_CATEGORY_ICON);
  });

  it('assigns every base category an icon from the catalog', async () => {
    for (const category of BASE_CATEGORIES) {
      expect(CATEGORY_ICONS).toContain(category.icon);
    }
  });

  it('resolves stored values, falling back to the default icon', async () => {
    expect(resolveCategoryIcon('star')).toBe('star');
    expect(resolveCategoryIcon(null)).toBe(DEFAULT_CATEGORY_ICON);
    expect(resolveCategoryIcon(undefined)).toBe(DEFAULT_CATEGORY_ICON);
    expect(resolveCategoryIcon('not-a-real-icon')).toBe(DEFAULT_CATEGORY_ICON);
  });
});
