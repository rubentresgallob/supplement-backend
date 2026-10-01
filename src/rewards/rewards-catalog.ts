/** Puntos por completar todas las tomas de un día. */
export const DAILY_COMPLETE_POINTS = 10;

/**
 * Solo se premian los días de hoy y ayer. Así no se pueden ganar puntos
 * registrando tomas con fecha antigua.
 */
export const DAILY_REWARD_WINDOW_DAYS = 1;

/** Días hacia atrás que un protector puede cubrir (48 h). */
export const STREAK_REPAIR_WINDOW_DAYS = 2;

/**
 * Racha mínima (días seguidos antes del fallo) para que merezca la pena
 * gastar un protector. Así no se pierden 150 puntos salvando una racha de 1 día.
 */
export const MIN_STREAK_TO_REPAIR = 2;

export interface WeeklyGoal {
  code: string;
  title: string;
  daysRequired: number;
  points: number;
}

export const WEEKLY_GOALS: WeeklyGoal[] = [
  { code: 'weekly_5', title: 'Completa 5 días esta semana', daysRequired: 5, points: 30 },
  { code: 'weekly_7', title: 'Semana perfecta (7 de 7)', daysRequired: 7, points: 50 },
];

export type AchievementType =
  | 'streak'
  | 'first_intake'
  | 'first_day'
  | 'friends'
  | 'active_supplements'
  | 'items';

export interface Achievement {
  code: string;
  title: string;
  description: string;
  icon: string;
  type: AchievementType;
  /** Valor a alcanzar (días de racha, nº de amigos...). */
  target: number;
  points: number;
  /** Objeto exclusivo que se regala al conseguirlo. */
  rewardItem?: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { code: 'first_intake', title: 'Primer paso', description: 'Registra tu primera toma.', icon: '💊', type: 'first_intake', target: 1, points: 20 },
  { code: 'first_day', title: 'Día redondo', description: 'Completa todas las tomas de un día.', icon: '✅', type: 'first_day', target: 1, points: 20 },
  { code: 'supplements_3', title: 'Coleccionista', description: 'Ten 3 suplementos activos.', icon: '🧪', type: 'active_supplements', target: 3, points: 20 },
  { code: 'first_friend', title: 'En compañía', description: 'Añade tu primer amigo.', icon: '🤝', type: 'friends', target: 1, points: 20 },
  { code: 'friends_5', title: 'Equipo Capsu', description: 'Ten 5 amigos.', icon: '👥', type: 'friends', target: 5, points: 50 },
  { code: 'first_item', title: 'De compras', description: 'Consigue tu primer objeto de la tienda.', icon: '🛍️', type: 'items', target: 1, points: 10 },
  { code: 'streak_3', title: 'Calentando', description: 'Racha de 3 días.', icon: '🔥', type: 'streak', target: 3, points: 20 },
  { code: 'streak_7', title: 'Una semana', description: 'Racha de 7 días.', icon: '🔥', type: 'streak', target: 7, points: 50 },
  { code: 'streak_14', title: 'Dos semanas', description: 'Racha de 14 días.', icon: '🔥', type: 'streak', target: 14, points: 100 },
  { code: 'streak_30', title: 'Un mes', description: 'Racha de 30 días.', icon: '🔥', type: 'streak', target: 30, points: 200, rewardItem: 'medal_streak_30' },
  { code: 'streak_60', title: 'Dos meses', description: 'Racha de 60 días.', icon: '🔥', type: 'streak', target: 60, points: 300 },
  { code: 'streak_100', title: 'Centenario', description: 'Racha de 100 días.', icon: '💯', type: 'streak', target: 100, points: 500, rewardItem: 'medal_streak_100' },
  { code: 'streak_365', title: 'Leyenda', description: 'Racha de 365 días.', icon: '👑', type: 'streak', target: 365, points: 1000, rewardItem: 'medal_streak_365' },
];
