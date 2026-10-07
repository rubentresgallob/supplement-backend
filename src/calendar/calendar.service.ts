import { Injectable } from '@nestjs/common';
import { addDays, endOfMonth, isAfter, startOfDay, startOfMonth } from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';
import { dayKey } from '../streaks/streak-utils';

export interface CalendarSupplement {
  id: number;
  name: string;
  times_per_day: number;
  created_at: Date;
}

/**
 * complete: todo tomado · partial: algo tomado · missed: nada tomado ·
 * pending: hoy, aún sin empezar · none: no había nada que tomar · future: día que no ha llegado.
 */
export type DayStatus = 'complete' | 'partial' | 'missed' | 'pending' | 'none' | 'future';

/**
 * Cálculo puro de un mes del calendario (testeable sin BD).
 * Un suplemento solo "se espera" desde el día en que se añadió.
 * @param month 1-12
 */
export function buildMonth(
  supplements: CalendarSupplement[],
  intakes: { user_supplement_id: number; taken_at: Date }[],
  protectedDays: Set<string>,
  year: number,
  month: number,
  today: Date = new Date(),
) {
  const first = new Date(year, month - 1, 1);
  const last = startOfDay(endOfMonth(first));
  const todayStart = startOfDay(today);
  const todayKey = dayKey(todayStart);

  // día → suplemento → nº de tomas
  const counts = new Map<string, Map<number, number>>();
  for (const intake of intakes) {
    const key = dayKey(intake.taken_at);
    const per = counts.get(key) ?? new Map<number, number>();
    per.set(intake.user_supplement_id, (per.get(intake.user_supplement_id) ?? 0) + 1);
    counts.set(key, per);
  }

  const days: {
    date: string;
    status: DayStatus;
    taken: number;
    expected: number;
    protected: boolean;
    supplements: { id: number; name: string; taken: number; expected: number }[];
  }[] = [];

  for (let d = first; !isAfter(d, last); d = addDays(d, 1)) {
    const key = dayKey(d);
    if (isAfter(d, todayStart)) {
      days.push({ date: key, status: 'future', taken: 0, expected: 0, protected: false, supplements: [] });
      continue;
    }
    let taken = 0;
    let expected = 0;
    const detail: { id: number; name: string; taken: number; expected: number }[] = [];
    for (const s of supplements) {
      if (isAfter(startOfDay(s.created_at), d)) continue;
      const done = Math.min(counts.get(key)?.get(s.id) ?? 0, s.times_per_day);
      taken += done;
      expected += s.times_per_day;
      detail.push({ id: s.id, name: s.name, taken: done, expected: s.times_per_day });
    }
    let status: DayStatus;
    if (expected === 0) status = 'none';
    else if (taken >= expected) status = 'complete';
    else if (taken > 0) status = 'partial';
    else status = key === todayKey ? 'pending' : 'missed'; // hoy aún no ha terminado
    days.push({ date: key, status, taken, expected, protected: protectedDays.has(key), supplements: detail });
  }

  const count = (s: DayStatus) => days.filter((d) => d.status === s).length;
  const firstTracked = supplements.length
    ? dayKey(supplements.reduce((a, s) => (s.created_at < a ? s.created_at : a), supplements[0].created_at))
    : null;

  return {
    month: `${year}-${String(month).padStart(2, '0')}`,
    today: todayKey,
    /** Primer día con algún suplemento (para no navegar a meses vacíos). */
    firstTracked,
    days,
    summary: {
      complete: count('complete'),
      partial: count('partial'),
      missed: count('missed'),
      protected: days.filter((d) => d.protected).length,
    },
  };
}

@Injectable()
export class CalendarService {
  constructor(private prisma: PrismaService) {}

  async getMonth(userId: number, year: number, month: number) {
    const first = new Date(year, month - 1, 1);
    const from = startOfMonth(first);
    const to = endOfMonth(first);
    const [supplements, intakes, freezes] = await Promise.all([
      this.prisma.user_supplement.findMany({
        where: { user_id: userId, active: true },
        include: { supplement_database: { select: { name: true } } },
        orderBy: { created_at: 'asc' },
      }),
      this.prisma.intake.findMany({
        where: { user_id: userId, taken_at: { gte: from, lte: to } },
        select: { user_supplement_id: true, taken_at: true },
      }),
      this.prisma.streak_freeze.findMany({
        where: { user_id: userId, day: { gte: dayKey(from), lte: dayKey(to) } },
        select: { day: true },
      }),
    ]);

    return buildMonth(
      supplements.map((s) => ({
        id: s.id,
        name: s.supplement_database?.name ?? s.custom_name ?? 'Suplemento',
        times_per_day: s.times_per_day,
        created_at: s.created_at,
      })),
      intakes,
      new Set(freezes.map((f) => f.day)),
      year,
      month,
    );
  }
}
