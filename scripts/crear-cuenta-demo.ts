/**
 * Cuenta de demostración para los revisores de App Store y Google Play.
 * Crea (o vuelve a crear desde cero) 3 usuarios: el revisor, una amiga que comparte su
 * progreso y sus suplementos, y alguien que le ha enviado una solicitud de amistad.
 * Las tres cuentas quedan verificadas y con los textos legales vigentes aceptados.
 *
 *   npx tsx --env-file=.env scripts/crear-cuenta-demo.ts <email-revisor> <contraseña>
 *
 * ⚠️ Escribe en la base de datos del .env (producción): ejecútalo después de la migración.
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { subDays, setHours } from 'date-fns';
import { acceptanceData } from '../src/legal/legal';

const prisma = new PrismaClient();

const FRIEND_EMAIL = 'amiga.demo@example.com';
const REQUESTER_EMAIL = 'nuevo.demo@example.com';

type Sup = { name: string; form: string; amount: number; unit: string; times: number; schedules: string[] };

const REVIEWER_STACK: Sup[] = [
  { name: 'Creatina', form: 'polvo', amount: 5, unit: 'g', times: 1, schedules: ['mañana'] },
  { name: 'Vitamina D3', form: 'cápsula', amount: 1000, unit: 'UI', times: 1, schedules: ['mañana'] },
  { name: 'Magnesio', form: 'comprimido', amount: 300, unit: 'mg', times: 2, schedules: ['mediodía', 'noche'] },
];
const FRIEND_STACK: Sup[] = [
  { name: 'Omega 3', form: 'cápsula', amount: 1, unit: 'g', times: 1, schedules: ['mañana'] },
  { name: 'Creatina', form: 'polvo', amount: 3, unit: 'g', times: 1, schedules: ['tarde'] },
];

async function createUser(email: string, username: string, password: string, extra: object = {}) {
  return prisma.user.create({
    data: {
      email,
      username,
      password: await bcrypt.hash(password, 10),
      email_verified: true,
      created_at: subDays(new Date(), 40),
      last_login_at: new Date(),
      social_intro_seen_at: new Date(),
      ...acceptanceData(),
      ...extra,
      notification_config: { create: { global_enabled: true, supplement_configs: '[]' } },
    },
  });
}

/** Stack + tomas de los últimos `days` días (salta algunos para que el calendario tenga de todo). */
async function addStack(userId: number, stack: Sup[], days: number, skip: (day: number) => boolean) {
  for (const s of stack) {
    const catalog = await prisma.supplement_database.findFirst({
      where: { name: { contains: s.name, mode: 'insensitive' } },
      select: { id: true },
    });
    const us = await prisma.user_supplement.create({
      data: {
        user_id: userId,
        supplement_database_id: catalog?.id ?? null,
        custom_name: catalog ? null : s.name,
        form: s.form,
        dosage_amount: s.amount,
        dosage_unit: s.unit,
        times_per_day: s.times,
        schedules: s.schedules,
        created_at: subDays(new Date(), days + 1),
      },
    });
    const intakes: { user_id: number; user_supplement_id: number; taken_at: Date }[] = [];
    for (let d = days; d >= 1; d--) {
      if (skip(d)) continue;
      for (let t = 0; t < s.times; t++) {
        intakes.push({ user_id: userId, user_supplement_id: us.id, taken_at: setHours(subDays(new Date(), d), 9 + t * 10) });
      }
    }
    await prisma.intake.createMany({ data: intakes });
  }
}

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password || password.length < 8) {
    throw new Error('Uso: crear-cuenta-demo.ts <email-revisor> <contraseña de 8 o más caracteres>');
  }

  // Desde cero: borra las cuentas demo anteriores (en cascada)
  await prisma.user.deleteMany({ where: { email: { in: [email, FRIEND_EMAIL, REQUESTER_EMAIL] } } });

  const reviewer = await createUser(email, 'revisor_demo', password, { points: 180 });
  const friend = await createUser(FRIEND_EMAIL, 'laura_demo', password, {
    share_progress: true,
    share_supplements: true,
    points: 320,
  });
  const requester = await createUser(REQUESTER_EMAIL, 'pablo_demo', password);

  await addStack(reviewer.id, REVIEWER_STACK, 21, (d) => d === 9 || d === 14);
  await addStack(friend.id, FRIEND_STACK, 30, () => false);

  await prisma.friendship.create({ data: { requester_id: friend.id, receiver_id: reviewer.id, status: 'accepted' } });
  await prisma.friendship.create({ data: { requester_id: requester.id, receiver_id: reviewer.id, status: 'pending' } });
  await prisma.user_item.createMany({
    data: [
      { user_id: reviewer.id, item_code: 'medal_bronze', equipped: true },
      { user_id: friend.id, item_code: 'medal_silver', equipped: true },
    ],
  });

  console.log(`Cuenta demo lista: ${email} (usuario revisor_demo), con amiga laura_demo y una solicitud de pablo_demo.`);
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
