jest.mock('expo-sqlite', () => ({ useSQLiteContext: jest.fn() }));
jest.mock('expo-system-ui', () => ({ setBackgroundColorAsync: jest.fn() }));

import { resolveIsDark } from '../theme';

describe('resolveIsDark', () => {
  it.each([
    { mode: 'light' as const, system: 'light' as const, expected: false },
    { mode: 'light' as const, system: 'dark' as const, expected: false },
    { mode: 'dark' as const, system: 'light' as const, expected: true },
    { mode: 'dark' as const, system: 'dark' as const, expected: true },
    { mode: 'system' as const, system: 'light' as const, expected: false },
    { mode: 'system' as const, system: 'dark' as const, expected: true },
    { mode: 'system' as const, system: null, expected: false },
    { mode: 'system' as const, system: undefined, expected: false },
    { mode: 'system' as const, system: 'unspecified' as const, expected: false },
  ])('mode $mode with system $system resolves to $expected', ({ mode, system, expected }) => {
    expect(resolveIsDark(mode, system)).toBe(expected);
  });
});
