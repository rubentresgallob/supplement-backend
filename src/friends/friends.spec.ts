import { FriendsService } from './friends.service';

/** Servicio con una BD simulada: `friends` = ¿son amigos?, `sharing` = ¿el amigo comparte? */
const make = (opts: { friends: boolean; sharing: boolean }) => {
  const prisma = {
    friendship: { findFirst: jest.fn().mockResolvedValue(opts.friends ? { id: 1 } : null) },
    user: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue({
        id: 2,
        username: 'laura',
        share_with_friends: opts.sharing,
        created_at: new Date(2026, 0, 1),
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    user_supplement: {
      count: jest.fn().mockResolvedValue(1),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 7,
          custom_name: 'Creatina',
          supplement_database: null,
          form: 'polvo',
          dosage_amount: 5,
          dosage_unit: 'g',
          times_per_day: 2,
          intakes: [{ id: 1 }],
        },
      ]),
    },
    intake: { count: jest.fn().mockResolvedValue(30) },
  };
  const streaks = { getUserStreak: jest.fn().mockResolvedValue({ current_streak: 4, longest_streak: 9 }) };
  const rewards = { getEquippedFor: jest.fn().mockResolvedValue(new Map([[2, { capsu_head: 'capsu_head_cap' }]])) };
  const calendar = { getMonth: jest.fn().mockResolvedValue({ month: '2026-10', days: [] }) };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = new FriendsService(prisma as any, streaks as any, rewards as any, calendar as any);
  return { service, prisma, calendar };
};

describe('perfil de un amigo', () => {
  it('si comparte, incluye su Capsu, su racha y su stack de hoy', async () => {
    const { service } = make({ friends: true, sharing: true });
    const profile = await service.getFriendProfile(1, 2);
    expect(profile.equipped).toEqual({ capsu_head: 'capsu_head_cap' });
    expect(profile.streak).toEqual({ current: 4, longest: 9 });
    expect(profile.sharing).toBe(true);
    expect(profile.today).toEqual({
      supplements: [
        { id: 7, name: 'Creatina', form: 'polvo', dosageAmount: 5, dosageUnit: 'g', taken: 1, expected: 2 },
      ],
      taken: 1,
      expected: 2,
      complete: false,
    });
  });

  it('si no comparte, se ve su Capsu y su racha pero NO su stack', async () => {
    const { service } = make({ friends: true, sharing: false });
    const profile = await service.getFriendProfile(1, 2);
    expect(profile.equipped).toEqual({ capsu_head: 'capsu_head_cap' });
    expect(profile.sharing).toBe(false);
    expect(profile.today).toBeNull();
  });

  it('quien no es amigo no ve nada', async () => {
    const { service } = make({ friends: false, sharing: true });
    await expect(service.getFriendProfile(1, 2)).rejects.toThrow();
    await expect(service.getFriendCalendar(1, 2, 2026, 10)).rejects.toThrow();
  });
});

describe('calendario de un amigo', () => {
  it('se devuelve si son amigos y lo comparte', async () => {
    const { service, calendar } = make({ friends: true, sharing: true });
    await expect(service.getFriendCalendar(1, 2, 2026, 10)).resolves.toMatchObject({ month: '2026-10' });
    expect(calendar.getMonth).toHaveBeenCalledWith(2, 2026, 10);
  });

  it('si no lo comparte, 403 con código SHARING_DISABLED', async () => {
    const { service, calendar } = make({ friends: true, sharing: false });
    await expect(service.getFriendCalendar(1, 2, 2026, 10)).rejects.toMatchObject({
      response: { code: 'SHARING_DISABLED' },
    });
    expect(calendar.getMonth).not.toHaveBeenCalled();
  });
});

describe('solicitud de amistad a alguien que no existe', () => {
  it('con un email no revela si hay cuenta: responde como si se hubiera enviado', async () => {
    const { service } = make({ friends: false, sharing: true });
    await expect(service.sendRequest(1, 'nadie@example.com')).resolves.toEqual({
      message: 'Friend request sent',
    });
  });

  it('con un nombre de usuario sí avisa de que no existe', async () => {
    const { service } = make({ friends: false, sharing: true });
    await expect(service.sendRequest(1, 'nadie')).rejects.toThrow('User not found');
  });
});

describe('compartir con amigos', () => {
  it('se puede desactivar y volver a activar', async () => {
    const { service, prisma } = make({ friends: true, sharing: true });
    await expect(service.setSharing(1, false)).resolves.toEqual({ enabled: false });
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { share_with_friends: false } });
  });
});
