/**
 * Campos del catálogo que viajan a la app: solo los que se muestran.
 * La dosis típica, las funciones, los beneficios y las notas se quedan en la base
 * de datos: la app no propone dosis ni hace afirmaciones de salud.
 */
export const CATALOG_PUBLIC = { id: true, name: true, category: true, forms: true } as const;
