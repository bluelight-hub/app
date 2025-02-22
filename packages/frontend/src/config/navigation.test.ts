import '@testing-library/jest-dom';
import { findRouteTitle, mainNavigation, NavigationItem } from './navigation';

describe('navigation utils', () => {
    describe('findRouteTitle', () => {
        it('sollte den Titel für eine Top-Level-Route finden', () => {
            const title = findRouteTitle('/app');
            expect(title).toBe('Dashboard');
        });

        it('sollte den Titel für eine verschachtelte Route finden', () => {
            const title = findRouteTitle('/app/einsatztagebuch');
            expect(title).toBe('Einsatztagebuch');
        });

        it('sollte den Titel für eine tief verschachtelte Route finden', () => {
            const title = findRouteTitle('/app/uav/flugaufträge');
            expect(title).toBe('Flugaufträge');
        });

        it('sollte "Dashboard" zurückgeben, wenn keine Route gefunden wurde', () => {
            const title = findRouteTitle('/nicht/existierende/route');
            expect(title).toBe('Dashboard');
        });

        it('sollte mit leerer Route umgehen können', () => {
            const title = findRouteTitle('');
            expect(title).toBe('Dashboard');
        });
    });

    describe('navigation structure', () => {
        it('sollte konsistente Pfade in der Navigation haben', () => {
            const validateItem = (item: NavigationItem) => {
                if ('path' in item) {
                    // Prüfe, ob der Pfad mit dem Key übereinstimmt
                    expect(item.key).toBe(item.path);
                }

                if ('children' in item && item.children) {
                    item.children.forEach(validateItem);
                }
            };

            mainNavigation.forEach(validateItem);
        });

        it('sollte eindeutige Keys in der Navigation haben', () => {
            const keys = new Set<string>();

            const validateUniqueKeys = (item: NavigationItem) => {
                expect(keys.has(item.key)).toBeFalsy();
                keys.add(item.key);

                if ('children' in item && item.children) {
                    item.children.forEach(validateUniqueKeys);
                }
            };

            mainNavigation.forEach(validateUniqueKeys);
        });

        it('sollte korrekte Typen für alle Navigation Items haben', () => {
            const validateItemType = (item: NavigationItem) => {
                expect(['item', 'group', 'submenu']).toContain(item.type);

                if (item.type === 'item') {
                    expect('path' in item).toBeTruthy();
                }

                if ('children' in item && item.children) {
                    item.children.forEach(validateItemType);
                }
            };

            mainNavigation.forEach(validateItemType);
        });

        it('sollte Icons für alle Items haben', () => {
            const validateIcons = (item: NavigationItem) => {
                if (item.type !== 'group') {
                    expect(item.icon).toBeDefined();
                }

                if ('children' in item && item.children) {
                    item.children.forEach(validateIcons);
                }
            };

            mainNavigation.forEach(validateIcons);
        });
    });
}); 