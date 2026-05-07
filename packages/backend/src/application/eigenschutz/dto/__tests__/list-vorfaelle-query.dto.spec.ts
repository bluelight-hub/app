import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListVorfaelleQueryDto } from '../list-vorfaelle-query.dto';

async function transformAndValidate(plain: Record<string, unknown>): Promise<{ dto: ListVorfaelleQueryDto; errors: ReturnType<typeof validate> extends Promise<infer T> ? T : never }> {
  const dto = plainToInstance(ListVorfaelleQueryDto, plain);
  const errors = await validate(dto);
  return { dto, errors };
}

describe('ListVorfaelleQueryDto (Story 5.3 AC3)', () => {
  it('(D1) akzeptiert leeren Query (alle Felder optional)', async () => {
    const { dto, errors } = await transformAndValidate({});
    expect(errors).toHaveLength(0);
    expect(dto.einheitIds).toBeUndefined();
    expect(dto.vorfallZeitVon).toBeUndefined();
    expect(dto.vorfallZeitBis).toBeUndefined();
    expect(dto.unfallkasseRelevant).toBeUndefined();
  });

  it('(D2) splittet einheitIds-CSV-String zu getrimmtem Array', async () => {
    const { dto, errors } = await transformAndValidate({ einheitIds: ' clw3h8x9y0000qwertyui05002 , clw3h8x9y0000qwertyui05004 ' });
    expect(errors).toHaveLength(0);
    expect(dto.einheitIds).toEqual(['clw3h8x9y0000qwertyui05002', 'clw3h8x9y0000qwertyui05004']);
  });

  it('(D3) leerer einheitIds-String → undefined (kein Filter, NICHT „keine Treffer")', async () => {
    // Code-Review F8: Empty CSV semantisch = „kein Filter gesetzt".
    // Vorher landete `''` als `[]` und der Repo-Short-Circuit lieferte 0 Rows.
    const { dto, errors } = await transformAndValidate({ einheitIds: '' });
    expect(errors).toHaveLength(0);
    expect(dto.einheitIds).toBeUndefined();
  });

  it('(D3b) CSV mit nur Whitespace-/Leer-Tokens → undefined', async () => {
    const { dto, errors } = await transformAndValidate({ einheitIds: ',  ,,' });
    expect(errors).toHaveLength(0);
    expect(dto.einheitIds).toBeUndefined();
  });

  it('(D4) ungültige CUID2 → Validation-Error', async () => {
    const { errors } = await transformAndValidate({ einheitIds: 'NOT_A_VALID_CUID2' });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('einheitIds');
  });

  it('(D5) > 50 einheitIds-Einträge → ArrayMaxSize-Error', async () => {
    const ids = Array.from({ length: 51 }, () => 'clw3h8x9y0000qwertyui05002').join(',');
    const { errors } = await transformAndValidate({ einheitIds: ids });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('arrayMaxSize');
  });

  it('(D6) ISO-Datum-Validation für vorfallZeitVon/Bis', async () => {
    const ok = await transformAndValidate({ vorfallZeitVon: '2026-05-01T00:00:00.000Z', vorfallZeitBis: '2026-05-08T00:00:00.000Z' });
    expect(ok.errors).toHaveLength(0);

    const bad = await transformAndValidate({ vorfallZeitVon: '01.05.2026' });
    expect(bad.errors.length).toBeGreaterThan(0);
  });

  it('(D7) Boolean-Coercion für unfallkasseRelevant aus Query-String', async () => {
    const yes = await transformAndValidate({ unfallkasseRelevant: 'true' });
    expect(yes.errors).toHaveLength(0);
    expect(yes.dto.unfallkasseRelevant).toBe(true);

    const no = await transformAndValidate({ unfallkasseRelevant: 'false' });
    expect(no.errors).toHaveLength(0);
    expect(no.dto.unfallkasseRelevant).toBe(false);

    const bogus = await transformAndValidate({ unfallkasseRelevant: 'maybe' });
    expect(bogus.errors.length).toBeGreaterThan(0);
  });
});
