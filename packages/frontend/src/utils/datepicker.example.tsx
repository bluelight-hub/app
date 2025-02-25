import { DatePicker, type DatePickerProps } from 'antd';
import React from 'react';
import { formatNatoDateTime } from './date';

/**
 * Beispiel für die Verwendung des NATO-Formats in Ant Design DatePicker
 * 
 * Diese Komponente zeigt, wie der DatePicker mit benutzerdefiniertem Format 
 * konfiguriert werden kann, um das NATO-Datumsformat zu unterstützen.
 */
export const NatoDatePicker: React.FC = () => {
    // Verbesserte Formatfunktion - das ist der Schlüssel zur Lösung!
    const natoFormat: DatePickerProps['format'] = (value) => {
        if (!value) return '';
        // Direkte Formatierung mit unserer NATO-Funktion
        return formatNatoDateTime(value.toDate()) || '';
    };

    return (
        <div>
            <h3>NATO-Formatierter DatePicker</h3>

            {/* Lösung 1: Vollständig benutzerdefinierte Formatierung ohne Ant-eigene Transformationen */}
            <DatePicker
                format={natoFormat}
                placeholder="ddHHmmMMMYY"
            />

            {/* Lösung 2: Verwende ein bekanntes Format für die Anzeige, aber nutze onChange für NATO-Format */}
            <DatePicker
                format="DD.MM.YYYY HH:mm"
                style={{ marginLeft: '10px' }}
                onChange={(date) => {
                    if (date) {
                        // Konvertiere zu NATO-Format wenn sich das Datum ändert
                        const natoDate = formatNatoDateTime(date.toDate());
                        console.log('NATO-Format:', natoDate);
                    }
                }}
            />

            {/* Lösung 3: Für das Problem mit 'Di0905055yy' - vermeide Wochentagsformatierungen */}
            <div style={{ marginTop: '20px' }}>
                <h4>Vermeidung des 'Di0905055yy' Problems</h4>
                <DatePicker
                    // Formatstring, der keinen Wochentag enthält
                    format="DD.MM.YYYY" // Nicht DD/MM/YYYY oder andere Formate die Wochentage enthalten könnten
                />
            </div>
        </div>
    );
};

/**
 * Wichtige Hinweise für die Implementierung:
 * 
 * 1. Für das Problem 'Di0905055yy':
 *    - 'Di' ist ein Wochentag (Dienstag) - kommt oft von Locale-Einstellungen
 *    - Die Zahlen sind Tag/Stunde/Minute/Monat
 *    - 'yy' ist ein nicht ersetztes Jahr-Placeholder
 * 
 * 2. Lösungen:
 *    - Verwende eine Formatierungsfunktion ANSTATT einen String
 *    - Stelle sicher, dass kein ConfigProvider deine Einstellungen überschreibt
 *    - Überprüfe, ob du die neueste Ant Design Version verwendest
 * 
 * 3. Globale Konfiguration:
 *    ```tsx
 *    import { ConfigProvider } from 'antd';
 *    
 *    // Im App-Root:
 *    <ConfigProvider
 *      theme={{ ... }}
 *      components={{  // Für Ant Design 5.0+
 *        DatePicker: {
 *          format: (value) => formatNatoDateTime(value.toDate()),
 *        },
 *      }}
 *    >
 *      <App />
 *    </ConfigProvider>
 *    ```
 */ 