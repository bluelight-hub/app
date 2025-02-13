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
                        dateTimeFormat: natoDateTimeAnt,
                        fieldDateTimeFormat: natoDateTimeAnt,
                    },
                    DatePicker: {
                        ...deDE.DatePicker!,
                        lang: {
                            ...deDE.DatePicker!.lang,
                            dateTimeFormat: natoDateTimeAnt,
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
                    },
                    algorithm: themeUtils.isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
                }}
            >
                {children}
            </ConfigProvider>
        </ThemeContext.Provider>
    );
}