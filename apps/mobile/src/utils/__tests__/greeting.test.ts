import { getGreeting } from '@/utils/greeting';

describe('getGreeting', () => {
  it.each([6, 9, 11])('returns morning greeting at %i:00', (hour) => {
    expect(getGreeting(hour)).toBe('Buenos días 👋');
  });

  it.each([12, 15, 20])('returns afternoon greeting at %i:00', (hour) => {
    expect(getGreeting(hour)).toBe('Buenas tardes 👋');
  });

  it.each([21, 0, 3, 5])('returns night greeting at %i:00', (hour) => {
    expect(getGreeting(hour)).toBe('Buenas noches 👋');
  });
});
