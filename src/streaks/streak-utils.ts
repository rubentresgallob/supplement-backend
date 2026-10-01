import { format, startOfDay, subDays } from 'date-fns';

/** Días hacia atrás que se revisan para calcular rachas. */
export const STREAK_LOOKBACK_DAYS = 365;

export const dayKey = (date: Date) => format(date, 'yyyy-MM-dd');

export interface StreakResult {
  current_streak: number;
  longest_streak: number;
  last_completed_date: string | null;
}

/**
 * Calcula racha actual y máxima a partir de una función que dice si un día cuenta.
 * La racha actual sigue viva si hoy aún no está completo pero ayer sí.
 */
export function computeStreaks(
  isDone: (day: string) => boolean,
  today: Date = new Date(),
): StreakResult {
  let checkDate = startOfDay(today);

  if (!isDone(dayKey(checkDate))) {
    checkDate = subDays(checkDate, 1);
  }

  let current = 0;
  let lastCompleted: string | null = null;
  while (current <= STREAK_LOOKBACK_DAYS && isDone(dayKey(checkDate))) {
    if (!lastCompleted) lastCompleted = dayKey(checkDate);
    current++;
    checkDate = subDays(checkDate, 1);
  }

  let longest = 0;
  let run = 0;
  checkDate = startOfDay(today);
  for (let i = 0; i < STREAK_LOOKBACK_DAYS; i++) {
    if (isDone(dayKey(checkDate))) {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
    checkDate = subDays(checkDate, 1);
  }

  return {
    current_streak: current,
    longest_streak: Math.max(longest, current),
    last_completed_date: lastCompleted,
  };
}
