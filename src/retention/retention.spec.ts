import { RetentionService, retentionCutoffs } from './retention.service';

describe('conservación de datos', () => {
  const now = new Date('2026-10-16T12:00:00Z');

  it('calcula los plazos: 24 h, 24 meses y 30 días', () => {
    const c = retentionCutoffs(now);
    expect(c.unverifiedBefore.toISOString()).toBe('2026-10-15T12:00:00.000Z');
    expect(c.inactiveBefore.toISOString()).toBe('2024-10-16T12:00:00.000Z');
    expect(c.warnedBefore.toISOString()).toBe('2026-09-16T12:00:00.000Z');
  });

  it('avisa a los inactivos, marca el aviso y borra a los avisados hace 30 días', async () => {
    const prisma = {
      user: {
        deleteMany: jest
          .fn()
          .mockResolvedValueOnce({ count: 2 }) // sin verificar
          .mockResolvedValueOnce({ count: 1 }), // avisados y sin volver
        findMany: jest.fn().mockResolvedValue([{ id: 5, email: 'a@b.c', username: 'ana' }]),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const mail = { send: jest.fn().mockResolvedValue(undefined) };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new RetentionService(prisma as any, mail as any);

    await expect(service.run(now)).resolves.toEqual({ unverifiedDeleted: 2, warned: 1, inactiveDeleted: 1 });
    expect(mail.send).toHaveBeenCalledWith('a@b.c', 'Tu cuenta se borrará en 30 días', expect.any(String), expect.any(String));
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 5 }, data: { inactivity_warned_at: now } });
    expect(prisma.user.deleteMany).toHaveBeenLastCalledWith({
      where: { inactivity_warned_at: { lt: retentionCutoffs(now).warnedBefore } },
    });
  });
});
