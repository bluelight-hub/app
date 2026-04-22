import 'reflect-metadata';
import { EigenschutzInfrastructureModule } from '../eigenschutz-infrastructure.module';

/**
 * Meta-Tests für das leere Eigenschutz-Infrastructure-Modul (Story 1.6 AC9).
 *
 * Das Modul ist in Story 1.6 bewusst leer — es reserviert nur den Platz in
 * der Ordner-Struktur nach Architecture §B. Diese Tests dokumentieren die
 * Leere als gewollte Invariante: falls eine Folge-Story hier Provider
 * ergänzt, muss sie diese Tests aktiv ändern und in `AppModule` importieren.
 */
describe('EigenschutzInfrastructureModule', () => {
  it('ist ein gültiges NestJS-Modul ohne Provider', () => {
    const providers = Reflect.getMetadata('providers', EigenschutzInfrastructureModule);
    expect(providers ?? []).toEqual([]);
  });

  it('hat keine Controller (Infrastructure-Layer-Invariante)', () => {
    const controllers = Reflect.getMetadata('controllers', EigenschutzInfrastructureModule);
    expect(controllers ?? []).toEqual([]);
  });

  it('importiert nichts, solange kein Konsument existiert', () => {
    const imports = Reflect.getMetadata('imports', EigenschutzInfrastructureModule);
    expect(imports ?? []).toEqual([]);
  });

  it('exportiert nichts (kein Consumer → kein Re-Export)', () => {
    const exportsMeta = Reflect.getMetadata('exports', EigenschutzInfrastructureModule);
    expect(exportsMeta ?? []).toEqual([]);
  });
});
