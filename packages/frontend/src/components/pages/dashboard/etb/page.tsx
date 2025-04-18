import { formatNatoDateTime } from '@/utils/date';
import { EtbEntryDto, EtbEntryDtoStatusEnum } from '@bluelight-hub/shared/client/models/EtbEntryDto';
import { Alert, Badge, Button, Card, Col, Empty, List, Row, Spin, Statistic, Tooltip, Typography } from 'antd';
import dayjs from 'dayjs';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PiAmbulance, PiArrowClockwise, PiArrowClockwiseBold, PiClockCountdown, PiEmpty, PiMagnifyingGlass, PiPictureInPicture, PiPlus, PiUser } from 'react-icons/pi';
import { useEinsatztagebuch } from '../../../../hooks/etb/useEinsatztagebuch';

const { Title, Text } = Typography;

/**
 * Gibt das passende Icon für eine Kategorie zurück
 */
const getCategoryIcon = (category: string) => {
    switch (category) {
        case 'USER':
            return <Tooltip title="Meldung"><PiUser size={28} className="text-primary-500" /></Tooltip>;
        case 'LAGEMELDUNG':
            return <Tooltip title="Lagemeldung"><PiPictureInPicture size={28} className="text-red-500" /></Tooltip>;
        case 'RESSOURCEN':
            return <Tooltip title="Ressourcen"><PiAmbulance size={28} className="text-primary-500" /></Tooltip>;
        case 'BETROFFENE_PATIENTEN':
            return <Tooltip title="Betroffene"><PiPlus size={28} className="text-primary-500" /></Tooltip>;
        case 'KORREKTUR':
            return <Tooltip title="Korrektur"><PiArrowClockwiseBold size={28} className="text-orange-500" /></Tooltip>;
        default:
            return <Tooltip title={category}><PiMagnifyingGlass size={28} className="text-gray-500" /></Tooltip>;
    }
};

/**
 * Gibt den Anzeigenamen für eine Kategorie zurück
 */
const getCategoryName = (category: string) => {
    switch (category) {
        case 'USER': return 'Meldung';
        case 'LAGEMELDUNG': return 'Lagemeldung';
        case 'RESSOURCEN': return 'Ressourcen';
        case 'BETROFFENE_PATIENTEN': return 'Betroffene';
        case 'KORREKTUR': return 'Korrektur';
        default: return category || 'Unbekannt';
    }
};

/**
 * Prüft, ob ein Eintrag überschrieben ist
 */
const isUeberschrieben = (entry: EtbEntryDto): boolean => {
    return entry.status === EtbEntryDtoStatusEnum.Ueberschrieben;
};

/**
 * ETB-Dashboard-Seite
 * Zeigt eine Übersicht des Einsatztagebuchs im Dashboard-Layout an
 */
const ETBDashboardPage: React.FC = () => {
    // Daten abrufen mit automatischer Aktualisierung alle 5 Sekunden
    const { einsatztagebuch } = useEinsatztagebuch({
        filterParams: {
            includeUeberschrieben: false, // Im Dashboard zeigen wir alles an
        },
        refetchInterval: 5000, // Alle 5 Sekunden aktualisieren
    });

    const [lastUpdate, setLastUpdate] = useState<number>(0);

    // Timer für die Anzeige der vergangenen Zeit seit dem letzten Update
    useEffect(() => {
        const interval = setInterval(() => {
            setLastUpdate(dayjs().diff(dayjs(einsatztagebuch.query.dataUpdatedAt), 'seconds'));
        }, 1000);

        return () => clearInterval(interval);
    }, [einsatztagebuch.query.dataUpdatedAt]);

    // Manuelle Aktualisierung
    const handleRefresh = useCallback(() => {
        einsatztagebuch.refetch();
    }, [einsatztagebuch]);

    // Alle Statistiken in einem useMemo berechnen
    const statistics = useMemo(() => {
        const items = einsatztagebuch.data?.items || [];

        // Zählen der gesamten und aktiven Einträge
        const totalEntries = einsatztagebuch.data?.pagination.totalItems || 0;

        // Zeitstempel des letzten Eintrags
        const lastEntryTime = items[0]?.timestampEreignis
            ? formatNatoDateTime(items[0].timestampEreignis)
            : '-';

        // Kategorien zählen
        const categoryCounts = items.reduce((acc: Record<string, number>, item: EtbEntryDto) => {
            const category = item.kategorie || 'UNBEKANNT';
            acc[category] = (acc[category] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Sortierte Kategorien (für die Anzeige)
        const sortedCategories = Object.entries(categoryCounts)
            .sort((a, b) => (b[1] as number) - (a[1] as number));

        return {
            totalEntries,
            lastEntryTime,
            categoryCounts,
            sortedCategories,
            latestEntries: items.slice(0, 10)
        };
    }, [einsatztagebuch.data]);

    // Memoized Renderer für Einträge, um Neuberechnung zu vermeiden
    const renderEntryCard = useCallback((entry: EtbEntryDto) => (
        <Col xs={24} key={entry.id}>
            <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.3 }}
                layout
            >
                <Card
                    title={
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                {getCategoryIcon(entry.kategorie || '')}
                                <Text className="text-lg">{formatNatoDateTime(entry.timestampEreignis)}</Text>
                            </span>
                            <div>
                                {isUeberschrieben(entry) ? (
                                    <Badge
                                        status="warning"
                                        text={<span className="text-base">Überschrieben</span>}
                                        className="ml-2"
                                    />
                                ) : (
                                    <Badge
                                        status="success"
                                        text={<span className="text-base">Aktiv</span>}
                                        className="ml-2"
                                    />
                                )}
                            </div>
                        </div>
                    }
                    className={`w-full ${isUeberschrieben(entry) ? 'border-warning-300' : ''}`}
                >
                    <div className="flex flex-wrap gap-y-2 items-center">
                        <Text strong className="mr-2 text-lg">#{entry.laufendeNummer}</Text>
                        <Text className="text-lg">Von: <span className="font-medium">{entry.autorName}</span></Text>
                        {entry.abgeschlossenVon && (
                            <Text className="ml-4 text-lg">An: <span className="font-medium">{entry.abgeschlossenVon}</span></Text>
                        )}
                    </div>
                    <p className={`mt-2 text-lg ${isUeberschrieben(entry) ? 'line-through text-opacity-60' : ''}`}>
                        {entry.beschreibung}
                    </p>
                </Card>
            </motion.div>
        </Col>
    ), []);

    // Loading-Zustand anzeigen
    if (einsatztagebuch.query.isLoading && !einsatztagebuch.data) {
        return (
            <div className="flex justify-center items-center h-64">
                <Spin size="large" tip="Lade Einsatztagebuch-Daten..." />
            </div>
        );
    }

    // Fehler anzeigen
    if (einsatztagebuch.query.error) {
        return (
            <Alert
                message="Fehler beim Laden des Einsatztagebuchs"
                description={einsatztagebuch.query.error.toString()}
                type="error"
                showIcon
            />
        );
    }

    return (
        <div className="etb-dashboard h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <Title level={1} className="mb-0">Einsatztagebuch Dashboard</Title>
                    <div className="flex items-center gap-4">
                        <Text type="secondary" className="flex items-center text-lg">
                            <PiClockCountdown size={22} className="mr-1" />
                            Letzte Aktualisierung: {lastUpdate} Sekunden her
                        </Text>
                    </div>
                </div>
                <Button
                    type="primary"
                    icon={<PiArrowClockwise size={18} />}
                    onClick={handleRefresh}
                    loading={einsatztagebuch.query.isFetching}
                    size="large"
                >
                    Aktualisieren
                </Button>
            </div>

            {/* Statistik-Karten */}
            <Row gutter={[16, 16]} className="mt-6">
                <Col xs={24} sm={12} md={8} lg={6}>
                    <Card className="h-[140px] flex flex-col justify-center">
                        <Statistic
                            title={<span className="text-lg">Gesamteinträge</span>}
                            value={statistics.totalEntries}
                            valueStyle={{ color: 'oklch(62.3% 0.214 259.815)', fontSize: '24px' }}
                            suffix={<span className="text-lg">Einträge</span>}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                    <Card className="h-[140px] flex flex-col justify-center">
                        <Statistic
                            title={<span className="text-lg">Letzter Eintrag</span>}
                            value={statistics.lastEntryTime ?? undefined}
                            valueStyle={{ color: 'oklch(0.768 0.233 130.85)', fontSize: '24px' }}
                        />
                    </Card>
                </Col>
                {statistics.sortedCategories.map(([category, count]) => (
                    <Col xs={24} sm={12} md={8} lg={6} key={category}>
                        <Card className="h-[140px] flex flex-col justify-center">
                            <div className="text-lg text-gray-500 mb-2">{getCategoryName(category)}</div>
                            <div className="flex items-center gap-2">
                                {getCategoryIcon(category)}
                                <div className="text-2xl font-medium">{count as number} Einträge</div>
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* Aktuelle Einträge */}
            <div className="flex justify-between items-center mt-8 mb-4">
                <Title level={2} className="m-0">Neueste Einträge</Title>
                <Badge
                    count={statistics.totalEntries}
                    showZero
                    className="mr-2"
                    style={{ fontSize: '16px', height: '28px', lineHeight: '28px', minWidth: '28px' }}
                />
            </div>

            <div className="flex-1 overflow-auto">
                <Row gutter={[16, 16]}>
                    {statistics.totalEntries === 0 ? (
                        <Col xs={24}>
                            <Empty
                                image={<PiEmpty size={64} />}
                                description={<span className="text-lg">Keine Einträge verfügbar</span>}
                            />
                        </Col>
                    ) : (
                        <List className='w-full'>
                            <AnimatePresence initial={false}>
                                {statistics.latestEntries.map(renderEntryCard)}
                            </AnimatePresence>
                        </List>
                    )}
                </Row>
            </div >
        </div >
    );
};

export default ETBDashboardPage; 