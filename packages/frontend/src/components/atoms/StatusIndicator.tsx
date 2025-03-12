import { HealthControllerCheck200Response } from '@bluelight-hub/shared/client';
import { useQuery } from '@tanstack/react-query';
import { Badge, Button, Popover, message } from 'antd';
import React, { useEffect } from 'react';
import { PiCopy } from 'react-icons/pi';
import { getBaseUrl } from '../../utils/fetch';
import { logger } from '../../utils/logger';

interface StatusIndicatorProps {
    className?: string;
    /**
     * Optional callback when status changes
     */
    onStatusChange?: (isHealthy: boolean) => void;
    /**
     * Whether to show the text
     */
    withText?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
    className,
    onStatusChange,
    withText = false,
}) => {
    const { data, isError, isLoading } = useQuery<HealthControllerCheck200Response>({
        queryKey: ['backendHealth'],
        queryFn: async () => {
            try {
                logger.debug('StatusIndicator checking health endpoint');
                // Attempt to get response from backend
                const response = await fetch(`${getBaseUrl()}/api/health`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                const data = await response.json() as HealthControllerCheck200Response;
                if (!response.ok) {
                    logger.warn('StatusIndicator received error response', {
                        status: data.status,
                        details: data.details
                    });
                } else {
                    logger.info('StatusIndicator health check successful', {
                        status: data.status,
                        details: data.details
                    });
                }
                return data;
            } catch (error) {
                logger.error('StatusIndicator unexpected error', {
                    error: error instanceof Error ? error.message : String(error)
                });
                throw error;
            }
        },
        refetchInterval: 30000, // Check every 30 seconds
        retry: 3,
        retryDelay: 1000
    });

    useEffect(() => {
        if (onStatusChange) {
            const isHealthy = data?.status === 'ok';
            onStatusChange(isHealthy ?? false);
        }
    }, [data, onStatusChange]);

    const getStatus = () => {
        if (isLoading) return { status: 'processing' as const, text: 'Prüfe Status...' };
        if (isError) return { status: 'error' as const, text: 'Backend nicht erreichbar' };
        if (!data) return { status: 'error' as const, text: 'Keine Daten verfügbar' };

        // Sammle detaillierte Informationen über Systemzustände
        const systemDetails = Object.entries(data.details || {})
            .map(([system, info]) => `${system}: ${info.status === 'up' ? '✅' : '❌'}`)
            .join('\n');

        switch (data.status) {
            case 'ok':
                return {
                    status: 'success' as const,
                    text: 'Alle Systeme funktionieren',
                    details: systemDetails
                };
            case 'down':
                return {
                    status: 'error' as const,
                    text: 'Systeme sind ausgefallen',
                    details: systemDetails
                };
            default:
                return {
                    status: 'warning' as const,
                    text: 'Einige Systeme eingeschränkt',
                    details: systemDetails
                };
        }
    };

    const { status, text, details } = getStatus();

    const copyToClipboard = async () => {
        if (!data) {
            message.error('Keine Daten zum Kopieren verfügbar');
            return;
        }

        const debugInfo = JSON.stringify(data, null, 2);
        try {
            await navigator.clipboard?.writeText?.(debugInfo);
            message.success('Debug-Informationen in Zwischenablage kopiert');
        } catch (error) {
            logger.error('Fehler beim Kopieren', { error });
            message.error('Fehler beim Kopieren der Debug-Informationen');
        }
    };

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
            title="Systemstatus"
            trigger="hover"
            placement="right"
        >
            <div className="flex items-center gap-x-2">
                <Badge
                    status={status}
                    className={className}
                    data-testid="status-indicator"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {withText && text}
                </p>
            </div>
        </Popover>
    );
}; 