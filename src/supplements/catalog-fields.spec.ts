import { CATALOG_PUBLIC } from './catalog-fields';

describe('catálogo que viaja a la app', () => {
  it('no incluye dosis típica, funciones, beneficios ni notas', () => {
    expect(Object.keys(CATALOG_PUBLIC).sort()).toEqual(['category', 'forms', 'id', 'name']);
  });
});
