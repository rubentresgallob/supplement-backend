/**
 * Plan Pro: lo que se muestra en la pantalla "Hazte Pro".
 * Los precios reales los pondrán Apple/Google (vía RevenueCat) al publicar;
 * estos son solo para mostrar mientras tanto.
 */
export const PRO_PRICES = [
  { id: 'monthly', label: 'Mensual', price: '2,99 €', period: 'al mes', highlight: false },
  { id: 'yearly', label: 'Anual', price: '19,99 €', period: 'al año', note: '1,67 €/mes · ahorras un 44 %', highlight: true },
];

export const PRO_TRIAL_DAYS = 7;

export const PRO_FEATURES = [
  { code: 'stock', icon: '📦', title: 'Control de stock', description: 'Te avisa antes de que se te acabe un suplemento.' },
  { code: 'stats', icon: '📊', title: 'Estadísticas avanzadas', description: 'Calendario de cumplimiento, gráficos y mejores días.' },
  { code: 'pdf', icon: '📄', title: 'Informe en PDF', description: 'Para tu médico o nutricionista.' },
  { code: 'points', icon: '💎', title: 'Puntos x1,5', description: 'Más puntos por cada día completo y objetivo semanal.' },
  { code: 'protector', icon: '🛡️', title: 'Protector gratis cada mes', description: 'Tu racha, siempre a salvo.' },
  { code: 'items', icon: '👑', title: 'Objetos exclusivos de Capsu', description: 'Aureola, Capsu galaxia y más, solo para Pro.' },
];

/** Multiplicador de puntos diarios y semanales para usuarios Pro. */
export const PRO_POINTS_MULTIPLIER = 1.5;

/** El modo de prueba permite activar Pro sin pagar. Quitar en Render al publicar. */
export const isProTestMode = () => process.env.PRO_TEST_MODE === 'true';

export const isProActive = (proUntil: Date | null | undefined, now = new Date()) =>
  !!proUntil && proUntil > now;
