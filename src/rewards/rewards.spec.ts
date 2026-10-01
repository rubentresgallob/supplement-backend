import { subDays } from 'date-fns';
import { computeStreaks, dayKey } from '../streaks/streak-utils';
import { findRepairGap } from './rewards.service';

const TODAY = new Date(2026, 9, 1, 12, 0); // 1 oct 2026
const ago = (n: number) => dayKey(subDays(TODAY, n));
const doneOn = (...offsets: number[]) => {
  const days = new Set(offsets.map(ago));
  return (day: string) => days.has(day);
};

describe('computeStreaks', () => {
  it('cuenta la racha incluyendo hoy', () => {
    const r = computeStreaks(doneOn(0, 1, 2), TODAY);
    expect(r.current_streak).toBe(3);
    expect(r.last_completed_date).toBe(ago(0));
  });

  it('mantiene la racha si hoy aún no está completo pero ayer sí', () => {
    expect(computeStreaks(doneOn(1, 2), TODAY).current_streak).toBe(2);
  });

  it('pierde la racha si ayer no se completó', () => {
    const r = computeStreaks(doneOn(2, 3, 4, 5), TODAY);
    expect(r.current_streak).toBe(0);
    expect(r.longest_streak).toBe(4);
  });
});

describe('findRepairGap', () => {
  it('sin fallos no hay nada que reparar', () => {
    expect(findRepairGap(doneOn(1, 2, 3), TODAY)).toEqual([]);
  });

  it('repara ayer si anteayer estaba completo', () => {
    expect(findRepairGap(doneOn(2, 3), TODAY)).toEqual([ago(1)]);
  });

  it('repara los 2 últimos días si antes había racha', () => {
    expect(findRepairGap(doneOn(3, 4), TODAY)).toEqual([ago(2), ago(1)]);
  });

  it('repara anteayer si une dos tramos de racha', () => {
    expect(findRepairGap(doneOn(1, 3), TODAY)).toEqual([ago(2)]);
  });

  it('no repara si la racha se perdió hace más de 48 h', () => {
    expect(findRepairGap(doneOn(4, 5), TODAY)).toEqual([]);
  });

  it('usuario nuevo sin historial: nada que reparar', () => {
    expect(findRepairGap(doneOn(), TODAY)).toEqual([]);
  });

  it('con el hueco reparado la racha vuelve entera', () => {
    const done = doneOn(0, 2, 3, 4);
    const gap = new Set(findRepairGap(done, TODAY));
    const r = computeStreaks((d) => done(d) || gap.has(d), TODAY);
    expect(r.current_streak).toBe(5);
  });
});
