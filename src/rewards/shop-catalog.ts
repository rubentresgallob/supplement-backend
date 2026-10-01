/**
 * Catálogo de la tienda. Vive en código (no en BD) para poder cambiar
 * precios u objetos con un simple deploy. En BD solo se guarda `item_code`.
 *
 * - `slot`: hueco donde se equipa. Solo un objeto equipado por slot.
 * - `price: null` → no se puede comprar, se desbloquea con un logro.
 * - `colors`: degradado para banners / skins de Capsu (la app los pinta).
 * - `proOnly`: solo se puede comprar con el plan Pro (si deja Pro, lo conserva).
 */
export type ItemCategory = 'consumable' | 'medal' | 'banner' | 'capsu';
export type ItemSlot =
  | 'medal'
  | 'banner'
  | 'capsu_head'
  | 'capsu_face'
  | 'capsu_neck'
  | 'capsu_skin';
export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface ShopItem {
  code: string;
  name: string;
  description: string;
  category: ItemCategory;
  slot?: ItemSlot;
  price: number | null;
  icon: string;
  rarity: ItemRarity;
  maxOwned: number;
  colors?: string[];
  proOnly?: boolean;
}

export const STREAK_FREEZE_CODE = 'streak_freeze';

export const SHOP_ITEMS: ShopItem[] = [
  // === Consumibles ===
  {
    code: STREAK_FREEZE_CODE,
    name: 'Protector de racha',
    description:
      'Si fallas un día, protege tu racha automáticamente. Si ya la perdiste hace menos de 48 h, cómpralo y la recuperas.',
    category: 'consumable',
    price: 150,
    icon: '🛡️',
    rarity: 'rare',
    maxOwned: 2,
  },

  // === Medallas ===
  { code: 'medal_bronze', name: 'Medalla de bronce', description: 'Un buen comienzo.', category: 'medal', slot: 'medal', price: 100, icon: '🥉', rarity: 'common', maxOwned: 1 },
  { code: 'medal_silver', name: 'Medalla de plata', description: 'La constancia se nota.', category: 'medal', slot: 'medal', price: 250, icon: '🥈', rarity: 'rare', maxOwned: 1 },
  { code: 'medal_gold', name: 'Medalla de oro', description: 'Para los más disciplinados.', category: 'medal', slot: 'medal', price: 500, icon: '🥇', rarity: 'epic', maxOwned: 1 },
  { code: 'medal_capsule', name: 'Cápsula dorada', description: 'El emblema de Capsu.', category: 'medal', slot: 'medal', price: 300, icon: '💊', rarity: 'rare', maxOwned: 1 },
  { code: 'medal_streak_30', name: 'Llama de 30 días', description: 'Exclusiva: consigue una racha de 30 días.', category: 'medal', slot: 'medal', price: null, icon: '🔥', rarity: 'epic', maxOwned: 1 },
  { code: 'medal_streak_100', name: 'Centenario', description: 'Exclusiva: consigue una racha de 100 días.', category: 'medal', slot: 'medal', price: null, icon: '💯', rarity: 'legendary', maxOwned: 1 },
  { code: 'medal_streak_365', name: 'Leyenda', description: 'Exclusiva: un año entero sin fallar.', category: 'medal', slot: 'medal', price: null, icon: '👑', rarity: 'legendary', maxOwned: 1 },

  // === Banners de perfil ===
  { code: 'banner_sunrise', name: 'Amanecer', description: 'Para los que toman todo a primera hora.', category: 'banner', slot: 'banner', price: 150, icon: '🌅', rarity: 'common', maxOwned: 1, colors: ['#FF6B35', '#F7931E'] },
  { code: 'banner_ocean', name: 'Océano', description: 'Hidratación ante todo.', category: 'banner', slot: 'banner', price: 150, icon: '🌊', rarity: 'common', maxOwned: 1, colors: ['#2193B0', '#6DD5ED'] },
  { code: 'banner_forest', name: 'Bosque', description: 'Natural y constante.', category: 'banner', slot: 'banner', price: 200, icon: '🌲', rarity: 'rare', maxOwned: 1, colors: ['#134E5E', '#71B280'] },
  { code: 'banner_galaxy', name: 'Galaxia', description: 'Tu constancia no tiene límites.', category: 'banner', slot: 'banner', price: 400, icon: '🌌', rarity: 'epic', maxOwned: 1, colors: ['#667EEA', '#764BA2'] },

  // === Accesorios de Capsu ===
  { code: 'capsu_head_cap', name: 'Gorra deportiva', description: 'Capsu listo para entrenar.', category: 'capsu', slot: 'capsu_head', price: 120, icon: '🧢', rarity: 'common', maxOwned: 1 },
  { code: 'capsu_head_party', name: 'Gorro de fiesta', description: 'Para celebrar cada hito.', category: 'capsu', slot: 'capsu_head', price: 200, icon: '🥳', rarity: 'rare', maxOwned: 1 },
  { code: 'capsu_head_crown', name: 'Corona', description: 'El rey de la constancia.', category: 'capsu', slot: 'capsu_head', price: 600, icon: '👑', rarity: 'legendary', maxOwned: 1 },
  { code: 'capsu_face_sunglasses', name: 'Gafas de sol', description: 'Capsu en modo verano.', category: 'capsu', slot: 'capsu_face', price: 150, icon: '🕶️', rarity: 'common', maxOwned: 1 },
  { code: 'capsu_face_glasses', name: 'Gafas de empollón', description: 'Se ha leído todos los estudios.', category: 'capsu', slot: 'capsu_face', price: 120, icon: '👓', rarity: 'common', maxOwned: 1 },
  { code: 'capsu_neck_scarf', name: 'Bufanda', description: 'Para el invierno (y la vitamina D).', category: 'capsu', slot: 'capsu_neck', price: 100, icon: '🧣', rarity: 'common', maxOwned: 1 },
  { code: 'capsu_neck_medal', name: 'Medalla al cuello', description: 'Capsu también compite.', category: 'capsu', slot: 'capsu_neck', price: 250, icon: '🏅', rarity: 'rare', maxOwned: 1 },
  { code: 'capsu_skin_mint', name: 'Capsu menta', description: 'Un Capsu fresquito.', category: 'capsu', slot: 'capsu_skin', price: 300, icon: '🍃', rarity: 'rare', maxOwned: 1, colors: ['#3EB489', '#A8E6CF'] },
  { code: 'capsu_skin_gold', name: 'Capsu dorado', description: 'El Capsu más brillante.', category: 'capsu', slot: 'capsu_skin', price: 800, icon: '✨', rarity: 'legendary', maxOwned: 1, colors: ['#F7971E', '#FFD200'] },

  // === Exclusivos Pro ===
  { code: 'medal_pro_diamond', name: 'Diamante Pro', description: 'La medalla de los miembros Pro.', category: 'medal', slot: 'medal', price: 200, icon: '💎', rarity: 'epic', maxOwned: 1, proOnly: true },
  { code: 'banner_aurora', name: 'Aurora', description: 'Un cielo boreal solo para Pro.', category: 'banner', slot: 'banner', price: 250, icon: '🌠', rarity: 'epic', maxOwned: 1, colors: ['#00C9A7', '#845EC2'], proOnly: true },
  { code: 'capsu_head_halo', name: 'Aureola', description: 'Capsu, el más constante del cielo.', category: 'capsu', slot: 'capsu_head', price: 300, icon: '😇', rarity: 'epic', maxOwned: 1, proOnly: true },
  { code: 'capsu_skin_galaxy', name: 'Capsu galaxia', description: 'Un Capsu de otro planeta.', category: 'capsu', slot: 'capsu_skin', price: 500, icon: '🌌', rarity: 'legendary', maxOwned: 1, colors: ['#4E54C8', '#8F94FB'], proOnly: true },
];

export const findShopItem = (code: string) =>
  SHOP_ITEMS.find((item) => item.code === code);
