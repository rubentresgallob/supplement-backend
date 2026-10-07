import { IntakesService, resolveTakenAt } from './intakes.service';

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

describe('undoLast', () => {
  const make = (opts: { owner?: number; stock?: number | null; last?: { id: number } | null }) => {
    const prisma = {
      user_supplement: {
        findUnique: jest.fn().mockResolvedValue(
          opts.owner === undefined
            ? null
            : { id: 7, user_id: opts.owner, stock_units: opts.stock ?? null, units_per_intake: 2 },
        ),
        update: jest.fn().mockResolvedValue({}),
      },
      intake: {
        findFirst: jest.fn().mockResolvedValue(opts.last ?? null),
        delete: jest.fn().mockResolvedValue({}),
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { prisma, service: new IntakesService(prisma as any, {} as any) };
  };

  it('borra la última toma de hoy y devuelve el stock gastado', async () => {
    const { prisma, service } = make({ owner: 1, stock: 10, last: { id: 55 } });
    await expect(service.undoLast(1, 7)).resolves.toEqual({ undone: true, intakeId: 55 });
    expect(prisma.intake.delete).toHaveBeenCalledWith({ where: { id: 55 } });
    expect(prisma.user_supplement.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { stock_units: 12 },
    });
    // solo busca entre las tomas de hoy, la más reciente
    const query = prisma.intake.findFirst.mock.calls[0][0];
    expect(query.orderBy).toEqual({ taken_at: 'desc' });
    expect(query.where.taken_at.gte.getHours()).toBe(0);
  });

  it('sin control de stock no toca el suplemento', async () => {
    const { prisma, service } = make({ owner: 1, stock: null, last: { id: 55 } });
    await service.undoLast(1, 7);
    expect(prisma.user_supplement.update).not.toHaveBeenCalled();
  });

  it('si hoy no hay tomas, avisa y no borra nada', async () => {
    const { prisma, service } = make({ owner: 1, last: null });
    await expect(service.undoLast(1, 7)).rejects.toThrow('No hay tomas de hoy que deshacer');
    expect(prisma.intake.delete).not.toHaveBeenCalled();
  });

  it('no deja deshacer tomas de otro usuario', async () => {
    const { prisma, service } = make({ owner: 2, last: { id: 55 } });
    await expect(service.undoLast(1, 7)).rejects.toThrow();
    expect(prisma.intake.delete).not.toHaveBeenCalled();
  });
});
