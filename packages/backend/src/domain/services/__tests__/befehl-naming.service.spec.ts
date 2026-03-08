// @ts-nocheck
import { BefehlNamingService } from '@domain/services/befehl-naming.service';

describe('BefehlNamingService', () => {
  let service: BefehlNamingService;

  beforeEach(() => {
    service = new BefehlNamingService();
  });

  describe('generateBefehlNummer', () => {
    it('sollte Befehlsnummer mit Zero-Padding generieren', () => {
      expect(service.generateBefehlNummer(1)).toBe('B-001');
      expect(service.generateBefehlNummer(42)).toBe('B-042');
      expect(service.generateBefehlNummer(999)).toBe('B-999');
    });

    it('sollte bei vierstelligen Nummern kein Padding hinzufügen', () => {
      expect(service.generateBefehlNummer(1000)).toBe('B-1000');
    });

    it('sollte korrektes Format B-{SEQ} verwenden', () => {
      const nummer = service.generateBefehlNummer(7);
      expect(nummer).toMatch(/^B-\d{3,}$/);
    });
  });
});
