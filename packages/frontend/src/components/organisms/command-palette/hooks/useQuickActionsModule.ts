import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';
import { PiCaretRight, PiClipboard, PiGear, PiPalette, PiSignOut } from 'react-icons/pi';
import { toast } from 'sonner';
import type { ModuleConfig } from '../types';
import { useThemeCommands } from './useThemeCommands';

export const useQuickActionsModule = (): ModuleConfig => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { themeOptions, handleThemeChange } = useThemeCommands();

  return useMemo(
    () => ({
      id: 'quick-actions',
      name: 'Schnellaktionen',
      color: 'primary',
      icon: PiCaretRight,
      subPages: [
        {
          name: 'Einstellungen',
          icon: PiGear,
          shortcut: ['⌘', ','],
          action: () => toast.info('Einstellungen sind nicht implementiert'),
        },
        {
          name: 'In Zwischenablage kopieren',
          icon: PiClipboard,
          action: () => {
            navigator.clipboard
              .writeText(window.location.href)
              .then(() => toast.success('URL kopiert'))
              .catch(() => toast.error('Kopieren fehlgeschlagen'));
          },
        },
        {
          name: 'Theme wechseln',
          icon: PiPalette,
          shortcut: ['⌘', 'T'],
          action: handleThemeChange,
          subCommands: themeOptions,
        },
        {
          name: 'Abmelden',
          icon: PiSignOut,
          destructive: true,
          action: async () => {
            try {
              await logout.mutateAsync().then(() => navigate({ to: '/' }));
            } catch {
              toast.error('Abmeldung fehlgeschlagen');
            }
          },
        },
      ],
    }),
    [logout, navigate, handleThemeChange, themeOptions],
  );
};
