import { Injectable } from '@nestjs/common';
import { addDays, getISODay, isAfter, max, startOfDay, subDays } from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';
import { StreaksService } from '../streaks/streaks.service';
import { dayKey } from '../streaks/streak-utils';

export interface StatsSupplement {
  id: number;
  times_per_day: number;
  created_at: Date;
}

const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

/**
 * Cálculo puro de estadísticas (testeable sin BD).
 * Un suplemento solo "se espera" desde el día en que se añadió.
 */
export function buildStats(
  supplements: StatsSupplement[],
  intakes: { user_supplement_id: number; taken_at: Date }[],
  days: number,
  today: Date = new Date(),
) {
  const end = startOfDay(today);
  const firstAdded = supplements.length
    ? startOfDay(supplements.reduce((a, s) => (s.created_at < a ? s.created_at : a), supplements[0].created_at))
    : end;
  const start = max([subDays(end, days - 1), firstAdded]);

  // día → suplemento → nº de tomas
  const counts = new Map<string, Map<number, number>>();
  for (const intake of intakes) {
    const key = dayKey(intake.taken_at);
    const per = counts.get(key) ?? new Map<number, number>();
    per.set(intake.user_supplement_id, (per.get(intake.user_supplement_id) ?? 0) + 1);
    counts.set(key, per);
  }

  const perSupplement = new Map(supplements.map((s) => [s.id, { taken: 0, expected: 0 }]));
  const weekdays = WEEKDAYS.map((name) => ({ name, complete: 0, total: 0 }));
  const dayList: { date: string; taken: number; expected: number; complete: boolean }[] = [];

  for (let d = start; !isAfter(d, end); d = addDays(d, 1)) {
    const key = dayKey(d);
    const isToday = key === dayKey(end);
    let taken = 0;
    let expected = 0;
    for (const s of supplements) {
      if (isAfter(startOfDay(s.created_at), d)) continue;
      const done = Math.min(counts.get(key)?.get(s.id) ?? 0, s.times_per_day);
      taken += done;
      expected += s.times_per_day;
      const stat = perSupplement.get(s.id)!;
      stat.taken += done;
      stat.expected += s.times_per_day;
    }
    const complete = expected > 0 && taken >= expected;
    dayList.push({ date: key, taken, expected, complete });
    // Hoy aún no ha terminado: no cuenta para el día de la semana
    if (!isToday && expected > 0) {
      const w = weekdays[getISODay(d) - 1];
      w.total++;
      if (complete) w.complete++;
    }
  }

  const totalTaken = dayList.reduce((a, d) => a + d.taken, 0);
  const totalExpected = dayList.reduce((a, d) => a + d.expected, 0);
  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

  const weekdayStats = weekdays.map((w) => ({
    weekday: w.name,
    completionRate: pct(w.complete, w.total),
    days: w.total,
  }));
  const ranked = weekdayStats.filter((w) => w.days > 0);
  const best = ranked.length ? ranked.reduce((a, b) => (b.completionRate > a.completionRate ? b : a)) : null;
  const worst = ranked.length ? ranked.reduce((a, b) => (b.completionRate < a.completionRate ? b : a)) : null;

  return {
    from: dayKey(start),
    to: dayKey(end),
    days: dayList,
    supplements: [...perSupplement.entries()].map(([id, s]) => ({
      id,
      taken: s.taken,
      expected: s.expected,
      adherence: pct(s.taken, s.expected),
    })),
    weekdays: weekdayStats,
    summary: {
      adherence: pct(totalTaken, totalExpected),
      completeDays: dayList.filter((d) => d.complete).length,
      totalDays: dayList.length,
      intakes: totalTaken,
      bestWeekday: best?.weekday ?? null,
      worstWeekday: worst && best && worst.completionRate < best.completionRate ? worst.weekday : null,
    },
  };
}

@Injectable()
export class StatsService {
  constructor(
    private prisma: PrismaService,
    private streaksService: StreaksService,
  ) {}

  async getStats(userId: number, days: number) {
    const since = subDays(startOfDay(new Date()), days);
    const [supplements, intakes, streak] = await Promise.all([
      this.prisma.user_supplement.findMany({
        where: { user_id: userId, active: true },
        include: { supplement_database: { select: { name: true } } },
      }),
      this.prisma.intake.findMany({
        where: { user_id: userId, taken_at: { gte: since } },
        select: { user_supplement_id: true, taken_at: true },
      }),
      this.streaksService.getUserStreak(userId),
    ]);

    const stats = buildStats(supplements, intakes, days);
    const names = new Map(
      supplements.map((s) => [s.id, s.supplement_database?.name ?? s.custom_name ?? 'Suplemento']),
    );

    return {
      ...stats,
      supplements: stats.supplements
        .map((s) => ({ ...s, name: names.get(s.id) }))
        .sort((a, b) => b.adherence - a.adherence),
      summary: {
        ...stats.summary,
        currentStreak: streak.current_streak,
        longestStreak: streak.longest_streak,
      },
    };
  }
}
