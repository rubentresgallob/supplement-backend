import { getJwtSecret } from './jwt-secret';

describe('getJwtSecret', () => {
  it('devuelve la clave configurada', () => {
    expect(getJwtSecret({ JWT_SECRET: 'clave-larga' })).toBe('clave-larga');
  });

  it.each([undefined, '', '   '])('falla si JWT_SECRET es %p (nunca usa una clave por defecto)', (value) => {
    expect(() => getJwtSecret({ JWT_SECRET: value })).toThrow('JWT_SECRET');
  });
});
