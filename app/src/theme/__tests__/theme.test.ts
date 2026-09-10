import { lightColors } from '../palettes';

jest.mock('expo-sqlite', () => ({ useSQLiteContext: jest.fn() }));
jest.mock('expo-system-ui', () => ({ setBackgroundColorAsync: jest.fn() }));

describe('theme (light-only)', () => {
  it('exposes the light palette directly', () => {
    expect(lightColors.ink).toBe('#101010');
    expect(lightColors.paper).toBe('#f4f4f4');
  });
});
