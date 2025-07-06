import { ConfigProvider, theme } from 'antd';
import deDE from 'antd/locale/de_DE.js';
import { ReactNode } from 'react';
import { useThemeInternal } from '../hooks/useTheme';
import { natoDateTimeAnt } from '../utils/date';
import { ThemeContext } from './ThemeContext';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const themeUtils = useThemeInternal();

  return (
    <ThemeContext.Provider value={themeUtils}>
      <ConfigProvider
        locale={{
          ...deDE,
          Calendar: {
            ...deDE.Calendar,
            fieldDateTimeFormat: natoDateTimeAnt,
          },
          DatePicker: {
            ...deDE.DatePicker!,
            lang: {
              ...deDE.DatePicker!.lang,
              locale: 'en',
              fieldDateTimeFormat: natoDateTimeAnt,
            },
          },
        }}
        theme={{
          token: {
            // fontFamily: 'DepartureMono',
            fontFamily: 'Nunito Variable',
            fontFamilyCode: 'DepartureMono',
            colorText: themeUtils.isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0,0,0,0.88)',
          },
          components: {
            Menu: {
              itemSelectedBg: 'var(--color-gray-50)',
              itemSelectedColor: 'var(--color-gray-900)',
              itemHoverBg: 'var(--color-gray-50)',
              itemHoverColor: 'var(--color-gray-900)',
              darkItemSelectedBg: 'var(--color-gray-800)',
              darkItemHoverBg: 'var(--color-gray-800)',
              darkItemHoverColor: 'var(--color-white)',
              darkItemBg: 'var(--color-gray-900)',
              darkSubMenuItemBg: 'var(--color-gray-900)',
              itemBg: 'var(--color-white)',
              subMenuItemBg: 'var(--color-white)',
              colorItemText: 'var(--color-gray-600)',
              colorItemTextSelected: 'var(--color-gray-900)',
              darkItemColor: 'var(--color-gray-400)',
              darkItemSelectedColor: 'var(--color-white)',
            },
          },
          algorithm: themeUtils.isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        }}
      >
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}
