import { describe, expect, it } from 'vitest';
// @ts-expect-error: ESLint-Konfiguration hat keinen Typdefinitionsdatei
import eslintConfig from '../../eslint.config.js';

/**
 * Tests für die ESLint-Konfiguration
 * 
 * Validiert die grundlegende Struktur und Einstellungen der ESLint-Konfiguration.
 */
describe('ESLint-Konfiguration', () => {
    it('sollte eine gültige Konfiguration sein', () => {
        expect(eslintConfig).toBeDefined();
    });

    it('sollte die korrekten Ignorierpfade haben', () => {
        const ignoreConfig = eslintConfig[0];
        expect(ignoreConfig).toHaveProperty('ignores');
        expect(ignoreConfig.ignores).toContain('dist');
        expect(ignoreConfig.ignores).toContain('../shared/**/*');
    });

    it('sollte mit den empfohlenen JS-Konfigurationen erweitert werden', () => {
        const mainConfig = eslintConfig[1];
        expect(mainConfig).toHaveProperty('extends');
        // Prüft, ob die extends-Array eine JS-Konfiguration enthält
        expect(mainConfig.extends).toEqual(expect.arrayContaining([expect.any(Object)]));
    });

    it('sollte mit den empfohlenen TS-ESLint-Konfigurationen erweitert werden', () => {
        const mainConfig = eslintConfig[1];
        expect(mainConfig).toHaveProperty('extends');
        // Prüft, ob die extends-Array mehrere Konfigurationen enthält
        expect(mainConfig.extends.length).toBeGreaterThan(1);
    });

    it('sollte die korrekten Dateimuster für TypeScript-Dateien haben', () => {
        const mainConfig = eslintConfig[1];
        expect(mainConfig).toHaveProperty('files');
        expect(mainConfig.files).toBe('src/**/*.{ts,tsx}');
    });

    it('sollte die Browser-Globals aktiviert haben', () => {
        const mainConfig = eslintConfig[1];
        expect(mainConfig).toHaveProperty('languageOptions');
        expect(mainConfig.languageOptions).toHaveProperty('globals');
    });

    it('sollte die notwendigen Plugins konfiguriert haben', () => {
        const mainConfig = eslintConfig[1];
        expect(mainConfig).toHaveProperty('plugins');
        expect(mainConfig.plugins).toHaveProperty('react-hooks');
        expect(mainConfig.plugins).toHaveProperty('react-refresh');
    });

    it('sollte die max-lines-Regel konfiguriert haben', () => {
        const mainConfig = eslintConfig[1];
        expect(mainConfig).toHaveProperty('rules');
        expect(mainConfig.rules).toHaveProperty('max-lines');

        const maxLinesRule = mainConfig.rules['max-lines'];
        expect(Array.isArray(maxLinesRule)).toBe(true);
        expect(maxLinesRule[0]).toBe('error');
        expect(maxLinesRule[1]).toHaveProperty('max', 500);
    });

    it('sollte die max-lines-per-function-Regel konfiguriert haben', () => {
        const mainConfig = eslintConfig[1];
        expect(mainConfig).toHaveProperty('rules');
        expect(mainConfig.rules).toHaveProperty('max-lines-per-function');

        const maxLinesFnRule = mainConfig.rules['max-lines-per-function'];
        expect(Array.isArray(maxLinesFnRule)).toBe(true);
        expect(maxLinesFnRule[0]).toBe('warn');
        expect(maxLinesFnRule[1]).toHaveProperty('max', 400);
    });

    it('sollte die react-refresh-Regel konfiguriert haben', () => {
        const mainConfig = eslintConfig[1];
        expect(mainConfig).toHaveProperty('rules');
        expect(mainConfig.rules).toHaveProperty('react-refresh/only-export-components');

        const refreshRule = mainConfig.rules['react-refresh/only-export-components'];
        expect(Array.isArray(refreshRule)).toBe(true);
        expect(refreshRule[0]).toBe('warn');
        expect(refreshRule[1]).toHaveProperty('allowConstantExport', true);
    });
}); 