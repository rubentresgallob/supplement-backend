import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RewardsService } from './rewards.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { isProEnabled } from '../subscription/pro-plan';
import { findShopItem, SHOP_ITEMS } from './shop-catalog';

@Injectable()
export class ShopService {
  private readonly logger = new Logger(ShopService.name);

  constructor(
    private prisma: PrismaService,
    private rewardsService: RewardsService,
    private subscriptionService: SubscriptionService,
  ) {}

  /** Catálogo con lo que el usuario ya tiene y si se lo puede permitir. */
  async getItems(userId: number) {
    const [user, owned, isPro] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { points: true },
      }),
      this.prisma.user_item.findMany({ where: { user_id: userId } }),
      this.subscriptionService.isPro(userId),
    ]);
    const points = user?.points ?? 0;
    const ownedByCode = new Map(owned.map((i) => [i.item_code, i]));

    // Sin Pro encendido, los objetos Pro no existen para la app
    const catalog = isProEnabled() ? SHOP_ITEMS : SHOP_ITEMS.filter((i) => !i.proOnly);

    return {
      points,
      ...(isProEnabled() ? { isPro } : {}),
      items: catalog.map((item) => {
        const mine = ownedByCode.get(item.code);
        const quantity = mine?.quantity ?? 0;
        return {
          ...item,
          owned: quantity,
          equipped: mine?.equipped ?? false,
          exclusive: item.price === null,
          ...(isProEnabled() ? { proOnly: item.proOnly ?? false } : {}),
          canBuy:
            item.price !== null &&
            (!item.proOnly || isPro) &&
            quantity < item.maxOwned &&
            points >= item.price,
        };
      }),
    };
  }

  async buy(userId: number, itemCode: string) {
    const item = findShopItem(itemCode);
    if (!item || (item.proOnly && !isProEnabled())) {
      throw new NotFoundException('Ese objeto no existe');
    }
    if (item.price === null) {
      throw new BadRequestException(
        'Este objeto es exclusivo: se consigue con un logro',
      );
    }
    const price = item.price;
    if (item.proOnly && !(await this.subscriptionService.isPro(userId))) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'PRO_REQUIRED',
        message: 'Este objeto es exclusivo del plan Pro',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      const mine = await tx.user_item.findUnique({
        where: { user_id_item_code: { user_id: userId, item_code: item.code } },
      });
      if ((mine?.quantity ?? 0) >= item.maxOwned) {
        throw new BadRequestException(
          item.maxOwned === 1
            ? 'Ya tienes este objeto'
            : `Solo puedes tener ${item.maxOwned} a la vez`,
        );
      }

      // Resta los puntos solo si llegan (evita saldo negativo con compras simultáneas)
      const paid = await tx.user.updateMany({
        where: { id: userId, points: { gte: price } },
        data: { points: { decrement: price } },
      });
      if (paid.count === 0) {
        throw new BadRequestException('No tienes suficientes puntos');
      }

      await tx.points_transaction.create({
        data: { user_id: userId, amount: -price, reason: `Compra: ${item.name}` },
      });
      await tx.user_item.upsert({
        where: { user_id_item_code: { user_id: userId, item_code: item.code } },
        create: { user_id: userId, item_code: item.code },
        update: { quantity: { increment: 1 } },
      });
    });

    this.logger.log(`User ${userId} bought ${item.code} for ${price} points`);

    // Puede reparar la racha (si era un protector) o desbloquear el logro de primera compra
    const summary = await this.rewardsService.getSummary(userId);
    return {
      item: item.code,
      points: summary.points,
      newRewards: summary.newRewards,
      streak: summary.streak,
    };
  }

  async equip(userId: number, itemCode: string) {
    const item = findShopItem(itemCode);
    if (!item) throw new NotFoundException('Ese objeto no existe');
    if (!item.slot) throw new BadRequestException('Este objeto no se puede equipar');

    const mine = await this.prisma.user_item.findUnique({
      where: { user_id_item_code: { user_id: userId, item_code: item.code } },
    });
    if (!mine || mine.quantity < 1) {
      throw new BadRequestException('Todavía no tienes este objeto');
    }

    // Solo un objeto por hueco: se desequipa el resto del mismo slot
    const sameSlot = SHOP_ITEMS.filter((i) => i.slot === item.slot).map(
      (i) => i.code,
    );
    await this.prisma.$transaction([
      this.prisma.user_item.updateMany({
        where: { user_id: userId, item_code: { in: sameSlot } },
        data: { equipped: false },
      }),
      this.prisma.user_item.update({
        where: { id: mine.id },
        data: { equipped: true },
      }),
    ]);

    return { equipped: item.code, slot: item.slot };
  }

  async unequip(userId: number, itemCode: string) {
    await this.prisma.user_item.updateMany({
      where: { user_id: userId, item_code: itemCode },
      data: { equipped: false },
    });
    return { unequipped: itemCode };
  }
}
