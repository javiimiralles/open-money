/**
 * Curated MaterialCommunityIcons catalog for category identification.
 *
 * Icon names are stored in the database as plain strings; this whitelist is
 * the only set of values the UI offers, and every name was verified against
 * the installed @expo/vector-icons glyphmap (unknown names render blank).
 */

export const CATEGORY_ICONS = [
  'tag',
  'briefcase',
  'cash',
  'cash-multiple',
  'cash-plus',
  'wallet',
  'piggy-bank',
  'credit-card',
  'bank',
  'chart-line',
  'chart-pie',
  'trending-up',
  'percent',
  'star',
  'home',
  'home-city',
  'lamp',
  'bed',
  'tools',
  'key-variant',
  'cart',
  'storefront',
  'food',
  'coffee',
  'beer',
  'pizza',
  'cake-variant',
  'popcorn',
  'silverware-fork-knife',
  'bus',
  'car',
  'bike',
  'train',
  'taxi',
  'airplane',
  'gas-station',
  'receipt-text',
  'receipt',
  'file-document',
  'school',
  'gamepad-variant',
  'movie',
  'music',
  'headphones',
  'book',
  'theater',
  'palette',
  'heart-pulse',
  'medical-bag',
  'hospital',
  'tshirt-crew',
  'dog',
  'cat',
  'paw',
  'gift',
  'gift-open',
  'autorenew',
  'cellphone',
  'dumbbell',
  'trophy',
  'soccer',
  'lightbulb',
  'flower',
  'dots-horizontal',
  'plus',
] as const;

export type CategoryIconName = (typeof CATEGORY_ICONS)[number];

export const DEFAULT_CATEGORY_ICON: CategoryIconName = 'tag';

const ICON_SET = new Set<string>(CATEGORY_ICONS);

export function resolveCategoryIcon(icon: string | null | undefined): CategoryIconName {
  if (icon !== null && icon !== undefined && ICON_SET.has(icon)) {
    return icon as CategoryIconName;
  }
  return DEFAULT_CATEGORY_ICON;
}
