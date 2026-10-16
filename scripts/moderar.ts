/**
 * Herramienta mínima de moderación (se ejecuta en tu PC contra la base de datos del .env).
 * No hay endpoint de administración: así no queda nada expuesto en internet.
 *
 *   npx tsx --env-file=.env scripts/moderar.ts denuncias
 *   npx tsx --env-file=.env scripts/moderar.ts cerrar <idDenuncia>
 *   npx tsx --env-file=.env scripts/moderar.ts suspender <idUsuario> "<motivo>"
 *   npx tsx --env-file=.env scripts/moderar.ts reactivar <idUsuario>
 *   npx tsx --env-file=.env scripts/moderar.ts renombrar <idUsuario> "<motivo>" [nombreNuevo]
 *
 * Suspender y renombrar avisan por email al afectado con el motivo (Términos de uso:
 * "explicando el motivo al afectado"). Sin BREVO_API_KEY el email no se envía.
 */
import { PrismaClient } from '@prisma/client';
import { MailService } from '../src/mail/mail.service';
import { checkUsername } from '../src/moderation/username-filter';
const APP_NAME = 'Supplement Tracker';

const prisma = new PrismaClient();
const mail = new MailService();

async function notify(userId: number, subject: string, text: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) return;
  try {
    await mail.send(user.email, subject, `<p>${text.replace(/\n/g, '<br>')}</p><p style="color:#888">${APP_NAME}</p>`, text);
    console.log('Aviso enviado por email al usuario.');
  } catch (e) {
    console.log(`No se pudo enviar el email: ${(e as Error).message}`);
  }
}

async function main() {
  const [cmd, a, b, c] = process.argv.slice(2);
  switch (cmd) {
    case 'denuncias': {
      const reports = await prisma.user_report.findMany({
        where: { status: 'open' },
        include: { reported: { select: { id: true, username: true, suspended_at: true } } },
        orderBy: { created_at: 'asc' },
      });
      if (!reports.length) console.log('No hay denuncias abiertas.');
      for (const r of reports) {
        console.log(
          `#${r.id} ${r.created_at.toISOString().slice(0, 16)} | ${r.reason} | ` +
            `denunciado: ${r.reported ? `${r.reported.username} (id ${r.reported.id})${r.reported.suspended_at ? ' [suspendido]' : ''}` : '(cuenta borrada)'} | ` +
            `denunciante: id ${r.reporter_id}\n    ${r.details ?? '(sin texto)'}`,
        );
      }
      break;
    }
    case 'cerrar': {
      await prisma.user_report.update({ where: { id: Number(a) }, data: { status: 'closed' } });
      console.log(`Denuncia #${a} cerrada.`);
      break;
    }
    case 'suspender': {
      if (!b) throw new Error('Falta el motivo');
      await prisma.user.update({
        where: { id: Number(a) },
        data: { suspended_at: new Date(), suspension_reason: b },
      });
      console.log(`Usuario ${a} suspendido.`);
      await notify(
        Number(a),
        'Tu cuenta se ha suspendido',
        `Hemos suspendido tu cuenta por este motivo: ${b}\nSi crees que es un error, responde a este email.`,
      );
      break;
    }
    case 'reactivar': {
      await prisma.user.update({
        where: { id: Number(a) },
        data: { suspended_at: null, suspension_reason: null },
      });
      console.log(`Usuario ${a} reactivado.`);
      await notify(Number(a), 'Tu cuenta vuelve a estar activa', 'Hemos reactivado tu cuenta. Ya puedes iniciar sesión.');
      break;
    }
    case 'renombrar': {
      if (!b) throw new Error('Falta el motivo');
      const id = Number(a);
      const username = c ?? `usuario${id}`;
      if (checkUsername(username)) throw new Error(`"${username}" no pasa el filtro de nombres`);
      const taken = await prisma.user.findFirst({ where: { username, NOT: { id } } });
      if (taken) throw new Error(`"${username}" ya está en uso`);
      await prisma.user.update({ where: { id }, data: { username } });
      console.log(`Usuario ${id} renombrado a "${username}".`);
      await notify(
        id,
        'Hemos cambiado tu nombre de usuario',
        `Tu nombre de usuario ahora es "${username}". Motivo: ${b}\n` +
          'Si quieres otro, responde a este email con el que prefieres.',
      );
      break;
    }
    default:
      console.log('Comandos: denuncias | cerrar <id> | suspender <id> "<motivo>" | reactivar <id> | renombrar <id> "<motivo>" [nombre]');
  }
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
