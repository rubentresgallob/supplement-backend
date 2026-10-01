import { buildStats } from './stats.service';
import { isProActive } from '../subscription/pro-plan';

const TODAY = new Date(2026, 9, 1, 12, 0); // jueves 1 oct 2026
const day = (offset: number, hour = 9) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - offset);
  d.setHours(hour, 0, 0, 0);
  return d;
};

describe('buildStats', () => {
  const creatina = { id: 1, times_per_day: 1, created_at: day(6) };
  const omega = { id: 2, times_per_day: 2, created_at: day(2) };

  it('no cuenta días anteriores a cuando se añadió el suplemento', () => {
    const stats = buildStats([creatina], [], 30, TODAY);
    expect(stats.days).toHaveLength(7); // de hace 6 días a hoy
    expect(stats.from).toBe('2026-09-25');
  });

  it('calcula cumplimiento por día, por suplemento y global', () => {
    const intakes = [
      ...[6, 5, 4, 3, 2, 1, 0].map((o) => ({ user_supplement_id: 1, taken_at: day(o) })),
      { user_supplement_id: 2, taken_at: day(1, 8) },
      { user_supplement_id: 2, taken_at: day(1, 20) },
      { user_supplement_id: 2, taken_at: day(0) },
      { user_supplement_id: 2, taken_at: day(0, 10) },
      { user_supplement_id: 2, taken_at: day(0, 11) }, // tomas de más no suman
    ];
    const stats = buildStats([creatina, omega], intakes, 30, TODAY);

    const yesterday = stats.days.find((d) => d.date === '2026-09-30')!;
    expect(yesterday).toMatchObject({ taken: 3, expected: 3, complete: true });
    const twoDaysAgo = stats.days.find((d) => d.date === '2026-09-29')!;
    expect(twoDaysAgo).toMatchObject({ taken: 1, expected: 3, complete: false });

    expect(stats.supplements.find((s) => s.id === 1)!.adherence).toBe(100);
    expect(stats.supplements.find((s) => s.id === 2)!.adherence).toBe(67); // 4 de 6
    expect(stats.summary.completeDays).toBe(6);
    expect(stats.summary.intakes).toBe(11);
  });

  it('detecta el peor día de la semana', () => {
    // Falla solo el martes (hace 2 días)
    const intakes = [6, 5, 4, 3, 1, 0].map((o) => ({ user_supplement_id: 1, taken_at: day(o) }));
    const stats = buildStats([creatina], intakes, 30, TODAY);
    expect(stats.summary.worstWeekday).toBe('Martes');
    expect(stats.weekdays.find((w) => w.weekday === 'Martes')!.completionRate).toBe(0);
  });

  it('sin suplementos devuelve todo a cero', () => {
    const stats = buildStats([], [], 30, TODAY);
    expect(stats.summary.adherence).toBe(0);
    expect(stats.summary.bestWeekday).toBeNull();
  });
});

describe('isProActive', () => {
  const now = new Date('2026-10-01T12:00:00Z');
  it('es Pro solo mientras no ha caducado', () => {
    expect(isProActive(new Date('2026-10-02T00:00:00Z'), now)).toBe(true);
    expect(isProActive(new Date('2026-09-30T00:00:00Z'), now)).toBe(false);
    expect(isProActive(null, now)).toBe(false);
  });
});
