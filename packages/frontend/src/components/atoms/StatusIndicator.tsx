import { Badge, Button, Popover, message } from 'antd';
import React from 'react';
import { PiCopy } from 'react-icons/pi';
import { ConnectionStatus, useBackendHealth } from '../../hooks/useBackendHealth';

/**
 * Props für die StatusIndicator-Komponente
 */
interface StatusIndicatorProps {
    /**
     * CSS-Klasse für Styling-Anpassungen
     */
    className?: string;
    /**
     * Optional callback when status changes
     */
    onStatusChange?: (status: ConnectionStatus) => void;
    /**
     * Whether to show the text
     */
    withText?: boolean;
    /**
     * Test-ID für automatisierte Tests
     */
    "data-testid"?: string;
}

/**
 * Einfache Komponente zur Anzeige des Backend-Verbindungsstatus
 * 
 * Zeigt den aktuellen Verbindungsstatus als farbigen Punkt an und bietet
 * bei Hover detaillierte Informationen zum Systemstatus.
 */
export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
    className,
    onStatusChange,
    withText = false,
    "data-testid": dataTestId = "status-indicator",
}) => {
    // Backend-Gesundheitsstatus vom Hook abrufen
    const {
        getConnectionStatus,
        getSystemDetailsText,
        getDebugInfo
    } = useBackendHealth();

    // Status aktualisieren, wenn sich etwas ändert
    React.useEffect(() => {
        if (onStatusChange) {
            onStatusChange(getConnectionStatus());
        }
    }, [getConnectionStatus, onStatusChange]);

    // Status-Informationen basierend auf dem aktuellen Status erzeugen
    const getStatusInfo = () => {
        const status = getConnectionStatus();
        const systemDetails = getSystemDetailsText();

        switch (status) {
            case 'checking':
                return {
                    badgeStatus: 'processing' as const,
                    text: 'Prüfe Verbindung...',
                    details: 'Verbindungsstatus wird geprüft'
                };
            case 'online':
                return {
                    badgeStatus: 'success' as const,
                    text: 'Vollständig verbunden',
                    details: `Online-Modus (Internet + FüKW)\n${systemDetails}`
                };
            case 'offline':
                return {
                    badgeStatus: 'warning' as const,
                    text: 'Lokaler Modus',
                    details: `Offline-Modus (Nur FüKW)\n${systemDetails}`
                };
            case 'error':
                return {
                    badgeStatus: 'error' as const,
                    text: 'Keine Verbindung',
                    details: `Keine Verbindung zum FüKW\n${systemDetails}`
                };
        }
    };

    const { badgeStatus, text, details } = getStatusInfo();

    // Debug-Informationen in die Zwischenablage kopieren
    const copyToClipboard = async () => {
        const debugInfo = getDebugInfo();
        if (!debugInfo) {
            message.error('Keine Daten zum Kopieren verfügbar');
            return;
        }

        try {
            await navigator.clipboard?.writeText?.(debugInfo);
            message.success('Debug-Informationen in Zwischenablage kopiert');
        } catch {
            message.error('Fehler beim Kopieren der Debug-Informationen');
        }
    };

    // Inhalt des Popovers mit Details
    const popoverContent = (
        <div className="max-w-sm">
            <div className="whitespace-pre-line">
                {text}
                {details && (
                    <>
                        <br />
                        <br />
                        <strong>Systemstatus:</strong>
                        <br />
                        {details}
                    </>
                )}
            </div>
            <div className="mt-3 flex justify-end">
                <Button
                    size="small"
                    icon={<PiCopy className="mr-1" />}
                    onClick={copyToClipboard}
                    title="Debug-Informationen kopieren"
                >
                    Debug-Info kopieren
                </Button>
            </div>
        </div>
    );

    return (
        <Popover
            content={popoverContent}
            title="Verbindungsstatus"
            trigger="hover"
            placement="right"
        >
            <div className="flex items-center gap-x-2">
                <Badge
                    status={badgeStatus}
                    className={className}
                    data-testid={dataTestId}
                />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {withText && text}
                </p>
            </div>
        </Popover>
    );
}; 