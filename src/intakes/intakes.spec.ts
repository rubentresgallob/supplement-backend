import { resolveTakenAt } from './intakes.service';

describe('resolveTakenAt', () => {
  const NOW = new Date('2026-10-01T12:00:00Z');
  const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

  it('sin fecha usa "ahora"', () => {
    expect(resolveTakenAt(undefined, NOW)).toEqual(NOW);
  });

  it('acepta tomas de las últimas 48 h', () => {
    expect(resolveTakenAt(hoursAgo(47), NOW)).toEqual(new Date(hoursAgo(47)));
  });

  it('rechaza tomas de hace más de 48 h (no se pueden inventar rachas)', () => {
    expect(resolveTakenAt(hoursAgo(49), NOW)).toBeNull();
    expect(resolveTakenAt('2024-01-01T10:00:00Z', NOW)).toBeNull();
  });

  it('una fecha futura (reloj del móvil adelantado) se cuenta como ahora', () => {
    expect(resolveTakenAt(hoursAgo(-3), NOW)).toEqual(NOW);
  });
});
