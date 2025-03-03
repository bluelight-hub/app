import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NavigationGroup, NavigationItem, NavigationSubmenu } from '../config/navigation';
import { convertNavigationToMenuItems, MenuItem } from './navigationConverter';

// Mock React.createElement to test icon rendering
vi.mock('react', async () => {
    const actual = await vi.importActual('react');
    return {
        ...actual,
        createElement: vi.fn((component, props) => ({ component, props })),
        default: actual.default
    };
});

describe('navigationConverter', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should convert a simple navigation item to a menu item', () => {
        const navItem: NavigationItem = {
            type: 'item',
            key: '/test',
            path: '/test',
            label: 'Test Item',
            icon: vi.fn() // Mock icon component
        };

        const result = convertNavigationToMenuItems([navItem]);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(expect.objectContaining({
            key: '/test',
            label: 'Test Item',
            icon: expect.anything() // Icon was processed
        }));
    });

    it('should convert a group with items', () => {
        const navGroup: NavigationGroup = {
            type: 'group',
            key: 'group1',
            label: 'Group 1',
            children: [
                {
                    type: 'item',
                    key: '/item1',
                    path: '/item1',
                    label: 'Item 1'
                },
                {
                    type: 'item',
                    key: '/item2',
                    path: '/item2',
                    label: 'Item 2'
                }
            ]
        };

        const result = convertNavigationToMenuItems([navGroup]);

        expect(result).toHaveLength(1);
        // Type Assertion um Linter-Fehler zu beheben
        const groupItem = result[0] as NonNullable<MenuItem> & { children: MenuItem[] };
        expect(groupItem).toEqual(expect.objectContaining({
            type: 'group',
            key: 'group1',
            label: 'Group 1'
        }));

        // Check children
        expect(groupItem.children).toHaveLength(2);
        expect(groupItem.children[0]).toEqual(expect.objectContaining({
            key: '/item1',
            label: 'Item 1'
        }));
        expect(groupItem.children[1]).toEqual(expect.objectContaining({
            key: '/item2',
            label: 'Item 2'
        }));
    });

    it('should convert a submenu with items', () => {
        const navSubmenu: NavigationSubmenu = {
            type: 'submenu',
            key: 'submenu1',
            label: 'Submenu 1',
            children: [
                {
                    type: 'item',
                    key: '/subitem1',
                    path: '/subitem1',
                    label: 'Subitem 1'
                },
                {
                    type: 'item',
                    key: '/subitem2',
                    path: '/subitem2',
                    label: 'Subitem 2'
                }
            ]
        };

        const result = convertNavigationToMenuItems([navSubmenu]);

        expect(result).toHaveLength(1);
        // Type Assertion um Linter-Fehler zu beheben
        const submenuItem = result[0] as NonNullable<MenuItem> & { children: MenuItem[] };
        expect(submenuItem).toEqual(expect.objectContaining({
            type: 'submenu',
            key: 'submenu1',
            label: 'Submenu 1'
        }));

        // Check children
        expect(submenuItem.children).toHaveLength(2);
        expect(submenuItem.children[0]).toEqual(expect.objectContaining({
            key: '/subitem1',
            label: 'Subitem 1'
        }));
        expect(submenuItem.children[1]).toEqual(expect.objectContaining({
            key: '/subitem2',
            label: 'Subitem 2'
        }));
    });

    it('should handle a complex navigation structure', () => {
        const complexNav: NavigationItem[] = [
            {
                type: 'item',
                key: '/dashboard',
                path: '/dashboard',
                label: 'Dashboard'
            },
            {
                type: 'group',
                key: 'group1',
                label: 'Group 1',
                children: [
                    {
                        type: 'item',
                        key: '/item1',
                        path: '/item1',
                        label: 'Item 1'
                    },
                    {
                        type: 'submenu',
                        key: 'submenu1',
                        label: 'Submenu 1',
                        children: [
                            {
                                type: 'item',
                                key: '/subitem1',
                                path: '/subitem1',
                                label: 'Subitem 1'
                            }
                        ]
                    }
                ]
            }
        ];

        const result = convertNavigationToMenuItems(complexNav);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual(expect.objectContaining({
            key: '/dashboard',
            label: 'Dashboard'
        }));

        // Type Assertion um Linter-Fehler zu beheben
        const groupItem = result[1] as NonNullable<MenuItem> & { children: MenuItem[] };
        expect(groupItem).toEqual(expect.objectContaining({
            type: 'group',
            key: 'group1',
            label: 'Group 1'
        }));

        expect(groupItem.children).toHaveLength(2);
        expect(groupItem.children[0]).toEqual(expect.objectContaining({
            key: '/item1',
            label: 'Item 1'
        }));

        // Type Assertion um Linter-Fehler zu beheben
        const submenuItem = groupItem.children[1] as NonNullable<MenuItem> & { children: MenuItem[] };
        expect(submenuItem).toEqual(expect.objectContaining({
            type: 'submenu',
            key: 'submenu1',
            label: 'Submenu 1'
        }));

        expect(submenuItem.children).toHaveLength(1);
        expect(submenuItem.children[0]).toEqual(expect.objectContaining({
            key: '/subitem1',
            label: 'Subitem 1'
        }));
    });

    it('should filter out invalid items', () => {
        // Statt "any" zu verwenden, erstellen wir ein ungültiges Item mit type assertion
        const invalidItemData = { type: 'invalid', key: 'invalid', label: 'Invalid' };
        const invalidItem = invalidItemData as unknown as NavigationItem;

        const validItem: NavigationItem = {
            type: 'item',
            key: '/valid',
            path: '/valid',
            label: 'Valid'
        };

        const result = convertNavigationToMenuItems([invalidItem, validItem]);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(expect.objectContaining({
            key: '/valid',
            label: 'Valid'
        }));
    });
}); 