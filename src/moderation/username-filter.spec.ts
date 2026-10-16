import { checkUsername } from './username-filter';

describe('filtro de nombres de usuario', () => {
  it('deja pasar nombres normales, aunque contengan trozos de palabrotas', () => {
    for (const ok of ['ana_gym', 'computadora', 'calculo', 'Disputa', 'capsulas_fan', 'modesto', 'pepe23']) {
      expect(checkUsername(ok)).toBeNull();
    }
  });

  it('bloquea nombres reservados, también con números o leet', () => {
    for (const bad of ['admin', 'Admin2', '4dmin', 'soporte_app', 'Capsu', 'capsu1', 'supplementtracker']) {
      expect(checkUsername(bad)).toBe('reserved');
    }
  });

  it('bloquea términos ofensivos', () => {
    for (const bad of ['hijodeputa', 'H1j0D3Put4', 'pepe_puta', 'PepePuta', 'gilipollas99', 'nazi_power']) {
      expect(checkUsername(bad)).toBe('offensive');
    }
  });
});
