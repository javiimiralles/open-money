/**
 * Time-of-day greeting shown in the dashboard header.
 * Boundaries follow the common Spanish split: morning 6-12,
 * afternoon 12-21, night otherwise.
 */

export function getGreeting(hour: number): string {
  if (hour >= 6 && hour < 12) {
    return 'Buenos días 👋';
  }
  if (hour >= 12 && hour < 21) {
    return 'Buenas tardes 👋';
  }
  return 'Buenas noches 👋';
}
