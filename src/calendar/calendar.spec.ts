import { buildMonth } from './calendar.service';

const TODAY = new Date(2026, 9, 7, 12, 0); // miércoles 7 oct 2026
const at = (day: number, hour = 9, month = 9) => new Date(2026, month, day, hour, 0);

describe('buildMonth', () => {
  const creatina = { id: 1, name: 'Creatina', times_per_day: 1, created_at: at(28, 9, 8) }; // 28 sep
  const omega = { id: 2, name: 'Omega 3', times_per_day: 2, created_at: at(3) }; // 3 oct

  const intakes = [
    { user_supplement_id: 1, taken_at: at(1) },
    // día 2: nada
    { user_supplement_id: 1, taken_at: at(3) },
    { user_supplement_id: 2, taken_at: at(3, 8) },
    { user_supplement_id: 2, taken_at: at(3, 20) },
    { user_supplement_id: 1, taken_at: at(4) },
    { user_supplement_id: 2, taken_at: at(4) },
    { user_supplement_id: 2, taken_at: at(6) },
    { user_supplement_id: 2, taken_at: at(6, 10) },
    { user_supplement_id: 2, taken_at: at(6, 11) }, // tomas de más no suman
  ];

  const month = buildMonth([creatina, omega], intakes, new Set(['2026-10-05']), 2026, 10, TODAY);
  const day = (n: number) => month.days[n - 1];

  it('devuelve todos los días del mes', () => {
    expect(month.month).toBe('2026-10');
    expect(month.days).toHaveLength(31);
    expect(month.today).toBe('2026-10-07');
    expect(month.firstTracked).toBe('2026-09-28');
  });

  it('clasifica cada día: completo, parcial, sin tomar, hoy pendiente y futuro', () => {
    expect(day(1)).toMatchObject({ status: 'complete', taken: 1, expected: 1 });
    expect(day(2).status).toBe('missed');
    expect(day(3)).toMatchObject({ status: 'complete', taken: 3, expected: 3 });
    expect(day(4)).toMatchObject({ status: 'partial', taken: 2, expected: 3 });
    expect(day(6)).toMatchObject({ status: 'partial', taken: 2, expected: 3 });
    expect(day(7).status).toBe('pending'); // hoy aún no ha terminado
    expect(day(8).status).toBe('future');
  });

  it('un suplemento solo se espera desde que se añadió', () => {
    expect(day(2).supplements.map((s) => s.name)).toEqual(['Creatina']);
    expect(day(3).supplements.map((s) => s.name)).toEqual(['Creatina', 'Omega 3']);
  });

  it('detalla qué faltó y marca los días salvados por un protector', () => {
    expect(day(4).supplements).toEqual([
      { id: 1, name: 'Creatina', taken: 1, expected: 1, retired: false },
      { id: 2, name: 'Omega 3', taken: 1, expected: 2, retired: false },
    ]);
    expect(day(5)).toMatchObject({ status: 'missed', protected: true });
    expect(month.summary).toEqual({ complete: 2, partial: 2, missed: 2, protected: 1 });
  });

  describe('suplemento que el usuario quitó de su rutina', () => {
    // Magnesio: añadido el 1 de oct, quitado el 5 de oct por la tarde
    const magnesio = { id: 3, name: 'Magnesio', times_per_day: 2, created_at: at(1, 8), deleted_at: at(5, 18) };
    const taken = [
      { user_supplement_id: 3, taken_at: at(1, 9) },
      { user_supplement_id: 3, taken_at: at(1, 21) },
      { user_supplement_id: 3, taken_at: at(2, 9) },
      // día 3 y 4: nada
      { user_supplement_id: 3, taken_at: at(5, 9) }, // el día que lo quitó tomó 1 de 2
    ];
    const m = buildMonth([magnesio], taken, new Set(), 2026, 10, TODAY);
    const d = (n: number) => m.days[n - 1];

    it('conserva los días en que sí estaba en la rutina', () => {
      expect(d(1)).toMatchObject({ status: 'complete', taken: 2, expected: 2 });
      expect(d(2)).toMatchObject({ status: 'partial', taken: 1, expected: 2 });
      expect(d(3).status).toBe('missed');
      expect(d(1).supplements[0]).toMatchObject({ name: 'Magnesio', retired: true });
    });

    it('el día que se quitó solo cuenta lo que se llegó a tomar', () => {
      expect(d(5)).toMatchObject({ status: 'complete', taken: 1, expected: 1 });
    });

    it('deja de contar a partir del día siguiente', () => {
      expect(d(6)).toMatchObject({ status: 'none', expected: 0, supplements: [] });
      expect(d(7).status).toBe('none'); // hoy
    });

    it('si el día que se quitó no se había tomado nada, ese día no cuenta', () => {
      const m2 = buildMonth([{ ...magnesio, deleted_at: at(3, 10) }], taken, new Set(), 2026, 10, TODAY);
      expect(m2.days[2]).toMatchObject({ status: 'none', expected: 0 });
      expect(m2.days[1].status).toBe('partial');
    });
  });

  it('un mes anterior a cualquier suplemento no tiene nada que tomar', () => {
    const august = buildMonth([creatina, omega], [], new Set(), 2026, 8, TODAY);
    expect(august.days.every((d) => d.status === 'none')).toBe(true);
  });
});
