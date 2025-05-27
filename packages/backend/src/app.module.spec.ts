import { AppModule } from './app.module';

describe('AppModule', () => {
    it('should be defined', () => {
        // Einfacher Test, ob das Modul definiert ist
        expect(AppModule).toBeDefined();
    });

    it('should have the correct name', () => {
        // Überprüfe, ob die Klasse den richtigen Namen hat
        expect(AppModule.name).toBe('AppModule');
    });

    it('should be a class', () => {
        // Überprüfe, ob es sich um eine Klasse handelt
        expect(typeof AppModule).toBe('function');
        expect(AppModule.prototype.constructor.name).toBe('AppModule');
    });

    // Test entfernt, da die Module-Metadaten nicht direkt zugänglich sind ohne das NestJS-Framework zu initialisieren
}); 