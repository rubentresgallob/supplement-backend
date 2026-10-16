/**
 * Filtro básico de nombres de usuario: términos ofensivos en español y nombres
 * reservados. No es perfecto (nadie lo es): para lo que se cuele están las denuncias.
 */

/** Nombres que podrían usarse para suplantar a la app o al equipo. */
const RESERVED = [
  'admin', 'administrador', 'administracion', 'soporte', 'support', 'ayuda', 'help',
  'moderador', 'moderacion', 'mod', 'staff', 'equipo', 'oficial', 'official', 'root',
  'sistema', 'system', 'capsu', 'supplementtracker', 'supplement', 'suplementos',
  'misuplementacion', 'privacidad', 'legal', 'seguridad', 'security',
];

/** Reservados también como comienzo del nombre ("admin_pepe", "soporteapp"). */
const RESERVED_PREFIX = [
  'admin', 'soporte', 'support', 'moderador', 'oficial', 'official',
  'supplementtracker', 'misuplementacion', 'capsuoficial',
];

/** Términos largos e inequívocos: se buscan dentro del nombre (sin separadores). */
const OFFENSIVE_ANYWHERE = [
  'hijodeputa', 'hijaputa', 'hijueputa', 'malparido', 'gilipollas', 'subnormal',
  'maricon', 'mariconazo', 'bollera', 'tortillera', 'mongolo', 'retrasado', 'negrata',
  'sudaca', 'panchito', 'moromierda', 'pederasta', 'pedofilo', 'violador', 'nazi',
  'hitler', 'heilhitler', 'kukluxklan', 'putero', 'follar', 'folladora', 'chupapollas',
  'comepollas', 'mamada', 'zorra', 'mierda', 'cabron', 'cabrona', 'capullo', 'imbecil',
  'gonorrea', 'porno', 'masturb', 'eyacul', 'terrorista', 'yihad',
];

/** Términos cortos que aparecen dentro de palabras normales ("computadora", "cálculo"):
 *  solo cuentan si son una palabra entera del nombre. */
const OFFENSIVE_WORD = [
  'puta', 'puto', 'putas', 'putos', 'culo', 'polla', 'pene', 'coño', 'cono', 'teta',
  'tetas', 'nabo', 'chocho', 'marica', 'perra', 'guarra', 'idiota', 'tonto', 'kkk',
  'sex', 'sexo', 'xxx', 'joder', 'hostia', 'ostia',
];

/** Minúsculas, sin tildes y con los números típicos del "leet" traducidos. */
function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's');
}

export type UsernameProblem = 'reserved' | 'offensive' | null;

export function checkUsername(username: string): UsernameProblem {
  const norm = normalize(username);
  const compact = norm.replace(/[^a-zñ]/g, '');
  // "pepe_Puta" o "PepePuta" → palabras: pepe, puta
  const words = normalize(username.replace(/([a-z])([A-Z])/g, '$1 $2'))
    .split(/[^a-zñ]+/)
    .filter(Boolean);

  // Exacto (también con números: "admin2", "4dmin") o, para los más claros, al principio
  const plain = username.toLowerCase().normalize('NFD').replace(/[^a-zñ]/g, '');
  if (
    RESERVED.includes(plain) ||
    RESERVED.includes(compact) ||
    RESERVED_PREFIX.some((r) => plain.startsWith(r) || compact.startsWith(r))
  ) {
    return 'reserved';
  }
  if (OFFENSIVE_ANYWHERE.some((t) => compact.includes(t))) return 'offensive';
  if (OFFENSIVE_WORD.some((t) => words.includes(t) || compact === t)) return 'offensive';
  return null;
}

export const USERNAME_NOT_ALLOWED = 'Ese nombre de usuario no está permitido. Prueba con otro';
