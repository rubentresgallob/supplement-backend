import { FRIEND_REQUEST_GENERIC, FriendsService, lowerFirst, motivationMessage } from './friends.service';

/**
 * Servicio con una BD simulada: `friends` = ¿son amigos?, `progress` y `supplements` =
 * interruptores del amigo, `blocked` = ¿hay un bloqueo entre los dos?
 */
const make = (opts: {
  friends: boolean;
  progress?: boolean;
  supplements?: boolean;
  motivatedToday?: boolean;
  blocked?: boolean;
  target?: { id: number } | null;
}) => {
  const prisma = {
    friendship: {
      findFirst: jest.fn().mockResolvedValue(opts.friends ? { id: 1, status: 'accepted' } : null),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    },
    user: {
      findFirst: jest.fn().mockResolvedValue(opts.target ?? null),
      findUnique: jest.fn().mockResolvedValue({
        id: 2,
        username: 'laura',
        share_progress: opts.progress ?? false,
        share_supplements: opts.supplements ?? false,
        social_intro_seen_at: null,
        created_at: new Date(2026, 0, 15),
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    user_block: { findFirst: jest.fn().mockResolvedValue(opts.blocked ? { id: 1 } : null) },
    sharing_event: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
    $transaction: jest.fn().mockResolvedValue([]),
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
    motivation: {
      findFirst: jest.fn().mockResolvedValue(opts.motivatedToday ? { id: 1 } : null),
      create: jest.fn().mockResolvedValue({}),
    },
  };
  const streaks = { getUserStreak: jest.fn().mockResolvedValue({ current_streak: 4, longest_streak: 9 }) };
  const rewards = { getEquippedFor: jest.fn().mockResolvedValue(new Map([[2, { capsu_head: 'capsu_head_cap' }]])) };
  const calendar = { getMonth: jest.fn().mockResolvedValue({ month: '2026-10', days: [] }) };
  const push = { sendToUser: jest.fn().mockResolvedValue(1) };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = new FriendsService(prisma as any, streaks as any, rewards as any, calendar as any, push as any);
  return { service, prisma, calendar, push };
};

describe('perfil de un amigo', () => {
  it('con los interruptores apagados (por defecto) solo se ve nombre, Capsu y mes de alta', async () => {
    const { service } = make({ friends: true });
    const profile = await service.getFriendProfile(1, 2);
    expect(profile.user).toEqual({ id: 2, username: 'laura' });
    expect(profile.equipped).toEqual({ capsu_head: 'capsu_head_cap' });
    expect(profile.memberSince).toBe('2026-01');
    expect(profile.progress).toBeNull();
    expect(profile.today).toBeNull();
    expect(JSON.stringify(profile)).not.toContain('email');
  });

  it('con "Compartir mi progreso" se ve racha, cumplimiento y nº de suplementos, pero no el stack', async () => {
    const { service } = make({ friends: true, progress: true });
    const profile = await service.getFriendProfile(1, 2);
    expect(profile.progress).toEqual({
      streak: { current: 4, longest: 9 },
      activeSupplements: 1,
      last30DaysAdherence: 50, // 30 tomas de 60 esperadas
    });
    expect(profile.today).toBeNull();
  });

  it('con "Compartir mis suplementos" se ve el stack de hoy', async () => {
    const { service } = make({ friends: true, supplements: true });
    const profile = await service.getFriendProfile(1, 2);
    expect(profile.progress).toBeNull();
    expect(profile.today).toEqual({
      supplements: [
        { id: 7, name: 'Creatina', form: 'polvo', dosageAmount: 5, dosageUnit: 'g', taken: 1, expected: 2 },
      ],
      taken: 1,
      expected: 2,
      complete: false,
    });
  });

  it('quien no es amigo no ve nada', async () => {
    const { service } = make({ friends: false, progress: true, supplements: true });
    await expect(service.getFriendProfile(1, 2)).rejects.toThrow();
    await expect(service.getFriendCalendar(1, 2, 2026, 10)).rejects.toThrow();
    await expect(service.getFriendProgress(1, 2)).rejects.toThrow();
  });
});

describe('calendario de un amigo', () => {
  it('se devuelve si son amigos y comparte sus suplementos', async () => {
    const { service, calendar } = make({ friends: true, supplements: true });
    await expect(service.getFriendCalendar(1, 2, 2026, 10)).resolves.toMatchObject({ month: '2026-10' });
    expect(calendar.getMonth).toHaveBeenCalledWith(2, 2026, 10);
  });

  it('si no lo comparte (aunque comparta su progreso), 403 SHARING_DISABLED', async () => {
    const { service, calendar } = make({ friends: true, progress: true, supplements: false });
    await expect(service.getFriendCalendar(1, 2, 2026, 10)).rejects.toMatchObject({
      response: { code: 'SHARING_DISABLED' },
    });
    expect(calendar.getMonth).not.toHaveBeenCalled();
  });
});

describe('solicitudes de amistad', () => {
  it('con email o con nombre de usuario responde lo mismo que si existiera', async () => {
    const { service } = make({ friends: false });
    for (const id of ['nadie@example.com', 'nadie']) {
      await expect(service.sendRequest(1, id)).resolves.toEqual({
        message: FRIEND_REQUEST_GENERIC,
      });
    }
  });

  it('si hay un bloqueo no se crea la solicitud, y la respuesta es la misma', async () => {
    const { service, prisma } = make({ friends: false, blocked: true, target: { id: 2 } });
    await expect(service.sendRequest(1, 'laura')).resolves.toEqual({ message: FRIEND_REQUEST_GENERIC });
    expect(prisma.friendship.create).not.toHaveBeenCalled();
  });
});

describe('interruptores de privacidad', () => {
  it('cada activación se guarda con su fecha en sharing_event', async () => {
    const { service, prisma } = make({ friends: true });
    await service.setSharing(1, { progress: true });
    expect(prisma.sharing_event.createMany).toHaveBeenCalledWith({
      data: [{ user_id: 1, setting: 'progress', enabled: true }],
    });
  });
});

describe('motivar a un amigo', () => {
  it('le manda un push recordándole lo que le falta hoy', async () => {
    const { service, push, prisma } = make({ friends: true });
    const result = await service.motivate(1, 2);
    expect(result).toEqual({ sent: true, delivered: true });
    expect(prisma.motivation.create).toHaveBeenCalled();
    expect(push.sendToUser).toHaveBeenCalledWith(
      2,
      expect.objectContaining({ title: '¡laura dice que no te olvides de tu creatina!' }),
    );
  });

  it('solo una vez al día por amigo (429)', async () => {
    const { service, push } = make({ friends: true, motivatedToday: true });
    await expect(service.motivate(1, 2)).rejects.toMatchObject({ status: 429 });
    expect(push.sendToUser).not.toHaveBeenCalled();
  });

  it('a quien no es amigo, no (403)', async () => {
    const { service, push } = make({ friends: false });
    await expect(service.motivate(1, 2)).rejects.toMatchObject({ status: 403 });
    expect(push.sendToUser).not.toHaveBeenCalled();
  });

  it('si ya lo ha tomado todo, solo ánimos', () => {
    expect(motivationMessage('alex', null, true)).toMatchObject({
      title: 'alex te manda ánimos 💪',
      body: 'Hoy ya lo tienes todo. ¡Sigue así!',
    });
  });

  it('nombres en minúscula salvo siglas', () => {
    expect(lowerFirst('Creatina')).toBe('creatina');
    expect(lowerFirst('Vitamina D')).toBe('vitamina D');
    expect(lowerFirst('ZMA')).toBe('ZMA');
    expect(lowerFirst('BCAA')).toBe('BCAA');
  });
});
