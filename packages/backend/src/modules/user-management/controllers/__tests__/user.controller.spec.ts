// @ts-nocheck
import { Result } from '@domain/common/result';
import { UserController } from '../user.controller';

describe('UserController.findAllBasic', () => {
  let controller: UserController;
  let mockGetAllUsersHandler: any;
  let mockGetUserByIdHandler: any;

  const buildUserDto = (overrides: Record<string, unknown> = {}) => ({
    id: 'user-1',
    username: 'admin',
    role: 'ADMIN',
    createdAt: new Date('2024-01-01T12:00:00Z'),
    updatedAt: new Date('2024-01-02T12:00:00Z'),
    isLocked: false,
    lockReason: null,
    operativeRole: 'EINSATZKRAFT',
    stammperson: null,
    ...overrides,
  });

  beforeEach(() => {
    mockGetAllUsersHandler = { execute: jest.fn() };
    mockGetUserByIdHandler = { execute: jest.fn() };
    controller = new UserController(mockGetAllUsersHandler, mockGetUserByIdHandler);
  });

  it('liefert displayName aus verknüpfter Stammperson (Vorname Nachname)', async () => {
    mockGetAllUsersHandler.execute.mockResolvedValue(
      Result.ok([
        buildUserDto({
          stammperson: { id: 'sp-1', vorname: 'Max', nachname: 'Mustermann', personalnummer: 'P-001' },
        }),
      ]),
    );

    const result = await controller.findAllBasic();

    expect(result).toEqual([{ id: 'user-1', username: 'admin', displayName: 'Max Mustermann' }]);
  });

  it('liefert displayName null, wenn keine Stammperson verknüpft ist', async () => {
    mockGetAllUsersHandler.execute.mockResolvedValue(Result.ok([buildUserDto({ stammperson: null })]));

    const result = await controller.findAllBasic();

    expect(result[0].displayName).toBeNull();
    expect(result[0].username).toBe('admin');
  });

  it('trimmt Whitespace in Vor- und Nachname und kombiniert sie sauber', async () => {
    mockGetAllUsersHandler.execute.mockResolvedValue(
      Result.ok([
        buildUserDto({
          stammperson: { id: 'sp-2', vorname: '  Max  ', nachname: '  Mustermann  ', personalnummer: 'P-002' },
        }),
      ]),
    );

    const result = await controller.findAllBasic();

    expect(result[0].displayName).toBe('Max Mustermann');
  });

  it('fällt auf einzelnes Namensfeld zurück, wenn nur eines befüllt ist', async () => {
    mockGetAllUsersHandler.execute.mockResolvedValue(
      Result.ok([
        buildUserDto({
          stammperson: { id: 'sp-3', vorname: 'Max', nachname: '', personalnummer: 'P-003' },
        }),
      ]),
    );

    const result = await controller.findAllBasic();

    expect(result[0].displayName).toBe('Max');
  });

  it('liefert displayName null, wenn Vor- und Nachname leer sind', async () => {
    mockGetAllUsersHandler.execute.mockResolvedValue(
      Result.ok([
        buildUserDto({
          stammperson: { id: 'sp-4', vorname: '   ', nachname: '   ', personalnummer: 'P-004' },
        }),
      ]),
    );

    const result = await controller.findAllBasic();

    expect(result[0].displayName).toBeNull();
  });

  it('mappt mehrere Benutzer korrekt, gemischt mit und ohne Stammperson', async () => {
    mockGetAllUsersHandler.execute.mockResolvedValue(
      Result.ok([
        buildUserDto({
          id: 'user-1',
          username: 'admin',
          stammperson: null,
        }),
        buildUserDto({
          id: 'user-2',
          username: 'mmustermann',
          stammperson: { id: 'sp-2', vorname: 'Max', nachname: 'Mustermann', personalnummer: 'P-002' },
        }),
      ]),
    );

    const result = await controller.findAllBasic();

    expect(result).toEqual([
      { id: 'user-1', username: 'admin', displayName: null },
      { id: 'user-2', username: 'mmustermann', displayName: 'Max Mustermann' },
    ]);
  });
});
