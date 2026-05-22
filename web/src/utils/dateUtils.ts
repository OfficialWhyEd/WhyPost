export const DOW_ABB = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'];

export function getWeekDays() {
  const now = new Date();
  const dow = (now.getDay() + 6) % 7; // 0=Mon
  return DOW_ABB.map((label, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - dow + i);
    return { label, date: d, isToday: i === dow };
  });
}

export function sameDay(dateStr: string | null, target: Date): boolean {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    return d.getDate() === target.getDate() &&
      d.getMonth() === target.getMonth() &&
      d.getFullYear() === target.getFullYear();
  } catch { return false; }
}

export function monthAbb(date: Date) {
  return date.toLocaleDateString('it-IT', { month: 'short' }).toUpperCase().replace('.', '');
}
