import 'reflect-metadata';
import { validate } from 'class-validator';
import { HasExactlyOneKraftReference } from '../exactly-one-kraft.validator';

class TestZuordnungDto {
  fahrzeugId?: string;
  personId?: string;
  einheitId?: string;

  @HasExactlyOneKraftReference()
  _marker?: unknown;
}

function makeDto(props: Partial<TestZuordnungDto>): TestZuordnungDto {
  const dto = new TestZuordnungDto();
  Object.assign(dto, props);
  return dto;
}

describe('HasExactlyOneKraftReference', () => {
  it('akzeptiert genau eine gesetzte Kraft-ID (fahrzeugId)', async () => {
    const dto = makeDto({ fahrzeugId: 'fz-1' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('akzeptiert genau eine gesetzte Kraft-ID (personId)', async () => {
    const dto = makeDto({ personId: 'p-1' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('akzeptiert genau eine gesetzte Kraft-ID (einheitId)', async () => {
    const dto = makeDto({ einheitId: 'e-1' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('lehnt ab, wenn keine ID gesetzt ist', async () => {
    const dto = makeDto({});
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('hasExactlyOneKraftReference');
  });

  it('lehnt ab, wenn zwei IDs gesetzt sind', async () => {
    const dto = makeDto({ fahrzeugId: 'fz-1', personId: 'p-1' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
  });

  it('lehnt ab, wenn alle drei IDs gesetzt sind', async () => {
    const dto = makeDto({ fahrzeugId: 'fz-1', personId: 'p-1', einheitId: 'e-1' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
  });

  it('behandelt leere Strings als "nicht gesetzt"', async () => {
    const dto = makeDto({ fahrzeugId: '   ', personId: 'p-1' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
